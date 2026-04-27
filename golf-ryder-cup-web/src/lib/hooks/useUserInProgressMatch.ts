/**
 * useUserInProgressMatch — Returns the current user's in-progress match
 * for the active trip, or null. Drives the bottom-nav "live dot" badge
 * on the Score tab and any other surface that wants a one-tap resume.
 *
 * Pure Dexie live query — updates instantly when scores or match status
 * change. No Supabase round-trip needed.
 */

import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { useAuthStore, useTripStore } from '@/lib/stores';
import { useShallow } from 'zustand/shallow';
import { useMemo } from 'react';
import { withTripPlayerIdentity } from '@/lib/utils/tripPlayerIdentity';
import { resolveCurrentTripPlayer } from '@/lib/utils/tripPlayerIdentity';

export interface UserInProgressMatchHook {
  matchId: string | null;
  hasInProgress: boolean;
}

export function useUserInProgressMatch(): UserInProgressMatchHook {
  const { currentTrip, players } = useTripStore(
    useShallow((s) => ({ currentTrip: s.currentTrip, players: s.players }))
  );
  const { currentUser, isAuthenticated, authUserId } = useAuthStore();

  const identity = useMemo(
    () => withTripPlayerIdentity(currentUser, authUserId),
    [authUserId, currentUser]
  );
  const userPlayer = useMemo(
    () => resolveCurrentTripPlayer(players, identity, isAuthenticated),
    [identity, isAuthenticated, players]
  );

  const result = useLiveQuery(
    async () => {
      if (!currentTrip || !userPlayer) return null;
      const tripSessions = await db.sessions
        .where('tripId')
        .equals(currentTrip.id)
        .toArray();
      const sessionIds = tripSessions.map((s) => s.id);
      if (sessionIds.length === 0) return null;

      const tripMatches = await db.matches
        .where('sessionId')
        .anyOf(sessionIds)
        .toArray();

      const userMatch = tripMatches.find(
        (m) =>
          m.status === 'inProgress' &&
          (m.teamAPlayerIds.includes(userPlayer.id) ||
            m.teamBPlayerIds.includes(userPlayer.id))
      );

      return userMatch ? { matchId: userMatch.id } : null;
    },
    [currentTrip?.id, userPlayer?.id],
    null
  );

  return {
    matchId: result?.matchId ?? null,
    hasInProgress: Boolean(result?.matchId),
  };
}
