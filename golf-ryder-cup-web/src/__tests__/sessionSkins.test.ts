/**
 * Session-wide skins derived from practice scores across all groups.
 */

import { describe, expect, it } from 'vitest';

import { computeSessionSkinsBoard } from '../components/scoring/practice-scoring/sessionSkins';
import type {
  Match,
  Player,
  PracticeScore,
  RyderCupSession,
  SideBet,
  TeeSet,
} from '../lib/types/models';

function match(order: number, ids: string[]): Match {
  return {
    id: `m${order}`,
    sessionId: 's1',
    mode: 'practice',
    matchOrder: order,
    status: 'scheduled',
    currentHole: 1,
    teamAPlayerIds: ids,
    teamBPlayerIds: [],
    teamAHandicapAllowance: 0,
    teamBHandicapAllowance: 0,
    result: 'notFinished',
    margin: 0,
    holesRemaining: 18,
        createdAt: '2026-04-23T00:00:00Z',
        updatedAt: '2026-04-23T00:00:00Z',
  };
}

function player(id: string, name: string, handicap = 0): Player {
  return { id, firstName: name, lastName: '', handicapIndex: handicap };
}

function session(overrides: Partial<RyderCupSession> = {}): RyderCupSession {
  return {
    id: 's1',
    tripId: 't1',
    name: 'Thursday practice',
    sessionNumber: 1,
    sessionType: 'one-two-three',
    pointsPerMatch: 0,
    status: 'inProgress',
    isPracticeSession: true,
    createdAt: '2026-04-23T00:00:00Z',
    ...overrides,
  };
}

function teeSet(): TeeSet {
  return {
    id: 't',
    courseId: 'c',
    name: 'Blue',
    rating: 72,
    slope: 113,
    par: 72,
    holeHandicaps: Array.from({ length: 18 }, (_, i) => i + 1),
    holePars: Array(18).fill(4),
    createdAt: '2026-04-23T00:00:00Z',
    updatedAt: '2026-04-23T00:00:00Z',
  };
}

function bet(overrides: Partial<SideBet> = {}): SideBet {
  return {
    id: 'b1',
    tripId: 't1',
    sessionId: 's1',
    type: 'skins',
    name: 'Session skins',
    description: '',
    status: 'active',
    perHole: 5,
    participantIds: [],
    createdAt: '2026-04-23T00:00:00Z',
    ...overrides,
  };
}

function score(
  matchId: string,
  playerId: string,
  hole: number,
  gross: number
): PracticeScore {
  return {
    id: `${playerId}-${hole}`,
    matchId,
    playerId,
    holeNumber: hole,
    gross,
    createdAt: '2026-04-23T00:00:00Z',
    updatedAt: '2026-04-23T00:00:00Z',
  };
}

describe('computeSessionSkinsBoard', () => {
  it('awards a skin to the sole lowest net on a fully-played hole', () => {
    // Two groups, 4 players total. Hole 1: p1=3, others=4. p1 wins 1
    // skin at perHole=5.
    const players = [player('p1', 'A'), player('p2', 'B'), player('p3', 'C'), player('p4', 'D')];
    const m1 = match(1, ['p1', 'p2']);
    const m2 = match(2, ['p3', 'p4']);
    const scores: PracticeScore[] = [
      score(m1.id, 'p1', 1, 3),
      score(m1.id, 'p2', 1, 4),
      score(m2.id, 'p3', 1, 4),
      score(m2.id, 'p4', 1, 4),
    ];

    const board = computeSessionSkinsBoard({
      bet: bet({ perHole: 5 }),
      session: session(),
      matches: [m1, m2],
      scores,
      players,
      teeSet: teeSet(),
    });

    expect(board.holes[0]?.winnerId).toBe('p1');
    expect(board.holes[0]?.amount).toBe(5);
    expect(board.standings[0]?.playerId).toBe('p1');
    expect(board.standings[0]?.winnings).toBe(5);
    expect(board.standings[0]?.skins).toBe(1);
    expect(board.paidOut).toBe(5);
  });

  it('carries the skin when multiple players tie on a complete hole', () => {
    // Hole 1: p1 and p2 tie on 3 → carry. Hole 2: p1 clean wins 2. p1
    // gets 2 skins worth 10.
    const players = [player('p1', 'A'), player('p2', 'B')];
    const m1 = match(1, ['p1', 'p2']);
    const scores: PracticeScore[] = [
      score(m1.id, 'p1', 1, 3),
      score(m1.id, 'p2', 1, 3),
      score(m1.id, 'p1', 2, 3),
      score(m1.id, 'p2', 2, 4),
    ];

    const board = computeSessionSkinsBoard({
      bet: bet({ perHole: 5 }),
      session: session(),
      matches: [m1],
      scores,
      players,
      teeSet: teeSet(),
    });

    expect(board.holes[0]?.winnerId).toBeUndefined();
    expect(board.holes[0]?.leaderIds).toEqual(expect.arrayContaining(['p1', 'p2']));
    expect(board.carryingHoles).toContain(1);

    expect(board.holes[1]?.winnerId).toBe('p1');
    expect(board.holes[1]?.amount).toBe(10);
    expect(board.standings[0]?.playerId).toBe('p1');
    expect(board.standings[0]?.winnings).toBe(10);
    expect(board.standings[0]?.skins).toBe(2);
  });

  it('leaves a hole pending — no skin, no carry — when some players have not entered a score', () => {
    // Three players, only two entered. Hole should be pending, not
    // hand the skin to whoever typed fastest.
    const players = [player('p1', 'A'), player('p2', 'B'), player('p3', 'C')];
    const m1 = match(1, ['p1', 'p2', 'p3']);
    const scores: PracticeScore[] = [
      score(m1.id, 'p1', 1, 3),
      score(m1.id, 'p2', 1, 4),
      // p3 hasn't entered hole 1 yet
    ];

    const board = computeSessionSkinsBoard({
      bet: bet({ perHole: 5 }),
      session: session(),
      matches: [m1],
      scores,
      players,
      teeSet: teeSet(),
    });

    expect(board.holes[0]?.winnerId).toBeUndefined();
    expect(board.holes[0]?.amount).toBe(0);
    expect(board.standings[0]?.winnings).toBe(0);
  });

  it('applies handicap strokes when computing net (high-HCP beats scratch on stroke holes)', () => {
    // Scratch player p1 plays 4, 20-HCP p2 plays 5. At slope 113,
    // handicap 20 → course handicap 20. Hole 1 is the hardest
    // (rank 1); p2 gets 2 strokes on it. Net: p1=4, p2=3. p2 wins.
    const players = [player('p1', 'Scratch', 0), player('p2', 'High', 20)];
    const m1 = match(1, ['p1', 'p2']);
    const scores: PracticeScore[] = [
      score(m1.id, 'p1', 1, 4),
      score(m1.id, 'p2', 1, 5),
    ];

    const board = computeSessionSkinsBoard({
      bet: bet({ perHole: 5 }),
      session: session(),
      matches: [m1],
      scores,
      players,
      teeSet: teeSet(),
    });

    expect(board.holes[0]?.winnerId).toBe('p2');
  });

  it('pools across all session groups rather than siloed per group', () => {
    // Two groups. p1 in group 1 shoots 3; p3 in group 2 shoots 3.
    // p2 in group 1 shoots 4; p4 in group 2 shoots 4. The two 3s
    // tie across groups — skin carries.
    const players = [
      player('p1', 'G1a'),
      player('p2', 'G1b'),
      player('p3', 'G2a'),
      player('p4', 'G2b'),
    ];
    const m1 = match(1, ['p1', 'p2']);
    const m2 = match(2, ['p3', 'p4']);
    const scores: PracticeScore[] = [
      score(m1.id, 'p1', 1, 3),
      score(m1.id, 'p2', 1, 4),
      score(m2.id, 'p3', 1, 3),
      score(m2.id, 'p4', 1, 4),
    ];

    const board = computeSessionSkinsBoard({
      bet: bet({ perHole: 5 }),
      session: session(),
      matches: [m1, m2],
      scores,
      players,
      teeSet: teeSet(),
    });

    expect(board.holes[0]?.winnerId).toBeUndefined();
    expect(board.holes[0]?.leaderIds.sort()).toEqual(['p1', 'p3']);
  });
});
