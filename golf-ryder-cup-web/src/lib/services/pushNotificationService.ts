/**
 * Push Notification Service
 *
 * Production-ready web push notifications with:
 * - Service worker registration
 * - Permission management
 * - Subscription handling
 * - Notification scheduling
 *
 * @example
 * const { subscribe, sendNotification } = usePushNotifications();
 * await subscribe();
 * await sendNotification({ title: 'Match Started!' });
 */

// ============================================
// TYPES
// ============================================

export interface PushNotificationOptions {
  /** Notification title */
  title: string;
  /** Notification body text */
  body?: string;
  /** Icon URL */
  icon?: string;
  /** Badge URL (small icon) */
  badge?: string;
  /** Image URL (large image) */
  image?: string;
  /** Notification tag for grouping */
  tag?: string;
  /** Data to pass to click handler */
  data?: Record<string, unknown>;
  /** Actions buttons */
  actions?: NotificationAction[];
  /** Vibration pattern */
  vibrate?: number[];
  /** Auto-close after ms */
  requireInteraction?: boolean;
  /** Silent notification */
  silent?: boolean;
  /** Renotify even if same tag */
  renotify?: boolean;
}

export interface NotificationAction {
  action: string;
  title: string;
  icon?: string;
}

export interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export type PermissionState = 'default' | 'granted' | 'denied';

// ============================================
// CONSTANTS
// ============================================

const DEFAULT_ICON = '/icons/icon-192.png';
const DEFAULT_BADGE = '/icons/icon-72.png';
// ============================================
// CAPABILITY DETECTION
// ============================================

/**
 * Check if push notifications are supported
 */
export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

/**
 * Get current notification permission
 */
export function getPermission(): PermissionState {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }
  return Notification.permission as PermissionState;
}

/**
 * Check if notifications are enabled
 */
export function isNotificationEnabled(): boolean {
  return getPermission() === 'granted';
}

// ============================================
// PERMISSION MANAGEMENT
// ============================================

/**
 * Request notification permission
 */
export async function requestPermission(): Promise<PermissionState> {
  if (!isPushSupported()) {
    return 'denied';
  }

  try {
    const permission = await Notification.requestPermission();
    return permission as PermissionState;
  } catch {
    return 'denied';
  }
}

// ============================================
// SERVICE WORKER REGISTRATION
// ============================================

/**
 * Get or register the service worker
 */
export async function getServiceWorkerRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!isPushSupported()) return null;

  try {
    // Try to get existing registration
    const registration = await navigator.serviceWorker.ready;
    return registration;
  } catch {
    return null;
  }
}

// ============================================
// SUBSCRIPTION MANAGEMENT
// ============================================

/**
 * Subscribe to push notifications
 */
export async function subscribeToPush(
  vapidPublicKey?: string
): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;

  const permission = await requestPermission();
  if (permission !== 'granted') return null;

  try {
    const registration = await getServiceWorkerRegistration();
    if (!registration) return null;

    // Check for existing subscription
    const existingSubscription = await registration.pushManager.getSubscription();
    if (existingSubscription) {
      return existingSubscription;
    }

    // Create new subscription
    const subscribeOptions: PushSubscriptionOptionsInit = {
      userVisibleOnly: true,
    };

    if (vapidPublicKey) {
      const key = urlBase64ToUint8Array(vapidPublicKey);
      subscribeOptions.applicationServerKey = key.buffer as ArrayBuffer;
    }

    const subscription = await registration.pushManager.subscribe(subscribeOptions);

    return subscription;
  } catch (error) {
    console.error('Failed to subscribe to push:', error);
    return null;
  }
}

/**
 * Unsubscribe from push notifications
 */
export async function unsubscribeFromPush(): Promise<boolean> {
  try {
    const registration = await getServiceWorkerRegistration();
    if (!registration) return false;

    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) return true;

    return await subscription.unsubscribe();
  } catch {
    return false;
  }
}

/**
 * Get current push subscription
 */
export async function getPushSubscription(): Promise<PushSubscription | null> {
  try {
    const registration = await getServiceWorkerRegistration();
    if (!registration) return null;

    return await registration.pushManager.getSubscription();
  } catch {
    return null;
  }
}

/**
 * Convert subscription to sendable data
 */
export function subscriptionToData(subscription: PushSubscription): PushSubscriptionData | null {
  try {
    const json = subscription.toJSON();
    if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
      return null;
    }
    return {
      endpoint: json.endpoint,
      keys: {
        p256dh: json.keys.p256dh,
        auth: json.keys.auth,
      },
    };
  } catch {
    return null;
  }
}

// ============================================
// LOCAL NOTIFICATIONS
// ============================================

/**
 * Show a local notification (no push required)
 */
export async function showNotification(
  options: PushNotificationOptions
): Promise<boolean> {
  if (!isNotificationEnabled()) {
    return false;
  }

  try {
    const registration = await getServiceWorkerRegistration();

    if (registration) {
      // Use service worker to show notification (better for PWAs)
      const notificationOptions: NotificationOptions = {
        body: options.body,
        icon: options.icon || DEFAULT_ICON,
        badge: options.badge || DEFAULT_BADGE,
        tag: options.tag,
        data: options.data,
        requireInteraction: options.requireInteraction,
        silent: options.silent,
      };

      await registration.showNotification(options.title, notificationOptions);
    } else {
      // Fallback to Notification API directly
      new Notification(options.title, {
        body: options.body,
        icon: options.icon || DEFAULT_ICON,
        badge: options.badge || DEFAULT_BADGE,
        tag: options.tag,
        data: options.data,
        silent: options.silent,
        requireInteraction: options.requireInteraction,
      });
    }

    return true;
  } catch (error) {
    console.error('Failed to show notification:', error);
    return false;
  }
}

// ============================================
// PRE-BUILT NOTIFICATIONS
// ============================================

/**
 * Notify about match start
 */
export async function notifyMatchStart(options: {
  matchId: string;
  player1: string;
  player2: string;
  format: string;
  hole?: number;
}): Promise<boolean> {
  return showNotification({
    title: '⛳ Match Started!',
    body: `${options.player1} vs ${options.player2} (${options.format})`,
    tag: `match-start-${options.matchId}`,
    data: { type: 'match-start', matchId: options.matchId },
    actions: [
      { action: 'view', title: 'View Match' },
      { action: 'score', title: 'Enter Score' },
    ],
  });
}

/**
 * Notify about score update
 */
export async function notifyScoreUpdate(options: {
  matchId: string;
  player: string;
  hole: number;
  score: number;
  status: string; // e.g., "2 up", "1 down", "A/S"
}): Promise<boolean> {
  return showNotification({
    title: `🏌️ ${options.player} - Hole ${options.hole}`,
    body: `Score: ${options.score} | Match: ${options.status}`,
    tag: `score-${options.matchId}-${options.hole}`,
    data: { type: 'score-update', matchId: options.matchId, hole: options.hole },
    renotify: true,
  });
}

/**
 * Notify about match completion
 */
export async function notifyMatchComplete(options: {
  matchId: string;
  winner: string;
  loser: string;
  result: string; // e.g., "3&2", "1 up"
}): Promise<boolean> {
  return showNotification({
    title: '🏆 Match Complete!',
    body: `${options.winner} defeats ${options.loser}, ${options.result}`,
    tag: `match-complete-${options.matchId}`,
    data: { type: 'match-complete', matchId: options.matchId },
    requireInteraction: true,
    actions: [
      { action: 'view', title: 'View Results' },
      { action: 'standings', title: 'Standings' },
    ],
  });
}

/**
 * Notify about standings update
 */
export async function notifyStandingsUpdate(options: {
  tripId: string;
  usaScore: number;
  europeScore: number;
  leader: 'USA' | 'Europe' | 'Tied';
}): Promise<boolean> {
  const emoji = options.leader === 'USA' ? '🇺🇸' : options.leader === 'Europe' ? '🇪🇺' : '⚖️';
  return showNotification({
    title: `${emoji} Standings Update`,
    body: `USA ${options.usaScore} - ${options.europeScore} Europe`,
    tag: `standings-${options.tripId}`,
    data: { type: 'standings-update', tripId: options.tripId },
  });
}

// ============================================
// UTILITIES
// ============================================

/**
 * Convert VAPID key from base64 to Uint8Array
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

// ============================================
// REACT HOOK
// ============================================

import { useState, useEffect, useCallback } from 'react';

export interface UsePushNotificationsReturn {
  /** Whether push is supported */
  isSupported: boolean;
  /** Current permission state */
  permission: PermissionState;
  /** Whether subscribed to push */
  isSubscribed: boolean;
  /** Request permission */
  requestPermission: () => Promise<PermissionState>;
  /** Subscribe to push */
  subscribe: () => Promise<boolean>;
  /** Unsubscribe from push */
  unsubscribe: () => Promise<boolean>;
  /** Show a local notification */
  notify: (options: PushNotificationOptions) => Promise<boolean>;
  /** Pre-built notification functions */
  notifyMatchStart: typeof notifyMatchStart;
  notifyScoreUpdate: typeof notifyScoreUpdate;
  notifyMatchComplete: typeof notifyMatchComplete;
  notifyStandingsUpdate: typeof notifyStandingsUpdate;
}

export function usePushNotifications(): UsePushNotificationsReturn {
  // Initialize permission with actual value to avoid setState in useEffect
  const [permission, setPermission] = useState<PermissionState>(() => getPermission());
  const [isSubscribed, setIsSubscribed] = useState(false);

  // Check subscription on mount (permission already initialized)
  useEffect(() => {
    getPushSubscription().then((sub) => {
      setIsSubscribed(!!sub);
    });
  }, []);

  const handleRequestPermission = useCallback(async () => {
    const perm = await requestPermission();
    setPermission(perm);
    return perm;
  }, []);

  const handleSubscribe = useCallback(async () => {
    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const subscription = await subscribeToPush(vapidKey);
    const success = !!subscription;
    setIsSubscribed(success);

    // Send subscription to server for server-side push notifications
    if (subscription) {
      const data = subscriptionToData(subscription);
      if (data) {
        try {
          await fetch('/api/push/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ subscription: data }),
          });
        } catch (error) {
          console.error('Failed to register push subscription on server:', error);
        }
      }
    }

    return success;
  }, []);

  const handleUnsubscribe = useCallback(async () => {
    const success = await unsubscribeFromPush();
    if (success) {
      setIsSubscribed(false);
    }
    return success;
  }, []);

  return {
    isSupported: isPushSupported(),
    permission,
    isSubscribed,
    requestPermission: handleRequestPermission,
    subscribe: handleSubscribe,
    unsubscribe: handleUnsubscribe,
    notify: showNotification,
    notifyMatchStart,
    notifyScoreUpdate,
    notifyMatchComplete,
    notifyStandingsUpdate,
  };
}

export default usePushNotifications;
