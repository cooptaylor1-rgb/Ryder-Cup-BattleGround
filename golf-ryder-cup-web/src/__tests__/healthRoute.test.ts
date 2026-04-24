import { afterEach, describe, expect, it, vi } from 'vitest';

const { createClientMock } = vi.hoisted(() => ({
  createClientMock: vi.fn(),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: createClientMock,
}));

import { GET } from '@/app/api/health/route';

const REQUIRED_MARKERS = [
  '20260423000000_add_match_mode',
  '20260423010000_add_practice_scores',
  '20260423020000_add_banter_posts',
  '20260423030000_add_scoring_sync_columns',
  '20260423040000_drop_unused_photos_and_comments',
  '20260424000000_add_deployment_health_markers',
];

function stubStrictEnv() {
  vi.stubEnv('HEALTHCHECK_STRICT', '1');
}

function stubSupabaseEnv() {
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon-key');
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-role-key');
}

function stubRedisEnv() {
  vi.stubEnv('RATE_LIMIT_BACKEND', 'redis-rest');
  vi.stubEnv('RATE_LIMIT_REDIS_REST_URL', 'https://redis.example.com');
  vi.stubEnv('RATE_LIMIT_REDIS_REST_TOKEN', 'redis-token');
}

function mockRedisPing(ok = true) {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue({
    ok,
    status: ok ? 200 : 500,
    json: async () => ({ result: ok ? 'PONG' : 'ERR' }),
  } as Response);
}

function mockSupabase(markerIds: string[] = REQUIRED_MARKERS) {
  createClientMock.mockImplementation(() => ({
    from: (table: string) => ({
      select: () => ({
        limit: async () => ({
          data: [],
          error: table === 'trips' ? null : { message: `Unexpected table ${table}` },
        }),
        in: async () => ({
          data: markerIds.map((id) => ({ id })),
          error: table === 'deployment_migration_markers'
            ? null
            : { message: `Unexpected table ${table}` },
        }),
      }),
    }),
  }));
}

describe('GET /api/health', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    createClientMock.mockReset();
  });

  it('is unhealthy in strict mode when Supabase env vars are missing', async () => {
    stubStrictEnv();

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data.status).toBe('unhealthy');
    expect(data.checks.supabase.status).toBe('unhealthy');
  });

  it('is unhealthy in strict mode when the Supabase service role key is missing', async () => {
    stubStrictEnv();
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon-key');
    stubRedisEnv();
    mockRedisPing();

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data.checks.supabase.error).toContain('SUPABASE_SERVICE_ROLE_KEY');
  });

  it('is unhealthy in strict mode unless Redis REST rate limiting is configured', async () => {
    stubStrictEnv();
    stubSupabaseEnv();
    mockSupabase();

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data.checks.rateLimit.status).toBe('unhealthy');
    expect(data.checks.rateLimit.error).toContain('RATE_LIMIT_BACKEND=redis-rest');
  });

  it('is unhealthy in strict mode when required migration markers are missing', async () => {
    stubStrictEnv();
    stubSupabaseEnv();
    stubRedisEnv();
    mockRedisPing();
    mockSupabase(REQUIRED_MARKERS.slice(0, -1));

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data.checks.supabase.status).toBe('unhealthy');
    expect(data.checks.supabase.migrations.missingMarkers).toEqual([
      '20260424000000_add_deployment_health_markers',
    ]);
  });

  it('is healthy when Supabase, Redis, and migration markers are ready', async () => {
    stubStrictEnv();
    stubSupabaseEnv();
    stubRedisEnv();
    vi.stubEnv('RAILWAY_GIT_COMMIT_SHA', 'abc123def456');
    mockRedisPing();
    mockSupabase();

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.status).toBe('healthy');
    expect(data.checks.supabase.status).toBe('healthy');
    expect(data.checks.rateLimit.status).toBe('healthy');
    expect(data.checks.deployment.release).toBe('abc123def456');
  });
});
