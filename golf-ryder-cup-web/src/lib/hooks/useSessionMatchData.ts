/**
 * useSessionMatchData Hook
 *
 * Compound query hook that loads matches and hole results in a single
 * reactive query, eliminating the N+1 pattern where components first
 * load matches, then separately load hole results in a dependent query.
 *
 * Before: 2 useLiveQuery calls (matches → hole results) causing
 * sequential IndexedDB reads and double re-renders.
 *
 * After: 1 useLiveQuery call that fetches both in parallel, single render.
 */

'use client';

import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import type { Match, HoleResult } from '@/lib/types/models';

export interface SessionMatchData {
  matches: Match[];
  holeResults: HoleResult[];
  /** Hole results grouped by matchId for efficient lookup */
  holeResultsByMatch: Map<string, HoleResult[]>;
  isLoading: boolean;
}

/**
 * Load all matches and hole results for a session in a single reactive query.
 */
export function useSessionMatchData(sessionId: string | undefined): SessionMatchData {
  const data = useLiveQuery(
    async () => {
      if (!sessionId) return { matches: [], holeResults: [] };

      const matches = await db.matches
        .where('sessionId')
        .equals(sessionId)
        .toArray();

      if (matches.length === 0) return { matches, holeResults: [] };

      const matchIds = matches.map(m => m.id);
      const holeResults = await db.holeResults
        .where('matchId')
        .anyOf(matchIds)
        .toArray();

      return { matches, holeResults };
    },
    [sessionId],
    undefined
  );

  const holeResultsByMatch = useMemo(() => {
    const map = new Map<string, HoleResult[]>();
    if (!data) return map;
    for (const result of data.holeResults) {
      const existing = map.get(result.matchId) || [];
      existing.push(result);
      map.set(result.matchId, existing);
    }
    return map;
  }, [data]);

  return {
    matches: data?.matches ?? [],
    holeResults: data?.holeResults ?? [],
    holeResultsByMatch,
    isLoading: data === undefined,
  };
}

/**
 * Load all matches and hole results for a trip (across all sessions)
 * in a single reactive query.
 */
export function useTripMatchData(tripId: string | undefined): SessionMatchData {
  const data = useLiveQuery(
    async () => {
      if (!tripId) return { matches: [], holeResults: [] };

      const sessions = await db.sessions.where('tripId').equals(tripId).toArray();
      const sessionIds = sessions.map(s => s.id);

      if (sessionIds.length === 0) return { matches: [], holeResults: [] };

      const matches = await db.matches
        .where('sessionId')
        .anyOf(sessionIds)
        .toArray();

      if (matches.length === 0) return { matches, holeResults: [] };

      const matchIds = matches.map(m => m.id);
      const holeResults = await db.holeResults
        .where('matchId')
        .anyOf(matchIds)
        .toArray();

      return { matches, holeResults };
    },
    [tripId],
    undefined
  );

  const holeResultsByMatch = useMemo(() => {
    const map = new Map<string, HoleResult[]>();
    if (!data) return map;
    for (const result of data.holeResults) {
      const existing = map.get(result.matchId) || [];
      existing.push(result);
      map.set(result.matchId, existing);
    }
    return map;
  }, [data]);

  return {
    matches: data?.matches ?? [],
    holeResults: data?.holeResults ?? [],
    holeResultsByMatch,
    isLoading: data === undefined,
  };
}

export default useSessionMatchData;
