/**
 * Health Check API Endpoint
 *
 * Returns process + Supabase reachability + (when a service-role key
 * is available) a schema-drift check. Intended for load balancers,
 * uptime monitors, and migration verification in deploy pipelines.
 *
 * @endpoint GET /api/health
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  uptime: number;
  environment: string;
  checks: {
    memory: MemoryCheck;
    runtime: RuntimeCheck;
    supabase: SupabaseCheck;
  };
}

interface MemoryCheck {
  status: 'healthy' | 'warning' | 'critical';
  heapUsed: number;
  heapTotal: number;
  heapUsedMB: number;
  heapTotalMB: number;
  percentUsed: number;
}

interface RuntimeCheck {
  status: 'healthy';
  nodeVersion: string;
  platform: string;
}

interface SupabaseCheck {
  status: 'healthy' | 'degraded' | 'unhealthy' | 'skipped';
  reachable: boolean;
  latencyMs: number | null;
  /**
   * Populated only when SUPABASE_SERVICE_ROLE_KEY is configured. Lists
   * any expected indexes that are missing from the live database — the
   * canonical symptom of a migration file that was authored but never
   * applied to production.
   */
  schemaDrift?: {
    missingIndexes: string[];
  };
  error?: string;
}

// Track server start time for uptime calculation
const startTime = Date.now();

// Indexes the app relies on being present. Keep in sync with the
// migrations directory. A missing entry here signals that a migration
// file was authored but never run against the live database.
const EXPECTED_INDEXES = [
  'idx_teams_trip_id',
  'idx_team_members_team_id',
  'idx_team_members_player_id',
  'idx_sessions_trip_id',
  'idx_tee_sets_course_id',
  'idx_matches_session_id',
  'idx_matches_status',
  'idx_hole_results_match_id',
  'idx_comments_player_id',
  'idx_hole_results_scored_by',
  'idx_matches_course_id',
  'idx_matches_tee_set_id',
  'idx_photos_uploaded_by',
  'idx_side_bets_winner_player_id',
];

async function checkSupabase(): Promise<SupabaseCheck> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !anonKey) {
    return {
      status: 'skipped',
      reachable: false,
      latencyMs: null,
      error: 'Supabase env vars not configured',
    };
  }

  const start = Date.now();
  try {
    const client = createClient(url, anonKey, { auth: { persistSession: false } });
    // A tiny probe: RLS may block row access, but the request still
    // round-trips to PostgREST so we can measure reachability + latency.
    const { error } = await client.from('trips').select('id').limit(0);
    const latencyMs = Date.now() - start;

    if (error && error.code !== 'PGRST116') {
      return {
        status: 'unhealthy',
        reachable: false,
        latencyMs,
        error: error.message,
      };
    }

    let schemaDrift: SupabaseCheck['schemaDrift'];
    let driftStatus: SupabaseCheck['status'] = 'healthy';

    if (serviceKey) {
      try {
        const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
        const { data, error: idxError } = await admin
          .from('pg_indexes')
          .select('indexname')
          .eq('schemaname', 'public')
          .in('indexname', EXPECTED_INDEXES);

        if (!idxError) {
          const present = new Set(
            (data ?? []).map((row) => (row as { indexname: string }).indexname)
          );
          const missing = EXPECTED_INDEXES.filter((name) => !present.has(name));
          schemaDrift = { missingIndexes: missing };
          if (missing.length > 0) driftStatus = 'degraded';
        }
      } catch {
        // Schema drift check is advisory; swallow failures so basic
        // reachability still reports truthfully.
      }
    }

    return {
      status: driftStatus,
      reachable: true,
      latencyMs,
      ...(schemaDrift ? { schemaDrift } : {}),
    };
  } catch (err) {
    return {
      status: 'unhealthy',
      reachable: false,
      latencyMs: Date.now() - start,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

/**
 * GET /api/health
 *
 * Health check endpoint for monitoring and load balancers.
 * Always returns the full payload; status code is 503 when the
 * overall health is unhealthy so load balancers can fail-out the pod.
 */
export async function GET(): Promise<NextResponse<HealthStatus>> {
  const memoryUsage = process.memoryUsage();
  const heapUsedMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
  const heapTotalMB = Math.round(memoryUsage.heapTotal / 1024 / 1024);
  const percentUsed = Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100);

  let memoryStatus: 'healthy' | 'warning' | 'critical' = 'healthy';
  if (percentUsed > 90) {
    memoryStatus = 'critical';
  } else if (percentUsed > 75) {
    memoryStatus = 'warning';
  }

  const memoryCheck: MemoryCheck = {
    status: memoryStatus,
    heapUsed: memoryUsage.heapUsed,
    heapTotal: memoryUsage.heapTotal,
    heapUsedMB,
    heapTotalMB,
    percentUsed,
  };

  const runtimeCheck: RuntimeCheck = {
    status: 'healthy',
    nodeVersion: process.version,
    platform: process.platform,
  };

  const supabaseCheck = await checkSupabase();

  let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
  if (memoryStatus === 'critical' || supabaseCheck.status === 'unhealthy') {
    overallStatus = 'unhealthy';
  } else if (memoryStatus === 'warning' || supabaseCheck.status === 'degraded') {
    overallStatus = 'degraded';
  }

  const health: HealthStatus = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    uptime: Math.round((Date.now() - startTime) / 1000),
    environment: process.env.NODE_ENV || 'development',
    checks: {
      memory: memoryCheck,
      runtime: runtimeCheck,
      supabase: supabaseCheck,
    },
  };

  const statusCode = overallStatus === 'unhealthy' ? 503 : 200;

  return NextResponse.json(health, {
    status: statusCode,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
    },
  });
}

/**
 * HEAD /api/health
 *
 * Quick availability check for load balancers. Intentionally does not
 * run the DB probe — it's a cheap liveness signal, not readiness.
 */
export async function HEAD(): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  });
}
