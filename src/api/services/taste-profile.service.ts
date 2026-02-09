/**
 * Taste Profile Service
 * Manages user aesthetic preferences through CLIP embeddings
 *
 * Flow:
 * 1. Onboarding: User swipes on 10 random venues
 * 2. Profile generation: Compute centroid from right-swiped image embeddings
 * 3. Descriptive words: Find top 5 aesthetic words by similarity to centroid
 * 4. Real-time updates: Apply learning rate 0.1 when user swipes right
 * 5. Venue ranking: Sort venues by cosine similarity to user profile
 */

import { db } from '../../../db/db-config';
import { EmbeddingService } from './embedding.service';
import { AESTHETIC_WORDS } from '../constants/aesthetic-words';
import { computeCentroid, cosineSimilarity } from '../utils/vector.utils';

const ONBOARDING_VENUE_COUNT = 10;
const MIN_RIGHT_SWIPES = 5;
const LEARNING_RATE = 0.1;
const EMBEDDING_CONCURRENCY = 10;

export interface OnboardingVenue {
  venueId: string;
  name: string;
  imagePath: string;
}

export interface TasteProfile {
  profileId: string;
  userId: string;
  descriptiveWords: string[];
  confidence: number;
}

export interface RankedVenue {
  venueId: string;
  similarity: number;
}

interface VenueRow {
  venue_id: string;
  name: string;
  image_data: {
    local_paths: string[];
  } | null;
}

interface SwipeRow {
  venue_id: string;
  image_data: {
    local_paths: string[];
  } | null;
}

interface ProfileRow {
  profile_id: string;
  user_id: string;
  embedding_vector: string; // pgvector format: "[0.1, 0.2, ...]"
  descriptive_words: string[];
  confidence: number;
}

interface VenueEmbeddingRow {
  venue_id: string;
  embedding_vector: string; // pgvector format
}

export class TasteProfileService {
  /**
   * Get 10 random venues for onboarding flow
   * Excludes venues already swiped by user
   *
   * @param userId User ID
   * @returns Array of 10 venues with images
   * @throws Error if insufficient venues available
   */
  static async getOnboardingVenues(userId: string): Promise<OnboardingVenue[]> {
    const venues = await db('venues')
      .select('venue_id', 'name', 'image_data')
      .whereNotNull('image_data')
      .whereRaw("jsonb_array_length(image_data->'local_paths') > 0")
      .whereRaw(
        `NOT EXISTS (
          SELECT 1 FROM swipes
          WHERE swipes.venue_id = venues.venue_id
          AND swipes.user_id = ?
        )`,
        [userId]
      )
      .orderByRaw('RANDOM()')
      .limit(ONBOARDING_VENUE_COUNT) as VenueRow[];

    if (venues.length < ONBOARDING_VENUE_COUNT) {
      throw new Error(
        `Insufficient venues for onboarding. Found ${venues.length}, need ${ONBOARDING_VENUE_COUNT}`
      );
    }

    // Return venues with first image from each
    return venues.map(venue => ({
      venueId: venue.venue_id,
      name: venue.name,
      imagePath: venue.image_data!.local_paths[0]
    }));
  }

  /**
   * Generate taste profile from onboarding session swipes
   * Computes centroid from right-swiped images and finds descriptive words
   *
   * @param userId User ID
   * @param sessionId Onboarding session ID
   * @returns Generated taste profile
   * @throws Error if insufficient right swipes or embedding generation fails
   */
  static async generateProfile(
    userId: string,
    sessionId: string
  ): Promise<TasteProfile> {
    // Get right-swiped venues from session
    const swipes = await db('swipes')
      .select('venues.venue_id', 'venues.image_data')
      .innerJoin('venues', 'swipes.venue_id', 'venues.venue_id')
      .where({
        'swipes.user_id': userId,
        'swipes.session_id': sessionId,
        'swipes.action': 'right'
      }) as SwipeRow[];

    if (swipes.length < MIN_RIGHT_SWIPES) {
      throw new Error(
        `Insufficient right swipes. Got ${swipes.length}, need at least ${MIN_RIGHT_SWIPES}`
      );
    }

    // Collect all image paths from right-swiped venues
    const imagePaths: string[] = [];
    for (const swipe of swipes) {
      if (swipe.image_data && swipe.image_data.local_paths) {
        imagePaths.push(...swipe.image_data.local_paths);
      }
    }

    if (imagePaths.length === 0) {
      throw new Error('No images found in right-swiped venues');
    }

    // Generate image embeddings
    const imageEmbeddings = await EmbeddingService.generateBatchImageEmbeddings(
      imagePaths,
      EMBEDDING_CONCURRENCY
    );

    if (imageEmbeddings.length === 0) {
      throw new Error('Failed to generate image embeddings');
    }

    // Compute centroid of image embeddings (user's aesthetic center)
    const centroid = computeCentroid(imageEmbeddings);

    // Generate text embeddings for aesthetic words
    const wordEmbeddings = await EmbeddingService.generateBatchTextEmbeddings(
      [...AESTHETIC_WORDS],
      EMBEDDING_CONCURRENCY
    );

    if (wordEmbeddings.length !== AESTHETIC_WORDS.length) {
      throw new Error('Failed to generate embeddings for all aesthetic words');
    }

    // Find top 5 descriptive words by similarity to centroid
    const wordSimilarities = wordEmbeddings.map((embedding, index) => ({
      word: AESTHETIC_WORDS[index],
      similarity: cosineSimilarity(centroid, embedding)
    }));

    wordSimilarities.sort((a, b) => b.similarity - a.similarity);
    const topWords = wordSimilarities.slice(0, 5).map(w => w.word);

    // Compute confidence score based on consistency of image embeddings
    // Confidence = 1 - (std_dev / mean) of similarities to centroid
    const similarities = imageEmbeddings.map(emb => cosineSimilarity(emb, centroid));
    const mean = similarities.reduce((sum, val) => sum + val, 0) / similarities.length;
    const variance =
      similarities.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
      similarities.length;
    const stdDev = Math.sqrt(variance);
    const confidence = Math.max(0, Math.min(1, 1 - stdDev / mean));

    // Convert centroid to pgvector format
    const vectorString = `[${centroid.join(',')}]`;

    // Check if profile already exists
    const existingProfile = await db('taste_profiles')
      .where({ user_id: userId })
      .first() as ProfileRow | undefined;

    let profile: ProfileRow;

    if (existingProfile) {
      // Update existing profile
      [profile] = await db('taste_profiles')
        .where({ user_id: userId })
        .update({
          embedding_vector: vectorString,
          descriptive_words: topWords,
          confidence: confidence,
          updated_at: db.fn.now()
        })
        .returning('*') as ProfileRow[];
    } else {
      // Insert new profile
      [profile] = await db('taste_profiles')
        .insert({
          user_id: userId,
          embedding_vector: vectorString,
          descriptive_words: topWords,
          confidence: confidence
        })
        .returning('*') as ProfileRow[];
    }

    return {
      profileId: profile.profile_id,
      userId: profile.user_id,
      descriptiveWords: profile.descriptive_words,
      confidence: profile.confidence
    };
  }

  /**
   * Update taste profile in real-time based on user swipe
   * Uses learning rate 0.1: new_profile = old_profile * 0.9 + venue_embedding * 0.1
   *
   * @param userId User ID
   * @param venueId Venue ID that was swiped
   * @param action Swipe action (right/left)
   * @returns Updated taste profile
   * @throws Error if profile doesn't exist or venue has no images
   */
  static async updateProfile(
    userId: string,
    venueId: string,
    action: 'right' | 'left' | 'unsave'
  ): Promise<TasteProfile> {
    // Get existing profile
    const existingProfile = await db('taste_profiles')
      .where({ user_id: userId })
      .first() as ProfileRow | undefined;

    if (!existingProfile) {
      throw new Error('Taste profile not found');
    }

    // Only update on right swipes
    if (action !== 'right') {
      return {
        profileId: existingProfile.profile_id,
        userId: existingProfile.user_id,
        descriptiveWords: existingProfile.descriptive_words,
        confidence: existingProfile.confidence
      };
    }

    // Get venue images
    const venue = await db('venues')
      .select('venue_id', 'image_data')
      .where({ venue_id: venueId })
      .first() as VenueRow | undefined;

    if (!venue || !venue.image_data || venue.image_data.local_paths.length === 0) {
      throw new Error('Venue has no images');
    }

    // Generate embeddings for venue images
    const venueEmbeddings = await EmbeddingService.generateBatchImageEmbeddings(
      venue.image_data.local_paths,
      EMBEDDING_CONCURRENCY
    );

    if (venueEmbeddings.length === 0) {
      throw new Error('Failed to generate venue embeddings');
    }

    // Compute centroid of venue images
    const venueCentroid = computeCentroid(venueEmbeddings);

    // Parse existing profile vector
    const oldVector = this.parseVectorString(existingProfile.embedding_vector);

    // Apply learning rate: new = old * (1 - lr) + venue * lr
    const newVector = oldVector.map(
      (val, i) => val * (1 - LEARNING_RATE) + venueCentroid[i] * LEARNING_RATE
    );

    // Re-compute descriptive words based on new profile
    const wordEmbeddings = await EmbeddingService.generateBatchTextEmbeddings(
      [...AESTHETIC_WORDS],
      EMBEDDING_CONCURRENCY
    );

    const wordSimilarities = wordEmbeddings.map((embedding, index) => ({
      word: AESTHETIC_WORDS[index],
      similarity: cosineSimilarity(newVector, embedding)
    }));

    wordSimilarities.sort((a, b) => b.similarity - a.similarity);
    const topWords = wordSimilarities.slice(0, 5).map(w => w.word);

    // Convert to pgvector format
    const vectorString = `[${newVector.join(',')}]`;

    // Update profile
    const [updatedProfile] = await db('taste_profiles')
      .where({ user_id: userId })
      .update({
        embedding_vector: vectorString,
        descriptive_words: topWords,
        updated_at: db.fn.now()
      })
      .returning('*') as ProfileRow[];

    return {
      profileId: updatedProfile.profile_id,
      userId: updatedProfile.user_id,
      descriptiveWords: updatedProfile.descriptive_words,
      confidence: updatedProfile.confidence
    };
  }

  /**
   * Get user's taste profile
   *
   * @param userId User ID
   * @returns Taste profile or null if not found
   */
  static async getTasteProfile(userId: string): Promise<TasteProfile | null> {
    const profile = await db('taste_profiles')
      .where({ user_id: userId })
      .first() as ProfileRow | undefined;

    if (!profile) {
      return null;
    }

    return {
      profileId: profile.profile_id,
      userId: profile.user_id,
      descriptiveWords: profile.descriptive_words,
      confidence: profile.confidence
    };
  }

  /**
   * Rank venues by taste similarity to user profile
   * Sorts venues by cosine similarity (descending)
   *
   * @param userId User ID
   * @param venueIds Array of venue IDs to rank
   * @returns Venues ranked by similarity score
   * @throws Error if profile not found
   */
  static async rankVenuesByTaste(
    userId: string,
    venueIds: string[]
  ): Promise<RankedVenue[]> {
    // Get user profile
    const userProfile = await db('taste_profiles')
      .where({ user_id: userId })
      .first() as ProfileRow | undefined;

    if (!userProfile) {
      throw new Error('Taste profile not found');
    }

    // Get venue embeddings
    const venueEmbeddings = await db('venue_embeddings')
      .select('venue_id', 'embedding_vector')
      .whereIn('venue_id', venueIds) as VenueEmbeddingRow[];

    // Parse user profile vector
    const userVector = this.parseVectorString(userProfile.embedding_vector);

    // Compute similarity for each venue
    const rankedVenues: RankedVenue[] = venueEmbeddings.map(venue => {
      const venueVector = this.parseVectorString(venue.embedding_vector);
      const similarity = cosineSimilarity(userVector, venueVector);

      return {
        venueId: venue.venue_id,
        similarity
      };
    });

    // Sort by similarity (descending)
    rankedVenues.sort((a, b) => b.similarity - a.similarity);

    return rankedVenues;
  }

  /**
   * Parse pgvector string format to number array
   * Format: "[0.1, 0.2, 0.3, ...]"
   *
   * @param vectorString pgvector format string
   * @returns Number array
   */
  private static parseVectorString(vectorString: string): number[] {
    // Remove brackets and split by comma
    const cleaned = vectorString.replace(/[\[\]]/g, '');
    return cleaned.split(',').map(v => parseFloat(v.trim()));
  }
}
