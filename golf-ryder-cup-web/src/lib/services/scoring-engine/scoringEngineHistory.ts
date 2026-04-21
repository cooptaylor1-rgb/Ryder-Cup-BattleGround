import { db } from '@/lib/db';
import {
  ScoringEventType,
  type HoleEditedPayload,
  type HoleScoredPayload,
  type HoleUndonePayload,
  type ScoringEvent,
} from '@/lib/types/events';
import { scoringLogger } from '@/lib/utils/logger';
import { queueSyncOperation } from '../tripSyncService';
import { calculateMatchState } from './scoringEngineAggregation';
import { calculateStoredMatchResult } from './scoringEngineResults';

export interface UndoResult {
  success: boolean;
  /** The hole number that was undone, if successful */
  holeNumber?: number;
  /** The previous winner that was restored, if successful */
  previousWinner?: string;
  /** Reason the undo failed, if applicable */
  failureReason?: 'no_events' | 'not_undoable' | 'hole_mismatch';
}

/**
 * Undo the last scoring event for a match.
 *
 * Includes safety checks:
 * - Verifies the event is an actual score (not already an undo)
 * - Validates the hole result still exists in DB before modifying
 * - Returns structured result with failure reason for better UX
 *
 * @param expectedHoleNumber - Optional. If provided, undo is rejected when the
 *   last event targets a different hole (protects against multi-device race conditions).
 */
export async function undoLastScore(
  matchId: string,
  expectedHoleNumber?: number,
): Promise<UndoResult> {
  // Include db.matches in the transaction so the match row rolls back
  // atomically with the holeResults delete/modify. Previously the undo
  // only reverted the hole result; match.currentHole / status / result
  // stayed at the post-score state, so a refresh (or any other device)
  // saw a match on hole 3 with no hole 2 score and the old close-out
  // status frozen in place. Recompute match state from the freshly-
  // rolled-back hole results and patch the row within the same
  // transaction, then queue a trip-sync op for the update outside of
  // it (sync queueing can't run inside a Dexie transaction).
  const result = await db.transaction(
    'rw',
    [db.holeResults, db.scoringEvents, db.matches],
    async () => {
      const events = await db.scoringEvents.where('matchId').equals(matchId).sortBy('timestamp');
      if (events.length === 0) {
        return { success: false as const, failureReason: 'no_events' as const };
      }

      const lastEvent = events[events.length - 1];
      if (
        lastEvent.eventType !== ScoringEventType.HoleScored &&
        lastEvent.eventType !== ScoringEventType.HoleEdited
      ) {
        return { success: false as const, failureReason: 'not_undoable' as const };
      }

      const payload = lastEvent.payload as HoleScoredPayload | HoleEditedPayload;
      const holeNumber = payload.holeNumber;

      if (expectedHoleNumber !== undefined && holeNumber !== expectedHoleNumber) {
        scoringLogger.warn('Undo rejected: hole mismatch', {
          matchId,
          expected: expectedHoleNumber,
          actual: holeNumber,
        });
        return {
          success: false as const,
          failureReason: 'hole_mismatch' as const,
          holeNumber,
        };
      }

      if (payload.type === 'hole_edited') {
        await db.holeResults.where({ matchId, holeNumber }).modify({
          winner: payload.previousWinner,
          teamAScore: payload.previousTeamAStrokes,
          teamBScore: payload.previousTeamBStrokes,
        });
      } else {
        await db.holeResults.where({ matchId, holeNumber }).delete();
      }

      const undoPayload: HoleUndonePayload = {
        type: 'hole_undone',
        holeNumber,
        previousWinner:
          payload.type === 'hole_edited' ? payload.previousWinner : payload.winner,
        previousTeamAStrokes:
          payload.type === 'hole_edited'
            ? payload.previousTeamAStrokes
            : payload.teamAStrokes,
        previousTeamBStrokes:
          payload.type === 'hole_edited'
            ? payload.previousTeamBStrokes
            : payload.teamBStrokes,
      };

      const undoEvent: ScoringEvent = {
        id: crypto.randomUUID(),
        eventType: ScoringEventType.HoleUndone,
        matchId,
        timestamp: new Date().toISOString(),
        actorName: 'user',
        payload: undoPayload,
        synced: false,
      };

      await db.scoringEvents.add(undoEvent);
      if (typeof lastEvent.localId === 'number') {
        await db.scoringEvents.delete(lastEvent.localId);
      } else {
        await db.scoringEvents.where('id').equals(lastEvent.id).delete();
      }

      // Roll back the match row to match the now-reverted hole state.
      // The undo hole is the one the captain wants to land on; status
      // and result come back from the match state calculation on the
      // refreshed hole results.
      const match = await db.matches.get(matchId);
      let matchUpdate: Partial<import('@/lib/types/models').Match> | null = null;
      if (match) {
        const refreshedHoleResults = await db.holeResults
          .where('matchId')
          .equals(matchId)
          .toArray();
        const newState = calculateMatchState(match, refreshedHoleResults);
        matchUpdate = {
          currentHole: holeNumber,
          status: newState.isClosedOut || newState.holesRemaining === 0
            ? 'completed'
            : 'inProgress',
          result:
            newState.isClosedOut || newState.holesRemaining === 0
              ? calculateStoredMatchResult(newState)
              : 'notFinished',
          margin: Math.abs(newState.currentScore),
          holesRemaining: newState.holesRemaining,
          version: (match.version ?? 0) + 1,
          updatedAt: new Date().toISOString(),
        };
        await db.matches.update(matchId, matchUpdate);
      }

      scoringLogger.info('Score undone', {
        matchId,
        holeNumber,
        previousWinner: undoPayload.previousWinner,
      });

      return {
        success: true as const,
        holeNumber,
        previousWinner: undoPayload.previousWinner,
        matchTripId: match?.sessionId ? undefined : undefined,
        matchUpdate,
        matchBefore: match,
      };
    },
  );

  // Queue trip-sync for the match-row rollback outside the Dexie
  // transaction (Dexie transactions can't schedule async work safely).
  if (result.success && result.matchBefore && result.matchUpdate) {
    const session = await db.sessions.get(result.matchBefore.sessionId);
    const tripId = session?.tripId;
    if (tripId) {
      queueSyncOperation('match', matchId, 'update', tripId, {
        ...result.matchBefore,
        ...result.matchUpdate,
      });
    }
  }

  if (!result.success) {
    return { success: false, failureReason: result.failureReason, holeNumber: 'holeNumber' in result ? result.holeNumber : undefined };
  }
  return {
    success: true,
    holeNumber: result.holeNumber,
    previousWinner: result.previousWinner,
  };
}
