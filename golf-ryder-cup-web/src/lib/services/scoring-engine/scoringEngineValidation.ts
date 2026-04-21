import { db } from '@/lib/db';
import type { Player } from '@/lib/types/models';
import { scoringLogger } from '@/lib/utils/logger';

import { buildMatchHandicapContext } from '../matchHandicapService';

/**
 * Thrown when a match is missing the configuration needed to score it
 * correctly (course, tee set). Handicap allowances depend on course rating
 * and slope, so scoring without them silently produces wrong net results.
 * Callers should catch and show a captain-facing prompt to finish setup.
 */
export class MatchNotReadyForScoringError extends Error {
  constructor(
    public readonly matchId: string,
    public readonly missing: string,
  ) {
    super(
      `This match isn't ready for scoring yet — missing ${missing}. ` +
        `Ask the captain to finish course and tee-set setup before scoring.`,
    );
    this.name = 'MatchNotReadyForScoringError';
  }
}

/**
 * Validate that a match is fully configured before a user flow records a
 * score. Kept separate from the recordHoleResult primitive so unit tests
 * that exercise the scoring algorithm with fixture matches can run without
 * needing real course data; real scoring (score page + store) goes through
 * this validator before touching the engine.
 *
 * Also compares the stored handicap allowance against what we'd compute
 * right now and logs a warning if they drift. Mid-round handicap changes
 * (captain corrections, GHIN updates) are rare but silent — the drift
 * log gives ops a signal without blocking play. The Day-7 mid-round
 * recalc reacts to the same source-of-truth change.
 */
export async function validateMatchReadyForScoring(matchId: string): Promise<void> {
  const match = await db.matches.get(matchId);
  if (!match) {
    throw new Error(`Match not found: ${matchId}`);
  }
  if (!match.courseId) {
    throw new MatchNotReadyForScoringError(matchId, 'course');
  }
  if (!match.teeSetId) {
    throw new MatchNotReadyForScoringError(matchId, 'tee set');
  }

  try {
    const session = await db.sessions.get(match.sessionId);
    if (!session || session.sessionType === 'singles') return;

    // match.teeSetId is guaranteed non-null above (the guard at line
    // 47 would have thrown). Load it and the session default so the
    // drift comparison computes with the same course data scoring
    // will actually use.
    const teeSet = (await db.teeSets.get(match.teeSetId!)) ?? undefined;
    const [teamAPlayers, teamBPlayers] = await Promise.all([
      Promise.all(match.teamAPlayerIds.map((id) => db.players.get(id))),
      Promise.all(match.teamBPlayerIds.map((id) => db.players.get(id))),
    ]);
    const ctx = buildMatchHandicapContext({
      sessionType: session.sessionType,
      teamAPlayers: teamAPlayers.filter((p): p is Player => Boolean(p)),
      teamBPlayers: teamBPlayers.filter((p): p is Player => Boolean(p)),
      teeSet,
    });

    const storedA = match.teamAHandicapAllowance ?? 0;
    const storedB = match.teamBHandicapAllowance ?? 0;
    if (ctx.teamAHandicapAllowance !== storedA || ctx.teamBHandicapAllowance !== storedB) {
      scoringLogger.warn('Handicap allowance drift detected at score time', {
        matchId,
        stored: { teamA: storedA, teamB: storedB },
        current: { teamA: ctx.teamAHandicapAllowance, teamB: ctx.teamBHandicapAllowance },
      });
    }
  } catch (error) {
    // Drift detection is advisory — never block scoring on the check.
    scoringLogger.warn('Handicap drift check failed; scoring proceeds', { matchId, error });
  }
}
