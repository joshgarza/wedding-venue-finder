/**
 * Venue controllers for search and detail endpoints
 * Handles request validation and response formatting
 */

import { Request, Response, NextFunction } from 'express';
import * as venueService from '../services/venue.service';
import { VenueSearchQuerySchema, VenueIdParamSchema } from '../schemas/venue-search.schema';

/**
 * Search venues with filters and taste-based ranking
 * GET /api/v1/venues
 *
 * Query parameters:
 * - pricing_tier: string[] - Filter by pricing tier(s)
 * - has_lodging: boolean - Filter by lodging availability
 * - is_estate: boolean - Filter estate venues
 * - is_historic: boolean - Filter historic venues
 * - lodging_capacity_min: number - Minimum lodging capacity
 * - lat, lng, radius_meters: number - Location-based search
 * - sort: 'taste_score' | 'pricing_tier' | 'distance' - Sort order
 * - limit: number - Results per page (max 100)
 * - offset: number - Pagination offset
 */
export async function searchVenues(req: Request, res: Response, next: NextFunction) {
  try {
    // Validate query parameters
    const validationResult = VenueSearchQuerySchema.safeParse(req.query);

    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Invalid query parameters',
        details: validationResult.error.errors
      });
    }

    const filters = validationResult.data;

    // Get user ID from auth middleware
    const userId = (req as any).user.userId;

    // Execute search
    const result = await venueService.searchVenues(userId, filters);

    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

/**
 * Get venue details by ID
 * GET /api/v1/venues/:id
 *
 * Returns:
 * - Venue details including all metadata
 * - Array of image URLs
 * - Raw markdown content
 */
export async function getVenueById(req: Request, res: Response, next: NextFunction) {
  try {
    // Validate venue ID parameter
    const validationResult = VenueIdParamSchema.safeParse(req.params);

    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Invalid venue ID',
        details: validationResult.error.errors
      });
    }

    const { id: venueId } = validationResult.data;

    // Fetch venue details
    const venue = await venueService.getVenueById(venueId);

    if (!venue) {
      return res.status(404).json({
        error: 'Venue not found'
      });
    }

    return res.status(200).json(venue);
  } catch (error) {
    next(error);
  }
}
