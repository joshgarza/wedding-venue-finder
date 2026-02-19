import { useState, useEffect, useCallback } from 'react';
import apiClient from '../utils/api-client';
import type { VenueWithSwipe } from '../types';
import axios from 'axios';

interface UseShortlistReturn {
  venues: VenueWithSwipe[];
  loading: boolean;
  error: string | null;
  unsave: (venueId: string) => void;
}

export function useShortlist(): UseShortlistReturn {
  const [venues, setVenues] = useState<VenueWithSwipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchSaved = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await apiClient.get('/swipes/saved');
        if (!cancelled) {
          setVenues(response.data.data.venues);
        }
      } catch (err) {
        if (cancelled) return;
        setError(
          axios.isAxiosError(err)
            ? err.response?.data?.message || 'Failed to load saved venues'
            : 'Failed to load saved venues'
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchSaved();

    return () => {
      cancelled = true;
    };
  }, []);

  const unsave = useCallback((venueId: string) => {
    // Capture venue and index for rollback
    let removedVenue: VenueWithSwipe | undefined;
    let removedIndex = -1;

    setVenues((prev) => {
      removedIndex = prev.findIndex((v) => v.venue_id === venueId);
      if (removedIndex !== -1) {
        removedVenue = prev[removedIndex];
      }
      return prev.filter((v) => v.venue_id !== venueId);
    });

    apiClient
      .post('/swipes', { venueId, action: 'unsave' })
      .catch((err) => {
        console.error('Failed to unsave venue:', err);
        // Rollback: re-insert venue at original position
        if (removedVenue) {
          const venue = removedVenue;
          const idx = removedIndex;
          setVenues((prev) => {
            const next = [...prev];
            next.splice(Math.min(idx, next.length), 0, venue);
            return next;
          });
        }
        setError('Failed to remove venue. It has been restored.');
        setTimeout(() => setError(null), 3000);
      });
  }, []);

  return { venues, loading, error, unsave };
}
