import { Ollama } from 'ollama';
import * as cliProgress from 'cli-progress';
import { PipelineCtx, StageResult } from './types'; // Adjust path as needed

export const enrichmentStage = {
  name: "enrichment",
  async run(ctx: PipelineCtx): Promise<StageResult> {
    const ollama = new Ollama({ host: 'http://localhost:11434' });
    console.log('checking ollama', ollama);
    const venues = await ctx.db('venues')
      .whereNotNull('raw_markdown')
      .whereNotNull('website_url')
      .where('lodging_capacity', 0); 

    if (venues.length === 0) {
      console.log("No new venues found for enrichment.");
      return { success: true };
    }
// Define a very aggressive system prompt
const SYSTEM_PROMPT = `
CRITICAL INSTRUCTION: You are a JSON-only API. 
You must DISCARD all social media, contact info, and SEO text.
Extract ONLY these fields: is_wedding_venue, is_estate, is_historic, allows_overnight, overnight_capacity, price_range, is_negotiable.

### VALID JSON EXAMPLE:
{
  "is_wedding_venue": true,
  "is_estate": false,
  "is_historic": true,
  "allows_overnight": false,
  "overnight_capacity": 0,
  "price_range": "medium",
  "is_negotiable": true
}
`;

    const progressBar = new cliProgress.SingleBar({
      format: 'Enriching Venues (Phi-3) |' + '{bar}' + '| {percentage}% | {value}/{total}',
      barCompleteChar: '\u2588',
      barIncompleteChar: '\u2591',
      hideCursor: true
    });

    progressBar.start(venues.length, 0);

    for (const venue of venues) {
      try {
        // In your loop, use "Response Anchoring"
        const response = await ollama.chat({
          model: process.env.OLLAMA_MODEL || 'phi3',
          format: 'json', 
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { 
              role: 'user', 
              content: `### RAW DATA TO ANALYZE:
              <BEGIN_SCRAPE>
              ${venue.raw_markdown.substring(0, 3000)}
              <END_SCRAPE>

              ### TASK:
              Extract the specific fields for ${venue.name} based on the schema.
              If information is missing, use default values (false for booleans, 0 for numbers).` 
            },
            // Anchoring: We tell the model to start with a { to force JSON structure
            { role: 'assistant', content: '{' } 
          ],
        });

        const extraction = JSON.parse(response.message.content);
        // Log response for Acceptance Criteria verification
        console.log(`\n[AI Response for ${venue.name}]:`, extraction);

       } catch (err) {
        console.error(`\nFailed to enrich ${venue.name}:`, err.message);
        // Errors are logged but shouldn't break the entire batch pipeline
      }
      progressBar.increment();
    }

    progressBar.stop();
    return { success: true };
  }
};
