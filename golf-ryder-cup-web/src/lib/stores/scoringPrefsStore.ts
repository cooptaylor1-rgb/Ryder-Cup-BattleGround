/**
 * Scoring Preferences Store
 *
 * Manages scoring UI preferences and per-format scoring mode selection.
 * Persisted to localStorage.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { ScoringPreferences } from '@/lib/types/scoringPreferences';
import { DEFAULT_SCORING_PREFERENCES } from '@/lib/types/scoringPreferences';
import type { SessionType } from '@/lib/types';

// ============================================
// TYPES
// ============================================

type ScoringMode = 'swipe' | 'buttons' | 'strokes' | 'fourball' | 'oneHanded';

interface ScoringPrefsState {
  scoringPreferences: ScoringPreferences;
  updateScoringPreference: <K extends keyof ScoringPreferences>(
    key: K,
    value: ScoringPreferences[K],
  ) => void;
  resetScoringPreferences: () => void;

  scoringModeByFormat: Record<string, ScoringMode>;
  getScoringModeForFormat: (format: SessionType) => ScoringMode;
  setScoringModeForFormat: (format: SessionType, mode: ScoringMode) => void;
}

// ============================================
// STORE
// ============================================

export const useScoringPrefsStore = create<ScoringPrefsState>()(
  persist(
    (set, get) => ({
      scoringPreferences: DEFAULT_SCORING_PREFERENCES,

      updateScoringPreference: (key, value) => {
        set((state) => ({
          scoringPreferences: {
            ...state.scoringPreferences,
            [key]: value,
          },
        }));
      },

      resetScoringPreferences: () => {
        set({ scoringPreferences: DEFAULT_SCORING_PREFERENCES });
      },

      scoringModeByFormat: {
        fourball: 'fourball',
        foursomes: 'swipe',
        singles: 'swipe',
      } as Record<string, ScoringMode>,

      getScoringModeForFormat: (format: SessionType) => {
        const { scoringModeByFormat, scoringPreferences } = get();
        if (scoringPreferences.oneHandedMode) return 'oneHanded';
        return scoringModeByFormat[format] || 'swipe';
      },

      setScoringModeForFormat: (format: SessionType, mode: ScoringMode) => {
        set((state) => ({
          scoringModeByFormat: {
            ...state.scoringModeByFormat,
            [format]: mode,
          },
        }));
      },
    }),
    {
      name: 'golf-scoring-prefs-storage',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
