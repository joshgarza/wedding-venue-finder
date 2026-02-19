import { useState, useEffect, useCallback } from 'react';
import apiClient from '../utils/api-client';
import type { SearchFilters, VenueSearchResponse, ApiVenue } from '../types';

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

      // Build query parameters
      const params: Record<string, string | string[]> = {};

      if (debouncedFilters.pricing_tier && debouncedFilters.pricing_tier.length > 0) {
        params.pricing_tier = debouncedFilters.pricing_tier;
      }

      if (debouncedFilters.has_lodging !== undefined) {
        params.has_lodging = String(debouncedFilters.has_lodging);
      }

      if (debouncedFilters.is_estate !== undefined) {
        params.is_estate = String(debouncedFilters.is_estate);
      }

      if (debouncedFilters.is_historic !== undefined) {
        params.is_historic = String(debouncedFilters.is_historic);
      }

      if (debouncedFilters.lodging_capacity_min !== undefined) {
        params.lodging_capacity_min = String(debouncedFilters.lodging_capacity_min);
      }

      if (debouncedFilters.lat !== undefined && debouncedFilters.lng !== undefined && debouncedFilters.radius_meters !== undefined) {
        params.lat = String(debouncedFilters.lat);
        params.lng = String(debouncedFilters.lng);
        params.radius_meters = String(debouncedFilters.radius_meters);
      }

      if (debouncedFilters.sort) {
        params.sort = debouncedFilters.sort;
      }

      if (debouncedFilters.limit) {
        params.limit = String(debouncedFilters.limit);
      }

      if (debouncedFilters.offset !== undefined) {
        params.offset = String(debouncedFilters.offset);
      }

      const response = await apiClient.get<VenueSearchResponse>('/venues', { params });

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
