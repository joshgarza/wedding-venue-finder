import axios from 'axios';
import type { Stage } from "./stages";

export const crawlStage: Stage = {
  name: "crawl",
  async run(ctx) {
    const { db } = ctx;

    // 1. Get venues that haven't been crawled yet
    // Filtering for non-null/non-empty website_url ensures we don't waste resources
    const venues = await db('venues')
      .whereNotNull('website_url')
      .where('website_url', '!=', '')
      .whereNull('raw_markdown')
      .limit(10);

    if (venues.length === 0) {
      console.log("No new venues to crawl.");
      return { success: true };
    }

    for (const venue of venues) {
      try {
        console.log(`[CrawlStage] Fetching: ${venue.name} (${venue.website_url})`);

        const response = await axios.post('http://127.0.0.1:11235/crawl', {
          urls: [venue.website_url],
          priority: 1,
          markdown_type: 'fit_markdown', // Optimized for local LLM context windows
          content_filter: {
            type: 'pruning',
            threshold: 0.45,
            min_word_threshold: 50
          },
          wait_for: 'body',
          browser_config: {
            headless: true
          }
        });

        const result = response.data.results[0];

        if (result && result.success) {
          const markdownToSave = result.markdown?.fit_markdown || result.markdown?.raw_markdown || result.markdown;

          await db('venues')
            .where({ venue_id: venue.venue_id })
            .update({
              raw_markdown: markdownToSave, 
              last_crawled_at: db.fn.now() // Use database-native timestamp
            });
          console.log(`[CrawlStage] Successfully saved markdown for: ${venue.name}`);
        } else {
          console.error(`[CrawlStage] Crawl failed for ${venue.name}: ${result?.error || 'Unknown error'}`);
        }
      } catch (err: any) {
        console.error(`[CrawlStage] Connection error for ${venue.name}: ${err.message}`);
        // We don't throw here so that one failed crawl doesn't crash the entire pipeline
      }
    }

    return { success: true };
  }
};
