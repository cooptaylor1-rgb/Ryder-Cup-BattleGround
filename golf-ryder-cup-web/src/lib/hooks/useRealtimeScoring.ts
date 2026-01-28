/**
 * useRealtimeScoring Hook
 *
 * React hook for subscribing to realtime score updates.
 * Automatically connects to Supabase Realtime channels and
 * handles cleanup on unmount.
 */

'use client';

import { useEffect, useCallback, useRef, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import type { UUID } from '@/lib/types/models';
import {
  subscribeToMatch,
  subscribeToTrip,
  broadcastScoreUpdate,
  type ScoreUpdate,
  type PlayerPresence,
} from '@/lib/services/realtimeSyncService';
import { syncLogger } from '@/lib/utils/logger';

// Supabase client singleton (only created if env vars are present)
let supabaseClient: ReturnType<typeof createClient> | null = null;

function getSupabaseClient() {
  if (supabaseClient) return supabaseClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    syncLogger.log('Supabase not configured - realtime disabled');
    return null;
  }

  supabaseClient = createClient(url, key, {
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  });

  return supabaseClient;
}

export interface UseRealtimeScoringOptions {
  /** Trip ID for trip-wide updates */
  tripId?: UUID;
  /** Match ID for match-specific updates */
  matchId?: UUID;
  /** Called when a score update is received */
  onScoreUpdate?: (update: ScoreUpdate) => void;
  /** Called when presence changes (who's viewing/scoring) */
  onPresenceChange?: (presence: PlayerPresence[]) => void;
  /** Whether realtime is enabled */
  enabled?: boolean;
}

export interface UseRealtimeScoringReturn {
  /** Whether we're connected to realtime */
  isConnected: boolean;
  /** Currently viewing/scoring players */
  activeUsers: PlayerPresence[];
  /** Broadcast a score update to other users */
  broadcastScore: (update: ScoreUpdate) => Promise<void>;
  /** Error if connection failed */
  error: Error | null;
}

/**
 * Hook for subscribing to realtime score updates
 */
export function useRealtimeScoring(options: UseRealtimeScoringOptions): UseRealtimeScoringReturn {
  const { tripId, matchId, onScoreUpdate, onPresenceChange, enabled = true } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [activeUsers, setActiveUsers] = useState<PlayerPresence[]>([]);
  const [error, setError] = useState<Error | null>(null);

  // Store callbacks in refs to avoid recreating subscriptions
  const onScoreUpdateRef = useRef(onScoreUpdate);
  const onPresenceChangeRef = useRef(onPresenceChange);

  useEffect(() => {
    onScoreUpdateRef.current = onScoreUpdate;
  }, [onScoreUpdate]);

  useEffect(() => {
    onPresenceChangeRef.current = onPresenceChange;
  }, [onPresenceChange]);

  // Handle presence updates
  const handlePresence = useCallback((presences: PlayerPresence[]) => {
    setActiveUsers(presences);
    onPresenceChangeRef.current?.(presences);
  }, []);

  // Handle score updates
  const handleScoreUpdate = useCallback((update: ScoreUpdate) => {
    onScoreUpdateRef.current?.(update);
  }, []);

  // Subscribe to channels
  useEffect(() => {
    if (!enabled) {
      setIsConnected(false);
      return;
    }

    const client = getSupabaseClient();
    if (!client) {
      setIsConnected(false);
      return;
    }

    let unsubscribe: (() => void) | null = null;

    const subscribe = async () => {
      try {
        // Subscribe to match if matchId provided, otherwise trip
        if (matchId) {
          unsubscribe = await subscribeToMatch(client, matchId, {
            onScoreUpdate: handleScoreUpdate,
            onPresence: handlePresence,
          });
        } else if (tripId) {
          unsubscribe = await subscribeToTrip(client, tripId, {
            onScoreUpdate: handleScoreUpdate,
            onPresence: handlePresence,
          });
        }

        setIsConnected(true);
        setError(null);
        syncLogger.log(`Realtime connected: ${matchId ? `match:${matchId}` : `trip:${tripId}`}`);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to connect'));
        setIsConnected(false);
        syncLogger.error('Realtime connection failed:', err);
      }
    };

    subscribe();

    return () => {
      if (unsubscribe) {
        unsubscribe();
        syncLogger.log('Realtime disconnected');
      }
      setIsConnected(false);
    };
  }, [enabled, tripId, matchId, handleScoreUpdate, handlePresence]);

  // Broadcast score function
  const broadcastScore = useCallback(
    async (update: ScoreUpdate) => {
      const client = getSupabaseClient();
      if (!client || !tripId) {
        syncLogger.log('Cannot broadcast: not connected');
        return;
      }

      await broadcastScoreUpdate(client, tripId, update.matchId, update);
    },
    [tripId]
  );

  return {
    isConnected,
    activeUsers,
    broadcastScore,
    error,
  };
}

export default useRealtimeScoring;
