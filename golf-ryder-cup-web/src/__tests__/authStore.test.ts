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

  it('creates a profile using the linked Supabase email when one is present', async () => {
    useAuthStore.setState({
      authEmail: 'linked@example.com',
      authUserId: 'supabase-user-1',
    });

    const profile = await useAuthStore.getState().createProfile(
      {
        firstName: 'Linked',
        lastName: 'User',
        email: 'different@example.com',
      },
      '1234'
    );

    expect(profile.email).toBe('linked@example.com');
    expect(useAuthStore.getState()).toMatchObject({
      currentUser: expect.objectContaining({ email: 'linked@example.com' }),
      isAuthenticated: true,
    });

    const storedUsers = JSON.parse(localStorageMock.getItem('golf-app-users') ?? '{}');
    expect(Object.values(storedUsers)).toEqual([
      expect.objectContaining({
        profile: expect.objectContaining({ email: 'linked@example.com' }),
      }),
    ]);
  });

  it('rejects profile email changes that diverge from the linked Supabase account', async () => {
    const localProfile = createProfile();

    localStorageMock.setItem(
      'golf-app-users',
      JSON.stringify({
        [localProfile.id]: {
          profile: localProfile,
          pin: 'hashed-pin',
        },
      })
    );

    useAuthStore.setState({
      currentUser: localProfile,
      isAuthenticated: true,
      authEmail: localProfile.email,
      authUserId: 'supabase-user-1',
    });

    await expect(
      useAuthStore.getState().updateProfile({ email: 'other@example.com' })
    ).rejects.toThrow('Email is managed by your signed-in account');

    expect(useAuthStore.getState()).toMatchObject({
      currentUser: localProfile,
      error: 'Email is managed by your signed-in account',
    });
  });

  it('rejects duplicate email updates even without a linked Supabase session', async () => {
    const localProfile = createProfile();
    const existingProfile = createProfile({
      id: 'player-2',
      email: 'existing@example.com',
    });

    localStorageMock.setItem(
      'golf-app-users',
      JSON.stringify({
        [localProfile.id]: {
          profile: localProfile,
          pin: 'hashed-pin',
        },
        [existingProfile.id]: {
          profile: existingProfile,
          pin: 'hashed-pin',
        },
      })
    );

    useAuthStore.setState({
      currentUser: localProfile,
      isAuthenticated: true,
    });

    await expect(
      useAuthStore.getState().updateProfile({ email: existingProfile.email })
    ).rejects.toThrow('An account with this email already exists');

    expect(useAuthStore.getState()).toMatchObject({
      currentUser: localProfile,
      error: 'An account with this email already exists',
    });
  });
});
