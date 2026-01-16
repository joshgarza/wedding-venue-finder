import axios from 'axios';
import { db } from '../db/db-config'; // Assuming your Knex/Objection instance

export async function processCrawlQueue() {
  // 1. Get venues that haven't been crawled yet
  const venues = await db('venues').whereNull('raw_markdown').limit(10);

  for (const venue of venues) {
    try {
      console.log(`Crawling: ${venue.website_url}`);
      
      const response = await axios.post('http://localhost:11235/crawl', {
        urls: venue.website_url,
        priority: 1,
        // Using 'fit_markdown' provides the most LLM-ready version (no headers/footers)
        markdown_type: 'fit_markdown' 
      });

      const { markdown, success, error } = response.data.results[0];

      if (success) {
        await db('venues')
          .where({ id: venue.id })
          .update({ 
            raw_markdown: markdown,
            last_crawled_at: new Date() 
          });
      } else {
        console.error(`Crawl failed for ${venue.name}: ${error}`);
      }
    } catch (err) {
      console.error(`Connection error for ${venue.name}`);
    }
  }
}
