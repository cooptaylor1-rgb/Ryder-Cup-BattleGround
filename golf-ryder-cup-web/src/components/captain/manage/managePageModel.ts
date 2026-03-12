import type { Match, Player, RyderCupSession, Team, TeamMember } from '@/lib/types/models';

import type { SessionWithMatches } from './ManagePageSections';

export function buildSessionsWithMatches(
  sessions: RyderCupSession[],
  matches: Match[]
): SessionWithMatches[] {
  return sessions
    .map((session) => ({
      ...session,
      matches: matches
        .filter((match) => match.sessionId === session.id)
        .sort((left, right) => left.matchOrder - right.matchOrder),
    }))
    .sort((left, right) => left.sessionNumber - right.sessionNumber);
}

export function countCompletedSessions(sessionsWithMatches: SessionWithMatches[]) {
  return sessionsWithMatches.filter((session) => session.status === 'completed').length;
}

export function countLockedSessions(sessionsWithMatches: SessionWithMatches[]) {
  return sessionsWithMatches.filter((session) => session.isLocked).length;
}

export function countLiveMatches(matches: Match[]) {
  return matches.filter((match) => match.status === 'inProgress').length;
}

export function countPlayersWithoutHandicap(players: Player[]) {
  return players.filter(
    (player) => player.handicapIndex === undefined || player.handicapIndex === null
  ).length;
}

export function buildTeamById(teams: Team[]) {
  return new Map(teams.map((team) => [team.id, team]));
}

export function buildPlayerById(players: Player[]) {
  return new Map(players.map((player) => [player.id, player]));
}

export function buildPlayerTeamMap(teamMembers: TeamMember[]) {
  return new Map(teamMembers.map((membership) => [membership.playerId, membership.teamId]));
}
