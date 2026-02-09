import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken
} from '../../../src/api/utils/jwt.utils';

describe('JWT Utils', () => {
  const originalEnv = process.env.JWT_SECRET;

  beforeAll(() => {
    // Set test JWT secret
    process.env.JWT_SECRET = 'test-secret-key-for-jwt-testing';
  });

  afterAll(() => {
    // Restore original env
    if (originalEnv) {
      process.env.JWT_SECRET = originalEnv;
    } else {
      delete process.env.JWT_SECRET;
    }
  });

  describe('generateAccessToken', () => {
    it('should generate a valid access token', () => {
      const userId = 'user-123';
      const token = generateAccessToken(userId);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.').length).toBe(3); // JWT has 3 parts
    });

    it('should generate different tokens for different users', () => {
      const token1 = generateAccessToken('user-1');
      const token2 = generateAccessToken('user-2');

      expect(token1).not.toBe(token2);
    });

    it('should throw error if JWT_SECRET is not set', () => {
      delete process.env.JWT_SECRET;

      expect(() => generateAccessToken('user-123')).toThrow(
        'JWT_SECRET environment variable is not set'
      );

      // Restore for other tests
      process.env.JWT_SECRET = 'test-secret-key-for-jwt-testing';
    });
  });

  describe('generateRefreshToken', () => {
    it('should generate a valid refresh token', () => {
      const userId = 'user-123';
      const token = generateRefreshToken(userId);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.').length).toBe(3);
    });

    it('should generate different tokens for different users', () => {
      const token1 = generateRefreshToken('user-1');
      const token2 = generateRefreshToken('user-2');

      expect(token1).not.toBe(token2);
    });

    it('should throw error if JWT_SECRET is not set', () => {
      delete process.env.JWT_SECRET;

      expect(() => generateRefreshToken('user-123')).toThrow(
        'JWT_SECRET environment variable is not set'
      );

      // Restore for other tests
      process.env.JWT_SECRET = 'test-secret-key-for-jwt-testing';
    });
  });

  describe('verifyAccessToken', () => {
    it('should verify a valid access token', () => {
      const userId = 'user-123';
      const token = generateAccessToken(userId);
      const payload = verifyAccessToken(token);

      expect(payload).toBeDefined();
      expect(payload.userId).toBe(userId);
      expect(payload.type).toBe('access');
    });

    it('should include expiration time in payload', () => {
      const userId = 'user-123';
      const token = generateAccessToken(userId);
      const payload = verifyAccessToken(token);

      expect(payload.exp).toBeDefined();
      expect(payload.iat).toBeDefined();
      expect(payload.exp).toBeGreaterThan(payload.iat);
    });

    it('should throw error for invalid token', () => {
      const invalidToken = 'invalid.token.here';

      expect(() => verifyAccessToken(invalidToken)).toThrow();
    });

    it('should throw error for expired token', () => {
      // Create a token with -1 second expiration (already expired)
      const jwt = require('jsonwebtoken');
      const expiredToken = jwt.sign(
        { userId: 'user-123', type: 'access' },
        process.env.JWT_SECRET,
        { expiresIn: '-1s' }
      );

      expect(() => verifyAccessToken(expiredToken)).toThrow();
    });

    it('should throw error for refresh token passed to access verifier', () => {
      const userId = 'user-123';
      const refreshToken = generateRefreshToken(userId);

      expect(() => verifyAccessToken(refreshToken)).toThrow(
        'Invalid token type'
      );
    });

    it('should throw error if JWT_SECRET is not set', () => {
      const token = generateAccessToken('user-123');
      delete process.env.JWT_SECRET;

      expect(() => verifyAccessToken(token)).toThrow(
        'JWT_SECRET environment variable is not set'
      );

      // Restore for other tests
      process.env.JWT_SECRET = 'test-secret-key-for-jwt-testing';
    });
  });

  describe('verifyRefreshToken', () => {
    it('should verify a valid refresh token', () => {
      const userId = 'user-123';
      const token = generateRefreshToken(userId);
      const payload = verifyRefreshToken(token);

      expect(payload).toBeDefined();
      expect(payload.userId).toBe(userId);
      expect(payload.type).toBe('refresh');
    });

    it('should throw error for invalid token', () => {
      const invalidToken = 'invalid.token.here';

      expect(() => verifyRefreshToken(invalidToken)).toThrow();
    });

    it('should throw error for access token passed to refresh verifier', () => {
      const userId = 'user-123';
      const accessToken = generateAccessToken(userId);

      expect(() => verifyRefreshToken(accessToken)).toThrow(
        'Invalid token type'
      );
    });

    it('should throw error for expired refresh token', () => {
      const jwt = require('jsonwebtoken');
      const expiredToken = jwt.sign(
        { userId: 'user-123', type: 'refresh' },
        process.env.JWT_SECRET,
        { expiresIn: '-1s' }
      );

      expect(() => verifyRefreshToken(expiredToken)).toThrow();
    });
  });

  describe('Token Expiration Times', () => {
    it('access token should expire in 15 minutes', () => {
      const userId = 'user-123';
      const token = generateAccessToken(userId);
      const payload = verifyAccessToken(token);

      const expirationTime = payload.exp - payload.iat;
      expect(expirationTime).toBe(15 * 60); // 15 minutes in seconds
    });

    it('refresh token should expire in 7 days', () => {
      const userId = 'user-123';
      const token = generateRefreshToken(userId);
      const payload = verifyRefreshToken(token);

      const expirationTime = payload.exp - payload.iat;
      expect(expirationTime).toBe(7 * 24 * 60 * 60); // 7 days in seconds
    });
  });
});
