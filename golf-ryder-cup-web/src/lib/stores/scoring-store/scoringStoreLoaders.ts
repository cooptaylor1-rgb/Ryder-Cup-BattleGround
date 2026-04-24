import { db } from '@/lib/db';
import {
  calculateMatchState,
  getCurrentHole,
} from '@/lib/services/scoringEngine';
import { ScoringEventType } from '@/lib/types/events';
import type { HoleResult, HoleWinner } from '@/lib/types/models';

import type {
  SelectedMatchLoadResult,
  SessionMatchesLoadResult,
  UndoEntry,
} from './scoringStoreTypes';

export async function loadSessionMatchesData(
  sessionId: string
): Promise<SessionMatchesLoadResult> {
  const matches = await db.matches.where('sessionId').equals(sessionId).sortBy('matchNumber');
  const matchIds = matches.map((match) => match.id);
  const allResults =
    matchIds.length > 0 ? await db.holeResults.where('matchId').anyOf(matchIds).toArray() : [];

  const resultsByMatch = new Map<string, HoleResult[]>();
  for (const result of allResults) {
    const existing = resultsByMatch.get(result.matchId) ?? [];
    existing.push(result);
    resultsByMatch.set(result.matchId, existing);
  }

  const matchStates = new Map();
  for (const match of matches) {
    const results = resultsByMatch.get(match.id) ?? [];
    matchStates.set(match.id, calculateMatchState(match, results));
  }

  return {
    sessionMatches: matches,
    matchStates,
  };
}

export async function loadSelectedMatchData(
  matchId: string
): Promise<SelectedMatchLoadResult> {
  const match = await db.matches.get(matchId);
  if (!match) {
    throw new Error('Match not found');
  }

  const session = await db.sessions.get(match.sessionId);
  const holeResults = await db.holeResults.where('matchId').equals(matchId).toArray();
  const matchState = calculateMatchState(match, holeResults);
  const nextHole = await getCurrentHole(matchId);
  const scoringEvents = await db.scoringEvents.where('matchId').equals(matchId).sortBy('timestamp');
  const undoStack: UndoEntry[] = [];
  const holeStateMap = new Map<number, HoleResult | null>();

  for (const event of scoringEvents) {
    if (event.eventType === ScoringEventType.HoleScored) {
      const payload = event.payload as {
        holeNumber: number;
        winner: HoleWinner;
        teamAStrokes?: number;
        teamBStrokes?: number;
      };

      undoStack.push({
        matchId: event.matchId,
        holeNumber: payload.holeNumber,
        previousResult: holeStateMap.get(payload.holeNumber) ?? null,
      });
      holeStateMap.set(payload.holeNumber, {
        id: '',
        matchId: event.matchId,
        holeNumber: payload.holeNumber,
        winner: payload.winner,
        teamAStrokes: payload.teamAStrokes,
        teamBStrokes: payload.teamBStrokes,
        timestamp: event.timestamp,
      });
      continue;
    }

    if (event.eventType === ScoringEventType.HoleEdited) {
      const payload = event.payload as {
        holeNumber: number;
        previousWinner: HoleWinner;
        newWinner: HoleWinner;
        previousTeamAStrokes?: number;
        previousTeamBStrokes?: number;
        newTeamAStrokes?: number;
        newTeamBStrokes?: number;
      };

      undoStack.push({
        matchId: event.matchId,
        holeNumber: payload.holeNumber,
        previousResult: {
          id: '',
          matchId: event.matchId,
          holeNumber: payload.holeNumber,
          winner: payload.previousWinner,
          teamAStrokes: payload.previousTeamAStrokes,
          teamBStrokes: payload.previousTeamBStrokes,
          timestamp: event.timestamp,
        },
      });
      holeStateMap.set(payload.holeNumber, {
        id: '',
        matchId: event.matchId,
        holeNumber: payload.holeNumber,
        winner: payload.newWinner,
        teamAStrokes: payload.newTeamAStrokes,
        teamBStrokes: payload.newTeamBStrokes,
        timestamp: event.timestamp,
      });
      continue;
    }

    if (event.eventType === ScoringEventType.HoleUndone) {
      const popped = undoStack.pop();
      if (popped) {
        if (popped.previousResult) {
          holeStateMap.set(popped.holeNumber, popped.previousResult);
        } else {
          holeStateMap.delete(popped.holeNumber);
        }
      }
    }
  }

  return {
    activeMatch: match,
    activeMatchState: matchState,
    activeSession: session ?? null,
    currentHole: nextHole || 18,
    undoStack,
  };
}
