import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as swipeService from '../../../src/api/services/swipe.service';
import { db } from '../../../db/db-config';

// Mock dependencies
vi.mock('../../../db/db-config', () => ({
  db: vi.fn()
}));

// Mock taste-profile service
vi.mock('../../../src/api/services/taste-profile.service', () => ({
  updateProfile: vi.fn()
}));

import * as tasteProfileService from '../../../src/api/services/taste-profile.service';

describe('Swipe Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('recordSwipe', () => {
    it('should record a right swipe and trigger taste profile update', async () => {
      const userId = 'user-123';
      const venueId = 'venue-456';
      const action = 'right';
      const sessionId = 'session-789';

      const mockSwipe = {
        swipe_id: 'swipe-001',
        user_id: userId,
        venue_id: venueId,
        action,
        session_id: sessionId,
        timestamp: new Date()
      };

      // Mock database check for existing swipe (none found)
      const mockCheckQuery = {
        where: vi.fn().mockResolvedValue([])
      };

      // Mock database insert
      const mockReturning = vi.fn().mockResolvedValue([mockSwipe]);
      const mockInsert = vi.fn().mockReturnValue({
        returning: mockReturning
      });

      const mockInsertQuery = {
        insert: mockInsert
      };

      // Mock taste profile check (profile exists)
      const mockFirst = vi.fn().mockResolvedValue({
        user_id: userId,
        embedding_vector: new Array(512).fill(0)
      });

      const mockProfileQuery = {
        where: vi.fn().mockReturnValue({
          first: mockFirst
        })
      };

      // Set up db mock to return different queries based on table name
      let callCount = 0;
      vi.mocked(db).mockImplementation(((table: string) => {
        callCount++;
        if (callCount === 1) return mockCheckQuery; // First call: check existing swipes
        if (callCount === 2) return mockInsertQuery; // Second call: insert new swipe
        if (callCount === 3) return mockProfileQuery; // Third call: check taste profile
        return mockCheckQuery;
      }) as any);

      // Mock taste profile update
      vi.mocked(tasteProfileService.updateProfile).mockResolvedValue({
        user_id: userId,
        embedding_vector: new Array(512).fill(0),
        descriptive_words: ['Elegant', 'Rustic', 'Vintage', 'Charming', 'Romantic'],
        confidence_score: 0.85,
        last_updated: new Date()
      });

      const result = await swipeService.recordSwipe(userId, venueId, action, sessionId);

      expect(result).toBeDefined();
      expect(result.action).toBe(action);
      expect(tasteProfileService.updateProfile).toHaveBeenCalledWith(userId);
    });

    it('should record a left swipe without updating taste profile', async () => {
      const userId = 'user-123';
      const venueId = 'venue-456';
      const action = 'left';

      const mockSwipe = {
        swipe_id: 'swipe-002',
        user_id: userId,
        venue_id: venueId,
        action,
        session_id: null,
        timestamp: new Date()
      };

      // Mock database check for existing swipe (none found)
      const mockCheckQuery = {
        where: vi.fn().mockResolvedValue([])
      };

      // Mock database insert
      const mockReturning = vi.fn().mockResolvedValue([mockSwipe]);
      const mockInsert = vi.fn().mockReturnValue({
        returning: mockReturning
      });

      const mockInsertQuery = {
        insert: mockInsert
      };

      let callCount = 0;
      vi.mocked(db).mockImplementation(((table: string) => {
        callCount++;
        if (callCount === 1) return mockCheckQuery; // Check existing swipes
        if (callCount === 2) return mockInsertQuery; // Insert new swipe
        return mockCheckQuery;
      }) as any);

      const result = await swipeService.recordSwipe(userId, venueId, action);

      expect(result).toBeDefined();
      expect(result.action).toBe(action);
      expect(tasteProfileService.updateProfile).not.toHaveBeenCalled();
    });

    it('should throw error if duplicate swipe exists (not unsave)', async () => {
      const userId = 'user-123';
      const venueId = 'venue-456';
      const action = 'right';

      // Mock existing swipe found
      const mockWhere = vi.fn().mockResolvedValue([
        { swipe_id: 'existing-swipe', action: 'left' }
      ]);

      vi.mocked(db).mockReturnValue({
        where: mockWhere
      } as any);

      await expect(
        swipeService.recordSwipe(userId, venueId, action)
      ).rejects.toThrow('Venue already swiped');
    });

    it('should delete previous right swipe when action is unsave', async () => {
      const userId = 'user-123';
      const venueId = 'venue-456';
      const action = 'unsave';

      // Mock finding existing 'right' swipe
      const mockCheckQuery = {
        where: vi.fn().mockResolvedValue([
          { swipe_id: 'swipe-right-001', action: 'right', session_id: null }
        ])
      };

      // Mock delete operation
      const mockDelete = vi.fn().mockResolvedValue(1);
      const mockDeleteQuery = {
        where: vi.fn().mockReturnValue({
          delete: mockDelete
        })
      };

      let callCount = 0;
      vi.mocked(db).mockImplementation(((table: string) => {
        callCount++;
        if (callCount === 1) return mockCheckQuery; // Check existing swipes
        if (callCount === 2) return mockDeleteQuery; // Delete swipe
        return mockCheckQuery;
      }) as any);

      const result = await swipeService.recordSwipe(userId, venueId, action);

      expect(mockDelete).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result.action).toBe('unsave');
    });

    it('should throw error if unsave but no right swipe exists', async () => {
      const userId = 'user-123';
      const venueId = 'venue-456';
      const action = 'unsave';

      // Mock no existing swipe
      const mockWhere = vi.fn().mockResolvedValue([]);

      vi.mocked(db).mockReturnValue({
        where: mockWhere
      } as any);

      await expect(
        swipeService.recordSwipe(userId, venueId, action)
      ).rejects.toThrow('No saved swipe found to unsave');
    });

    it('should record swipe without session_id', async () => {
      const userId = 'user-123';
      const venueId = 'venue-456';
      const action = 'left';

      const mockSwipe = {
        swipe_id: 'swipe-003',
        user_id: userId,
        venue_id: venueId,
        action,
        session_id: null,
        timestamp: new Date()
      };

      // Mock database check for existing swipe (none found)
      const mockCheckQuery = {
        where: vi.fn().mockResolvedValue([])
      };

      // Mock database insert
      const mockReturning = vi.fn().mockResolvedValue([mockSwipe]);
      const mockInsert = vi.fn().mockReturnValue({
        returning: mockReturning
      });

      const mockInsertQuery = {
        insert: mockInsert
      };

      let callCount = 0;
      vi.mocked(db).mockImplementation(((table: string) => {
        callCount++;
        if (callCount === 1) return mockCheckQuery; // Check existing swipes
        if (callCount === 2) return mockInsertQuery; // Insert new swipe
        return mockCheckQuery;
      }) as any);

      const result = await swipeService.recordSwipe(userId, venueId, action);

      expect(result).toBeDefined();
      expect(result.session_id).toBeNull();
    });
  });

  describe('getShortlist', () => {
    it('should return all venues with right swipes', async () => {
      const userId = 'user-123';

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
          pricing_tier: 'moderate',
          swipe_timestamp: new Date()
        }
      ];

      const mockJoin = vi.fn().mockReturnThis();
      const mockWhere = vi.fn().mockReturnThis();
      const mockOrderBy = vi.fn().mockResolvedValue(mockVenues);

      vi.mocked(db).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        join: mockJoin,
        where: mockWhere,
        orderBy: mockOrderBy
      } as any);

      const result = await swipeService.getShortlist(userId);

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Beautiful Estate');
      expect(mockWhere).toHaveBeenCalledWith({
        's.user_id': userId,
        's.action': 'right'
      });
    });

    it('should return empty array if no saved venues', async () => {
      const userId = 'user-123';

      const mockJoin = vi.fn().mockReturnThis();
      const mockWhere = vi.fn().mockReturnThis();
      const mockOrderBy = vi.fn().mockResolvedValue([]);

      vi.mocked(db).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        join: mockJoin,
        where: mockWhere,
        orderBy: mockOrderBy
      } as any);

      const result = await swipeService.getShortlist(userId);

      expect(result).toEqual([]);
    });
  });

  describe('getSwipeHistory', () => {
    it('should return paginated swipe history', async () => {
      const userId = 'user-123';
      const limit = 10;
      const offset = 0;

      const mockHistory = [
        {
          swipe_id: 'swipe-1',
          venue_id: 'venue-1',
          venue_name: 'Estate',
          action: 'right',
          timestamp: new Date(),
          session_id: 'session-1'
        },
        {
          swipe_id: 'swipe-2',
          venue_id: 'venue-2',
          venue_name: 'Barn',
          action: 'left',
          timestamp: new Date(),
          session_id: 'session-1'
        }
      ];

      const mockJoin = vi.fn().mockReturnThis();
      const mockWhere = vi.fn().mockReturnThis();
      const mockOrderBy = vi.fn().mockReturnThis();
      const mockLimit = vi.fn().mockReturnThis();
      const mockOffset = vi.fn().mockResolvedValue(mockHistory);

      vi.mocked(db).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        join: mockJoin,
        where: mockWhere,
        orderBy: mockOrderBy,
        limit: mockLimit,
        offset: mockOffset
      } as any);

      const result = await swipeService.getSwipeHistory(userId, limit, offset);

      expect(result).toHaveLength(2);
      expect(mockLimit).toHaveBeenCalledWith(limit);
      expect(mockOffset).toHaveBeenCalledWith(offset);
    });

    it('should use default limit of 50', async () => {
      const userId = 'user-123';

      const mockJoin = vi.fn().mockReturnThis();
      const mockWhere = vi.fn().mockReturnThis();
      const mockOrderBy = vi.fn().mockReturnThis();
      const mockLimit = vi.fn().mockReturnThis();
      const mockOffset = vi.fn().mockResolvedValue([]);

      vi.mocked(db).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        join: mockJoin,
        where: mockWhere,
        orderBy: mockOrderBy,
        limit: mockLimit,
        offset: mockOffset
      } as any);

      await swipeService.getSwipeHistory(userId);

      expect(mockLimit).toHaveBeenCalledWith(50);
    });

    it('should enforce max limit of 200', async () => {
      const userId = 'user-123';
      const limit = 500; // Exceeds max

      const mockJoin = vi.fn().mockReturnThis();
      const mockWhere = vi.fn().mockReturnThis();
      const mockOrderBy = vi.fn().mockReturnThis();
      const mockLimit = vi.fn().mockReturnThis();
      const mockOffset = vi.fn().mockResolvedValue([]);

      vi.mocked(db).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        join: mockJoin,
        where: mockWhere,
        orderBy: mockOrderBy,
        limit: mockLimit,
        offset: mockOffset
      } as any);

      await swipeService.getSwipeHistory(userId, limit);

      expect(mockLimit).toHaveBeenCalledWith(200);
    });
  });

  describe('getSessionSwipes', () => {
    it('should return swipes for specific session', async () => {
      const userId = 'user-123';
      const sessionId = 'session-1';

      const mockSessionSwipes = [
        {
          swipe_id: 'swipe-1',
          venue_id: 'venue-1',
          venue_name: 'Estate',
          action: 'right',
          timestamp: new Date()
        },
        {
          swipe_id: 'swipe-2',
          venue_id: 'venue-2',
          venue_name: 'Barn',
          action: 'left',
          timestamp: new Date()
        }
      ];

      const mockJoin = vi.fn().mockReturnThis();
      const mockWhere = vi.fn().mockReturnThis();
      const mockOrderBy = vi.fn().mockResolvedValue(mockSessionSwipes);

      vi.mocked(db).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        join: mockJoin,
        where: mockWhere,
        orderBy: mockOrderBy
      } as any);

      const result = await swipeService.getSessionSwipes(userId, sessionId);

      expect(result).toHaveLength(2);
      expect(mockWhere).toHaveBeenCalledWith({
        's.user_id': userId,
        's.session_id': sessionId
      });
    });

    it('should return empty array if session has no swipes', async () => {
      const userId = 'user-123';
      const sessionId = 'session-999';

      const mockJoin = vi.fn().mockReturnThis();
      const mockWhere = vi.fn().mockReturnThis();
      const mockOrderBy = vi.fn().mockResolvedValue([]);

      vi.mocked(db).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        join: mockJoin,
        where: mockWhere,
        orderBy: mockOrderBy
      } as any);

      const result = await swipeService.getSessionSwipes(userId, sessionId);

      expect(result).toEqual([]);
    });
  });

  describe('hasSwipedVenue', () => {
    it('should return true if venue has been swiped', async () => {
      const userId = 'user-123';
      const venueId = 'venue-456';

      const mockWhere = vi.fn().mockResolvedValue([
        { swipe_id: 'swipe-1' }
      ]);

      vi.mocked(db).mockReturnValue({
        where: mockWhere
      } as any);

      const result = await swipeService.hasSwipedVenue(userId, venueId);

      expect(result).toBe(true);
    });

    it('should return false if venue has not been swiped', async () => {
      const userId = 'user-123';
      const venueId = 'venue-456';

      const mockWhere = vi.fn().mockResolvedValue([]);

      vi.mocked(db).mockReturnValue({
        where: mockWhere
      } as any);

      const result = await swipeService.hasSwipedVenue(userId, venueId);

      expect(result).toBe(false);
    });
  });
});
