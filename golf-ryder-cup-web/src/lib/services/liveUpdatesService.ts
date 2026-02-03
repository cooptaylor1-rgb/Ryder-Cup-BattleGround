/**
 * Live Updates Service (Production Quality)
 *
 * Provides real-time database sync using Supabase Postgres Changes.
 * - Subscribes to database changes for live score updates
 * - Automatically reconnects on connection loss
 * - Handles conflict resolution
 * - Provides hooks for React components
 */

import { createLogger } from '@/lib/utils/logger';
import { supabase, isSupabaseConfigured } from '../supabase/client';

const logger = createLogger('LiveUpdates');
import { db } from '../db';
import { deleteMatchCascade } from './cascadeDelete';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import type { Match, HoleResult, RyderCupSession } from '../types/models';
import type { MatchDbRecord, HoleResultDbRecord, SessionDbRecord } from '../types/dbRecords';

// ============================================
// TYPES
// ============================================

export type ChangeEvent = 'INSERT' | 'UPDATE' | 'DELETE';

export interface LiveUpdateCallbacks {
  onMatchChange?: (match: Match, event: ChangeEvent) => void;
  onHoleResultChange?: (result: HoleResult, event: ChangeEvent) => void;
  onSessionChange?: (session: RyderCupSession, event: ChangeEvent) => void;
  onConnectionChange?: (connected: boolean) => void;
  onError?: (error: Error) => void;
}

export interface SubscriptionState {
  tripId: string;
  isConnected: boolean;
  reconnectAttempts: number;
  lastEventAt: string | null;
}

// ============================================
// STATE
// ============================================

let activeSubscription: {
  channel: RealtimeChannel;
  tripId: string;
  callbacks: LiveUpdateCallbacks;
} | null = null;

let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;
const BASE_RECONNECT_DELAY = 1000;

let resubscribeTimer: ReturnType<typeof setTimeout> | null = null;
let activeFilterKey: string | null = null;
let cachedSessionIds: Set<string> | null = null;
let cachedMatchIds: Set<string> | null = null;

// Page visibility state for pausing updates when tab is hidden
let isPageVisible = true;
let visibilityHandler: (() => void) | null = null;
let visibilityDisconnectTimer: ReturnType<typeof setTimeout> | null = null;
const VISIBILITY_DISCONNECT_DELAY = 30000;

// ============================================
// HELPERS
// ============================================

function canSubscribe(): boolean {
  return isSupabaseConfigured && !!supabase;
}

function getReconnectDelay(): number {
  const delay = Math.min(BASE_RECONNECT_DELAY * Math.pow(2, reconnectAttempts), 30000);
  return delay * (0.8 + Math.random() * 0.4); // Add jitter
}

function serializeIds(ids: string[]): string {
  return ids.sort().join(',');
}

async function buildFilterCache(tripId: string): Promise<{
  sessionIds: string[];
  matchIds: string[];
  filterKey: string;
}> {
  const sessions = await db.sessions.where('tripId').equals(tripId).toArray();
  const sessionIds = sessions.map((s) => s.id);

  if (sessionIds.length === 0) {
    return { sessionIds, matchIds: [], filterKey: `${tripId}::` };
  }

  const matches = await db.matches.where('sessionId').anyOf(sessionIds).toArray();
  const matchIds = matches.map((m) => m.id);
  const filterKey = `${serializeIds(sessionIds)}::${serializeIds(matchIds)}`;

  return { sessionIds, matchIds, filterKey };
}

function scheduleResubscribe(tripId: string, callbacks: LiveUpdateCallbacks): void {
  if (resubscribeTimer) return;

  resubscribeTimer = setTimeout(async () => {
    resubscribeTimer = null;
    const cache = await buildFilterCache(tripId);
    if (cache.filterKey !== activeFilterKey) {
      await subscribeLiveUpdates(tripId, callbacks);
    }
  }, 300);
}

/**
 * Set up page visibility handler to pause/resume updates
 * This saves resources when the tab is not visible
 */
function setupVisibilityHandler(tripId: string, callbacks: LiveUpdateCallbacks): void {
  if (typeof document === 'undefined') return;

  // Clean up existing handler
  cleanupVisibilityHandler();

  visibilityHandler = () => {
    const wasVisible = isPageVisible;
    isPageVisible = document.visibilityState === 'visible';

    if (wasVisible !== isPageVisible) {
      if (isPageVisible) {
        // Tab became visible - reconnect if needed
        logger.log('Tab visible - resuming live updates');
        if (visibilityDisconnectTimer) {
          clearTimeout(visibilityDisconnectTimer);
          visibilityDisconnectTimer = null;
        }
        if (!activeSubscription && canSubscribe()) {
          subscribeLiveUpdates(tripId, callbacks);
        }
      } else {
        // Tab hidden - pause updates to save resources
        logger.log('Tab hidden - pausing live updates');
        if (!visibilityDisconnectTimer) {
          visibilityDisconnectTimer = setTimeout(async () => {
            visibilityDisconnectTimer = null;
            if (!isPageVisible && activeSubscription) {
              logger.log('Tab hidden - disconnecting live updates');
              await unsubscribeLiveUpdates();
              callbacks.onConnectionChange?.(false);
            }
          }, VISIBILITY_DISCONNECT_DELAY);
        }
      }
    }
  };

  document.addEventListener('visibilitychange', visibilityHandler);
  isPageVisible = document.visibilityState === 'visible';
}

/**
 * Clean up visibility handler
 */
function cleanupVisibilityHandler(): void {
  if (visibilityHandler && typeof document !== 'undefined') {
    document.removeEventListener('visibilitychange', visibilityHandler);
    visibilityHandler = null;
  }

  if (visibilityDisconnectTimer) {
    clearTimeout(visibilityDisconnectTimer);
    visibilityDisconnectTimer = null;
  }
}

// Convert snake_case DB record to camelCase
function toMatch(record: MatchDbRecord): Match {
  return {
    id: record.id,
    sessionId: record.session_id,
    courseId: record.course_id,
    teeSetId: record.tee_set_id,
    matchOrder: record.match_order,
    status: record.status,
    startTime: record.start_time,
    currentHole: record.current_hole,
    teamAPlayerIds: record.team_a_player_ids,
    teamBPlayerIds: record.team_b_player_ids,
    teamAHandicapAllowance: record.team_a_handicap_allowance ?? 0,
    teamBHandicapAllowance: record.team_b_handicap_allowance ?? 0,
    result: record.result ?? 'notFinished',
    margin: record.margin ?? 0,
    holesRemaining: record.holes_remaining ?? 18,
    notes: record.notes,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

function toHoleResult(record: HoleResultDbRecord): HoleResult {
  // DB stores strokes as arrays (for multi-player teams), model uses total strokes
  const teamATotal = record.team_a_strokes?.reduce((sum, s) => sum + s, 0);
  const teamBTotal = record.team_b_strokes?.reduce((sum, s) => sum + s, 0);

  return {
    id: record.id,
    matchId: record.match_id,
    holeNumber: record.hole_number,
    winner: record.winner,
    teamAStrokes: teamATotal,
    teamBStrokes: teamBTotal,
    scoredBy: record.scored_by,
    notes: record.notes,
    timestamp: record.timestamp,
  };
}

function toSession(record: SessionDbRecord): RyderCupSession {
  // Map DB time slot format to model format
  const mapTimeSlot = (slot?: 'morning' | 'afternoon'): 'AM' | 'PM' | undefined => {
    if (!slot) return undefined;
    return slot === 'morning' ? 'AM' : 'PM';
  };

  return {
    id: record.id,
    tripId: record.trip_id,
    name: record.name,
    sessionNumber: record.session_number,
    sessionType: record.session_type,
    scheduledDate: record.scheduled_date,
    timeSlot: mapTimeSlot(record.time_slot),
    pointsPerMatch: record.points_per_match,
    notes: record.notes,
    status: record.status,
    isLocked: record.is_locked,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

// ============================================
// SUBSCRIPTION MANAGEMENT
// ============================================

/**
 * Subscribe to live updates for a trip
 */
export async function subscribeLiveUpdates(
  tripId: string,
  callbacks: LiveUpdateCallbacks
): Promise<() => void> {
  if (!canSubscribe() || !supabase) {
    logger.warn('Supabase not configured');
    return () => {};
  }

  // Clean up existing subscription
  if (activeSubscription) {
    await unsubscribeLiveUpdates();
  }

  reconnectAttempts = 0;

  const filterCache = await buildFilterCache(tripId);
  cachedSessionIds = new Set(filterCache.sessionIds);
  cachedMatchIds = new Set(filterCache.matchIds);
  activeFilterKey = filterCache.filterKey;

  const channel = supabase.channel(`live-updates:${tripId}`);

  if (filterCache.sessionIds.length > 0) {
    channel.on<MatchDbRecord>(
      'postgres_changes' as 'system', // Type workaround
      {
        event: '*',
        schema: 'public',
        table: 'matches',
        filter: `session_id=in.(${filterCache.sessionIds.join(',')})`,
      },
      async (payload: RealtimePostgresChangesPayload<MatchDbRecord>) => {
        await handleMatchChange(payload, tripId, callbacks);
      }
    );
  } else {
    logger.log('Live updates: no sessions yet, skipping match subscriptions');
  }

  if (filterCache.matchIds.length > 0) {
    channel.on<HoleResultDbRecord>(
      'postgres_changes' as 'system',
      {
        event: '*',
        schema: 'public',
        table: 'hole_results',
        filter: `match_id=in.(${filterCache.matchIds.join(',')})`,
      },
      async (payload: RealtimePostgresChangesPayload<HoleResultDbRecord>) => {
        await handleHoleResultChange(payload, tripId, callbacks);
      }
    );
  } else {
    logger.log('Live updates: no matches yet, skipping hole result subscriptions');
  }

  channel.on<SessionDbRecord>(
    'postgres_changes' as 'system',
    {
      event: '*',
      schema: 'public',
      table: 'sessions',
      filter: `trip_id=eq.${tripId}`,
    },
    async (payload: RealtimePostgresChangesPayload<SessionDbRecord>) => {
      await handleSessionChange(payload, callbacks);
      scheduleResubscribe(tripId, callbacks);
    }
  );

  channel.subscribe((status) => {
    if (status === 'SUBSCRIBED') {
      logger.log('Connected to trip:', tripId);
      reconnectAttempts = 0;
      callbacks.onConnectionChange?.(true);
    } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
      logger.error('Connection error:', status);
      callbacks.onConnectionChange?.(false);
      scheduleReconnect(tripId, callbacks);
    } else if (status === 'CLOSED') {
      callbacks.onConnectionChange?.(false);
    }
  });

  activeSubscription = { channel, tripId, callbacks };

  // Set up page visibility handling to pause/resume updates
  setupVisibilityHandler(tripId, callbacks);

  // Return unsubscribe function
  return () => {
    unsubscribeLiveUpdates();
  };
}

/**
 * Unsubscribe from live updates
 */
export async function unsubscribeLiveUpdates(): Promise<void> {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }

  if (resubscribeTimer) {
    clearTimeout(resubscribeTimer);
    resubscribeTimer = null;
  }

  // Clean up visibility handler
  cleanupVisibilityHandler();

  if (activeSubscription && supabase) {
    try {
      await supabase.removeChannel(activeSubscription.channel);
    } catch (err) {
      logger.error('Error removing channel:', err);
    }
    activeSubscription = null;
  }

  activeFilterKey = null;
  cachedSessionIds = null;
  cachedMatchIds = null;
}

/**
 * Schedule a reconnection attempt
 */
function scheduleReconnect(tripId: string, callbacks: LiveUpdateCallbacks): void {
  if (reconnectTimer) return;
  if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    logger.error('Max reconnect attempts reached');
    callbacks.onError?.(new Error('Max reconnect attempts reached'));
    return;
  }

  const delay = getReconnectDelay();
  reconnectAttempts++;

  logger.log(`Reconnecting in ${Math.round(delay / 1000)}s (attempt ${reconnectAttempts})`);

  reconnectTimer = setTimeout(async () => {
    reconnectTimer = null;
    await subscribeLiveUpdates(tripId, callbacks);
  }, delay);
}

// ============================================
// CHANGE HANDLERS
// ============================================

async function handleMatchChange(
  payload: RealtimePostgresChangesPayload<MatchDbRecord>,
  tripId: string,
  callbacks: LiveUpdateCallbacks
): Promise<void> {
  if (!isPageVisible) return;
  const eventType = payload.eventType as ChangeEvent;
  const record = (payload.new || payload.old) as MatchDbRecord | null;

  if (!record) return;

  // Filter to only matches in this trip's sessions
  if (cachedSessionIds && cachedSessionIds.size > 0 && !cachedSessionIds.has(record.session_id)) {
    return;
  }

  const match = toMatch(record);

  // Update local database
  try {
    if (eventType === 'DELETE') {
      // Mirror server-side deletes locally, including dependent scoring data.
      await deleteMatchCascade(match.id, { sync: false });
    } else {
      // Check if we have a newer version locally
      const local = await db.matches.get(match.id);
      if (local?.updatedAt && match.updatedAt && local.updatedAt > match.updatedAt) {
        logger.log('Skipping older match update');
        return;
      }
      await db.matches.put(match);
    }
  } catch (err) {
    logger.error('Error updating local match:', err);
  }

  // Notify callback
  callbacks.onMatchChange?.(match, eventType);

  scheduleResubscribe(tripId, callbacks);
}

async function handleHoleResultChange(
  payload: RealtimePostgresChangesPayload<HoleResultDbRecord>,
  tripId: string,
  callbacks: LiveUpdateCallbacks
): Promise<void> {
  if (!isPageVisible) return;
  const eventType = payload.eventType as ChangeEvent;
  const record = (payload.new || payload.old) as HoleResultDbRecord | null;

  if (!record) return;

  // Filter to only hole results for matches in this trip
  if (cachedMatchIds && cachedMatchIds.size > 0 && !cachedMatchIds.has(record.match_id)) {
    return;
  }

  const holeResult = toHoleResult(record);

  // Update local database
  try {
    if (eventType === 'DELETE') {
      await db.holeResults.delete(holeResult.id);
    } else {
      // For hole results, newer timestamp wins
      const local = await db.holeResults.get(holeResult.id);
      if (local?.timestamp && holeResult.timestamp && local.timestamp > holeResult.timestamp) {
        logger.log('Skipping older hole result');
        return;
      }
      await db.holeResults.put(holeResult);
    }
  } catch (err) {
    logger.error('Error updating local hole result:', err);
  }

  // Notify callback
  callbacks.onHoleResultChange?.(holeResult, eventType);
}

async function handleSessionChange(
  payload: RealtimePostgresChangesPayload<SessionDbRecord>,
  callbacks: LiveUpdateCallbacks
): Promise<void> {
  if (!isPageVisible) return;
  const eventType = payload.eventType as ChangeEvent;
  const record = (payload.new || payload.old) as SessionDbRecord | null;

  if (!record) return;

  const session = toSession(record);

  // Update local database
  try {
    if (eventType === 'DELETE') {
      await db.sessions.delete(session.id);
    } else {
      const local = await db.sessions.get(session.id);
      if (local?.updatedAt && session.updatedAt && local.updatedAt > session.updatedAt) {
        logger.log('Skipping older session update');
        return;
      }
      await db.sessions.put(session);
    }
  } catch (err) {
    logger.error('Error updating local session:', err);
  }

  // Notify callback
  callbacks.onSessionChange?.(session, eventType);
}

// ============================================
// STATE GETTERS
// ============================================

export function getLiveUpdateState(): SubscriptionState | null {
  if (!activeSubscription) return null;

  return {
    tripId: activeSubscription.tripId,
    isConnected: true, // Simplified - would need to track actual state
    reconnectAttempts,
    lastEventAt: new Date().toISOString(),
  };
}

export function isLiveUpdatesActive(): boolean {
  return activeSubscription !== null;
}
