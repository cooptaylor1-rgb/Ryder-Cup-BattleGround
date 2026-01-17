/**
 * Shared Team Utilities
 *
 * Centralized team-fetching logic used across captain pages
 * to eliminate code duplication.
 */

import { db } from '@/lib/db';
import type { Player, Team, TeamMember } from '@/lib/types/models';

/**
 * Get team assignment for a player
 */
export function getPlayerTeamId(
    playerId: string,
    teamMembers: TeamMember[],
    teams: Team[]
): 'A' | 'B' {
    const teamMember = teamMembers.find(tm => tm.playerId === playerId);
    if (!teamMember) return 'A';
    const team = teams.find(t => t.id === teamMember.teamId);
    return team?.color === 'europe' ? 'B' : 'A';
}

/**
 * Get all players for a specific team
 */
export function getTeamPlayers(
    teamId: string,
    teamMembers: TeamMember[],
    players: Player[]
): Player[] {
    const memberIds = teamMembers
        .filter(tm => tm.teamId === teamId)
        .map(tm => tm.playerId);
    return players.filter(p => memberIds.includes(p.id));
}

/**
 * Get players not assigned to any team
 */
export function getUnassignedPlayers(
    players: Player[],
    teamMembers: TeamMember[]
): Player[] {
    return players.filter(p => !teamMembers.some(tm => tm.playerId === p.id));
}

/**
 * Get team by color/type
 */
export function getTeamByColor(
    teams: Team[],
    color: 'usa' | 'europe'
): Team | undefined {
    return teams.find(t => t.color === color);
}

/**
 * Get both teams with their players
 */
export function getTeamsWithPlayers(
    teams: Team[],
    teamMembers: TeamMember[],
    players: Player[]
): {
    teamA: Team | undefined;
    teamB: Team | undefined;
    teamAPlayers: Player[];
    teamBPlayers: Player[];
    unassignedPlayers: Player[];
} {
    const teamA = getTeamByColor(teams, 'usa');
    const teamB = getTeamByColor(teams, 'europe');

    return {
        teamA,
        teamB,
        teamAPlayers: teamA ? getTeamPlayers(teamA.id, teamMembers, players) : [],
        teamBPlayers: teamB ? getTeamPlayers(teamB.id, teamMembers, players) : [],
        unassignedPlayers: getUnassignedPlayers(players, teamMembers),
    };
}

/**
 * Fetch complete team data from database for a trip
 */
export async function fetchTeamData(tripId: string): Promise<{
    teams: Team[];
    teamMembers: TeamMember[];
    players: Player[];
}> {
    const [teams, teamMembers, players] = await Promise.all([
        db.teams.where('tripId').equals(tripId).toArray(),
        db.teamMembers.toArray(),
        db.players.toArray(),
    ]);

    // Filter team members to only those for these teams
    const teamIds = new Set(teams.map(t => t.id));
    const filteredTeamMembers = teamMembers.filter(tm => teamIds.has(tm.teamId));

    return { teams, teamMembers: filteredTeamMembers, players };
}

/**
 * Format player names for display
 */
export function formatTeamPlayerNames(
    playerIds: string[],
    players: Player[],
    format: 'full' | 'last' | 'initials' = 'last'
): string {
    const teamPlayers = playerIds
        .map(id => players.find(p => p.id === id))
        .filter((p): p is Player => p !== undefined);

    if (teamPlayers.length === 0) return 'TBD';

    switch (format) {
        case 'full':
            return teamPlayers.map(p => `${p.firstName} ${p.lastName}`).join(' & ');
        case 'last':
            return teamPlayers.map(p => p.lastName).join(' / ');
        case 'initials':
            return teamPlayers.map(p => `${p.firstName[0]}. ${p.lastName}`).join(' / ');
        default:
            return teamPlayers.map(p => p.lastName).join(' / ');
    }
}
