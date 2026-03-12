import { db } from '@/lib/db';
import {
  ScoringEventType,
  type HoleEditedPayload,
  type HoleScoredPayload,
  type HoleUndonePayload,
  type ScoringEvent,
} from '@/lib/types/events';
import { scoringLogger } from '@/lib/utils/logger';

export async function undoLastScore(matchId: string): Promise<boolean> {
  return db.transaction('rw', [db.holeResults, db.scoringEvents], async () => {
    const events = await db.scoringEvents.where('matchId').equals(matchId).sortBy('timestamp');
    if (events.length === 0) {
      return false;
    }

    const lastEvent = events[events.length - 1];
    if (
      lastEvent.eventType !== ScoringEventType.HoleScored &&
      lastEvent.eventType !== ScoringEventType.HoleEdited
    ) {
      return false;
    }

    const payload = lastEvent.payload as HoleScoredPayload | HoleEditedPayload;
    const holeNumber = payload.holeNumber;

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

    return true;
  });
}
