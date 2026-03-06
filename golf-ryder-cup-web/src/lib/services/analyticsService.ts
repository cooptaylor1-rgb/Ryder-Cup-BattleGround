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
import { createLogger } from '@/lib/utils/logger';

const analyticsLogger = createLogger('Analytics');

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
};

// ============================================
// ANALYTICS SERVICE CLASS
// ============================================

class AnalyticsService {
  private config: AnalyticsConfig;
  private sessionId: string;
  private eventQueue: AnalyticsEvent[] = [];
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private initialized = false;

  constructor(config: Partial<AnalyticsConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
    this.sessionId = this.generateSessionId();
  }

  // ----------------------------------------
  // INITIALIZATION
  // ----------------------------------------

  init(config: Partial<AnalyticsConfig> = {}): void {
    if (this.initialized) return;

    this.config = { ...this.config, ...config };

    // Check Do Not Track
    if (this.config.respectDoNotTrack && this.isDoNotTrackEnabled()) {
      this.config.enabled = false;
      this.log('Analytics disabled: Do Not Track enabled');
      return;
    }

    this.initialized = true;
    this.log('Analytics initialized', { sessionId: this.sessionId });

    // Track initial page view
    if (typeof window !== 'undefined') {
      this.trackPageView();
      this.setupAutoTracking();
    }
  }

  // ----------------------------------------
  // PAGE VIEWS
  // ----------------------------------------

  trackPageView(path?: string, title?: string): void {
    if (!this.isEnabled()) return;

    const pageView: PageView = {
      path: path || (typeof window !== 'undefined' ? window.location.pathname : ''),
      title: title || (typeof document !== 'undefined' ? document.title : ''),
      referrer: typeof document !== 'undefined' ? document.referrer : '',
      timestamp: Date.now(),
    };

    this.log('Page view', pageView);
    this.sendPageView(pageView);
  }

  // ----------------------------------------
  // EVENT TRACKING
  // ----------------------------------------

  track(
    name: string,
    category: EventCategory,
    properties?: Record<string, string | number | boolean | null>
  ): void {
    if (!this.isEnabled()) return;

    const event: AnalyticsEvent = {
      name,
      category,
      properties,
      timestamp: Date.now(),
      sessionId: this.sessionId,
    };

    this.eventQueue.push(event);
    this.log('Event tracked', event);

    if (this.eventQueue.length >= this.config.batchSize) {
      this.flush();
    } else {
      this.scheduleFlush();
    }
  }

  // ----------------------------------------
  // CONVENIENCE METHODS
  // ----------------------------------------

  /** Track navigation events */
  navigation(action: string, properties?: Record<string, string | number | boolean | null>): void {
    this.track(action, 'navigation', properties);
  }

  /** Track scoring events */
  scoring(action: string, properties?: Record<string, string | number | boolean | null>): void {
    this.track(action, 'scoring', properties);
  }

  /** Track match events */
  match(action: string, properties?: Record<string, string | number | boolean | null>): void {
    this.track(action, 'match', properties);
  }

  /** Track trip events */
  trip(action: string, properties?: Record<string, string | number | boolean | null>): void {
    this.track(action, 'trip', properties);
  }

  /** Track social events */
  social(action: string, properties?: Record<string, string | number | boolean | null>): void {
    this.track(action, 'social', properties);
  }

  /** Track settings changes */
  settings(action: string, properties?: Record<string, string | number | boolean | null>): void {
    this.track(action, 'settings', properties);
  }

  /** Track errors */
  error(name: string, properties?: Record<string, string | number | boolean | null>): void {
    this.track(name, 'error', properties);
  }

  /** Track feature usage */
  feature(name: string, properties?: Record<string, string | number | boolean | null>): void {
    this.track(name, 'feature', properties);
  }

  /** Track engagement */
  engagement(action: string, properties?: Record<string, string | number | boolean | null>): void {
    this.track(action, 'engagement', properties);
  }

  // ----------------------------------------
  // PERFORMANCE
  // ----------------------------------------

  trackPerformance(metric: PerformanceMetric): void {
    if (!this.isEnabled()) return;
    this.log('Performance metric', metric);
    // In production, send to performance monitoring service
  }

  trackTiming(timing: UserTiming): void {
    if (!this.isEnabled()) return;
    this.log('User timing', timing);
  }

  /** Start a timing measurement */
  startTiming(name: string): () => void {
    const startTime = performance.now();
    return () => {
      const duration = performance.now() - startTime;
      this.trackTiming({
        name,
        startTime,
        duration,
      });
    };
  }

  // ----------------------------------------
  // WEB VITALS
  // ----------------------------------------

  trackWebVitals(): void {
    if (typeof window === 'undefined') return;

    // Largest Contentful Paint
    try {
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1] as PerformanceEntry & { startTime: number };
        this.trackPerformance({
          name: 'LCP',
          value: lastEntry.startTime,
          unit: 'ms',
        });
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
    } catch {}

    // First Input Delay
    try {
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries() as (PerformanceEntry & {
          processingStart: number;
          startTime: number;
        })[];
        entries.forEach((entry) => {
          this.trackPerformance({
            name: 'FID',
            value: entry.processingStart - entry.startTime,
            unit: 'ms',
          });
        });
      });
      fidObserver.observe({ entryTypes: ['first-input'] });
    } catch {}

    // Cumulative Layout Shift
    try {
      let clsValue = 0;
      const clsObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries() as (PerformanceEntry & { value: number; hadRecentInput: boolean })[];
        entries.forEach((entry) => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        });
        this.trackPerformance({
          name: 'CLS',
          value: clsValue,
          unit: 'count',
        });
      });
      clsObserver.observe({ entryTypes: ['layout-shift'] });
    } catch {}
  }

  // ----------------------------------------
  // FLUSH & SEND
  // ----------------------------------------

  flush(): void {
    if (this.eventQueue.length === 0) return;

    const events = [...this.eventQueue];
    this.eventQueue = [];

    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }

    this.sendEvents(events);
  }

  private scheduleFlush(): void {
    if (this.flushTimer) return;

    this.flushTimer = setTimeout(() => {
      this.flush();
    }, this.config.batchInterval);
  }

  private sendEvents(events: AnalyticsEvent[]): void {
    if (!this.config.endpoint) {
      this.log('Events (no endpoint configured)', events);
      return;
    }

    // Use sendBeacon for reliability
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      const data = JSON.stringify({ events });
      navigator.sendBeacon(this.config.endpoint, data);
    }
  }

  private sendPageView(pageView: PageView): void {
    if (!this.config.endpoint) {
      this.log('Page view (no endpoint configured)', pageView);
      return;
    }

    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      const data = JSON.stringify({ pageView });
      navigator.sendBeacon(this.config.endpoint, data);
    }
  }

  // ----------------------------------------
  // AUTO TRACKING
  // ----------------------------------------

  private setupAutoTracking(): void {
    if (typeof window === 'undefined') return;

    // Track page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.flush();
      }
    });

    // Track before unload
    window.addEventListener('beforeunload', () => {
      this.flush();
    });
  }

  // ----------------------------------------
  // UTILITIES
  // ----------------------------------------

  private isEnabled(): boolean {
    // Apply sample rate
    if (Math.random() > this.config.sampleRate) return false;
    return this.config.enabled && this.initialized;
  }

  private isDoNotTrackEnabled(): boolean {
    if (typeof navigator === 'undefined') return false;
    return navigator.doNotTrack === '1' || (window as Window & { doNotTrack?: string }).doNotTrack === '1';
  }

  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private log(message: string, data?: unknown): void {
    if (this.config.debug) {
      analyticsLogger.log(message, data || '');
    }
  }

  // ----------------------------------------
  // CONFIGURATION
  // ----------------------------------------

  configure(config: Partial<AnalyticsConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getSessionId(): string {
    return this.sessionId;
  }

  isAnalyticsEnabled(): boolean {
    return this.config.enabled;
  }
}

// ============================================
// SINGLETON EXPORT
// ============================================

export const analytics = new AnalyticsService();
export default analytics;

// ============================================
// REACT HOOK
// ============================================

// Hook for use in React components
export function useAnalytics() {
  return {
    track: analytics.track.bind(analytics),
    navigation: analytics.navigation.bind(analytics),
    scoring: analytics.scoring.bind(analytics),
    match: analytics.match.bind(analytics),
    trip: analytics.trip.bind(analytics),
    social: analytics.social.bind(analytics),
    settings: analytics.settings.bind(analytics),
    error: analytics.error.bind(analytics),
    feature: analytics.feature.bind(analytics),
    engagement: analytics.engagement.bind(analytics),
    trackPageView: analytics.trackPageView.bind(analytics),
    trackPerformance: analytics.trackPerformance.bind(analytics),
    startTiming: analytics.startTiming.bind(analytics),
    flush: analytics.flush.bind(analytics),
  };
}

// ============================================
// PREDEFINED EVENTS
// ============================================

export const AnalyticsEvents = {
  // Navigation
  PAGE_VIEW: 'page_view',
  NAV_CLICK: 'nav_click',
  BACK_CLICK: 'back_click',

  // Scoring
  SCORE_ENTERED: 'score_entered',
  SCORE_UPDATED: 'score_updated',
  SCORE_UNDONE: 'score_undone',
  HOLE_COMPLETED: 'hole_completed',
  MATCH_COMPLETED: 'match_completed',
  SCORING_STARTED: 'scoring_started',
  SCORING_ABANDONED: 'scoring_abandoned',

  // Match
  MATCH_VIEWED: 'match_viewed',
  MATCH_CREATED: 'match_created',
  MATCH_DELETED: 'match_deleted',
  RESULT_SHARED: 'result_shared',

  // Trip
  TRIP_CREATED: 'trip_created',
  TRIP_JOINED: 'trip_joined',
  TRIP_VIEWED: 'trip_viewed',
  PLAYER_ADDED: 'player_added',
  PLAYER_REMOVED: 'player_removed',

  // Social
  SHARE_CLICKED: 'share_clicked',
  SHARE_COMPLETED: 'share_completed',
  SHARE_CANCELLED: 'share_cancelled',
  COPY_LINK: 'copy_link',

  // Settings
  THEME_CHANGED: 'theme_changed',
  NOTIFICATIONS_ENABLED: 'notifications_enabled',
  NOTIFICATIONS_DISABLED: 'notifications_disabled',

  // PWA
  PWA_INSTALL_PROMPTED: 'pwa_install_prompted',
  PWA_INSTALLED: 'pwa_installed',
  PWA_DISMISSED: 'pwa_dismissed',

  // Errors
  SYNC_ERROR: 'sync_error',
  NETWORK_ERROR: 'network_error',
  DB_ERROR: 'db_error',

  // Features
  OFFLINE_MODE_USED: 'offline_mode_used',
  SYNC_COMPLETED: 'sync_completed',
  PUSH_NOTIFICATION_RECEIVED: 'push_notification_received',
} as const;

export type AnalyticsEventName = (typeof AnalyticsEvents)[keyof typeof AnalyticsEvents];

// ============================================
// CORRELATION & TRACKING HELPERS
// Standalone functions that wrap the analytics singleton
// for convenience in components and stores.
// ============================================

type TrackingProps = Record<string, string | number | boolean | null>;

/** Generate a unique correlation ID for tracing related analytics events */
export function createCorrelationId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/** Track a sync failure event */
export function trackSyncFailure(props: Record<string, unknown>): void {
  analytics.error('sync_failure', props as TrackingProps);
}

/** Track a feature usage event */
export function trackFeature(featureName: string, action: string): void {
  analytics.feature(featureName, { action });
}

/** Track a score entry event */
export function trackScoreEntry(props: Record<string, unknown>): void {
  analytics.scoring('score_entry', props as TrackingProps);
}

/** Track a score undo event */
export function trackScoreUndo(props: Record<string, unknown>): void {
  analytics.scoring('score_undo', props as TrackingProps);
}

/** Track a social action event */
export function trackSocialAction(props: Record<string, unknown>): void {
  analytics.social('social_action', props as TrackingProps);
}

/** Track standings published event */
export function trackStandingsPublished(props: Record<string, unknown>): void {
  analytics.engagement('standings_published', props as TrackingProps);
}

/** Track standings tab changed event */
export function trackStandingsTabChanged(props: Record<string, unknown>): void {
  analytics.navigation('standings_tab_changed', props as TrackingProps);
}

/** Track standings viewed event */
export function trackStandingsViewed(props: Record<string, unknown>): void {
  analytics.navigation('standings_viewed', props as TrackingProps);
}
