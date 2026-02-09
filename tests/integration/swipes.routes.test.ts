import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express, { Express } from 'express';
import { errorHandler } from '../../src/api/middleware/errorHandler';
import swipesRoutes from '../../src/api/routes/swipes.routes';
import * as swipeService from '../../src/api/services/swipe.service';
import * as jwtUtils from '../../src/api/utils/jwt.utils';
import * as userService from '../../src/api/services/user.service';

// Mock dependencies
vi.mock('../../src/api/services/swipe.service');
vi.mock('../../src/api/utils/jwt.utils');
vi.mock('../../src/api/services/user.service');
vi.mock('../../db/db-config', () => ({
  db: vi.fn()
}));

describe('Swipes Routes', () => {
  let app: Express;
  const mockUserId = 'user-123';
  const mockToken = 'mock-jwt-token';
  const mockUser = {
    user_id: mockUserId,
    email: 'test@example.com',
    password_hash: 'hash',
    wedding_date: new Date('2025-06-15'),
    created_at: new Date()
  };

  beforeAll(() => {
    // Set up Express app with routes
    app = express();
    app.use(express.json());
    app.use('/swipes', swipesRoutes);
    app.use(errorHandler);

    // Mock JWT verification
    vi.mocked(jwtUtils.verifyAccessToken).mockReturnValue({
      userId: mockUserId,
      email: 'test@example.com'
    });

    vi.mocked(userService.findUserById).mockResolvedValue(mockUser);
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  describe('POST /swipes', () => {
    it('should record a right swipe successfully', async () => {
      const venueId = '550e8400-e29b-41d4-a716-446655440001'; // Valid UUID
      const action = 'right';
      const sessionId = '550e8400-e29b-41d4-a716-446655440002'; // Valid UUID

      const mockSwipe = {
        swipe_id: 'swipe-001',
        user_id: mockUserId,
        venue_id: venueId,
        action,
        session_id: sessionId,
        timestamp: new Date()
      };

      vi.mocked(swipeService.recordSwipe).mockResolvedValue(mockSwipe);

      const response = await request(app)
        .post('/swipes')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({ venueId, action, sessionId });

      if (response.status !== 201) {
        console.log('Error response:', response.body);
      }
      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.swipe.venue_id).toBe(venueId);
      expect(response.body.data.swipe.action).toBe(action);
      expect(swipeService.recordSwipe).toHaveBeenCalledWith(
        mockUserId,
        venueId,
        action,
        sessionId
      );
    });

    it('should record a left swipe without session ID', async () => {
      const venueId = '550e8400-e29b-41d4-a716-446655440003'; // Valid UUID
      const action = 'left';

      const mockSwipe = {
        swipe_id: 'swipe-002',
        user_id: mockUserId,
        venue_id: venueId,
        action,
        session_id: null,
        timestamp: new Date()
      };

      vi.mocked(swipeService.recordSwipe).mockResolvedValue(mockSwipe);

      const response = await request(app)
        .post('/swipes')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({ venueId, action });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.swipe.session_id).toBeNull();
    });

    it('should return 401 if not authenticated', async () => {
      const response = await request(app)
        .post('/swipes')
        .send({ venueId: 'venue-456', action: 'right' });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should return 400 for invalid action', async () => {
      const response = await request(app)
        .post('/swipes')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({ venueId: 'venue-456', action: 'invalid' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Validation failed');
    });

    it('should return 400 for invalid venue ID', async () => {
      const response = await request(app)
        .post('/swipes')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({ venueId: 'not-a-uuid', action: 'right' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return 409 for duplicate swipe', async () => {
      const venueId = '550e8400-e29b-41d4-a716-446655440004'; // Valid UUID
      const action = 'right';

      vi.mocked(swipeService.recordSwipe).mockRejectedValue(
        new Error('Venue already swiped')
      );

      const response = await request(app)
        .post('/swipes')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({ venueId, action });

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe('Venue already swiped');
    });

    it('should return 404 when unsaving non-existent swipe', async () => {
      const venueId = '550e8400-e29b-41d4-a716-446655440005'; // Valid UUID
      const action = 'unsave';

      vi.mocked(swipeService.recordSwipe).mockRejectedValue(
        new Error('No saved swipe found to unsave')
      );

      const response = await request(app)
        .post('/swipes')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({ venueId, action });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe('No saved swipe found to unsave');
    });
  });

  describe('GET /swipes/saved', () => {
    it('should return user shortlist', async () => {
      const mockVenues = [
        {
          venue_id: 'venue-1',
          name: 'Beautiful Estate',
          lat: 34.05,
          lng: -118.25,
          website_url: 'https://estate.com',
          image_data: { local_paths: ['/path/to/image1.jpg'] },
          is_wedding_venue: true,
          is_estate: true,
          is_historic: false,
          has_lodging: true,
          lodging_capacity: 50,
          pricing_tier: 'premium',
          swipe_timestamp: new Date()
        },
        {
          venue_id: 'venue-2',
          name: 'Rustic Barn',
          lat: 34.06,
          lng: -118.26,
          website_url: 'https://barn.com',
          image_data: { local_paths: ['/path/to/image2.jpg'] },
          is_wedding_venue: true,
          is_estate: false,
          is_historic: true,
          has_lodging: false,
          lodging_capacity: null,
          pricing_tier: 'moderate',
          swipe_timestamp: new Date()
        }
      ];

      vi.mocked(swipeService.getShortlist).mockResolvedValue(mockVenues);

      const response = await request(app)
        .get('/swipes/saved')
        .set('Authorization', `Bearer ${mockToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.venues).toHaveLength(2);
      expect(response.body.data.count).toBe(2);
      expect(response.body.data.venues[0].name).toBe('Beautiful Estate');
    });

    it('should return empty array if no saved venues', async () => {
      vi.mocked(swipeService.getShortlist).mockResolvedValue([]);

      const response = await request(app)
        .get('/swipes/saved')
        .set('Authorization', `Bearer ${mockToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.venues).toEqual([]);
      expect(response.body.data.count).toBe(0);
    });

    it('should return 401 if not authenticated', async () => {
      const response = await request(app)
        .get('/swipes/saved');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /swipes/history', () => {
    it('should return paginated swipe history with default params', async () => {
      const mockHistory = [
        {
          swipe_id: 'swipe-1',
          venue_id: 'venue-1',
          venue_name: 'Estate',
          action: 'right' as const,
          timestamp: new Date(),
          session_id: 'session-1'
        },
        {
          swipe_id: 'swipe-2',
          venue_id: 'venue-2',
          venue_name: 'Barn',
          action: 'left' as const,
          timestamp: new Date(),
          session_id: 'session-1'
        }
      ];

      vi.mocked(swipeService.getSwipeHistory).mockResolvedValue(mockHistory);

      const response = await request(app)
        .get('/swipes/history')
        .set('Authorization', `Bearer ${mockToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.swipes).toHaveLength(2);
      expect(response.body.data.limit).toBe(50);
      expect(response.body.data.offset).toBe(0);
      expect(swipeService.getSwipeHistory).toHaveBeenCalledWith(mockUserId, 50, 0);
    });

    it('should return paginated swipe history with custom params', async () => {
      vi.mocked(swipeService.getSwipeHistory).mockResolvedValue([]);

      const response = await request(app)
        .get('/swipes/history?limit=10&offset=20')
        .set('Authorization', `Bearer ${mockToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.limit).toBe(10);
      expect(response.body.data.offset).toBe(20);
      expect(swipeService.getSwipeHistory).toHaveBeenCalledWith(mockUserId, 10, 20);
    });

    it('should enforce max limit of 200', async () => {
      vi.mocked(swipeService.getSwipeHistory).mockResolvedValue([]);

      const response = await request(app)
        .get('/swipes/history?limit=500')
        .set('Authorization', `Bearer ${mockToken}`);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return 401 if not authenticated', async () => {
      const response = await request(app)
        .get('/swipes/history');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /swipes/session/:sessionId', () => {
    it('should return swipes for specific session', async () => {
      const sessionId = '550e8400-e29b-41d4-a716-446655440010'; // Valid UUID
      const mockSessionSwipes = [
        {
          swipe_id: 'swipe-1',
          venue_id: 'venue-1',
          venue_name: 'Estate',
          action: 'right' as const,
          timestamp: new Date()
        },
        {
          swipe_id: 'swipe-2',
          venue_id: 'venue-2',
          venue_name: 'Barn',
          action: 'left' as const,
          timestamp: new Date()
        }
      ];

      vi.mocked(swipeService.getSessionSwipes).mockResolvedValue(mockSessionSwipes);

      const response = await request(app)
        .get(`/swipes/session/${sessionId}`)
        .set('Authorization', `Bearer ${mockToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.swipes).toHaveLength(2);
      expect(response.body.data.session_id).toBe(sessionId);
      expect(swipeService.getSessionSwipes).toHaveBeenCalledWith(mockUserId, sessionId);
    });

    it('should return empty array if session has no swipes', async () => {
      const sessionId = '550e8400-e29b-41d4-a716-446655440011'; // Valid UUID

      vi.mocked(swipeService.getSessionSwipes).mockResolvedValue([]);

      const response = await request(app)
        .get(`/swipes/session/${sessionId}`)
        .set('Authorization', `Bearer ${mockToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.swipes).toEqual([]);
      expect(response.body.data.count).toBe(0);
    });

    it('should return 400 for invalid session ID', async () => {
      const response = await request(app)
        .get('/swipes/session/not-a-uuid')
        .set('Authorization', `Bearer ${mockToken}`);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Invalid session ID');
    });

    it('should return 401 if not authenticated', async () => {
      const response = await request(app)
        .get('/swipes/session/session-123');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });
});
