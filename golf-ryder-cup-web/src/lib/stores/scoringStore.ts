/**
 * Scoring Store
 *
 * State management for active scoring sessions.
 * Handles match scoring, undo stack, and optimistic updates.
 *
 * Integrates with cloud sync for real-time score updates.
 */

import { create } from 'zustand';
import type {
    Match,
    HoleResult,
    HoleWinner,
    RyderCupSession,
} from '../types/models';
import type { MatchState } from '../types/computed';
import { db } from '../db';
import {
    calculateMatchState,
    recordHoleResult,
    undoLastScore,
    getCurrentHole,
} from '../services/scoringEngine';
import { ScoringEventType } from '../types/events';
import { queueSyncOperation } from '../services/tripSyncService';

// ============================================
// TYPES
// ============================================

interface ScoringState {
    // Active scoring context
    activeMatch: Match | null;
    activeMatchState: MatchState | null;
    activeSession: RyderCupSession | null; // P0-6: Track session for lock status
    currentHole: number;

    // All matches for current session
    sessionMatches: Match[];
    matchStates: Map<string, MatchState>;

    // UI state
    isLoading: boolean;
    isSaving: boolean;
    error: string | null;
    lastSavedAt: Date | null;

    // Undo stack (for optimistic updates)
    undoStack: Array<{
        matchId: string;
        holeNumber: number;
        previousResult: HoleResult | null;
    }>;

    // P0-6: Session lock helpers
    isSessionLocked: () => boolean;

    // Actions
    loadSessionMatches: (sessionId: string) => Promise<void>;
    selectMatch: (matchId: string) => Promise<void>;
    clearActiveMatch: () => void;

    // Scoring actions
    scoreHole: (winner: HoleWinner, teamAScore?: number, teamBScore?: number) => Promise<void>;
    undoLastHole: () => Promise<void>;
    goToHole: (holeNumber: number) => void;
    nextHole: () => void;
    prevHole: () => void;

    // Batch operations
    refreshMatchState: (matchId: string) => Promise<void>;
    refreshAllMatchStates: () => Promise<void>;
}

// ============================================
// STORE
// ============================================

export const useScoringStore = create<ScoringState>((set, get) => ({
    // Initial state
    activeMatch: null,
    activeMatchState: null,
    activeSession: null,
    currentHole: 1,
    sessionMatches: [],
    matchStates: new Map(),
    isLoading: false,
    isSaving: false,
    error: null,
    lastSavedAt: null,
    undoStack: [],

    // P0-6: Check if session is locked
    isSessionLocked: () => {
        return get().activeSession?.isLocked ?? false;
    },

    // Load all matches for a session
    loadSessionMatches: async (sessionId: string) => {
        set({ isLoading: true, error: null });

        try {
            const matches = await db.matches
                .where('sessionId')
                .equals(sessionId)
                .sortBy('matchNumber');

            // Load all hole results
            const matchIds = matches.map(m => m.id);
            const allResults = await db.holeResults
                .where('matchId')
                .anyOf(matchIds)
                .toArray();

            // Group by match
            const resultsByMatch = new Map<string, HoleResult[]>();
            for (const result of allResults) {
                const existing = resultsByMatch.get(result.matchId) || [];
                existing.push(result);
                resultsByMatch.set(result.matchId, existing);
            }

            // Calculate states
            const matchStates = new Map<string, MatchState>();
            for (const match of matches) {
                const results = resultsByMatch.get(match.id) || [];
                const state = calculateMatchState(match, results);
                matchStates.set(match.id, state);
            }

            set({
                sessionMatches: matches,
                matchStates,
                isLoading: false,
            });
        } catch (error) {
            set({
                error: error instanceof Error ? error.message : 'Failed to load matches',
                isLoading: false,
            });
        }
    },

    // Select a match for active scoring
    selectMatch: async (matchId: string) => {
        set({ isLoading: true, error: null });

        try {
            const match = await db.matches.get(matchId);
            if (!match) {
                throw new Error('Match not found');
            }

            // P0-6: Load session for lock status
            const session = await db.sessions.get(match.sessionId);

            const holeResults = await db.holeResults
                .where('matchId')
                .equals(matchId)
                .toArray();

            const matchState = calculateMatchState(match, holeResults);
            const nextHole = await getCurrentHole(matchId);

            // Reconstruct undo stack from persisted scoring events
            // BUG-001 FIX: Track state chronologically through events instead of
            // looking up current holeResults (which have already been modified)
            const scoringEvents = await db.scoringEvents
                .where('matchId')
                .equals(matchId)
                .sortBy('timestamp');

            // Build undo stack by tracking state changes through events chronologically
            const undoStack: Array<{
                matchId: string;
                holeNumber: number;
                previousResult: HoleResult | null;
            }> = [];

            // Track the state of each hole as we replay events
            const holeStateMap = new Map<number, HoleResult | null>();

            for (const event of scoringEvents) {
                if (event.eventType === ScoringEventType.HoleScored) {
                    const payload = event.payload as {
                        holeNumber: number;
                        winner: HoleWinner;
                        teamAStrokes?: number;
                        teamBStrokes?: number;
                    };
                    // For a new score, the previous state was null (no result)
                    undoStack.push({
                        matchId: event.matchId,
                        holeNumber: payload.holeNumber,
                        previousResult: holeStateMap.get(payload.holeNumber) ?? null,
                    });
                    // Update tracked state
                    holeStateMap.set(payload.holeNumber, {
                        id: '', // Not needed for undo
                        matchId: event.matchId,
                        holeNumber: payload.holeNumber,
                        winner: payload.winner,
                        teamAScore: payload.teamAStrokes,
                        teamBScore: payload.teamBStrokes,
                        timestamp: event.timestamp,
                    });
                } else if (event.eventType === ScoringEventType.HoleEdited) {
                    const payload = event.payload as {
                        holeNumber: number;
                        previousWinner: HoleWinner;
                        newWinner: HoleWinner;
                        previousTeamAStrokes?: number;
                        previousTeamBStrokes?: number;
                        newTeamAStrokes?: number;
                        newTeamBStrokes?: number;
                    };
                    // Store the ACTUAL previous state from the event payload
                    undoStack.push({
                        matchId: event.matchId,
                        holeNumber: payload.holeNumber,
                        previousResult: {
                            id: '', // Not needed for undo
                            matchId: event.matchId,
                            holeNumber: payload.holeNumber,
                            winner: payload.previousWinner,
                            teamAScore: payload.previousTeamAStrokes,
                            teamBScore: payload.previousTeamBStrokes,
                            timestamp: event.timestamp,
                        },
                    });
                    // Update tracked state with new values
                    holeStateMap.set(payload.holeNumber, {
                        id: '',
                        matchId: event.matchId,
                        holeNumber: payload.holeNumber,
                        winner: payload.newWinner,
                        teamAScore: payload.newTeamAStrokes,
                        teamBScore: payload.newTeamBStrokes,
                        timestamp: event.timestamp,
                    });
                } else if (event.eventType === ScoringEventType.HoleUndone) {
                    // An undo event means we should pop from the stack and revert state
                    const popped = undoStack.pop();
                    if (popped) {
                        if (popped.previousResult) {
                            holeStateMap.set(popped.holeNumber, popped.previousResult);
                        } else {
                            holeStateMap.delete(popped.holeNumber);
                        }
                    }
                }
            }

            set({
                activeMatch: match,
                activeMatchState: matchState,
                activeSession: session || null,
                currentHole: nextHole || 18, // Default to 18 if complete
                isLoading: false,
                undoStack,
            });
        } catch (error) {
            set({
                error: error instanceof Error ? error.message : 'Failed to load match',
                isLoading: false,
            });
        }
    },

    clearActiveMatch: () => {
        set({
            activeMatch: null,
            activeMatchState: null,
            activeSession: null,
            currentHole: 1,
            undoStack: [],
        });
    },

    // Score a hole
    scoreHole: async (winner: HoleWinner, teamAScore?: number, teamBScore?: number) => {
        const { activeMatch, currentHole, isSessionLocked } = get();
        if (!activeMatch) return;

        // P0-6: Block scoring if session is locked
        if (isSessionLocked()) {
            set({ error: 'Session is finalized. Unlock to make changes.' });
            return;
        }

        set({ isSaving: true, error: null });

        try {
            // Get previous result for undo stack
            const previousResult = await db.holeResults
                .where({ matchId: activeMatch.id, holeNumber: currentHole })
                .first() || null;

            // Record the hole result
            await recordHoleResult(
                activeMatch.id,
                currentHole,
                winner,
                teamAScore,
                teamBScore
            );

            // Refresh match state
            const holeResults = await db.holeResults
                .where('matchId')
                .equals(activeMatch.id)
                .toArray();

            const newMatchState = calculateMatchState(activeMatch, holeResults);

            // Get the latest hole result for cloud sync
            const latestResult = holeResults.find(r => r.holeNumber === currentHole);
            if (latestResult) {
                // Get session to find trip ID
                const session = await db.sessions.get(activeMatch.sessionId);
                if (session) {
                    queueSyncOperation('holeResult', latestResult.id, 'update', session.tripId, latestResult);
                    // Calculate fields from match state for syncing
                    const matchToSync = {
                        ...activeMatch,
                        currentHole: Math.min(currentHole + 1, 18),
                        result: newMatchState.isClosedOut
                            ? (newMatchState.winningTeam === 'teamA' ? 'teamAWin' : 'teamBWin')
                            : 'notFinished',
                        margin: Math.abs(newMatchState.currentScore),
                        holesRemaining: newMatchState.holesRemaining,
                        updatedAt: new Date().toISOString(),
                    };
                    queueSyncOperation('match', activeMatch.id, 'update', session.tripId, matchToSync);

                    // BUG-007 FIX: Persist match status to local database (not just sync queue)
                    // Update local match record with new status when closeout occurs
                    if (newMatchState.isClosedOut || newMatchState.holesRemaining === 0) {
                        await db.matches.update(activeMatch.id, {
                            status: 'completed' as const,
                            result: matchToSync.result,
                            margin: matchToSync.margin,
                            holesRemaining: matchToSync.holesRemaining,
                            updatedAt: matchToSync.updatedAt,
                        });
                    }
                }
            }

            // Update undo stack
            const undoStack = [
                ...get().undoStack,
                { matchId: activeMatch.id, holeNumber: currentHole, previousResult },
            ];

            // Auto-advance to next hole if not closed out
            const nextHole = newMatchState.isClosedOut
                ? currentHole
                : Math.min(currentHole + 1, 18);

            // Update session match states too
            const matchStates = new Map(get().matchStates);
            matchStates.set(activeMatch.id, newMatchState);

            set({
                activeMatchState: newMatchState,
                currentHole: nextHole,
                undoStack,
                matchStates,
                isSaving: false,
                lastSavedAt: new Date(),
            });
        } catch (error) {
            set({
                error: error instanceof Error ? error.message : 'Failed to save score',
                isSaving: false,
            });
        }
    },

    // Undo the last scoring action
    undoLastHole: async () => {
        const { activeMatch, undoStack, isSessionLocked } = get();
        if (!activeMatch || undoStack.length === 0) return;

        // P0-6: Block undo if session is locked
        if (isSessionLocked()) {
            set({ error: 'Session is finalized. Unlock to make changes.' });
            return;
        }

        set({ isSaving: true, error: null });

        try {
            const success = await undoLastScore(activeMatch.id);

            if (success) {
                // Refresh match state
                const holeResults = await db.holeResults
                    .where('matchId')
                    .equals(activeMatch.id)
                    .toArray();

                const newMatchState = calculateMatchState(activeMatch, holeResults);

                // Pop from undo stack and go back to that hole
                const lastUndo = undoStack[undoStack.length - 1];
                const newUndoStack = undoStack.slice(0, -1);

                const matchStates = new Map(get().matchStates);
                matchStates.set(activeMatch.id, newMatchState);

                set({
                    activeMatchState: newMatchState,
                    currentHole: lastUndo.holeNumber,
                    undoStack: newUndoStack,
                    matchStates,
                    isSaving: false,
                });
            } else {
                set({ isSaving: false });
            }
        } catch (error) {
            set({
                error: error instanceof Error ? error.message : 'Failed to undo',
                isSaving: false,
            });
        }
    },

    // Hole navigation
    goToHole: (holeNumber: number) => {
        if (holeNumber >= 1 && holeNumber <= 18) {
            set({ currentHole: holeNumber });
        }
    },

    nextHole: () => {
        const { currentHole } = get();
        if (currentHole < 18) {
            set({ currentHole: currentHole + 1 });
        }
    },

    prevHole: () => {
        const { currentHole } = get();
        if (currentHole > 1) {
            set({ currentHole: currentHole - 1 });
        }
    },

    // Refresh a single match state
    refreshMatchState: async (matchId: string) => {
        const match = await db.matches.get(matchId);
        if (!match) return;

        const holeResults = await db.holeResults
            .where('matchId')
            .equals(matchId)
            .toArray();

        const newState = calculateMatchState(match, holeResults);

        const matchStates = new Map(get().matchStates);
        matchStates.set(matchId, newState);

        set({ matchStates });

        // Update active match state if this is the active match
        if (get().activeMatch?.id === matchId) {
            set({ activeMatchState: newState });
        }
    },

    // Refresh all match states
    refreshAllMatchStates: async () => {
        const { sessionMatches } = get();
        if (sessionMatches.length === 0) return;

        const matchIds = sessionMatches.map(m => m.id);
        const allResults = await db.holeResults
            .where('matchId')
            .anyOf(matchIds)
            .toArray();

        const resultsByMatch = new Map<string, HoleResult[]>();
        for (const result of allResults) {
            const existing = resultsByMatch.get(result.matchId) || [];
            existing.push(result);
            resultsByMatch.set(result.matchId, existing);
        }

        const matchStates = new Map<string, MatchState>();
        for (const match of sessionMatches) {
            const results = resultsByMatch.get(match.id) || [];
            const state = calculateMatchState(match, results);
            matchStates.set(match.id, state);
        }

        set({ matchStates });

        // Update active match state if applicable
        const { activeMatch } = get();
        if (activeMatch && matchStates.has(activeMatch.id)) {
            set({ activeMatchState: matchStates.get(activeMatch.id)! });
        }
    },
}));

export default useScoringStore;
