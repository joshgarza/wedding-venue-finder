/**
 * Zod validation schemas for venue search API
 * Validates query parameters and request bodies for venue endpoints
 */

import { z } from 'zod';

/**
 * Pricing tier enum matching database pricing_tier_enum
 */
export const PricingTierSchema = z.enum(['low', 'medium', 'high', 'luxury', 'unknown']);

/**
 * Sort options for venue search
 */
export const SortOptionSchema = z.enum(['taste_score', 'pricing_tier', 'distance']);

/**
 * Venue search query parameters schema
 */
export const VenueSearchQuerySchema = z.object({
  // Metadata filters
  pricing_tier: z
    .union([
      PricingTierSchema,
      z.array(PricingTierSchema)
    ])
    .optional()
    .transform((val) => {
      // Normalize single value to array
      if (typeof val === 'string') {
        return [val];
      }
      return val;
    }),
  has_lodging: z
    .union([z.boolean(), z.string()])
    .optional()
    .transform((val) => {
      if (typeof val === 'string') {
        return val === 'true';
      }
      return val;
    }),
  is_estate: z
    .union([z.boolean(), z.string()])
    .optional()
    .transform((val) => {
      if (typeof val === 'string') {
        return val === 'true';
      }
      return val;
    }),
  is_historic: z
    .union([z.boolean(), z.string()])
    .optional()
    .transform((val) => {
      if (typeof val === 'string') {
        return val === 'true';
      }
      return val;
    }),
  lodging_capacity_min: z
    .union([z.number(), z.string()])
    .optional()
    .transform((val) => {
      if (typeof val === 'string') {
        const parsed = parseInt(val, 10);
        return isNaN(parsed) ? undefined : parsed;
      }
      return val;
    }),

  // Location filter (all three required together)
  lat: z
    .union([z.number(), z.string()])
    .optional()
    .transform((val) => {
      if (typeof val === 'string') {
        const parsed = parseFloat(val);
        return isNaN(parsed) ? undefined : parsed;
      }
      return val;
    }),
  lng: z
    .union([z.number(), z.string()])
    .optional()
    .transform((val) => {
      if (typeof val === 'string') {
        const parsed = parseFloat(val);
        return isNaN(parsed) ? undefined : parsed;
      }
      return val;
    }),
  radius_meters: z
    .union([z.number(), z.string()])
    .optional()
    .transform((val) => {
      if (typeof val === 'string') {
        const parsed = parseInt(val, 10);
        return isNaN(parsed) ? undefined : parsed;
      }
      return val;
    }),

  // Sorting
  sort: SortOptionSchema.optional().default('taste_score'),

  // Pagination
  limit: z
    .union([z.number(), z.string()])
    .optional()
    .transform((val) => {
      if (typeof val === 'string') {
        const parsed = parseInt(val, 10);
        return isNaN(parsed) ? 20 : Math.min(parsed, 100); // Max 100 per page
      }
      return val ? Math.min(val, 100) : 20;
    })
    .default(20),
  offset: z
    .union([z.number(), z.string()])
    .optional()
    .transform((val) => {
      if (typeof val === 'string') {
        const parsed = parseInt(val, 10);
        return isNaN(parsed) ? 0 : Math.max(parsed, 0); // Min 0
      }
      return val ? Math.max(val, 0) : 0;
    })
    .default(0)
}).refine(
  (data) => {
    // If location filter is used, all three fields (lat, lng, radius_meters) must be provided
    const hasLat = data.lat !== undefined;
    const hasLng = data.lng !== undefined;
    const hasRadius = data.radius_meters !== undefined;

    if (hasLat || hasLng || hasRadius) {
      return hasLat && hasLng && hasRadius;
    }
    return true;
  },
  {
    message: 'Location filter requires lat, lng, and radius_meters to all be provided',
    path: ['lat']
  }
).refine(
  (data) => {
    // If sorting by distance, location must be provided
    if (data.sort === 'distance') {
      return data.lat !== undefined && data.lng !== undefined;
    }
    return true;
  },
  {
    message: 'Sort by distance requires lat and lng to be provided',
    path: ['sort']
  }
);

/**
 * Venue ID parameter schema
 */
export const VenueIdParamSchema = z.object({
  id: z
    .string()
    .regex(/^\d+$/, 'Venue ID must be a valid number')
    .transform((val) => parseInt(val, 10))
});

/**
 * Type exports for use in controllers
 */
export type VenueSearchQuery = z.infer<typeof VenueSearchQuerySchema>;
export type VenueIdParam = z.infer<typeof VenueIdParamSchema>;
