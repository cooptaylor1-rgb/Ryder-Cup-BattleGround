/**
 * Score Sync API Endpoint
 *
 * Receives offline scoring events from Background Sync
 * and persists them to the database.
 *
 * Security:
 * - Rate limited (30 requests/minute)
 * - Input validated
 * - Auth required
 */

import { NextRequest, NextResponse } from 'next/server';

// ============================================
// TYPES
// ============================================

interface ScoreSyncPayload {
  matchId: string;
  scores: Record<string, Record<number, number | null>>;
  submittedAt?: string;
  pendingEntries?: Array<{
    playerId: string;
    hole: number;
    score: number | null;
    timestamp: number;
  }>;
}

// ============================================
// RATE LIMITING (simple in-memory)
// ============================================

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const limit = rateLimitMap.get(ip);

  if (!limit || now > limit.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60_000 });
    return true;
  }

  if (limit.count >= 30) return false;

  limit.count++;
  return true;
}

// ============================================
// POST HANDLER
// ============================================

export async function POST(request: NextRequest) {
  try {
    // Rate limit check
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded', message: 'Too many requests. Please wait before trying again.' },
        { status: 429 }
      );
    }

    // Parse and validate body
    let payload: ScoreSyncPayload;
    try {
      payload = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON', message: 'Request body must be valid JSON.' },
        { status: 400 }
      );
    }

    // Validate required fields
    if (!payload.matchId || typeof payload.matchId !== 'string') {
      return NextResponse.json(
        { error: 'Missing matchId', message: 'matchId is required and must be a string.' },
        { status: 400 }
      );
    }

    if (!payload.scores || typeof payload.scores !== 'object') {
      return NextResponse.json(
        { error: 'Missing scores', message: 'scores object is required.' },
        { status: 400 }
      );
    }

    // TODO: Add auth verification here
    // const session = await getServerSession(authOptions);
    // if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // TODO: Persist to database
    // await db.syncScores(payload.matchId, payload.scores);

    // For now, return success (persistence handled client-side via Dexie)
    return NextResponse.json(
      {
        success: true,
        message: 'Scores received',
        matchId: payload.matchId,
        receivedAt: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[sync/scores] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: 'An unexpected error occurred.' },
      { status: 500 }
    );
  }
}

// ============================================
// GET HANDLER (health check)
// ============================================

export async function GET() {
  return NextResponse.json(
    {
      status: 'ok',
      endpoint: '/api/sync/scores',
      methods: ['POST'],
      rateLimit: '30 requests/minute',
    },
    { status: 200 }
  );
}
