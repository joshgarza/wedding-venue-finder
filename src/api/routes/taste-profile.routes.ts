/**
 * Taste Profile Routes
 * All routes require authentication
 */

import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import {
  getOnboardingVenues,
  generateProfile,
  getTasteProfile,
  updateProfile,
  rankVenuesByTaste
} from '../controllers/taste-profile.controller';

const router = Router();

// All routes require authentication
router.use(requireAuth);

/**
 * GET /api/taste-profile/onboarding
 * Get 10 random venues for onboarding
 */
router.get('/onboarding', getOnboardingVenues);

/**
 * POST /api/taste-profile/generate
 * Generate taste profile from onboarding session
 */
router.post('/generate', generateProfile);

/**
 * GET /api/taste-profile
 * Get user's taste profile
 */
router.get('/', getTasteProfile);

/**
 * POST /api/taste-profile/update
 * Update profile based on swipe (real-time learning)
 */
router.post('/update', updateProfile);

/**
 * POST /api/taste-profile/rank-venues
 * Rank venues by taste similarity
 */
router.post('/rank-venues', rankVenuesByTaste);

export default router;
