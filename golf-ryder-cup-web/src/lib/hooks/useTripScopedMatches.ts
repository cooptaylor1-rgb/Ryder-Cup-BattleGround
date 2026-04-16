/**
 * useTripScopedMatches
 *
 * Encapsulates the common "get sessions for this trip → get matches for
 * those sessions" pipeline that 6+ page clients implement independently.
 * Centralising here means:
 *
 *   1. All match queries are guaranteed trip-scoped (no more
 *      db.matches.toArray() loading every match the device has seen).
 *   2. Dependency tracking is consistent — no more `.join(',')` or
 *      `.join('|')` ad-hoc keys that may or may not re-fire correctly.
 *   3. If we add a TTL cache layer later, it's one change, not six.
 *
 * Returns `undefined` while the initial query is loading so callers can
 * distinguish "loading" from "loaded but empty".
 */
'use client';

import { useMemo } from 'react';
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
    tripId: string | null | undefined,
): TripScopedMatchData | undefined {
    const sessions = useLiveQuery(
        async () =>
            tripId
                ? db.sessions.where('tripId').equals(tripId).toArray()
                : [],
        [tripId],
    );

    const sessionIds = useMemo(
        () => sessions?.map((s) => s.id) ?? [],
        [sessions],
    );

    const matches = useLiveQuery(
        async () =>
            sessionIds.length > 0
                ? db.matches.where('sessionId').anyOf(sessionIds).toArray()
                : [],
        // Dexie's useLiveQuery does a shallow compare of the deps array.
        // Passing sessionIds directly would fire on every render because
        // the array reference changes. JSON.stringify is a stable key.
        [JSON.stringify(sessionIds)],
    );

    if (sessions === undefined || matches === undefined) {
        return undefined;
    }

    return { sessions, matches };
}
