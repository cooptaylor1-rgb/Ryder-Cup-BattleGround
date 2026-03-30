/**
 * Drama Moment Detection
 *
 * Shared logic for detecting dramatic scoring events.
 * Consumed by both dramaNotificationService (push notifications)
 * and autoTrashTalkService (banter feed posts).
 *
 * Drama moments:
 * - Match completed (win or halve)
 * - Lead change (team that was trailing now leads)
 * - All square on hole 16+ (tense finish)
 * - Dormie (up by exactly the holes remaining)
 * - Cup lead change (overall team score flips)
 * - Dominant performance (3+ up)
 */

import type { MatchState } from '../types/computed';

// ============================================
// TYPES
// ============================================

export type DramaMomentType =
  | 'match-won'
  | 'match-halved'
  | 'lead-change'
  | 'all-square-late'
  | 'dormie'
  | 'cup-lead-change'
  | 'dominant';

export interface DramaMoment {
  type: DramaMomentType;
}

export interface MatchCompleteMoment extends DramaMoment {
  type: 'match-won' | 'match-halved';
  winnerNames?: string;
  loserNames?: string;
  displayScore: string;
}

export interface LeadChangeMoment extends DramaMoment {
  type: 'lead-change';
  newLeaderTeam: 'teamA' | 'teamB';
  newLeaderNames: string;
  prevLeaderNames: string;
}

export interface AllSquareLateMoment extends DramaMoment {
  type: 'all-square-late';
}

export interface DormieMoment extends DramaMoment {
  type: 'dormie';
  leaderNames: string;
  trailerNames: string;
  holesRemaining: number;
  lead: number;
}

export interface CupLeadChangeMoment extends DramaMoment {
  type: 'cup-lead-change';
  newCupScoreA: number;
  newCupScoreB: number;
}

export interface DominantMoment extends DramaMoment {
  type: 'dominant';
  dominantNames: string;
  lead: number;
}

export type AnyDramaMoment =
  | MatchCompleteMoment
  | LeadChangeMoment
  | AllSquareLateMoment
  | DormieMoment
  | CupLeadChangeMoment
  | DominantMoment;

export interface DramaDetectionContext {
  previousState: MatchState;
  newState: MatchState;
  holeNumber: number;
  teamANames: string;
  teamBNames: string;
  cupScoreBefore?: { teamA: number; teamB: number };
  cupScoreAfter?: { teamA: number; teamB: number };
}

// ============================================
// DETECTION
// ============================================

/**
 * Detect all dramatic moments from a scoring event.
 * Returns an array since multiple moments can occur on one hole
 * (though typically only the highest-priority one is acted on).
 */
export function detectDramaMoments(ctx: DramaDetectionContext): AnyDramaMoment[] {
  const moments: AnyDramaMoment[] = [];

  const matchComplete = detectMatchComplete(ctx);
  if (matchComplete) {
    moments.push(matchComplete);
    return moments; // Match completion is terminal — skip lower-priority checks
  }

  const leadChange = detectLeadChange(ctx);
  if (leadChange) moments.push(leadChange);

  const allSquareLate = detectAllSquareLate(ctx);
  if (allSquareLate) moments.push(allSquareLate);

  const dormie = detectDormie(ctx);
  if (dormie) moments.push(dormie);

  const cupLeadChange = detectCupLeadChange(ctx);
  if (cupLeadChange) moments.push(cupLeadChange);

  const dominant = detectDominant(ctx);
  if (dominant) moments.push(dominant);

  return moments;
}

// ============================================
// HELPERS
// ============================================

/**
 * Determine which team is leading based on a score value.
 * Positive = teamA leads, Negative = teamB leads, Zero = all square.
 */
export function getLeadingTeam(score: number): 'teamA' | 'teamB' | null {
  if (score > 0) return 'teamA';
  if (score < 0) return 'teamB';
  return null;
}

function detectMatchComplete(ctx: DramaDetectionContext): MatchCompleteMoment | null {
  const { previousState, newState, teamANames, teamBNames } = ctx;
  if (previousState.status === 'completed' || newState.status !== 'completed') return null;

  if (newState.winningTeam === 'halved') {
    return { type: 'match-halved', displayScore: newState.displayScore };
  }

  const winnerNames = newState.winningTeam === 'teamA' ? teamANames : teamBNames;
  const loserNames = newState.winningTeam === 'teamA' ? teamBNames : teamANames;
  return { type: 'match-won', winnerNames, loserNames, displayScore: newState.displayScore };
}

function detectLeadChange(ctx: DramaDetectionContext): LeadChangeMoment | null {
  const { previousState, newState, teamANames, teamBNames } = ctx;
  const prevLeading = getLeadingTeam(previousState.currentScore);
  const newLeading = getLeadingTeam(newState.currentScore);

  if (!prevLeading || !newLeading || prevLeading === newLeading) return null;

  return {
    type: 'lead-change',
    newLeaderTeam: newLeading,
    newLeaderNames: newLeading === 'teamA' ? teamANames : teamBNames,
    prevLeaderNames: prevLeading === 'teamA' ? teamANames : teamBNames,
  };
}

function detectAllSquareLate(ctx: DramaDetectionContext): AllSquareLateMoment | null {
  const { previousState, newState, holeNumber } = ctx;
  if (newState.currentScore === 0 && holeNumber >= 16 && previousState.currentScore !== 0) {
    return { type: 'all-square-late' };
  }
  return null;
}

function detectDormie(ctx: DramaDetectionContext): DormieMoment | null {
  const { previousState, newState, teamANames, teamBNames } = ctx;
  if (!newState.isDormie || previousState.isDormie) return null;

  const leaderNames = newState.winningTeam === 'teamA' ? teamANames : teamBNames;
  const trailerNames = newState.winningTeam === 'teamA' ? teamBNames : teamANames;
  return {
    type: 'dormie',
    leaderNames,
    trailerNames,
    holesRemaining: newState.holesRemaining,
    lead: Math.abs(newState.currentScore),
  };
}

function detectCupLeadChange(ctx: DramaDetectionContext): CupLeadChangeMoment | null {
  const { cupScoreBefore, cupScoreAfter } = ctx;
  if (!cupScoreBefore || !cupScoreAfter) return null;

  const prevCupLeader =
    cupScoreBefore.teamA > cupScoreBefore.teamB
      ? 'A'
      : cupScoreBefore.teamA < cupScoreBefore.teamB
        ? 'B'
        : null;
  const newCupLeader =
    cupScoreAfter.teamA > cupScoreAfter.teamB
      ? 'A'
      : cupScoreAfter.teamA < cupScoreAfter.teamB
        ? 'B'
        : null;

  if (!prevCupLeader || !newCupLeader || prevCupLeader === newCupLeader) return null;

  return {
    type: 'cup-lead-change',
    newCupScoreA: cupScoreAfter.teamA,
    newCupScoreB: cupScoreAfter.teamB,
  };
}

function detectDominant(ctx: DramaDetectionContext): DominantMoment | null {
  const { previousState, newState, teamANames, teamBNames } = ctx;
  if (Math.abs(newState.currentScore) >= 3 && Math.abs(previousState.currentScore) < 3) {
    const dominantNames = newState.currentScore > 0 ? teamANames : teamBNames;
    return { type: 'dominant', dominantNames, lead: Math.abs(newState.currentScore) };
  }
  return null;
}
