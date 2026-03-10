import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getSessionMock, signInWithOtpMock } = vi.hoisted(() => ({
  getSessionMock: vi.fn(),
  signInWithOtpMock: vi.fn(),
}));

vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: getSessionMock,
      signInWithOtp: signInWithOtpMock,
    },
  },
}));

describe('supabase auth helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the active access token when a session exists', async () => {
    getSessionMock.mockResolvedValue({
      data: {
        session: {
          access_token: 'live-access-token',
          user: {
            id: 'user-1',
            email: 'coop@example.com',
          },
        },
      },
      error: null,
    });

    const { getSupabaseAccessToken, getSupabaseSessionIdentity } = await import(
      '@/lib/supabase/auth'
    );

    await expect(getSupabaseAccessToken()).resolves.toBe('live-access-token');
    await expect(getSupabaseSessionIdentity()).resolves.toEqual({
      accessToken: 'live-access-token',
      userId: 'user-1',
      email: 'coop@example.com',
    });
  });

  it('returns null when the Supabase client has no active session', async () => {
    getSessionMock.mockResolvedValue({
      data: { session: null },
      error: null,
    });

    const { getSupabaseAccessToken } = await import('@/lib/supabase/auth');

    await expect(getSupabaseAccessToken()).resolves.toBeNull();
  });

  it('requests a Supabase email sign-in link with redirect metadata', async () => {
    signInWithOtpMock.mockResolvedValue({
      data: {},
      error: null,
    });

    const { requestEmailSignInLink } = await import('@/lib/supabase/auth');

    await requestEmailSignInLink('  CoOp@Example.com ', '/login?next=%2Fscore');

    expect(signInWithOtpMock).toHaveBeenCalledWith({
      email: 'coop@example.com',
      options: {
        emailRedirectTo: 'http://localhost:3000/login?next=%2Fscore',
        shouldCreateUser: true,
      },
    });
  });
});
