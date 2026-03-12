import type { UUID } from '@/lib/types/models';

import { getPairingHistory } from './lineupBuilderFairness';
import { createLineupMatch } from './lineupBuilderShared';
import type {
  AutoFillOptions,
  LineupMatch,
  LineupPlayer,
  LineupState,
  PairingHistory,
} from './lineupBuilderTypes';
import { DEFAULT_AUTO_FILL_OPTIONS } from './lineupBuilderTypes';

function selectPlayersForMatch(
  available: LineupPlayer[],
  count: number,
  history: Map<UUID, PairingHistory>,
  existingPartnerIds: UUID[],
  options: AutoFillOptions
): LineupPlayer[] {
  if (available.length === 0 || count === 0) {
    return [];
  }

  const scored = available.map((player) => {
    let score = 0;
    const playerHistory = history.get(player.id);

    if (options.minimizeRepeatPartners && playerHistory) {
      for (const partnerId of existingPartnerIds) {
        const partnerCount = playerHistory.partnerCounts.get(partnerId) || 0;
        score -= partnerCount * 10;
      }
    }

    score += Math.random() * 5;
    return { player, score };
  });

  scored.sort((left, right) => right.score - left.score);
  return scored.slice(0, count).map((entry) => entry.player);
}

function optimizeMatchupsByHandicap(matches: LineupMatch[]): void {
  const matchHandicaps = matches.map((match, index) => {
    const teamAHandicap = match.teamAPlayers.reduce((sum, player) => sum + (player.handicap ?? 20), 0);
    const teamBHandicap = match.teamBPlayers.reduce((sum, player) => sum + (player.handicap ?? 20), 0);

    return {
      index,
      teamAHandicap,
      teamBHandicap,
      diff: teamAHandicap - teamBHandicap,
    };
  });

  matchHandicaps.sort((left, right) => left.teamAHandicap - right.teamAHandicap);

  const reordered: LineupMatch[] = [];
  let teamAAdvantage = 0;

  for (const matchup of matchHandicaps) {
    const match = matches[matchup.index];
    if (teamAAdvantage > 0) {
      reordered.push(match);
    } else {
      reordered.unshift(match);
    }
    teamAAdvantage += matchup.diff;
  }

  for (let index = 0; index < reordered.length; index++) {
    matches[index] = { ...reordered[index], matchNumber: index + 1 };
  }
}

export async function autoFillLineup(
  state: LineupState,
  tripId: UUID,
  options: AutoFillOptions = DEFAULT_AUTO_FILL_OPTIONS
): Promise<LineupState> {
  const history = await getPairingHistory(tripId, state.sessionId);
  let availableA = [...state.availableTeamA];
  let availableB = [...state.availableTeamB];
  const matchesToFill = Math.floor(Math.min(availableA.length, availableB.length) / state.playersPerMatch);
  const matches = [...state.matches];

  for (let index = 0; index < matchesToFill; index++) {
    let matchIndex = matches.findIndex(
      (match) =>
        match.teamAPlayers.length < state.playersPerMatch &&
        match.teamBPlayers.length < state.playersPerMatch &&
        (!options.respectLockedMatches || !match.locked)
    );

    if (matchIndex === -1) {
      matches.push(createLineupMatch(matches.length + 1));
      matchIndex = matches.length - 1;
    }

    const match = matches[matchIndex];
    const selectedA = selectPlayersForMatch(
      availableA,
      state.playersPerMatch - match.teamAPlayers.length,
      history,
      match.teamAPlayers.map((player) => player.id),
      options
    );
    const selectedB = selectPlayersForMatch(
      availableB,
      state.playersPerMatch - match.teamBPlayers.length,
      history,
      match.teamBPlayers.map((player) => player.id),
      options
    );

    match.teamAPlayers = [...match.teamAPlayers, ...selectedA];
    match.teamBPlayers = [...match.teamBPlayers, ...selectedB];

    const selectedAIds = new Set(selectedA.map((player) => player.id));
    const selectedBIds = new Set(selectedB.map((player) => player.id));
    availableA = availableA.filter((player) => !selectedAIds.has(player.id));
    availableB = availableB.filter((player) => !selectedBIds.has(player.id));
  }

  if (options.optimizeForHandicap) {
    optimizeMatchupsByHandicap(matches);
  }

  return {
    ...state,
    matches,
    availableTeamA: availableA,
    availableTeamB: availableB,
  };
}
