import { useState, useEffect, useCallback, useRef } from 'react';
import apiClient from '../utils/api-client';
import type { ApiVenue, VenueSearchResponse } from '../types';

const PAGE_SIZE = 10;

export interface UseSwipeDeckResult {
  currentVenue: ApiVenue | null;
  nextVenue: ApiVenue | null;
  swipe: (action: 'left' | 'right') => void;
  loading: boolean;
  isEmpty: boolean;
}

export function useSwipeDeck(): UseSwipeDeckResult {
  const [deck, setDeck] = useState<ApiVenue[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [exhausted, setExhausted] = useState(false);

  // Use ref to track deck length for pagination checks without stale closures
  const deckRef = useRef(deck);
  deckRef.current = deck;

  const loadingMoreRef = useRef(loadingMore);
  loadingMoreRef.current = loadingMore;

  const exhaustedRef = useRef(exhausted);
  exhaustedRef.current = exhausted;

  const fetchBatch = useCallback(async (offset: number, isInitial: boolean) => {
    if (isInitial) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    try {
      const response = await apiClient.get<VenueSearchResponse>('/venues', {
        params: {
          sort: 'taste_score',
          limit: PAGE_SIZE,
          offset,
        },
      });

      const { venues } = response.data;

      if (venues.length === 0) {
        setExhausted(true);
      } else {
        setDeck((prev) => [...prev, ...venues]);
        if (venues.length < PAGE_SIZE) {
          setExhausted(true);
        }
      }
    } catch (err) {
      console.error('Error fetching venues for swipe deck:', err);
      // On initial load failure, mark exhausted so UI shows empty state
      if (isInitial) {
        setExhausted(true);
      }
    } finally {
      if (isInitial) {
        setLoading(false);
      } else {
        setLoadingMore(false);
      }
    }
  }, []);

  // Initial fetch on mount
  useEffect(() => {
    fetchBatch(0, true);
  }, [fetchBatch]);

  const swipe = useCallback((action: 'left' | 'right') => {
    setCurrentIndex((prev) => {
      const currentDeck = deckRef.current;
      const venue = currentDeck[prev];
      if (!venue) return prev;

      // POST /swipes - fire-and-forget
      apiClient
        .post('/swipes', {
          venueId: String(venue.venue_id),
          action: action === 'right' ? 'right' : 'left',
        })
        .catch((err) => {
          // Silently catch 409 (duplicate swipe), log others
          if (err.response?.status !== 409) {
            console.error('Error recording swipe:', err);
          }
        });

      // If liked, also update taste profile - fire-and-forget
      if (action === 'right') {
        apiClient.post('/taste-profile/update', {}).catch((err) => {
          console.error('Error updating taste profile:', err);
        });
      }

      const nextIndex = prev + 1;

      // Prefetch when nearing end of deck
      if (
        nextIndex >= currentDeck.length - 2 &&
        !loadingMoreRef.current &&
        !exhaustedRef.current
      ) {
        fetchBatch(currentDeck.length, false);
      }

      return nextIndex;
    });
  }, [fetchBatch]);

  const currentVenue = deck[currentIndex] ?? null;
  const nextVenue = deck[currentIndex + 1] ?? null;
  const isEmpty = !loading && currentVenue === null && exhausted;

  return {
    currentVenue,
    nextVenue,
    swipe,
    loading,
    isEmpty,
  };
}
