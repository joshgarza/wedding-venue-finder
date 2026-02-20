import { db } from '../../../db/db-config';
import { updateProfile } from './taste-profile.service';
import { getTasteScore } from './venue.service';

export type SwipeAction = 'right' | 'left' | 'unsave';

export interface Swipe {
  swipe_id: string;
  user_id: string;
  venue_id: string;
  action: SwipeAction;
  session_id: string | null;
  timestamp: Date;
}

export interface VenueWithSwipe {
  venue_id: string;
  name: string;
  lat: number;
  lng: number;
  website_url: string | null;
  image_data: any;
  is_wedding_venue: boolean | null;
  is_estate: boolean | null;
  is_historic: boolean | null;
  has_lodging: boolean | null;
  lodging_capacity: number | null;
  pricing_tier: string | null;
  swipe_timestamp: Date;
}

export interface SwipeHistoryItem {
  swipe_id: string;
  venue_id: string;
  venue_name: string;
  action: SwipeAction;
  timestamp: Date;
  session_id: string | null;
}

/**
 * Record a swipe event
 *
 * @param userId - User ID
 * @param venueId - Venue ID
 * @param action - Swipe action (right, left, unsave)
 * @param sessionId - Optional session ID for grouping onboarding swipes
 * @returns Created swipe record
 */
export async function recordSwipe(
  userId: string,
  venueId: string,
  action: SwipeAction,
  sessionId?: string
): Promise<Swipe> {
  // Check if venue has already been swiped (unless action is 'unsave')
  const existingSwipes = await db('swipes')
    .where({ user_id: userId, venue_id: venueId });

  if (action === 'unsave') {
    // Find and delete any existing swipe for this venue
    const existingSwipe = existingSwipes[0];

    if (!existingSwipe) {
      throw new Error('No saved swipe found to unsave');
    }

    await db('swipes')
      .where({
        user_id: userId,
        venue_id: venueId,
      })
      .delete();

    // Return the deleted swipe record
    return {
      swipe_id: existingSwipe.swipe_id,
      user_id: userId,
      venue_id: venueId,
      action: 'unsave',
      session_id: existingSwipe.session_id,
      timestamp: new Date()
    };
  }

  // Prevent duplicate swipes for 'right' or 'left' actions
  if (existingSwipes.length > 0) {
    throw new Error('Venue already swiped');
  }

  // Insert new swipe
  const [newSwipe] = await db('swipes')
    .insert({
      user_id: userId,
      venue_id: venueId,
      action,
      session_id: sessionId || null,
      timestamp: new Date()
    })
    .returning('*');

  // If action is 'right', check if taste profile exists and update it
  if (action === 'right') {
    const tasteProfile = await db('taste_profiles')
      .where({ user_id: userId })
      .first();

    if (tasteProfile) {
      // Trigger taste profile update (asynchronous, don't wait)
      updateProfile(userId).catch(err => {
        console.error('Failed to update taste profile:', err);
      });
    }
  }

  return newSwipe;
}

/**
 * Get user's shortlist (all venues with 'right' swipes)
 *
 * @param userId - User ID
 * @returns Array of venues with full details
 */
export async function getShortlist(userId: string): Promise<VenueWithSwipe[]> {
  const venues = await db('venues as v')
    .select(
      'v.venue_id',
      'v.name',
      db.raw('ST_Y(v.location_lat_long) as lat'),
      db.raw('ST_X(v.location_lat_long) as lng'),
      'v.website_url',
      'v.image_data',
      'v.is_wedding_venue',
      'v.is_estate',
      'v.is_historic',
      'v.has_lodging',
      'v.lodging_capacity',
      'v.pricing_tier',
      's.timestamp as swipe_timestamp'
    )
    .join('swipes as s', 'v.venue_id', 's.venue_id')
    .where({
      's.user_id': userId,
      's.action': 'right'
    })
    .orderBy('s.timestamp', 'desc');

  // Compute taste scores for each venue
  const venuesWithScores = await Promise.all(
    venues.map(async (venue) => ({
      ...venue,
      taste_score: await getTasteScore(userId, venue.venue_id),
    }))
  );

  return venuesWithScores;
}

/**
 * Get paginated swipe history for user
 *
 * @param userId - User ID
 * @param limit - Number of records to return (default 50, max 200)
 * @param offset - Number of records to skip (default 0)
 * @returns Array of swipe history items
 */
export async function getSwipeHistory(
  userId: string,
  limit: number = 50,
  offset: number = 0
): Promise<SwipeHistoryItem[]> {
  // Enforce max limit
  const effectiveLimit = Math.min(limit, 200);

  const history = await db('swipes as s')
    .select(
      's.swipe_id',
      's.venue_id',
      'v.name as venue_name',
      's.action',
      's.timestamp',
      's.session_id'
    )
    .join('venues as v', 's.venue_id', 'v.venue_id')
    .where({ 's.user_id': userId })
    .orderBy('s.timestamp', 'desc')
    .limit(effectiveLimit)
    .offset(offset);

  return history;
}

/**
 * Get swipes for a specific session
 *
 * @param userId - User ID
 * @param sessionId - Session ID
 * @returns Array of swipes in the session
 */
export async function getSessionSwipes(
  userId: string,
  sessionId: string
): Promise<SwipeHistoryItem[]> {
  const swipes = await db('swipes as s')
    .select(
      's.swipe_id',
      's.venue_id',
      'v.name as venue_name',
      's.action',
      's.timestamp'
    )
    .join('venues as v', 's.venue_id', 'v.venue_id')
    .where({
      's.user_id': userId,
      's.session_id': sessionId
    })
    .orderBy('s.timestamp', 'asc');

  return swipes;
}

/**
 * Check if user has already swiped a venue
 *
 * @param userId - User ID
 * @param venueId - Venue ID
 * @returns True if venue has been swiped
 */
export async function hasSwipedVenue(
  userId: string,
  venueId: string
): Promise<boolean> {
  const swipes = await db('swipes')
    .where({ user_id: userId, venue_id: venueId });

  return swipes.length > 0;
}
