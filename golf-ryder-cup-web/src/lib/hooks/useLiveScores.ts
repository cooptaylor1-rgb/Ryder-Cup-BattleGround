/**
 * useLiveScores Hook
 *
 * React hook for subscribing to real-time score updates.
 * Automatically connects/disconnects based on component lifecycle.
 */

'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import {
    subscribeLiveUpdates,
    unsubscribeLiveUpdates,
    type LiveUpdateCallbacks,
    type ChangeEvent,
} from '../services/liveUpdatesService';
import { db } from '../db';
import { liveLogger } from '../utils/logger';
import type { Match, HoleResult, RyderCupSession } from '../types/models';

// ============================================
// TYPES
// ============================================

export interface LiveScoresState {
    matches: Match[];
    holeResults: Map<string, HoleResult[]>;
    sessions: RyderCupSession[];
    isConnected: boolean;
    isLoading: boolean;
    error: string | null;
    lastUpdate: Date | null;
}

export interface UseLiveScoresOptions {
    tripId: string;
    enabled?: boolean;
    onMatchUpdate?: (match: Match, event: ChangeEvent) => void;
    onScoreUpdate?: (result: HoleResult, event: ChangeEvent) => void;
}

// ============================================
// HOOK
// ============================================

export function useLiveScores(options: UseLiveScoresOptions): LiveScoresState & {
    refresh: () => Promise<void>;
} {
    const { tripId, enabled = true, onMatchUpdate, onScoreUpdate } = options;

    const [state, setState] = useState<LiveScoresState>({
        matches: [],
        holeResults: new Map(),
        sessions: [],
        isConnected: false,
        isLoading: true,
        error: null,
        lastUpdate: null,
    });

    const unsubscribeRef = useRef<(() => void) | null>(null);
    const mountedRef = useRef(true);

    // Load initial data from local database
    const loadInitialData = useCallback(async () => {
        if (!mountedRef.current) return;

        setState((prev) => ({ ...prev, isLoading: true, error: null }));

        try {
            // Load sessions for this trip
            const sessions = await db.sessions.where('tripId').equals(tripId).toArray();
            const sessionIds = sessions.map((s) => s.id);

            // Load matches for these sessions
            const matches = await db.matches.where('sessionId').anyOf(sessionIds).toArray();
            const matchIds = matches.map((m) => m.id);

            // Load hole results for these matches
            const allHoleResults = await db.holeResults.where('matchId').anyOf(matchIds).toArray();

            // Group hole results by match
            const holeResultsMap = new Map<string, HoleResult[]>();
            for (const result of allHoleResults) {
                const existing = holeResultsMap.get(result.matchId) || [];
                existing.push(result);
                holeResultsMap.set(result.matchId, existing);
            }

            // Sort hole results by hole number
            for (const [matchId, results] of holeResultsMap) {
                results.sort((a, b) => a.holeNumber - b.holeNumber);
                holeResultsMap.set(matchId, results);
            }

            if (mountedRef.current) {
                setState((prev) => ({
                    ...prev,
                    matches: matches.sort((a, b) => a.matchOrder - b.matchOrder),
                    holeResults: holeResultsMap,
                    sessions: sessions.sort((a, b) => a.sessionNumber - b.sessionNumber),
                    isLoading: false,
                    lastUpdate: new Date(),
                }));
            }
        } catch (err) {
            liveLogger.error('Error loading data:', err);
            if (mountedRef.current) {
                setState((prev) => ({
                    ...prev,
                    isLoading: false,
                    error: err instanceof Error ? err.message : 'Failed to load data',
                }));
            }
        }
    }, [tripId]);

    // Handle live updates
    const handleMatchChange = useCallback(
        (match: Match, event: ChangeEvent) => {
            if (!mountedRef.current) return;

            setState((prev) => {
                let newMatches: Match[];

                if (event === 'DELETE') {
                    newMatches = prev.matches.filter((m) => m.id !== match.id);
                } else {
                    const idx = prev.matches.findIndex((m) => m.id === match.id);
                    if (idx >= 0) {
                        newMatches = [...prev.matches];
                        newMatches[idx] = match;
                    } else {
                        newMatches = [...prev.matches, match];
                    }
                }

                return {
                    ...prev,
                    matches: newMatches.sort((a, b) => a.matchOrder - b.matchOrder),
                    lastUpdate: new Date(),
                };
            });

            onMatchUpdate?.(match, event);
        },
        [onMatchUpdate]
    );

    const handleHoleResultChange = useCallback(
        (result: HoleResult, event: ChangeEvent) => {
            if (!mountedRef.current) return;

            setState((prev) => {
                const newMap = new Map(prev.holeResults);
                const matchResults = newMap.get(result.matchId) || [];

                let updated: HoleResult[];
                if (event === 'DELETE') {
                    updated = matchResults.filter((r) => r.id !== result.id);
                } else {
                    const idx = matchResults.findIndex((r) => r.id === result.id);
                    if (idx >= 0) {
                        updated = [...matchResults];
                        updated[idx] = result;
                    } else {
                        updated = [...matchResults, result];
                    }
                }

                newMap.set(result.matchId, updated.sort((a, b) => a.holeNumber - b.holeNumber));

                return {
                    ...prev,
                    holeResults: newMap,
                    lastUpdate: new Date(),
                };
            });

            onScoreUpdate?.(result, event);
        },
        [onScoreUpdate]
    );

    const handleSessionChange = useCallback((session: RyderCupSession, event: ChangeEvent) => {
        if (!mountedRef.current) return;

        setState((prev) => {
            let newSessions: RyderCupSession[];

            if (event === 'DELETE') {
                newSessions = prev.sessions.filter((s) => s.id !== session.id);
            } else {
                const idx = prev.sessions.findIndex((s) => s.id === session.id);
                if (idx >= 0) {
                    newSessions = [...prev.sessions];
                    newSessions[idx] = session;
                } else {
                    newSessions = [...prev.sessions, session];
                }
            }

            return {
                ...prev,
                sessions: newSessions.sort((a, b) => a.sessionNumber - b.sessionNumber),
                lastUpdate: new Date(),
            };
        });
    }, []);

    const handleConnectionChange = useCallback((connected: boolean) => {
        if (!mountedRef.current) return;
        setState((prev) => ({ ...prev, isConnected: connected }));
    }, []);

    const handleError = useCallback((error: Error) => {
        if (!mountedRef.current) return;
        liveLogger.error('Error:', error);
        setState((prev) => ({ ...prev, error: error.message }));
    }, []);

    // Subscribe to live updates
    useEffect(() => {
        mountedRef.current = true;

        if (!enabled || !tripId) {
            setState((prev) => ({ ...prev, isLoading: false }));
            return;
        }

        // Load initial data
        loadInitialData();

        // Subscribe to live updates
        const callbacks: LiveUpdateCallbacks = {
            onMatchChange: handleMatchChange,
            onHoleResultChange: handleHoleResultChange,
            onSessionChange: handleSessionChange,
            onConnectionChange: handleConnectionChange,
            onError: handleError,
        };

        subscribeLiveUpdates(tripId, callbacks).then((unsubscribe) => {
            if (mountedRef.current) {
                unsubscribeRef.current = unsubscribe;
            } else {
                unsubscribe();
            }
        });

        return () => {
            mountedRef.current = false;
            if (unsubscribeRef.current) {
                unsubscribeRef.current();
                unsubscribeRef.current = null;
            }
            unsubscribeLiveUpdates();
        };
    }, [
        tripId,
        enabled,
        loadInitialData,
        handleMatchChange,
        handleHoleResultChange,
        handleSessionChange,
        handleConnectionChange,
        handleError,
    ]);

    // Manual refresh
    const refresh = useCallback(async () => {
        await loadInitialData();
    }, [loadInitialData]);

    return {
        ...state,
        refresh,
    };
}

// ============================================
// UTILITY HOOK: Single Match
// ============================================

export function useLiveMatch(options: {
    matchId: string;
    tripId: string;
    enabled?: boolean;
}): {
    match: Match | null;
    holeResults: HoleResult[];
    isConnected: boolean;
    isLoading: boolean;
    error: string | null;
} {
    const { matchId, tripId, enabled = true } = options;
    const liveScores = useLiveScores({ tripId, enabled });

    const match = liveScores.matches.find((m) => m.id === matchId) || null;
    const holeResults = liveScores.holeResults.get(matchId) || [];

    return {
        match,
        holeResults,
        isConnected: liveScores.isConnected,
        isLoading: liveScores.isLoading,
        error: liveScores.error,
    };
}

export default useLiveScores;
