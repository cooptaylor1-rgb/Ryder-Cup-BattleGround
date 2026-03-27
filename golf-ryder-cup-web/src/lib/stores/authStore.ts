/**
 * Auth Store
 *
 * Manages user authentication and current user profile.
 * Uses localStorage for persistence (local-first approach).
 *
 * Business logic is split into focused modules under ./auth/:
 *   authTypes.ts    — shared TypeScript interfaces
 *   authStorage.ts  — localStorage read / write helpers
 *   pinActions.ts   — login & PIN management
 *   profileActions.ts — profile CRUD & onboarding
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { isSupabaseConfigured, supabase } from '../supabase/client';
import { authLogger } from '../utils/logger';

// Re-export the UserProfile type so existing imports still work
export type { UserProfile } from './auth/authTypes';
import type { AuthState, UserProfile } from './auth/authTypes';
import { findStoredUserByEmail } from './auth/authStorage';
import { createLoginAction, createSetOfflinePinAction } from './auth/pinActions';
import {
  createCreateProfileAction,
  createUpdateProfileAction,
  createCompleteOnboardingAction,
  createCheckExistingUserAction,
} from './auth/profileActions';

// ============================================
// STORE
// ============================================

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => {
      const api = { set, get };

      return {
        // Initial state
        currentUser: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
        authUserId: null,
        authEmail: null,
        hasResolvedSupabaseSession: !isSupabaseConfigured,

        // --- PIN / Login actions (delegated) ---
        login: createLoginAction(api),
        setOfflinePin: createSetOfflinePinAction(api),

        // --- Profile actions (delegated) ---
        createProfile: createCreateProfileAction(api),
        updateProfile: createUpdateProfileAction(api),
        completeOnboarding: createCompleteOnboardingAction(api),
        checkExistingUser: createCheckExistingUserAction(),

        // --- Session actions (kept inline — small & tightly coupled to state) ---

        loginWithProfile: (profile: UserProfile) => {
          set({
            currentUser: profile,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        },

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

        clearError: () => {
          set({ error: null });
        },
      };
    },
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

