/**
 * UI Store
 *
 * Global UI state for navigation, modals, and app-wide settings.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// ============================================
// TYPES
// ============================================

type Tab = 'score' | 'matchups' | 'standings' | 'more';

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
    isDarkMode: boolean;
    toggleDarkMode: () => void;

    // Captain Mode
    isCaptainMode: boolean;
    captainPin: string | null;
    enableCaptainMode: (pin: string) => void;
    disableCaptainMode: () => void;
    verifyCaptainPin: (pin: string) => boolean;

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

    // Scoring UI preferences
    scoringPreferences: {
        showStrokes: boolean;
        autoAdvance: boolean;
        hapticFeedback: boolean;
        confirmCloseout: boolean;
    };
    updateScoringPreference: <K extends keyof UIState['scoringPreferences']>(
        key: K,
        value: UIState['scoringPreferences'][K]
    ) => void;
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

            // Theme (default to dark for outdoor visibility)
            isDarkMode: true,
            toggleDarkMode: () => {
                const newMode = !get().isDarkMode;
                set({ isDarkMode: newMode });

                // Update document class for Tailwind dark mode
                if (typeof document !== 'undefined') {
                    document.documentElement.classList.toggle('dark', newMode);
                }
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

            // Toasts
            toasts: [],

            showToast: (type, message, duration = 3000) => {
                const id = crypto.randomUUID();
                const toast: Toast = { id, type, message, duration };

                set(state => ({
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
                set(state => ({
                    toasts: state.toasts.filter(t => t.id !== id),
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

            // Scoring preferences
            scoringPreferences: {
                showStrokes: false, // Show stroke scores in addition to hole winner
                autoAdvance: true, // Auto-advance to next hole after scoring
                hapticFeedback: true, // Vibrate on score entry
                confirmCloseout: true, // Confirm before recording match-ending score
            },

            updateScoringPreference: (key, value) => {
                set(state => ({
                    scoringPreferences: {
                        ...state.scoringPreferences,
                        [key]: value,
                    },
                }));
            },
        }),
        {
            name: 'golf-ui-storage',
            storage: createJSONStorage(() => localStorage),
            partialize: (state) => ({
                // Persist these settings
                isDarkMode: state.isDarkMode,
                isCaptainMode: state.isCaptainMode,
                captainPin: state.captainPin,
                scoringPreferences: state.scoringPreferences,
            }),
        }
    )
);

export default useUIStore;
