/**
 * Profile CRUD actions — create, update, complete-onboarding.
 *
 * Extracted from authStore to isolate profile lifecycle logic.
 */

import { db } from '../../db';
import { authLogger } from '../../utils/logger';
import { hashPin } from '../../utils/crypto';
import { queueSyncOperation } from '../../services/tripSyncService';
import { supabase } from '../../supabase/client';
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

const ALLOWED_PREFERRED_TEES: ReadonlyArray<NonNullable<UserProfile['preferredTees']>> = [
  'back',
  'middle',
  'forward',
];

function coercePreferredTees(value: unknown): UserProfile['preferredTees'] {
  if (typeof value !== 'string') return undefined;
  const lower = value.toLowerCase();
  return (ALLOWED_PREFERRED_TEES as readonly string[]).includes(lower)
    ? (lower as NonNullable<UserProfile['preferredTees']>)
    : undefined;
}

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

/**
 * Reconstruct a local UserProfile from the user's most recent cloud
 * Player row when the device has no local profile yet.
 *
 * Why this exists: profiles are stored in localStorage (`golf-app-users`)
 * and never sync to Supabase. So when someone signs into a fresh device
 * — installing the PWA on a phone after using it on a laptop, e.g. —
 * the auth bridge resolves the Supabase session but `findStoredUserByEmail`
 * returns null, the app treats them as brand-new, and forces a redundant
 * profile-create flow even though their name, handicap, GHIN, etc. are
 * already in cloud on every Player row this auth user is linked to.
 *
 * The cloud `players` table holds firstName/lastName/email/handicap/ghin
 * per trip with the same auth user across rows (because updateProfile
 * patches every linked row identically). Pulling the most recent one
 * and stamping it into localStorage gives the new device the same
 * starting state as the desktop session — the user lands signed in,
 * with their handicap and identity already present.
 */
export function createHydrateProfileFromCloudAction({ set, get }: StoreApi) {
  return async (): Promise<UserProfile | null> => {
    const { authUserId, authEmail, currentUser } = get();

    // Already have a local profile — nothing to recover. Don't clobber
    // it with cloud data, which may be slightly behind a pending local
    // update that hasn't flushed yet.
    if (currentUser) return currentUser;
    if (!authUserId) return null;
    if (!supabase) return null;

    try {
      // Pick the freshest row this auth user owns. Multiple trips means
      // multiple rows; updateProfile keeps them in lockstep, so any one
      // is fine — but the most-recently-updated one is the safest pick
      // in case the user touched their handicap on another device just
      // before installing this one.
      const response = await supabase
        .from('players')
        .select('*')
        .eq('linked_auth_user_id', authUserId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (response.error) {
        authLogger.warn('Cloud profile hydration query failed:', response.error.message);
        return null;
      }

      const row = response.data as Record<string, unknown> | null;
      if (!row) return null;

      const cloudFirstName = typeof row.first_name === 'string' ? row.first_name : '';
      const cloudLastName = typeof row.last_name === 'string' ? row.last_name : '';
      const cloudEmail =
        (typeof row.email === 'string' && row.email.trim()) || authEmail || '';
      // Reuse the cloud-side linked_profile_id so any other device
      // that hydrated from the same Player row converges on the same
      // local profile id. Falls back to a fresh UUID only when the
      // cloud row predates linked_profile_id being populated.
      const profileId =
        (typeof row.linked_profile_id === 'string' && row.linked_profile_id) ||
        crypto.randomUUID();
      const handicapIndex =
        typeof row.handicap_index === 'number' ? row.handicap_index : undefined;
      const ghin = typeof row.ghin === 'string' && row.ghin ? row.ghin : undefined;
      const teePreference =
        typeof row.tee_preference === 'string' && row.tee_preference
          ? row.tee_preference
          : undefined;
      const avatarUrl =
        typeof row.avatar_url === 'string' && row.avatar_url ? row.avatar_url : undefined;
      const createdAt =
        (typeof row.created_at === 'string' && row.created_at) || new Date().toISOString();
      const now = new Date().toISOString();

      const profile: UserProfile = {
        id: profileId,
        firstName: cloudFirstName,
        lastName: cloudLastName,
        email: cloudEmail,
        handicapIndex,
        ghin,
        teePreference,
        preferredTees: coercePreferredTees(teePreference),
        avatarUrl,
        // The first device set "completed onboarding"; this device just
        // skipped the create flow. Treat onboarding as done so we don't
        // trap the user in a tutorial they've already finished.
        hasCompletedOnboarding: true,
        isProfileComplete: Boolean(cloudFirstName && cloudLastName && cloudEmail),
        createdAt,
        updatedAt: now,
      };

      const users = readStoredUsers();
      users[profile.id] = { profile, pin: users[profile.id]?.pin ?? null };
      writeStoredUsers(users);

      set({
        currentUser: profile,
        isAuthenticated: true,
      });

      authLogger.log(`Hydrated user profile from cloud for auth ${authUserId}`);
      return profile;
    } catch (error) {
      authLogger.warn(
        'Cloud profile hydration failed:',
        error instanceof Error ? error.message : String(error)
      );
      return null;
    }
  };
}
