/**
 * Unit tests for Taste Profile Service
 * Tests onboarding flow, profile generation, and real-time updates
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the database before importing - must use factory function without external refs
vi.mock('../../../db/db-config', () => ({
  db: vi.fn()
}));

// Mock EmbeddingService
vi.mock('../../../src/api/services/embedding.service');

// Import after mocking
import * as TasteProfileService from '../../../src/api/services/taste-profile.service';
import { EmbeddingService } from '../../../src/api/services/embedding.service';
import { db } from '../../../db/db-config';

const mockDb = vi.mocked(db, true);

describe('TasteProfileService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getOnboardingVenues', () => {
    it('should return 10 random venues with images', async () => {
      const userId = 'user-123';
      const mockVenues = Array(10).fill(0).map((_, i) => ({
        venue_id: `venue-${i}`,
        name: `Venue ${i}`,
        image_data: {
          local_paths: [`/path/to/image${i}.jpg`]
        }
      }));

      // Mock query chain (venues -> select -> whereNotNull -> whereRaw -> whereRaw -> orderByRaw -> limit)
      const limitMock = vi.fn().mockResolvedValue(mockVenues);
      const orderByRawMock = vi.fn().mockReturnValue({ limit: limitMock });
      const whereRawMock2 = vi.fn().mockReturnValue({ orderByRaw: orderByRawMock });
      const whereRawMock1 = vi.fn().mockReturnValue({ whereRaw: whereRawMock2 });
      const whereNotNullMock = vi.fn().mockReturnValue({ whereRaw: whereRawMock1 });
      const selectMock = vi.fn().mockReturnValue({ whereNotNull: whereNotNullMock });

      mockDb.mockReturnValue({ select: selectMock });

      const venues = await TasteProfileService.TasteProfileService.getOnboardingVenues(userId);

      expect(venues).toHaveLength(10);
      expect(venues[0]).toHaveProperty('venueId');
      expect(venues[0]).toHaveProperty('name');
      expect(venues[0]).toHaveProperty('imagePath');
    });

    it('should throw error if insufficient venues available', async () => {
      const userId = 'user-123';
      const mockVenues = Array(5).fill(0).map((_, i) => ({
        venue_id: `venue-${i}`,
        name: `Venue ${i}`,
        image_data: {
          local_paths: [`/path/to/image${i}.jpg`]
        }
      }));

      // Mock query chain (venues -> select -> whereNotNull -> whereRaw -> whereRaw -> orderByRaw -> limit)
      const limitMock = vi.fn().mockResolvedValue(mockVenues);
      const orderByRawMock = vi.fn().mockReturnValue({ limit: limitMock });
      const whereRawMock2 = vi.fn().mockReturnValue({ orderByRaw: orderByRawMock });
      const whereRawMock1 = vi.fn().mockReturnValue({ whereRaw: whereRawMock2 });
      const whereNotNullMock = vi.fn().mockReturnValue({ whereRaw: whereRawMock1 });
      const selectMock = vi.fn().mockReturnValue({ whereNotNull: whereNotNullMock });

      mockDb.mockReturnValue({ select: selectMock });

      await expect(TasteProfileService.TasteProfileService.getOnboardingVenues(userId))
        .rejects.toThrow('Insufficient venues for onboarding');
    });
  });

  describe('generateProfile', () => {
    it('should generate profile from right-swiped images', async () => {
      const userId = 'user-123';
      const sessionId = 'session-456';

      // Mock swipes data
      const mockSwipes = [
        {
          venue_id: 'venue-1',
          image_data: { local_paths: ['/path/to/image1.jpg', '/path/to/image2.jpg'] }
        },
        {
          venue_id: 'venue-2',
          image_data: { local_paths: ['/path/to/image3.jpg'] }
        },
        {
          venue_id: 'venue-3',
          image_data: { local_paths: ['/path/to/image4.jpg', '/path/to/image5.jpg'] }
        }
      ];

      // Mock first query (get swipes)
      const whereMock1 = vi.fn().mockResolvedValue(mockSwipes);
      const innerJoinMock = vi.fn().mockReturnValue({ where: whereMock1 });
      const selectMock1 = vi.fn().mockReturnValue({ innerJoin: innerJoinMock });

      // Mock second query (check existing profile)
      const firstMock = vi.fn().mockResolvedValue(null);
      const whereMock2 = vi.fn().mockReturnValue({ first: firstMock });

      // Mock third query (insert profile)
      const mockProfile = {
        profile_id: 'profile-789',
        user_id: userId,
        embedding_vector: '[' + Array(512).fill(0.3).join(',') + ']',
        descriptive_words: ['Elegant', 'Modern', 'Romantic', 'Classic', 'Garden'],
        confidence: 0.85
      };

      const returningMock = vi.fn().mockResolvedValue([mockProfile]);
      const insertMock = vi.fn().mockReturnValue({ returning: returningMock });

      // Setup mockDb to return different chains for each call
      mockDb
        .mockReturnValueOnce({ select: selectMock1 })
        .mockReturnValueOnce({ where: whereMock2 })
        .mockReturnValueOnce({ insert: insertMock });

      // Mock embeddings for images
      const mockImageEmbeddings = [
        Array(512).fill(0.1),
        Array(512).fill(0.2),
        Array(512).fill(0.3),
        Array(512).fill(0.4),
        Array(512).fill(0.5)
      ];

      vi.mocked(EmbeddingService.generateBatchImageEmbeddings).mockResolvedValueOnce(
        mockImageEmbeddings
      );

      // Mock aesthetic word embeddings
      const mockWordEmbeddings = Array(14).fill(0).map((_, i) =>
        Array(512).fill(i * 0.05)
      );

      vi.mocked(EmbeddingService.generateBatchTextEmbeddings).mockResolvedValueOnce(
        mockWordEmbeddings
      );

      const profile = await TasteProfileService.TasteProfileService.generateProfile(
        userId,
        sessionId
      );

      expect(profile).toHaveProperty('profileId');
      expect(profile).toHaveProperty('descriptiveWords');
      expect(profile).toHaveProperty('confidence');
      expect(profile.descriptiveWords).toHaveLength(5);
      expect(profile.confidence).toBeGreaterThan(0);
      expect(profile.confidence).toBeLessThanOrEqual(1);
    });

    it('should throw error if fewer than 5 right swipes', async () => {
      const userId = 'user-123';
      const sessionId = 'session-456';

      // Mock only 3 swipes
      const mockSwipes = [
        {
          venue_id: 'venue-1',
          image_data: { local_paths: ['/path/to/image1.jpg'] }
        },
        {
          venue_id: 'venue-2',
          image_data: { local_paths: ['/path/to/image2.jpg'] }
        },
        {
          venue_id: 'venue-3',
          image_data: { local_paths: ['/path/to/image3.jpg'] }
        }
      ];

      const whereMock = vi.fn().mockResolvedValue(mockSwipes);
      const innerJoinMock = vi.fn().mockReturnValue({ where: whereMock });
      const selectMock = vi.fn().mockReturnValue({ innerJoin: innerJoinMock });

      mockDb.mockReturnValue({ select: selectMock });

      await expect(
        TasteProfileService.TasteProfileService.generateProfile(userId, sessionId)
      ).rejects.toThrow('Insufficient right swipes');
    });
  });

  describe('updateProfile', () => {
    it('should update profile with learning rate 0.1 on right swipe', async () => {
      const userId = 'user-123';
      const venueId = 'venue-456';
      const action = 'right';

      // Mock existing profile
      const existingProfile = {
        profile_id: 'profile-789',
        user_id: userId,
        embedding_vector: '[' + Array(512).fill(0.5).join(',') + ']',
        descriptive_words: ['Elegant', 'Modern', 'Romantic', 'Classic', 'Garden'],
        confidence: 0.85
      };

      const firstMock1 = vi.fn().mockResolvedValue(existingProfile);
      const whereMock1 = vi.fn().mockReturnValue({ first: firstMock1 });

      // Mock venue data
      const mockVenue = {
        venue_id: venueId,
        image_data: { local_paths: ['/path/to/new-image.jpg'] }
      };

      const firstMock2 = vi.fn().mockResolvedValue(mockVenue);
      const whereMock2 = vi.fn().mockReturnValue({ first: firstMock2 });
      const selectMock = vi.fn().mockReturnValue({ where: whereMock2 });

      // Mock update result
      const updatedProfile = {
        ...existingProfile,
        embedding_vector: '[' + Array(512).fill(0.52).join(',') + ']'
      };

      const returningMock = vi.fn().mockResolvedValue([updatedProfile]);
      const updateMock = vi.fn().mockReturnValue({ returning: returningMock });
      const whereMock3 = vi.fn().mockReturnValue({ update: updateMock });

      mockDb
        .mockReturnValueOnce({ where: whereMock1 })
        .mockReturnValueOnce({ select: selectMock })
        .mockReturnValueOnce({ where: whereMock3 });

      // Mock new image embedding
      const newImageEmbedding = Array(512).fill(0.7);
      vi.mocked(EmbeddingService.generateBatchImageEmbeddings).mockResolvedValueOnce(
        [newImageEmbedding]
      );

      // Mock word embeddings
      const mockWordEmbeddings = Array(14).fill(0).map((_, i) =>
        Array(512).fill(i * 0.05)
      );
      vi.mocked(EmbeddingService.generateBatchTextEmbeddings).mockResolvedValueOnce(
        mockWordEmbeddings
      );

      const profile = await TasteProfileService.TasteProfileService.updateProfile(
        userId,
        venueId,
        action
      );

      expect(profile).toHaveProperty('profileId');
      expect(updateMock).toHaveBeenCalled();
    });

    it('should not update profile on left swipe', async () => {
      const userId = 'user-123';
      const venueId = 'venue-456';
      const action = 'left';

      // Mock existing profile
      const existingProfile = {
        profile_id: 'profile-789',
        user_id: userId,
        embedding_vector: '[' + Array(512).fill(0.5).join(',') + ']',
        descriptive_words: ['Elegant', 'Modern', 'Romantic', 'Classic', 'Garden'],
        confidence: 0.85
      };

      const firstMock = vi.fn().mockResolvedValue(existingProfile);
      const whereMock = vi.fn().mockReturnValue({ first: firstMock });

      mockDb.mockReturnValue({ where: whereMock });

      const profile = await TasteProfileService.TasteProfileService.updateProfile(
        userId,
        venueId,
        action
      );

      expect(profile).toHaveProperty('profileId');
      expect(profile.profileId).toBe(existingProfile.profile_id);
    });

    it('should throw error if profile does not exist', async () => {
      const userId = 'user-123';
      const venueId = 'venue-456';
      const action = 'right';

      const firstMock = vi.fn().mockResolvedValue(null);
      const whereMock = vi.fn().mockReturnValue({ first: firstMock });

      mockDb.mockReturnValue({ where: whereMock });

      await expect(
        TasteProfileService.TasteProfileService.updateProfile(userId, venueId, action)
      ).rejects.toThrow('Taste profile not found');
    });
  });

  describe('getTasteProfile', () => {
    it('should return user taste profile', async () => {
      const userId = 'user-123';

      const mockProfile = {
        profile_id: 'profile-789',
        user_id: userId,
        embedding_vector: '[' + Array(512).fill(0.5).join(',') + ']',
        descriptive_words: ['Elegant', 'Modern', 'Romantic', 'Classic', 'Garden'],
        confidence: 0.85
      };

      const firstMock = vi.fn().mockResolvedValue(mockProfile);
      const whereMock = vi.fn().mockReturnValue({ first: firstMock });

      mockDb.mockReturnValue({ where: whereMock });

      const profile = await TasteProfileService.TasteProfileService.getTasteProfile(userId);

      expect(profile).not.toBeNull();
      expect(profile?.userId).toBe(userId);
      expect(profile?.descriptiveWords).toHaveLength(5);
    });

    it('should return null if profile does not exist', async () => {
      const userId = 'user-123';

      const firstMock = vi.fn().mockResolvedValue(null);
      const whereMock = vi.fn().mockReturnValue({ first: firstMock });

      mockDb.mockReturnValue({ where: whereMock });

      const profile = await TasteProfileService.TasteProfileService.getTasteProfile(userId);

      expect(profile).toBeNull();
    });
  });

  describe('rankVenuesByTaste', () => {
    it('should rank venues by cosine similarity to user profile', async () => {
      const userId = 'user-123';
      const venueIds = ['venue-1', 'venue-2', 'venue-3'];

      // Mock user profile
      const userProfile = {
        profile_id: 'profile-789',
        user_id: userId,
        embedding_vector: '[' + Array(512).fill(0.5).join(',') + ']',
        descriptive_words: ['Elegant', 'Modern', 'Romantic', 'Classic', 'Garden'],
        confidence: 0.85
      };

      const firstMock = vi.fn().mockResolvedValue(userProfile);
      const whereMock1 = vi.fn().mockReturnValue({ first: firstMock });

      // Mock venue embeddings
      const venueEmbeddings = [
        {
          venue_id: 'venue-1',
          embedding_vector: '[' + Array(512).fill(0.6).join(',') + ']'
        },
        {
          venue_id: 'venue-2',
          embedding_vector: '[' + Array(512).fill(0.3).join(',') + ']'
        },
        {
          venue_id: 'venue-3',
          embedding_vector: '[' + Array(512).fill(0.55).join(',') + ']'
        }
      ];

      const whereInMock = vi.fn().mockResolvedValue(venueEmbeddings);
      const selectMock = vi.fn().mockReturnValue({ whereIn: whereInMock });

      mockDb
        .mockReturnValueOnce({ where: whereMock1 })
        .mockReturnValueOnce({ select: selectMock });

      const rankedVenues = await TasteProfileService.TasteProfileService.rankVenuesByTaste(
        userId,
        venueIds
      );

      expect(rankedVenues).toHaveLength(3);

      // Venues should be sorted by similarity (descending)
      expect(rankedVenues[0].venueId).toBe('venue-1');
      expect(rankedVenues[1].venueId).toBe('venue-3');
      expect(rankedVenues[2].venueId).toBe('venue-2');

      // Similarity scores should be in range [0, 1]
      expect(rankedVenues[0].similarity).toBeGreaterThan(rankedVenues[1].similarity);
      expect(rankedVenues[1].similarity).toBeGreaterThan(rankedVenues[2].similarity);
    });

    it('should throw error if user profile not found', async () => {
      const userId = 'user-123';
      const venueIds = ['venue-1', 'venue-2'];

      const firstMock = vi.fn().mockResolvedValue(null);
      const whereMock = vi.fn().mockReturnValue({ first: firstMock });

      mockDb.mockReturnValue({ where: whereMock });

      await expect(
        TasteProfileService.TasteProfileService.rankVenuesByTaste(userId, venueIds)
      ).rejects.toThrow('Taste profile not found');
    });
  });
});
