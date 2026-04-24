/**
 * Real-Time Sync Service
 *
 * Provides real-time score synchronization using Supabase Realtime.
 * All players see live score updates without refreshing.
 */

import type { UUID, Match, HoleResult } from '@/lib/types/models';
import type { RealtimeChannel, SupabaseClient as BaseSupabaseClient } from '@supabase/supabase-js';
import { syncLogger } from '@/lib/utils/logger';

// Type for Supabase client - use generic to allow any schema type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClient = Pick<BaseSupabaseClient<any>, 'channel' | 'removeChannel'>;

// Store active channels
const activeChannels = new Map<string, RealtimeChannel>();

// Callback types
export type ScoreUpdateCallback = (update: ScoreUpdate) => void;
export type MatchUpdateCallback = (match: Match) => void;
export type PresenceCallback = (presence: PlayerPresence[]) => void;

export interface ScoreUpdate {
  matchId: UUID;
  holeNumber: number;
  teamAScore: number;
  teamBScore: number;
  teamAStrokes?: number;
  teamBStrokes?: number;
  timestamp: string;
  updatedBy: UUID;
  updatedByName: string;
}

export interface PlayerPresence {
  playerId: UUID;
  playerName: string;
  status: 'online' | 'scoring' | 'viewing';
  currentMatchId?: UUID;
  lastSeen: string;
}

export interface LiveMatch {
  matchId: UUID;
  status: 'active' | 'completed';
  currentHole: number;
  teamAScore: number;
  teamBScore: number;
  matchStatus: string;
  viewers: PlayerPresence[];
  lastUpdate: string;
}

// ============================================
// CHANNEL MANAGEMENT
// ============================================

/**
 * Subscribe to trip-wide updates
 */
export async function subscribeToTrip(
  supabase: SupabaseClient,
  tripId: UUID,
  callbacks: {
    onScoreUpdate?: ScoreUpdateCallback;
    onMatchUpdate?: MatchUpdateCallback;
    onPresence?: PresenceCallback;
  }
): Promise<() => void> {
  const channelName = `trip:${tripId}`;

  // Remove existing channel if any
  const existing = activeChannels.get(channelName);
  if (existing) {
    await supabase.removeChannel(existing);
    activeChannels.delete(channelName);
  }

  const channel = supabase
    .channel(channelName)
    .on('broadcast', { event: 'score_update' }, ({ payload }) => {
      if (callbacks.onScoreUpdate) {
        callbacks.onScoreUpdate(payload as ScoreUpdate);
      }
    })
    .on('broadcast', { event: 'match_update' }, ({ payload }) => {
      if (callbacks.onMatchUpdate) {
        callbacks.onMatchUpdate(payload as Match);
      }
    })
    .on('presence', { event: 'sync' }, () => {
      if (callbacks.onPresence) {
        const state = channel.presenceState();
        const presences = Object.values(state).flat() as unknown as PlayerPresence[];
        callbacks.onPresence(presences);
      }
    })
    .subscribe();

  activeChannels.set(channelName, channel);

  // Return unsubscribe function
  return () => {
    supabase.removeChannel(channel);
    activeChannels.delete(channelName);
  };
}

/**
 * Subscribe to a specific match
 */
export async function subscribeToMatch(
  supabase: SupabaseClient,
  matchId: UUID,
  callbacks: {
    onScoreUpdate?: ScoreUpdateCallback;
    onPresence?: PresenceCallback;
  }
): Promise<() => void> {
  const channelName = `match:${matchId}`;

  const existing = activeChannels.get(channelName);
  if (existing) {
    await supabase.removeChannel(existing);
    activeChannels.delete(channelName);
  }

  const channel = supabase
    .channel(channelName)
    .on('broadcast', { event: 'score_update' }, ({ payload }) => {
      if (callbacks.onScoreUpdate) {
        callbacks.onScoreUpdate(payload as ScoreUpdate);
      }
    })
    .on('presence', { event: 'sync' }, () => {
      if (callbacks.onPresence) {
        const state = channel.presenceState();
        const presences = Object.values(state).flat() as unknown as PlayerPresence[];
        callbacks.onPresence(presences);
      }
    })
    .subscribe();

  activeChannels.set(channelName, channel);

  return () => {
    supabase.removeChannel(channel);
    activeChannels.delete(channelName);
  };
}

// ============================================
// BROADCASTING
// ============================================

/**
 * Send a broadcast payload with exponential-backoff retries. The REST
 * sync queue is the durable path for data integrity; this broadcast
 * layer exists only to make peer devices update immediately instead of
 * waiting for their next pull. Retries smooth over short channel
 * hiccups (reconnect, tab inactivity) without blocking the caller.
 *
 * Throws on final failure so the caller can surface it — previously
 * broadcast errors were logged and swallowed, so captains had no
 * signal that other phones weren't seeing updates.
 */
const BROADCAST_RETRY_DELAYS_MS = [500, 1500, 4500];

async function sendBroadcastWithRetry(
  channelKey: string,
  event: string,
  payload: unknown
): Promise<void> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= BROADCAST_RETRY_DELAYS_MS.length; attempt++) {
    const channel = activeChannels.get(channelKey);
    if (!channel) return; // Channel closed; nothing to broadcast to.
    try {
      await channel.send({ type: 'broadcast', event, payload });
      return;
    } catch (error) {
      lastError = error;
      const delay = BROADCAST_RETRY_DELAYS_MS[attempt];
      if (delay === undefined) break;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error(`broadcast failed after retries: ${channelKey}/${event}`);
}

/**
 * Broadcast a score update to all subscribers.
 */
export async function broadcastScoreUpdate(
  _supabase: SupabaseClient,
  tripId: UUID,
  matchId: UUID,
  update: ScoreUpdate
): Promise<void> {
  const errors: unknown[] = [];
  // Fire both channels independently so a failure on one doesn't suppress
  // the other. Callers see an aggregated error if either channel failed
  // after all retries.
  await Promise.all([
    sendBroadcastWithRetry(`trip:${tripId}`, 'score_update', update).catch((e) =>
      errors.push(e)
    ),
    sendBroadcastWithRetry(`match:${matchId}`, 'score_update', update).catch((e) =>
      errors.push(e)
    ),
  ]);
  if (errors.length > 0) {
    syncLogger.error('Failed to broadcast score update:', errors);
    throw errors[0];
  }
}

/**
 * Broadcast a match status update.
 */
export async function broadcastMatchUpdate(
  _supabase: SupabaseClient,
  tripId: UUID,
  match: Match
): Promise<void> {
  try {
    await sendBroadcastWithRetry(`trip:${tripId}`, 'match_update', match);
  } catch (error) {
    syncLogger.error('Failed to broadcast match update:', error);
    throw error;
  }
}

// ============================================
// PRESENCE
// ============================================

/**
 * Track player presence for a match
 */
export async function trackPresence(
  _supabase: SupabaseClient,
  matchId: UUID,
  playerId: UUID,
  playerName: string,
  status: PlayerPresence['status']
): Promise<void> {
  const channel = activeChannels.get(`match:${matchId}`);
  if (!channel) return;

  try {
    await channel.track({
      playerId,
      playerName,
      status,
      currentMatchId: matchId,
      lastSeen: new Date().toISOString(),
    });
  } catch (error) {
    syncLogger.error('Failed to track presence:', error);
  }
}

/**
 * Update presence status
 */
export async function updatePresenceStatus(
  _supabase: SupabaseClient,
  matchId: UUID,
  status: PlayerPresence['status']
): Promise<void> {
  const channel = activeChannels.get(`match:${matchId}`);
  if (!channel) return;

  try {
    // Get current presence and update status
    const state = channel.presenceState();
    const currentPresence = Object.values(state).flat()[0] as unknown as PlayerPresence | undefined;

    if (currentPresence) {
      await channel.track({
        ...currentPresence,
        status,
        lastSeen: new Date().toISOString(),
      });
    }
  } catch (error) {
    syncLogger.error('Failed to update presence status:', error);
  }
}

// ============================================
// LEADERBOARD
// ============================================

export interface LiveLeaderboardEntry {
  matchId: UUID;
  matchLabel: string;
  format: string;
  teamAPlayers: string[];
  teamBPlayers: string[];
  teamAScore: number;
  teamBScore: number;
  currentHole: number;
  matchStatus: string;
  isActive: boolean;
}

/**
 * Build live leaderboard from matches
 */
export function buildLiveLeaderboard(
  matches: Match[],
  holeResults: Map<UUID, HoleResult[]>
): LiveLeaderboardEntry[] {
  return matches
    .filter((m) => m.status === 'inProgress' || m.status === 'completed')
    .map((match) => {
      const results = holeResults.get(match.id) || [];
      const lastResult = results[results.length - 1];

      // Calculate current scores from hole results
      let teamATotal = 0;
      let teamBTotal = 0;

      for (const result of results) {
        if (result.teamAStrokes !== undefined) teamATotal += result.teamAStrokes;
        if (result.teamBStrokes !== undefined) teamBTotal += result.teamBStrokes;
      }

      // Determine match status string from margin and holes remaining
      let matchStatusStr = 'AS';
      if (match.result !== 'notFinished' && match.result !== 'incomplete') {
        if (match.result === 'halved') {
          matchStatusStr = 'AS';
        } else if (match.holesRemaining > 0) {
          matchStatusStr = `${match.margin}&${match.holesRemaining}`;
        } else {
          matchStatusStr = `${match.margin} up`;
        }
      }

      return {
        matchId: match.id,
        matchLabel: `Match ${match.matchOrder}`,
        format: match.teamAPlayerIds.length === 1 ? 'singles' : 'team',
        teamAPlayers: match.teamAPlayerIds,
        teamBPlayers: match.teamBPlayerIds,
        teamAScore: teamATotal,
        teamBScore: teamBTotal,
        currentHole: lastResult?.holeNumber || match.currentHole,
        matchStatus: matchStatusStr,
        isActive: match.status === 'inProgress',
      };
    })
    .sort((a, b) => {
      // Active matches first
      if (a.isActive && !b.isActive) return -1;
      if (!a.isActive && b.isActive) return 1;
      return 0;
    });
}

/**
 * Calculate overall cup score from matches
 */
export function calculateCupScore(matches: Match[]): { teamA: number; teamB: number } {
  let teamA = 0;
  let teamB = 0;

  for (const match of matches) {
    if (match.status !== 'completed') continue;

    // Determine winner from result type
    if (match.result === 'teamAWin') {
      teamA += 1;
    } else if (match.result === 'teamBWin') {
      teamB += 1;
    } else if (match.result === 'halved') {
      teamA += 0.5;
      teamB += 0.5;
    }
  }

  return { teamA, teamB };
}

// ============================================
// CLEANUP
// ============================================

/**
 * Unsubscribe from all channels
 */
export async function unsubscribeAll(supabase: SupabaseClient): Promise<void> {
  for (const [name, channel] of activeChannels) {
    await supabase.removeChannel(channel);
    activeChannels.delete(name);
  }
}

/**
 * Get active channel names
 */
export function getActiveChannels(): string[] {
  return Array.from(activeChannels.keys());
}
