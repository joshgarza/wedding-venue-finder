import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import * as swipeController from '../controllers/swipe.controller';

const router = Router();

/**
 * All routes require authentication
 */

/**
 * POST /swipes
 * Record a swipe event (right, left, or unsave)
 */
router.post('/', requireAuth, swipeController.recordSwipe);

/**
 * GET /swipes/saved
 * Get user's shortlist (all venues with 'right' swipes)
 */
router.get('/saved', requireAuth, swipeController.getShortlist);

/**
 * GET /swipes/history
 * Get paginated swipe history
 * Query params: limit (default 50, max 200), offset (default 0)
 */
router.get('/history', requireAuth, swipeController.getSwipeHistory);

/**
 * GET /swipes/session/:sessionId
 * Get swipes for a specific session
 */
router.get('/session/:sessionId', requireAuth, swipeController.getSessionSwipes);

export default router;
