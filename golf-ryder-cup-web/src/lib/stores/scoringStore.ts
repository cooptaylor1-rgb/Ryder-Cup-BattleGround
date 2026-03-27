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
    HoleWinner,
    RyderCupSession,
    PlayerHoleScore,
} from '../types/models';
import type { MatchState } from '../types/computed';
import { db } from '../db';
import { trackSyncFailure, createCorrelationId } from '../services/analyticsService';
import { calculateMatchState } from '../services/scoringEngine';
import { handleError } from '../utils/errorHandling';
import { loadSelectedMatchData, loadSessionMatchesData } from './scoring-store/scoringStoreLoaders';
import { scoreActiveHoleData, undoLastHoleData } from './scoring-store/scoringStoreMutations';
import {
    refreshAllMatchStatesData,
    refreshSingleMatchStateData,
} from './scoring-store/scoringStoreRefresh';
import type { UndoEntry } from './scoring-store/scoringStoreTypes';

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
        previousResult: UndoEntry['previousResult'];
    }>;

    // P0-6: Session lock helpers
    isSessionLocked: () => boolean;

    // Actions
    loadSessionMatches: (sessionId: string) => Promise<void>;
    selectMatch: (matchId: string) => Promise<void>;
    clearActiveMatch: () => void;

    // Scoring actions
    scoreHole: (
        winner: HoleWinner,
        teamAScore?: number,
        teamBScore?: number,
        teamAPlayerScores?: PlayerHoleScore[],
        teamBPlayerScores?: PlayerHoleScore[],
        options?: { advanceHole?: boolean }
    ) => Promise<void>;
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
            const { sessionMatches, matchStates } = await loadSessionMatchesData(sessionId);

            set({
                sessionMatches,
                matchStates,
                isLoading: false,
            });
        } catch (error) {
            const appError = handleError(error, { action: 'loadSessionMatches' }, { severity: 'medium', reportToSentry: false });
            set({
                error: appError.userMessage,
                isLoading: false,
            });
        }
    },

    // Select a match for active scoring
    selectMatch: async (matchId: string) => {
        set({ isLoading: true, error: null });

        try {
            const { activeMatch, activeMatchState, activeSession, currentHole, undoStack } =
                await loadSelectedMatchData(matchId);

            set({
                activeMatch,
                activeMatchState,
                activeSession,
                currentHole,
                isLoading: false,
                undoStack,
            });
        } catch (error) {
            const appError = handleError(error, { action: 'selectMatch', matchId }, { severity: 'medium', reportToSentry: false });
            set({
                error: appError.userMessage,
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
    scoreHole: async (
        winner: HoleWinner,
        teamAScore?: number,
        teamBScore?: number,
        teamAPlayerScores?: PlayerHoleScore[],
        teamBPlayerScores?: PlayerHoleScore[],
        options?: { advanceHole?: boolean }
    ) => {
        const { activeMatch, currentHole, isSessionLocked } = get();
        if (!activeMatch) return;

        // P0-6: Block scoring if session is locked
        if (isSessionLocked()) {
            set({ error: 'Session is finalized. Unlock to make changes.' });
            return;
        }

        set({ isSaving: true, error: null });

        try {
            const scoringResult = await scoreActiveHoleData({
                activeMatch,
                currentHole,
                previousMatchState: get().activeMatchState,
                undoStack: get().undoStack,
                matchStates: get().matchStates,
                sessionMatches: get().sessionMatches,
                winner,
                teamAScore,
                teamBScore,
                teamAPlayerScores,
                teamBPlayerScores,
                options,
            });

            set({
                activeMatch: scoringResult.activeMatch,
                activeMatchState: scoringResult.activeMatchState,
                currentHole: scoringResult.currentHole,
                undoStack: scoringResult.undoStack,
                matchStates: scoringResult.matchStates,
                isSaving: false,
                lastSavedAt: scoringResult.lastSavedAt,
            });
        } catch (error) {
            const appError = handleError(error, { action: 'scoreActiveHole', matchId: activeMatch.id }, { severity: 'high' });
            trackSyncFailure({
                area: 'sync_queue',
                operation: 'score_hole',
                matchId: activeMatch.id,
                reason: appError.message,
                correlationId: createCorrelationId('score-op'),
            });

            set({
                error: appError.userMessage,
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
            const undoResult = await undoLastHoleData({
                activeMatch,
                undoStack,
                matchStates: get().matchStates,
            });

            if (!undoResult) {
                set({ isSaving: false });
                return;
            }

            set({
                activeMatch: undoResult.activeMatch,
                activeMatchState: undoResult.activeMatchState,
                currentHole: undoResult.currentHole,
                undoStack: undoResult.undoStack,
                matchStates: undoResult.matchStates,
                isSaving: false,
            });
        } catch (error) {
            const appError = handleError(error, { action: 'undoLastHole' }, { severity: 'medium', reportToSentry: false });
            set({
                error: appError.userMessage,
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
        const refreshResult = await refreshSingleMatchStateData(matchId, get().matchStates);

        if (get().activeMatch?.id === matchId) {
            set({
                activeMatch: refreshResult.activeMatch,
                activeMatchState: refreshResult.activeMatchState,
                matchStates: refreshResult.matchStates,
            });
            return;
        }

        set({ matchStates: refreshResult.matchStates });
    },

    // Refresh all match states
    refreshAllMatchStates: async () => {
        const { sessionMatches, activeMatch } = get();
        if (sessionMatches.length === 0) return;

        const refreshResult = await refreshAllMatchStatesData(
            sessionMatches,
            activeMatch?.id ?? null
        );

        set({
            activeMatch: refreshResult.activeMatch ?? activeMatch,
            activeMatchState: refreshResult.activeMatchState,
            matchStates: refreshResult.matchStates,
        });
    },
}));

export default useScoringStore;
