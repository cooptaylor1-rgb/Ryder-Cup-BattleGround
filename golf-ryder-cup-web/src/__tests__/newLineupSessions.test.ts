import { describe, expect, it } from 'vitest';

import type { Match, RyderCupSession } from '@/lib/types/models';
import {
  findNextSessionNeedingLineup,
  getDefaultSessionDateForNumber,
  getDefaultTeeTimeForSessionNumber,
  getNextSessionNumber,
  getTimeSlotForSessionNumber,
} from '@/components/captain/lineup/newLineupSessions';
import { generateSessionName } from '@/components/captain/lineup/newLineupConfig';

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
  it('uses the highest existing session number when creating a new session', () => {
    const sessions = [createSession('s1', 1), createSession('s4', 4), createSession('s5', 5)];

    expect(getNextSessionNumber(sessions)).toBe(6);
    expect(generateSessionName(1)).toBe('Day 1 AM');
    expect(generateSessionName(2)).toBe('Day 1 PM');
    expect(generateSessionName(5)).toBe('Day 3 AM');
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
