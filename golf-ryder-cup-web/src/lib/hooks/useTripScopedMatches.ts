/**
 * useTripScopedMatches
 *
 * Encapsulates the common "get sessions for this trip, then get matches
 * for those sessions" pipeline that 6+ page clients implement
 * independently. Centralising here means:
 *
 *   1. All match queries are guaranteed trip-scoped (no more
 *      db.matches.toArray() loading every match the device has seen).
 *   2. Sessions and matches resolve together, so screens do not briefly
 *      render real sessions with an empty match list.
 *   3. If we add a TTL cache layer later, it's one change, not six.
 *
 * Returns `undefined` while the initial query is loading so callers can
 * distinguish "loading" from "loaded but empty".
 */
'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import type { Match, RyderCupSession } from '@/lib/types/models';

export interface TripScopedMatchData {
  sessions: RyderCupSession[];
  matches: Match[];
}

/**
 * @param tripId  The active trip ID, or null/undefined when no trip is loaded.
 * @returns `undefined` during the initial load; then `{ sessions, matches }`.
 */
export function useTripScopedMatches(
  tripId: string | null | undefined
): TripScopedMatchData | undefined {
  return useLiveQuery(async () => {
    if (!tripId) {
      return { sessions: [], matches: [] };
    }

    const sessions = await db.sessions.where('tripId').equals(tripId).toArray();
    const sessionIds = sessions.map((session) => session.id);
    const matches =
      sessionIds.length > 0 ? await db.matches.where('sessionId').anyOf(sessionIds).toArray() : [];

    return { sessions, matches };
  }, [tripId]);
}
