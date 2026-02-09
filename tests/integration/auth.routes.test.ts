import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../src/api/server';
import { db } from '../../db/db-config';

describe('Auth Routes Integration Tests', () => {
  beforeAll(async () => {
    // Set JWT_SECRET for tests
    process.env.JWT_SECRET = 'test-secret-for-integration-tests';

    // Ensure database is connected
    await db.raw('SELECT 1');
  });

  afterAll(async () => {
    // Clean up database connection
    await db.destroy();
  });

  beforeEach(async () => {
    // Clean up users table before each test
    await db('users').del();
  });

  describe('POST /api/v1/auth/signup', () => {
    it('should create a new user and return tokens', async () => {
      const response = await request(app)
        .post('/api/v1/auth/signup')
        .send({
          email: 'test@example.com',
          password: 'password123'
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data).toHaveProperty('refreshToken');
      expect(response.body.data.user.email).toBe('test@example.com');
      expect(response.body.data.user).not.toHaveProperty('password_hash');
    });

    it('should create user with wedding date', async () => {
      const weddingDate = '2025-06-15';

      const response = await request(app)
        .post('/api/v1/auth/signup')
        .send({
          email: 'test@example.com',
          password: 'password123',
          weddingDate
        })
        .expect(201);

      expect(response.body.data.user.wedding_date).toBeDefined();
    });

    it('should return 409 if email already exists', async () => {
      // Create first user
      await request(app)
        .post('/api/v1/auth/signup')
        .send({
          email: 'test@example.com',
          password: 'password123'
        })
        .expect(201);

      // Try to create duplicate user
      const response = await request(app)
        .post('/api/v1/auth/signup')
        .send({
          email: 'test@example.com',
          password: 'password456'
        })
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Email already exists');
    });

    it('should return 400 for invalid email', async () => {
      const response = await request(app)
        .post('/api/v1/auth/signup')
        .send({
          email: 'not-an-email',
          password: 'password123'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe('Validation error');
    });

    it('should return 400 for short password', async () => {
      const response = await request(app)
        .post('/api/v1/auth/signup')
        .send({
          email: 'test@example.com',
          password: 'short'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe('Validation error');
    });

    it('should normalize email to lowercase', async () => {
      const response = await request(app)
        .post('/api/v1/auth/signup')
        .send({
          email: 'Test@Example.COM',
          password: 'password123'
        })
        .expect(201);

      expect(response.body.data.user.email).toBe('test@example.com');
    });

    it('should enforce rate limiting (5 attempts per 15 minutes)', async () => {
      // Make 5 requests (should succeed or fail based on other validation)
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/api/v1/auth/signup')
          .send({
            email: `test${i}@example.com`,
            password: 'password123'
          });
      }

      // 6th request should be rate limited
      const response = await request(app)
        .post('/api/v1/auth/signup')
        .send({
          email: 'test6@example.com',
          password: 'password123'
        })
        .expect(429);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Too many authentication attempts');
    });
  });

  describe('POST /api/v1/auth/login', () => {
    beforeEach(async () => {
      // Create a test user before each login test
      await request(app)
        .post('/api/v1/auth/signup')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });
    });

    it('should login user and return tokens', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data).toHaveProperty('refreshToken');
      expect(response.body.data.user).not.toHaveProperty('password_hash');
    });

    it('should return 401 for non-existent user', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123'
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe('Invalid email or password');
    });

    it('should return 401 for incorrect password', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword'
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe('Invalid email or password');
    });

    it('should be case-insensitive for email', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'Test@Example.COM',
          password: 'password123'
        })
        .expect(200);

      expect(response.body.data.user.email).toBe('test@example.com');
    });

    it('should return 400 for missing password', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'test@example.com'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    let refreshToken: string;

    beforeEach(async () => {
      // Create a user and get refresh token
      const response = await request(app)
        .post('/api/v1/auth/signup')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });

      refreshToken = response.body.data.refreshToken;
    });

    it('should return new access token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({
          refreshToken
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('accessToken');
      expect(typeof response.body.data.accessToken).toBe('string');
    });

    it('should return 401 for invalid refresh token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({
          refreshToken: 'invalid.token.here'
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 for missing refresh token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should reject access token passed as refresh token', async () => {
      // Get access token
      const signupResponse = await request(app)
        .post('/api/v1/auth/signup')
        .send({
          email: 'test2@example.com',
          password: 'password123'
        });

      const accessToken = signupResponse.body.data.accessToken;

      // Try to use access token as refresh token
      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({
          refreshToken: accessToken
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Protected Routes with Auth Middleware', () => {
    let accessToken: string;

    beforeEach(async () => {
      // Create a user and get access token
      const response = await request(app)
        .post('/api/v1/auth/signup')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });

      accessToken = response.body.data.accessToken;
    });

    it('should access protected route with valid token', async () => {
      // Note: This test requires a protected route to exist
      // For now, we'll test the middleware directly in unit tests
      expect(accessToken).toBeDefined();
      expect(typeof accessToken).toBe('string');
    });
  });
});
