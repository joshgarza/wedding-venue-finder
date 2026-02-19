import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import apiClient from '../utils/api-client';
import type { OnboardingVenue, TasteProfile } from '../types';

type Phase = 'loading' | 'swiping' | 'generating' | 'complete' | 'error';

interface UseOnboardingReturn {
  phase: Phase;
  venues: OnboardingVenue[];
  currentIndex: number;
  totalCount: number;
  swipe: (action: 'left' | 'right') => void;
  profile: TasteProfile | null;
  error: string | null;
  swipeError: string | null;
  dismissSwipeError: () => void;
  retry: () => void;
  isRefine: boolean;
}

export function useOnboarding(): UseOnboardingReturn {
  const [searchParams] = useSearchParams();
  const isRefine = searchParams.get('refine') === 'true';

  const [phase, setPhase] = useState<Phase>('loading');
  const [venues, setVenues] = useState<OnboardingVenue[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [profile, setProfile] = useState<TasteProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [swipeError, setSwipeError] = useState<string | null>(null);
  const [errorSource, setErrorSource] = useState<'loading' | 'generating' | null>(null);

  const sessionIdRef = useRef(crypto.randomUUID());
  const swipePromisesRef = useRef<Promise<unknown>[]>([]);
  const [fetchTrigger, setFetchTrigger] = useState(0);

  // Fetch onboarding venues on mount (or on retry)
  useEffect(() => {
    let cancelled = false;

    async function fetchVenues() {
      setPhase('loading');
      setError(null);
      setErrorSource(null);
      try {
        const params = isRefine ? { count: 5 } : undefined;
        const response = await apiClient.get<{ data: { venues: OnboardingVenue[] } }>(
          '/taste-profile/onboarding',
          { params }
        );
        if (cancelled) return;
        setVenues(response.data.data.venues);
        setPhase('swiping');
      } catch (err) {
        if (cancelled) return;
        const message =
          err instanceof Error ? err.message : 'Failed to load onboarding venues';
        setError(message);
        setErrorSource('loading');
        setPhase('error');
      }
    }

    fetchVenues();

    return () => {
      cancelled = true;
    };
  }, [isRefine, fetchTrigger]);

  const totalCount = venues.length;

  const generateProfile = useCallback(async () => {
    setPhase('generating');

    // Wait for all swipe POSTs to complete before generating
    await Promise.allSettled(swipePromisesRef.current);
    swipePromisesRef.current = [];

    const endpoint = isRefine ? '/taste-profile/update' : '/taste-profile/generate';

    try {
      const response = await apiClient.post<{ data: { profile: TasteProfile } }>(endpoint, {
        sessionId: sessionIdRef.current,
      });
      setProfile(response.data.data.profile);
      setPhase('complete');
    } catch (err: unknown) {
      const apiMessage =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data
          ?.error?.message;
      const message = apiMessage || 'Failed to generate taste profile';
      setError(message);
      setErrorSource('generating');
      setPhase('error');
    }
  }, [isRefine]);

  const swipe = useCallback(
    (action: 'left' | 'right') => {
      if (phase !== 'swiping' || currentIndex >= totalCount) return;

      const venue = venues[currentIndex];

      // Track swipe POST so generateProfile can await all of them
      const swipePromise = apiClient
        .post('/swipes', {
          venueId: venue.venueId,
          action,
          sessionId: sessionIdRef.current,
        })
        .then(() => {
          setSwipeError(null);
        })
        .catch((err) => {
          if (err?.response?.status !== 409) {
            console.error('Swipe POST failed:', err);
            setSwipeError('Failed to record swipe. Please try again.');
          }
        });
      swipePromisesRef.current.push(swipePromise);

      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);

      // After the last swipe, generate the taste profile
      if (nextIndex >= totalCount) {
        generateProfile();
      }
    },
    [phase, currentIndex, totalCount, venues, generateProfile]
  );

  const retry = useCallback(() => {
    setError(null);
    if (errorSource === 'loading') {
      setFetchTrigger((n) => n + 1);
    } else {
      generateProfile();
    }
  }, [errorSource, generateProfile]);

  const dismissSwipeError = useCallback(() => {
    setSwipeError(null);
  }, []);

  return {
    phase,
    venues,
    currentIndex,
    totalCount,
    swipe,
    profile,
    error,
    swipeError,
    dismissSwipeError,
    retry,
    isRefine,
  };
}
