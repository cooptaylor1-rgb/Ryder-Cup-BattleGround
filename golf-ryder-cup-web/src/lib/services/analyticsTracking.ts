/**
 * Analytics tracking helpers — convenience wrappers around the analytics singleton.
 *
 * Extracted from analyticsService.ts to reduce file size and make the
 * tracking API easier to locate.
 *
 * Usage:
 *   import { trackScoreEntry } from '@/lib/services/analyticsTracking';
 */

import { analytics } from './analyticsService';
import { generateId } from '@/lib/utils/generateId';

type TrackingProps = Record<string, string | number | boolean | null>;

/** Generate a unique correlation ID for tracing related analytics events */
export function createCorrelationId(prefix: string): string {
  return generateId(prefix);
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
