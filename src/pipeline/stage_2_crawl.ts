import pLimit from 'p-limit';
import axios from 'axios';
import type { Stage } from "./stages";

function isSameDomain(baseUrl: string, linkUrl: string): boolean {
  try {
    const base = new URL(baseUrl);
    const link = new URL(linkUrl);
    return base.hostname === link.hostname;
  } catch {
    return false;
  }
}

export const crawlStage: Stage = {
  name: "crawl",
  async run(ctx) {
    const { db } = ctx;
    
    // Only crawl venues that passed pre-vetting
    const venues = await db('venues')
      .whereNotNull('website_url')
      .where('website_url', '!=', '')
      .where('pre_vetting_status', 'yes'); // NEW: Only crawl pre-vetted "yes" venues
    
    if (venues.length === 0) return { success: true };
    
    const limit = pLimit(5);
    
    for (const venue of venues) {
      let queue = [{ url: venue.website_url, depth: 1 }];
      const visited = new Set<string>();
      let aggregatedMarkdown = "";
      
      while (queue.length > 0) {
        const currentBatch = [...queue];
        queue = [];
     
        
        const results = await Promise.all(
          currentBatch.map(item => limit(async () => {
            if (visited.has(item.url)) return null;
            if (item.depth > 3) return null;
            
            visited.add(item.url);
            
            try {
              const response = await axios.post('http://127.0.0.1:11235/crawl', {
                urls: [item.url],
                markdown_type: 'fit_markdown',
                content_filter: { 
                  type: 'pruning', 
                  threshold: 0.48,
                  min_word_threshold: 75
                },
                wait_for: 'domcontentloaded',
                browser_config: { 
                  headless: true,
                  viewport: { width: 1024, height: 768 }
                },
                timeout: 20000
              });
              
              const result = response.data.results[0];
              
              if (result?.success) {
                // Try multiple markdown extraction paths
                const markdown = result.markdown?.fit_markdown || 
                                result.markdown?.raw_markdown || 
                                result.markdown ||
                                result.fit_markdown ||
                                result.raw_markdown;
                
                return {
                  markdown: markdown ? `\n--- ${item.url} (depth ${item.depth}) ---\n${markdown}` : null,
                  links: result.links?.internal || []
                };
              }
            } catch (err: any) {
              return null;
            }
          }))
        );
        
        for (let i = 0; i < results.length; i++) {
          const result = results[i];
          if (result) {
            // Aggregate markdown
            if (result.markdown) {
              aggregatedMarkdown += result.markdown;
              console.log(`${venue.name} | Aggregate length: ${aggregatedMarkdown.length} chars`);
            }
            
            // Extract next level links
            const childLinks = result.links
              .map((link: any) => {
                const url = typeof link === 'string' ? link : link.href;
                return { url, depth: currentBatch[i].depth + 1 };
              })
              .filter((i: any) => 
                i.url && 
                !visited.has(i.url) && 
                isSameDomain(venue.website_url, i.url)
              )
              .slice(0, 10);
            
            queue.push(...childLinks);
          }
        }
      }
      
      await db('venues')
        .where({ venue_id: venue.venue_id })
        .update({ raw_markdown: aggregatedMarkdown });

      console.log(`✅ ${venue.name}: ${visited.size} pages | Final: ${aggregatedMarkdown.length} chars\n`);
    }
    
    return { success: true };
  }
};
