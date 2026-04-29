import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const { createClientMock } = vi.hoisted(() => ({
  createClientMock: vi.fn(),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: createClientMock,
}));

import { GET, POST } from '@/app/api/trips/join/route';

const tripRow = {
  id: '550e8400-e29b-41d4-a716-446655440010',
  name: 'Pinehurst Cup',
  start_date: '2026-05-01',
  end_date: '2026-05-03',
  location: 'Pinehurst, NC',
  captain_name: 'Coop',
  share_code: 'ABCD1234',
};

function createRequest(method: 'GET' | 'POST', body?: unknown, token = 'token') {
  const url =
    method === 'GET'
      ? 'http://localhost:3000/api/trips/join?code=ABCD1234&invite=550e8400-e29b-41d4-a716-446655440011'
      : 'http://localhost:3000/api/trips/join';

  return new NextRequest(url, {
    method,
    headers:
      method === 'POST'
        ? {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          }
        : undefined,
    body: method === 'POST' ? JSON.stringify(body ?? { code: 'ABCD1234' }) : undefined,
  });
}

function createAuthClient(user: { id: string; email?: string | null } | null = {
  id: 'auth-user-1',
  email: 'player@example.com',
}) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user },
        error: user ? null : { message: 'Invalid token' },
      }),
    },
  };
}

function createAdminClient(options?: {
  trip?: typeof tripRow | null;
  membership?: { id: string; role: string; status: string; player_id?: string | null } | null;
  linkedPlayerId?: string | null;
  insertError?: { message: string } | null;
}) {
  const insertedMemberships: Array<Record<string, unknown>> = [];
  const invitationUpdates: Array<Record<string, unknown>> = [];
  const admin = {
    insertedMemberships,
    invitationUpdates,
    from: vi.fn((table: string) => {
      if (table === 'trips') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn().mockResolvedValue({
                data: options?.trip === undefined ? tripRow : options.trip,
                error: null,
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
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: options?.membership ?? null,
                    error: null,
                  }),
                })),
              })),
            })),
          })),
          insert: vi.fn((row: Record<string, unknown>) => {
            insertedMemberships.push(row);
            return {
              select: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: 'membership-1',
                    role: 'player',
                    status: 'active',
                    player_id: row.player_id ?? null,
                  },
                  error: options?.insertError ?? null,
                }),
              })),
            };
          }),
        };
      }

      if (table === 'players') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                limit: vi.fn().mockResolvedValue({
                  data: options?.linkedPlayerId ? [{ id: options.linkedPlayerId }] : [],
                  error: null,
                }),
              })),
              ilike: vi.fn(() => ({
                limit: vi.fn().mockResolvedValue({
                  data: options?.linkedPlayerId ? [{ id: options.linkedPlayerId }] : [],
                  error: null,
                }),
              })),
            })),
          })),
        };
      }

      if (table === 'trip_invitations') {
        const updateFilter = {
          eq: vi.fn(() => updateFilter),
          in: vi.fn(() => updateFilter),
          ilike: vi.fn(() => Promise.resolve({ data: null, error: null })),
        };
        return {
          update: vi.fn((row: Record<string, unknown>) => {
            invitationUpdates.push(row);
            return updateFilter;
          }),
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    }),
  };

  return admin;
}

describe('/api/trips/join', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon-key');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-role-key');
    createClientMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('returns a public trip preview without exposing share_code', async () => {
    const admin = createAdminClient();
    createClientMock.mockReturnValue(admin);

    const response = await GET(createRequest('GET'));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.trip).toEqual({
      id: tripRow.id,
      name: tripRow.name,
      startDate: tripRow.start_date,
      endDate: tripRow.end_date,
      location: tripRow.location,
      captainName: tripRow.captain_name,
    });
    expect(JSON.stringify(data)).not.toContain('share_code');
  });

  it('redeems a share code into a trip membership for the signed-in user', async () => {
    const admin = createAdminClient({ linkedPlayerId: 'player-1' });
    createClientMock.mockImplementation((_url: string, key: string) =>
      key === 'service-role-key' ? admin : createAuthClient()
    );

    const response = await POST(createRequest('POST'));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.tripId).toBe(tripRow.id);
    expect(data.membership.role).toBe('player');
    expect(admin.insertedMemberships).toEqual([
      {
        trip_id: tripRow.id,
        auth_user_id: 'auth-user-1',
        player_id: 'player-1',
        role: 'player',
        status: 'active',
      },
    ]);
  });

  it('does not create a duplicate membership when one already exists', async () => {
    const admin = createAdminClient({
      membership: {
        id: 'membership-existing',
        role: 'player',
        status: 'active',
        player_id: 'player-1',
      },
    });
    createClientMock.mockImplementation((_url: string, key: string) =>
      key === 'service-role-key' ? admin : createAuthClient()
    );

    const response = await POST(createRequest('POST'));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.membership.id).toBe('membership-existing');
    expect(admin.insertedMemberships).toEqual([]);
  });

  it('rejects redeeming a code without a valid auth token', async () => {
    createClientMock.mockImplementation((_url: string, key: string) =>
      key === 'service-role-key' ? createAdminClient() : createAuthClient(null)
    );

    const response = await POST(createRequest('POST', { code: 'ABCD1234' }));
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('joins via the SECURITY DEFINER RPC when available, without needing the service role', async () => {
    // Simulates a deploy where SUPABASE_SERVICE_ROLE_KEY is missing but
    // the RPC migration has shipped. The user's authenticated client
    // calls the RPC directly; the route should pass through the result
    // without ever asking for an admin client. Explicitly stub the
    // service-role key to empty (rather than unstubAllEnvs) so we don't
    // accidentally unwind setup.ts's stubs and leak state to later
    // test files.
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '');

    const rpcMock = vi.fn().mockResolvedValue({
      data: {
        tripId: tripRow.id,
        shareCode: tripRow.share_code,
        trip: {
          id: tripRow.id,
          name: tripRow.name,
          startDate: tripRow.start_date,
          endDate: tripRow.end_date,
          location: tripRow.location,
          captainName: tripRow.captain_name,
        },
        membership: {
          id: 'membership-rpc',
          role: 'player',
          status: 'active',
          playerId: 'player-rpc',
        },
      },
      error: null,
    });
    const authedClient = {
      ...createAuthClient(),
      rpc: rpcMock,
    };
    createClientMock.mockReturnValue(authedClient);

    const response = await POST(createRequest('POST'));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(rpcMock).toHaveBeenCalledWith('join_trip_by_share_code', {
      p_share_code: 'ABCD1234',
      p_invitation_id: null,
    });
    expect(data).toMatchObject({
      success: true,
      tripId: tripRow.id,
      membership: { id: 'membership-rpc', role: 'player' },
    });
  });

  it('returns 404 when the RPC reports the trip is missing', async () => {
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '');

    const rpcMock = vi.fn().mockResolvedValue({
      data: null,
      error: { code: 'P0002', message: 'trip-not-found' },
    });
    const authedClient = {
      ...createAuthClient(),
      rpc: rpcMock,
    };
    createClientMock.mockReturnValue(authedClient);

    const response = await POST(createRequest('POST'));
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data).toMatchObject({ error: 'Trip not found' });
  });

  it('falls back to the legacy admin path when the RPC migration is missing', async () => {
    // When the RPC isn't deployed yet, joining should still work via
    // the admin client (provided SUPABASE_SERVICE_ROLE_KEY is set).
    const admin = createAdminClient({ linkedPlayerId: 'player-1' });
    const rpcMock = vi.fn().mockResolvedValue({
      data: null,
      error: { code: '42883', message: 'function ... does not exist' },
    });
    createClientMock.mockImplementation((_url: string, key: string) => {
      if (key === 'service-role-key') return admin;
      const authedClient = {
        ...createAuthClient(),
        rpc: rpcMock,
      };
      return authedClient;
    });

    const response = await POST(createRequest('POST'));
    const data = await response.json();

    expect(rpcMock).toHaveBeenCalledTimes(1);
    expect(response.status).toBe(200);
    expect(data.tripId).toBe(tripRow.id);
    expect(admin.insertedMemberships).toHaveLength(1);
  });
});
