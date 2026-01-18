import pLimit from 'p-limit';
import * as cliProgress from 'cli-progress';
import fs from 'node:fs/promises';
import axios from 'axios';
import type { Stage } from "./stages";

export const crawlStage: Stage = {
  name: "crawl",
  async run(ctx) {
    const { db } = ctx;
    const MAX_DEPTH = 3; // PRD requirement for discovery depth
    
    const venues = await db('venues')
      .whereNotNull('website_url')
      .where('website_url', '!=', '')
      .whereNull('raw_markdown');

    if (venues.length === 0) return { success: true };

    const progressBar = new cliProgress.SingleBar({
      format: 'BFS Crawl Level {level} |' + '{bar}' + '| {percentage}% | {value}/{total}',
      barCompleteChar: '\u2588',
      barIncompleteChar: '\u2591',
      hideCursor: true
    });

    const limit = pLimit(5);

    for (const venue of venues) {
      // BFS Queue: { url: string, depth: number }
      let queue = [{ url: venue.website_url, depth: 1 }];
      const visited = new Set<string>();
      let aggregatedMarkdown = "";

      console.log(`\n🚀 Starting BFS crawl for: ${venue.name}`);
      progressBar.start(1, 0); // Total will be updated dynamically

      while (queue.length > 0) {
        // Get all current level items to process them in parallel
        const currentLevel = [...queue]; 
        queue = []; // Clear queue for next level links
        
        progressBar.setTotal(progressBar.getTotal() + currentLevel.length);

        const levelResults = await Promise.all(
          currentLevel.map(item => limit(async () => {
            if (visited.has(item.url)) {
              progressBar.increment();
              return null;
            }
            visited.add(item.url);

            try {
              const response = await axios.post('http://127.0.0.1:11235/crawl', {
                urls: [item.url],
                priority: 1,
                markdown_type: 'fit_markdown',
                content_filter: { type: 'pruning', threshold: 0.45, min_word_threshold: 50 },
                wait_for: 'body',
                browser_config: { headless: true },
                timeout: 30000
              });

              const result = response.data.results[0];
              if (result?.success) {
                const content = result.markdown?.fit_markdown || result.markdown;
                
                // Discover internal links for next BFS level (only if not at max depth)
                const nextLinks = item.depth < MAX_DEPTH
                  ? (result.links?.internal || [])
                      .filter((link: string) => !visited.has(link))
                      .map((link: string) => ({ url: link, depth: item.depth + 1 }))
                  : [];
                
                return { content, nextLinks, url: item.url, depth: item.depth };              }
            } catch (err: any) {
              await fs.appendFile('crawl_errors.log', `${venue.venue_id} [Depth ${item.depth}]: ${err.message}\n`);
            } finally {
              progressBar.increment();
            }
            return null;
          }))
        );

        // Process results: Aggregating markdown and populating next level of queue
         for (const res of levelResults) {
          if (res && res.content) {
            // Ensure we are grabbing the string content, not the result object
            const contentString = typeof res.content === 'string' 
              ? res.content 
              : (res.content.fit_markdown || res.content.raw_markdown || JSON.stringify(res.content));

            aggregatedMarkdown += `\n\n--- Source: ${venue.website_url} ---\n\n${contentString}`;
            
            if (res.nextLinks && res.nextLinks[0].depth <= MAX_DEPTH) {
              queue.push(...res.nextLinks);
            }
          }
        }
      }
      console.log(aggregatedMarkdown);
      // Update DB with the combined logistics "Truth" from all 3 levels
      await db('venues')
        .where({ venue_id: venue.venue_id })
        .update({
          raw_markdown: aggregatedMarkdown,
          last_crawled_at: db.fn.now()
        });

      progressBar.stop();
    }

    return { success: true };
  }
};
