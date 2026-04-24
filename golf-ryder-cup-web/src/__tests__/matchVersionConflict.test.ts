import { describe, expect, it } from 'vitest';

import { getMatchVersionConflict } from '@/lib/services/trip-sync/tripSyncEntityWriters';
import type { Match } from '@/lib/types/models';

function makeMatch(overrides: Partial<Match> = {}): Match {
  return {
    id: 'match-1',
    sessionId: 'session-1',
    courseId: 'course-1',
    teeSetId: 'tee-1',
    matchOrder: 1,
    status: 'inProgress',
    currentHole: 5,
    mode: 'ryderCup',
    teamAPlayerIds: ['a1', 'a2'],
    teamBPlayerIds: ['b1', 'b2'],
    teamAHandicapAllowance: 2,
    teamBHandicapAllowance: 4,
    result: 'notFinished',
    margin: 1,
    holesRemaining: 13,
    version: 4,
    createdAt: '2026-04-23T12:00:00Z',
    updatedAt: '2026-04-23T13:00:00Z',
    ...overrides,
  };
}

describe('getMatchVersionConflict', () => {
  it('allows an incoming match with a higher version', () => {
    const existing = makeMatch({ version: 4 });
    const incoming = makeMatch({ version: 5, currentHole: 6 });

    expect(getMatchVersionConflict(existing, incoming)).toBeNull();
  });

  it('allows idempotent retries when server already has the same payload', () => {
    const existing = makeMatch({ version: 5, currentHole: 6 });
    const incoming = makeMatch({ version: 5, currentHole: 6 });

    expect(getMatchVersionConflict(existing, incoming)).toBeNull();
  });

  it('flags same-version divergent score state instead of silently overwriting', () => {
    const existing = makeMatch({ version: 5, currentHole: 6, margin: 2 });
    const incoming = makeMatch({ version: 5, currentHole: 6, margin: 1 });

    expect(getMatchVersionConflict(existing, incoming)).toContain('Scoring conflict');
  });

  it('keeps legacy zero-version matches on timestamp LWW behavior', () => {
    const existing = makeMatch({ version: 0, currentHole: 6 });
    const incoming = makeMatch({ version: 0, currentHole: 7 });

    expect(getMatchVersionConflict(existing, incoming)).toBeNull();
  });
});
