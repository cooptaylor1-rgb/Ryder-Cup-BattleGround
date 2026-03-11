import type { Match, RyderCupSession, SessionType } from '../types/models';

export type PlayerPerspectiveResult = 'win' | 'loss' | 'halved';

export function resolvePlayerPerspectiveResult(
  match: Pick<Match, 'teamAPlayerIds' | 'teamBPlayerIds' | 'result'>,
  playerId: string
): PlayerPerspectiveResult | null {
  const isTeamA = match.teamAPlayerIds.includes(playerId);
  const isTeamB = match.teamBPlayerIds.includes(playerId);

  if (!isTeamA && !isTeamB) {
    return null;
  }

  if (match.result === 'halved') {
    return 'halved';
  }

  if (match.result === 'teamAWin') {
    return isTeamA ? 'win' : 'loss';
  }

  if (match.result === 'teamBWin') {
    return isTeamB ? 'win' : 'loss';
  }

  return null;
}

export function filterMatchesByTrip(
  matches: Match[],
  sessionsById: Map<string, RyderCupSession>,
  tripId: string
): Match[] {
  return matches.filter((match) => sessionsById.get(match.sessionId)?.tripId === tripId);
}

export function getPartnerIdsForPlayer(match: Match, playerId: string): string[] {
  if (match.teamAPlayerIds.includes(playerId)) {
    return match.teamAPlayerIds.filter((id) => id !== playerId);
  }

  if (match.teamBPlayerIds.includes(playerId)) {
    return match.teamBPlayerIds.filter((id) => id !== playerId);
  }

  return [];
}

export function getOpponentIdsForPlayer(match: Match, playerId: string): string[] {
  if (match.teamAPlayerIds.includes(playerId)) {
    return match.teamBPlayerIds;
  }

  if (match.teamBPlayerIds.includes(playerId)) {
    return match.teamAPlayerIds;
  }

  return [];
}

export function resolveRoundFormat(sessionType?: SessionType | null): 'singles' | 'fourball' | 'foursomes' {
  if (sessionType === 'fourball' || sessionType === 'foursomes' || sessionType === 'singles') {
    return sessionType;
  }

  return 'singles';
}
