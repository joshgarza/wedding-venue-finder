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
  error: string | null;
  dismissError: () => void;
  undo: () => void;
  canUndo: boolean;
  retryFetch: () => void;
}

interface SwipeHistoryEntry {
  venueId: string;
  action: string;
}

export function useSwipeDeck(): UseSwipeDeckResult {
  const [deck, setDeck] = useState<ApiVenue[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [exhausted, setExhausted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [swipeHistory, setSwipeHistory] = useState<SwipeHistoryEntry[]>([]);

  // Use refs to track state for event handlers without stale closures
  const deckRef = useRef(deck);
  deckRef.current = deck;

  const currentIndexRef = useRef(currentIndex);
  currentIndexRef.current = currentIndex;

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
    const currentDeck = deckRef.current;
    const idx = currentIndexRef.current;
    const venue = currentDeck[idx];
    if (!venue) return;

    // Track swipe history for undo
    setSwipeHistory((h) => [...h, { venueId: String(venue.venue_id), action }]);

    // POST /swipes - fire-and-forget
    apiClient
      .post('/swipes', {
        venueId: String(venue.venue_id),
        action: action === 'right' ? 'right' : 'left',
      })
      .then(() => {
        setError(null);
      })
      .catch((err) => {
        // Silently catch 409 (duplicate swipe), log others
        if (err.response?.status !== 409) {
          console.error('Error recording swipe:', err);
          setError('Failed to record swipe. Please try again.');
        }
      });

    // If liked, also update taste profile - fire-and-forget
    if (action === 'right') {
      apiClient.post('/taste-profile/update', {}).catch((err) => {
        console.error('Error updating taste profile:', err);
      });
    }

    const nextIndex = idx + 1;
    setCurrentIndex(nextIndex);

    // Prefetch when nearing end of deck
    if (
      nextIndex >= currentDeck.length - 2 &&
      !loadingMoreRef.current &&
      !exhaustedRef.current
    ) {
      fetchBatch(currentDeck.length, false);
    }
  }, [fetchBatch]);

  const undo = useCallback(() => {
    if (swipeHistory.length === 0) return;

    const lastSwipe = swipeHistory[swipeHistory.length - 1];
    setSwipeHistory((h) => h.slice(0, -1));
    setCurrentIndex((prev) => Math.max(0, prev - 1));

    // Fire-and-forget undo POST
    apiClient
      .post('/swipes', {
        venueId: lastSwipe.venueId,
        action: 'undo',
      })
      .catch(() => {
        // Undo is best-effort
      });
  }, [swipeHistory]);

  const retryFetch = useCallback(() => {
    setExhausted(false);
    fetchBatch(deckRef.current.length, deckRef.current.length === 0);
  }, [fetchBatch]);

  const dismissError = useCallback(() => {
    setError(null);
  }, []);

  const currentVenue = deck[currentIndex] ?? null;
  const nextVenue = deck[currentIndex + 1] ?? null;
  const isEmpty = !loading && currentVenue === null && exhausted;

  return {
    currentVenue,
    nextVenue,
    swipe,
    loading,
    isEmpty,
    error,
    dismissError,
    undo,
    canUndo: swipeHistory.length > 0,
    retryFetch,
  };
}
