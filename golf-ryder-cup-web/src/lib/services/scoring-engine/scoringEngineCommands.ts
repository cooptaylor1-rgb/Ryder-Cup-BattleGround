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

// ============================================
// CONFLICT DETECTION
// ============================================

/** Threshold for considering two scores on the same hole as a conflict (30 seconds) */
const CONFLICT_WINDOW_MS = 30_000;

export interface ScoreConflict {
  type: 'conflict';
  matchId: string;
  holeNumber: number;
  existingResult: HoleResult;
  existingBy: string;
  incomingWinner: HoleWinner;
  incomingBy: string;
}

/**
 * Check if an incoming score conflicts with an existing one.
 * A conflict occurs when a different user scored the same hole within the conflict window.
 */
function detectConflict(
  existing: HoleResult,
  winner: HoleWinner,
  scoredBy: string | undefined,
): ScoreConflict | null {
  // No conflict if same user is editing their own score
  if (!scoredBy || !existing.lastEditedBy || existing.lastEditedBy === scoredBy) {
    // Also check original scorer
    if (!scoredBy || !existing.scoredBy || existing.scoredBy === scoredBy) {
      return null;
    }
  }

  const existingTime = new Date(existing.lastEditedAt || existing.timestamp).getTime();
  const now = Date.now();

  // Only flag as conflict if the existing score was recent
  if (now - existingTime > CONFLICT_WINDOW_MS) {
    return null;
  }

  return {
    type: 'conflict',
    matchId: existing.matchId,
    holeNumber: existing.holeNumber,
    existingResult: existing,
    existingBy: existing.lastEditedBy || existing.scoredBy || 'unknown',
    incomingWinner: winner,
    incomingBy: scoredBy || 'unknown',
  };
}

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
): Promise<HoleResult | ScoreConflict> {
  if (!isValidHoleNumber(holeNumber)) {
    throw new Error(`Invalid hole number: ${holeNumber}. Must be 1-${TOTAL_HOLES}.`);
  }

  if (!isValidWinner(winner)) {
    throw new Error(`Invalid hole winner: ${String(winner)}.`);
  }

  return db.transaction('rw', [db.holeResults, db.scoringEvents], async () => {
    const existing = await db.holeResults.where({ matchId, holeNumber }).first();

    // Deduplication: if the exact same score already exists, return it without re-writing.
    // Prevents accidental double-taps on slow devices from creating spurious edit history.
    if (
      existing &&
      existing.winner === winner &&
      existing.teamAStrokes === teamAScore &&
      existing.teamBStrokes === teamBScore
    ) {
      return existing;
    }

    // Conflict detection: flag when a different user scored the same hole within 30s.
    // Captain overrides bypass conflict detection — they're intentional edits.
    if (existing && !isCaptainOverride) {
      const conflict = detectConflict(existing, winner, scoredBy);
      if (conflict) {
        scoringLogger.warn('Score conflict detected', {
          matchId,
          holeNumber,
          existingBy: conflict.existingBy,
          incomingBy: conflict.incomingBy,
        });
        return conflict;
      }
    }

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
      teamAStrokes: teamAScore,
      teamBStrokes: teamBScore,
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
          previousTeamAStrokes: existing.teamAStrokes,
          previousTeamBStrokes: existing.teamBStrokes,
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
