import { useState, useEffect, useCallback, useRef } from 'react';
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
}

export function useOnboarding(): UseOnboardingReturn {
  const [phase, setPhase] = useState<Phase>('loading');
  const [venues, setVenues] = useState<OnboardingVenue[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [profile, setProfile] = useState<TasteProfile | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sessionIdRef = useRef(crypto.randomUUID());

  // Fetch onboarding venues on mount
  useEffect(() => {
    let cancelled = false;

    async function fetchVenues() {
      try {
        const response = await apiClient.get<{ data: { venues: OnboardingVenue[] } }>(
          '/taste-profile/onboarding'
        );
        if (cancelled) return;
        setVenues(response.data.data.venues);
        setPhase('swiping');
      } catch (err) {
        if (cancelled) return;
        const message =
          err instanceof Error ? err.message : 'Failed to load onboarding venues';
        setError(message);
        setPhase('error');
      }
    }

    fetchVenues();

    return () => {
      cancelled = true;
    };
  }, []);

  const totalCount = venues.length;

  const swipe = useCallback(
    (action: 'left' | 'right') => {
      if (phase !== 'swiping' || currentIndex >= totalCount) return;

      const venue = venues[currentIndex];

      // Fire-and-forget swipe POST, catch 409 silently
      apiClient
        .post('/swipes', {
          venueId: venue.venueId,
          action,
          sessionId: sessionIdRef.current,
        })
        .catch((err) => {
          if (err?.response?.status !== 409) {
            console.error('Swipe POST failed:', err);
          }
        });

      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);

      // After the last swipe, generate the taste profile
      if (nextIndex >= totalCount) {
        setPhase('generating');

        apiClient
          .post<{ data: { profile: TasteProfile } }>('/taste-profile/generate', {
            sessionId: sessionIdRef.current,
          })
          .then((response) => {
            setProfile(response.data.data.profile);
            setPhase('complete');
          })
          .catch((err) => {
            const message =
              err instanceof Error
                ? err.message
                : 'Failed to generate taste profile';
            setError(message);
            setPhase('error');
          });
      }
    },
    [phase, currentIndex, totalCount, venues]
  );

  return {
    phase,
    venues,
    currentIndex,
    totalCount,
    swipe,
    profile,
    error,
  };
}
