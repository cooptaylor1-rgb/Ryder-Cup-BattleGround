/**
 * Auth Store
 *
 * Manages user authentication and current user profile.
 * Uses localStorage for persistence (local-first approach).
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Player } from '../types/models';
import { db } from '../db';
import { authLogger } from '../utils/logger';

// ============================================
// TYPES
// ============================================

export interface UserProfile extends Omit<Player, 'createdAt' | 'updatedAt'> {
    isProfileComplete: boolean;
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

interface AuthState {
    // State
    currentUser: UserProfile | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;

    // Actions
    login: (email: string, pin: string) => Promise<boolean>;
    loginWithProfile: (profile: UserProfile) => void;
    logout: () => void;
    createProfile: (profile: Omit<UserProfile, 'id' | 'createdAt' | 'updatedAt' | 'isProfileComplete'>) => Promise<UserProfile>;
    updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
    checkExistingUser: (email: string) => Promise<UserProfile | null>;
    clearError: () => void;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

const generateId = (): string => {
    return crypto.randomUUID();
};

const generatePin = (): string => {
    return Math.floor(1000 + Math.random() * 9000).toString();
};

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

            // Login with email and PIN
            login: async (email: string, pin: string) => {
                set({ isLoading: true, error: null });

                try {
                    // Look up user by email in local storage
                    const storedUsers = localStorage.getItem('golf-app-users');
                    let users: Record<string, { profile: UserProfile; pin: string }> = {};
                    if (storedUsers) {
                        try {
                            users = JSON.parse(storedUsers);
                        } catch (parseError) {
                            authLogger.error('Failed to parse stored users:', parseError);
                            set({ isLoading: false, error: 'Login data corrupted. Please contact support.' });
                            return false;
                        }
                    }

                    const userEntry = Object.values(users).find(
                        u => u.profile.email?.toLowerCase() === email.toLowerCase()
                    );

                    if (!userEntry) {
                        set({ isLoading: false, error: 'No account found with this email' });
                        return false;
                    }

                    if (userEntry.pin !== pin) {
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
                set({
                    currentUser: null,
                    isAuthenticated: false,
                    error: null,
                });
            },

            // Create new profile
            createProfile: async (profileData) => {
                set({ isLoading: true, error: null });

                try {
                    const now = new Date().toISOString();
                    const id = generateId();
                    const pin = generatePin();

                    const profile: UserProfile = {
                        ...profileData,
                        id,
                        isProfileComplete: !!(
                            profileData.firstName &&
                            profileData.lastName &&
                            profileData.email &&
                            profileData.handicapIndex !== undefined
                        ),
                        createdAt: now,
                        updatedAt: now,
                    };

                    // Save to local users storage
                    const storedUsers = localStorage.getItem('golf-app-users');
                    let users: Record<string, { profile: UserProfile; pin: string }> = {};
                    if (storedUsers) {
                        try {
                            users = JSON.parse(storedUsers);
                        } catch (parseError) {
                            authLogger.error('Failed to parse stored users:', parseError);
                            // Continue with empty users object since we're creating a new user
                        }
                    }

                    // Check if email already exists
                    const existingUser = Object.values(users).find(
                        u => u.profile.email?.toLowerCase() === profile.email?.toLowerCase()
                    );

                    if (existingUser) {
                        set({ isLoading: false, error: 'An account with this email already exists' });
                        throw new Error('An account with this email already exists');
                    }

                    users[id] = { profile, pin };
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

                    // Return the PIN so it can be shown to the user
                    // Note: authLogger.log is silent in production - PIN only shows in dev
                    authLogger.log(`New user PIN: ${pin}`);
                    alert(`Your PIN is: ${pin}\n\nSave this PIN to log in again!`);

                    return profile;
                } catch (error) {
                    set({
                        isLoading: false,
                        error: error instanceof Error ? error.message : 'Failed to create profile',
                    });
                    throw error;
                }
            },

            // Update existing profile
            updateProfile: async (updates) => {
                const { currentUser } = get();
                if (!currentUser) {
                    set({ error: 'No user logged in' });
                    return;
                }

                set({ isLoading: true, error: null });

                try {
                    const updatedProfile: UserProfile = {
                        ...currentUser,
                        ...updates,
                        updatedAt: new Date().toISOString(),
                        isProfileComplete: !!(
                            (updates.firstName ?? currentUser.firstName) &&
                            (updates.lastName ?? currentUser.lastName) &&
                            (updates.email ?? currentUser.email) &&
                            (updates.handicapIndex ?? currentUser.handicapIndex) !== undefined
                        ),
                    };

                    // Update local users storage
                    const storedUsers = localStorage.getItem('golf-app-users');
                    let users: Record<string, { profile: UserProfile; pin: string }> = {};
                    if (storedUsers) {
                        try {
                            users = JSON.parse(storedUsers);
                        } catch (parseError) {
                            authLogger.error('Failed to parse stored users:', parseError);
                            // Continue - we'll try to save anyway
                        }
                    }

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
                    set({
                        isLoading: false,
                        error: error instanceof Error ? error.message : 'Failed to update profile',
                    });
                }
            },

            // Check if user exists by email
            checkExistingUser: async (email: string) => {
                try {
                    const storedUsers = localStorage.getItem('golf-app-users');
                    if (!storedUsers) return null;

                    const users: Record<string, { profile: UserProfile; pin: string }> = JSON.parse(storedUsers);

                    const userEntry = Object.values(users).find(
                        u => u.profile.email?.toLowerCase() === email.toLowerCase()
                    );

                    return userEntry?.profile || null;
                } catch (error) {
                    authLogger.error('Failed to parse stored users:', error);
                    return null;
                }
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
            }),
        }
    )
);
