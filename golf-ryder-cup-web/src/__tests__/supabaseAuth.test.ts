import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getSessionMock } = vi.hoisted(() => ({
  getSessionMock: vi.fn(),
}));

vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: getSessionMock,
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
});
