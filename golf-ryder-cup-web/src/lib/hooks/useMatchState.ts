/**
 * useMatchState Hook
 *
 * Real-time match state tracking with Dexie live queries.
 */

'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { calculateMatchState } from '../services/scoringEngine';
import type { MatchState } from '../types/computed';

/**
 * Hook to get live match state
 *
 * @param matchId - The match ID to track
 * @returns Match state (updates automatically when data changes)
 */
export function useMatchState(matchId: string | undefined): MatchState | null {
    const matchState = useLiveQuery(
        async () => {
            if (!matchId) return null;

            const match = await db.matches.get(matchId);
            if (!match) return null;

            const holeResults = await db.holeResults
                .where('matchId')
                .equals(matchId)
                .toArray();

            return calculateMatchState(match, holeResults);
        },
        [matchId],
        null
    );

    return matchState;
}

/**
 * Hook to get live hole results for a match
 *
 * @param matchId - The match ID
 * @returns Array of hole results
 */
export function useHoleResults(matchId: string | undefined) {
    return useLiveQuery(
        async () => {
            if (!matchId) return [];

            return db.holeResults
                .where('matchId')
                .equals(matchId)
                .sortBy('holeNumber');
        },
        [matchId],
        []
    );
}

export default useMatchState;
