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
          message: 'Joining trips requires Supabase service-role configuration.',
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

  const { client: admin, response } = createAdminClient();
  if (!admin) return response;

  const { trip, response: lookupResponse } = await findTripByCode(admin, code);
  if (!trip) return lookupResponse;

  const invitationId = normalizeInvitationId(request.nextUrl.searchParams.get('invite'));
  if (invitationId) {
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
