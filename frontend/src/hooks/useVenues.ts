import { useState, useEffect, useCallback } from 'react';
import apiClient from '../utils/api-client';
import type { ApiVenue, VenueSearchResponse } from '../types';

export interface UseVenuesResult {
  venues: ApiVenue[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => void;
  refetch: () => void;
}

/**
 * Hook for fetching venues for the swipe interface
 * Automatically loads venues with pagination support
 */
export function useVenues(initialLimit: number = 20): UseVenuesResult {
  const [venues, setVenues] = useState<ApiVenue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  const limit = initialLimit;

  const fetchVenues = useCallback(
    async (currentOffset: number, append: boolean = false) => {
      try {
        setLoading(true);
        setError(null);

        const response = await apiClient.get<VenueSearchResponse>('/venues', {
          params: {
            limit,
            offset: currentOffset,
            sort: 'taste_score', // Default to taste-based ranking
          },
        });

        if (append) {
          setVenues((prev) => [...prev, ...response.data.venues]);
        } else {
          setVenues(response.data.venues);
        }

        setTotalCount(response.data.total_count);
      } catch (err: any) {
        const errorMessage = err.response?.data?.error || err.message || 'Failed to load venues';
        setError(errorMessage);
        console.error('Error fetching venues:', err);
      } finally {
        setLoading(false);
      }
    },
    [limit]
  );

  // Initial fetch
  useEffect(() => {
    fetchVenues(0, false);
  }, [fetchVenues]);

  const loadMore = useCallback(() => {
    const newOffset = offset + limit;
    setOffset(newOffset);
    fetchVenues(newOffset, true);
  }, [offset, limit, fetchVenues]);

  const refetch = useCallback(() => {
    setOffset(0);
    fetchVenues(0, false);
  }, [fetchVenues]);

  const hasMore = venues.length < totalCount;

  return {
    venues,
    loading,
    error,
    hasMore,
    loadMore,
    refetch,
  };
}
