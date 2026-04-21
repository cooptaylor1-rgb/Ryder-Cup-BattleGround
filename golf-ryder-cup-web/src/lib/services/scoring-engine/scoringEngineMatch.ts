import { db } from '@/lib/db';
import type { Match, Player } from '@/lib/types/models';

import { buildMatchHandicapContext } from '../matchHandicapService';
import { queueSyncOperation } from '../tripSyncService';
import { calculateMatchState } from './scoringEngineAggregation';
import { calculateStoredMatchResult } from './scoringEngineResults';

/**
 * Resolve the tripId for a session so every Dexie write in this
 * module can hand the trip-sync queue a correctly-scoped operation.
 * Returns null if the session is already gone — callers should
 * skip queueing in that case rather than fabricate an empty id.
 */
async function resolveTripIdForSession(sessionId: string): Promise<string | null> {
  const session = await db.sessions.get(sessionId);
  return session?.tripId ?? null;
}

/**
 * Keep a session's status in sync with its matches so the Live page's
 * getActiveSession selector can move on to the next round automatically:
 *   - all matches completed → session 'completed'
 *   - any match back to inProgress/scheduled → session back to 'inProgress'
 * Paused sessions are left alone so a captain override survives.
 */
async function maybeAdvanceSessionStatus(sessionId: string): Promise<void> {
  const session = await db.sessions.get(sessionId);
  if (!session) return;
  if (session.status === 'paused') return;

  const sessionMatches = await db.matches.where('sessionId').equals(sessionId).toArray();
  if (sessionMatches.length === 0) return;

  const allComplete = sessionMatches.every((m) => m.status === 'completed');
  const nextStatus = allComplete ? 'completed' : 'inProgress';
  if (session.status === nextStatus) return;

  const updates = {
    status: nextStatus as 'inProgress' | 'completed',
    updatedAt: new Date().toISOString(),
  };
  await db.sessions.update(sessionId, updates);
  queueSyncOperation('session', sessionId, 'update', session.tripId, { ...session, ...updates });
}

export async function createMatch(
  sessionId: string,
  matchNumber: number,
  teamAPlayers: string[],
  teamBPlayers: string[]
): Promise<Match> {
  const now = new Date().toISOString();
  const session = await db.sessions.get(sessionId);
  // A new match inherits the session's default course + tee set so
  // allowances are computed with real slope/rating from the start,
  // not the raw-rounded-index fallback.
  const teeSet = session?.defaultTeeSetId
    ? (await db.teeSets.get(session.defaultTeeSetId)) ?? undefined
    : undefined;
  const loadedPlayers = (await db.players.bulkGet([...teamAPlayers, ...teamBPlayers])).filter(
    Boolean
  ) as Player[];
  const playerById = new Map(loadedPlayers.map((player) => [player.id, player]));
  const handicapContext = buildMatchHandicapContext({
    sessionType: session?.sessionType,
    teamAPlayers: teamAPlayers
      .map((playerId) => playerById.get(playerId))
      .filter((player): player is Player => Boolean(player)),
    teamBPlayers: teamBPlayers
      .map((playerId) => playerById.get(playerId))
      .filter((player): player is Player => Boolean(player)),
    teeSet,
  });

  const match: Match = {
    id: crypto.randomUUID(),
    sessionId,
    matchOrder: matchNumber,
    teamAPlayerIds: teamAPlayers,
    teamBPlayerIds: teamBPlayers,
    status: 'scheduled',
    currentHole: 1,
    // Inherit the session defaults so per-match overrides are opt-in.
    courseId: session?.defaultCourseId,
    teeSetId: session?.defaultTeeSetId,
    teamAHandicapAllowance: handicapContext.teamAHandicapAllowance,
    teamBHandicapAllowance: handicapContext.teamBHandicapAllowance,
    result: 'notFinished',
    margin: 0,
    holesRemaining: 18,
    version: 1,
    createdAt: now,
    updatedAt: now,
  };

  await db.matches.add(match);
  // Every scoring-engine Dexie write pushes a trip-sync create/update so
  // the cloud eventually has the row. Without this the match lived
  // only on the captain's device — standings, live view, and other
  // devices stayed blind until someone touched the match through a
  // different code path that happened to queue sync.
  const tripId = session?.tripId ?? (await resolveTripIdForSession(sessionId));
  if (tripId) {
    queueSyncOperation('match', match.id, 'create', tripId, match);
  }
  return match;
}

export async function finalizeMatch(matchId: string): Promise<void> {
  const match = await db.matches.get(matchId);
  if (!match) return;

  const holeResults = await db.holeResults.where('matchId').equals(matchId).toArray();
  const matchState = calculateMatchState(match, holeResults);

  if (matchState.isClosedOut || matchState.holesRemaining === 0) {
    const updates = {
      status: 'completed' as const,
      result: calculateStoredMatchResult(matchState),
      margin: Math.abs(matchState.currentScore),
      holesRemaining: matchState.holesRemaining,
      version: (match.version ?? 0) + 1,
      updatedAt: new Date().toISOString(),
    };
    await db.matches.update(matchId, updates);
    const tripId = await resolveTripIdForSession(match.sessionId);
    if (tripId) {
      queueSyncOperation('match', matchId, 'update', tripId, { ...match, ...updates });
    }
    await maybeAdvanceSessionStatus(match.sessionId);
  }
}

/**
 * Revert a completed match back to in-progress so a captain can correct
 * a miskeyed hole after the match was finalized. Caller is expected to
 * guard this behind captain mode and log to the audit trail.
 */
export async function reopenMatch(matchId: string): Promise<void> {
  const match = await db.matches.get(matchId);
  if (!match) return;
  if (match.status !== 'completed') return;

  const holeResults = await db.holeResults.where('matchId').equals(matchId).toArray();
  const matchState = calculateMatchState(match, holeResults);

  const updates = {
    status: 'inProgress' as const,
    result: 'notFinished' as const,
    margin: Math.abs(matchState.currentScore),
    holesRemaining: matchState.holesRemaining,
    version: (match.version ?? 0) + 1,
    updatedAt: new Date().toISOString(),
  };
  await db.matches.update(matchId, updates);
  const tripId = await resolveTripIdForSession(match.sessionId);
  if (tripId) {
    queueSyncOperation('match', matchId, 'update', tripId, { ...match, ...updates });
  }
  await maybeAdvanceSessionStatus(match.sessionId);
}
