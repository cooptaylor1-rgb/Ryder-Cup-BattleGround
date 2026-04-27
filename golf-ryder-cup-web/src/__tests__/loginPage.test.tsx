import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const routerPushMock = vi.fn();
const routerReplaceMock = vi.fn();
const searchParamsMock = vi.hoisted(() => ({
  value: new URLSearchParams(),
}));

const authStateMock = vi.hoisted(() => ({
  value: {
    login: vi.fn(),
    isAuthenticated: false,
    currentUser: null as ReturnType<typeof localProfile> | null,
    isLoading: false,
    error: null,
    clearError: vi.fn(),
    authUserId: null,
    authEmail: null,
    hasResolvedSupabaseSession: true,
  },
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: routerPushMock,
    replace: routerReplaceMock,
    back: vi.fn(),
  }),
  useParams: () => ({}),
  usePathname: () => '/login',
  useSearchParams: () => searchParamsMock.value,
}));

vi.mock('@/lib/stores', () => ({
  useAuthStore: Object.assign(() => authStateMock.value, {
    setState: vi.fn((updates: Record<string, unknown>) => {
      authStateMock.value = { ...authStateMock.value, ...updates };
    }),
  }),
}));

vi.mock('@/lib/supabase/client', () => ({
  isSupabaseConfigured: true,
}));

vi.mock('@/lib/supabase/auth', () => ({
  sendPasswordResetEmail: vi.fn(),
  signInWithEmailPassword: vi.fn(),
  signUpWithEmailPassword: vi.fn(),
}));

import LoginPage from '@/app/login/page';

function localProfile() {
  const now = '2026-04-27T12:00:00.000Z';
  return {
    id: 'profile-1',
    firstName: 'Cooper',
    lastName: 'Taylor',
    email: 'cooper@example.com',
    handicapIndex: 6.6,
    isProfileComplete: true,
    hasCompletedOnboarding: true,
    createdAt: now,
    updatedAt: now,
  };
}

describe('LoginPage cloud sign-in handoff', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    searchParamsMock.value = new URLSearchParams();
    authStateMock.value = {
      login: vi.fn(),
      isAuthenticated: false,
      currentUser: null,
      isLoading: false,
      error: null,
      clearError: vi.fn(),
      authUserId: null,
      authEmail: null,
      hasResolvedSupabaseSession: true,
    };
  });

  it('keeps locally signed-in users on login when cloud sign-in is required', async () => {
    searchParamsMock.value = new URLSearchParams('cloud=1&next=%2Fscore');
    authStateMock.value = {
      ...authStateMock.value,
      isAuthenticated: true,
      currentUser: localProfile(),
      authUserId: null,
    };

    render(<LoginPage />);

    expect(await screen.findByRole('heading', { name: 'Finish Cloud Sign-In' })).toBeVisible();
    expect(
      screen.getByText('Local profile is signed in. Cloud saving still needs your account session.')
    ).toBeVisible();
    expect(screen.getByLabelText('Email')).toHaveValue('cooper@example.com');
    expect(routerPushMock).not.toHaveBeenCalled();
  });

  it('still redirects an already signed-in local profile outside the cloud handoff', async () => {
    searchParamsMock.value = new URLSearchParams('next=%2Fscore');
    authStateMock.value = {
      ...authStateMock.value,
      isAuthenticated: true,
      currentUser: localProfile(),
      authUserId: null,
    };

    render(<LoginPage />);

    await waitFor(() => expect(routerPushMock).toHaveBeenCalledWith('/score'));
  });
});
