/**
 * Score Sync API Endpoint
 *
 * Receives offline scoring events from Background Sync and persists them to
 * the server when cloud sync is configured. In local-only mode it still
 * acknowledges the batch so offline-first flows stay deterministic.
 */

import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { createCorrelationId } from '@/lib/services/analyticsService';
import { applyRateLimitAsync, requireJson, requireTripAccess } from '@/lib/utils/apiMiddleware';
import { apiLogger } from '@/lib/utils/logger';
import {
  formatZodError,
  scoreSyncPayloadSchema,
  type ScoreSyncPayload,
} from '@/lib/validations/api';

const RATE_LIMIT_CONFIG = {
  windowMs: 60 * 1000,
  maxRequests: 30,
};

function withCorrelationId<T>(response: NextResponse<T>, correlationId: string): NextResponse<T> {
  response.headers.set('x-correlation-id', correlationId);
  return response;
}

function getCorrelationId(request: NextRequest): string {
  return request.headers.get('x-correlation-id') || createCorrelationId('sync');
}

async function parsePayload(request: NextRequest): Promise<
  | { success: true; data: ScoreSyncPayload }
  | { success: false; response: NextResponse }
> {
  let rawBody: unknown;

  try {
    rawBody = await request.json();
  } catch {
    return {
      success: false,
      response: NextResponse.json(
        {
          error: 'Invalid JSON',
          message: 'Request body must be valid JSON.',
        },
        { status: 400 }
      ),
    };
  }

  const parseResult = scoreSyncPayloadSchema.safeParse(rawBody);
  if (!parseResult.success) {
    return {
      success: false,
      response: NextResponse.json(
        {
          error: formatZodError(parseResult.error),
          message: 'Invalid sync payload.',
        },
        { status: 400 }
      ),
    };
  }

  return {
    success: true,
    data: parseResult.data,
  };
}

function buildSyncRecords(payload: ScoreSyncPayload) {
  const syncedAt = new Date().toISOString();
  const uniqueEvents = new Map(payload.events.map((event) => [event.id, event]));

  return [...uniqueEvents.values()]
    .sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp))
    .map((event) => ({
      id: event.id,
      match_id: payload.matchId,
      event_type: event.type,
      hole_number: event.holeNumber ?? null,
      data: event.data,
      created_at: event.timestamp,
      synced_at: syncedAt,
      processed: false,
    }));
}

async function persistEvents(payload: ScoreSyncPayload): Promise<number> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return 0;
  }

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const records = buildSyncRecords(payload);
  if (records.length === 0) {
    return 0;
  }

  const { error } = await supabase.from('scoring_events').upsert(records, {
    onConflict: 'id',
    ignoreDuplicates: false,
  });

  if (error) {
    throw new Error(error.message);
  }

  return records.length;
}

export async function POST(request: NextRequest) {
  const correlationId = getCorrelationId(request);

  const jsonError = requireJson(request);
  if (jsonError) {
    return withCorrelationId(jsonError, correlationId);
  }

  const rateLimitError = await applyRateLimitAsync(request, RATE_LIMIT_CONFIG);
  if (rateLimitError) {
    return withCorrelationId(rateLimitError, correlationId);
  }

  const parsedPayload = await parsePayload(request);
  if (!parsedPayload.success) {
    return withCorrelationId(parsedPayload.response, correlationId);
  }

  const payload = parsedPayload.data;
  const cloudSyncConfigured = !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  if (cloudSyncConfigured) {
    if (!payload.tripId) {
      return withCorrelationId(
        NextResponse.json(
          {
            error: 'Trip context required',
            message: 'tripId is required when cloud sync is enabled.',
            correlationId,
          },
          { status: 400 }
        ),
        correlationId
      );
    }

    const tripAccessError = await requireTripAccess(request, payload.tripId);
    if (tripAccessError) {
      return withCorrelationId(tripAccessError, correlationId);
    }
  }

  try {
    const synced = cloudSyncConfigured ? await persistEvents(payload) : payload.events.length;

    return withCorrelationId(
      NextResponse.json(
        {
          success: true,
          correlationId,
          matchId: payload.matchId,
          mode: cloudSyncConfigured ? 'cloud' : 'local-only',
          received: payload.events.length,
          synced,
          receivedAt: new Date().toISOString(),
        },
        { status: 200 }
      ),
      correlationId
    );
  } catch (error) {
    apiLogger.error('Score sync failed', {
      correlationId,
      error,
      matchId: payload.matchId,
      eventCount: payload.events.length,
    });

    return withCorrelationId(
      NextResponse.json(
        {
          error: 'Sync failed',
          message: error instanceof Error ? error.message : 'Unexpected sync failure.',
          correlationId,
        },
        { status: 502 }
      ),
      correlationId
    );
  }
}

export async function GET(request: NextRequest) {
  const correlationId = getCorrelationId(request);

  return withCorrelationId(
    NextResponse.json(
      {
        status: 'ok',
        endpoint: '/api/sync/scores',
        methods: ['POST'],
        rateLimit: '30 requests/minute',
      },
      { status: 200 }
    ),
    correlationId
  );
}
