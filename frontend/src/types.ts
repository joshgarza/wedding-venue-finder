// src/types.ts
export type Venue = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  website?: string | null;
  city?: string | null;
  tags?: string[] | null;
  photos?: string[] | null; // absolute URLs
};

// API Venue response type (matches backend)
export type ApiVenue = {
  venue_id: number;
  name: string;
  lat: number;
  lng: number;
  website_url?: string | null;
  pricing_tier?: PricingTier | null;
  has_lodging?: boolean | null;
  lodging_capacity?: number | null;
  is_estate?: boolean | null;
  is_historic?: boolean | null;
  taste_score?: number | null;
  distance_km?: number | null;
  distance_meters?: number | null;
  thumbnail?: string | null;
};

export type PricingTier = 'low' | 'medium' | 'high' | 'luxury';

export type SortOption =
  | 'taste_score'
  | 'distance'
  | 'pricing_tier'
  | 'lodging_capacity';

export type SearchFilters = {
  pricing_tier?: PricingTier[];
  has_lodging?: boolean;
  is_estate?: boolean;
  is_historic?: boolean;
  lodging_capacity_min?: number;
  lat?: number;
  lng?: number;
  radius_meters?: number;
  sort?: SortOption;
  limit?: number;
  offset?: number;
};

export type VenueSearchResponse = {
  venues: ApiVenue[];
  total_count: number;
  page: number;
  limit: number;
  total_pages: number;
};

// Onboarding types
export type OnboardingVenue = {
  venueId: string;
  name: string;
  imagePath: string;
};

// Taste profile types
export type TasteProfile = {
  profileId: string;
  userId: string;
  descriptiveWords: string[];
  confidence: number;
};

// Venue with swipe data (from GET /swipes/saved)
export type VenueWithSwipe = {
  venue_id: string;
  name: string;
  lat: number;
  lng: number;
  website_url?: string | null;
  image_data?: {
    local_paths?: string[];
  } | null;
  pricing_tier?: PricingTier | null;
  has_lodging?: boolean | null;
  lodging_capacity?: number | null;
  is_estate?: boolean | null;
  is_historic?: boolean | null;
  taste_score?: number | null;
  swipe_timestamp?: string;
};

// Venue detail response (from GET /venues/:id)
export type VenueDetailResponse = {
  venue_id: string;
  name: string;
  lat: number;
  lng: number;
  website_url?: string | null;
  images: string[];
  raw_markdown?: string | null;
  pricing_tier?: PricingTier | null;
  has_lodging?: boolean | null;
  lodging_capacity?: number | null;
  is_estate?: boolean | null;
  is_historic?: boolean | null;
  taste_score?: number | null;
};

