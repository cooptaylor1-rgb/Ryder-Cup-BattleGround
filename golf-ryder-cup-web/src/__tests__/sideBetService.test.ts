import { describe, expect, it } from 'vitest';

import {
  buildCustomSideBet,
  buildNassauSideBet,
  buildQuickSideBet,
  canCreateMatchNassau,
} from '@/lib/services/sideBetService';
import type { Match, Player } from '@/lib/types/models';

const players: Player[] = [
  { id: 'a1', firstName: 'Scottie', lastName: 'Scheffler' },
  { id: 'a2', firstName: 'Collin', lastName: 'Morikawa' },
  { id: 'b1', firstName: 'Rory', lastName: 'McIlroy' },
  { id: 'b2', firstName: 'Tommy', lastName: 'Fleetwood' },
];

const match: Match = {
  id: 'match-1',
  sessionId: 'session-1',
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
  createdAt: '2026-03-17T12:00:00.000Z',
  updatedAt: '2026-03-17T12:00:00.000Z',
};

describe('sideBetService', () => {
  it('builds match-scoped quick bets with match participants', () => {
    const bet = buildQuickSideBet({
      tripId: 'trip-1',
      type: 'skins',
      participants: players,
      match,
    });

    expect(bet.matchId).toBe(match.id);
    expect(bet.sessionId).toBe(match.sessionId);
    expect(bet.participantIds).toEqual(players.map((player) => player.id));
    expect(bet.description).toBe('Inside game for Match #1');
    expect(bet.perHole).toBe(5);
  });

  it('builds match Nassau bets with locked team sides', () => {
    const bet = buildNassauSideBet({
      tripId: 'trip-1',
      name: 'Opening Nassau',
      pot: 40,
      match,
      teamAPlayers: players.slice(0, 2),
      teamBPlayers: players.slice(2),
    });

    expect(bet.type).toBe('nassau');
    expect(bet.matchId).toBe(match.id);
    expect(bet.nassauTeamA).toEqual(['a1', 'a2']);
    expect(bet.nassauTeamB).toEqual(['b1', 'b2']);
    expect(bet.description).toBe('Scheffler & Morikawa vs McIlroy & Fleetwood');
  });

  it('builds custom bets with trimmed names and scoped descriptions', () => {
    const bet = buildCustomSideBet({
      tripId: 'trip-1',
      type: 'custom',
      name: '  Wolf Hammer  ',
      pot: 25,
      participants: players.slice(0, 2),
      match,
    });

    expect(bet.name).toBe('Wolf Hammer');
    expect(bet.description).toBe('Inside game for Match #1');
  });

  it('detects Nassau eligibility from two-versus-two matches', () => {
    expect(canCreateMatchNassau(match)).toBe(true);
    expect(
      canCreateMatchNassau({
        ...match,
        teamAPlayerIds: ['a1'],
      })
    ).toBe(false);
  });
});
