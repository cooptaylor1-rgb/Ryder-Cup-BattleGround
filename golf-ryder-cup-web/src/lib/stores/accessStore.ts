/**
 * Access Control Store
 *
 * Manages Captain Mode and Admin Mode with PIN-based authentication.
 * Persisted to localStorage.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { hashPin, verifyPin, isHashedPin } from '@/lib/utils/crypto';
import { useToastStore } from './toastStore';

// ============================================
// TYPES
// ============================================

interface AccessState {
  // Captain Mode
  isCaptainMode: boolean;
  captainPinHash: string | null;
  enableCaptainMode: (pin: string) => Promise<void>;
  enableCaptainModeForCreator: () => void;
  disableCaptainMode: () => void;
  resetCaptainPin: () => void;

  // Admin Mode
  isAdminMode: boolean;
  adminPinHash: string | null;
  enableAdminMode: (pin: string) => Promise<void>;
  disableAdminMode: () => void;
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

      enableCaptainMode: async (pin) => {
        const current = get().captainPinHash;

        if (current) {
          const ok = await verifyPin(pin, current);
          if (!ok) throw new Error('Incorrect PIN');
        }

        const nextHash =
          current && isHashedPin(current) && current.startsWith('pbkdf2$')
            ? current
            : await hashPin(pin);

        set({ isCaptainMode: true, captainPinHash: nextHash });
        useToastStore.getState().showToast('success', 'Captain Mode enabled');
      },

      enableCaptainModeForCreator: () => {
        set({ isCaptainMode: true });
        useToastStore.getState().showToast('success', 'Captain Mode enabled for trip creator');
      },

      disableCaptainMode: () => {
        set({ isCaptainMode: false });
        useToastStore.getState().showToast('info', 'Captain Mode disabled');
      },

      resetCaptainPin: () => {
        set({ captainPinHash: null, isCaptainMode: false });
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

      enableAdminMode: async (pin) => {
        const current = get().adminPinHash;

        if (current) {
          const ok = await verifyPin(pin, current);
          if (!ok) throw new Error('Incorrect PIN');
        }

        const nextHash =
          current && isHashedPin(current) && current.startsWith('pbkdf2$')
            ? current
            : await hashPin(pin);

        set({ isAdminMode: true, adminPinHash: nextHash });
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
