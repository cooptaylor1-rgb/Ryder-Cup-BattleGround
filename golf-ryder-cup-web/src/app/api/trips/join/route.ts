import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { RATE_LIMIT_DATA } from '@/lib/constants/rateLimits';
import { applyRateLimitAsync, requireJson, verifyAuth } from '@/lib/utils/apiMiddleware';

interface TripPreviewRow {
  id: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
  location: string | null;
  captain_name: string | null;
  share_code?: string | null;
}

interface MembershipRow {
  id: string;
  role: 'captain' | 'scorer' | 'player' | 'spectator';
  status: 'active' | 'pending' | 'revoked' | 'left';
  player_id?: string | null;
}

type AdminClient = SupabaseClient;

type TripLookupResult =
  | { trip: TripPreviewRow; response: null }
  | { trip: null; response: NextResponse };

type MembershipRedeemResult =
  | { membership: MembershipRow; response: null }
  | { membership: null; response: NextResponse };

function normalizeJoinCode(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const normalized = raw.trim().replace(/[\s-]/g, '').toUpperCase();
  return /^[A-Z0-9]{4,16}$/.test(normalized) ? normalized : null;
}

function normalizeInvitationId(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const normalized = raw.trim();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    normalized
  )
    ? normalized
    : null;
}

/**
 * Build a Supabase client that runs every query under the caller's auth
 * context. Used for the RPC-based join path (migration 20260429000000)
 * which intentionally avoids the service-role key — production deploys
 * that miss SUPABASE_SERVICE_ROLE_KEY can still join trips because the
 * RPC itself is SECURITY DEFINER.
 */
function createAuthedClient(token: string): SupabaseClient | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) return null;

  return createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
}

/**
 * Indicator the deploy is missing the optional service-role key. The new
 * code path below succeeds without it; this is preserved as a fallback
 * for older deployments where the RPC migration hasn't been applied yet.
 */
function createAdminClient():
  | {
      client: AdminClient;
      response: null;
    }
  | {
      client: null;
      response: NextResponse;
    } {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return {
      client: null,
      response: NextResponse.json(
        {
          error: 'Supabase not configured',
          message:
            'Joining trips needs an updated database. Ask the site admin to run the latest Supabase migrations or set SUPABASE_SERVICE_ROLE_KEY on the server.',
        },
        { status: 503 }
      ),
    };
  }

  return {
    client: createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    }),
    response: null,
  };
}

function toPreview(row: TripPreviewRow) {
  return {
    id: row.id,
    name: row.name,
    startDate: row.start_date,
    endDate: row.end_date,
    location: row.location,
    captainName: row.captain_name,
  };
}

type RpcLookupOutcome =
  | { kind: 'found'; trip: TripPreviewRow }
  | { kind: 'not-found' }
  | { kind: 'error'; response: NextResponse }
  | { kind: 'unavailable' };

function looksLikeMissingRpc(error: { code?: string; message?: string }): boolean {
  // PGRST202 / 42883 = RPC not found. Older deployments without the
  // migration land here. We also catch raw fetch failures and "does
  // not exist" messages so a partially deployed instance can still
  // fall through cleanly.
  return (
    error.code === 'PGRST202' ||
    error.code === '42883' ||
    /does not exist|not found.*function|could not find the function|404/i.test(
      error.message ?? ''
    )
  );
}

/**
 * Attempt to resolve a trip preview through the public lookup RPC. The
 * caller falls through to the legacy admin path on `kind: 'unavailable'`,
 * which covers both pre-migration deployments and the (test-only) case
 * where the mocked client doesn't implement `.rpc()` at all.
 */
async function lookupTripViaRpc(
  client: SupabaseClient,
  code: string
): Promise<RpcLookupOutcome> {
  let data: unknown;
  let error: { code?: string; message?: string } | null = null;

  try {
    const result = await client.rpc('lookup_trip_by_share_code', { p_share_code: code });
    data = result.data;
    error = result.error;
  } catch {
    // Mocked clients in tests don't expose `.rpc`, and a missing
    // method throws a TypeError. Treat any throw as "RPC unavailable"
    // so the legacy admin path runs unchanged.
    return { kind: 'unavailable' };
  }

  if (error) {
    if (looksLikeMissingRpc(error)) return { kind: 'unavailable' };
    return {
      kind: 'error',
      response: NextResponse.json(
        { error: 'Trip lookup failed', message: error.message ?? 'Unknown error' },
        { status: 500 }
      ),
    };
  }

  const rows = (data as TripPreviewRow[] | null) ?? [];
  const row = rows[0];
  if (!row) return { kind: 'not-found' };
  return { kind: 'found', trip: row };
}

async function findTripByCode(
  admin: AdminClient,
  code: string
): Promise<TripLookupResult> {
  const { data, error } = await admin
    .from('trips')
    .select('id, name, start_date, end_date, location, captain_name, share_code')
    .eq('share_code', code)
    .maybeSingle();

  if (error) {
    return {
      trip: null,
      response: NextResponse.json(
        {
          error: 'Trip lookup failed',
          message: error.message,
        },
        { status: 500 }
      ),
    };
  }

  if (!data) {
    return {
      trip: null,
      response: NextResponse.json(
        {
          error: 'Trip not found',
          message: 'No trip matches that join code.',
        },
        { status: 404 }
      ),
    };
  }

  return { trip: data as TripPreviewRow, response: null };
}

async function findLinkedPlayerId(
  admin: AdminClient,
  tripId: string,
  userId: string,
  userEmail?: string
): Promise<string | null> {
  const { data: authLinked } = await admin
    .from('players')
    .select('id')
    .eq('trip_id', tripId)
    .eq('linked_auth_user_id', userId)
    .limit(1);

  const authLinkedId = (authLinked as Array<{ id: string }> | null)?.[0]?.id;
  if (authLinkedId) return authLinkedId;

  if (!userEmail) return null;

  const { data: emailLinked } = await admin
    .from('players')
    .select('id')
    .eq('trip_id', tripId)
    .ilike('email', userEmail)
    .limit(1);

  return (emailLinked as Array<{ id: string }> | null)?.[0]?.id ?? null;
}

async function findMembership(
  admin: AdminClient,
  tripId: string,
  userId: string
): Promise<MembershipRow | null> {
  const { data } = await admin
    .from('trip_memberships')
    .select('id, role, status, player_id')
    .eq('trip_id', tripId)
    .eq('auth_user_id', userId)
    .in('status', ['active', 'pending'])
    .maybeSingle();

  return (data as MembershipRow | null) ?? null;
}

async function redeemMembership({
  admin,
  tripId,
  userId,
  userEmail,
}: {
  admin: AdminClient;
  tripId: string;
  userId: string;
  userEmail?: string;
}): Promise<MembershipRedeemResult> {
  const existing = await findMembership(admin, tripId, userId);
  if (existing) {
    return { membership: existing, response: null };
  }

  const playerId = await findLinkedPlayerId(admin, tripId, userId, userEmail);
  const { data, error } = await admin
    .from('trip_memberships')
    .insert({
      trip_id: tripId,
      auth_user_id: userId,
      player_id: playerId,
      role: 'player',
      status: 'active',
    })
    .select('id, role, status, player_id')
    .single();

  if (error) {
    const raced = await findMembership(admin, tripId, userId);
    if (raced) {
      return { membership: raced, response: null };
    }

    return {
      membership: null,
      response: NextResponse.json(
        {
          error: 'Join failed',
          message: error.message,
        },
        { status: 500 }
      ),
    };
  }

  return { membership: data as MembershipRow, response: null };
}

export async function GET(request: NextRequest) {
  const rateLimitError = await applyRateLimitAsync(request, RATE_LIMIT_DATA);
  if (rateLimitError) return rateLimitError;

  const code = normalizeJoinCode(request.nextUrl.searchParams.get('code'));
  if (!code) {
    return NextResponse.json(
      {
        error: 'Invalid join code',
        message: 'Join code must be alphanumeric.',
      },
      { status: 400 }
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  let trip: TripPreviewRow | null = null;
  let admin: AdminClient | null = null;

  // Try the public RPC path first — it's anon-callable and doesn't need
  // SUPABASE_SERVICE_ROLE_KEY at all. Fall back to the admin path on
  // older deploys where the migration hasn't shipped yet.
  if (supabaseUrl && supabaseAnonKey) {
    const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const result = await lookupTripViaRpc(anonClient, code);
    if (result.kind === 'found') {
      trip = result.trip;
    } else if (result.kind === 'not-found') {
      return NextResponse.json(
        { error: 'Trip not found', message: 'No trip matches that join code.' },
        { status: 404 }
      );
    } else if (result.kind === 'error') {
      return result.response;
    }
    // 'unavailable' falls through to admin path below.
  }

  if (!trip) {
    const adminAttempt = createAdminClient();
    if (!adminAttempt.client) return adminAttempt.response;
    admin = adminAttempt.client;

    const adminLookup = await findTripByCode(admin, code);
    if (!adminLookup.trip) return adminLookup.response;
    trip = adminLookup.trip;
  }

  // Best-effort invite-opened bookkeeping. Done only when the admin
  // path is available — the RPC path is read-only by design and the
  // open-tracking will reconcile when the user actually accepts.
  const invitationId = normalizeInvitationId(request.nextUrl.searchParams.get('invite'));
  if (invitationId && admin) {
    await admin
      .from('trip_invitations')
      .update({
        status: 'opened',
        opened_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', invitationId)
      .eq('trip_id', trip.id)
      .eq('invite_code', trip.share_code ?? code)
      .in('status', ['pending', 'sent']);
  }

  return NextResponse.json({
    trip: toPreview(trip),
  });
}

interface JoinRpcResponse {
  tripId: string;
  shareCode: string;
  trip: {
    id: string;
    name: string;
    startDate: string | null;
    endDate: string | null;
    location: string | null;
    captainName: string | null;
  };
  membership: {
    id: string;
    role: MembershipRow['role'];
    status: MembershipRow['status'];
    playerId: string | null;
  };
}

/**
 * RPC-driven join. Returns the wire-format payload the route should
 * forward to the client, or `null` when the deployment hasn't applied
 * the migration yet (caller falls back to the admin path).
 */
async function joinViaRpc(
  token: string,
  code: string,
  invitationId: string | null
): Promise<{ payload: JoinRpcResponse | null; response: NextResponse | null; rpcMissing: boolean }> {
  const client = createAuthedClient(token);
  if (!client) {
    return { payload: null, response: null, rpcMissing: true };
  }

  let data: unknown;
  let error: { code?: string; message?: string } | null = null;

  try {
    const result = await client.rpc('join_trip_by_share_code', {
      p_share_code: code,
      p_invitation_id: invitationId,
    });
    data = result.data;
    error = result.error;
  } catch {
    // Any throw — including the test-mock case where `.rpc` isn't
    // defined — degrades to the legacy admin path so existing
    // deployments keep working.
    return { payload: null, response: null, rpcMissing: true };
  }

  if (error) {
    if (looksLikeMissingRpc(error)) {
      return { payload: null, response: null, rpcMissing: true };
    }
    if (error.message?.includes('trip-not-found') || error.code === 'P0002') {
      return {
        payload: null,
        response: NextResponse.json(
          { error: 'Trip not found', message: 'No trip matches that join code.' },
          { status: 404 }
        ),
        rpcMissing: false,
      };
    }
    if (error.message?.includes('auth-required') || error.code === '42501') {
      return {
        payload: null,
        response: NextResponse.json(
          { error: 'Unauthorized', message: 'Sign in before joining a trip.' },
          { status: 401 }
        ),
        rpcMissing: false,
      };
    }
    return {
      payload: null,
      response: NextResponse.json(
        { error: 'Join failed', message: error.message ?? 'Unknown error' },
        { status: 500 }
      ),
      rpcMissing: false,
    };
  }

  return { payload: data as JoinRpcResponse, response: null, rpcMissing: false };
}

export async function POST(request: NextRequest) {
  const jsonError = requireJson(request);
  if (jsonError) return jsonError;

  const rateLimitError = await applyRateLimitAsync(request, RATE_LIMIT_DATA);
  if (rateLimitError) return rateLimitError;

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json(
      {
        error: 'Invalid JSON',
        message: 'Request body must be valid JSON.',
      },
      { status: 400 }
    );
  }

  const code = normalizeJoinCode((rawBody as { code?: unknown })?.code);
  const invitationId = normalizeInvitationId((rawBody as { inviteId?: unknown })?.inviteId);
  if (!code) {
    return NextResponse.json(
      {
        error: 'Invalid join code',
        message: 'Join code must be alphanumeric.',
      },
      { status: 400 }
    );
  }

  const auth = await verifyAuth(request);
  if (!auth.authenticated || !auth.userId) {
    return NextResponse.json(
      {
        error: 'Unauthorized',
        message: auth.error ?? 'Sign in before joining a trip.',
      },
      { status: 401 }
    );
  }

  // Bearer token reaches into the request again — verifyAuth already
  // validated it but doesn't expose the raw token. We need the raw
  // token to forward to the authed Supabase client below.
  const authHeader = request.headers.get('Authorization') ?? '';
  const bearerToken = authHeader.replace(/^Bearer\s+/i, '');

  // Preferred path: invoke the public SECURITY DEFINER RPC under the
  // user's own auth context. Doesn't need SUPABASE_SERVICE_ROLE_KEY.
  if (bearerToken) {
    const rpcResult = await joinViaRpc(bearerToken, code, invitationId);
    if (rpcResult.payload) {
      return NextResponse.json({ success: true, ...rpcResult.payload });
    }
    if (rpcResult.response) return rpcResult.response;
    // rpcMissing — fall through to legacy admin path.
  }

  const { client: admin, response } = createAdminClient();
  if (!admin) return response;

  const { trip, response: lookupResponse } = await findTripByCode(admin, code);
  if (!trip) return lookupResponse;

  const { membership, response: membershipResponse } = await redeemMembership({
    admin,
    tripId: trip.id,
    userId: auth.userId,
    userEmail: auth.userEmail,
  });
  if (!membership) return membershipResponse;

  const acceptedAt = new Date().toISOString();
  const acceptedPatch = {
    status: 'accepted',
    accepted_by_auth_user_id: auth.userId,
    accepted_player_id: membership.player_id ?? null,
    accepted_at: acceptedAt,
    updated_at: acceptedAt,
  };

  if (invitationId) {
    await admin
      .from('trip_invitations')
      .update(acceptedPatch)
      .eq('id', invitationId)
      .eq('trip_id', trip.id)
      .eq('invite_code', trip.share_code ?? code)
      .in('status', ['pending', 'sent', 'opened']);
  } else {
    await admin
      .from('trip_invitations')
      .update(acceptedPatch)
      .eq('trip_id', trip.id)
      .in('status', ['pending', 'sent', 'opened'])
      .ilike('recipient_email', auth.userEmail ?? '__no_email__');
  }

  return NextResponse.json({
    success: true,
    tripId: trip.id,
    shareCode: trip.share_code ?? code,
    membership: {
      id: membership.id,
      role: membership.role,
      status: membership.status,
      playerId: membership.player_id ?? null,
    },
    trip: toPreview(trip),
  });
}
