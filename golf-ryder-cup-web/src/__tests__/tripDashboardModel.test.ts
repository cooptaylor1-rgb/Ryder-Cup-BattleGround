import { describe, expect, it } from 'vitest';

import { buildNextUpBlock } from '@/components/home/tripDashboardModel';
import type { MatchState } from '@/lib/types/computed';
import type { Match, Player, RyderCupSession } from '@/lib/types/models';
import type { TripPlayerLinkResult } from '@/lib/utils/tripPlayerIdentity';

const now = '2026-03-22T12:00:00.000Z';

const currentUserPlayer: Player = {
  id: 'player-1',
  tripId: 'trip-1',
  firstName: 'Tom',
  lastName: 'Morris',
  createdAt: now,
  updatedAt: now,
};

const playerLinkResolved: TripPlayerLinkResult = {
  status: 'linked-id',
  player: currentUserPlayer,
  candidates: [currentUserPlayer],
};

const ambiguousLink: TripPlayerLinkResult = {
  status: 'ambiguous-name-match',
  player: null,
  candidates: [currentUserPlayer],
};

function createSession(overrides: Partial<RyderCupSession> = {}): RyderCupSession {
  return {
    id: 'session-1',
    tripId: 'trip-1',
    name: 'Friday AM Foursomes',
    sessionNumber: 1,
    sessionType: 'foursomes',
    scheduledDate: '2026-04-29',
    timeSlot: 'AM',
    status: 'scheduled',
    createdAt: now,
    ...overrides,
  };
}

function createMatch(overrides: Partial<Match> = {}): Match {
  return {
    id: 'match-1',
    sessionId: 'session-1',
    matchOrder: 1,
    status: 'scheduled',
    currentHole: 1,
    teamAPlayerIds: ['player-1', 'player-2'],
    teamBPlayerIds: ['player-3', 'player-4'],
    teamAHandicapAllowance: 0,
    teamBHandicapAllowance: 0,
    result: 'notFinished',
    margin: 0,
    holesRemaining: 18,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function createMatchState(match: Match): MatchState {
  return {
    match,
    holeResults: [],
    currentScore: 0,
    teamAHolesWon: 0,
    teamBHolesWon: 0,
    holesPlayed: 0,
    holesRemaining: 18,
    isDormie: false,
    isClosedOut: false,
    status: match.status,
    displayScore: 'AS',
    winningTeam: 'halved',
  };
}

describe('tripDashboardModel', () => {
  it('prioritizes an in-progress personal match for Next Up', () => {
    const session = createSession();
    const match = createMatch({ status: 'inProgress' });

    const nextUp = buildNextUpBlock({
      userMatchData: {
        match,
        session,
        matchState: createMatchState(match),
      },
      currentUserPlayer,
      sessions: [session],
      matches: [match],
      tripPlayerLink: playerLinkResolved,
      isCaptainMode: true,
    });

    expect(nextUp).toMatchObject({
      title: 'Continue your live match',
      href: `/score/${match.id}`,
    });
  });

  it('falls back to the next personal match before the next session', () => {
    const session = createSession();
    const laterSession = createSession({
      id: 'session-2',
      name: 'Friday PM Four-Ball',
      sessionNumber: 2,
      timeSlot: 'PM',
    });
    const playerMatch = createMatch({ sessionId: session.id });

    const nextUp = buildNextUpBlock({
      userMatchData: null,
      currentUserPlayer,
      sessions: [laterSession, session],
      matches: [playerMatch],
      tripPlayerLink: playerLinkResolved,
      isCaptainMode: false,
    });

    expect(nextUp).toMatchObject({
      title: 'Your next match is set',
      href: '/schedule',
    });
  });

  it('shows the next session when there is no personal match', () => {
    const session = createSession();
    const nextUp = buildNextUpBlock({
      userMatchData: null,
      currentUserPlayer,
      sessions: [session],
      matches: [],
      tripPlayerLink: playerLinkResolved,
      isCaptainMode: false,
    });

    expect(nextUp?.title).toBe(session.name);
    expect(nextUp?.href).toBe('/schedule?view=all');
  });

  it('surfaces captain blockers when there are no sessions or matches ready', () => {
    const nextUp = buildNextUpBlock({
      userMatchData: null,
      currentUserPlayer,
      sessions: [],
      matches: [],
      tripPlayerLink: playerLinkResolved,
      isCaptainMode: true,
    });

    expect(nextUp).toMatchObject({
      eyebrow: 'Captain Blocker',
      href: '/lineup/new?mode=session',
    });
  });

  it('prompts roster review when the profile link is ambiguous and no better next step exists', () => {
    const nextUp = buildNextUpBlock({
      userMatchData: null,
      currentUserPlayer: null,
      sessions: [],
      matches: [],
      tripPlayerLink: ambiguousLink,
      isCaptainMode: false,
    });

    expect(nextUp).toMatchObject({
      title: 'Review your roster link',
      href: '/profile',
    });
  });
});
