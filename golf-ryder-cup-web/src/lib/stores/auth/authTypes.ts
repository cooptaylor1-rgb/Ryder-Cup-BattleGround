/**
 * Auth store types — shared by all auth-related modules.
 */

import type { Player } from '../../types/models';

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

export interface StoredUserRecord {
  profile: UserProfile;
  pin?: string | null;
}

export interface AuthState {
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
  syncSupabaseSession: (session: import('@supabase/supabase-js').Session | null) => void;
  clearError: () => void;
}
