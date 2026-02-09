/**
 * Venue service for searching and retrieving wedding venue data
 * Implements taste-based ranking using cosine similarity with user profiles
 */

import { getDb } from '../../../db/db-config';
import { buildRadiusQuery, calculateDistance, extractCoordinates } from '../utils/spatial.utils';
import { cosineSimilarity } from '../utils/vector.utils';

const db = getDb();

export interface VenueSearchFilters {
  // Metadata filters
  pricing_tier?: ('low' | 'medium' | 'high' | 'luxury')[];
  has_lodging?: boolean;
  is_estate?: boolean;
  is_historic?: boolean;
  lodging_capacity_min?: number;

  // Location filter (PostGIS radius search)
  lat?: number;
  lng?: number;
  radius_meters?: number;

  // Sorting
  sort?: 'taste_score' | 'pricing_tier' | 'distance';

  // Pagination
  limit?: number;
  offset?: number;
}

export interface VenueSearchResult {
  venue_id: number;
  name: string;
  website_url: string | null;
  lat: number;
  lng: number;
  is_wedding_venue: boolean;
  is_estate: boolean;
  is_historic: boolean;
  has_lodging: boolean;
  lodging_capacity: number;
  pricing_tier: string;
  taste_score?: number;
  distance_meters?: number;
  thumbnail?: string;
}

export interface VenueSearchResponse {
  venues: VenueSearchResult[];
  total_count: number;
  page: number;
  limit: number;
  offset: number;
}

export interface VenueDetail {
  venue_id: number;
  name: string;
  website_url: string | null;
  lat: number;
  lng: number;
  is_wedding_venue: boolean;
  is_estate: boolean;
  is_historic: boolean;
  has_lodging: boolean;
  lodging_capacity: number;
  pricing_tier: string;
  raw_markdown: string | null;
  images: string[];
}

/**
 * Search venues with metadata filters and taste-based ranking
 *
 * @param userId - User ID for taste profile lookup
 * @param filters - Search filters and pagination options
 * @returns Paginated venue search results with taste scores
 */
export async function searchVenues(
  userId: number,
  filters: VenueSearchFilters
): Promise<VenueSearchResponse> {
  const {
    pricing_tier,
    has_lodging,
    is_estate,
    is_historic,
    lodging_capacity_min,
    lat,
    lng,
    radius_meters,
    sort = 'taste_score',
    limit = 20,
    offset = 0
  } = filters;

  // Build base query
  let query = db('venues')
    .where('is_active', true)
    .where('is_wedding_venue', true);

  // Apply metadata filters
  if (pricing_tier && pricing_tier.length > 0) {
    query = query.whereIn('pricing_tier', pricing_tier);
  }

  if (has_lodging !== undefined) {
    query = query.where('has_lodging', has_lodging);
  }

  if (is_estate !== undefined) {
    query = query.where('is_estate', is_estate);
  }

  if (is_historic !== undefined) {
    query = query.where('is_historic', is_historic);
  }

  if (lodging_capacity_min !== undefined) {
    query = query.where('lodging_capacity', '>=', lodging_capacity_min);
  }

  // Apply location radius filter
  if (lat !== undefined && lng !== undefined && radius_meters !== undefined) {
    query = buildRadiusQuery(query, lat, lng, radius_meters);
  }

  // Get total count before pagination
  const countQuery = query.clone();
  const [{ count }] = await countQuery.count('* as count');
  const totalCount = parseInt(count as string, 10);

  // Select venue fields and compute distance if location provided
  let selectFields: any[] = [
    'venues.venue_id',
    'venues.name',
    'venues.website_url',
    'venues.is_wedding_venue',
    'venues.is_estate',
    'venues.is_historic',
    'venues.has_lodging',
    'venues.lodging_capacity',
    'venues.pricing_tier',
    db.raw('ST_X(location_lat_long) as lng'),
    db.raw('ST_Y(location_lat_long) as lat')
  ];

  // Add distance calculation if location provided
  if (lat !== undefined && lng !== undefined) {
    selectFields.push(calculateDistance(lat, lng).as('distance_meters'));
  }

  query = query.select(selectFields);

  // Fetch venues with applied filters
  let venues = await query.limit(limit).offset(offset);

  // Compute taste scores for each venue
  const venuesWithScores = await Promise.all(
    venues.map(async (venue) => {
      const tasteScore = await getTasteScore(userId, venue.venue_id);

      // Get thumbnail (first image from image_data)
      const imageData = await db('venues')
        .where('venue_id', venue.venue_id)
        .select('image_data')
        .first();

      let thumbnail: string | undefined;
      if (imageData?.image_data) {
        try {
          const parsed = JSON.parse(imageData.image_data);
          if (parsed.local_paths && parsed.local_paths.length > 0) {
            // Convert local path to API path
            const localPath = parsed.local_paths[0];
            const venueIdMatch = localPath.match(/\/venues\/(\d+)\//);
            const filename = localPath.split('/').pop();
            if (venueIdMatch && filename) {
              thumbnail = `/images/venues/${venueIdMatch[1]}/${filename}`;
            }
          }
        } catch (e) {
          // Ignore parse errors
        }
      }

      return {
        ...venue,
        taste_score: tasteScore,
        thumbnail
      };
    })
  );

  // Sort venues based on sort parameter
  let sortedVenues = venuesWithScores;

  if (sort === 'taste_score') {
    sortedVenues = venuesWithScores.sort((a, b) => {
      const scoreA = a.taste_score ?? 0;
      const scoreB = b.taste_score ?? 0;
      return scoreB - scoreA; // Descending
    });
  } else if (sort === 'pricing_tier') {
    const tierOrder: Record<string, number> = {
      low: 1,
      medium: 2,
      high: 3,
      luxury: 4,
      unknown: 5
    };
    sortedVenues = venuesWithScores.sort((a, b) => {
      return tierOrder[a.pricing_tier] - tierOrder[b.pricing_tier];
    });
  } else if (sort === 'distance') {
    sortedVenues = venuesWithScores.sort((a, b) => {
      const distA = a.distance_meters ?? Infinity;
      const distB = b.distance_meters ?? Infinity;
      return distA - distB; // Ascending
    });
  }

  // Calculate page number
  const page = Math.floor(offset / limit) + 1;

  return {
    venues: sortedVenues,
    total_count: totalCount,
    page,
    limit,
    offset
  };
}

/**
 * Get venue details by ID including images
 *
 * @param venueId - Venue ID
 * @returns Venue details with image paths, or null if not found
 */
export async function getVenueById(venueId: number): Promise<VenueDetail | null> {
  const venue = await db('venues')
    .where('venue_id', venueId)
    .where('is_active', true)
    .select(
      'venue_id',
      'name',
      'website_url',
      'is_wedding_venue',
      'is_estate',
      'is_historic',
      'has_lodging',
      'lodging_capacity',
      'pricing_tier',
      'raw_markdown',
      'image_data',
      db.raw('ST_X(location_lat_long) as lng'),
      db.raw('ST_Y(location_lat_long) as lat')
    )
    .first();

  if (!venue) {
    return null;
  }

  // Parse image data to get local paths
  let images: string[] = [];
  if (venue.image_data) {
    try {
      const parsed = JSON.parse(venue.image_data);
      if (parsed.local_paths && Array.isArray(parsed.local_paths)) {
        // Convert local paths to API paths
        images = parsed.local_paths
          .map((localPath: string) => {
            const venueIdMatch = localPath.match(/\/venues\/(\d+)\//);
            const filename = localPath.split('/').pop();
            if (venueIdMatch && filename) {
              return `/images/venues/${venueIdMatch[1]}/${filename}`;
            }
            return null;
          })
          .filter((path: string | null) => path !== null);
      }
    } catch (e) {
      // Ignore parse errors, return empty images array
    }
  }

  // Remove image_data from response
  const { image_data, ...venueData } = venue;

  return {
    ...venueData,
    images
  };
}

/**
 * Compute taste score (cosine similarity) between user profile and venue
 *
 * @param userId - User ID
 * @param venueId - Venue ID
 * @returns Cosine similarity score between -1 and 1, or 0 if no data
 */
export async function getTasteScore(userId: number, venueId: number): Promise<number> {
  // Get user's taste profile
  const tasteProfile = await db('taste_profiles')
    .where('user_id', userId)
    .select('embedding_vector')
    .first();

  if (!tasteProfile || !tasteProfile.embedding_vector) {
    return 0;
  }

  // Get venue embeddings (average across all venue images)
  const venueEmbeddings = await db('venue_embeddings')
    .where('venue_id', venueId)
    .select('embedding_vector');

  if (venueEmbeddings.length === 0) {
    return 0;
  }

  try {
    // Parse user embedding
    const userVector = JSON.parse(tasteProfile.embedding_vector);

    // Parse venue embeddings and compute average similarity
    let totalSimilarity = 0;
    let validCount = 0;

    for (const embedding of venueEmbeddings) {
      try {
        const venueVector = JSON.parse(embedding.embedding_vector);
        const similarity = cosineSimilarity(userVector, venueVector);
        totalSimilarity += similarity;
        validCount++;
      } catch (e) {
        // Skip invalid embeddings
        continue;
      }
    }

    if (validCount === 0) {
      return 0;
    }

    // Return average similarity across all venue images
    return totalSimilarity / validCount;
  } catch (e) {
    // Parse error or computation error
    return 0;
  }
}
