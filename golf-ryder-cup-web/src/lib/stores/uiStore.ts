/**
 * UI Store — Facade
 *
 * Backward-compatible facade that composes focused sub-stores.
 * New code should import from the focused stores directly:
 *   - useToastStore  — toasts, modals, global loading
 *   - useThemeStore  — theme, dark mode, accent color
 *   - useAccessStore — captain/admin mode, PIN management
 *   - useScoringPrefsStore — scoring UI preferences
 *
 * This facade remains for existing consumers that destructure from useUIStore.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { useToastStore, type Toast } from './toastStore';
import { useThemeStore, type Theme, type AccentTheme } from './themeStore';
import { useAccessStore } from './accessStore';
import { useScoringPrefsStore } from './scoringPrefsStore';
import type { ScoringPreferences } from '@/lib/types/scoringPreferences';
import type { SessionType } from '@/lib/types';

// ============================================
// TYPES
// ============================================

type Tab = 'score' | 'matchups' | 'standings' | 'more';
type ScoringMode = 'swipe' | 'buttons' | 'strokes' | 'fourball' | 'oneHanded';

interface Modal {
  type: string;
  props?: Record<string, unknown>;
}

interface UIState {
  // Navigation (stays in facade — lightweight)
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;

  // Offline status (stays in facade — used broadly)
  isOnline: boolean;
  setOnlineStatus: (isOnline: boolean) => void;

  // === Delegated to useThemeStore ===
  theme: Theme;
  isDarkMode: boolean;
  autoTheme: boolean;
  accentTheme: AccentTheme;
  setTheme: (theme: Theme) => void;
  toggleDarkMode: () => void;
  setAutoTheme: (enabled: boolean) => void;
  setAccentTheme: (theme: AccentTheme) => void;

  // === Delegated to useAccessStore ===
  isCaptainMode: boolean;
  captainPinHash: string | null;
  enableCaptainMode: (pin: string) => Promise<void>;
  enableCaptainModeForCreator: () => void;
  disableCaptainMode: () => void;
  resetCaptainPin: () => void;
  isAdminMode: boolean;
  adminPinHash: string | null;
  enableAdminMode: (pin: string) => Promise<void>;
  disableAdminMode: () => void;

  // === Delegated to useToastStore ===
  toasts: Toast[];
  showToast: (type: Toast['type'], message: string, duration?: number) => void;
  dismissToast: (id: string) => void;
  clearToasts: () => void;
  activeModal: Modal | null;
  openModal: (type: string, props?: Record<string, unknown>) => void;
  closeModal: () => void;
  isGlobalLoading: boolean;
  globalLoadingMessage: string | null;
  showGlobalLoading: (message?: string) => void;
  hideGlobalLoading: () => void;

  // === Delegated to useScoringPrefsStore ===
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
// FACADE STORE
// ============================================

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      // ─── Navigation (owned by facade) ──────────────────────
      activeTab: 'score',
      setActiveTab: (tab) => set({ activeTab: tab }),

      // ─── Offline status (owned by facade) ──────────────────
      isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
      setOnlineStatus: (isOnline) => {
        const wasOnline = get().isOnline;
        set({ isOnline });
        if (wasOnline && !isOnline) {
          useToastStore
            .getState()
            .showToast('warning', 'You are offline. Scores will sync when reconnected.', 5000);
        } else if (!wasOnline && isOnline) {
          useToastStore.getState().showToast('success', 'Back online! Syncing scores...', 3000);
        }
      },

      // ─── Theme (delegated) ─────────────────────────────────
      get theme() {
        return useThemeStore.getState().theme;
      },
      get isDarkMode() {
        return useThemeStore.getState().isDarkMode;
      },
      get autoTheme() {
        return useThemeStore.getState().autoTheme;
      },
      get accentTheme() {
        return useThemeStore.getState().accentTheme;
      },
      setTheme: (theme) => useThemeStore.getState().setTheme(theme),
      toggleDarkMode: () => useThemeStore.getState().toggleDarkMode(),
      setAutoTheme: (enabled) => useThemeStore.getState().setAutoTheme(enabled),
      setAccentTheme: (theme) => useThemeStore.getState().setAccentTheme(theme),

      // ─── Access Control (delegated) ────────────────────────
      get isCaptainMode() {
        return useAccessStore.getState().isCaptainMode;
      },
      get captainPinHash() {
        return useAccessStore.getState().captainPinHash;
      },
      enableCaptainMode: (pin) => useAccessStore.getState().enableCaptainMode(pin),
      enableCaptainModeForCreator: () => useAccessStore.getState().enableCaptainModeForCreator(),
      disableCaptainMode: () => useAccessStore.getState().disableCaptainMode(),
      resetCaptainPin: () => useAccessStore.getState().resetCaptainPin(),
      get isAdminMode() {
        return useAccessStore.getState().isAdminMode;
      },
      get adminPinHash() {
        return useAccessStore.getState().adminPinHash;
      },
      enableAdminMode: (pin) => useAccessStore.getState().enableAdminMode(pin),
      disableAdminMode: () => useAccessStore.getState().disableAdminMode(),

      // ─── Toasts & Modals (delegated) ───────────────────────
      get toasts() {
        return useToastStore.getState().toasts;
      },
      showToast: (type, message, duration) =>
        useToastStore.getState().showToast(type, message, duration),
      dismissToast: (id) => useToastStore.getState().dismissToast(id),
      clearToasts: () => useToastStore.getState().clearToasts(),
      get activeModal() {
        return useToastStore.getState().activeModal;
      },
      openModal: (type, props) => useToastStore.getState().openModal(type, props),
      closeModal: () => useToastStore.getState().closeModal(),
      get isGlobalLoading() {
        return useToastStore.getState().isGlobalLoading;
      },
      get globalLoadingMessage() {
        return useToastStore.getState().globalLoadingMessage;
      },
      showGlobalLoading: (message) => useToastStore.getState().showGlobalLoading(message),
      hideGlobalLoading: () => useToastStore.getState().hideGlobalLoading(),

      // ─── Scoring Preferences (delegated) ───────────────────
      get scoringPreferences() {
        return useScoringPrefsStore.getState().scoringPreferences;
      },
      updateScoringPreference: (key, value) =>
        useScoringPrefsStore.getState().updateScoringPreference(key, value),
      resetScoringPreferences: () => useScoringPrefsStore.getState().resetScoringPreferences(),
      get scoringModeByFormat() {
        return useScoringPrefsStore.getState().scoringModeByFormat;
      },
      getScoringModeForFormat: (format) =>
        useScoringPrefsStore.getState().getScoringModeForFormat(format),
      setScoringModeForFormat: (format, mode) =>
        useScoringPrefsStore.getState().setScoringModeForFormat(format, mode),
    }),
    {
      name: 'golf-ui-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // Only persist facade-owned state (nav, online status)
        // Theme, access, and scoring prefs are persisted by their own stores
        activeTab: state.activeTab,
      }),
    },
  ),
);

export default useUIStore;
