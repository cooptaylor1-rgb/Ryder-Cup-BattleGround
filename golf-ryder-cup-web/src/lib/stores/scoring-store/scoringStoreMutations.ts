import { db } from '@/lib/db';
import { createCorrelationId, trackSyncFailure } from '@/lib/services/analyticsService';
import { generateTrashTalk } from '@/lib/services/autoTrashTalkService';
import { checkForDrama } from '@/lib/services/dramaNotificationService';
import {
  broadcastMatchUpdate,
  broadcastScoreUpdate,
  calculateCupScore,
} from '@/lib/services/realtimeSyncService';
import {
  calculateMatchState,
  calculateStoredMatchResult,
  recordHoleResult,
  undoLastScore,
} from '@/lib/services/scoringEngine';
import { queueSyncOperation } from '@/lib/services/tripSyncService';
import { isSupabaseConfigured, supabase } from '@/lib/supabase/client';
import type { MatchState } from '@/lib/types/computed';
import type {
  HoleResult,
  HoleWinner,
  Match,
  PlayerHoleScore,
} from '@/lib/types/models';

import type { UndoEntry } from './scoringStoreTypes';

export async function scoreActiveHoleData({
  activeMatch,
  currentHole,
  previousMatchState,
  undoStack,
  matchStates,
  sessionMatches,
  winner,
  teamAScore,
  teamBScore,
  teamAPlayerScores,
  teamBPlayerScores,
  options,
}: {
  activeMatch: Match;
  currentHole: number;
  previousMatchState: MatchState | null;
  undoStack: UndoEntry[];
  matchStates: Map<string, MatchState>;
  sessionMatches: Match[];
  winner: HoleWinner;
  teamAScore?: number;
  teamBScore?: number;
  teamAPlayerScores?: PlayerHoleScore[];
  teamBPlayerScores?: PlayerHoleScore[];
  options?: { advanceHole?: boolean };
}): Promise<{
  activeMatch: Match;
  activeMatchState: MatchState;
  currentHole: number;
  undoStack: UndoEntry[];
  matchStates: Map<string, MatchState>;
  lastSavedAt: Date;
}> {
  const previousResult =
    (await db.holeResults.where({ matchId: activeMatch.id, holeNumber: currentHole }).first()) ||
    null;

  await recordHoleResult(
    activeMatch.id,
    currentHole,
    winner,
    teamAScore,
    teamBScore,
    undefined,
    undefined,
    undefined,
    teamAPlayerScores,
    teamBPlayerScores
  );

  const holeResults = await db.holeResults.where('matchId').equals(activeMatch.id).toArray();
  const newMatchState = calculateMatchState(activeMatch, holeResults);
  const shouldAdvanceHole = options?.advanceHole ?? true;
  const nextHole =
    newMatchState.isClosedOut || !shouldAdvanceHole ? currentHole : Math.min(currentHole + 1, 18);

  const latestResult = holeResults.find((result) => result.holeNumber === currentHole);
  const session = await db.sessions.get(activeMatch.sessionId);
  const persistedResult = calculateStoredMatchResult(newMatchState);
  const nextMatchStatus =
    newMatchState.isClosedOut || newMatchState.holesRemaining === 0 ? 'completed' : 'inProgress';
  const matchToSync: Match = {
    ...activeMatch,
    currentHole: nextHole,
    status: nextMatchStatus,
    result: persistedResult,
    margin: Math.abs(newMatchState.currentScore),
    holesRemaining: newMatchState.holesRemaining,
    updatedAt: new Date().toISOString(),
  };

  if (latestResult && session) {
    queueSyncOperation('holeResult', latestResult.id, 'update', session.tripId, latestResult);
    queueSyncOperation('match', activeMatch.id, 'update', session.tripId, matchToSync);

    const scoreOperationCorrelationId = createCorrelationId('score-op');
    if (isSupabaseConfigured && supabase) {
      const scoreUpdate = {
        matchId: activeMatch.id,
        holeNumber: currentHole,
        teamAScore: teamAScore ?? 0,
        teamBScore: teamBScore ?? 0,
        timestamp: new Date().toISOString(),
        updatedBy: '',
        updatedByName: '',
      };

      broadcastScoreUpdate(supabase, session.tripId, activeMatch.id, scoreUpdate).catch((error) => {
        trackSyncFailure({
          area: 'realtime_broadcast',
          operation: 'broadcast_score_update',
          matchId: activeMatch.id,
          tripId: session.tripId,
          reason: error instanceof Error ? error.message : 'unknown',
          correlationId: scoreOperationCorrelationId,
        });
      });

      if (newMatchState.isClosedOut || newMatchState.holesRemaining === 0) {
        broadcastMatchUpdate(supabase, session.tripId, matchToSync).catch((error) => {
          trackSyncFailure({
            area: 'realtime_broadcast',
            operation: 'broadcast_match_update',
            matchId: activeMatch.id,
            tripId: session.tripId,
            reason: error instanceof Error ? error.message : 'unknown',
            correlationId: scoreOperationCorrelationId,
          });
        });
      }
    }

    if (newMatchState.isClosedOut || newMatchState.holesRemaining === 0) {
      await db.matches.update(activeMatch.id, {
        status: 'completed' as const,
        result: persistedResult,
        margin: matchToSync.margin,
        holesRemaining: matchToSync.holesRemaining,
        updatedAt: matchToSync.updatedAt,
      });
    } else {
      await db.matches.update(activeMatch.id, {
        currentHole: nextHole,
        status: nextMatchStatus,
        result: persistedResult,
        margin: matchToSync.margin,
        holesRemaining: matchToSync.holesRemaining,
        updatedAt: matchToSync.updatedAt,
      });
    }
  }

  const nextUndoStack = [
    ...undoStack,
    { matchId: activeMatch.id, holeNumber: currentHole, previousResult },
  ];
  const nextMatchStates = new Map(matchStates);
  nextMatchStates.set(activeMatch.id, newMatchState);

  if (previousMatchState) {
    try {
      const trip = await db.trips.get(session?.tripId ?? '');
      const teamAPlayers = await Promise.all(activeMatch.teamAPlayerIds.map((id) => db.players.get(id)));
      const teamBPlayers = await Promise.all(activeMatch.teamBPlayerIds.map((id) => db.players.get(id)));
      const teamANames = teamAPlayers.filter(Boolean).map((player) => player!.lastName).join(' / ') || 'Team A';
      const teamBNames = teamBPlayers.filter(Boolean).map((player) => player!.lastName).join(' / ') || 'Team B';

      const completedBefore = sessionMatches.filter(
        (match) => match.id !== activeMatch.id && match.status === 'completed'
      );
      const cupBefore = calculateCupScore(completedBefore);
      const completedAfter = [...completedBefore];
      if (newMatchState.status === 'completed') {
        completedAfter.push(matchToSync);
      }
      const cupAfter = calculateCupScore(completedAfter);

      checkForDrama({
        previousState: previousMatchState,
        newState: newMatchState,
        holeNumber: currentHole,
        teamANames,
        teamBNames,
        tripName: trip?.name ?? '',
        cupScoreBefore: cupBefore,
        cupScoreAfter: cupAfter,
      });

      generateTrashTalk({
        previousState: previousMatchState,
        newState: newMatchState,
        holeNumber: currentHole,
        teamANames,
        teamBNames,
        tripId: trip?.id ?? '',
      }).catch(() => {});
    } catch {
      // best effort only
    }
  }

  return {
    activeMatch: matchToSync,
    activeMatchState: newMatchState,
    currentHole: nextHole,
    undoStack: nextUndoStack,
    matchStates: nextMatchStates,
    lastSavedAt: new Date(),
  };
}

export async function undoLastHoleData({
  activeMatch,
  undoStack,
  matchStates,
}: {
  activeMatch: Match;
  undoStack: UndoEntry[];
  matchStates: Map<string, MatchState>;
}): Promise<{
  activeMatch: Match;
  activeMatchState: MatchState;
  currentHole: number;
  undoStack: UndoEntry[];
  matchStates: Map<string, MatchState>;
} | null> {
  const success = await undoLastScore(activeMatch.id);
  if (!success) {
    return null;
  }

  const refreshedMatch = await db.matches.get(activeMatch.id);
  if (!refreshedMatch) {
    throw new Error('Match not found after undo');
  }

  const holeResults = await db.holeResults.where('matchId').equals(activeMatch.id).toArray();
  const newMatchState = calculateMatchState(refreshedMatch, holeResults);
  const lastUndo = undoStack[undoStack.length - 1];
  const nextUndoStack = undoStack.slice(0, -1);
  const nextMatchStates = new Map(matchStates);
  nextMatchStates.set(activeMatch.id, newMatchState);

  return {
    activeMatch: refreshedMatch,
    activeMatchState: newMatchState,
    currentHole: lastUndo.holeNumber,
    undoStack: nextUndoStack,
    matchStates: nextMatchStates,
  };
}
