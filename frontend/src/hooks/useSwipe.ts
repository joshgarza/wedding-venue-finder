import { useState, useCallback } from 'react';
import apiClient from '../utils/api-client';

export interface SwipeAction {
  venueId: string;
  action: 'right' | 'left' | 'unsave';
  sessionId?: string;
}

export interface UseSwipeResult {
  recordSwipe: (venueId: string, action: 'right' | 'left') => Promise<void>;
  undoSwipe: (venueId: string) => Promise<void>;
  loading: boolean;
  error: string | null;
}

/**
 * Hook for managing swipe actions
 * Handles API integration for recording swipes with optimistic updates
 */
export function useSwipe(
  onSwipeSuccess?: (venueId: string, action: 'right' | 'left') => void,
  onSwipeError?: (error: string) => void
): UseSwipeResult {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recordSwipe = useCallback(
    async (venueId: string, action: 'right' | 'left') => {
      try {
        setLoading(true);
        setError(null);

        // Generate session ID if not exists (stored in sessionStorage for persistence during session)
        let sessionId = sessionStorage.getItem('swipe_session_id');
        if (!sessionId) {
          sessionId = crypto.randomUUID();
          sessionStorage.setItem('swipe_session_id', sessionId);
        }

        // Call API to record swipe
        await apiClient.post('/swipes', {
          venueId,
          action,
          sessionId,
        });

        // Trigger success callback
        if (onSwipeSuccess) {
          onSwipeSuccess(venueId, action);
        }
      } catch (err: any) {
        const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to record swipe';
        setError(errorMessage);

        if (onSwipeError) {
          onSwipeError(errorMessage);
        }

        // Re-throw to allow component-level error handling
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [onSwipeSuccess, onSwipeError]
  );

  const undoSwipe = useCallback(
    async (venueId: string) => {
      try {
        setLoading(true);
        setError(null);

        // Call API to unsave venue
        await apiClient.post('/swipes', {
          venueId,
          action: 'unsave',
        });
      } catch (err: any) {
        const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to undo swipe';
        setError(errorMessage);

        if (onSwipeError) {
          onSwipeError(errorMessage);
        }

        throw err;
      } finally {
        setLoading(false);
      }
    },
    [onSwipeError]
  );

  return {
    recordSwipe,
    undoSwipe,
    loading,
    error,
  };
}
