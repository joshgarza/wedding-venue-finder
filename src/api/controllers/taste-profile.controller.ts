/**
 * Taste Profile Controllers
 * Handle HTTP requests for taste profile operations
 */

import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { TasteProfileService } from '../services/taste-profile.service';
import {
  generateProfileSchema,
  updateProfileSchema,
  rankVenuesSchema
} from '../schemas/taste-profile.schema';

/**
 * GET /api/taste-profile/onboarding
 * Get 10 random venues for onboarding flow
 */
export async function getOnboardingVenues(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    const userId = req.user!.userId;

    const venues = await TasteProfileService.getOnboardingVenues(userId);

    res.status(200).json({
      success: true,
      data: {
        venues
      }
    });
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({
        success: false,
        error: {
          message: error.message
        }
      });
    } else {
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to fetch onboarding venues'
        }
      });
    }
  }
}

/**
 * POST /api/taste-profile/generate
 * Generate taste profile from onboarding session swipes
 *
 * Body:
 * {
 *   "sessionId": "uuid"
 * }
 */
export async function generateProfile(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    const userId = req.user!.userId;

    // Validate request body
    const validation = generateProfileSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: {
          message: 'Invalid request body',
          details: validation.error.errors
        }
      });
      return;
    }

    const { sessionId } = validation.data;

    const profile = await TasteProfileService.generateProfile(userId, sessionId);

    res.status(200).json({
      success: true,
      data: {
        profile
      }
    });
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({
        success: false,
        error: {
          message: error.message
        }
      });
    } else {
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to generate taste profile'
        }
      });
    }
  }
}

/**
 * GET /api/taste-profile
 * Get user's taste profile
 */
export async function getTasteProfile(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    const userId = req.user!.userId;

    const profile = await TasteProfileService.getTasteProfile(userId);

    if (!profile) {
      res.status(404).json({
        success: false,
        error: {
          message: 'Taste profile not found'
        }
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        profile
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to fetch taste profile'
      }
    });
  }
}

/**
 * POST /api/taste-profile/update
 * Update taste profile based on user swipe (real-time learning)
 *
 * Body:
 * {
 *   "venueId": "uuid",
 *   "action": "right" | "left" | "unsave"
 * }
 */
export async function updateProfile(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    const userId = req.user!.userId;

    // Validate request body
    const validation = updateProfileSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: {
          message: 'Invalid request body',
          details: validation.error.errors
        }
      });
      return;
    }

    const { venueId, action } = validation.data;

    const profile = await TasteProfileService.updateProfile(userId, venueId, action);

    res.status(200).json({
      success: true,
      data: {
        profile
      }
    });
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({
        success: false,
        error: {
          message: error.message
        }
      });
    } else {
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to update taste profile'
        }
      });
    }
  }
}

/**
 * POST /api/taste-profile/rank-venues
 * Rank venues by similarity to user's taste profile
 *
 * Body:
 * {
 *   "venueIds": ["uuid1", "uuid2", ...]
 * }
 */
export async function rankVenuesByTaste(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    const userId = req.user!.userId;

    // Validate request body
    const validation = rankVenuesSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: {
          message: 'Invalid request body',
          details: validation.error.errors
        }
      });
      return;
    }

    const { venueIds } = validation.data;

    const rankedVenues = await TasteProfileService.rankVenuesByTaste(
      userId,
      venueIds
    );

    res.status(200).json({
      success: true,
      data: {
        venues: rankedVenues
      }
    });
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({
        success: false,
        error: {
          message: error.message
        }
      });
    } else {
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to rank venues'
        }
      });
    }
  }
}
