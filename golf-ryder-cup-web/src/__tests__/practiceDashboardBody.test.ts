/**
 * Home dashboard wording for practice rounds.
 *
 * The "Your match" card on the home page hard-coded Ryder Cup framing
 * ("Four-Ball against Opponents pending") which reads wrong when the
 * captain is about to tee off in a practice group. These tests guard
 * the practice-aware copy in buildUserMatchTitle / buildUserMatchBody.
 */

import { describe, expect, it } from 'vitest';

import {
  buildUserMatchBody,
  buildUserMatchTitle,
  type UserMatchData,
} from '../components/home/TripDashboardSections';
import type { Match, Player, RyderCupSession } from '../lib/types/models';

function minimalSession(overrides: Partial<RyderCupSession> = {}): RyderCupSession {
  return {
    id: 's1',
    tripId: 't1',
    name: 'Thursday practice',
    sessionNumber: 1,
    sessionType: 'fourball',
    status: 'scheduled',
    createdAt: '2026-04-23T00:00:00Z',
    ...overrides,
  };
}

function minimalMatch(overrides: Partial<Match> = {}): Match {
  return {
    id: 'm1',
    sessionId: 's1',
    matchOrder: 3,
    status: 'scheduled',
    currentHole: 1,
    teamAPlayerIds: ['self', 'friend1', 'friend2', 'friend3'],
    teamBPlayerIds: [],
    teamAHandicapAllowance: 0,
    teamBHandicapAllowance: 0,
    result: 'notFinished',
    margin: 0,
    holesRemaining: 18,
    createdAt: '2026-04-23T00:00:00Z',
    updatedAt: '2026-04-23T00:00:00Z',
    ...overrides,
  };
}

function buildUserMatchData(overrides: {
  match?: Partial<Match>;
  session?: Partial<RyderCupSession>;
} = {}): UserMatchData {
  return {
    match: minimalMatch(overrides.match),
    session: minimalSession(overrides.session),
    matchState: null,
  };
}

describe('buildUserMatchTitle', () => {
  it('uses "Practice group N" language when match.mode === "practice"', () => {
    const title = buildUserMatchTitle(
      buildUserMatchData({ match: { mode: 'practice', matchOrder: 3 } }),
      { id: 'self', firstName: 'Me', lastName: 'Captain' }
    );
    expect(title).toBe('Practice group 3 is on your card');
  });

  it('uses "Practice group N" language when session.isPracticeSession is true even if match.mode is missing', () => {
    const title = buildUserMatchTitle(
      buildUserMatchData({
        match: { matchOrder: 2 },
        session: { isPracticeSession: true },
      }),
      { id: 'self', firstName: 'Me', lastName: 'Captain' }
    );
    expect(title).toBe('Practice group 2 is on your card');
  });

  it('keeps existing Ryder Cup title for non-practice matches', () => {
    const title = buildUserMatchTitle(
      buildUserMatchData({ match: { matchOrder: 1, mode: 'ryderCup' } }),
      { id: 'self', firstName: 'Me', lastName: 'Captain' }
    );
    expect(title).toBe('Match 1 is on your card');
  });

  it('uses "Your match is live" regardless of practice flag when in progress', () => {
    const title = buildUserMatchTitle(
      buildUserMatchData({ match: { mode: 'practice', status: 'inProgress' } }),
      null
    );
    expect(title).toBe('Your match is live');
  });
});

describe('buildUserMatchBody', () => {
  const players: Player[] = [
    { id: 'self', firstName: 'Me', lastName: 'Captain' },
    { id: 'buddy1', firstName: 'Ada', lastName: 'Lovelace' },
    { id: 'buddy2', firstName: 'Ben', lastName: 'Franklin' },
  ];

  it('describes a practice group without naming opponents', () => {
    const body = buildUserMatchBody(
      buildUserMatchData({
        match: {
          mode: 'practice',
          teamAPlayerIds: ['self', 'buddy1', 'buddy2'],
        },
        session: { isPracticeSession: true },
      }),
      players[0]!,
      players
    );
    expect(body).toContain('Practice round');
    expect(body).toContain('Playing with Ada Lovelace, Ben Franklin');
    expect(body).not.toContain('against');
  });

  it('keeps match-play framing for cup matches', () => {
    const cupPlayers: Player[] = [
      { id: 'a1', firstName: 'A', lastName: 'One' },
      { id: 'a2', firstName: 'A', lastName: 'Two' },
      { id: 'b1', firstName: 'B', lastName: 'One' },
      { id: 'b2', firstName: 'B', lastName: 'Two' },
    ];
    const body = buildUserMatchBody(
      buildUserMatchData({
        match: {
          mode: 'ryderCup',
          teamAPlayerIds: ['a1', 'a2'],
          teamBPlayerIds: ['b1', 'b2'],
        },
      }),
      cupPlayers[0]!,
      cupPlayers
    );
    expect(body).toContain('Four-Ball against');
    // resolveOpponents uses formatPlayerName('short') which emits
    // "B. One" — initial + last name with a period.
    expect(body).toContain('B. One & B. Two');
  });
});
