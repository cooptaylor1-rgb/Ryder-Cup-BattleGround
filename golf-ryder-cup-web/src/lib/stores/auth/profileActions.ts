/**
 * Profile CRUD actions — create, update, complete-onboarding.
 *
 * Extracted from authStore to isolate profile lifecycle logic.
 */

import { db } from '../../db';
import { authLogger } from '../../utils/logger';
import { hashPin } from '../../utils/crypto';
import { queueSyncOperation } from '../../services/tripSyncService';
import type { Player } from '../../types/models';
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

      // Propagate profile edits to every linked Player row (across all
      // trips) AND queue a cloud sync per player. Two bugs this
      // replaces:
      //   1. The previous code ran db.players.update(currentUser.id,
      //      ...) which treats the user's profile id as the Player
      //      primary key — but player PKs are random UUIDs assigned
      //      at trip creation. So the update almost always hit zero
      //      rows, and a profile edit never reached any of the user's
      //      trip rosters.
      //   2. No queueSyncOperation, so even in the rare orphan case
      //      where the ids coincided, the change never synced and
      //      the next roster poll wiped the local edit.
      //
      // Fix: locate linked players by linkedProfileId OR
      // linkedAuthUserId (not by primary key), dedupe, write Dexie +
      // queue sync per player. Linked-id fields aren't indexed but
      // player rosters are small enough for a full scan here.
      const authUserId = get().authUserId ?? undefined;
      const allPlayers = await db.players.toArray();
      const linkedPlayers = allPlayers.filter((p) => {
        if (currentUser.id && p.linkedProfileId === currentUser.id) return true;
        if (authUserId && p.linkedAuthUserId === authUserId) return true;
        return false;
      });

      const now = new Date().toISOString();
      for (const player of linkedPlayers) {
        const patch: Partial<Player> = {
          linkedProfileId: currentUser.id,
          linkedAuthUserId: authUserId,
          firstName: updatedProfile.firstName,
          lastName: updatedProfile.lastName,
          email: updatedProfile.email,
          handicapIndex: updatedProfile.handicapIndex,
          ghin: updatedProfile.ghin,
          teePreference: updatedProfile.preferredTees,
          avatarUrl: updatedProfile.avatarUrl,
          updatedAt: now,
        };
        await db.players.update(player.id, patch);
        if (player.tripId) {
          queueSyncOperation('player', player.id, 'update', player.tripId, {
            ...player,
            ...patch,
          });
        }
      }

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
