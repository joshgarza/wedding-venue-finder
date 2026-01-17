import { z } from 'zod';

export const EnrichmentSchema = z.object({
  is_wedding_venue: z.boolean().default(false).nullable(),
  is_estate: z.boolean().default(false).nullable(),
  is_historic: z.boolean().default(false).nullable(),
  has_lodging: z.boolean().default(false).nullable(),
  // Essential for the "Sleeps 20+" filter
  lodging_capacity: z.number().int().min(0).default(0).nullable(), 
  pricing_tier: z.enum(['low', 'medium', 'high', 'luxury', 'unknown', null]).default('medium')
});

export type EnrichmentData = z.infer<typeof EnrichmentSchema>;
