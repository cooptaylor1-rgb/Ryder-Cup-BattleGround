/**
 * API Middleware Utilities
 *
 * Server-side utilities for API route protection including:
 * - Rate limiting
 * - Authentication verification
 * - Request validation
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// ============================================
// RATE LIMITING
// ============================================

interface RateLimitStore {
  count: number;
  resetTime: number;
}

// In-memory rate limit store (use Redis in production for distributed systems)
const rateLimitStore = new Map<string, RateLimitStore>();

export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  keyGenerator?: (req: NextRequest) => string; // Custom key generator
}

const DEFAULT_RATE_LIMIT_CONFIG: RateLimitConfig = {
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 60, // 60 requests per minute
};


type RateLimitBackend = 'memory' | 'redis-rest';

function getRateLimitBackend(): RateLimitBackend {
  const configured = process.env.RATE_LIMIT_BACKEND?.trim().toLowerCase();
  if (configured === 'redis-rest') {
    return 'redis-rest';
  }

  if (process.env.RATE_LIMIT_REDIS_REST_URL && process.env.RATE_LIMIT_REDIS_REST_TOKEN) {
    return 'redis-rest';
  }

  return 'memory';
}

async function checkRateLimitRedisRest(
  req: NextRequest,
  config: Required<Pick<RateLimitConfig, 'windowMs' | 'maxRequests'>> & Pick<RateLimitConfig, 'keyGenerator'>
): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
  const redisRestUrl = process.env.RATE_LIMIT_REDIS_REST_URL;
  const redisRestToken = process.env.RATE_LIMIT_REDIS_REST_TOKEN;

  if (!redisRestUrl || !redisRestToken) {
    return checkRateLimit(req, config);
  }

  const key = config.keyGenerator ? config.keyGenerator(req) : getClientId(req);
  const now = Date.now();
  const windowSeconds = Math.max(1, Math.ceil(config.windowMs / 1000));
  const prefixedKey = `rate-limit:${key}`;

  try {
    const response = await fetch(`${redisRestUrl.replace(/\/$/, '')}/pipeline`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${redisRestToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([
        ['INCR', prefixedKey],
        ['EXPIRE', prefixedKey, String(windowSeconds), 'NX'],
        ['TTL', prefixedKey],
      ]),
      cache: 'no-store',
    });

    if (!response.ok) {
      return checkRateLimit(req, config);
    }

    const payload = (await response.json()) as Array<{ result?: number | string }>;
    const count = Number(payload?.[0]?.result ?? 0);
    const ttlSeconds = Number(payload?.[2]?.result ?? windowSeconds);
    const safeTtl = ttlSeconds > 0 ? ttlSeconds : windowSeconds;

    const remaining = Math.max(0, config.maxRequests - count);
    const allowed = count <= config.maxRequests;

    return {
      allowed,
      remaining,
      resetTime: now + safeTtl * 1000,
    };
  } catch {
    // Fail open to in-memory limiter if distributed backend is unavailable.
    return checkRateLimit(req, config);
  }
}

export async function checkRateLimitAsync(
  req: NextRequest,
  config: Partial<RateLimitConfig> = {}
): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
  const mergedConfig = {
    ...DEFAULT_RATE_LIMIT_CONFIG,
    ...config,
  };

  if (getRateLimitBackend() === 'redis-rest') {
    return checkRateLimitRedisRest(req, mergedConfig);
  }

  return checkRateLimit(req, mergedConfig);
}

/**
 * Get client identifier for rate limiting
 */
function getClientId(req: NextRequest): string {
  // Use forwarded IP if behind a proxy, otherwise use the connection IP
  const forwarded = req.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown';

  // Combine IP with path for per-endpoint limits
  const path = new URL(req.url).pathname;
  return `${ip}:${path}`;
}

/**
 * Check if a request is rate limited
 */
export function checkRateLimit(
  req: NextRequest,
  config: Partial<RateLimitConfig> = {}
): { allowed: boolean; remaining: number; resetTime: number } {
  const { windowMs, maxRequests, keyGenerator } = {
    ...DEFAULT_RATE_LIMIT_CONFIG,
    ...config,
  };

  const key = keyGenerator ? keyGenerator(req) : getClientId(req);
  const now = Date.now();

  let entry = rateLimitStore.get(key);

  // Clean up expired entries periodically
  if (rateLimitStore.size > 10000) {
    for (const [k, v] of rateLimitStore.entries()) {
      if (v.resetTime < now) {
        rateLimitStore.delete(k);
      }
    }
  }

  // Initialize or reset if expired
  if (!entry || entry.resetTime < now) {
    entry = {
      count: 0,
      resetTime: now + windowMs,
    };
  }

  entry.count++;
  rateLimitStore.set(key, entry);

  const remaining = Math.max(0, maxRequests - entry.count);
  const allowed = entry.count <= maxRequests;

  return {
    allowed,
    remaining,
    resetTime: entry.resetTime,
  };
}

/**
 * Apply rate limiting to a request, returning error response if limited
 */
export function applyRateLimit(
  req: NextRequest,
  config?: Partial<RateLimitConfig>
): NextResponse | null {
  const { allowed, remaining, resetTime } = checkRateLimit(req, config);

  if (!allowed) {
    return NextResponse.json(
      {
        error: 'Too many requests',
        message: 'Rate limit exceeded. Please try again later.',
        retryAfter: Math.ceil((resetTime - Date.now()) / 1000),
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil((resetTime - Date.now()) / 1000)),
          'X-RateLimit-Limit': String(config?.maxRequests || DEFAULT_RATE_LIMIT_CONFIG.maxRequests),
          'X-RateLimit-Remaining': String(remaining),
          'X-RateLimit-Reset': String(Math.ceil(resetTime / 1000)),
        },
      }
    );
  }

  return null;
}

/**
 * Apply rate limiting with distributed backend support.
 */
export async function applyRateLimitAsync(
  req: NextRequest,
  config?: Partial<RateLimitConfig>
): Promise<NextResponse | null> {
  const { allowed, remaining, resetTime } = await checkRateLimitAsync(req, config);

  if (!allowed) {
    return NextResponse.json(
      {
        error: 'Too many requests',
        message: 'Rate limit exceeded. Please try again later.',
        retryAfter: Math.ceil((resetTime - Date.now()) / 1000),
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil((resetTime - Date.now()) / 1000)),
          'X-RateLimit-Limit': String(config?.maxRequests || DEFAULT_RATE_LIMIT_CONFIG.maxRequests),
          'X-RateLimit-Remaining': String(remaining),
          'X-RateLimit-Reset': String(Math.ceil(resetTime / 1000)),
        },
      }
    );
  }

  return null;
}

/**
 * Add rate limit headers to a response
 */
export function addRateLimitHeaders<T>(
  response: NextResponse<T>,
  req: NextRequest,
  config?: Partial<RateLimitConfig>
): NextResponse<T> {
  const { remaining, resetTime } = checkRateLimit(req, config);
  const limit = config?.maxRequests || DEFAULT_RATE_LIMIT_CONFIG.maxRequests;

  response.headers.set('X-RateLimit-Limit', String(limit));
  response.headers.set('X-RateLimit-Remaining', String(Math.max(0, remaining - 1)));
  response.headers.set('X-RateLimit-Reset', String(Math.ceil(resetTime / 1000)));

  return response;
}

// ============================================
// AUTHENTICATION
// ============================================

/**
 * Verify Supabase authentication from request
 */
export async function verifyAuth(req: NextRequest): Promise<{
  authenticated: boolean;
  userId?: string;
  userEmail?: string;
  error?: string;
}> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return { authenticated: false, error: 'Supabase not configured' };
  }

  // Get auth token from header
  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { authenticated: false, error: 'No authorization token provided' };
  }

  const token = authHeader.replace('Bearer ', '');

  try {
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
      },
    });

    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
      return { authenticated: false, error: error?.message || 'Invalid token' };
    }

    return {
      authenticated: true,
      userId: data.user.id,
      userEmail: data.user.email ?? undefined,
    };
  } catch {
    return { authenticated: false, error: 'Authentication failed' };
  }
}

/**
 * Require authentication, returning error response if not authenticated
 */
export async function requireAuth(req: NextRequest): Promise<{
  response: NextResponse | null;
  userId?: string;
  userEmail?: string;
}> {
  const { authenticated, userId, userEmail, error } = await verifyAuth(req);

  if (!authenticated) {
    return {
      response: NextResponse.json({ error: 'Unauthorized', message: error }, { status: 401 }),
    };
  }

  return { response: null, userId, userEmail };
}

async function findTripMembershipForAuthUser(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  tripId: string,
  userId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('trip_memberships')
    .select('id')
    .eq('trip_id', tripId)
    .eq('auth_user_id', userId)
    .in('status', ['active', 'pending'])
    .limit(1);

  return !error && !!data && data.length > 0;
}

async function findLinkedTripPlayerId(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  tripId: string,
  userId: string,
  userEmail?: string
): Promise<string | null> {
  const { data: authLinkedPlayers } = await supabase
    .from('players')
    .select('id')
    .eq('trip_id', tripId)
    .eq('linked_auth_user_id', userId)
    .limit(1);

  const authLinkedPlayerId = (authLinkedPlayers as Array<{ id: string }> | null)?.[0]?.id;
  if (authLinkedPlayerId) return authLinkedPlayerId;

  if (!userEmail) return null;

  const { data: emailLinkedPlayers } = await supabase
    .from('players')
    .select('id')
    .eq('trip_id', tripId)
    .ilike('email', userEmail)
    .limit(1);

  return (emailLinkedPlayers as Array<{ id: string }> | null)?.[0]?.id ?? null;
}

async function redeemTripMembershipForShareCode(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  tripId: string,
  userId: string,
  userEmail: string | undefined,
  shareCode: string
): Promise<boolean> {
  const { data: trip, error: tripError } = await supabase
    .from('trips')
    .select('id, share_code')
    .eq('id', tripId)
    .single();

  if (
    tripError ||
    !trip ||
    String(trip.share_code ?? '').toUpperCase() !== shareCode.trim().toUpperCase()
  ) {
    return false;
  }

  const playerId = await findLinkedTripPlayerId(supabase, tripId, userId, userEmail);
  const { error } = await supabase.from('trip_memberships').insert({
    trip_id: tripId,
    auth_user_id: userId,
    player_id: playerId,
    role: 'player',
    status: 'active',
  });

  return !error || (await findTripMembershipForAuthUser(supabase, tripId, userId));
}

// ============================================
// REQUEST VALIDATION
// ============================================

/**
 * Validate content type is JSON
 */
export function requireJson(req: NextRequest): NextResponse | null {
  const contentType = req.headers.get('content-type');

  if (!contentType || !contentType.includes('application/json')) {
    return NextResponse.json(
      { error: 'Invalid content type', message: 'Content-Type must be application/json' },
      { status: 415 }
    );
  }

  return null;
}

/**
 * Validate request body size
 */
export function validateBodySize(
  contentLength: number | null,
  maxBytes: number = 10 * 1024 * 1024 // 10MB default
): NextResponse | null {
  if (contentLength && contentLength > maxBytes) {
    return NextResponse.json(
      {
        error: 'Payload too large',
        message: `Request body must be less than ${Math.round(maxBytes / 1024 / 1024)}MB`,
      },
      { status: 413 }
    );
  }

  return null;
}

// ============================================
// TRIP AUTHORIZATION
// ============================================

/**
 * Verify user has access to a trip via share code or ownership
 * For production Ryder Cup: validates trip membership
 */
export async function verifyTripAccess(
  req: NextRequest,
  tripId: string
): Promise<{ authorized: boolean; error?: string }> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // If no Supabase, allow local-only mode
  if (!supabaseUrl || !supabaseKey) {
    return { authorized: true };
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return { authorized: false, error: 'Authorization required for trip access' };
  }

  const { authenticated, userId, userEmail } = await verifyAuth(req);
  if (!authenticated || !userId) {
    return { authorized: false, error: 'Invalid authorization token' };
  }

  if (await findTripMembershipForAuthUser(supabase, tripId, userId)) {
    return { authorized: true };
  }

  const linkedPlayerId = await findLinkedTripPlayerId(supabase, tripId, userId, userEmail);
  if (linkedPlayerId) {
    const { error } = await supabase.from('trip_memberships').insert({
      trip_id: tripId,
      auth_user_id: userId,
      player_id: linkedPlayerId,
      role: 'player',
      status: 'active',
    });

    if (!error || (await findTripMembershipForAuthUser(supabase, tripId, userId))) {
      return { authorized: true };
    }
  }

  // Legacy clients may still include a share code with authenticated API
  // calls. Redeem it into a membership instead of treating the code as
  // reusable authorization.
  const shareCode = req.headers.get('X-Share-Code');
  if (shareCode) {
    const redeemed = await redeemTripMembershipForShareCode(
      supabase,
      tripId,
      userId,
      userEmail,
      shareCode
    );
    if (redeemed) {
      return { authorized: true };
    }
  }

  return { authorized: false, error: 'Access denied to this trip' };
}

/**
 * Require trip access, returning error response if not authorized
 */
export async function requireTripAccess(
  req: NextRequest,
  tripId: string
): Promise<NextResponse | null> {
  const { authorized, error } = await verifyTripAccess(req, tripId);

  if (!authorized) {
    return NextResponse.json(
      { error: 'Forbidden', message: error || 'Access denied' },
      { status: 403 }
    );
  }

  return null;
}

// ============================================
// CORS HELPERS
// ============================================

const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'https://golf-ryder-cup-app.vercel.app',
  'https://ryder-cup-app.railway.app',
  // Production domains
  process.env.NEXT_PUBLIC_APP_URL,
].filter(Boolean) as string[];

/**
 * Get CORS headers for a request
 */
export function getCorsHeaders(req: NextRequest): Record<string, string> {
  const origin = req.headers.get('origin') || '';
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Trip-Id, X-Share-Code',
    'Access-Control-Max-Age': '86400',
  };
}

/**
 * Handle CORS preflight request
 */
export function handleCorsPrelight(req: NextRequest): NextResponse {
  return new NextResponse(null, {
    status: 204,
    headers: getCorsHeaders(req),
  });
}

// ============================================
// COMBINED MIDDLEWARE WRAPPER
// ============================================

interface MiddlewareOptions {
  rateLimit?: Partial<RateLimitConfig> | boolean;
  requireAuth?: boolean;
  requireJson?: boolean;
  maxBodySize?: number;
  cors?: boolean;
}

/**
 * Apply multiple middleware checks to an API route
 */
export async function withApiMiddleware(
  req: NextRequest,
  options: MiddlewareOptions = {}
): Promise<{ error: NextResponse | null; userId?: string }> {
  // Handle CORS preflight
  if (options.cors && req.method === 'OPTIONS') {
    return { error: handleCorsPrelight(req) };
  }

  // Rate limiting
  if (options.rateLimit !== false) {
    const rateLimitConfig = typeof options.rateLimit === 'object' ? options.rateLimit : undefined;
    const rateLimitError = await applyRateLimitAsync(req, rateLimitConfig);
    if (rateLimitError) {
      return { error: rateLimitError };
    }
  }

  // Authentication
  let userId: string | undefined;
  if (options.requireAuth) {
    const authResult = await requireAuth(req);
    if (authResult.response) {
      return { error: authResult.response };
    }
    userId = authResult.userId;
  }

  // JSON content type
  if (options.requireJson && ['POST', 'PUT', 'PATCH'].includes(req.method)) {
    const jsonError = requireJson(req);
    if (jsonError) {
      return { error: jsonError };
    }
  }

  // Body size
  if (options.maxBodySize) {
    const contentLength = parseInt(req.headers.get('content-length') || '0', 10);
    const sizeError = validateBodySize(contentLength, options.maxBodySize);
    if (sizeError) {
      return { error: sizeError };
    }
  }

  return { error: null, userId };
}
