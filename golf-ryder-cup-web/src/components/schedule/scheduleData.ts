import { SessionTypeDisplay, type Course, type Match, type Player, type TeeSet, type Trip } from '@/lib/types/models';
import type { CurrentTripPlayerIdentity } from '@/lib/utils/tripPlayerIdentity';
import { resolveCurrentTripPlayer } from '@/lib/utils/tripPlayerIdentity';
import { parseDateInLocalZone } from '@/lib/utils';

// Trip.startDate/endDate arrive as either "YYYY-MM-DD" (cloud pulls)
// or "YYYY-MM-DDT00:00:00.000Z" (wizard-created locally). The latter
// parsed in the user's timezone lands on the day-before for anyone
// west of UTC — which is why Day 1 of "April 30" was rendering as
// "Wednesday April 29". Strip the time portion and defer to
// parseDateInLocalZone so every render anchors on local midnight of
// the intended calendar day.
function tripDayToLocalDate(input: string | Date | undefined): Date | null {
  if (!input) return null;
  if (input instanceof Date) return input;
  const datePart = input.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
    return new Date(input);
  }
  return parseDateInLocalZone(datePart);
}

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
  status: 'scheduled' | 'inProgress' | 'paused' | 'completed' | 'cancelled';
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

  // Trip dates are the captain's declared bounds, but sessions often
  // get scheduled beyond them (e.g. a one-day trip with practice and
  // Day 2-4 sessions). Union the trip range with the actual session
  // dates so the full schedule renders every day that has play on
  // it, not just the span the trip was created with.
  const tripStart = tripDayToLocalDate(currentTrip.startDate) ?? new Date(currentTrip.startDate);
  const tripEnd = tripDayToLocalDate(currentTrip.endDate) ?? new Date(currentTrip.endDate);
  const sessionDates = sessions
    .map((session) =>
      session.scheduledDate ? tripDayToLocalDate(session.scheduledDate.slice(0, 10)) : null,
    )
    .filter((date): date is Date => date !== null);
  const startDate = sessionDates.reduce(
    (min, current) => (current < min ? current : min),
    tripStart,
  );
  const endDate = sessionDates.reduce(
    (max, current) => (current > max ? current : max),
    tripEnd,
  );

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
    // dateStr used to key sessions by day; format from local getters so
    // it stays in sync with the dayName (which is always local-tz).
    const yyyy = day.getFullYear();
    const mm = String(day.getMonth() + 1).padStart(2, '0');
    const dd = String(day.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;
    const dayName = day.toLocaleDateString('en-US', { weekday: 'long' });
    const dayNumber =
      Math.floor((day.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const entries: ScheduleEntry[] = [];

    const daySessions = sessions
      .filter((session) => {
        if (!session.scheduledDate) {
          return false;
        }

        // Same date-only parse strategy: compare the first 10 chars so
        // UTC-tagged session timestamps don't drift to the previous day.
        const sessionDate = session.scheduledDate.slice(0, 10);
        return sessionDate === dateStr;
      })
      .sort((a, b) => {
        if (a.timeSlot === 'AM' && b.timeSlot === 'PM') return -1;
        if (a.timeSlot === 'PM' && b.timeSlot === 'AM') return 1;
        return a.sessionNumber - b.sessionNumber;
      });

    for (const session of daySessions) {
      const sessionMatches = matches.filter((match) => match.sessionId === session.id);

      // Prefer the real first-tee time when the lineup builder has
      // stamped one on Match 1 — captains set actual clock times
      // during lineup publish and the UI should show those, not a
      // hard-coded 8:00 / 1:00 pair. Fall back to the AM/PM
      // convention only when no match has a start_time yet.
      const firstMatch = sessionMatches
        .slice()
        .sort((a, b) => a.matchOrder - b.matchOrder)[0];
      const firstMatchTime = firstMatch?.startTime
        ? new Date(firstMatch.startTime).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
          })
        : null;
      const sessionTime =
        firstMatchTime ?? (session.timeSlot === 'AM' ? '8:00 AM' : '1:00 PM');

      entries.push({
        id: session.id,
        type: 'session',
        title: session.name,
        subtitle: `${SessionTypeDisplay[session.sessionType as keyof typeof SessionTypeDisplay] ?? session.sessionType} • ${sessionMatches.length} matches`,
        time: sessionTime,
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
