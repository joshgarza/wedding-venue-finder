import { EnrichmentSchema, EnrichmentData } from '../schemas/venue.schema';

export interface ValidationResult {
  success: boolean;
  data?: EnrichmentData;
  error?: string;
}

export function validateExtraction(rawResponse: string): ValidationResult {
  try {
    // Clean the string in case Phi-3 adds markdown triple backticks
    let cleanJson = rawResponse.trim();
    
    // 1. Handle Assistant Anchoring: If we forced the '{' and it's missing from the response
    if (!cleanJson.startsWith('{')) cleanJson = '{' + cleanJson;

    // 2. Handle The "Guillotine" Effect: If the response is cut off
    if (!cleanJson.endsWith('}')) {
      cleanJson = cleanJson + '}';
    }
   
    const parsed = JSON.parse(cleanJson);
    
    // Validate against the Zod schema
    const validatedData = EnrichmentSchema.parse(parsed);
    
    return { success: true, data: validatedData };
  } catch (err: any) {
    console.error('\n failed to validate extraction\n');

    return { 
      success: false, 
      error: err.message
    };
  }
}
