import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import * as swipeService from '../services/swipe.service';
import {
  RecordSwipeSchema,
  SwipeHistoryQuerySchema,
  SessionIdParamSchema
} from '../schemas/swipe.schema';

/**
 * POST /swipes - Record a swipe event
 */
export async function recordSwipe(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    // Validate request body
    const validationResult = RecordSwipeSchema.safeParse(req.body);

    if (!validationResult.success) {
      res.status(400).json({
        success: false,
        error: {
          message: 'Validation failed',
          details: validationResult.error.errors
        }
      });
      return;
    }

    const { venueId, action, sessionId } = validationResult.data;
    const userId = req.user!.userId;

    // Record swipe
    const swipe = await swipeService.recordSwipe(
      userId,
      venueId,
      action,
      sessionId
    );

    res.status(201).json({
      success: true,
      data: {
        swipe: {
          swipe_id: swipe.swipe_id,
          venue_id: swipe.venue_id,
          action: swipe.action,
          session_id: swipe.session_id,
          timestamp: swipe.timestamp
        }
      }
    });
  } catch (error: any) {
    // Handle duplicate swipe error
    if (error.message === 'Venue already swiped') {
      res.status(409).json({
        success: false,
        error: {
          message: error.message
        }
      });
      return;
    }

    // Handle unsave error
    if (error.message === 'No saved swipe found to unsave') {
      res.status(404).json({
        success: false,
        error: {
          message: error.message
        }
      });
      return;
    }

    throw error;
  }
}

/**
 * GET /swipes/saved - Get user's shortlist (saved venues)
 */
export async function getShortlist(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    const userId = req.user!.userId;

    const venues = await swipeService.getShortlist(userId);

    res.status(200).json({
      success: true,
      data: {
        venues,
        count: venues.length
      }
    });
  } catch (error) {
    throw error;
  }
}

/**
 * GET /swipes/history - Get paginated swipe history
 */
export async function getSwipeHistory(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    // Validate query parameters
    const validationResult = SwipeHistoryQuerySchema.safeParse(req.query);

    if (!validationResult.success) {
      res.status(400).json({
        success: false,
        error: {
          message: 'Invalid query parameters',
          details: validationResult.error.errors
        }
      });
      return;
    }

    const { limit, offset } = validationResult.data;
    const userId = req.user!.userId;

    const history = await swipeService.getSwipeHistory(userId, limit, offset);

    res.status(200).json({
      success: true,
      data: {
        swipes: history,
        count: history.length,
        limit,
        offset
      }
    });
  } catch (error) {
    throw error;
  }
}

/**
 * GET /swipes/session/:sessionId - Get swipes for a specific session
 */
export async function getSessionSwipes(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    // Validate session ID parameter
    const validationResult = SessionIdParamSchema.safeParse(req.params);

    if (!validationResult.success) {
      res.status(400).json({
        success: false,
        error: {
          message: 'Invalid session ID',
          details: validationResult.error.errors
        }
      });
      return;
    }

    const { sessionId } = validationResult.data;
    const userId = req.user!.userId;

    const swipes = await swipeService.getSessionSwipes(userId, sessionId);

    res.status(200).json({
      success: true,
      data: {
        swipes,
        count: swipes.length,
        session_id: sessionId
      }
    });
  } catch (error) {
    throw error;
  }
}
