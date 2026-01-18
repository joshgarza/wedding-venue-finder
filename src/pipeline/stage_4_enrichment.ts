import { validateExtraction } from '../utils/validator';
import { Ollama } from 'ollama';
import * as cliProgress from 'cli-progress';
import { PipelineCtx, StageResult } from './types'; // Adjust path as needed

export const enrichmentStage = {
  name: "enrichment",
  async run(ctx: PipelineCtx): Promise<StageResult> {
    const ollama = new Ollama({ host: 'http://localhost:11434' });
    
    const venues = await ctx.db('venues')
      .whereNotNull('raw_markdown')
      .where('lodging_capacity', 0); 

    if (venues.length === 0) {
      console.log("No new venues found for enrichment.");
      return { success: true };
    }

    // Define a very aggressive system prompt
    const SYSTEM_PROMPT = `
    CRITICAL INSTRUCTION: You are a JSON-only API. 
    You must DISCARD all social media, contact info, and SEO text.
    Abide STRICTLY by this zod schema:
   
    export const EnrichmentSchema = z.object({
      is_wedding_venue: z.boolean().default(false),
      is_estate: z.boolean().default(false),
      is_historic: z.boolean().default(false),
      has_lodging: z.boolean().default(false),
      lodging_capacity: z.number().int().min(0).default(0), 
      pricing_tier: z.enum(['low', 'medium', 'high', 'luxury', 'unknown']).default('medium')
    });

    ### VALID JSON EXAMPLE:
    {
      "is_wedding_venue": true,
      "is_estate": false,
      "is_historic": true,
      "has_lodging": false,
      "lodging_capacity": 0,
      "pricing_tier": "medium"
    }

    ### VALID JSON EXAMPLE #2:
    {
      "is_wedding_venue": true,
      "is_estate": true,
      "is_historic": true,
      "has_lodging": true,
      "lodging_capacity": 20,
      "pricing_tier": "unknown" 
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
       let attempts = 0;
       const MAX_RETRIES = 3;
       let extractionResult: ValidationResult = { success: false };

       try {
        while (attempts < MAX_RETRIES && !extractionResult.success) {
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
            options: {
              temperature: 0.1 + (attempts * 0.2),
              num_predict: 256,
              stop: ['}', '###'],
              top_p: 9
            }
          });

          extractionResult = validateExtraction(response.message.content);
          
          if (!extractionResult.success) {
            attempts++;
          }
        }
       } catch (err) {
        console.error(`\nFailed to enrich ${venue.name}:`, err.message);
        // Errors are logged but shouldn't break the entire batch pipeline
      }
    try { 
      if (extractionResult.success && extractionResult.data) {
        await ctx.db('venues').where('venue_id', venue.venue_id).update({
          ...extractionResult.data,
          updated_at: new Date() // Combats "Stale Data" issue
        });
      }
    } catch (err) {
      console.error('DB Error\n', err.message);
    }
      progressBar.increment();
    }

    progressBar.stop();
    return { success: true };
  }
};
