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

    for (const venue of venues) {
      console.log(`📸 Processing images for: ${venue.name}`);
      
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
    }
    
    return { success: true };
  }
};
