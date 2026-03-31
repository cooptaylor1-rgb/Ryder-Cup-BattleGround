/**
 * UI Store
 *
 * Lightweight store for navigation and connectivity state.
 * All other UI state lives in focused stores:
 *   - useToastStore  — toasts, modals, global loading
 *   - useThemeStore  — theme, dark mode, accent color
 *   - useAccessStore — captain/admin mode, PIN management
 *   - useScoringPrefsStore — scoring UI preferences
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { useToastStore } from './toastStore';

// ============================================
// TYPES
// ============================================

type Tab = 'score' | 'matchups' | 'standings' | 'more';

interface UIState {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;

  isOnline: boolean;
  setOnlineStatus: (isOnline: boolean) => void;
}

// ============================================
// STORE
// ============================================

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      activeTab: 'score',
      setActiveTab: (tab) => set({ activeTab: tab }),

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
    }),
    {
      name: 'golf-ui-storage',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

export default useUIStore;
