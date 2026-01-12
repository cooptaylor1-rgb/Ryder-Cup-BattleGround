/**
 * Scoring Store
 *
 * State management for active scoring sessions.
 * Handles match scoring, undo stack, and optimistic updates.
 */

import { create } from 'zustand';
import type {
    Match,
    HoleResult,
    HoleWinner,
} from '../types/models';
import type { MatchState } from '../types/computed';
import { db } from '../db';
import {
    calculateMatchState,
    recordHoleResult,
    undoLastScore,
    getCurrentHole,
} from '../services/scoringEngine';

// ============================================
// TYPES
// ============================================

interface ScoringState {
    // Active scoring context
    activeMatch: Match | null;
    activeMatchState: MatchState | null;
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
    currentHole: 1,
    sessionMatches: [],
    matchStates: new Map(),
    isLoading: false,
    isSaving: false,
    error: null,
    lastSavedAt: null,
    undoStack: [],

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

            const holeResults = await db.holeResults
                .where('matchId')
                .equals(matchId)
                .toArray();

            const matchState = calculateMatchState(match, holeResults);
            const nextHole = await getCurrentHole(matchId);

            set({
                activeMatch: match,
                activeMatchState: matchState,
                currentHole: nextHole || 18, // Default to 18 if complete
                isLoading: false,
                undoStack: [],
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
            currentHole: 1,
            undoStack: [],
        });
    },

    // Score a hole
    scoreHole: async (winner: HoleWinner, teamAScore?: number, teamBScore?: number) => {
        const { activeMatch, currentHole } = get();
        if (!activeMatch) return;

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
        const { activeMatch, undoStack } = get();
        if (!activeMatch || undoStack.length === 0) return;

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
