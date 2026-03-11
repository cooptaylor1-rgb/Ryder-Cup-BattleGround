import type { Player as TripPlayer, TeamMember } from '@/lib/types/models';
import type { Player as LineupPlayer } from '../LineupBuilder';

export function getTeamPlayersForLineup(
  teamId: string | undefined,
  teamMembers: TeamMember[],
  players: TripPlayer[]
): TripPlayer[] {
  if (!teamId) return [];

  const memberIds = new Set(
    teamMembers.filter((teamMember) => teamMember.teamId === teamId).map((teamMember) => teamMember.playerId)
  );

  return players.filter((player) => memberIds.has(player.id));
}

export function toLineupPlayers(players: TripPlayer[], team: 'A' | 'B'): LineupPlayer[] {
  return players.map((player) => ({
    id: player.id,
    firstName: player.firstName,
    lastName: player.lastName,
    handicapIndex: player.handicapIndex ?? 0,
    team,
    avatarUrl: player.avatarUrl,
  }));
}
