import { getSideBetDefinition } from '@/lib/constants/sideBets';
import type { Match, Player, SideBet, SideBetType } from '@/lib/types/models';

interface BuildQuickSideBetOptions {
  tripId: string;
  type: SideBetType;
  participants: Player[];
  match?: Match | null;
}

interface BuildCustomSideBetOptions {
  tripId: string;
  type: SideBetType;
  name: string;
  pot: number;
  participants: Player[];
  match?: Match | null;
  perHole?: number;
}

interface BuildNassauSideBetOptions {
  tripId: string;
  name: string;
  pot: number;
  match?: Match | null;
  teamAPlayers: Player[];
  teamBPlayers: Player[];
}

export function canCreateMatchNassau(match: Match | null | undefined): boolean {
  if (!match) return false;
  return match.teamAPlayerIds.length === 2 && match.teamBPlayerIds.length === 2;
}

export function buildQuickSideBet({
  tripId,
  type,
  participants,
  match,
}: BuildQuickSideBetOptions): SideBet {
  const definition = getSideBetDefinition(type);

  return {
    id: crypto.randomUUID(),
    tripId,
    matchId: match?.id,
    sessionId: match?.sessionId,
    type,
    name: definition.label,
    description: buildBetDescription(type, definition.description, match?.matchOrder),
    status: 'active',
    pot: definition.defaultPot,
    perHole: definition.defaultPerHole,
    participantIds: participants.map((player) => player.id),
    createdAt: new Date().toISOString(),
  };
}

export function buildCustomSideBet({
  tripId,
  type,
  name,
  pot,
  participants,
  match,
  perHole,
}: BuildCustomSideBetOptions): SideBet {
  const definition = getSideBetDefinition(type);

  return {
    id: crypto.randomUUID(),
    tripId,
    matchId: match?.id,
    sessionId: match?.sessionId,
    type,
    name: name.trim() || definition.label,
    description: buildBetDescription(type, definition.description, match?.matchOrder),
    status: 'active',
    pot,
    perHole: type === 'skins' ? perHole : undefined,
    participantIds: participants.map((player) => player.id),
    createdAt: new Date().toISOString(),
  };
}

export function buildNassauSideBet({
  tripId,
  name,
  pot,
  match,
  teamAPlayers,
  teamBPlayers,
}: BuildNassauSideBetOptions): SideBet {
  if (teamAPlayers.length !== 2 || teamBPlayers.length !== 2) {
    throw new Error('Nassau requires exactly two players per side.');
  }

  return {
    id: crypto.randomUUID(),
    tripId,
    matchId: match?.id,
    sessionId: match?.sessionId,
    type: 'nassau',
    name: name.trim() || getSideBetDefinition('nassau').label,
    description: `${formatPlayerPair(teamAPlayers)} vs ${formatPlayerPair(teamBPlayers)}`,
    status: 'active',
    pot,
    participantIds: [...teamAPlayers, ...teamBPlayers].map((player) => player.id),
    nassauTeamA: teamAPlayers.map((player) => player.id),
    nassauTeamB: teamBPlayers.map((player) => player.id),
    nassauResults: {},
    createdAt: new Date().toISOString(),
  };
}

function buildBetDescription(
  type: SideBetType,
  fallback: string,
  matchOrder?: number
): string {
  if (!matchOrder) return fallback;
  if (type === 'nassau') return fallback;
  return `Inside game for Match #${matchOrder}`;
}

function formatPlayerPair(players: Player[]): string {
  return players
    .map((player) => player.lastName || player.firstName)
    .filter(Boolean)
    .join(' & ');
}
