/**
 * Unit tests for venue service
 * Tests venue search with filters, taste-based ranking, and pagination
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getDb } from '../../../db/db-config';
import * as venueService from '../../../src/api/services/venue.service';
import * as embeddingService from '../../../src/api/services/embedding.service';

const db = getDb();

describe('Venue Service', () => {
  let testUserId: number;
  let testVenueIds: number[] = [];

  beforeEach(async () => {
    // Create test user
    const [user] = await db('users')
      .insert({
        email: 'venue-test@example.com',
        password_hash: 'test',
        wedding_date: new Date('2026-08-15')
      })
      .returning('user_id');
    testUserId = user.user_id;

    // Create test venues with different characteristics
    const venues = [
      {
        osm_id: 'test/venue1',
        name: 'Elegant Estate Wedding Venue',
        website_url: 'https://example.com/venue1',
        location_lat_long: db.raw(`ST_SetSRID(ST_MakePoint(?, ?), 4326)`, [-118.2437, 34.0522]), // LA
        is_wedding_venue: true,
        is_estate: true,
        is_historic: false,
        has_lodging: true,
        lodging_capacity: 50,
        pricing_tier: 'high',
        is_active: true
      },
      {
        osm_id: 'test/venue2',
        name: 'Budget Barn Venue',
        website_url: 'https://example.com/venue2',
        location_lat_long: db.raw(`ST_SetSRID(ST_MakePoint(?, ?), 4326)`, [-118.2500, 34.0500]), // Near LA
        is_wedding_venue: true,
        is_estate: false,
        is_historic: false,
        has_lodging: false,
        lodging_capacity: 0,
        pricing_tier: 'low',
        is_active: true
      },
      {
        osm_id: 'test/venue3',
        name: 'Historic Luxury Manor',
        website_url: 'https://example.com/venue3',
        location_lat_long: db.raw(`ST_SetSRID(ST_MakePoint(?, ?), 4326)`, [-118.2400, 34.0600]), // LA area
        is_wedding_venue: true,
        is_estate: true,
        is_historic: true,
        has_lodging: true,
        lodging_capacity: 30,
        pricing_tier: 'luxury',
        is_active: true
      },
      {
        osm_id: 'test/venue4',
        name: 'Far Away Venue',
        website_url: 'https://example.com/venue4',
        location_lat_long: db.raw(`ST_SetSRID(ST_MakePoint(?, ?), 4326)`, [-122.4194, 37.7749]), // SF (far from LA)
        is_wedding_venue: true,
        is_estate: false,
        is_historic: false,
        has_lodging: false,
        lodging_capacity: 0,
        pricing_tier: 'medium',
        is_active: true
      }
    ];

    const insertedVenues = await db('venues').insert(venues).returning('venue_id');
    testVenueIds = insertedVenues.map(v => v.venue_id);

    // Create test taste profile for user (with mock embedding)
    const mockEmbedding = new Array(512).fill(0).map(() => Math.random());
    await db('taste_profiles').insert({
      user_id: testUserId,
      embedding_vector: JSON.stringify(mockEmbedding),
      descriptive_words: ['elegant', 'romantic', 'rustic', 'garden', 'vintage'],
      confidence: 0.85
    });

    // Create venue embeddings for taste scoring
    for (const venueId of testVenueIds) {
      const mockVenueEmbedding = new Array(512).fill(0).map(() => Math.random());
      await db('venue_embeddings').insert({
        venue_id: venueId,
        image_path: `/data/venues/${venueId}/test.jpg`,
        embedding_vector: JSON.stringify(mockVenueEmbedding)
      });
    }
  });

  afterEach(async () => {
    // Clean up test data
    await db('venue_embeddings').whereIn('venue_id', testVenueIds).del();
    await db('taste_profiles').where('user_id', testUserId).del();
    await db('venues').whereIn('venue_id', testVenueIds).del();
    await db('users').where('user_id', testUserId).del();
  });

  describe('searchVenues', () => {
    it('should return venues with basic search (no filters)', async () => {
      const result = await venueService.searchVenues(testUserId, {});

      expect(result.venues).toBeDefined();
      expect(result.venues.length).toBeGreaterThan(0);
      expect(result.total_count).toBeGreaterThan(0);
      expect(result.page).toBe(1);
    });

    it('should filter by pricing_tier', async () => {
      const result = await venueService.searchVenues(testUserId, {
        pricing_tier: ['low', 'medium']
      });

      expect(result.venues.length).toBeGreaterThan(0);
      result.venues.forEach(venue => {
        expect(['low', 'medium']).toContain(venue.pricing_tier);
      });
    });

    it('should filter by has_lodging', async () => {
      const result = await venueService.searchVenues(testUserId, {
        has_lodging: true
      });

      expect(result.venues.length).toBeGreaterThan(0);
      result.venues.forEach(venue => {
        expect(venue.has_lodging).toBe(true);
      });
    });

    it('should filter by is_estate', async () => {
      const result = await venueService.searchVenues(testUserId, {
        is_estate: true
      });

      expect(result.venues.length).toBeGreaterThan(0);
      result.venues.forEach(venue => {
        expect(venue.is_estate).toBe(true);
      });
    });

    it('should filter by is_historic', async () => {
      const result = await venueService.searchVenues(testUserId, {
        is_historic: true
      });

      expect(result.venues.length).toBeGreaterThan(0);
      result.venues.forEach(venue => {
        expect(venue.is_historic).toBe(true);
      });
    });

    it('should filter by lodging_capacity_min', async () => {
      const result = await venueService.searchVenues(testUserId, {
        lodging_capacity_min: 30
      });

      expect(result.venues.length).toBeGreaterThan(0);
      result.venues.forEach(venue => {
        expect(venue.lodging_capacity).toBeGreaterThanOrEqual(30);
      });
    });

    it('should filter by location radius', async () => {
      const result = await venueService.searchVenues(testUserId, {
        lat: 34.0522,
        lng: -118.2437,
        radius_meters: 10000 // 10km radius around LA
      });

      // Should include LA venues but not SF venue
      expect(result.venues.length).toBeGreaterThan(0);
      expect(result.venues.length).toBeLessThan(testVenueIds.length);
    });

    it('should sort by taste_score (default)', async () => {
      const result = await venueService.searchVenues(testUserId, {
        sort: 'taste_score'
      });

      expect(result.venues.length).toBeGreaterThan(0);

      // Check that taste_score is present and venues are sorted
      const scores = result.venues.map(v => v.taste_score);
      expect(scores.every(s => s !== undefined)).toBe(true);

      // Verify descending order
      for (let i = 0; i < scores.length - 1; i++) {
        expect(scores[i]).toBeGreaterThanOrEqual(scores[i + 1]);
      }
    });

    it('should sort by pricing_tier', async () => {
      const result = await venueService.searchVenues(testUserId, {
        sort: 'pricing_tier'
      });

      expect(result.venues.length).toBeGreaterThan(0);

      // Verify pricing_tier order: low < medium < high < luxury
      const tierOrder = ['low', 'medium', 'high', 'luxury'];
      const tiers = result.venues.map(v => v.pricing_tier);

      for (let i = 0; i < tiers.length - 1; i++) {
        const currentIdx = tierOrder.indexOf(tiers[i]);
        const nextIdx = tierOrder.indexOf(tiers[i + 1]);
        expect(currentIdx).toBeLessThanOrEqual(nextIdx);
      }
    });

    it('should sort by distance when location provided', async () => {
      const result = await venueService.searchVenues(testUserId, {
        lat: 34.0522,
        lng: -118.2437,
        sort: 'distance'
      });

      expect(result.venues.length).toBeGreaterThan(0);

      // Check that distance is present and venues are sorted
      const distances = result.venues.map(v => v.distance_meters);
      expect(distances.every(d => d !== undefined)).toBe(true);

      // Verify ascending order
      for (let i = 0; i < distances.length - 1; i++) {
        expect(distances[i]).toBeLessThanOrEqual(distances[i + 1]);
      }
    });

    it('should paginate results', async () => {
      const page1 = await venueService.searchVenues(testUserId, {
        limit: 2,
        offset: 0
      });

      expect(page1.venues.length).toBeLessThanOrEqual(2);
      expect(page1.limit).toBe(2);
      expect(page1.offset).toBe(0);

      const page2 = await venueService.searchVenues(testUserId, {
        limit: 2,
        offset: 2
      });

      expect(page2.offset).toBe(2);

      // Venues on different pages should be different
      const page1Ids = page1.venues.map(v => v.venue_id);
      const page2Ids = page2.venues.map(v => v.venue_id);
      const overlap = page1Ids.filter(id => page2Ids.includes(id));
      expect(overlap.length).toBe(0);
    });

    it('should combine multiple filters', async () => {
      const result = await venueService.searchVenues(testUserId, {
        pricing_tier: ['high', 'luxury'],
        has_lodging: true,
        is_estate: true,
        lodging_capacity_min: 25
      });

      result.venues.forEach(venue => {
        expect(['high', 'luxury']).toContain(venue.pricing_tier);
        expect(venue.has_lodging).toBe(true);
        expect(venue.is_estate).toBe(true);
        expect(venue.lodging_capacity).toBeGreaterThanOrEqual(25);
      });
    });

    it('should return empty results when no venues match filters', async () => {
      const result = await venueService.searchVenues(testUserId, {
        pricing_tier: ['luxury'],
        is_historic: true,
        has_lodging: true,
        lodging_capacity_min: 100 // Too high, no venue matches
      });

      expect(result.venues).toEqual([]);
      expect(result.total_count).toBe(0);
    });

    it('should only return active venues', async () => {
      // Deactivate one venue
      await db('venues').where('venue_id', testVenueIds[0]).update({ is_active: false });

      const result = await venueService.searchVenues(testUserId, {});

      const inactiveVenue = result.venues.find(v => v.venue_id === testVenueIds[0]);
      expect(inactiveVenue).toBeUndefined();
    });
  });

  describe('getVenueById', () => {
    it('should return venue details with images', async () => {
      const venueId = testVenueIds[0];

      // Add image data
      await db('venues').where('venue_id', venueId).update({
        image_data: JSON.stringify({
          local_paths: ['/data/venues/1/image1.jpg', '/data/venues/1/image2.jpg']
        })
      });

      const venue = await venueService.getVenueById(venueId);

      expect(venue).toBeDefined();
      expect(venue.venue_id).toBe(venueId);
      expect(venue.name).toBeDefined();
      expect(venue.images).toBeDefined();
      expect(venue.images.length).toBeGreaterThan(0);
    });

    it('should return null for non-existent venue', async () => {
      const venue = await venueService.getVenueById(99999);
      expect(venue).toBeNull();
    });

    it('should return null for inactive venue', async () => {
      const venueId = testVenueIds[0];
      await db('venues').where('venue_id', venueId).update({ is_active: false });

      const venue = await venueService.getVenueById(venueId);
      expect(venue).toBeNull();
    });

    it('should include coordinates', async () => {
      const venueId = testVenueIds[0];
      const venue = await venueService.getVenueById(venueId);

      expect(venue).toBeDefined();
      expect(venue.lat).toBeDefined();
      expect(venue.lng).toBeDefined();
      expect(typeof venue.lat).toBe('number');
      expect(typeof venue.lng).toBe('number');
    });
  });

  describe('getTasteScore', () => {
    it('should compute cosine similarity between user and venue', async () => {
      const venueId = testVenueIds[0];
      const score = await venueService.getTasteScore(testUserId, venueId);

      expect(score).toBeDefined();
      expect(typeof score).toBe('number');
      expect(score).toBeGreaterThanOrEqual(-1);
      expect(score).toBeLessThanOrEqual(1);
    });

    it('should return 0 when user has no taste profile', async () => {
      // Create user without taste profile
      const [newUser] = await db('users')
        .insert({
          email: 'no-profile@example.com',
          password_hash: 'test',
          wedding_date: new Date()
        })
        .returning('user_id');

      const score = await venueService.getTasteScore(newUser.user_id, testVenueIds[0]);
      expect(score).toBe(0);

      await db('users').where('user_id', newUser.user_id).del();
    });

    it('should return 0 when venue has no embeddings', async () => {
      // Create venue without embeddings
      const [newVenue] = await db('venues')
        .insert({
          osm_id: 'test/no-embedding',
          name: 'Test Venue',
          website_url: 'https://example.com',
          location_lat_long: db.raw(`ST_SetSRID(ST_MakePoint(?, ?), 4326)`, [-118.2437, 34.0522]),
          is_active: true
        })
        .returning('venue_id');

      const score = await venueService.getTasteScore(testUserId, newVenue.venue_id);
      expect(score).toBe(0);

      await db('venues').where('venue_id', newVenue.venue_id).del();
    });
  });
});
