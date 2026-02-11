import { useState, useEffect } from 'react';
import apiClient from '../utils/api-client';
import type { VenueDetailResponse } from '../types';
import axios from 'axios';

interface UseVenueDetailReturn {
  venue: VenueDetailResponse | null;
  loading: boolean;
  error: string | null;
}

export function useVenueDetail(id: string): UseVenueDetailReturn {
  const [venue, setVenue] = useState<VenueDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchVenue = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await apiClient.get(`/venues/${id}`);
        if (!cancelled) {
          setVenue(response.data);
        }
      } catch (err) {
        if (cancelled) return;
        setError(
          axios.isAxiosError(err)
            ? err.response?.data?.message || 'Failed to load venue details'
            : 'Failed to load venue details'
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchVenue();

    return () => {
      cancelled = true;
    };
  }, [id]);

  return { venue, loading, error };
}
