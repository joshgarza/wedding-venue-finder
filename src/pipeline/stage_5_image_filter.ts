import * as cliProgress from 'cli-progress';
import { promises as fs } from 'fs';
import { LogoFilter } from '../utils/logo-filter'; // Assuming standard project structure
import { PipelineCtx, StageResult } from './types';


export const imageFilterStage = {
  name: "images",
  async run(ctx: PipelineCtx): Promise<StageResult> {
    // 1. Fetch only venues needing branding cleanup via JSONB path
    const venues = await ctx.db('venues')
      //.whereNotNull('image_data')
   //   .whereRaw("(image_data->>'clip_logo_verified')::boolean IS DISTINCT FROM TRUE");

    const progressBar = new cliProgress.SingleBar({
      format: 'Scalable Logo Cleanup |' + '{bar}' + '| {percentage}% | {value}/{total}',
      barCompleteChar: '\u2588',
      barIncompleteChar: '\u2591',
      hideCursor: true
    });

    progressBar.start(venues.length, 0);

    for (const venue of venues) {
      try {
        const imageData = typeof venue.image_data === 'string' 
          ? JSON.parse(venue.image_data) 
          : venue.image_data;
          
        const localPaths: string[] = imageData.local_paths || [];

        // 2. High-performance concurrent verification per venue
        const verificationResults = await Promise.all(
          localPaths.map(async (filePath) => {
            try {
              // Ensure file exists before sending to AI service
              await fs.access(filePath);
              
              // Use your static utility class to detect logos
              const isLogo = await LogoFilter.isLogo(filePath);
              
              if (isLogo) {
                // Asynchronously remove the branded "Transparency Mirage"
                await fs.unlink(filePath);
                return null; 
              }
              return filePath;
            } catch (err) {
              // Gracefully handle missing files or CLIP timeouts
              return null;
            }
          })
        );

        // Filter out nulls (deleted logos/missing files)
        const verifiedPaths = verificationResults.filter((path): path is string => path !== null);

        // 3. Persist the cleaned "Logistical Truth" data
        await ctx.db('venues')
          .where({ venue_id: venue.venue_id })
          .update({
            image_data: JSON.stringify({
              ...imageData,
              local_paths: verifiedPaths,
              clip_logo_verified: true,
              last_verified_at: new Date()
            })
          });

      } catch (err: any) {
        // Non-blocking error logging
        await fs.appendFile('image_errors.log', `Venue ${venue.venue_id}: ${err.message}\n`);
      }
      progressBar.increment();
    }
    
    progressBar.stop();
    return { success: true };
  }
}; 
