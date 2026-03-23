import { describe, expect, it } from 'vitest';

import { buildScheduleByDay } from '@/components/schedule/scheduleData';
import type { Course, Match, Player, RyderCupSession, TeeSet, Trip } from '@/lib/types/models';

const now = '2026-03-22T12:00:00.000Z';

const trip: Trip = {
  id: 'trip-1',
  name: 'Trip',
  startDate: '2026-04-29',
  endDate: '2026-04-29',
  isCaptainModeEnabled: false,
  createdAt: now,
  updatedAt: now,
};

const session: RyderCupSession = {
  id: 'session-1',
  tripId: trip.id,
  name: 'Wednesday AM',
  sessionNumber: 1,
  sessionType: 'foursomes',
  scheduledDate: '2026-04-29',
  timeSlot: 'AM',
  status: 'scheduled',
  createdAt: now,
};

const players: Player[] = [
  {
    id: 'player-1',
    tripId: trip.id,
    firstName: 'Tom',
    lastName: 'Morris',
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'player-2',
    tripId: trip.id,
    firstName: 'Willie',
    lastName: 'Park',
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'player-3',
    tripId: trip.id,
    firstName: 'Bobby',
    lastName: 'Jones',
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'player-4',
    tripId: trip.id,
    firstName: 'Arnold',
    lastName: 'Palmer',
    createdAt: now,
    updatedAt: now,
  },
];

const course: Course = {
  id: 'course-1',
  name: 'North Berwick',
  location: 'North Berwick, Scotland',
  createdAt: now,
  updatedAt: now,
};

const teeSet: TeeSet = {
  id: 'tee-1',
  courseId: course.id,
  name: 'Championship',
  rating: 72.4,
  slope: 133,
  par: 72,
  holePars: Array.from({ length: 18 }, () => 4),
  holeHandicaps: Array.from({ length: 18 }, (_, index) => index + 1),
  yardages: Array.from({ length: 18 }, () => 400),
  totalYardage: 7200,
  createdAt: now,
  updatedAt: now,
};

describe('scheduleData', () => {
  it('includes course, tee, and handicap readiness on tee-time entries', () => {
    const matches: Match[] = [
      {
        id: 'match-1',
        sessionId: session.id,
        courseId: course.id,
        teeSetId: teeSet.id,
        matchOrder: 1,
        status: 'scheduled',
        currentHole: 1,
        teamAPlayerIds: [players[0].id, players[1].id],
        teamBPlayerIds: [players[2].id, players[3].id],
        teamAHandicapAllowance: 0,
        teamBHandicapAllowance: 0,
        result: 'notFinished',
        margin: 0,
        holesRemaining: 18,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'match-2',
        sessionId: session.id,
        matchOrder: 2,
        status: 'scheduled',
        currentHole: 1,
        teamAPlayerIds: [players[0].id, players[1].id],
        teamBPlayerIds: [players[2].id, players[3].id],
        teamAHandicapAllowance: 0,
        teamBHandicapAllowance: 0,
        result: 'notFinished',
        margin: 0,
        holesRemaining: 18,
        createdAt: now,
        updatedAt: now,
      },
    ];

    const days = buildScheduleByDay({
      currentTrip: trip,
      sessions: [session],
      matches,
      players,
      courses: [course],
      teeSets: [teeSet],
      currentUserPlayer: players[0],
    });

    const teeTimeEntries = days[0]?.entries.filter((entry) => entry.type === 'teeTime') ?? [];
    expect(teeTimeEntries).toHaveLength(2);
    expect(teeTimeEntries[0]).toMatchObject({
      courseName: 'North Berwick',
      teeSetName: 'Championship',
      handicapReady: true,
      isUserMatch: true,
    });
    expect(teeTimeEntries[1]).toMatchObject({
      courseName: undefined,
      teeSetName: undefined,
      handicapReady: false,
    });
  });
});
