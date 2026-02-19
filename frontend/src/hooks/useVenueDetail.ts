import { useState, useEffect } from 'react';
import apiClient from '../utils/api-client';
import type { VenueDetailResponse } from '../types';
import axios from 'axios';

interface UseVenueDetailReturn {
  venue: VenueDetailResponse | null;
  loading: boolean;
  error: string | null;
  isSaved: boolean;
  setIsSaved: (saved: boolean) => void;
}

export function useVenueDetail(id: string): UseVenueDetailReturn {
  const [venue, setVenue] = useState<VenueDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const [venueRes, savedRes] = await Promise.all([
          apiClient.get(`/venues/${id}`),
          apiClient.get('/swipes/saved'),
        ]);
        if (!cancelled) {
          setVenue(venueRes.data);
          const savedVenues = savedRes.data?.data?.venues || savedRes.data?.venues || [];
          const saved = savedVenues.some(
            (v: { venue_id: string | number }) => String(v.venue_id) === String(id)
          );
          setIsSaved(saved);
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

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [id]);

  return { venue, loading, error, isSaved, setIsSaved };
}
