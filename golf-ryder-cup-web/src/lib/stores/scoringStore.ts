/**
 * Scoring Store
 *
 * State management for active scoring sessions.
 * Handles match scoring, undo stack, and optimistic updates.
 *
 * Integrates with cloud sync for real-time score updates.
 */

import { create } from 'zustand';
import { persist, devtools } from 'zustand/middleware';
import { db } from '@/lib/db';

// ============================================
// TYPES
// ============================================

type ScoreValue = number | null;

interface ScoreEntry {
  playerId: string;
  hole: number;
  score: ScoreValue;
  timestamp: number;
}

interface ScoringState {
  // Active match
  activeMatchId: string | null;

  // Scores: { [playerId]: { [hole]: score } }
  scores: Record<string, Record<number, ScoreValue>>;

  // Undo stack
  undoStack: ScoreEntry[];

  // Sync state
  isSyncing: boolean;
  lastSyncTime: Date | null;
  syncError: string | null;
  pendingSync: ScoreEntry[];

  // Actions
  initMatch: (matchId: string) => Promise<void>;
  updateScore: (playerId: string, hole: number, score: ScoreValue) => void;
  undoLastScore: () => void;
  submitScores: (matchId: string) => Promise<void>;
  resetMatch: (matchId: string) => void;
  syncPendingScores: () => Promise<void>;
}

// ============================================
// STORE
// ============================================

export const useScoringStore = create<ScoringState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        activeMatchId: null,
        scores: {},
        undoStack: [],
        isSyncing: false,
        lastSyncTime: null,
        syncError: null,
        pendingSync: [],

        // ----------------------------------------
        // INIT MATCH
        // ----------------------------------------

        initMatch: async (matchId: string) => {
          try {
            // Load existing scores from DB
            const existingScores = await db.scoreEntries
              .where('matchId')
              .equals(matchId)
              .toArray();

            const scoresMap: Record<string, Record<number, ScoreValue>> = {};

            existingScores.forEach((entry) => {
              if (!scoresMap[entry.playerId]) {
                scoresMap[entry.playerId] = {};
              }
              scoresMap[entry.playerId][entry.hole] = entry.score;
            });

            set({
              activeMatchId: matchId,
              scores: scoresMap,
              undoStack: [],
              syncError: null,
            });
          } catch (error) {
            console.error('Failed to init match:', error);
            set({ activeMatchId: matchId, scores: {}, undoStack: [] });
          }
        },

        // ----------------------------------------
        // UPDATE SCORE
        // ----------------------------------------

        updateScore: (playerId: string, hole: number, score: ScoreValue) => {
          const state = get();

          // Save previous score to undo stack
          const previousScore = state.scores[playerId]?.[hole] ?? null;
          const undoEntry: ScoreEntry = {
            playerId,
            hole,
            score: previousScore,
            timestamp: Date.now(),
          };

          // Update scores optimistically
          const newScores = {
            ...state.scores,
            [playerId]: {
              ...(state.scores[playerId] || {}),
              [hole]: score,
            },
          };

          set({
            scores: newScores,
            undoStack: [...state.undoStack.slice(-19), undoEntry], // Keep last 20
          });

          // Persist to local DB
          if (state.activeMatchId) {
            db.scoreEntries
              .put({
                matchId: state.activeMatchId,
                playerId,
                hole,
                score,
                timestamp: Date.now(),
                synced: false,
              })
              .catch((err) => console.error('Failed to persist score:', err));

            // Queue for sync
            set((s) => ({
              pendingSync: [
                ...s.pendingSync,
                { playerId, hole, score, timestamp: Date.now() },
              ],
            }));
          }
        },

        // ----------------------------------------
        // UNDO
        // ----------------------------------------

        undoLastScore: () => {
          const state = get();
          if (state.undoStack.length === 0) return;

          const lastEntry = state.undoStack[state.undoStack.length - 1];
          const newUndoStack = state.undoStack.slice(0, -1);

          const newScores = {
            ...state.scores,
            [lastEntry.playerId]: {
              ...(state.scores[lastEntry.playerId] || {}),
              [lastEntry.hole]: lastEntry.score,
            },
          };

          set({
            scores: newScores,
            undoStack: newUndoStack,
          });

          // Persist undo to DB
          if (state.activeMatchId) {
            db.scoreEntries
              .put({
                matchId: state.activeMatchId,
                playerId: lastEntry.playerId,
                hole: lastEntry.hole,
                score: lastEntry.score,
                timestamp: Date.now(),
                synced: false,
              })
              .catch((err) => console.error('Failed to persist undo:', err));
          }
        },

        // ----------------------------------------
        // SUBMIT SCORES
        // ----------------------------------------

        submitScores: async (matchId: string) => {
          set({ isSyncing: true, syncError: null });

          try {
            const state = get();
            const payload = {
              matchId,
              scores: state.scores,
              submittedAt: new Date().toISOString(),
            };

            const response = await fetch('/api/sync/scores', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            });

            if (!response.ok) {
              const error = await response.json();
              throw new Error(error.message || 'Failed to submit scores');
            }

            // Mark all local scores as synced
            await db.scoreEntries
              .where('matchId')
              .equals(matchId)
              .modify({ synced: true });

            // Update match status
            await db.matches.update(matchId, { status: 'complete' });

            set({
              isSyncing: false,
              lastSyncTime: new Date(),
              pendingSync: [],
              syncError: null,
            });
          } catch (error) {
            set({
              isSyncing: false,
              syncError: error instanceof Error ? error.message : 'Sync failed',
            });
            throw error;
          }
        },

        // ----------------------------------------
        // RESET
        // ----------------------------------------

        resetMatch: (matchId: string) => {
          // Clear local DB
          db.scoreEntries
            .where('matchId')
            .equals(matchId)
            .delete()
            .catch((err) => console.error('Failed to reset scores:', err));

          set({
            activeMatchId: null,
            scores: {},
            undoStack: [],
            pendingSync: [],
            syncError: null,
          });
        },

        // ----------------------------------------
        // BACKGROUND SYNC
        // ----------------------------------------

        syncPendingScores: async () => {
          const state = get();
          if (state.pendingSync.length === 0 || state.isSyncing) return;

          set({ isSyncing: true, syncError: null });

          try {
            const response = await fetch('/api/sync/scores', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                matchId: state.activeMatchId,
                scores: state.scores,
                pendingEntries: state.pendingSync,
              }),
            });

            if (!response.ok) throw new Error('Sync failed');

            set({
              isSyncing: false,
              lastSyncTime: new Date(),
              pendingSync: [],
              syncError: null,
            });
          } catch (error) {
            set({
              isSyncing: false,
              syncError: error instanceof Error ? error.message : 'Sync failed',
            });
          }
        },
      }),
      {
        name: 'scoring-store',
        // Only persist scores and undo stack, not sync state
        partialize: (state) => ({
          activeMatchId: state.activeMatchId,
          scores: state.scores,
          undoStack: state.undoStack,
        }),
      }
    ),
    { name: 'ScoringStore' }
  )
);
