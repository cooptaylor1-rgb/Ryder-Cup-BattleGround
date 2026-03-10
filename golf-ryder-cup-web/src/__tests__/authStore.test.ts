import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Session as SupabaseSession } from '@supabase/supabase-js';
import type { UserProfile } from '@/lib/stores';

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

function createProfile(overrides?: Partial<UserProfile>): UserProfile {
  return {
    id: 'player-1',
    firstName: 'Coop',
    lastName: 'Taylor',
    email: 'coop@example.com',
    handicapIndex: 7.4,
    createdAt: '2026-03-01T00:00:00.000Z',
    updatedAt: '2026-03-01T00:00:00.000Z',
    isProfileComplete: true,
    hasCompletedOnboarding: true,
    ...overrides,
  };
}

function createSession(email: string, userId: string = 'supabase-user-1'): SupabaseSession {
  return {
    access_token: 'test-access-token',
    user: {
      id: userId,
      email,
    },
  } as SupabaseSession;
}

let useAuthStore: (typeof import('@/lib/stores'))['useAuthStore'];

function resetAuthStore() {
  useAuthStore.setState({
    currentUser: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
    authUserId: null,
    authEmail: null,
    hasResolvedSupabaseSession: true,
  });
}

describe('authStore syncSupabaseSession', () => {
  beforeEach(async () => {
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true,
    });
    Object.defineProperty(globalThis, 'localStorage', {
      value: localStorageMock,
      writable: true,
    });

    localStorageMock.clear();
    vi.resetModules();
    ({ useAuthStore } = await import('@/lib/stores'));
    resetAuthStore();
  });

  it('hydrates the matching local profile from a Supabase session email', () => {
    const storedProfile = createProfile();

    localStorageMock.setItem(
      'golf-app-users',
      JSON.stringify({
        [storedProfile.id]: {
          profile: storedProfile,
          pin: 'hashed-pin',
        },
      })
    );

    useAuthStore.getState().syncSupabaseSession(createSession('COOP@example.com'));

    expect(useAuthStore.getState()).toMatchObject({
      currentUser: storedProfile,
      isAuthenticated: true,
      authUserId: 'supabase-user-1',
      authEmail: 'COOP@example.com',
      hasResolvedSupabaseSession: true,
    });
  });

  it('clears a stale local user when the Supabase session belongs to another email', () => {
    const localProfile = createProfile();

    useAuthStore.setState({
      currentUser: localProfile,
      isAuthenticated: true,
      hasResolvedSupabaseSession: false,
    });

    useAuthStore.getState().syncSupabaseSession(createSession('other@example.com'));

    expect(useAuthStore.getState()).toMatchObject({
      currentUser: null,
      isAuthenticated: false,
      authUserId: 'supabase-user-1',
      authEmail: 'other@example.com',
      hasResolvedSupabaseSession: true,
    });
  });

  it('preserves local-only auth when no Supabase session exists', () => {
    const localProfile = createProfile();

    useAuthStore.setState({
      currentUser: localProfile,
      isAuthenticated: true,
      authUserId: 'supabase-user-1',
      authEmail: 'coop@example.com',
      hasResolvedSupabaseSession: false,
    });

    useAuthStore.getState().syncSupabaseSession(null);

    expect(useAuthStore.getState()).toMatchObject({
      currentUser: localProfile,
      isAuthenticated: true,
      authUserId: null,
      authEmail: null,
      hasResolvedSupabaseSession: true,
    });
  });
});
