import { db } from '@/lib/db';
import {
  ScoringEventType,
  type HoleEditedPayload,
  type HoleScoredPayload,
  type ScoringEvent,
} from '@/lib/types/events';
import type {
  HoleResult,
  HoleResultEdit,
  HoleWinner,
  PlayerHoleScore,
} from '@/lib/types/models';
import { scoringLogger } from '@/lib/utils/logger';

import { isValidHoleNumber, isValidWinner, TOTAL_HOLES } from './scoringEngineShared';

export async function recordHoleResult(
  matchId: string,
  holeNumber: number,
  winner: HoleWinner,
  teamAScore?: number,
  teamBScore?: number,
  scoredBy?: string,
  editReason?: string,
  isCaptainOverride?: boolean,
  teamAPlayerScores?: PlayerHoleScore[],
  teamBPlayerScores?: PlayerHoleScore[]
): Promise<HoleResult> {
  if (!isValidHoleNumber(holeNumber)) {
    throw new Error(`Invalid hole number: ${holeNumber}. Must be 1-${TOTAL_HOLES}.`);
  }

  if (!isValidWinner(winner)) {
    throw new Error(`Invalid hole winner: ${String(winner)}.`);
  }

  return db.transaction('rw', [db.holeResults, db.scoringEvents], async () => {
    const existing = await db.holeResults.where({ matchId, holeNumber }).first();
    const now = new Date().toISOString();

    let editHistory: HoleResultEdit[] = existing?.editHistory || [];
    if (existing && existing.winner !== winner) {
      editHistory = [
        ...editHistory,
        {
          editedAt: now,
          editedBy: scoredBy || 'unknown',
          previousWinner: existing.winner,
          newWinner: winner,
          reason: editReason,
          isCaptainOverride,
        },
      ];
    }

    const result: HoleResult = {
      id: existing?.id || crypto.randomUUID(),
      matchId,
      holeNumber,
      winner,
      teamAScore,
      teamBScore,
      teamAPlayerScores: teamAPlayerScores ?? existing?.teamAPlayerScores,
      teamBPlayerScores: teamBPlayerScores ?? existing?.teamBPlayerScores,
      scoredBy: existing ? existing.scoredBy : scoredBy,
      timestamp: existing?.timestamp || now,
      lastEditedBy: existing ? scoredBy : undefined,
      lastEditedAt: existing ? now : undefined,
      editReason: existing ? editReason : undefined,
      editHistory: editHistory.length > 0 ? editHistory : undefined,
    };

    await db.holeResults.put(result);

    const payload: HoleScoredPayload | HoleEditedPayload = existing
      ? {
          type: 'hole_edited',
          holeNumber,
          previousWinner: existing.winner,
          newWinner: winner,
          previousTeamAStrokes: existing.teamAScore,
          previousTeamBStrokes: existing.teamBScore,
          newTeamAStrokes: teamAScore,
          newTeamBStrokes: teamBScore,
        }
      : {
          type: 'hole_scored',
          holeNumber,
          winner,
          teamAStrokes: teamAScore,
          teamBStrokes: teamBScore,
        };

    const event: ScoringEvent = {
      id: crypto.randomUUID(),
      eventType: existing ? ScoringEventType.HoleEdited : ScoringEventType.HoleScored,
      matchId,
      timestamp: now,
      actorName: scoredBy || 'unknown',
      payload,
      synced: false,
    };

    await db.scoringEvents.add(event);

    scoringLogger.info('Score recorded', {
      matchId,
      holeNumber,
      winner,
      edited: Boolean(existing),
    });

    return result;
  });
}
