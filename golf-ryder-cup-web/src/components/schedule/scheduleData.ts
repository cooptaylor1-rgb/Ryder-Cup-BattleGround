import { SessionTypeDisplay, type Course, type Match, type Player, type TeeSet, type Trip } from '@/lib/types/models';
import type { CurrentTripPlayerIdentity } from '@/lib/utils/tripPlayerIdentity';
import { resolveCurrentTripPlayer } from '@/lib/utils/tripPlayerIdentity';

export interface ScheduleEntry {
  id: string;
  type: 'session' | 'teeTime' | 'event';
  title: string;
  subtitle?: string;
  time?: string;
  date: string;
  datetime?: Date;
  sessionType?: string;
  matchId?: string;
  isUserMatch?: boolean;
  players?: string[];
  status?: 'upcoming' | 'inProgress' | 'completed';
  courseName?: string;
  teeSetName?: string;
  handicapReady?: boolean;
}

export interface DaySchedule {
  date: string;
  dayName: string;
  dayNumber: number;
  entries: ScheduleEntry[];
}

interface ScheduleSessionLike {
  id: string;
  name: string;
  scheduledDate?: string;
  timeSlot?: 'AM' | 'PM';
  sessionNumber: number;
  sessionType: string;
  status: 'scheduled' | 'inProgress' | 'completed' | 'cancelled';
}

export function resolveCurrentUserPlayer(
  players: Player[],
  currentUser: CurrentTripPlayerIdentity | null,
  isAuthenticated: boolean
) {
  return resolveCurrentTripPlayer(players, currentUser, isAuthenticated) ?? undefined;
}

export function buildScheduleByDay({
  currentTrip,
  sessions,
  matches,
  players,
  courses,
  teeSets,
  currentUserPlayer,
}: {
  currentTrip: Trip | null;
  sessions: ScheduleSessionLike[];
  matches: Match[];
  players: Player[];
  courses: Course[];
  teeSets: TeeSet[];
  currentUserPlayer?: Player;
}): DaySchedule[] {
  if (!currentTrip) {
    return [];
  }

  const startDate = new Date(currentTrip.startDate);
  const endDate = new Date(currentTrip.endDate);
  const playerNameById = new Map(
    players.map((player) => [
      player.id,
      `${player.firstName} ${player.lastName?.[0] || ''}`.trim() || 'Unknown',
    ])
  );
  const courseById = new Map(courses.map((course) => [course.id, course]));
  const teeSetById = new Map(teeSets.map((teeSet) => [teeSet.id, teeSet]));
  const currentUserPlayerId = currentUserPlayer?.id;
  const days: DaySchedule[] = [];

  for (let day = new Date(startDate); day <= endDate; day.setDate(day.getDate() + 1)) {
    const dateStr = day.toISOString().split('T')[0];
    const dayName = day.toLocaleDateString('en-US', { weekday: 'long' });
    const dayNumber =
      Math.floor((day.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const entries: ScheduleEntry[] = [];

    const daySessions = sessions
      .filter((session) => {
        if (!session.scheduledDate) {
          return false;
        }

        const sessionDate = new Date(session.scheduledDate).toISOString().split('T')[0];
        return sessionDate === dateStr;
      })
      .sort((a, b) => {
        if (a.timeSlot === 'AM' && b.timeSlot === 'PM') return -1;
        if (a.timeSlot === 'PM' && b.timeSlot === 'AM') return 1;
        return a.sessionNumber - b.sessionNumber;
      });

    for (const session of daySessions) {
      const sessionMatches = matches.filter((match) => match.sessionId === session.id);

      entries.push({
        id: session.id,
        type: 'session',
        title: session.name,
        subtitle: `${SessionTypeDisplay[session.sessionType as keyof typeof SessionTypeDisplay] ?? session.sessionType} • ${sessionMatches.length} matches`,
        time: session.timeSlot === 'AM' ? '8:00 AM' : '1:00 PM',
        date: dateStr,
        sessionType: session.sessionType,
        status:
          session.status === 'completed'
            ? 'completed'
            : session.status === 'inProgress'
              ? 'inProgress'
              : 'upcoming',
      });

      for (const match of sessionMatches.sort((a, b) => a.matchOrder - b.matchOrder)) {
        const teamA = match.teamAPlayerIds
          .map((playerId) => playerNameById.get(playerId) || 'Unknown')
          .join(' & ');
        const teamB = match.teamBPlayerIds
          .map((playerId) => playerNameById.get(playerId) || 'Unknown')
          .join(' & ');
        const userInMatch = currentUserPlayerId
          ? match.teamAPlayerIds.includes(currentUserPlayerId) ||
            match.teamBPlayerIds.includes(currentUserPlayerId)
          : false;
        const teeSet = match.teeSetId ? teeSetById.get(match.teeSetId) : undefined;
        const course = (match.courseId ? courseById.get(match.courseId) : undefined) ??
          (teeSet?.courseId ? courseById.get(teeSet.courseId) : undefined);

        const baseHour = session.timeSlot === 'AM' ? 8 : 13;
        const interval = session.sessionType === 'singles' ? 8 : 10;
        const matchTime = new Date(day);
        matchTime.setHours(baseHour, (match.matchOrder - 1) * interval, 0, 0);

        entries.push({
          id: match.id,
          type: 'teeTime',
          title: `Match ${match.matchOrder}`,
          subtitle: `${teamA} vs ${teamB}`,
          time: matchTime.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
          }),
          datetime: new Date(matchTime),
          date: dateStr,
          matchId: match.id,
          isUserMatch: userInMatch,
          players: [...match.teamAPlayerIds, ...match.teamBPlayerIds],
          courseName: course?.name,
          teeSetName: teeSet?.name,
          handicapReady: Boolean(course && teeSet),
          status:
            match.status === 'completed'
              ? 'completed'
              : match.status === 'inProgress'
                ? 'inProgress'
                : 'upcoming',
        });
      }
    }

    days.push({
      date: dateStr,
      dayName,
      dayNumber,
      entries,
    });
  }

  return days;
}

export function buildMySchedule(
  scheduleByDay: DaySchedule[],
  currentUserPlayer?: Player
): DaySchedule[] {
  if (!currentUserPlayer) {
    return [];
  }

  return scheduleByDay
    .map((day) => ({
      ...day,
      entries: day.entries.filter((entry) => entry.isUserMatch || entry.type === 'session'),
    }))
    .filter((day) => day.entries.some((entry) => entry.isUserMatch));
}
