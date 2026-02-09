/**
 * Integration tests for venue routes
 * Tests complete request/response flow with authentication
 */

import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import app from '../../src/api/server';
import { getDb } from '../../db/db-config';
import * as jwt from 'jsonwebtoken';

const db = getDb();

describe('Venue Routes Integration Tests', () => {
  let authToken: string;
  let testUserId: string;
  let testVenueIds: string[] = [];

  beforeAll(async () => {
    // Set JWT_SECRET for tests
    process.env.JWT_SECRET = 'test-secret-for-integration-tests';

    // Ensure database is connected
    await db.raw('SELECT 1');
  });

  beforeEach(async () => {
    // Create test user with unique email to avoid conflicts in parallel test runs
    const uniqueEmail = `venue-test-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`;
    const [user] = await db('users')
      .insert({
        email: uniqueEmail,
        password_hash: 'test',
        wedding_date: new Date('2026-08-15')
      })
      .returning('user_id');
    testUserId = user.user_id;

    // Generate JWT token for authentication
    authToken = jwt.sign(
      { userId: testUserId, email: uniqueEmail, type: 'access' },
      process.env.JWT_SECRET!,
      { expiresIn: '1h' }
    );

    // Create test venues
    const venues = [
      {
        osm_id: 'integration-test/venue1',
        name: 'Luxury Estate Venue',
        website_url: 'https://example.com/venue1',
        location_lat_long: db.raw(`ST_SetSRID(ST_MakePoint(?, ?), 4326)`, [-118.2437, 34.0522]),
        is_wedding_venue: true,
        is_estate: true,
        is_historic: false,
        has_lodging: true,
        lodging_capacity: 50,
        pricing_tier: 'luxury',
        is_active: true,
        image_data: JSON.stringify({
          local_paths: ['/data/venues/1/raw_images/image1.jpg']
        })
      },
      {
        osm_id: 'integration-test/venue2',
        name: 'Budget Venue',
        website_url: 'https://example.com/venue2',
        location_lat_long: db.raw(`ST_SetSRID(ST_MakePoint(?, ?), 4326)`, [-118.2500, 34.0500]),
        is_wedding_venue: true,
        is_estate: false,
        is_historic: false,
        has_lodging: false,
        lodging_capacity: 0,
        pricing_tier: 'low',
        is_active: true
      }
    ];

    const insertedVenues = await db('venues').insert(venues).returning('venue_id');
    testVenueIds = insertedVenues.map(v => v.venue_id);

    // Create taste profile for user
    const mockEmbedding = new Array(512).fill(0).map(() => Math.random());
    await db('taste_profiles').insert({
      user_id: testUserId,
      embedding_vector: JSON.stringify(mockEmbedding),
      descriptive_words: ['elegant', 'romantic', 'rustic', 'garden', 'vintage'],
      confidence: 0.85
    });

    // Create venue embeddings
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

  describe('GET /api/v1/venues', () => {
    it('should return 401 without authentication', async () => {
      const response = await request(app).get('/api/v1/venues');

      expect(response.status).toBe(401);
    });

    it('should return venues with valid authentication', async () => {
      const response = await request(app)
        .get('/api/v1/venues')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('venues');
      expect(response.body).toHaveProperty('total_count');
      expect(response.body).toHaveProperty('page');
      expect(response.body).toHaveProperty('limit');
      expect(response.body).toHaveProperty('offset');
      expect(Array.isArray(response.body.venues)).toBe(true);
    });

    it('should filter by pricing_tier', async () => {
      const response = await request(app)
        .get('/api/v1/venues')
        .query({ pricing_tier: 'luxury' })
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.venues.length).toBeGreaterThan(0);
      response.body.venues.forEach((venue: any) => {
        expect(venue.pricing_tier).toBe('luxury');
      });
    });

    it('should filter by multiple pricing tiers', async () => {
      const response = await request(app)
        .get('/api/v1/venues')
        .query({ pricing_tier: ['low', 'luxury'] })
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      response.body.venues.forEach((venue: any) => {
        expect(['low', 'luxury']).toContain(venue.pricing_tier);
      });
    });

    it('should filter by has_lodging', async () => {
      const response = await request(app)
        .get('/api/v1/venues')
        .query({ has_lodging: 'true' })
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      response.body.venues.forEach((venue: any) => {
        expect(venue.has_lodging).toBe(true);
      });
    });

    it('should filter by is_estate', async () => {
      const response = await request(app)
        .get('/api/v1/venues')
        .query({ is_estate: 'true' })
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      response.body.venues.forEach((venue: any) => {
        expect(venue.is_estate).toBe(true);
      });
    });

    it('should filter by location radius', async () => {
      const response = await request(app)
        .get('/api/v1/venues')
        .query({
          lat: 34.0522,
          lng: -118.2437,
          radius_meters: 10000
        })
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.venues.length).toBeGreaterThan(0);
    });

    it('should return 400 if location filter is incomplete', async () => {
      const response = await request(app)
        .get('/api/v1/venues')
        .query({ lat: 34.0522 }) // Missing lng and radius_meters
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should sort by taste_score (default)', async () => {
      const response = await request(app)
        .get('/api/v1/venues')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.venues.length).toBeGreaterThan(0);

      // Verify taste_score exists and is sorted descending
      const scores = response.body.venues.map((v: any) => v.taste_score);
      for (let i = 0; i < scores.length - 1; i++) {
        expect(scores[i]).toBeGreaterThanOrEqual(scores[i + 1]);
      }
    });

    it('should sort by pricing_tier', async () => {
      const response = await request(app)
        .get('/api/v1/venues')
        .query({ sort: 'pricing_tier' })
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.venues.length).toBeGreaterThan(0);

      // Verify pricing_tier order
      const tierOrder = ['low', 'medium', 'high', 'luxury'];
      const tiers = response.body.venues.map((v: any) => v.pricing_tier);
      for (let i = 0; i < tiers.length - 1; i++) {
        const currentIdx = tierOrder.indexOf(tiers[i]);
        const nextIdx = tierOrder.indexOf(tiers[i + 1]);
        expect(currentIdx).toBeLessThanOrEqual(nextIdx);
      }
    });

    it('should sort by distance when location provided', async () => {
      const response = await request(app)
        .get('/api/v1/venues')
        .query({
          lat: 34.0522,
          lng: -118.2437,
          sort: 'distance'
        })
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.venues.length).toBeGreaterThan(0);

      // Verify distance exists and is sorted ascending
      const distances = response.body.venues.map((v: any) => v.distance_meters);
      for (let i = 0; i < distances.length - 1; i++) {
        expect(distances[i]).toBeLessThanOrEqual(distances[i + 1]);
      }
    });

    it('should return 400 if sort=distance without location', async () => {
      const response = await request(app)
        .get('/api/v1/venues')
        .query({ sort: 'distance' })
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should paginate results', async () => {
      const response1 = await request(app)
        .get('/api/v1/venues')
        .query({ limit: 1, offset: 0 })
        .set('Authorization', `Bearer ${authToken}`);

      expect(response1.status).toBe(200);
      expect(response1.body.venues.length).toBeLessThanOrEqual(1);
      expect(response1.body.limit).toBe(1);
      expect(response1.body.offset).toBe(0);

      const response2 = await request(app)
        .get('/api/v1/venues')
        .query({ limit: 1, offset: 1 })
        .set('Authorization', `Bearer ${authToken}`);

      expect(response2.status).toBe(200);
      expect(response2.body.offset).toBe(1);

      // Ensure different venues on different pages
      if (response1.body.venues.length > 0 && response2.body.venues.length > 0) {
        expect(response1.body.venues[0].venue_id).not.toBe(response2.body.venues[0].venue_id);
      }
    });

    it('should respect limit max of 100', async () => {
      const response = await request(app)
        .get('/api/v1/venues')
        .query({ limit: 500 })
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.limit).toBe(100);
    });
  });

  describe('GET /api/v1/venues/:id', () => {
    it('should return 401 without authentication', async () => {
      const response = await request(app).get(`/api/v1/venues/${testVenueIds[0]}`);

      expect(response.status).toBe(401);
    });

    it('should return venue details with valid authentication', async () => {
      const response = await request(app)
        .get(`/api/v1/venues/${testVenueIds[0]}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('venue_id');
      expect(response.body).toHaveProperty('name');
      expect(response.body).toHaveProperty('images');
      expect(Array.isArray(response.body.images)).toBe(true);
    });

    it('should return 404 for non-existent venue', async () => {
      // Use a valid UUID format that doesn't exist in database
      const nonExistentUuid = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .get(`/api/v1/venues/${nonExistentUuid}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 for invalid venue ID', async () => {
      const response = await request(app)
        .get('/api/v1/venues/invalid')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should include converted image paths', async () => {
      const response = await request(app)
        .get(`/api/v1/venues/${testVenueIds[0]}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      if (response.body.images.length > 0) {
        const imagePath = response.body.images[0];
        expect(imagePath).toMatch(/^\/images\/venues\/\d+\/.+\.(jpg|jpeg|png)$/);
      }
    });
  });
});
