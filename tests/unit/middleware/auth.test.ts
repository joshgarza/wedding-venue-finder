import { describe, it, expect, beforeEach, vi, beforeAll, afterAll } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { requireAuth, optionalAuth, AuthRequest } from '../../../src/api/middleware/auth';
import { generateAccessToken, generateRefreshToken } from '../../../src/api/utils/jwt.utils';
import * as userService from '../../../src/api/services/user.service';

// Mock dependencies
vi.mock('../../../src/api/services/user.service');

describe('Auth Middleware', () => {
  const originalEnv = process.env.JWT_SECRET;

  beforeAll(() => {
    process.env.JWT_SECRET = 'test-secret-key-for-middleware-testing';
  });

  afterAll(() => {
    if (originalEnv) {
      process.env.JWT_SECRET = originalEnv;
    } else {
      delete process.env.JWT_SECRET;
    }
  });

  let req: Partial<AuthRequest>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    vi.clearAllMocks();

    req = {
      headers: {}
    };

    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis()
    };

    next = vi.fn();
  });

  describe('requireAuth', () => {
    it('should authenticate valid token and attach user to request', async () => {
      const userId = 'user-123';
      const token = generateAccessToken(userId);

      const mockUser = {
        user_id: userId,
        email: 'test@example.com',
        password_hash: 'hashed',
        wedding_date: null,
        created_at: new Date()
      };

      vi.mocked(userService.findUserById).mockResolvedValue(mockUser);

      req.headers = {
        authorization: `Bearer ${token}`
      };

      await requireAuth(req as AuthRequest, res as Response, next);

      expect(req.user).toBeDefined();
      expect(req.user?.userId).toBe(userId);
      expect(req.user?.email).toBe('test@example.com');
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should return 401 if authorization header is missing', async () => {
      req.headers = {};

      await requireAuth(req as AuthRequest, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Authorization header missing'
        }
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 for invalid authorization header format', async () => {
      req.headers = {
        authorization: 'InvalidFormat token'
      };

      await requireAuth(req as AuthRequest, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Invalid authorization header format. Expected: Bearer <token>'
        }
      });
    });

    it('should return 401 for missing Bearer keyword', async () => {
      req.headers = {
        authorization: 'token-without-bearer'
      };

      await requireAuth(req as AuthRequest, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should return 401 for invalid token', async () => {
      req.headers = {
        authorization: 'Bearer invalid.token.here'
      };

      await requireAuth(req as AuthRequest, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Invalid or expired token'
        }
      });
    });

    it('should return 401 for expired token', async () => {
      const jwt = require('jsonwebtoken');
      const expiredToken = jwt.sign(
        { userId: 'user-123', type: 'access' },
        process.env.JWT_SECRET,
        { expiresIn: '-1s' }
      );

      req.headers = {
        authorization: `Bearer ${expiredToken}`
      };

      await requireAuth(req as AuthRequest, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Invalid or expired token'
        }
      });
    });

    it('should return 401 if user not found in database', async () => {
      const userId = 'user-123';
      const token = generateAccessToken(userId);

      vi.mocked(userService.findUserById).mockResolvedValue(null);

      req.headers = {
        authorization: `Bearer ${token}`
      };

      await requireAuth(req as AuthRequest, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'User not found'
        }
      });
    });

    it('should reject refresh token', async () => {
      const userId = 'user-123';
      const refreshToken = generateRefreshToken(userId);

      req.headers = {
        authorization: `Bearer ${refreshToken}`
      };

      await requireAuth(req as AuthRequest, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should call next with error for unexpected errors', async () => {
      const userId = 'user-123';
      const token = generateAccessToken(userId);

      vi.mocked(userService.findUserById).mockRejectedValue(
        new Error('Database error')
      );

      req.headers = {
        authorization: `Bearer ${token}`
      };

      await requireAuth(req as AuthRequest, res as Response, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('optionalAuth', () => {
    it('should attach user to request if valid token provided', async () => {
      const userId = 'user-123';
      const token = generateAccessToken(userId);

      const mockUser = {
        user_id: userId,
        email: 'test@example.com',
        password_hash: 'hashed',
        wedding_date: null,
        created_at: new Date()
      };

      vi.mocked(userService.findUserById).mockResolvedValue(mockUser);

      req.headers = {
        authorization: `Bearer ${token}`
      };

      await optionalAuth(req as AuthRequest, res as Response, next);

      expect(req.user).toBeDefined();
      expect(req.user?.userId).toBe(userId);
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should continue without user if no token provided', async () => {
      req.headers = {};

      await optionalAuth(req as AuthRequest, res as Response, next);

      expect(req.user).toBeUndefined();
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should continue without user if token is invalid', async () => {
      req.headers = {
        authorization: 'Bearer invalid.token.here'
      };

      await optionalAuth(req as AuthRequest, res as Response, next);

      expect(req.user).toBeUndefined();
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should continue without user if user not found', async () => {
      const userId = 'user-123';
      const token = generateAccessToken(userId);

      vi.mocked(userService.findUserById).mockResolvedValue(null);

      req.headers = {
        authorization: `Bearer ${token}`
      };

      await optionalAuth(req as AuthRequest, res as Response, next);

      expect(req.user).toBeUndefined();
      expect(next).toHaveBeenCalled();
    });

    it('should handle malformed authorization header gracefully', async () => {
      req.headers = {
        authorization: 'MalformedHeader'
      };

      await optionalAuth(req as AuthRequest, res as Response, next);

      expect(req.user).toBeUndefined();
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
  });
});
