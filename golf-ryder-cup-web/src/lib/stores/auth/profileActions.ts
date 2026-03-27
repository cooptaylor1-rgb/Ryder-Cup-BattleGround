/**
 * Profile CRUD actions — create, update, complete-onboarding.
 *
 * Extracted from authStore to isolate profile lifecycle logic.
 */

import { db } from '../../db';
import { authLogger } from '../../utils/logger';
import { hashPin } from '../../utils/crypto';
import type { AuthState, UserProfile } from './authTypes';
import {
  readStoredUsers,
  writeStoredUsers,
  ensureUniqueEmail,
  resolveProfileEmail,
  normalizeEmail,
  findStoredUserByEmail,
} from './authStorage';

type StoreApi = {
  set: (partial: Partial<AuthState>) => void;
  get: () => AuthState;
};

export function createCreateProfileAction({ set, get }: StoreApi) {
  return async (
    profileData: Omit<UserProfile, 'id' | 'createdAt' | 'updatedAt' | 'isProfileComplete' | 'hasCompletedOnboarding'>,
    pin?: string | null,
  ): Promise<UserProfile> => {
    set({ isLoading: true, error: null });

    try {
      const { authEmail, authUserId } = get();
      const now = new Date().toISOString();
      const id = crypto.randomUUID();
      const users = readStoredUsers();
      const resolvedEmail = resolveProfileEmail(profileData.email, authEmail);

      ensureUniqueEmail(users, resolvedEmail);

      const profile: UserProfile = {
        ...profileData,
        id,
        email: resolvedEmail,
        isProfileComplete: !!(
          profileData.firstName &&
          profileData.lastName &&
          resolvedEmail &&
          profileData.handicapIndex !== undefined
        ),
        hasCompletedOnboarding: false,
        createdAt: now,
        updatedAt: now,
      };

      const normalizedPin = pin?.trim();
      const hashedPin = normalizedPin ? await hashPin(normalizedPin) : null;
      users[id] = { profile, pin: hashedPin };
      writeStoredUsers(users);

      // Also add to IndexedDB players table for trip assignment
      await db.players.put({
        id: profile.id,
        linkedProfileId: profile.id,
        linkedAuthUserId: authUserId ?? undefined,
        firstName: profile.firstName,
        lastName: profile.lastName,
        email: profile.email,
        handicapIndex: profile.handicapIndex,
        ghin: profile.ghin,
        teePreference: profile.preferredTees,
        avatarUrl: profile.avatarUrl,
      });

      set({
        currentUser: profile,
        isAuthenticated: true,
        isLoading: false,
      });

      authLogger.log(`New user created: ${profile.email}`);

      return profile;
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to create profile',
      });
      throw error;
    }
  };
}

export function createUpdateProfileAction({ set, get }: StoreApi) {
  return async (updates: Partial<UserProfile>): Promise<void> => {
    const { currentUser, authEmail } = get();
    if (!currentUser) {
      set({ error: 'No user logged in' });
      throw new Error('No user logged in');
    }

    set({ isLoading: true, error: null });

    try {
      const users = readStoredUsers();
      const normalizedAuthEmail = normalizeEmail(authEmail);
      const requestedEmail = normalizeEmail(updates.email ?? currentUser.email);

      if (normalizedAuthEmail && requestedEmail !== normalizedAuthEmail) {
        throw new Error('Email is managed by your signed-in account');
      }

      const resolvedEmail = resolveProfileEmail(updates.email ?? currentUser.email, authEmail);
      ensureUniqueEmail(users, resolvedEmail, currentUser.id);

      const updatedProfile: UserProfile = {
        ...currentUser,
        ...updates,
        email: resolvedEmail,
        updatedAt: new Date().toISOString(),
        isProfileComplete: !!(
          (updates.firstName ?? currentUser.firstName) &&
          (updates.lastName ?? currentUser.lastName) &&
          resolvedEmail &&
          (updates.handicapIndex ?? currentUser.handicapIndex) !== undefined
        ),
      };

      // Update local users storage
      if (users[currentUser.id]) {
        users[currentUser.id].profile = updatedProfile;
        writeStoredUsers(users);
      }

      // Update IndexedDB
      await db.players.update(currentUser.id, {
        linkedProfileId: currentUser.id,
        linkedAuthUserId: get().authUserId ?? undefined,
        firstName: updatedProfile.firstName,
        lastName: updatedProfile.lastName,
        email: updatedProfile.email,
        handicapIndex: updatedProfile.handicapIndex,
        ghin: updatedProfile.ghin,
        teePreference: updatedProfile.preferredTees,
        avatarUrl: updatedProfile.avatarUrl,
      });

      set({
        currentUser: updatedProfile,
        isLoading: false,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update profile';
      set({
        isLoading: false,
        error: message,
      });
      throw new Error(message);
    }
  };
}

export function createCompleteOnboardingAction({ set, get }: StoreApi) {
  return async (): Promise<void> => {
    const { currentUser } = get();
    if (!currentUser) return;

    const updatedProfile: UserProfile = {
      ...currentUser,
      hasCompletedOnboarding: true,
      updatedAt: new Date().toISOString(),
    };

    // Update local users storage
    const users = readStoredUsers();

    if (users[currentUser.id]) {
      users[currentUser.id].profile = updatedProfile;
      writeStoredUsers(users);
    }

    set({ currentUser: updatedProfile });
    authLogger.log(`Onboarding completed for: ${currentUser.email}`);
  };
}

export function createCheckExistingUserAction() {
  return async (email: string): Promise<UserProfile | null> => {
    try {
      return findStoredUserByEmail(email);
    } catch (error) {
      authLogger.error('Failed to parse stored users:', error);
      return null;
    }
  };
}
