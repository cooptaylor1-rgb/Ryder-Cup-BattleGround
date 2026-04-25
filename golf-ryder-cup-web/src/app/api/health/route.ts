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
    rateLimit: RateLimitCheck;
    deployment: DeploymentCheck;
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
   * any required migration markers missing from the live database.
   */
  migrations?: {
    requiredMarkers: string[];
    missingMarkers: string[];
  };
  error?: string;
}

interface RateLimitCheck {
  status: 'healthy' | 'unhealthy' | 'skipped';
  backend: 'memory' | 'redis-rest';
  required: boolean;
  reachable: boolean;
  latencyMs: number | null;
  error?: string;
}

interface DeploymentCheck {
  status: 'healthy' | 'degraded';
  strict: boolean;
  release: string;
  railwayCommitSha: string | null;
  environment: string;
  warning?: string;
}

// Track server start time for uptime calculation
const startTime = Date.now();

// Markers inserted by the deployment-health migration. Requiring these
// in production catches the common failure mode where code deploys but
// the Supabase migration set was not applied first.
const REQUIRED_MIGRATION_MARKERS = [
  '20260423000000_add_match_mode',
  '20260423010000_add_practice_scores',
  '20260423020000_add_banter_posts',
  '20260423030000_add_scoring_sync_columns',
  '20260423040000_drop_unused_photos_and_comments',
  '20260424000000_add_deployment_health_markers',
  '20260424010000_trip_memberships_and_trip_scoped_rls',
];

function isStrictHealthMode(): boolean {
  const override = process.env.HEALTHCHECK_STRICT?.trim().toLowerCase();
  if (override === '1' || override === 'true' || override === 'yes') return true;
  if (override === '0' || override === 'false' || override === 'no') return false;

  return process.env.NODE_ENV === 'production' || Boolean(process.env.RAILWAY_ENVIRONMENT);
}

async function checkSupabase(strict: boolean): Promise<SupabaseCheck> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !anonKey) {
    return {
      status: strict ? 'unhealthy' : 'skipped',
      reachable: false,
      latencyMs: null,
      error: 'Supabase URL or anon key is not configured',
    };
  }

  if (strict && !serviceKey) {
    return {
      status: 'unhealthy',
      reachable: false,
      latencyMs: null,
      error: 'SUPABASE_SERVICE_ROLE_KEY is required for production health checks',
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

    let migrations: SupabaseCheck['migrations'];
    let migrationStatus: SupabaseCheck['status'] = 'healthy';

    if (serviceKey) {
      try {
        const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
        const { data, error: markerError } = await admin
          .from('deployment_migration_markers')
          .select('id')
          .in('id', REQUIRED_MIGRATION_MARKERS);

        if (markerError) {
          if (strict) {
            return {
              status: 'unhealthy',
              reachable: true,
              latencyMs,
              error: `Migration marker check failed: ${markerError.message}`,
            };
          }
          migrationStatus = 'degraded';
        } else {
          const present = new Set(
            (data ?? []).map((row) => (row as { id: string }).id)
          );
          const missing = REQUIRED_MIGRATION_MARKERS.filter((name) => !present.has(name));
          migrations = {
            requiredMarkers: REQUIRED_MIGRATION_MARKERS,
            missingMarkers: missing,
          };
          if (missing.length > 0) migrationStatus = strict ? 'unhealthy' : 'degraded';
        }
      } catch (err) {
        if (strict) {
          return {
            status: 'unhealthy',
            reachable: true,
            latencyMs,
            error: err instanceof Error ? err.message : 'Migration marker check failed',
          };
        }
        migrationStatus = 'degraded';
      }
    }

    return {
      status: migrationStatus,
      reachable: true,
      latencyMs,
      ...(migrations ? { migrations } : {}),
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

async function checkRateLimit(strict: boolean): Promise<RateLimitCheck> {
  const configuredBackend = process.env.RATE_LIMIT_BACKEND?.trim().toLowerCase();
  const redisUrl = process.env.RATE_LIMIT_REDIS_REST_URL;
  const redisToken = process.env.RATE_LIMIT_REDIS_REST_TOKEN;
  const backend = configuredBackend === 'redis-rest' || (redisUrl && redisToken)
    ? 'redis-rest'
    : 'memory';
  const required = strict;

  if (required && backend !== 'redis-rest') {
    return {
      status: 'unhealthy',
      backend,
      required,
      reachable: false,
      latencyMs: null,
      error: 'RATE_LIMIT_BACKEND=redis-rest is required in production',
    };
  }

  if (backend !== 'redis-rest') {
    return {
      status: 'skipped',
      backend,
      required,
      reachable: false,
      latencyMs: null,
    };
  }

  if (!redisUrl || !redisToken) {
    return {
      status: required ? 'unhealthy' : 'skipped',
      backend,
      required,
      reachable: false,
      latencyMs: null,
      error: 'Redis REST URL or token is not configured',
    };
  }

  const start = Date.now();
  try {
    const response = await fetch(`${redisUrl.replace(/\/$/, '')}/ping`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${redisToken}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });
    const latencyMs = Date.now() - start;

    if (!response.ok) {
      return {
        status: 'unhealthy',
        backend,
        required,
        reachable: false,
        latencyMs,
        error: `Redis REST ping failed with HTTP ${response.status}`,
      };
    }

    return {
      status: 'healthy',
      backend,
      required,
      reachable: true,
      latencyMs,
    };
  } catch (err) {
    return {
      status: 'unhealthy',
      backend,
      required,
      reachable: false,
      latencyMs: Date.now() - start,
      error: err instanceof Error ? err.message : 'Redis REST ping failed',
    };
  }
}

function checkDeployment(strict: boolean): DeploymentCheck {
  const railwayCommitSha = process.env.RAILWAY_GIT_COMMIT_SHA?.trim() || null;
  const configuredRelease = process.env.NEXT_PUBLIC_SENTRY_RELEASE?.trim();
  const release = configuredRelease?.startsWith('$') ? railwayCommitSha ?? '' : configuredRelease ?? railwayCommitSha ?? '';
  const environment =
    process.env.NEXT_PUBLIC_SENTRY_ENV ??
    process.env.RAILWAY_ENVIRONMENT_NAME ??
    process.env.RAILWAY_ENVIRONMENT ??
    process.env.NODE_ENV ??
    'unknown';

  if (strict && !release) {
    return {
      status: 'degraded',
      strict,
      release: 'unknown',
      railwayCommitSha,
      environment,
      warning: 'Sentry release is not tagged with NEXT_PUBLIC_SENTRY_RELEASE or RAILWAY_GIT_COMMIT_SHA',
    };
  }

  return {
    status: 'healthy',
    strict,
    release: release || 'unknown',
    railwayCommitSha,
    environment,
  };
}

/**
 * GET /api/health
 *
 * Health check endpoint for monitoring and load balancers.
 * Always returns the full payload; status code is 503 when the
 * overall health is unhealthy so load balancers can fail-out the pod.
 */
export async function GET(): Promise<NextResponse<HealthStatus>> {
  const strict = isStrictHealthMode();
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

  const [supabaseCheck, rateLimitCheck] = await Promise.all([
    checkSupabase(strict),
    checkRateLimit(strict),
  ]);
  const deploymentCheck = checkDeployment(strict);

  let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
  if (
    memoryStatus === 'critical' ||
    supabaseCheck.status === 'unhealthy' ||
    rateLimitCheck.status === 'unhealthy'
  ) {
    overallStatus = 'unhealthy';
  } else if (
    memoryStatus === 'warning' ||
    supabaseCheck.status === 'degraded' ||
    deploymentCheck.status === 'degraded'
  ) {
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
      rateLimit: rateLimitCheck,
      deployment: deploymentCheck,
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
