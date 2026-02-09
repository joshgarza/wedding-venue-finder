/**
 * Venue routes for search and detail endpoints
 * All routes require authentication
 */

import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import * as venueController from '../controllers/venue.controller';

const router = Router();

/**
 * GET /venues - Search venues with filters
 * Requires authentication
 * Query parameters: pricing_tier, has_lodging, is_estate, is_historic,
 *                   lodging_capacity_min, lat, lng, radius_meters, sort, limit, offset
 */
router.get('/', requireAuth, venueController.searchVenues);

/**
 * GET /venues/:id - Get venue details by ID
 * Requires authentication
 * Returns venue with images and full metadata
 */
router.get('/:id', requireAuth, venueController.getVenueById);

export default router;
