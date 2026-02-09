import { z } from 'zod';

/**
 * Swipe action enum
 */
export const SwipeActionSchema = z.enum(['right', 'left', 'unsave'], {
  errorMap: () => ({ message: 'Action must be one of: right, left, unsave' })
});

/**
 * Record swipe request body schema
 */
export const RecordSwipeSchema = z.object({
  venueId: z.string().uuid({ message: 'Venue ID must be a valid UUID' }),
  action: SwipeActionSchema,
  sessionId: z.string().uuid({ message: 'Session ID must be a valid UUID' }).optional()
});

/**
 * Swipe history query parameters schema
 */
export const SwipeHistoryQuerySchema = z.object({
  limit: z
    .string()
    .optional()
    .transform(val => (val ? parseInt(val, 10) : 50))
    .refine(val => val > 0 && val <= 200, {
      message: 'Limit must be between 1 and 200'
    }),
  offset: z
    .string()
    .optional()
    .transform(val => (val ? parseInt(val, 10) : 0))
    .refine(val => val >= 0, {
      message: 'Offset must be a non-negative integer'
    })
});

/**
 * Session ID parameter schema
 */
export const SessionIdParamSchema = z.object({
  sessionId: z.string().uuid({ message: 'Session ID must be a valid UUID' })
});

// Export types for use in controllers/services
export type RecordSwipeInput = z.infer<typeof RecordSwipeSchema>;
export type SwipeHistoryQuery = z.infer<typeof SwipeHistoryQuerySchema>;
export type SessionIdParam = z.infer<typeof SessionIdParamSchema>;
