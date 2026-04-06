/**
 * Access Control Store
 *
 * Manages Captain Mode and Admin Mode with PIN-based authentication.
 * Persisted to localStorage.
 *
 * Rate limiting: After MAX_ATTEMPTS_BEFORE_LOCK consecutive failures,
 * the PIN is locked for an exponentially increasing window (capped at
 * LOCK_CAP_MS). State persists across reloads so refreshing doesn't
 * bypass the lock.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { hashPin, verifyPin, isHashedPin } from '@/lib/utils/crypto';
import { useToastStore } from './toastStore';

// ============================================
// CONSTANTS
// ============================================

const MAX_ATTEMPTS_BEFORE_LOCK = 5;
const BASE_LOCK_MS = 1000;
const LOCK_CAP_MS = 5 * 60 * 1000; // 5 minutes

function computeLockoutMs(attempts: number): number {
  // attempts is the count *after* the failing attempt that triggered the lock.
  // 5 -> 1s, 6 -> 2s, 7 -> 4s, 8 -> 8s, ... capped at 5 min.
  const overage = Math.max(0, attempts - MAX_ATTEMPTS_BEFORE_LOCK);
  const ms = BASE_LOCK_MS * 2 ** overage;
  return Math.min(ms, LOCK_CAP_MS);
}

function formatRemaining(ms: number): string {
  const seconds = Math.ceil(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.ceil(seconds / 60);
  return `${minutes}m`;
}

// ============================================
// TYPES
// ============================================

interface PinAttemptState {
  failedAttempts: number;
  lockedUntil: number | null;
}

interface AccessState {
  // Captain Mode
  isCaptainMode: boolean;
  captainPinHash: string | null;
  captainAttempts: PinAttemptState;
  enableCaptainMode: (pin: string) => Promise<void>;
  enableCaptainModeForCreator: () => void;
  disableCaptainMode: () => void;
  resetCaptainPin: () => void;

  // Admin Mode
  isAdminMode: boolean;
  adminPinHash: string | null;
  adminAttempts: PinAttemptState;
  enableAdminMode: (pin: string) => Promise<void>;
  disableAdminMode: () => void;
}

// ============================================
// HELPERS
// ============================================

const initialAttempts: PinAttemptState = { failedAttempts: 0, lockedUntil: null };

/**
 * Throws a user-facing error if the PIN is currently locked out.
 * Returns silently if no lock is active.
 */
function assertNotLocked(state: PinAttemptState, label: string): void {
  if (state.lockedUntil && state.lockedUntil > Date.now()) {
    const remaining = state.lockedUntil - Date.now();
    throw new Error(
      `Too many incorrect ${label} PIN attempts. Try again in ${formatRemaining(remaining)}.`,
    );
  }
}

/**
 * Records a failed attempt and returns the next attempt state.
 * Triggers a lockout if the threshold is exceeded.
 */
function recordFailure(state: PinAttemptState): PinAttemptState {
  const failedAttempts = state.failedAttempts + 1;
  const lockedUntil =
    failedAttempts >= MAX_ATTEMPTS_BEFORE_LOCK
      ? Date.now() + computeLockoutMs(failedAttempts)
      : null;
  return { failedAttempts, lockedUntil };
}

// ============================================
// STORE
// ============================================

export const useAccessStore = create<AccessState>()(
  persist(
    (set, get) => ({
      // Captain Mode
      isCaptainMode: false,
      captainPinHash: null,
      captainAttempts: { ...initialAttempts },

      enableCaptainMode: async (pin) => {
        assertNotLocked(get().captainAttempts, 'Captain');

        const current = get().captainPinHash;

        if (current) {
          const ok = await verifyPin(pin, current);
          if (!ok) {
            const next = recordFailure(get().captainAttempts);
            set({ captainAttempts: next });
            if (next.lockedUntil) {
              const remaining = next.lockedUntil - Date.now();
              throw new Error(
                `Too many incorrect Captain PIN attempts. Locked for ${formatRemaining(remaining)}.`,
              );
            }
            throw new Error('Incorrect PIN');
          }
        }

        const nextHash =
          current && isHashedPin(current) && current.startsWith('pbkdf2$')
            ? current
            : await hashPin(pin);

        set({
          isCaptainMode: true,
          captainPinHash: nextHash,
          captainAttempts: { ...initialAttempts },
        });
        useToastStore.getState().showToast('success', 'Captain Mode enabled');
      },

      enableCaptainModeForCreator: () => {
        set({ isCaptainMode: true, captainAttempts: { ...initialAttempts } });
        useToastStore.getState().showToast('success', 'Captain Mode enabled for trip creator');
      },

      disableCaptainMode: () => {
        set({ isCaptainMode: false });
        useToastStore.getState().showToast('info', 'Captain Mode disabled');
      },

      resetCaptainPin: () => {
        set({
          captainPinHash: null,
          isCaptainMode: false,
          captainAttempts: { ...initialAttempts },
        });
        useToastStore
          .getState()
          .showToast(
            'info',
            'Captain PIN has been reset. Set a new PIN to re-enable Captain Mode.',
          );
      },

      // Admin Mode
      isAdminMode: false,
      adminPinHash: null,
      adminAttempts: { ...initialAttempts },

      enableAdminMode: async (pin) => {
        assertNotLocked(get().adminAttempts, 'Admin');

        const current = get().adminPinHash;

        if (current) {
          const ok = await verifyPin(pin, current);
          if (!ok) {
            const next = recordFailure(get().adminAttempts);
            set({ adminAttempts: next });
            if (next.lockedUntil) {
              const remaining = next.lockedUntil - Date.now();
              throw new Error(
                `Too many incorrect Admin PIN attempts. Locked for ${formatRemaining(remaining)}.`,
              );
            }
            throw new Error('Incorrect PIN');
          }
        }

        const nextHash =
          current && isHashedPin(current) && current.startsWith('pbkdf2$')
            ? current
            : await hashPin(pin);

        set({
          isAdminMode: true,
          adminPinHash: nextHash,
          adminAttempts: { ...initialAttempts },
        });
        useToastStore.getState().showToast('success', 'Admin Mode enabled');
      },

      disableAdminMode: () => {
        set({ isAdminMode: false });
        useToastStore.getState().showToast('info', 'Admin Mode disabled');
      },
    }),
    {
      name: 'golf-access-storage',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
