import { describe, expect, it } from 'vitest';

import { runPreFlightCheck } from '@/lib/services/preFlightValidationService';
import type {
  Course,
  Match,
  Player,
  RyderCupSession,
  Team,
  TeamMember,
  TeeSet,
  Trip,
} from '@/lib/types/models';

function createTrip(): Trip {
  return {
    id: 'trip-1',
    name: 'Classic Ryder Cup',
    startDate: '2026-04-29T08:00:00.000Z',
    endDate: '2026-05-02T17:00:00.000Z',
    isCaptainModeEnabled: true,
    createdAt: '2026-03-17T00:00:00.000Z',
    updatedAt: '2026-03-17T00:00:00.000Z',
  };
}

function createPlayers(): Player[] {
  return [
    { id: 'p1', tripId: 'trip-1', firstName: 'Tom', lastName: 'Watson', handicapIndex: 4.2 },
    { id: 'p2', tripId: 'trip-1', firstName: 'Ben', lastName: 'Crenshaw', handicapIndex: 5.1 },
    { id: 'p3', tripId: 'trip-1', firstName: 'Seve', lastName: 'Ballesteros', handicapIndex: 3.8 },
    { id: 'p4', tripId: 'trip-1', firstName: 'Nick', lastName: 'Faldo', handicapIndex: 2.7 },
    { id: 'p5', tripId: 'trip-1', firstName: 'Tiger', lastName: 'Woods', handicapIndex: 0.8 },
    { id: 'p6', tripId: 'trip-1', firstName: 'Phil', lastName: 'Mickelson', handicapIndex: 2.1 },
    { id: 'p7', tripId: 'trip-1', firstName: 'Ian', lastName: 'Poulter', handicapIndex: 1.7 },
    { id: 'p8', tripId: 'trip-1', firstName: 'Rory', lastName: 'McIlroy', handicapIndex: 0.5 },
  ];
}

function createTeams(): Team[] {
  return [
    {
      id: 'team-usa',
      tripId: 'trip-1',
      name: 'USA',
      color: 'usa',
      mode: 'ryderCup',
      createdAt: '2026-03-17T00:00:00.000Z',
    },
    {
      id: 'team-europe',
      tripId: 'trip-1',
      name: 'Europe',
      color: 'europe',
      mode: 'ryderCup',
      createdAt: '2026-03-17T00:00:00.000Z',
    },
  ];
}

function createTeamMembers(): TeamMember[] {
  return [
    { id: 'tm-1', teamId: 'team-usa', playerId: 'p1', sortOrder: 0, isCaptain: false, createdAt: '2026-03-17T00:00:00.000Z' },
    { id: 'tm-2', teamId: 'team-usa', playerId: 'p2', sortOrder: 1, isCaptain: false, createdAt: '2026-03-17T00:00:00.000Z' },
    { id: 'tm-3', teamId: 'team-usa', playerId: 'p3', sortOrder: 2, isCaptain: false, createdAt: '2026-03-17T00:00:00.000Z' },
    { id: 'tm-4', teamId: 'team-usa', playerId: 'p4', sortOrder: 3, isCaptain: false, createdAt: '2026-03-17T00:00:00.000Z' },
    { id: 'tm-5', teamId: 'team-europe', playerId: 'p5', sortOrder: 0, isCaptain: false, createdAt: '2026-03-17T00:00:00.000Z' },
    { id: 'tm-6', teamId: 'team-europe', playerId: 'p6', sortOrder: 1, isCaptain: false, createdAt: '2026-03-17T00:00:00.000Z' },
    { id: 'tm-7', teamId: 'team-europe', playerId: 'p7', sortOrder: 2, isCaptain: false, createdAt: '2026-03-17T00:00:00.000Z' },
    { id: 'tm-8', teamId: 'team-europe', playerId: 'p8', sortOrder: 3, isCaptain: false, createdAt: '2026-03-17T00:00:00.000Z' },
  ];
}

function createSession(): RyderCupSession {
  return {
    id: 'session-1',
    tripId: 'trip-1',
    name: 'Friday AM Foursomes',
    sessionNumber: 1,
    sessionType: 'foursomes',
    scheduledDate: '2026-04-29T08:00:00.000Z',
    timeSlot: 'AM',
    pointsPerMatch: 1,
    status: 'scheduled',
    createdAt: '2026-03-17T00:00:00.000Z',
  };
}

function createMatch(overrides: Partial<Match> = {}): Match {
  return {
    id: 'match-1',
    sessionId: 'session-1',
    matchOrder: 1,
    status: 'scheduled',
    currentHole: 1,
    teamAPlayerIds: ['p1', 'p2'],
    teamBPlayerIds: ['p5', 'p6'],
    teamAHandicapAllowance: 0,
    teamBHandicapAllowance: 0,
    result: 'notFinished',
    margin: 0,
    holesRemaining: 18,
    createdAt: '2026-03-17T00:00:00.000Z',
    updatedAt: '2026-03-17T00:00:00.000Z',
    ...overrides,
  };
}

function createCourse(): Course {
  return {
    id: 'course-1',
    name: 'North Berwick',
    location: 'Scotland',
    createdAt: '2026-03-17T00:00:00.000Z',
    updatedAt: '2026-03-17T00:00:00.000Z',
  };
}

function createTeeSet(overrides: Partial<TeeSet> = {}): TeeSet {
  return {
    id: 'tee-1',
    courseId: 'course-1',
    name: 'Championship',
    color: 'Blue',
    rating: 73.4,
    slope: 136,
    par: 71,
    holePars: [4, 4, 3, 4, 5, 4, 4, 3, 5, 4, 4, 3, 4, 4, 5, 3, 4, 4],
    holeHandicaps: [9, 5, 17, 1, 11, 7, 13, 15, 3, 10, 6, 18, 2, 8, 12, 16, 4, 14],
    createdAt: '2026-03-17T00:00:00.000Z',
    updatedAt: '2026-03-17T00:00:00.000Z',
    ...overrides,
  };
}

describe('preFlightValidationService', () => {
  it('flags matches missing course and tee assignments with manage actions', () => {
    const result = runPreFlightCheck(
      createTrip(),
      createPlayers(),
      createTeams(),
      createTeamMembers(),
      [createSession()],
      [createMatch()],
      [],
      []
    );

    expect(result.warnings.some((item) => item.title.includes('missing a course'))).toBe(true);
    expect(result.warnings.some((item) => item.title.includes('No courses assigned to matches'))).toBe(true);
    expect(
      result.warnings.every((item) =>
        item.category !== 'courses' || item.actionHref === '/captain/manage' || item.actionHref === '/courses'
      )
    ).toBe(true);
  });

  it('flags a course-assigned match that is missing a tee set', () => {
    const result = runPreFlightCheck(
      createTrip(),
      createPlayers(),
      createTeams(),
      createTeamMembers(),
      [createSession()],
      [createMatch({ courseId: 'course-1' })],
      [createCourse()],
      [createTeeSet()]
    );

    expect(result.warnings.some((item) => item.title.includes('missing a tee set'))).toBe(true);
  });

  it('errors when a match references an invalid tee set for the course', () => {
    const result = runPreFlightCheck(
      createTrip(),
      createPlayers(),
      createTeams(),
      createTeamMembers(),
      [createSession()],
      [createMatch({ courseId: 'course-1', teeSetId: 'tee-2' })],
      [createCourse()],
      [createTeeSet({ id: 'tee-2', courseId: 'course-2' })]
    );

    expect(result.errors.some((item) => item.title.includes('invalid course / tee setup'))).toBe(true);
  });
});
