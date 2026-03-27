/**
 * PIN authentication actions — login + setOfflinePin.
 *
 * Extracted from authStore to isolate PIN‐related logic
 * (hashing, verification, legacy migration).
 */

import { authLogger } from '../../utils/logger';
import { hashPin, verifyPin, isHashedPin } from '../../utils/crypto';
import type { AuthState, StoredUserRecord } from './authTypes';
import { readStoredUsers, writeStoredUsers, hasOfflinePin } from './authStorage';

type StoreApi = {
  set: (partial: Partial<AuthState>) => void;
  get: () => AuthState;
};

export function createLoginAction({ set }: StoreApi) {
  return async (email: string, pin: string): Promise<boolean> => {
    set({ isLoading: true, error: null });

    try {
      const storedUsers = localStorage.getItem('golf-app-users');
      const users = storedUsers ? readStoredUsers() : {};
      if (storedUsers) {
        if (Object.keys(users).length === 0) {
          set({ isLoading: false, error: 'Login data corrupted. Please contact support.' });
          return false;
        }
      }

      const userEntry = Object.values(users).find(
        (u: StoredUserRecord) => u.profile.email?.toLowerCase() === email.toLowerCase()
      );

      if (!userEntry) {
        set({ isLoading: false, error: 'No account found with this email' });
        return false;
      }

      if (!hasOfflinePin(userEntry)) {
        set({
          isLoading: false,
          error: 'Offline PIN is not set for this account on this device. Use the email sign-in link.',
        });
        return false;
      }

      // Verify PIN — only accept hashed PINs
      let pinValid = false;
      if (isHashedPin(userEntry.pin!)) {
        pinValid = await verifyPin(pin, userEntry.pin!);
      } else {
        // Legacy plain-text PIN: force the user to set a new PIN via email sign-in
        authLogger.warn(`Legacy plain-text PIN detected for: ${userEntry.profile.email}. Clearing PIN — user must reset.`);
        users[userEntry.profile.id] = { profile: userEntry.profile, pin: null };
        writeStoredUsers(users);
        set({
          isLoading: false,
          error: 'Your PIN has expired for security reasons. Please sign in with email and set a new PIN in your profile.',
        });
        return false;
      }

      if (!pinValid) {
        set({ isLoading: false, error: 'Invalid PIN' });
        return false;
      }

      set({
        currentUser: userEntry.profile,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });

      return true;
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Login failed',
      });
      return false;
    }
  };
}

export function createSetOfflinePinAction({ set, get }: StoreApi) {
  return async (pin: string): Promise<void> => {
    const { currentUser } = get();
    if (!currentUser) {
      set({ error: 'No user logged in' });
      throw new Error('No user logged in');
    }

    const normalizedPin = pin.trim();
    if (!/^\d{4}$/.test(normalizedPin)) {
      set({ error: 'PIN must be exactly 4 digits' });
      throw new Error('PIN must be exactly 4 digits');
    }

    set({ isLoading: true, error: null });

    try {
      const users = readStoredUsers();
      const existingRecord = users[currentUser.id];

      if (!existingRecord) {
        throw new Error('This account is not available for offline access on this device yet');
      }

      existingRecord.pin = await hashPin(normalizedPin);
      users[currentUser.id] = existingRecord;
      writeStoredUsers(users);

      set({ isLoading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save offline PIN';
      set({
        isLoading: false,
        error: message,
      });
      throw new Error(message);
    }
  };
}
