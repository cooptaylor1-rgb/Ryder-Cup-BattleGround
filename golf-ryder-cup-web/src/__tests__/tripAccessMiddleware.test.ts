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
  linkedPlayerId?: string | null;
  membershipFound?: boolean;
}) {
  const insertedMemberships: Array<Record<string, unknown>> = [];

  return {
    insertedMemberships,
    from: vi.fn((table: string) => {
      if (table === 'trips') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data:
                  options.tripShareCode === undefined
                    ? null
                    : { id: 'trip-1', share_code: options.tripShareCode },
                error: options.tripShareCode === undefined ? { message: 'Not found' } : null,
              }),
            })),
          })),
        };
      }

      if (table === 'trip_memberships') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                in: vi.fn(() => ({
                  limit: vi.fn().mockResolvedValue({
                    data: options.membershipFound ? [{ id: 'membership-1' }] : [],
                    error: null,
                  }),
                })),
              })),
            })),
          })),
          insert: vi.fn((row: Record<string, unknown>) => {
            insertedMemberships.push(row);
            return Promise.resolve({ data: null, error: null });
          }),
        };
      }

      if (table === 'players') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                limit: vi.fn().mockResolvedValue({
                  data: options.linkedPlayerId ? [{ id: options.linkedPlayerId }] : [],
                  error: null,
                }),
              })),
              ilike: vi.fn(() => ({
                limit: vi.fn().mockResolvedValue({
                  data: options.linkedPlayerId ? [{ id: options.linkedPlayerId }] : [],
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

  it('authorizes authenticated users via trip_memberships', async () => {
    createClientMock
      .mockReturnValueOnce(
        createDataClient({
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

  it('backfills a membership for authenticated users already linked to a trip player', async () => {
    const dataClient = createDataClient({
      linkedPlayerId: 'player-123',
      membershipFound: false,
    });
    createClientMock
      .mockReturnValueOnce(dataClient)
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
    expect(dataClient.insertedMemberships).toContainEqual({
      trip_id: 'trip-1',
      auth_user_id: 'auth-user-999',
      player_id: 'player-123',
      role: 'player',
      status: 'active',
    });
  });

  it('redeems a legacy share-code header into a membership instead of bypassing roles', async () => {
    const dataClient = createDataClient({
      tripShareCode: 'ABCDEFGH',
      linkedPlayerId: null,
      membershipFound: false,
    });
    createClientMock
      .mockReturnValueOnce(dataClient)
      .mockReturnValueOnce(
        createAuthClient({
          id: 'auth-user-999',
          email: 'player@example.com',
        })
      );

    const { verifyTripAccess } = await loadMiddleware();
    const result = await verifyTripAccess(
      createRequest({ Authorization: 'Bearer test-token', 'X-Share-Code': 'ABCDEFGH' }),
      'trip-1'
    );

    expect(result.authorized).toBe(true);
    expect(dataClient.insertedMemberships).toContainEqual({
      trip_id: 'trip-1',
      auth_user_id: 'auth-user-999',
      player_id: null,
      role: 'player',
      status: 'active',
    });
  });

  it('does not authorize unauthenticated share-code-only access', async () => {
    createClientMock.mockReturnValueOnce(
      createDataClient({
        tripShareCode: 'ABCDEFGH',
        membershipFound: false,
      })
    );

    const { verifyTripAccess } = await loadMiddleware();
    const result = await verifyTripAccess(createRequest({ 'X-Share-Code': 'ABCDEFGH' }), 'trip-1');

    expect(result.authorized).toBe(false);
    expect(result.error).toBe('Authorization required for trip access');
  });

  it('denies authenticated users who are not members and do not have a valid share code', async () => {
    createClientMock
      .mockReturnValueOnce(
        createDataClient({
          linkedPlayerId: null,
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
