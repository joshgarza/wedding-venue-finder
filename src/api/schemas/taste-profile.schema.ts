/**
 * Zod validation schemas for taste profile routes
 */

import { z } from 'zod';

/**
 * Schema for generating profile after onboarding
 */
export const generateProfileSchema = z.object({
  sessionId: z.string().uuid('Invalid session ID format')
});

/**
 * Schema for updating profile after swipe
 */
export const updateProfileSchema = z.object({
  venueId: z.string().uuid('Invalid venue ID format'),
  action: z.enum(['right', 'left', 'unsave'], {
    errorMap: () => ({ message: 'Action must be "right", "left", or "unsave"' })
  })
});

/**
 * Schema for ranking venues by taste
 */
export const rankVenuesSchema = z.object({
  venueIds: z
    .array(z.string().uuid('Invalid venue ID format'))
    .min(1, 'At least one venue ID is required')
    .max(100, 'Maximum 100 venues can be ranked at once')
});

export type GenerateProfileInput = z.infer<typeof generateProfileSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type RankVenuesInput = z.infer<typeof rankVenuesSchema>;
