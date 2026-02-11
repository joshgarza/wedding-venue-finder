import fs from 'fs';
import * as cliProgress from 'cli-progress';
import { db } from '../../db/db-config';
import { extractImageUrls, downloadImage } from '../utils/image-downloader';
import path from 'path';

export const imageStage = {
  name: "images",
  async run(ctx: any) {
    // 1. Find venues that have markdown but haven't had images processed
    const venues = await db('venues')
      .whereNotNull('raw_markdown')
      .whereNull('image_data') // Using image_data from your PRD schema

    const progressBar = new cliProgress.SingleBar({
      format: 'Extracting images |' + '{bar}' + '| {percentage}% | {value}/{total}',
      barCompleteChar: '\u2588',
      barIncompleteChar: '\u2591',
      hideCursor: true
    });

    progressBar.start(venues.length, 0);

    for (const venue of venues) {
      try {
        const urls = extractImageUrls(venue.raw_markdown);
        const targetFolder = path.join(process.cwd(), 'data', 'venues', venue.venue_id, 'raw_images');
        
        const localPaths: string[] = [];

        for (const url of urls) {
          const localPath = await downloadImage(url, targetFolder, venue.venue_id);
          if (localPath) localPaths.push(localPath);
        }

        // 2. Update DB with local references for Phase 4 (CLIP/Moondream)
        await db('venues')
          .where({ venue_id: venue.venue_id })
          .update({
            image_data: JSON.stringify({
              local_paths: localPaths,
              processed_at: new Date()
            })
          });

      } catch (err) {
        fs.appendFileSync('image_errors.log', `${venue.name}: ${err.message}\n`);
      }
      progressBar.increment();
   }
    progressBar.stop();
    return { success: true };
  }
};
