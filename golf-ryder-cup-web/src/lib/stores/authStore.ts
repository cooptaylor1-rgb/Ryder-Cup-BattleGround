/**
 * Auth Store
 *
 * Manages user authentication and current user profile.
 * Uses localStorage for persistence (local-first approach).
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Session as SupabaseSession } from '@supabase/supabase-js';
import type { Player } from '../types/models';
import { db } from '../db';
import { isSupabaseConfigured, supabase } from '../supabase/client';
import { authLogger } from '../utils/logger';
import { hashPin, verifyPin, isHashedPin } from '../utils/crypto';

// ============================================
// TYPES
// ============================================

export interface UserProfile extends Omit<Player, 'createdAt' | 'updatedAt'> {
  isProfileComplete: boolean;
  hasCompletedOnboarding: boolean;
  phoneNumber?: string;
  nickname?: string;
  homeCourse?: string;
  preferredTees?: 'back' | 'middle' | 'forward';
  shirtSize?: 'XS' | 'S' | 'M' | 'L' | 'XL' | '2XL' | '3XL';
  dietaryRestrictions?: string;
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface StoredUserRecord {
  profile: UserProfile;
  pin?: string | null;
}

interface AuthState {
  // State
  currentUser: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  authUserId: string | null;
  authEmail: string | null;
  hasResolvedSupabaseSession: boolean;

  // Actions
  login: (email: string, pin: string) => Promise<boolean>;
  loginWithProfile: (profile: UserProfile) => void;
  logout: () => void;
  createProfile: (
    profile: Omit<
      UserProfile,
      'id' | 'createdAt' | 'updatedAt' | 'isProfileComplete' | 'hasCompletedOnboarding'
    >,
    pin?: string | null
  ) => Promise<UserProfile>;
  setOfflinePin: (pin: string) => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  completeOnboarding: () => Promise<void>;
  checkExistingUser: (email: string) => Promise<UserProfile | null>;
  syncSupabaseSession: (session: SupabaseSession | null) => void;
  clearError: () => void;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

const generateId = (): string => {
  return crypto.randomUUID();
};

function normalizeEmail(email?: string | null): string | null {
  const normalized = email?.trim().toLowerCase();
  return normalized ? normalized : null;
}

function readStoredUsers(): Record<string, StoredUserRecord> {
  const storedUsers = localStorage.getItem('golf-app-users');
  if (!storedUsers) {
    return {};
  }

  try {
    return JSON.parse(storedUsers) as Record<string, StoredUserRecord>;
  } catch (parseError) {
    authLogger.error('Failed to parse stored users:', parseError);
    return {};
  }
}

function findStoredUserByEmail(email?: string | null): UserProfile | null {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    return null;
  }

  const users = readStoredUsers();
  const userEntry = Object.values(users).find(
    (user) => normalizeEmail(user.profile.email) === normalizedEmail
  );

  return userEntry?.profile ?? null;
}

function ensureUniqueEmail(
  users: Record<string, StoredUserRecord>,
  email: string,
  excludedUserId?: string
): void {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    throw new Error('Email is required');
  }

  const existingUser = Object.values(users).find(
    (user) =>
      user.profile.id !== excludedUserId && normalizeEmail(user.profile.email) === normalizedEmail
  );

  if (existingUser) {
    throw new Error('An account with this email already exists');
  }
}

function resolveProfileEmail(profileEmail: string | undefined, authEmail: string | null): string {
  const normalizedEmail = normalizeEmail(authEmail) ?? normalizeEmail(profileEmail);

  if (!normalizedEmail) {
    throw new Error('Email is required');
  }

  return normalizedEmail;
}

function hasOfflinePin(record?: StoredUserRecord | null): boolean {
  return Boolean(record?.pin?.trim());
}

// ============================================
// STORE
// ============================================

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      currentUser: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      authUserId: null,
      authEmail: null,
      hasResolvedSupabaseSession: !isSupabaseConfigured,

      // Login with email and PIN
      login: async (email: string, pin: string) => {
        set({ isLoading: true, error: null });

        try {
          // Look up user by email in local storage
          const storedUsers = localStorage.getItem('golf-app-users');
          const users = storedUsers ? readStoredUsers() : {};
          if (storedUsers) {
            if (Object.keys(users).length === 0) {
              set({ isLoading: false, error: 'Login data corrupted. Please contact support.' });
              return false;
            }
          }

          const userEntry = Object.values(users).find(
            (u) => u.profile.email?.toLowerCase() === email.toLowerCase()
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

          // Verify PIN (supports both hashed and legacy plain text)
          let pinValid = false;
          if (isHashedPin(userEntry.pin!)) {
            // PIN is already hashed - verify against hash
            pinValid = await verifyPin(pin, userEntry.pin!);
          } else {
            // Legacy plain text PIN - verify and migrate to hash
            pinValid = userEntry.pin === pin;
            if (pinValid) {
              // Migrate to hashed PIN
              const hashedPin = await hashPin(pin);
              users[userEntry.profile.id] = { profile: userEntry.profile, pin: hashedPin };
              localStorage.setItem('golf-app-users', JSON.stringify(users));
              authLogger.log(`Migrated PIN to hash for: ${userEntry.profile.email}`);
            }
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
      },

      // Login directly with a profile (for new signups)
      loginWithProfile: (profile: UserProfile) => {
        set({
          currentUser: profile,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });
      },

      // Logout
      logout: () => {
        if (supabase) {
          void supabase.auth.signOut().catch((error) => {
            authLogger.warn('Failed to sign out Supabase session:', error);
          });
        }

        set({
          currentUser: null,
          isAuthenticated: false,
          error: null,
          authUserId: null,
          authEmail: null,
          hasResolvedSupabaseSession: true,
        });
      },

      // Create new profile
      createProfile: async (profileData, pin) => {
        set({ isLoading: true, error: null });

        try {
          const { authEmail } = get();
          const now = new Date().toISOString();
          const id = generateId();
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
          localStorage.setItem('golf-app-users', JSON.stringify(users));

          // Also add to IndexedDB players table for trip assignment
          await db.players.put({
            id: profile.id,
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
      },

      setOfflinePin: async (pin: string) => {
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
          localStorage.setItem('golf-app-users', JSON.stringify(users));

          set({ isLoading: false });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to save offline PIN';
          set({
            isLoading: false,
            error: message,
          });
          throw new Error(message);
        }
      },

      // Update existing profile
      updateProfile: async (updates) => {
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
            localStorage.setItem('golf-app-users', JSON.stringify(users));
          }

          // Update IndexedDB
          await db.players.update(currentUser.id, {
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
      },

      // Mark onboarding as complete
      completeOnboarding: async () => {
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
          localStorage.setItem('golf-app-users', JSON.stringify(users));
        }

        set({ currentUser: updatedProfile });
        authLogger.log(`Onboarding completed for: ${currentUser.email}`);
      },

      // Check if user exists by email
      checkExistingUser: async (email: string) => {
        try {
          return findStoredUserByEmail(email);
        } catch (error) {
          authLogger.error('Failed to parse stored users:', error);
          return null;
        }
      },

      syncSupabaseSession: (session) => {
        const authUserId = session?.user.id ?? null;
        const authEmail = session?.user.email ?? null;
        const { currentUser } = get();

        if (!session) {
          set({
            authUserId: null,
            authEmail: null,
            hasResolvedSupabaseSession: true,
          });
          return;
        }

        const matchedUser =
          currentUser?.email?.toLowerCase() === authEmail?.toLowerCase()
            ? currentUser
            : findStoredUserByEmail(authEmail);

        set({
          currentUser: matchedUser,
          isAuthenticated: !!matchedUser,
          authUserId,
          authEmail,
          hasResolvedSupabaseSession: true,
        });
      },

      // Clear error
      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: 'golf-app-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        currentUser: state.currentUser,
        isAuthenticated: state.isAuthenticated,
        authUserId: state.authUserId,
        authEmail: state.authEmail,
      }),
    }
  )
);
