import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const { createClientMock } = vi.hoisted(() => ({
  createClientMock: vi.fn(),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: createClientMock,
}));

function createRequest(headers?: Record<string, string>): NextRequest {
  return new NextRequest('http://localhost:3000/api/test', {
    method: 'POST',
    headers,
  });
}

function createDataClient(options: {
  tripShareCode?: string | null;
  playerIdsByEmail?: string[];
  membershipFound?: boolean;
}) {
  return {
    from: vi.fn((table: string) => {
      if (table === 'trips') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: options.tripShareCode === undefined ? null : { id: 'trip-1', share_code: options.tripShareCode },
                error: options.tripShareCode === undefined ? { message: 'Not found' } : null,
              }),
            })),
          })),
        };
      }

      if (table === 'players') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              limit: vi.fn().mockResolvedValue({
                data: (options.playerIdsByEmail ?? []).map((id) => ({ id })),
                error: null,
              }),
            })),
          })),
        };
      }

      if (table === 'team_members') {
        return {
          select: vi.fn(() => ({
            in: vi.fn(() => ({
              eq: vi.fn(() => ({
                limit: vi.fn().mockResolvedValue({
                  data: options.membershipFound ? [{ id: 'membership-1' }] : [],
                  error: null,
                }),
              })),
            })),
          })),
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    }),
  };
}

function createAuthClient(user: { id: string; email?: string | null } | null) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user },
        error: user ? null : { message: 'Invalid token' },
      }),
    },
  };
}

async function loadMiddleware() {
  return import('@/lib/utils/apiMiddleware');
}

describe('Trip Access Middleware', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon-key');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-role-key');
  });

  it('authorizes matching share code access', async () => {
    createClientMock.mockReturnValueOnce(
      createDataClient({ tripShareCode: 'ABCDEFGH', membershipFound: false })
    );

    const { verifyTripAccess } = await loadMiddleware();
    const result = await verifyTripAccess(
      createRequest({ 'X-Share-Code': 'ABCDEFGH' }),
      'trip-1'
    );

    expect(result.authorized).toBe(true);
  });

  it('authorizes authenticated users via email-linked trip membership', async () => {
    createClientMock
      .mockReturnValueOnce(
        createDataClient({
          playerIdsByEmail: ['player-123'],
          membershipFound: true,
        })
      )
      .mockReturnValueOnce(
        createAuthClient({
          id: 'auth-user-999',
          email: 'player@example.com',
        })
      );

    const { verifyTripAccess } = await loadMiddleware();
    const result = await verifyTripAccess(
      createRequest({ Authorization: 'Bearer test-token' }),
      'trip-1'
    );

    expect(result.authorized).toBe(true);
  });

  it('authorizes authenticated users when auth user id already matches a player id', async () => {
    createClientMock
      .mockReturnValueOnce(
        createDataClient({
          playerIdsByEmail: [],
          membershipFound: true,
        })
      )
      .mockReturnValueOnce(
        createAuthClient({
          id: 'player-123',
          email: 'nomatch@example.com',
        })
      );

    const { verifyTripAccess } = await loadMiddleware();
    const result = await verifyTripAccess(
      createRequest({ Authorization: 'Bearer test-token' }),
      'trip-1'
    );

    expect(result.authorized).toBe(true);
  });

  it('denies authenticated users who are not linked to a trip player', async () => {
    createClientMock
      .mockReturnValueOnce(
        createDataClient({
          playerIdsByEmail: [],
          membershipFound: false,
        })
      )
      .mockReturnValueOnce(
        createAuthClient({
          id: 'auth-user-999',
          email: 'outsider@example.com',
        })
      );

    const { verifyTripAccess } = await loadMiddleware();
    const result = await verifyTripAccess(
      createRequest({ Authorization: 'Bearer test-token' }),
      'trip-1'
    );

    expect(result.authorized).toBe(false);
    expect(result.error).toBe('Access denied to this trip');
  });
});
