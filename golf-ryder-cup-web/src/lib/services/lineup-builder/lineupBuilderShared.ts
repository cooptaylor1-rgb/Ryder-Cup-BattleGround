import type { LineupMatch, LineupPlayer } from './lineupBuilderTypes';

export function sortLineupPlayersByHandicap(players: LineupPlayer[]): LineupPlayer[] {
  return [...players].sort((a, b) => (a.handicap ?? 99) - (b.handicap ?? 99));
}

export function createLineupMatch(matchNumber: number, locked = false): LineupMatch {
  return {
    matchNumber,
    teamAPlayers: [],
    teamBPlayers: [],
    locked,
  };
}
