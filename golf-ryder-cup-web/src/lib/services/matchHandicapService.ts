import type { Player, SessionType, TeeSet } from '../types/models';
import { scoringLogger } from '../utils/logger';
import {
  calculateCourseHandicap,
  calculateFourballStrokes,
  calculateFoursomesStrokes,
  calculateSinglesStrokes,
} from './handicapCalculator';

interface MatchHandicapPlayerContext {
  playerId: string;
  courseHandicap: number;
  strokeAllowance: number;
}

export interface MatchHandicapContext {
  teamAHandicapAllowance: number;
  teamBHandicapAllowance: number;
  teamAPlayerAllowances: number[];
  teamBPlayerAllowances: number[];
  teamAPlayerCourseHandicaps: number[];
  teamBPlayerCourseHandicaps: number[];
  teamAPlayers: MatchHandicapPlayerContext[];
  teamBPlayers: MatchHandicapPlayerContext[];
  /**
   * True when a teeSet (slope + rating + par) was available and
   * course handicaps were computed through the full USGA formula.
   * False when the caller didn't pass a teeSet — in that mode the
   * function falls back to `Math.round(handicapIndex)` so UI layers
   * that just read strokeAllowance keep rendering, but any code that
   * persists allowances back to the match row should check this flag
   * and *not* write on false, otherwise an intermediate state (match
   * without course) silently overwrites a previously-correct value.
   */
  hasCourseHandicapInfo: boolean;
}

function resolveHandicapIndex(handicapIndex?: number): number {
  return typeof handicapIndex === 'number' && Number.isFinite(handicapIndex) ? handicapIndex : 0;
}

export function resolvePlayerCourseHandicap(
  player: Pick<Player, 'handicapIndex'>,
  teeSet?: TeeSet
): number {
  const handicapIndex = resolveHandicapIndex(player.handicapIndex);

  if (!teeSet) {
    // Kept for render-time compatibility: the match-scoring page used
    // to show 0 strokes on a course-less match and that was confusing.
    // Fall back to raw rounded index so the UI has *something*. The
    // `hasCourseHandicapInfo` flag on the context is the authoritative
    // signal for persistence — anything that stores allowances should
    // gate on that, not on the return value here.
    return Math.round(handicapIndex);
  }

  return calculateCourseHandicap(handicapIndex, teeSet.slope, teeSet.rating, teeSet.par);
}

export function buildMatchHandicapContext({
  sessionType,
  teamAPlayers,
  teamBPlayers,
  teeSet,
}: {
  sessionType?: SessionType;
  teamAPlayers: Player[];
  teamBPlayers: Player[];
  teeSet?: TeeSet;
}): MatchHandicapContext {
  const hasCourseHandicapInfo = Boolean(teeSet);
  if (!hasCourseHandicapInfo && (teamAPlayers.length > 0 || teamBPlayers.length > 0)) {
    // One warn per compute so the breadcrumb shows up in Sentry when a
    // caller forgot the teeSet. Keeping it at warn (not error) since
    // the function is still returning a valid shape — the flag on the
    // context is what consumers should branch on.
    scoringLogger.warn(
      'buildMatchHandicapContext called without a teeSet — allowances fall back to raw index. Caller should check hasCourseHandicapInfo before persisting.'
    );
  }

  const teamAPlayerCourseHandicaps = teamAPlayers.map((player) =>
    resolvePlayerCourseHandicap(player, teeSet)
  );
  const teamBPlayerCourseHandicaps = teamBPlayers.map((player) =>
    resolvePlayerCourseHandicap(player, teeSet)
  );

  const teamAPlayerAllowances = Array(teamAPlayers.length).fill(0);
  const teamBPlayerAllowances = Array(teamBPlayers.length).fill(0);
  let teamAHandicapAllowance = 0;
  let teamBHandicapAllowance = 0;

  if (sessionType === 'singles' && teamAPlayerCourseHandicaps.length > 0 && teamBPlayerCourseHandicaps.length > 0) {
    const { playerAStrokes, playerBStrokes } = calculateSinglesStrokes(
      teamAPlayerCourseHandicaps[0] ?? 0,
      teamBPlayerCourseHandicaps[0] ?? 0
    );
    teamAHandicapAllowance = playerAStrokes;
    teamBHandicapAllowance = playerBStrokes;
    teamAPlayerAllowances[0] = playerAStrokes;
    teamBPlayerAllowances[0] = playerBStrokes;
  } else if (
    sessionType === 'fourball' &&
    (teamAPlayerCourseHandicaps.length > 0 || teamBPlayerCourseHandicaps.length > 0)
  ) {
    const { teamAStrokes, teamBStrokes } = calculateFourballStrokes(
      teamAPlayerCourseHandicaps,
      teamBPlayerCourseHandicaps
    );
    teamAPlayerAllowances.splice(0, teamAPlayerAllowances.length, ...teamAStrokes);
    teamBPlayerAllowances.splice(0, teamBPlayerAllowances.length, ...teamBStrokes);
  } else if (
    sessionType === 'foursomes' &&
    (teamAPlayerCourseHandicaps.length > 0 || teamBPlayerCourseHandicaps.length > 0)
  ) {
    const { teamAStrokes, teamBStrokes } = calculateFoursomesStrokes(
      teamAPlayerCourseHandicaps,
      teamBPlayerCourseHandicaps
    );
    teamAHandicapAllowance = teamAStrokes;
    teamBHandicapAllowance = teamBStrokes;
  }

  return {
    teamAHandicapAllowance,
    teamBHandicapAllowance,
    teamAPlayerAllowances,
    teamBPlayerAllowances,
    teamAPlayerCourseHandicaps,
    teamBPlayerCourseHandicaps,
    teamAPlayers: teamAPlayers.map((player, index) => ({
      playerId: player.id,
      courseHandicap: teamAPlayerCourseHandicaps[index] ?? 0,
      strokeAllowance: teamAPlayerAllowances[index] ?? 0,
    })),
    teamBPlayers: teamBPlayers.map((player, index) => ({
      playerId: player.id,
      courseHandicap: teamBPlayerCourseHandicaps[index] ?? 0,
      strokeAllowance: teamBPlayerAllowances[index] ?? 0,
    })),
    hasCourseHandicapInfo,
  };
}
