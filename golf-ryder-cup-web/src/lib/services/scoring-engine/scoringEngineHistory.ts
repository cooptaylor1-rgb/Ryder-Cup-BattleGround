import { db } from '@/lib/db';
import {
  ScoringEventType,
  type HoleEditedPayload,
  type HoleScoredPayload,
  type HoleUndonePayload,
  type ScoringEvent,
} from '@/lib/types/events';
import { scoringLogger } from '@/lib/utils/logger';

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
  return db.transaction('rw', [db.holeResults, db.scoringEvents], async () => {
    const events = await db.scoringEvents.where('matchId').equals(matchId).sortBy('timestamp');
    if (events.length === 0) {
      return { success: false, failureReason: 'no_events' };
    }

    const lastEvent = events[events.length - 1];
    if (
      lastEvent.eventType !== ScoringEventType.HoleScored &&
      lastEvent.eventType !== ScoringEventType.HoleEdited
    ) {
      return { success: false, failureReason: 'not_undoable' };
    }

    const payload = lastEvent.payload as HoleScoredPayload | HoleEditedPayload;
    const holeNumber = payload.holeNumber;

    // Safety: reject if another device scored a different hole since the undo was queued
    if (expectedHoleNumber !== undefined && holeNumber !== expectedHoleNumber) {
      scoringLogger.warn('Undo rejected: hole mismatch', {
        matchId,
        expected: expectedHoleNumber,
        actual: holeNumber,
      });
      return { success: false, failureReason: 'hole_mismatch', holeNumber };
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
        payload.type === 'hole_edited' ? payload.previousTeamAStrokes : payload.teamAStrokes,
      previousTeamBStrokes:
        payload.type === 'hole_edited' ? payload.previousTeamBStrokes : payload.teamBStrokes,
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

    scoringLogger.info('Score undone', {
      matchId,
      holeNumber,
      previousWinner: undoPayload.previousWinner,
    });

    return {
      success: true,
      holeNumber,
      previousWinner: undoPayload.previousWinner,
    };
  });
}
