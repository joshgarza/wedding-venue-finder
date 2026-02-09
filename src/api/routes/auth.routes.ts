import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import * as authController from '../controllers/auth.controller';

const router = Router();

/**
 * Rate limiter for auth endpoints
 * 5 attempts per 15 minutes per IP
 * In test environment, use much higher limit (1000) to effectively disable rate limiting
 * except for the specific rate limit test which can use ENABLE_RATE_LIMIT_TEST=true
 */
const authLimiter = rateLimit({
  windowMs: process.env.NODE_ENV === 'test' ? 5000 : 15 * 60 * 1000, // 5 sec in test, 15 min in prod
  max: process.env.NODE_ENV === 'test' && process.env.ENABLE_RATE_LIMIT_TEST !== 'true' ? 1000 : 5, // Effectively disabled in test
  message: {
    success: false,
    error: {
      message: 'Too many authentication attempts, please try again later'
    }
  },
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false // Disable `X-RateLimit-*` headers
});

/**
 * POST /api/v1/auth/signup
 * Create a new user account
 */
router.post('/signup', authLimiter, authController.signup);

/**
 * POST /api/v1/auth/login
 * Authenticate user and receive tokens
 */
router.post('/login', authLimiter, authController.login);

/**
 * POST /api/v1/auth/refresh
 * Refresh access token using refresh token
 */
router.post('/refresh', authController.refreshToken);

export default router;
