/**
 * Push Notification Subscription API
 *
 * Stores push notification subscriptions for server-side notifications.
 * In production, this would store subscriptions in Supabase.
 */

import { NextRequest, NextResponse } from 'next/server';

interface PushSubscriptionData {
  endpoint: string;
  expirationTime?: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
}

interface SubscriptionRequest {
  subscription: PushSubscriptionData;
  userId?: string;
  tripId?: string;
}

// In-memory store for development/demo
// In production, this would be stored in Supabase
const subscriptions = new Map<string, {
  subscription: PushSubscriptionData;
  userId?: string;
  tripId?: string;
  createdAt: string;
}>();

/**
 * POST /api/push/subscribe
 * Register a new push subscription
 */
export async function POST(request: NextRequest) {
  try {
    const body: SubscriptionRequest = await request.json();

    if (!body.subscription || !body.subscription.endpoint) {
      return NextResponse.json(
        { error: 'Invalid subscription data' },
        { status: 400 }
      );
    }

    // Use endpoint as key (unique per subscription)
    const key = body.subscription.endpoint;

    subscriptions.set(key, {
      subscription: body.subscription,
      userId: body.userId,
      tripId: body.tripId,
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: 'Subscription registered successfully',
    });
  } catch (error) {
    console.error('Push subscription error:', error);
    return NextResponse.json(
      { error: 'Failed to register subscription' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/push/subscribe
 * Unregister a push subscription
 */
export async function DELETE(request: NextRequest) {
  try {
    const body: { endpoint: string } = await request.json();

    if (!body.endpoint) {
      return NextResponse.json(
        { error: 'Endpoint required' },
        { status: 400 }
      );
    }

    const deleted = subscriptions.delete(body.endpoint);

    return NextResponse.json({
      success: deleted,
      message: deleted ? 'Subscription removed' : 'Subscription not found',
    });
  } catch (error) {
    console.error('Push unsubscribe error:', error);
    return NextResponse.json(
      { error: 'Failed to unregister subscription' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/push/subscribe
 * Get subscription count (for monitoring)
 */
export async function GET() {
  return NextResponse.json({
    count: subscriptions.size,
    message: 'Push notification service active',
  });
}
