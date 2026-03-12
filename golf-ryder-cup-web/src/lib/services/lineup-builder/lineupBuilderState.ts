import { db } from '@/lib/db';
import type { Player, UUID } from '@/lib/types/models';

import { createLineupMatch, sortLineupPlayersByHandicap } from './lineupBuilderShared';
import type { LineupPlayer, LineupState } from './lineupBuilderTypes';

function toLineupPlayer(player: Player, teamId: UUID, usaTeamId: UUID): LineupPlayer {
  return {
    id: player.id,
    name: `${player.firstName} ${player.lastName}`,
    firstName: player.firstName,
    lastName: player.lastName,
    handicap: player.handicapIndex ?? null,
    teamColor: teamId === usaTeamId ? 'usa' : 'europe',
    teamId,
  };
}

export async function initializeLineupState(sessionId: UUID): Promise<LineupState | null> {
  const session = await db.sessions.get(sessionId);
  if (!session) return null;

  const teams = await db.teams.where('tripId').equals(session.tripId).toArray();
  const teamA = teams.find((team) => team.color === 'usa');
  const teamB = teams.find((team) => team.color === 'europe');
  if (!teamA || !teamB) return null;

  const allMembers = await db.teamMembers.where('teamId').anyOf([teamA.id, teamB.id]).toArray();
  const allPlayers = (await db.players.bulkGet(allMembers.map((member) => member.playerId))).filter(Boolean) as Player[];

  const memberTeamMap = new Map<UUID, UUID>();
  for (const member of allMembers) {
    memberTeamMap.set(member.playerId, member.teamId);
  }

  const teamAPlayers: LineupPlayer[] = [];
  const teamBPlayers: LineupPlayer[] = [];

  for (const player of allPlayers) {
    const teamId = memberTeamMap.get(player.id);
    if (!teamId) continue;

    const lineupPlayer = toLineupPlayer(player, teamId, teamA.id);
    if (teamId === teamA.id) {
      teamAPlayers.push(lineupPlayer);
    } else {
      teamBPlayers.push(lineupPlayer);
    }
  }

  const sortedTeamAPlayers = sortLineupPlayersByHandicap(teamAPlayers);
  const sortedTeamBPlayers = sortLineupPlayersByHandicap(teamBPlayers);
  const existingMatches = await db.matches.where('sessionId').equals(sessionId).sortBy('matchOrder');
  const playersPerMatch = session.sessionType === 'singles' ? 1 : 2;
  const matches = [];
  const usedTeamAPlayerIds = new Set<UUID>();
  const usedTeamBPlayerIds = new Set<UUID>();

  for (const match of existingMatches) {
    const teamAMatchPlayers = sortedTeamAPlayers.filter((player) => match.teamAPlayerIds.includes(player.id));
    const teamBMatchPlayers = sortedTeamBPlayers.filter((player) => match.teamBPlayerIds.includes(player.id));

    teamAMatchPlayers.forEach((player) => usedTeamAPlayerIds.add(player.id));
    teamBMatchPlayers.forEach((player) => usedTeamBPlayerIds.add(player.id));

    matches.push({
      matchNumber: match.matchOrder,
      teamAPlayers: teamAMatchPlayers,
      teamBPlayers: teamBMatchPlayers,
      locked: match.status !== 'scheduled',
    });
  }

  return {
    sessionId,
    sessionType: session.sessionType,
    playersPerMatch,
    matches,
    availableTeamA: sortedTeamAPlayers.filter((player) => !usedTeamAPlayerIds.has(player.id)),
    availableTeamB: sortedTeamBPlayers.filter((player) => !usedTeamBPlayerIds.has(player.id)),
  };
}

export function movePlayerToMatch(
  state: LineupState,
  playerId: UUID,
  matchNumber: number,
  team: 'teamA' | 'teamB'
): LineupState {
  const isTeamA = team === 'teamA';
  const availablePool = isTeamA ? [...state.availableTeamA] : [...state.availableTeamB];
  const playerIndex = availablePool.findIndex((player) => player.id === playerId);

  if (playerIndex === -1) {
    return state;
  }

  const [player] = availablePool.splice(playerIndex, 1);
  const matches = [...state.matches];
  let matchIndex = matches.findIndex((match) => match.matchNumber === matchNumber);

  if (matchIndex === -1) {
    matches.push(createLineupMatch(matchNumber));
    matchIndex = matches.length - 1;
  }

  const match = { ...matches[matchIndex] };
  if (isTeamA) {
    match.teamAPlayers = [...match.teamAPlayers, player];
  } else {
    match.teamBPlayers = [...match.teamBPlayers, player];
  }
  matches[matchIndex] = match;

  return {
    ...state,
    matches,
    availableTeamA: isTeamA ? availablePool : state.availableTeamA,
    availableTeamB: isTeamA ? state.availableTeamB : availablePool,
  };
}

export function removePlayerFromMatch(
  state: LineupState,
  playerId: UUID,
  matchNumber: number
): LineupState {
  const matches = [...state.matches];
  const matchIndex = matches.findIndex((match) => match.matchNumber === matchNumber);

  if (matchIndex === -1) {
    return state;
  }

  const match = { ...matches[matchIndex] };
  let player: LineupPlayer | undefined;
  let isTeamA = true;

  const teamAIndex = match.teamAPlayers.findIndex((entry) => entry.id === playerId);
  if (teamAIndex !== -1) {
    player = match.teamAPlayers[teamAIndex];
    match.teamAPlayers = match.teamAPlayers.filter((entry) => entry.id !== playerId);
  } else {
    const teamBIndex = match.teamBPlayers.findIndex((entry) => entry.id === playerId);
    if (teamBIndex !== -1) {
      player = match.teamBPlayers[teamBIndex];
      match.teamBPlayers = match.teamBPlayers.filter((entry) => entry.id !== playerId);
      isTeamA = false;
    }
  }

  if (!player) {
    return state;
  }

  matches[matchIndex] = match;

  return {
    ...state,
    matches,
    availableTeamA: isTeamA ? sortLineupPlayersByHandicap([...state.availableTeamA, player]) : state.availableTeamA,
    availableTeamB: !isTeamA ? sortLineupPlayersByHandicap([...state.availableTeamB, player]) : state.availableTeamB,
  };
}

export function clearLineup(state: LineupState): LineupState {
  const allTeamAPlayers: LineupPlayer[] = [];
  const allTeamBPlayers: LineupPlayer[] = [];

  for (const match of state.matches) {
    if (!match.locked) {
      allTeamAPlayers.push(...match.teamAPlayers);
      allTeamBPlayers.push(...match.teamBPlayers);
    }
  }

  return {
    ...state,
    matches: state.matches
      .filter((match) => match.locked)
      .map((match, index) => ({ ...match, matchNumber: index + 1 })),
    availableTeamA: sortLineupPlayersByHandicap([...state.availableTeamA, ...allTeamAPlayers]),
    availableTeamB: sortLineupPlayersByHandicap([...state.availableTeamB, ...allTeamBPlayers]),
  };
}
