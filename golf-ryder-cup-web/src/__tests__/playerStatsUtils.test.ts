import { describe, expect, it } from 'vitest';
import type { Match, RyderCupSession } from '@/lib/types/models';
import {
  filterMatchesByTrip,
  getOpponentIdsForPlayer,
  getPartnerIdsForPlayer,
  resolvePlayerPerspectiveResult,
  resolveRoundFormat,
} from '@/lib/hooks/playerStatsUtils';

function createMatch(overrides: Partial<Match> = {}): Match {
  return {
    id: 'match-1',
    sessionId: 'session-1',
    matchOrder: 1,
    status: 'completed',
    currentHole: 18,
    teamAPlayerIds: ['player-a', 'partner-a'],
    teamBPlayerIds: ['player-b', 'partner-b'],
    teamAHandicapAllowance: 0,
    teamBHandicapAllowance: 0,
    result: 'teamAWin',
    margin: 1,
    holesRemaining: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function createSession(overrides: Partial<RyderCupSession> = {}): RyderCupSession {
  return {
    id: 'session-1',
    tripId: 'trip-1',
    name: 'Session 1',
    sessionNumber: 1,
    sessionType: 'fourball',
    status: 'completed',
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('playerStatsUtils', () => {
  describe('resolvePlayerPerspectiveResult', () => {
    it('maps team wins to player wins and losses', () => {
      const match = createMatch({ result: 'teamAWin' });

      expect(resolvePlayerPerspectiveResult(match, 'player-a')).toBe('win');
      expect(resolvePlayerPerspectiveResult(match, 'player-b')).toBe('loss');
    });

    it('returns halved for halved matches', () => {
      const match = createMatch({ result: 'halved' });

      expect(resolvePlayerPerspectiveResult(match, 'player-a')).toBe('halved');
      expect(resolvePlayerPerspectiveResult(match, 'player-b')).toBe('halved');
    });

    it('ignores unfinished matches and non-participants', () => {
      expect(resolvePlayerPerspectiveResult(createMatch({ result: 'notFinished' }), 'player-a')).toBeNull();
      expect(resolvePlayerPerspectiveResult(createMatch(), 'outsider')).toBeNull();
    });
  });

  describe('filterMatchesByTrip', () => {
    it('filters by the match session trip id, not a truthy trip string', () => {
      const tripOneSession = createSession({ id: 'session-1', tripId: 'trip-1' });
      const tripTwoSession = createSession({ id: 'session-2', tripId: 'trip-2' });
      const sessionsById = new Map([
        [tripOneSession.id, tripOneSession],
        [tripTwoSession.id, tripTwoSession],
      ]);

      const matches = [
        createMatch({ id: 'match-1', sessionId: 'session-1' }),
        createMatch({ id: 'match-2', sessionId: 'session-2' }),
      ];

      expect(filterMatchesByTrip(matches, sessionsById, 'trip-1').map((match) => match.id)).toEqual([
        'match-1',
      ]);
    });
  });

  describe('partner and opponent helpers', () => {
    it('returns partner and opponent ids from the correct side', () => {
      const match = createMatch();

      expect(getPartnerIdsForPlayer(match, 'player-a')).toEqual(['partner-a']);
      expect(getOpponentIdsForPlayer(match, 'player-a')).toEqual(['player-b', 'partner-b']);
      expect(getPartnerIdsForPlayer(match, 'player-b')).toEqual(['partner-b']);
      expect(getOpponentIdsForPlayer(match, 'player-b')).toEqual(['player-a', 'partner-a']);
    });
  });

  describe('resolveRoundFormat', () => {
    it('passes through supported session formats', () => {
      expect(resolveRoundFormat('singles')).toBe('singles');
      expect(resolveRoundFormat('fourball')).toBe('fourball');
      expect(resolveRoundFormat('foursomes')).toBe('foursomes');
    });
  });
});
