import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Session as SupabaseSession } from '@supabase/supabase-js';
import type { UserProfile } from '@/lib/stores';

const supabaseFromMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/supabase/client', () => ({
  isSupabaseConfigured: true,
  supabase: {
    from: supabaseFromMock,
  },
}));

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
    supabaseFromMock.mockReset();
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

  it('creates a cloud-linked profile without requiring an offline PIN', async () => {
    useAuthStore.setState({
      authEmail: 'nolocalpin@example.com',
      authUserId: 'supabase-user-1',
    });

    const profile = await useAuthStore.getState().createProfile(
      {
        firstName: 'No',
        lastName: 'Pin',
        email: 'nolocalpin@example.com',
      },
      undefined
    );

    const storedUsers = JSON.parse(localStorageMock.getItem('golf-app-users') ?? '{}');
    expect(storedUsers[profile.id]).toEqual(
      expect.objectContaining({
        profile: expect.objectContaining({ email: 'nolocalpin@example.com' }),
        pin: null,
      })
    );
  });

  it('rejects offline PIN login when the account has no local PIN on this device', async () => {
    const localProfile = createProfile({
      email: 'magic@example.com',
    });

    localStorageMock.setItem(
      'golf-app-users',
      JSON.stringify({
        [localProfile.id]: {
          profile: localProfile,
          pin: null,
        },
      })
    );

    await expect(useAuthStore.getState().login(localProfile.email!, '1234')).resolves.toBe(false);

    expect(useAuthStore.getState()).toMatchObject({
      currentUser: null,
      isAuthenticated: false,
      error: 'Offline PIN is not set for this account on this device. Use the email sign-in link.',
    });
  });

  it('saves an offline PIN for an existing signed-in profile', async () => {
    const localProfile = createProfile({
      email: 'saved@example.com',
    });

    localStorageMock.setItem(
      'golf-app-users',
      JSON.stringify({
        [localProfile.id]: {
          profile: localProfile,
          pin: null,
        },
      })
    );

    useAuthStore.setState({
      currentUser: localProfile,
      isAuthenticated: true,
      authEmail: localProfile.email,
      authUserId: 'supabase-user-1',
    });

    await useAuthStore.getState().setOfflinePin('4321');

    const storedUsers = JSON.parse(localStorageMock.getItem('golf-app-users') ?? '{}');
    expect(storedUsers[localProfile.id].pin).toMatch(/^pbkdf2\$/);
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

  it('hydrates a UserProfile from cloud Player rows when the device has no local profile', async () => {
    // Reproduces: laptop user installs the PWA on their phone, signs in,
    // and currently gets shoved into "create profile" because localStorage
    // is empty even though a Player row already encodes their identity.
    useAuthStore.setState({
      authUserId: 'auth-uid-9000',
      authEmail: 'wil@example.com',
      hasResolvedSupabaseSession: true,
    });

    const maybeSingleMock = vi.fn().mockResolvedValue({
      data: {
        id: 'player-cloud-7',
        trip_id: 'trip-1',
        linked_auth_user_id: 'auth-uid-9000',
        linked_profile_id: 'profile-cloud-7',
        first_name: 'Wil',
        last_name: 'Kamin',
        email: 'wil@example.com',
        handicap_index: 8.5,
        ghin: '12345678',
        tee_preference: 'middle',
        avatar_url: null,
        created_at: '2026-04-25T12:00:00.000Z',
        updated_at: '2026-04-29T18:00:00.000Z',
      },
      error: null,
    });
    const limitMock = vi.fn().mockReturnValue({ maybeSingle: maybeSingleMock });
    const orderMock = vi.fn().mockReturnValue({ limit: limitMock });
    const eqMock = vi.fn().mockReturnValue({ order: orderMock });
    const selectMock = vi.fn().mockReturnValue({ eq: eqMock });
    supabaseFromMock.mockReturnValue({ select: selectMock });

    const profile = await useAuthStore.getState().hydrateProfileFromCloud();

    expect(supabaseFromMock).toHaveBeenCalledWith('players');
    expect(eqMock).toHaveBeenCalledWith('linked_auth_user_id', 'auth-uid-9000');
    expect(profile).toMatchObject({
      id: 'profile-cloud-7',
      firstName: 'Wil',
      lastName: 'Kamin',
      email: 'wil@example.com',
      handicapIndex: 8.5,
      ghin: '12345678',
      teePreference: 'middle',
      preferredTees: 'middle',
      isProfileComplete: true,
      hasCompletedOnboarding: true,
    });
    expect(useAuthStore.getState()).toMatchObject({
      currentUser: expect.objectContaining({ id: 'profile-cloud-7' }),
      isAuthenticated: true,
    });

    // Persisted to localStorage so the next cold start skips the
    // hydration round-trip and works offline.
    const storedUsers = JSON.parse(localStorageMock.getItem('golf-app-users') ?? '{}');
    expect(storedUsers['profile-cloud-7']).toMatchObject({
      profile: expect.objectContaining({
        firstName: 'Wil',
        lastName: 'Kamin',
        handicapIndex: 8.5,
      }),
    });
  });

  it('does not clobber an existing local profile during cloud rehydration', async () => {
    // A local profile already exists; the cloud row could be slightly
    // behind a pending unsynced edit, so leave the local one in place.
    const localProfile = createProfile({ handicapIndex: 6.1 });
    localStorageMock.setItem(
      'golf-app-users',
      JSON.stringify({
        [localProfile.id]: { profile: localProfile, pin: null },
      })
    );
    useAuthStore.setState({
      currentUser: localProfile,
      isAuthenticated: true,
      authUserId: 'auth-uid-9000',
      authEmail: localProfile.email,
    });

    const profile = await useAuthStore.getState().hydrateProfileFromCloud();

    expect(profile).toBe(localProfile);
    expect(supabaseFromMock).not.toHaveBeenCalled();
  });

  it('returns null when cloud has no Player row for this auth user (genuinely new account)', async () => {
    useAuthStore.setState({
      authUserId: 'auth-uid-newcomer',
      authEmail: 'new@example.com',
    });

    const maybeSingleMock = vi.fn().mockResolvedValue({ data: null, error: null });
    const limitMock = vi.fn().mockReturnValue({ maybeSingle: maybeSingleMock });
    const orderMock = vi.fn().mockReturnValue({ limit: limitMock });
    const eqMock = vi.fn().mockReturnValue({ order: orderMock });
    const selectMock = vi.fn().mockReturnValue({ eq: eqMock });
    supabaseFromMock.mockReturnValue({ select: selectMock });

    const profile = await useAuthStore.getState().hydrateProfileFromCloud();

    expect(profile).toBeNull();
    expect(useAuthStore.getState().currentUser).toBeNull();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });
});
