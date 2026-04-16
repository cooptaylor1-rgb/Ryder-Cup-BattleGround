/**
 * useTripScopedMatches
 *
 * Encapsulates the common "get sessions for this trip → get matches for
 * those sessions" pipeline that 6+ page clients implement independently.
 * Centralising here means:
 *
 *   1. All match queries are guaranteed trip-scoped (no more
 *      db.matches.toArray() loading every match the device has seen).
 *   2. Dependency tracking is consistent — useStableArray prevents
 *      spurious re-queries from array-reference churn.
 *   3. If we add a TTL cache layer later, it's one change, not six.
 *
 * Returns `undefined` while the initial query is loading so callers can
 * distinguish "loading" from "loaded but empty".
 */
'use client';

import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { useStableArray } from './useStableArray';
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

    const rawSessionIds = useMemo(
        () => sessions?.map((s) => s.id) ?? [],
        [sessions],
    );

    // useStableArray returns the same reference when the ids haven't
    // changed, so Dexie's shallow dep-compare doesn't re-fire.
    const sessionIds = useStableArray(rawSessionIds);

    const matches = useLiveQuery(
        async () =>
            sessionIds.length > 0
                ? db.matches.where('sessionId').anyOf(sessionIds).toArray()
                : [],
        [sessionIds],
    );

    if (sessions === undefined || matches === undefined) {
        return undefined;
    }

    return { sessions, matches };
}
