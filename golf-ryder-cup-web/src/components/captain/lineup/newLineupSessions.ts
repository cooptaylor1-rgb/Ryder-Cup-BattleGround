import type { Match, RyderCupSession } from '@/lib/types/models';

export function getTimeSlotForSessionNumber(sessionNumber: number): 'AM' | 'PM' {
  return sessionNumber % 2 === 0 ? 'PM' : 'AM';
}

export function getNextSessionNumber(sessions: Pick<RyderCupSession, 'sessionNumber'>[]): number {
  const highestSessionNumber = sessions.reduce(
    (highest, session) => Math.max(highest, session.sessionNumber),
    0
  );
  return highestSessionNumber + 1;
}

export function getDefaultTeeTimeForSessionNumber(sessionNumber: number): string {
  return getTimeSlotForSessionNumber(sessionNumber) === 'PM' ? '13:00' : '08:00';
}

export function getDefaultSessionDateForNumber(
  tripStartDate: string | undefined,
  sessionNumber: number,
  fallbackDate: string
): string {
  if (!tripStartDate) return fallbackDate;

  const startDate = new Date(tripStartDate);
  if (Number.isNaN(startDate.getTime())) return fallbackDate;

  const sessionDate = new Date(startDate);
  sessionDate.setDate(startDate.getDate() + Math.floor((sessionNumber - 1) / 2));
  return sessionDate.toISOString().split('T')[0] ?? fallbackDate;
}

export function findNextSessionNeedingLineup(
  sessions: RyderCupSession[],
  matches: Match[]
): RyderCupSession | null {
  const sortedSessions = [...sessions].sort((a, b) => a.sessionNumber - b.sessionNumber);

  for (const session of sortedSessions) {
    if (session.status !== 'scheduled') continue;

    const sessionMatches = matches.filter((match) => match.sessionId === session.id);
    if (sessionMatches.length === 0) {
      return session;
    }

    // Practice sessions use a flat group model (2-4 players in
    // teamAPlayerIds, teamB empty) — the cup's "need N per side" rule
    // doesn't apply. Treat a practice group as complete when it has
    // at least two players; less than that can't host a meaningful
    // round anyway.
    if (session.isPracticeSession) {
      const needsGroups = sessionMatches.some((match) => match.teamAPlayerIds.length < 2);
      if (needsGroups) {
        return session;
      }
      continue;
    }

    const requiredPlayersPerTeam = session.sessionType === 'singles' ? 1 : 2;
    const needsLineup = sessionMatches.some(
      (match) =>
        match.teamAPlayerIds.length < requiredPlayersPerTeam ||
        match.teamBPlayerIds.length < requiredPlayersPerTeam
    );

    if (needsLineup) {
      return session;
    }
  }

  return null;
}
