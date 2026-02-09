/**
 * Integration tests for taste profile routes
 * Tests full HTTP request/response cycle with mocked services
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express, { Express } from 'express';
import tasteProfileRoutes from '../../src/api/routes/taste-profile.routes';
import { TasteProfileService } from '../../src/api/services/taste-profile.service';
import { verifyAccessToken } from '../../src/api/utils/jwt.utils';
import { findUserById } from '../../src/api/services/user.service';

// Mock dependencies
vi.mock('../../src/api/services/taste-profile.service');
vi.mock('../../src/api/utils/jwt.utils');
vi.mock('../../src/api/services/user.service');

describe('Taste Profile Routes', () => {
  let app: Express;
  const mockUserId = 'user-123';
  const mockToken = 'mock-jwt-token';

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup Express app
    app = express();
    app.use(express.json());
    app.use('/api/taste-profile', tasteProfileRoutes);

    // Mock JWT verification
    vi.mocked(verifyAccessToken).mockReturnValue({
      userId: mockUserId,
      email: 'test@example.com'
    });

    // Mock user lookup
    vi.mocked(findUserById).mockResolvedValue({
      user_id: mockUserId,
      email: 'test@example.com',
      password_hash: 'hash',
      wedding_date: null,
      created_at: new Date()
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET /api/taste-profile/onboarding', () => {
    it('should return 10 onboarding venues', async () => {
      const mockVenues = Array(10).fill(0).map((_, i) => ({
        venueId: `venue-${i}`,
        name: `Venue ${i}`,
        imagePath: `/path/to/image${i}.jpg`
      }));

      vi.mocked(TasteProfileService.getOnboardingVenues).mockResolvedValueOnce(
        mockVenues
      );

      const response = await request(app)
        .get('/api/taste-profile/onboarding')
        .set('Authorization', `Bearer ${mockToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.venues).toHaveLength(10);
      expect(response.body.data.venues[0]).toHaveProperty('venueId');
      expect(response.body.data.venues[0]).toHaveProperty('name');
      expect(response.body.data.venues[0]).toHaveProperty('imagePath');
    });

    it('should return 401 without authentication', async () => {
      vi.mocked(verifyAccessToken).mockImplementationOnce(() => {
        throw new Error('Invalid token');
      });

      const response = await request(app)
        .get('/api/taste-profile/onboarding')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should return 400 if insufficient venues', async () => {
      vi.mocked(TasteProfileService.getOnboardingVenues).mockRejectedValueOnce(
        new Error('Insufficient venues for onboarding')
      );

      const response = await request(app)
        .get('/api/taste-profile/onboarding')
        .set('Authorization', `Bearer ${mockToken}`);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Insufficient venues');
    });
  });

  describe('POST /api/taste-profile/generate', () => {
    it('should generate taste profile from session', async () => {
      const sessionId = 'session-456';
      const mockProfile = {
        profileId: 'profile-789',
        userId: mockUserId,
        descriptiveWords: ['Elegant', 'Modern', 'Romantic', 'Classic', 'Garden'],
        confidence: 0.85
      };

      vi.mocked(TasteProfileService.generateProfile).mockResolvedValueOnce(
        mockProfile
      );

      const response = await request(app)
        .post('/api/taste-profile/generate')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({ sessionId });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.profile).toEqual(mockProfile);
      expect(TasteProfileService.generateProfile).toHaveBeenCalledWith(
        mockUserId,
        sessionId
      );
    });

    it('should validate sessionId format', async () => {
      const response = await request(app)
        .post('/api/taste-profile/generate')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({ sessionId: 'invalid-uuid' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Invalid');
    });

    it('should return 400 if insufficient right swipes', async () => {
      const sessionId = 'session-456';

      vi.mocked(TasteProfileService.generateProfile).mockRejectedValueOnce(
        new Error('Insufficient right swipes. Got 3, need at least 5')
      );

      const response = await request(app)
        .post('/api/taste-profile/generate')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({ sessionId });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Insufficient right swipes');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/taste-profile/generate')
        .send({ sessionId: 'session-456' });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/taste-profile', () => {
    it('should return user taste profile', async () => {
      const mockProfile = {
        profileId: 'profile-789',
        userId: mockUserId,
        descriptiveWords: ['Elegant', 'Modern', 'Romantic', 'Classic', 'Garden'],
        confidence: 0.85
      };

      vi.mocked(TasteProfileService.getTasteProfile).mockResolvedValueOnce(
        mockProfile
      );

      const response = await request(app)
        .get('/api/taste-profile')
        .set('Authorization', `Bearer ${mockToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.profile).toEqual(mockProfile);
      expect(TasteProfileService.getTasteProfile).toHaveBeenCalledWith(mockUserId);
    });

    it('should return 404 if profile not found', async () => {
      vi.mocked(TasteProfileService.getTasteProfile).mockResolvedValueOnce(null);

      const response = await request(app)
        .get('/api/taste-profile')
        .set('Authorization', `Bearer ${mockToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe('Taste profile not found');
    });

    it('should require authentication', async () => {
      const response = await request(app).get('/api/taste-profile');

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/taste-profile/update', () => {
    it('should update profile on right swipe', async () => {
      const venueId = 'venue-456';
      const mockProfile = {
        profileId: 'profile-789',
        userId: mockUserId,
        descriptiveWords: ['Elegant', 'Modern', 'Romantic', 'Rustic', 'Garden'],
        confidence: 0.87
      };

      vi.mocked(TasteProfileService.updateProfile).mockResolvedValueOnce(
        mockProfile
      );

      const response = await request(app)
        .post('/api/taste-profile/update')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({ venueId, action: 'right' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.profile).toEqual(mockProfile);
      expect(TasteProfileService.updateProfile).toHaveBeenCalledWith(
        mockUserId,
        venueId,
        'right'
      );
    });

    it('should validate venueId format', async () => {
      const response = await request(app)
        .post('/api/taste-profile/update')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({ venueId: 'invalid-uuid', action: 'right' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should validate action enum', async () => {
      const response = await request(app)
        .post('/api/taste-profile/update')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({ venueId: 'venue-456', action: 'invalid' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should handle left swipe without updating', async () => {
      const venueId = 'venue-456';
      const mockProfile = {
        profileId: 'profile-789',
        userId: mockUserId,
        descriptiveWords: ['Elegant', 'Modern', 'Romantic', 'Classic', 'Garden'],
        confidence: 0.85
      };

      vi.mocked(TasteProfileService.updateProfile).mockResolvedValueOnce(
        mockProfile
      );

      const response = await request(app)
        .post('/api/taste-profile/update')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({ venueId, action: 'left' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(TasteProfileService.updateProfile).toHaveBeenCalledWith(
        mockUserId,
        venueId,
        'left'
      );
    });

    it('should return 400 if profile not found', async () => {
      vi.mocked(TasteProfileService.updateProfile).mockRejectedValueOnce(
        new Error('Taste profile not found')
      );

      const response = await request(app)
        .post('/api/taste-profile/update')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({ venueId: 'venue-456', action: 'right' });

      expect(response.status).toBe(400);
      expect(response.body.error.message).toBe('Taste profile not found');
    });
  });

  describe('POST /api/taste-profile/rank-venues', () => {
    it('should rank venues by taste similarity', async () => {
      const venueIds = ['venue-1', 'venue-2', 'venue-3'];
      const mockRankedVenues = [
        { venueId: 'venue-2', similarity: 0.95 },
        { venueId: 'venue-1', similarity: 0.87 },
        { venueId: 'venue-3', similarity: 0.72 }
      ];

      vi.mocked(TasteProfileService.rankVenuesByTaste).mockResolvedValueOnce(
        mockRankedVenues
      );

      const response = await request(app)
        .post('/api/taste-profile/rank-venues')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({ venueIds });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.venues).toEqual(mockRankedVenues);
      expect(TasteProfileService.rankVenuesByTaste).toHaveBeenCalledWith(
        mockUserId,
        venueIds
      );
    });

    it('should validate venueIds array', async () => {
      const response = await request(app)
        .post('/api/taste-profile/rank-venues')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({ venueIds: [] });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should validate venueIds format', async () => {
      const response = await request(app)
        .post('/api/taste-profile/rank-venues')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({ venueIds: ['invalid-uuid'] });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should enforce max 100 venues limit', async () => {
      const venueIds = Array(101).fill(0).map((_, i) =>
        `00000000-0000-0000-0000-${String(i).padStart(12, '0')}`
      );

      const response = await request(app)
        .post('/api/taste-profile/rank-venues')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({ venueIds });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return 400 if profile not found', async () => {
      vi.mocked(TasteProfileService.rankVenuesByTaste).mockRejectedValueOnce(
        new Error('Taste profile not found')
      );

      const response = await request(app)
        .post('/api/taste-profile/rank-venues')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({ venueIds: ['venue-1', 'venue-2'] });

      expect(response.status).toBe(400);
      expect(response.body.error.message).toBe('Taste profile not found');
    });
  });
});
