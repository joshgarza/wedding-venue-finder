import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the database before importing the service
vi.mock('../../../db/db-config', () => ({
  db: vi.fn()
}));

// Mock password utils to avoid bcrypt calls
vi.mock('../../../src/api/utils/password.utils', () => ({
  hashPassword: vi.fn().mockResolvedValue('hashed-password'),
  verifyPassword: vi.fn()
}));

// Import after mocking
import * as userService from '../../../src/api/services/user.service';
import { db } from '../../../db/db-config';

const mockDb = vi.mocked(db, true);

describe('User Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createUser', () => {
    it('should create a new user with hashed password', async () => {
      const email = 'test@example.com';
      const password = 'testPass123';
      const weddingDate = new Date('2025-06-15');

      const mockUser = {
        user_id: 'user-123',
        email,
        password_hash: 'hashed-password',
        wedding_date: weddingDate,
        created_at: new Date()
      };

      // Mock database insert chain
      const returningMock = vi.fn().mockResolvedValue([mockUser]);
      const insertMock = vi.fn().mockReturnValue({ returning: returningMock });
      mockDb.mockReturnValue({ insert: insertMock });

      const result = await userService.createUser(email, password, weddingDate);

      expect(result).toEqual(mockUser);
      expect(insertMock).toHaveBeenCalled();
      expect(returningMock).toHaveBeenCalledWith('*');
    });

    it('should throw error for invalid email format', async () => {
      const invalidEmail = 'not-an-email';
      const password = 'testPass123';

      await expect(
        userService.createUser(invalidEmail, password)
      ).rejects.toThrow('Invalid email format');
    });

    it('should throw error for short password', async () => {
      const email = 'test@example.com';
      const shortPassword = 'short';

      await expect(
        userService.createUser(email, shortPassword)
      ).rejects.toThrow('Password must be at least 8 characters');
    });
  });

  describe('findUserByEmail', () => {
    it('should find user by email', async () => {
      const email = 'test@example.com';
      const mockUser = {
        user_id: 'user-123',
        email,
        password_hash: 'hashed-password',
        wedding_date: null,
        created_at: new Date()
      };

      const firstMock = vi.fn().mockResolvedValue(mockUser);
      const whereMock = vi.fn().mockReturnValue({ first: firstMock });
      mockDb.mockReturnValue({ where: whereMock });

      const result = await userService.findUserByEmail(email);

      expect(result).toEqual(mockUser);
      expect(whereMock).toHaveBeenCalledWith({ email: email.toLowerCase() });
    });

    it('should return null if user not found', async () => {
      const email = 'nonexistent@example.com';

      const firstMock = vi.fn().mockResolvedValue(null);
      const whereMock = vi.fn().mockReturnValue({ first: firstMock });
      mockDb.mockReturnValue({ where: whereMock });

      const result = await userService.findUserByEmail(email);

      expect(result).toBeNull();
    });
  });

  describe('findUserById', () => {
    it('should find user by ID', async () => {
      const userId = 'user-123';
      const mockUser = {
        user_id: userId,
        email: 'test@example.com',
        password_hash: 'hashed-password',
        wedding_date: null,
        created_at: new Date()
      };

      const firstMock = vi.fn().mockResolvedValue(mockUser);
      const whereMock = vi.fn().mockReturnValue({ first: firstMock });
      mockDb.mockReturnValue({ where: whereMock });

      const result = await userService.findUserById(userId);

      expect(result).toEqual(mockUser);
      expect(whereMock).toHaveBeenCalledWith({ user_id: userId });
    });

    it('should return null if user not found', async () => {
      const userId = 'nonexistent-id';

      const firstMock = vi.fn().mockResolvedValue(null);
      const whereMock = vi.fn().mockReturnValue({ first: firstMock });
      mockDb.mockReturnValue({ where: whereMock });

      const result = await userService.findUserById(userId);

      expect(result).toBeNull();
    });
  });
});
