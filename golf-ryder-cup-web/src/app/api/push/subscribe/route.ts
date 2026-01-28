/**
 * Push Notification Subscription API
 *
 * Stores push notification subscriptions for server-side notifications.
 * Uses Supabase for persistent storage in production.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { applyRateLimit } from '@/lib/utils/apiMiddleware';
import { apiLogger } from '@/lib/utils/logger';
import { z } from 'zod';

// Zod schema for push subscription validation
const pushSubscriptionKeysSchema = z.object({
  p256dh: z.string().min(1, 'p256dh key is required'),
  auth: z.string().min(1, 'auth key is required'),
});

const pushSubscriptionDataSchema = z.object({
  endpoint: z.string().url('Invalid endpoint URL'),
  expirationTime: z.number().nullable().optional(),
  keys: pushSubscriptionKeysSchema,
});

const subscriptionRequestSchema = z.object({
  subscription: pushSubscriptionDataSchema,
  userId: z.string().uuid().optional(),
  tripId: z.string().uuid().optional(),
});

type PushSubscriptionData = z.infer<typeof pushSubscriptionDataSchema>;
type _SubscriptionRequest = z.infer<typeof subscriptionRequestSchema>;

// Rate limit config (10 requests per minute)
const RATE_LIMIT_CONFIG = {
  windowMs: 60 * 1000,
  maxRequests: 10,
};

// Supabase client for push subscriptions
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// In-memory fallback for local development when Supabase is not configured
const localSubscriptions = new Map<
  string,
  {
    subscription: PushSubscriptionData;
    userId?: string;
    tripId?: string;
    createdAt: string;
  }
>();

/**
 * Store subscription in Supabase (or fallback to memory)
 */
async function storeSubscription(
  endpoint: string,
  subscription: PushSubscriptionData,
  userId?: string,
  tripId?: string
): Promise<{ success: boolean; error?: string }> {
  if (supabaseUrl && supabaseServiceKey) {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { error } = await supabase.from('push_subscriptions').upsert(
      {
        endpoint,
        p256dh_key: subscription.keys.p256dh,
        auth_key: subscription.keys.auth,
        expiration_time: subscription.expirationTime,
        user_id: userId || null,
        trip_id: tripId || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'endpoint',
      }
    );

    if (error) {
      apiLogger.error('Supabase push subscription error:', error);
      return { success: false, error: error.message };
    }
    return { success: true };
  }

  // Local fallback
  localSubscriptions.set(endpoint, {
    subscription,
    userId,
    tripId,
    createdAt: new Date().toISOString(),
  });
  return { success: true };
}

/**
 * Remove subscription from Supabase (or fallback to memory)
 */
async function removeSubscription(endpoint: string): Promise<boolean> {
  if (supabaseUrl && supabaseServiceKey) {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { error } = await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint);

    return !error;
  }

  return localSubscriptions.delete(endpoint);
}

/**
 * POST /api/push/subscribe
 * Register a new push subscription
 */
export async function POST(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResponse = applyRateLimit(request, RATE_LIMIT_CONFIG);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    const body = await request.json();

    // Validate request body with Zod schema
    const parseResult = subscriptionRequestSchema.safeParse(body);
    if (!parseResult.success) {
      const errors = parseResult.error.issues.map((e) => e.message).join(', ');
      return NextResponse.json(
        { error: 'Invalid subscription data', details: errors },
        { status: 400 }
      );
    }

    const { subscription, userId, tripId } = parseResult.data;

    const result = await storeSubscription(subscription.endpoint, subscription, userId, tripId);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Failed to store subscription', details: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Subscription registered successfully',
      storage: supabaseUrl ? 'cloud' : 'local',
    });
  } catch (error) {
    apiLogger.error('Push subscription error:', error);
    return NextResponse.json({ error: 'Failed to register subscription' }, { status: 500 });
  }
}

/**
 * DELETE /api/push/subscribe
 * Unregister a push subscription
 */
export async function DELETE(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResponse = applyRateLimit(request, RATE_LIMIT_CONFIG);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    const body: { endpoint: string } = await request.json();

    if (!body.endpoint) {
      return NextResponse.json({ error: 'Endpoint required' }, { status: 400 });
    }

    const deleted = await removeSubscription(body.endpoint);

    return NextResponse.json({
      success: deleted,
      message: deleted ? 'Subscription removed' : 'Subscription not found',
    });
  } catch (error) {
    apiLogger.error('Push unsubscribe error:', error);
    return NextResponse.json({ error: 'Failed to unregister subscription' }, { status: 500 });
  }
}

/**
 * GET /api/push/subscribe
 * Get subscription count (for monitoring)
 */
export async function GET() {
  let count = 0;

  if (supabaseUrl && supabaseServiceKey) {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { count: dbCount } = await supabase
      .from('push_subscriptions')
      .select('*', { count: 'exact', head: true });
    count = dbCount || 0;
  } else {
    count = localSubscriptions.size;
  }

  return NextResponse.json({
    count,
    storage: supabaseUrl ? 'cloud' : 'local',
    message: 'Push notification service active',
  });
}
