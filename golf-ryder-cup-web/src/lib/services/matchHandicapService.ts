import type { Player, SessionType, TeeSet } from '../types/models';
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
  };
}
