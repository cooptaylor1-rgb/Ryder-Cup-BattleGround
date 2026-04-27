import { describe, expect, it } from 'vitest';

import type { Match, RyderCupSession } from '@/lib/types/models';
import {
  findNextSessionNeedingLineup,
  getDefaultSessionDateForNumber,
  getDefaultTeeTimeForSessionNumber,
  getNextSessionNumber,
  getTimeSlotForSessionNumber,
} from '@/components/captain/lineup/newLineupSessions';
import {
  generateSessionName,
  getPlayersPerTeam,
} from '@/components/captain/lineup/newLineupConfig';

const NOW = '2026-04-29T12:00:00.000Z';

function createSession(
  id: string,
  sessionNumber: number,
  overrides: Partial<RyderCupSession> = {}
): RyderCupSession {
  return {
    id,
    tripId: 'trip-1',
    name: `Session ${sessionNumber}`,
    sessionNumber,
    sessionType: 'fourball',
    status: 'scheduled',
    createdAt: NOW,
    ...overrides,
  };
}

function createMatch(
  id: string,
  sessionId: string,
  teamAPlayerIds: string[],
  teamBPlayerIds: string[]
): Match {
  return {
    id,
    sessionId,
    matchOrder: 1,
    status: 'scheduled',
    currentHole: 0,
    teamAPlayerIds,
    teamBPlayerIds,
    teamAHandicapAllowance: 0,
    teamBHandicapAllowance: 0,
    result: 'notFinished',
    margin: 0,
    holesRemaining: 18,
    createdAt: NOW,
    updatedAt: NOW,
  };
}

describe('new lineup session helpers', () => {
  it('uses the earliest open session number when creating a new session', () => {
    const sessions = [createSession('s1', 1), createSession('s4', 4), createSession('s5', 5)];

    expect(getNextSessionNumber(sessions)).toBe(2);
    expect(generateSessionName(1)).toBe('Day 1 AM');
    expect(generateSessionName(2)).toBe('Day 1 PM');
    expect(generateSessionName(3)).toBe('Day 2 AM');
    expect(generateSessionName(5)).toBe('Day 3 AM');
  });

  it('fills the deleted Day 2 AM slot before continuing after stale later sessions', () => {
    const sessions = [createSession('s1', 1), createSession('s2', 2), createSession('stale', 6)];

    const nextSessionNumber = getNextSessionNumber(sessions);

    expect(nextSessionNumber).toBe(3);
    expect(generateSessionName(nextSessionNumber)).toBe('Day 2 AM');
    expect(getDefaultTeeTimeForSessionNumber(nextSessionNumber)).toBe('08:00');
  });

  it('finds the earliest scheduled session with incomplete lineups', () => {
    const sessions = [createSession('session-1', 1), createSession('session-2', 2)];
    const matches = [
      createMatch('match-1', 'session-1', ['a1', 'a2'], ['b1', 'b2']),
      createMatch('match-2', 'session-2', [], []),
    ];

    expect(findNextSessionNeedingLineup(sessions, matches)?.id).toBe('session-2');
  });

  it('treats sessions with no matches as needing lineup work', () => {
    const sessions = [createSession('session-1', 1), createSession('session-2', 2)];
    const matches = [createMatch('match-1', 'session-1', ['a1', 'a2'], ['b1', 'b2'])];

    expect(findNextSessionNeedingLineup(sessions, matches)?.id).toBe('session-2');
  });

  it('derives date, tee time, and slot from the session number', () => {
    expect(getTimeSlotForSessionNumber(1)).toBe('AM');
    expect(getTimeSlotForSessionNumber(2)).toBe('PM');
    expect(getDefaultTeeTimeForSessionNumber(1)).toBe('08:00');
    expect(getDefaultTeeTimeForSessionNumber(2)).toBe('13:00');
    expect(getDefaultSessionDateForNumber('2026-04-29T10:00:00.000Z', 4, '2026-04-29')).toBe(
      '2026-04-30'
    );
  });
});

describe('getPlayersPerTeam', () => {
  it('returns 1 for singles', () => {
    expect(getPlayersPerTeam('singles')).toBe(1);
  });

  it('returns 2 for foursomes and fourball', () => {
    expect(getPlayersPerTeam('foursomes')).toBe(2);
    expect(getPlayersPerTeam('fourball')).toBe(2);
  });

  it('returns 3 for the existing 3-player Cha-Cha-Cha catalog entry', () => {
    expect(getPlayersPerTeam('cha-cha-cha')).toBe(3);
  });

  it('returns 4 for the new 1-2-3 (4-player) format', () => {
    expect(getPlayersPerTeam('one-two-three')).toBe(4);
  });

  it('returns 4 for scramble variants defined in the lineup catalog', () => {
    expect(getPlayersPerTeam('scramble')).toBe(4);
    expect(getPlayersPerTeam('texas-scramble')).toBe(4);
    expect(getPlayersPerTeam('shamble')).toBe(4);
    expect(getPlayersPerTeam('best-2-of-4')).toBe(4);
  });

  it('returns 2 for partner formats (Pinehurst, Greensomes)', () => {
    expect(getPlayersPerTeam('pinehurst')).toBe(2);
    expect(getPlayersPerTeam('greensomes')).toBe(2);
  });

  it('falls back to 2 for unknown / undefined session types', () => {
    expect(getPlayersPerTeam(undefined)).toBe(2);
    expect(getPlayersPerTeam(null)).toBe(2);
    expect(getPlayersPerTeam('not-a-real-format')).toBe(2);
  });
});
