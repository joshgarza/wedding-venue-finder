import { useState, useEffect } from 'react';
import apiClient from '../utils/api-client';
import type { TasteProfile } from '../types';
import axios from 'axios';

interface UseTasteProfileReturn {
  profile: TasteProfile | null;
  loading: boolean;
  error: string | null;
}

export function useTasteProfile(): UseTasteProfileReturn {
  const [profile, setProfile] = useState<TasteProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchProfile = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await apiClient.get('/taste-profile');
        if (!cancelled) {
          setProfile(response.data.data.profile);
        }
      } catch (err) {
        if (cancelled) return;

        if (axios.isAxiosError(err) && err.response?.status === 404) {
          // No profile yet - not an error
          setProfile(null);
        } else {
          setError(
            axios.isAxiosError(err)
              ? err.response?.data?.message || 'Failed to load taste profile'
              : 'Failed to load taste profile'
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchProfile();

    return () => {
      cancelled = true;
    };
  }, []);

  return { profile, loading, error };
}
