import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt.utils';
import { findUserById } from '../services/user.service';

/**
 * Extended Request interface with user property
 */
export interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
  };
}

/**
 * Middleware to verify JWT access token
 * Expects "Authorization: Bearer <token>" header
 */
export async function requireAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      res.status(401).json({
        success: false,
        error: {
          message: 'Authorization header missing'
        }
      });
      return;
    }

    // Check Bearer format
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      res.status(401).json({
        success: false,
        error: {
          message: 'Invalid authorization header format. Expected: Bearer <token>'
        }
      });
      return;
    }

    const token = parts[1];

    // Verify token
    let payload;
    try {
      payload = verifyAccessToken(token);
    } catch (error) {
      res.status(401).json({
        success: false,
        error: {
          message: 'Invalid or expired token'
        }
      });
      return;
    }

    // Verify user exists
    const user = await findUserById(payload.userId);
    if (!user) {
      res.status(401).json({
        success: false,
        error: {
          message: 'User not found'
        }
      });
      return;
    }

    // Attach user info to request
    req.user = {
      userId: user.user_id,
      email: user.email
    };

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Optional auth middleware
 * Attaches user to request if token is valid, but doesn't require it
 */
export async function optionalAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      next();
      return;
    }

    const parts = authHeader.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') {
      const token = parts[1];

      try {
        const payload = verifyAccessToken(token);
        const user = await findUserById(payload.userId);

        if (user) {
          req.user = {
            userId: user.user_id,
            email: user.email
          };
        }
      } catch (error) {
        // Silently fail for optional auth
      }
    }

    next();
  } catch (error) {
    next(error);
  }
}
