/**
 * Analytics & Metrics Service
 *
 * Production-ready analytics tracking with:
 * - Page views
 * - User actions
 * - Feature usage
 * - Performance metrics
 * - Custom events
 *
 * Privacy-first: No PII collected, respects Do Not Track
 */

// ============================================
// TYPES
// ============================================

export interface AnalyticsEvent {
  /** Event name */
  name: string;
  /** Event category */
  category: EventCategory;
  /** Event properties */
  properties?: Record<string, string | number | boolean | null>;
  /** Timestamp */
  timestamp?: number;
  /** Session ID */
  sessionId?: string;
}

export type EventCategory =
  | 'navigation'
  | 'scoring'
  | 'match'
  | 'trip'
  | 'social'
  | 'settings'
  | 'error'
  | 'performance'
  | 'feature'
  | 'engagement';

export interface PageView {
  path: string;
  title?: string;
  referrer?: string;
  timestamp: number;
}

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: 'ms' | 's' | 'bytes' | 'count' | 'percent';
  tags?: Record<string, string>;
}

export interface UserTiming {
  name: string;
  startTime: number;
  duration: number;
  category?: string;
}

// ============================================
// CONFIGURATION
// ============================================

interface AnalyticsConfig {
  /** Enable/disable analytics */
  enabled: boolean;
  /** Debug mode (logs to console) */
  debug: boolean;
  /** Respect Do Not Track header */
  respectDoNotTrack: boolean;
  /** Sample rate (0-1) */
  sampleRate: number;
  /** Batch events before sending */
  batchSize: number;
  /** Batch interval in ms */
  batchInterval: number;
  /** Custom endpoint for events */
  endpoint?: string;
}

const defaultConfig: AnalyticsConfig = {
  enabled: process.env.NODE_ENV === 'production',
  debug: process.env.NODE_ENV === 'development',
  respectDoNotTrack: true,
  sampleRate: 1.0,
  batchSize: 10,
  batchInterval: 5000,
  endpoint: undefined,
};

// ============================================
// STATE
// ============================================

let config = { ...defaultConfig };
let sessionId: string | null = null;
let eventQueue: AnalyticsEvent[] = [];
let flushTimer: NodeJS.Timeout | null = null;

// ============================================
// INITIALIZATION
// ============================================

/**
 * Initialize analytics with custom config
 */
export function initAnalytics(customConfig?: Partial<AnalyticsConfig>): void {
  config = { ...defaultConfig, ...customConfig };
  sessionId = generateSessionId();

  if (config.enabled && config.batchInterval > 0) {
    flushTimer = setInterval(flushEvents, config.batchInterval);
  }

  // Track session start
  if (config.enabled) {
    track('session_start', 'engagement');
  }
}

/**
 * Cleanup analytics
 */
export function cleanupAnalytics(): void {
  if (flushTimer) {
    clearInterval(flushTimer);
    flushTimer = null;
  }
  flushEvents();
}

// ============================================
// PRIVACY
// ============================================

/**
 * Check if tracking is allowed
 */
function isTrackingAllowed(): boolean {
  if (!config.enabled) return false;

  if (config.respectDoNotTrack && typeof navigator !== 'undefined') {
    if (navigator.doNotTrack === '1') return false;
  }

  // Sample rate
  if (config.sampleRate < 1 && Math.random() > config.sampleRate) {
    return false;
  }

  return true;
}

// ============================================
// CORE TRACKING
// ============================================

/**
 * Track an event
 */
export function track(
  name: string,
  category: EventCategory,
  properties?: Record<string, string | number | boolean | null>
): void {
  if (!isTrackingAllowed()) return;

  const event: AnalyticsEvent = {
    name,
    category,
    properties,
    timestamp: Date.now(),
    sessionId: sessionId || undefined,
  };

  if (config.debug) {
    console.log('[Analytics]', event);
  }

  eventQueue.push(event);

  if (eventQueue.length >= config.batchSize) {
    flushEvents();
  }
}

/**
 * Track a page view
 */
export function trackPageView(path: string, title?: string): void {
  track('page_view', 'navigation', {
    path,
    title: title || (typeof document !== 'undefined' ? document.title : null),
    referrer: typeof document !== 'undefined' ? document.referrer || null : null,
  });
}

/**
 * Track a timing metric
 */
export function trackTiming(name: string, duration: number, category?: string): void {
  track('timing', 'performance', {
    metric_name: name,
    duration_ms: Math.round(duration),
    category: category || null,
  });
}

/**
 * Track a performance metric
 */
export function trackMetric(metric: PerformanceMetric): void {
  track('metric', 'performance', {
    metric_name: metric.name,
    value: metric.value,
    unit: metric.unit,
    ...metric.tags,
  });
}

/**
 * Track an error
 */
export function trackError(errorName: string, errorMessage?: string, errorStack?: string): void {
  track('error', 'error', {
    error_name: errorName,
    error_message: errorMessage || null,
    error_stack: config.debug ? errorStack || null : null,
  });
}

/**
 * Track feature usage
 */
export function trackFeature(featureName: string, action: 'enabled' | 'disabled' | 'used'): void {
  track('feature', 'feature', {
    feature_name: featureName,
    action,
  });
}

// ============================================
// PRE-BUILT TRACKING FUNCTIONS
// ============================================

/**
 * Track score entry
 */
export function trackScoreEntry(options: {
  matchId: string;
  hole: number;
  score: number;
  method: 'manual' | 'quick' | 'ocr' | 'voice';
}): void {
  track('score_entry', 'scoring', {
    match_id: options.matchId,
    hole: options.hole,
    score: options.score,
    method: options.method,
  });
}

/**
 * Track match action
 */
export function trackMatchAction(options: {
  matchId: string;
  action: 'started' | 'paused' | 'resumed' | 'completed' | 'cancelled';
  duration_minutes?: number;
}): void {
  track('match_action', 'match', {
    match_id: options.matchId,
    action: options.action,
    duration_minutes: options.duration_minutes || null,
  });
}

/**
 * Track trip action
 */
export function trackTripAction(options: {
  tripId: string;
  action: 'created' | 'joined' | 'left' | 'completed';
  player_count?: number;
}): void {
  track('trip_action', 'trip', {
    trip_id: options.tripId,
    action: options.action,
    player_count: options.player_count || null,
  });
}

/**
 * Track social action
 */
export function trackSocialAction(options: {
  action: 'share' | 'comment' | 'reaction' | 'photo_upload';
  target_type?: 'match' | 'score' | 'standings' | 'trip';
  target_id?: string;
}): void {
  track('social_action', 'social', {
    action: options.action,
    target_type: options.target_type || null,
    target_id: options.target_id || null,
  });
}

/**
 * Track settings change
 */
export function trackSettingsChange(options: {
  setting: string;
  old_value?: string | number | boolean | null;
  new_value: string | number | boolean | null;
}): void {
  track('settings_change', 'settings', {
    setting: options.setting,
    old_value: options.old_value ?? null,
    new_value: options.new_value,
  });
}

/**
 * Track user engagement
 */
export function trackEngagement(options: {
  action: 'session_start' | 'session_end' | 'app_backgrounded' | 'app_foregrounded';
  session_duration_seconds?: number;
}): void {
  track('engagement', 'engagement', {
    action: options.action,
    session_duration_seconds: options.session_duration_seconds || null,
  });
}

// ============================================
// WEB VITALS TRACKING
// ============================================

/**
 * Track Core Web Vitals
 */
export function trackWebVital(metric: {
  name: 'CLS' | 'FCP' | 'FID' | 'INP' | 'LCP' | 'TTFB';
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
}): void {
  trackMetric({
    name: `web_vital_${metric.name.toLowerCase()}`,
    value: metric.value,
    unit: metric.name === 'CLS' ? 'count' : 'ms',
    tags: {
      rating: metric.rating,
    },
  });
}

// ============================================
// BATCH MANAGEMENT
// ============================================

/**
 * Flush queued events to server
 */
async function flushEvents(): Promise<void> {
  if (eventQueue.length === 0) return;

  const events = [...eventQueue];
  eventQueue = [];

  if (!config.endpoint) {
    // No endpoint configured, just log in debug mode
    if (config.debug) {
      console.log('[Analytics] Would send events:', events);
    }
    return;
  }

  try {
    // Use sendBeacon for reliability
    if (typeof navigator !== 'undefined' && 'sendBeacon' in navigator) {
      const blob = new Blob([JSON.stringify({ events })], { type: 'application/json' });
      navigator.sendBeacon(config.endpoint, blob);
    } else {
      // Fallback to fetch
      await fetch(config.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events }),
        keepalive: true,
      });
    }
  } catch (error) {
    // Re-queue events on failure
    eventQueue = [...events, ...eventQueue].slice(0, 100);
    if (config.debug) {
      console.error('[Analytics] Failed to send events:', error);
    }
  }
}

// ============================================
// UTILITIES
// ============================================

/**
 * Generate a session ID
 */
function generateSessionId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Measure a function's execution time
 */
export async function measureAsync<T>(
  name: string,
  fn: () => Promise<T>,
  category?: string
): Promise<T> {
  const start = performance.now();
  try {
    return await fn();
  } finally {
    trackTiming(name, performance.now() - start, category);
  }
}

/**
 * Measure a synchronous function's execution time
 */
export function measure<T>(name: string, fn: () => T, category?: string): T {
  const start = performance.now();
  try {
    return fn();
  } finally {
    trackTiming(name, performance.now() - start, category);
  }
}

// ============================================
// REACT HOOK
// ============================================

import { useEffect, useRef } from 'react';

export interface UseAnalyticsReturn {
  /** Track a custom event */
  track: typeof track;
  /** Track a page view */
  trackPageView: typeof trackPageView;
  /** Track a timing metric */
  trackTiming: typeof trackTiming;
  /** Track an error */
  trackError: typeof trackError;
  /** Track feature usage */
  trackFeature: typeof trackFeature;
  /** Pre-built tracking functions */
  trackScoreEntry: typeof trackScoreEntry;
  trackMatchAction: typeof trackMatchAction;
  trackTripAction: typeof trackTripAction;
  trackSocialAction: typeof trackSocialAction;
}

export function useAnalytics(): UseAnalyticsReturn {
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!initializedRef.current) {
      initAnalytics();
      initializedRef.current = true;
    }

    return () => {
      cleanupAnalytics();
    };
  }, []);

  return {
    track,
    trackPageView,
    trackTiming,
    trackError,
    trackFeature,
    trackScoreEntry,
    trackMatchAction,
    trackTripAction,
    trackSocialAction,
  };
}

/**
 * Track page view on route change
 */
export function usePageTracking(): void {
  useEffect(() => {
    // Track initial page view
    trackPageView(window.location.pathname);

    // Track subsequent navigation
    const handleRouteChange = () => {
      trackPageView(window.location.pathname);
    };

    // Listen for popstate (back/forward navigation)
    window.addEventListener('popstate', handleRouteChange);

    return () => {
      window.removeEventListener('popstate', handleRouteChange);
    };
  }, []);
}

export default useAnalytics;
