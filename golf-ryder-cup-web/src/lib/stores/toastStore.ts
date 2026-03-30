/**
 * Toast & Modal Store
 *
 * Manages ephemeral UI feedback: toasts, modals, and global loading overlays.
 * Not persisted — these are transient states.
 */

import { create } from 'zustand';

// ============================================
// TYPES
// ============================================

// Track auto-dismiss timers so they can be cancelled when a toast is manually dismissed
const toastTimers = new Map<string, ReturnType<typeof setTimeout>>();

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  duration?: number;
}

interface Modal {
  type: string;
  props?: Record<string, unknown>;
}

interface ToastState {
  // Toasts
  toasts: Toast[];
  showToast: (type: Toast['type'], message: string, duration?: number) => void;
  dismissToast: (id: string) => void;
  clearToasts: () => void;

  // Modals
  activeModal: Modal | null;
  openModal: (type: string, props?: Record<string, unknown>) => void;
  closeModal: () => void;

  // Loading overlay
  isGlobalLoading: boolean;
  globalLoadingMessage: string | null;
  showGlobalLoading: (message?: string) => void;
  hideGlobalLoading: () => void;
}

// ============================================
// STORE
// ============================================

export const useToastStore = create<ToastState>()((set, get) => ({
  // Toasts
  toasts: [],

  showToast: (type, message, duration = 3000) => {
    const id = crypto.randomUUID();
    const toast: Toast = { id, type, message, duration };

    let shouldScheduleDismiss = true;

    set((state) => {
      const hasDuplicateToast = state.toasts.some(
        (existingToast) =>
          existingToast.type === type && existingToast.message === message,
      );

      if (hasDuplicateToast) {
        shouldScheduleDismiss = false;
        return state;
      }

      return {
        toasts: [...state.toasts, toast],
      };
    });

    // Auto-dismiss
    if (shouldScheduleDismiss && duration > 0) {
      const timer = setTimeout(() => {
        toastTimers.delete(id);
        get().dismissToast(id);
      }, duration);
      toastTimers.set(id, timer);
    }
  },

  dismissToast: (id) => {
    const timer = toastTimers.get(id);
    if (timer) {
      clearTimeout(timer);
      toastTimers.delete(id);
    }
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
}));
