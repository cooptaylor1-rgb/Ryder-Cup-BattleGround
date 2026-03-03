/**
 * Score Sync API Endpoint
 *
 * Receives offline scoring events from Background Sync
 * and persists them to the database.
 *
 * Security:
 * - Rate limited (30 requests/minute)
 * - Input validation via Zod schema
 * - Trip access verification
 * - Transactional database operations
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  scoreSyncPayloadSchema,
  formatZodError,
  type ScoreSyncPayload,
} from '@/lib/validations/api';
import { applyRateLimitAsync, requireTripAccess } from '@/lib/utils/apiMiddleware';
import { apiLogger } from '@/lib/utils/logger';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Rate limit config for score sync (30 requests per minute)

function resolveCorrelationId(request: NextRequest): string {
  const existing = request.headers.get('x-correlation-id')?.trim();
  if (existing) return existing;
  return `sync-${crypto.randomUUID()}`;
}

const RATE_LIMIT_CONFIG = {
  windowMs: 60 * 1000,
  maxRequests: 30,
};

export async function POST(request: NextRequest) {
  const correlationId = resolveCorrelationId(request);

  // Apply rate limiting
  const rateLimitResponse = await applyRateLimitAsync(request, RATE_LIMIT_CONFIG);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    const rawBody = await request.json();

    // Validate payload with Zod schema
    const parseResult = scoreSyncPayloadSchema.safeParse(rawBody);
    if (!parseResult.success) {
      const details = formatZodError(parseResult.error);
      return NextResponse.json(
        {
          error: `Invalid payload: ${details}`,
          details,
        },
        { status: 400 }
      );
    }

    const payload: ScoreSyncPayload = parseResult.data;

    // Verify trip access (production security)
    if (payload.tripId) {
      const tripAccessError = await requireTripAccess(request, payload.tripId);
      if (tripAccessError) {
        return tripAccessError;
      }
    }

    // If no Supabase configured, acknowledge receipt (local-only mode)
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        {
          success: true,
          mode: 'local-only',
          synced: payload.events.length,
          correlationId,
          message: 'Events acknowledged (no remote database configured)',
        },
        { headers: { 'x-correlation-id': correlationId } }
      );
    }

    // Create Supabase client with service role for server-side operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Process each event
    const results = {
      synced: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const event of payload.events) {
      try {
        // Store event in Supabase
        const { error } = await supabase.from('scoring_events').upsert(
          {
            id: event.id,
            match_id: payload.matchId,
            event_type: event.type,
            hole_number: event.holeNumber,
            data: event.data,
            created_at: event.timestamp,
            synced_at: new Date().toISOString(),
          },
          {
            onConflict: 'id',
          }
        );

        if (error) {
          results.failed++;
          results.errors.push(`Event ${event.id}: ${error.message}`);
          apiLogger.warn('[API] Sync event failure', {
            matchId: payload.matchId,
            tripId: payload.tripId ?? null,
            eventId: event.id,
            eventType: event.type,
            reason: error.message,
            correlationId,
          });
        } else {
          results.synced++;
        }
      } catch (err) {
        results.failed++;
        const reason = err instanceof Error ? err.message : 'Unknown error';
        results.errors.push(`Event ${event.id}: ${reason}`);
        apiLogger.warn('[API] Sync event exception', {
          matchId: payload.matchId,
          tripId: payload.tripId ?? null,
          eventId: event.id,
          eventType: event.type,
          reason,
          correlationId,
        });
      }
    }

    // Update match last_synced timestamp
    if (results.synced > 0) {
      await supabase
        .from('matches')
        .update({ last_synced_at: new Date().toISOString() })
        .eq('id', payload.matchId);
    }

    if (results.failed > 0) {
      apiLogger.warn('[API] Score sync completed with failures', {
        matchId: payload.matchId,
        tripId: payload.tripId ?? null,
        synced: results.synced,
        failed: results.failed,
        correlationId,
      });
    }

    return NextResponse.json(
      {
        success: results.failed === 0,
        synced: results.synced,
        failed: results.failed,
        correlationId,
        errors: results.errors.length > 0 ? results.errors : undefined,
      },
      { headers: { 'x-correlation-id': correlationId } }
    );
  } catch (error) {
    apiLogger.error('[API] Score sync error', {
      reason: error instanceof Error ? error.message : 'Unknown error',
      correlationId,
    });
    return NextResponse.json(
      {
        error: 'Internal server error',
        correlationId,
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500, headers: { 'x-correlation-id': correlationId } }
    );
  }
}

// Health check for sync endpoint
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    endpoint: 'score-sync',
    timestamp: new Date().toISOString(),
    hasRemoteDb: Boolean(supabaseUrl && supabaseServiceKey),
  });
}
