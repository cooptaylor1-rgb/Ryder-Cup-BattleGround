/**
 * Schedule rendering for practice-mode matches
 *
 * Practice matches should render with "Group N" titles, a combined
 * player subtitle, and their own per-group tee time — not as "Match N
 * · USA vs EUR" with staggered defaults.
 */

import { describe, expect, it } from 'vitest';

import { buildScheduleByDay } from '../components/schedule/scheduleData';
import type { Course, Match, Player, TeeSet, Trip } from '../lib/types/models';

// Mirror of the internal ScheduleSessionLike shape in scheduleData.ts —
// inlined here rather than exported from the source so the tests stay
// decoupled from internal refactors of that type.
interface ScheduleSessionLike {
  id: string;
  tripId: string;
  name: string;
  sessionNumber: number;
  sessionType: string;
  scheduledDate?: string;
  timeSlot?: 'AM' | 'PM';
  firstTeeTime?: string;
  status: string;
  isPracticeSession?: boolean;
  defaultCourseId?: string;
  defaultTeeSetId?: string;
}

function trip(overrides: Partial<Trip> = {}): Trip {
  return {
    id: 'trip-practice',
    name: 'Test',
    startDate: '2026-04-30',
    endDate: '2026-04-30',
    isCaptainModeEnabled: true,
    createdAt: '2026-04-23T00:00:00.000Z',
    updatedAt: '2026-04-23T00:00:00.000Z',
    ...overrides,
  };
}

function player(id: string, first: string, last: string): Player {
  return { id, firstName: first, lastName: last };
}

describe('buildScheduleByDay — practice rendering', () => {
  it('renders practice matches as "Group N" with combined player subtitle', () => {
    const sessions: ScheduleSessionLike[] = [
      {
        id: 's1',
        tripId: 'trip-practice',
        name: 'Practice',
        sessionNumber: 1,
        sessionType: 'fourBall',
        scheduledDate: '2026-04-30',
        timeSlot: 'AM',
        firstTeeTime: '08:00',
        status: 'scheduled',
        isPracticeSession: true,
      },
    ];

    const matches: Match[] = [
      {
        id: 'm1',
        sessionId: 's1',
        mode: 'practice',
        matchOrder: 1,
        status: 'scheduled',
        currentHole: 1,
        teamAPlayerIds: ['p1', 'p2', 'p3', 'p4'],
        teamBPlayerIds: [],
        teamAHandicapAllowance: 0,
        teamBHandicapAllowance: 0,
        result: 'notFinished',
        margin: 0,
        holesRemaining: 18,
        teeTime: '08:12',
      },
      {
        id: 'm2',
        sessionId: 's1',
        mode: 'practice',
        matchOrder: 2,
        status: 'scheduled',
        currentHole: 1,
        teamAPlayerIds: ['p5', 'p6'],
        teamBPlayerIds: [],
        teamAHandicapAllowance: 0,
        teamBHandicapAllowance: 0,
        result: 'notFinished',
        margin: 0,
        holesRemaining: 18,
        teeTime: '08:24',
      },
    ];

    const players: Player[] = [
      player('p1', 'Alice', 'Ace'),
      player('p2', 'Bob', 'Birdie'),
      player('p3', 'Cole', 'Chip'),
      player('p4', 'Dana', 'Draw'),
      player('p5', 'Eli', 'Eagle'),
      player('p6', 'Fay', 'Fade'),
    ];

    const days = buildScheduleByDay({
      currentTrip: trip(),
      sessions,
      matches,
      players,
      courses: [] as Course[],
      teeSets: [] as TeeSet[],
    });

    expect(days).toHaveLength(1);
    const day = days[0]!;

    const sessionEntry = day.entries.find((e) => e.type === 'session');
    expect(sessionEntry?.subtitle).toContain('Practice round');
    expect(sessionEntry?.subtitle).toContain('2 groups');

    const teeTimeEntries = day.entries.filter((e) => e.type === 'teeTime');
    expect(teeTimeEntries).toHaveLength(2);

    const firstGroup = teeTimeEntries[0]!;
    expect(firstGroup.title).toBe('Group 1');
    expect(firstGroup.subtitle).toBe('Alice Ace, Bob Birdie, Cole Chip, Dana Draw');
    // Group's own teeTime overrides the staggered default
    expect(firstGroup.time).toMatch(/8:12/);

    const secondGroup = teeTimeEntries[1]!;
    expect(secondGroup.title).toBe('Group 2');
    expect(secondGroup.subtitle).toBe('Eli Eagle, Fay Fade');
    expect(secondGroup.time).toMatch(/8:24/);
  });

  it('falls back to the staggered session default when a group has no explicit tee time', () => {
    const sessions: ScheduleSessionLike[] = [
      {
        id: 's1',
        tripId: 'trip-practice',
        name: 'Practice',
        sessionNumber: 1,
        sessionType: 'fourBall',
        scheduledDate: '2026-04-30',
        timeSlot: 'AM',
        firstTeeTime: '08:00',
        status: 'scheduled',
        isPracticeSession: true,
      },
    ];
    const matches: Match[] = [
      {
        id: 'm1',
        sessionId: 's1',
        mode: 'practice',
        matchOrder: 2,
        status: 'scheduled',
        currentHole: 1,
        teamAPlayerIds: ['p1', 'p2'],
        teamBPlayerIds: [],
        teamAHandicapAllowance: 0,
        teamBHandicapAllowance: 0,
        result: 'notFinished',
        margin: 0,
        holesRemaining: 18,
        // no teeTime
      },
    ];
    const players = [player('p1', 'A', 'One'), player('p2', 'B', 'Two')];

    const days = buildScheduleByDay({
      currentTrip: trip(),
      sessions,
      matches,
      players,
      courses: [] as Course[],
      teeSets: [] as TeeSet[],
    });

    const teeTimeEntry = days[0]!.entries.find((e) => e.type === 'teeTime')!;
    // 8:00 base + 10 min interval × (matchOrder-1 = 1) = 8:10
    expect(teeTimeEntry.time).toMatch(/8:10/);
  });

  it('still renders cup matches as "Match N · TeamA vs TeamB" subtitle', () => {
    const sessions: ScheduleSessionLike[] = [
      {
        id: 's-cup',
        tripId: 'trip-practice',
        name: 'Friday AM',
        sessionNumber: 2,
        sessionType: 'fourBall',
        scheduledDate: '2026-04-30',
        timeSlot: 'AM',
        firstTeeTime: '08:00',
        status: 'scheduled',
      },
    ];
    const matches: Match[] = [
      {
        id: 'm1',
        sessionId: 's-cup',
        mode: 'ryderCup',
        matchOrder: 1,
        status: 'scheduled',
        currentHole: 1,
        teamAPlayerIds: ['a1', 'a2'],
        teamBPlayerIds: ['b1', 'b2'],
        teamAHandicapAllowance: 0,
        teamBHandicapAllowance: 0,
        result: 'notFinished',
        margin: 0,
        holesRemaining: 18,
      },
    ];
    const players = [
      player('a1', 'USA', 'One'),
      player('a2', 'USA', 'Two'),
      player('b1', 'EUR', 'One'),
      player('b2', 'EUR', 'Two'),
    ];

    const days = buildScheduleByDay({
      currentTrip: trip(),
      sessions,
      matches,
      players,
      courses: [] as Course[],
      teeSets: [] as TeeSet[],
    });

    const teeTimeEntry = days[0]!.entries.find((e) => e.type === 'teeTime')!;
    expect(teeTimeEntry.title).toBe('Match 1');
    expect(teeTimeEntry.subtitle).toBe('USA One & USA Two vs EUR One & EUR Two');
  });
});
