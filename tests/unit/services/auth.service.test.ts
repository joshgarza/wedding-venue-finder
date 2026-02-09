import { describe, it, expect, beforeEach, vi, beforeAll, afterAll } from 'vitest';
import * as authService from '../../../src/api/services/auth.service';
import * as userService from '../../../src/api/services/user.service';
import { hashPassword } from '../../../src/api/utils/password.utils';

// Mock dependencies
vi.mock('../../../src/api/services/user.service');
vi.mock('../../../db/db-config', () => ({
  db: vi.fn()
}));

describe('Auth Service', () => {
  const originalEnv = process.env.JWT_SECRET;

  beforeAll(() => {
    process.env.JWT_SECRET = 'test-secret-key-for-auth-testing';
  });

  afterAll(() => {
    if (originalEnv) {
      process.env.JWT_SECRET = originalEnv;
    } else {
      delete process.env.JWT_SECRET;
    }
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('signup', () => {
    it('should create a new user and return tokens', async () => {
      const email = 'newuser@example.com';
      const password = 'password123';
      const weddingDate = new Date('2025-06-15');

      const mockUser = {
        user_id: 'user-123',
        email,
        password_hash: await hashPassword(password),
        wedding_date: weddingDate,
        created_at: new Date()
      };

      vi.mocked(userService.findUserByEmail).mockResolvedValue(null);
      vi.mocked(userService.createUser).mockResolvedValue(mockUser);

      const result = await authService.signup(email, password, weddingDate);

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user.user_id).toBe('user-123');
      expect(result.user.email).toBe(email);
      expect(result.user).not.toHaveProperty('password_hash');
      expect(typeof result.accessToken).toBe('string');
      expect(typeof result.refreshToken).toBe('string');
    });

    it('should throw error if email already exists', async () => {
      const email = 'existing@example.com';
      const password = 'password123';

      const existingUser = {
        user_id: 'user-existing',
        email,
        password_hash: 'hashed',
        wedding_date: null,
        created_at: new Date()
      };

      vi.mocked(userService.findUserByEmail).mockResolvedValue(existingUser);

      await expect(authService.signup(email, password)).rejects.toThrow(
        'Email already exists'
      );

      expect(userService.createUser).not.toHaveBeenCalled();
    });

    it('should throw error for invalid email', async () => {
      const invalidEmail = 'not-an-email';
      const password = 'password123';

      await expect(authService.signup(invalidEmail, password)).rejects.toThrow();
    });

    it('should throw error for short password', async () => {
      const email = 'test@example.com';
      const shortPassword = 'short';

      await expect(authService.signup(email, shortPassword)).rejects.toThrow();
    });

    it('should create user without wedding date', async () => {
      const email = 'test@example.com';
      const password = 'password123';

      const mockUser = {
        user_id: 'user-123',
        email,
        password_hash: await hashPassword(password),
        wedding_date: null,
        created_at: new Date()
      };

      vi.mocked(userService.findUserByEmail).mockResolvedValue(null);
      vi.mocked(userService.createUser).mockResolvedValue(mockUser);

      const result = await authService.signup(email, password);

      expect(result.user.wedding_date).toBeNull();
    });
  });

  describe('login', () => {
    it('should authenticate user and return tokens', async () => {
      const email = 'test@example.com';
      const password = 'password123';

      const mockUser = {
        user_id: 'user-123',
        email,
        password_hash: await hashPassword(password),
        wedding_date: null,
        created_at: new Date()
      };

      vi.mocked(userService.findUserByEmail).mockResolvedValue(mockUser);

      const result = await authService.login(email, password);

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user.user_id).toBe('user-123');
      expect(result.user).not.toHaveProperty('password_hash');
    });

    it('should throw error if user not found', async () => {
      const email = 'nonexistent@example.com';
      const password = 'password123';

      vi.mocked(userService.findUserByEmail).mockResolvedValue(null);

      await expect(authService.login(email, password)).rejects.toThrow(
        'Invalid email or password'
      );
    });

    it('should throw error if password is incorrect', async () => {
      const email = 'test@example.com';
      const correctPassword = 'password123';
      const wrongPassword = 'wrongpassword';

      const mockUser = {
        user_id: 'user-123',
        email,
        password_hash: await hashPassword(correctPassword),
        wedding_date: null,
        created_at: new Date()
      };

      vi.mocked(userService.findUserByEmail).mockResolvedValue(mockUser);

      await expect(authService.login(email, wrongPassword)).rejects.toThrow(
        'Invalid email or password'
      );
    });

    it('should be case-insensitive for email', async () => {
      const email = 'Test@Example.COM';
      const password = 'password123';

      const mockUser = {
        user_id: 'user-123',
        email: 'test@example.com',
        password_hash: await hashPassword(password),
        wedding_date: null,
        created_at: new Date()
      };

      vi.mocked(userService.findUserByEmail).mockResolvedValue(mockUser);

      const result = await authService.login(email, password);

      expect(result.user.email).toBe('test@example.com');
    });
  });

  describe('refreshAccessToken', () => {
    it('should generate new access token from valid refresh token', async () => {
      const userId = 'user-123';
      const email = 'test@example.com';

      const mockUser = {
        user_id: userId,
        email,
        password_hash: 'hashed',
        wedding_date: null,
        created_at: new Date()
      };

      vi.mocked(userService.findUserById).mockResolvedValue(mockUser);

      // Generate a real refresh token for testing
      const { generateRefreshToken } = await import(
        '../../../src/api/utils/jwt.utils'
      );
      const refreshToken = generateRefreshToken(userId);

      const result = await authService.refreshAccessToken(refreshToken);

      expect(result).toHaveProperty('accessToken');
      expect(typeof result.accessToken).toBe('string');
      expect(result.accessToken.split('.').length).toBe(3);
    });

    it('should throw error for invalid refresh token', async () => {
      const invalidToken = 'invalid.token.here';

      await expect(
        authService.refreshAccessToken(invalidToken)
      ).rejects.toThrow();
    });

    it('should throw error if user not found', async () => {
      const userId = 'nonexistent-user';

      vi.mocked(userService.findUserById).mockResolvedValue(null);

      const { generateRefreshToken } = await import(
        '../../../src/api/utils/jwt.utils'
      );
      const refreshToken = generateRefreshToken(userId);

      await expect(
        authService.refreshAccessToken(refreshToken)
      ).rejects.toThrow('User not found');
    });

    it('should throw error for access token passed instead of refresh token', async () => {
      const { generateAccessToken } = await import(
        '../../../src/api/utils/jwt.utils'
      );
      const accessToken = generateAccessToken('user-123');

      await expect(
        authService.refreshAccessToken(accessToken)
      ).rejects.toThrow();
    });
  });

  describe('sanitizeUser', () => {
    it('should remove password_hash from user object', () => {
      const userWithPassword = {
        user_id: 'user-123',
        email: 'test@example.com',
        password_hash: 'hashed-password',
        wedding_date: null,
        created_at: new Date()
      };

      const sanitized = authService.sanitizeUser(userWithPassword);

      expect(sanitized).not.toHaveProperty('password_hash');
      expect(sanitized).toHaveProperty('user_id');
      expect(sanitized).toHaveProperty('email');
      expect(sanitized).toHaveProperty('wedding_date');
      expect(sanitized).toHaveProperty('created_at');
    });

    it('should preserve all fields except password_hash', () => {
      const user = {
        user_id: 'user-123',
        email: 'test@example.com',
        password_hash: 'hashed-password',
        wedding_date: new Date('2025-06-15'),
        created_at: new Date()
      };

      const sanitized = authService.sanitizeUser(user);

      expect(sanitized.user_id).toBe(user.user_id);
      expect(sanitized.email).toBe(user.email);
      expect(sanitized.wedding_date).toBe(user.wedding_date);
      expect(sanitized.created_at).toBe(user.created_at);
    });
  });
});
