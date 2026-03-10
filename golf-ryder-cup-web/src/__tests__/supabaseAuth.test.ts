import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getSessionMock, signInWithOtpMock, exchangeCodeForSessionMock, verifyOtpMock, setSessionMock } = vi.hoisted(() => ({
  getSessionMock: vi.fn(),
  signInWithOtpMock: vi.fn(),
  exchangeCodeForSessionMock: vi.fn(),
  verifyOtpMock: vi.fn(),
  setSessionMock: vi.fn(),
}));

vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: getSessionMock,
      signInWithOtp: signInWithOtpMock,
      exchangeCodeForSession: exchangeCodeForSessionMock,
      verifyOtp: verifyOtpMock,
      setSession: setSessionMock,
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

  it('builds the shared callback redirect path', async () => {
    const { buildMagicLinkRedirectPath } = await import('@/lib/supabase/auth');

    expect(buildMagicLinkRedirectPath('/score/123')).toBe(
      '/auth/callback?next=%2Fscore%2F123'
    );
    expect(buildMagicLinkRedirectPath()).toBe('/auth/callback');
  });

  it('completes auth by exchanging a callback code', async () => {
    exchangeCodeForSessionMock.mockResolvedValue({
      data: {},
      error: null,
    });

    const { completeSupabaseAuthFromUrl } = await import('@/lib/supabase/auth');

    await expect(
      completeSupabaseAuthFromUrl('http://localhost:3000/auth/callback?code=test-code')
    ).resolves.toEqual({
      status: 'success',
      message: 'Secure sign-in complete.',
    });

    expect(exchangeCodeForSessionMock).toHaveBeenCalledWith('test-code');
  });

  it('completes auth from hash access tokens for native deep links', async () => {
    setSessionMock.mockResolvedValue({
      data: {},
      error: null,
    });

    const { completeSupabaseAuthFromUrl } = await import('@/lib/supabase/auth');

    await expect(
      completeSupabaseAuthFromUrl(
        'rydercup://auth/callback#access_token=access-token&refresh_token=refresh-token'
      )
    ).resolves.toEqual({
      status: 'success',
      message: 'Secure sign-in complete.',
    });

    expect(setSessionMock).toHaveBeenCalledWith({
      access_token: 'access-token',
      refresh_token: 'refresh-token',
    });
  });

  it('verifies otp callbacks when token hash links are used', async () => {
    verifyOtpMock.mockResolvedValue({
      data: {},
      error: null,
    });

    const { completeSupabaseAuthFromUrl } = await import('@/lib/supabase/auth');

    await expect(
      completeSupabaseAuthFromUrl(
        'http://localhost:3000/auth/callback?token_hash=test-hash&type=magiclink'
      )
    ).resolves.toEqual({
      status: 'success',
      message: 'Secure sign-in complete.',
    });

    expect(verifyOtpMock).toHaveBeenCalledWith({
      token_hash: 'test-hash',
      type: 'magiclink',
    });
  });

  it('returns explicit callback errors from the auth URL', async () => {
    const { completeSupabaseAuthFromUrl } = await import('@/lib/supabase/auth');

    await expect(
      completeSupabaseAuthFromUrl(
        'http://localhost:3000/auth/callback?error_description=Link%20expired'
      )
    ).resolves.toEqual({
      status: 'error',
      message: 'Link expired',
    });
  });
});
