/**
 * UI Store
 *
 * Global UI state for navigation, modals, and app-wide settings.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { ScoringPreferences } from '@/lib/types/scoringPreferences';
import { DEFAULT_SCORING_PREFERENCES } from '@/lib/types/scoringPreferences';
import type { SessionType } from '@/lib/types';
import { hashPin, verifyPin, isHashedPin } from '@/lib/utils/crypto';

// ============================================
// TYPES
// ============================================

type Tab = 'score' | 'matchups' | 'standings' | 'more';
type Theme = 'light' | 'dark' | 'outdoor';
type ScoringMode = 'swipe' | 'buttons' | 'strokes' | 'fourball' | 'oneHanded';
type AccentTheme = 'masters' | 'usa' | 'europe';

interface Toast {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  duration?: number;
}

interface Modal {
  type: string;
  props?: Record<string, unknown>;
}

interface UIState {
  // Navigation
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;

  // Theme
  theme: Theme;
  isDarkMode: boolean;
  setTheme: (theme: Theme) => void;
  toggleDarkMode: () => void;
  autoTheme: boolean;
  setAutoTheme: (enabled: boolean) => void;
  accentTheme: AccentTheme;
  setAccentTheme: (theme: AccentTheme) => void;

  // Captain Mode
  isCaptainMode: boolean;
  captainPinHash: string | null;
  enableCaptainMode: (pin: string) => Promise<void>;
  disableCaptainMode: () => void;
  resetCaptainPin: () => void;

  // Admin Mode (power user features)
  isAdminMode: boolean;
  adminPinHash: string | null;
  enableAdminMode: (pin: string) => Promise<void>;
  disableAdminMode: () => void;

  // Toasts
  toasts: Toast[];
  showToast: (type: Toast['type'], message: string, duration?: number) => void;
  dismissToast: (id: string) => void;
  clearToasts: () => void;

  // Modals
  activeModal: Modal | null;
  openModal: (type: string, props?: Record<string, unknown>) => void;
  closeModal: () => void;

  // Offline status
  isOnline: boolean;
  setOnlineStatus: (isOnline: boolean) => void;

  // Loading overlay
  isGlobalLoading: boolean;
  globalLoadingMessage: string | null;
  showGlobalLoading: (message?: string) => void;
  hideGlobalLoading: () => void;

  // Enhanced Scoring UI preferences (P2.3)
  scoringPreferences: ScoringPreferences;
  updateScoringPreference: <K extends keyof ScoringPreferences>(
    key: K,
    value: ScoringPreferences[K]
  ) => void;
  resetScoringPreferences: () => void;

  // Power user: Scoring mode per format (persisted)
  scoringModeByFormat: Record<string, ScoringMode>;
  getScoringModeForFormat: (format: SessionType) => ScoringMode;
  setScoringModeForFormat: (format: SessionType, mode: ScoringMode) => void;
}

// ============================================
// STORE
// ============================================

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      // Navigation
      activeTab: 'score',
      setActiveTab: (tab) => set({ activeTab: tab }),

      // Theme (default to outdoor for better visibility on the course)
      theme: 'outdoor' as Theme,
      isDarkMode: false,
      autoTheme: false,
      accentTheme: 'masters',

      setTheme: (theme: Theme) => {
        set({ theme, isDarkMode: theme === 'dark' });

        // Update document classes
        if (typeof document !== 'undefined') {
          document.documentElement.classList.remove('dark', 'outdoor');
          if (theme === 'dark') {
            document.documentElement.classList.add('dark');
          } else if (theme === 'outdoor') {
            document.documentElement.classList.add('outdoor');
          }
        }
      },

      toggleDarkMode: () => {
        const currentTheme = get().theme;
        const newTheme = currentTheme === 'dark' ? 'outdoor' : 'dark';
        get().setTheme(newTheme);
      },

      setAutoTheme: (enabled) => {
        set({ autoTheme: enabled });
      },

      setAccentTheme: (theme) => {
        set({ accentTheme: theme });
      },

      // Captain Mode
      isCaptainMode: false,
      captainPinHash: null,

      enableCaptainMode: async (pin) => {
        const current = get().captainPinHash;

        // If a PIN is already set, require verification before enabling.
        if (current) {
          const ok = await verifyPin(pin, current);
          if (!ok) {
            throw new Error('Incorrect PIN');
          }
        }

        // If the stored PIN is legacy (plain/sha), upgrade it.
        const nextHash = current && isHashedPin(current) && current.startsWith('pbkdf2$') ? current : await hashPin(pin);

        set({
          isCaptainMode: true,
          captainPinHash: nextHash,
        });

        get().showToast('success', 'Captain Mode enabled');
      },

      disableCaptainMode: () => {
        set({
          isCaptainMode: false,
        });

        get().showToast('info', 'Captain Mode disabled');
      },

      resetCaptainPin: () => {
        set({
          captainPinHash: null,
          isCaptainMode: false,
        });
        get().showToast(
          'info',
          'Captain PIN has been reset. Set a new PIN to re-enable Captain Mode.'
        );
      },

      // Admin Mode (power user features like bulk delete, data management)
      isAdminMode: false,
      adminPinHash: null,

      enableAdminMode: async (pin) => {
        const current = get().adminPinHash;

        if (current) {
          const ok = await verifyPin(pin, current);
          if (!ok) throw new Error('Incorrect PIN');
        }

        const nextHash = current && isHashedPin(current) && current.startsWith('pbkdf2$') ? current : await hashPin(pin);

        set({
          isAdminMode: true,
          adminPinHash: nextHash,
        });
        get().showToast('success', 'Admin Mode enabled');
      },

      disableAdminMode: () => {
        set({
          isAdminMode: false,
        });
        get().showToast('info', 'Admin Mode disabled');
      },

      // Toasts
      toasts: [],

      showToast: (type, message, duration = 3000) => {
        const id = crypto.randomUUID();
        const toast: Toast = { id, type, message, duration };

        set((state) => ({
          toasts: [...state.toasts, toast],
        }));

        // Auto-dismiss
        if (duration > 0) {
          setTimeout(() => {
            get().dismissToast(id);
          }, duration);
        }
      },

      dismissToast: (id) => {
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id),
        }));
      },

      clearToasts: () => {
        set({ toasts: [] });
      },

      // Modals
      activeModal: null,

      openModal: (type, props) => {
        set({ activeModal: { type, props } });
      },

      closeModal: () => {
        set({ activeModal: null });
      },

      // Offline status
      isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,

      setOnlineStatus: (isOnline) => {
        const wasOnline = get().isOnline;
        set({ isOnline });

        // Show toast on status change
        if (wasOnline && !isOnline) {
          get().showToast('warning', 'You are offline. Scores will sync when reconnected.', 5000);
        } else if (!wasOnline && isOnline) {
          get().showToast('success', 'Back online! Syncing scores...', 3000);
        }
      },

      // Global loading
      isGlobalLoading: false,
      globalLoadingMessage: null,

      showGlobalLoading: (message) => {
        set({
          isGlobalLoading: true,
          globalLoadingMessage: message || null,
        });
      },

      hideGlobalLoading: () => {
        set({
          isGlobalLoading: false,
          globalLoadingMessage: null,
        });
      },

      // Enhanced Scoring preferences (P2.3)
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

      // Power user: Scoring mode per format (persisted)
      scoringModeByFormat: {
        fourball: 'fourball',
        foursomes: 'swipe',
        singles: 'swipe',
      } as Record<string, ScoringMode>,

      getScoringModeForFormat: (format: SessionType) => {
        const { scoringModeByFormat, scoringPreferences } = get();
        // One-handed mode takes precedence if enabled
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
      name: 'golf-ui-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // Persist these settings
        theme: state.theme,
        isDarkMode: state.isDarkMode,
        isCaptainMode: state.isCaptainMode,
        captainPinHash: state.captainPinHash,
        isAdminMode: state.isAdminMode,
        adminPinHash: state.adminPinHash,
        scoringPreferences: state.scoringPreferences,
        scoringModeByFormat: state.scoringModeByFormat,
      }),
    }
  )
);

export default useUIStore;
