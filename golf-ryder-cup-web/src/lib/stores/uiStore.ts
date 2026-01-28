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

// ============================================
// TYPES
// ============================================

type Tab = 'score' | 'matchups' | 'standings' | 'more';
type Theme = 'light' | 'dark' | 'outdoor';
type ScoringMode = 'swipe' | 'buttons' | 'strokes' | 'fourball' | 'oneHanded';

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

  // Captain Mode
  isCaptainMode: boolean;
  captainPin: string | null;
  enableCaptainMode: (pin: string) => void;
  disableCaptainMode: () => void;
  verifyCaptainPin: (pin: string) => boolean;
  resetCaptainPin: () => void;

  // Admin Mode (power user features)
  isAdminMode: boolean;
  adminPin: string | null;
  enableAdminMode: (pin: string) => void;
  disableAdminMode: () => void;
  verifyAdminPin: (pin: string) => boolean;

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

      // Captain Mode
      isCaptainMode: false,
      captainPin: null,

      enableCaptainMode: (pin) => {
        set({
          isCaptainMode: true,
          captainPin: pin,
        });

        get().showToast('success', 'Captain Mode enabled');
      },

      disableCaptainMode: () => {
        set({
          isCaptainMode: false,
        });

        get().showToast('info', 'Captain Mode disabled');
      },

      verifyCaptainPin: (pin) => {
        const { captainPin } = get();
        return captainPin !== null && captainPin === pin;
      },

      resetCaptainPin: () => {
        set({
          captainPin: null,
          isCaptainMode: false,
        });
        get().showToast(
          'info',
          'Captain PIN has been reset. Set a new PIN to re-enable Captain Mode.'
        );
      },

      // Admin Mode (power user features like bulk delete, data management)
      isAdminMode: false,
      adminPin: null,

      enableAdminMode: (pin) => {
        set({
          isAdminMode: true,
          adminPin: pin,
        });
        get().showToast('success', 'Admin Mode enabled');
      },

      disableAdminMode: () => {
        set({
          isAdminMode: false,
        });
        get().showToast('info', 'Admin Mode disabled');
      },

      verifyAdminPin: (pin) => {
        const { adminPin } = get();
        return adminPin !== null && adminPin === pin;
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
        captainPin: state.captainPin,
        isAdminMode: state.isAdminMode,
        adminPin: state.adminPin,
        scoringPreferences: state.scoringPreferences,
        scoringModeByFormat: state.scoringModeByFormat,
      }),
    }
  )
);

export default useUIStore;
