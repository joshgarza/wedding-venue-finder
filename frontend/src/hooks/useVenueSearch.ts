import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { getAccessToken } from '../utils/auth.utils';
import type { SearchFilters, VenueSearchResponse, ApiVenue } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3003';

export interface UseVenueSearchResult {
  venues: ApiVenue[];
  totalCount: number;
  page: number;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useVenueSearch(filters: SearchFilters): UseVenueSearchResult {
  const [venues, setVenues] = useState<ApiVenue[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [debouncedFilters, setDebouncedFilters] = useState(filters);

  // Debounce filters (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedFilters(filters);
    }, 300);

    return () => clearTimeout(timer);
  }, [filters]);

  const fetchVenues = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const token = getAccessToken();
      if (!token) {
        throw new Error('Not authenticated');
      }

      // Build query parameters
      const params = new URLSearchParams();

      if (debouncedFilters.pricing_tier && debouncedFilters.pricing_tier.length > 0) {
        debouncedFilters.pricing_tier.forEach((tier) => {
          params.append('pricing_tier', tier);
        });
      }

      if (debouncedFilters.has_lodging !== undefined) {
        params.append('has_lodging', String(debouncedFilters.has_lodging));
      }

      if (debouncedFilters.is_estate !== undefined) {
        params.append('is_estate', String(debouncedFilters.is_estate));
      }

      if (debouncedFilters.is_historic !== undefined) {
        params.append('is_historic', String(debouncedFilters.is_historic));
      }

      if (debouncedFilters.lodging_capacity_min !== undefined) {
        params.append('lodging_capacity_min', String(debouncedFilters.lodging_capacity_min));
      }

      if (debouncedFilters.lat !== undefined && debouncedFilters.lng !== undefined && debouncedFilters.radius_meters !== undefined) {
        params.append('lat', String(debouncedFilters.lat));
        params.append('lng', String(debouncedFilters.lng));
        params.append('radius_meters', String(debouncedFilters.radius_meters));
      }

      if (debouncedFilters.sort) {
        params.append('sort', debouncedFilters.sort);
      }

      if (debouncedFilters.limit) {
        params.append('limit', String(debouncedFilters.limit));
      }

      if (debouncedFilters.offset !== undefined) {
        params.append('offset', String(debouncedFilters.offset));
      }

      const response = await axios.get<VenueSearchResponse>(
        `${API_BASE_URL}/api/v1/venues?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setVenues(response.data.venues);
      setTotalCount(response.data.total_count);
      setPage(response.data.page);
    } catch (err: any) {
      console.error('Error fetching venues:', err);
      setError(err.response?.data?.error || err.message || 'Failed to fetch venues');
      setVenues([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [debouncedFilters]);

  useEffect(() => {
    fetchVenues();
  }, [fetchVenues]);

  return {
    venues,
    totalCount,
    page,
    loading,
    error,
    refetch: fetchVenues,
  };
}
