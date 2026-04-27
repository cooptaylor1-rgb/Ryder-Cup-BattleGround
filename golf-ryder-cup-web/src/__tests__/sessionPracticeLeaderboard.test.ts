/**
 * Session-wide practice leaderboard math.
 *
 * Covers the 1-2-3 progressive best-ball rule (1 net ball holes 1-6,
 * 2 on 7-12, 3 on 13-18) and the default single-best-ball fallback
 * for unknown formats. Also checks ranking, handicap application,
 * and the per-hole bestNetByHole output used by session-wide skins.
 */

import { describe, expect, it } from 'vitest';

import {
  ballsCountedForHole,
  computeSessionPracticeLeaderboard,
  getGroupScoreToPar,
} from '../components/scoring/practice-scoring/sessionLeaderboard';
import type { Match, Player, PracticeScore, RyderCupSession, TeeSet } from '../lib/types/models';

function makeMatch(order: number, playerIds: string[]): Match {
  return {
    id: `m${order}`,
    sessionId: 's1',
    mode: 'practice',
    matchOrder: order,
    status: 'scheduled',
    currentHole: 1,
    teamAPlayerIds: playerIds,
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

function makePlayer(id: string, name: string, handicap = 0): Player {
  return {
    id,
    firstName: name,
    lastName: '',
    handicapIndex: handicap,
  };
}

function session(overrides: Partial<RyderCupSession> = {}): RyderCupSession {
  return {
    id: 's1',
    tripId: 't1',
    name: 'Thursday',
    sessionNumber: 1,
    sessionType: 'one-two-three',
    pointsPerMatch: 0,
    status: 'inProgress',
    isPracticeSession: true,
    createdAt: '2026-04-23T00:00:00Z',
    ...overrides,
  };
}

function teeSet(overrides: Partial<TeeSet> = {}): TeeSet {
  return {
    id: 't',
    courseId: 'c',
    name: 'Blue',
    rating: 72,
    slope: 113,
    par: 72,
    // Monotonic ranks so strokes allocate predictably (hardest hole first).
    holeHandicaps: Array.from({ length: 18 }, (_, i) => i + 1),
    holePars: Array(18).fill(4),
    createdAt: '2026-04-23T00:00:00Z',
    updatedAt: '2026-04-23T00:00:00Z',
    ...overrides,
  };
}

function scoresFromStrokeTable(matchId: string, table: Record<string, number[]>): PracticeScore[] {
  const out: PracticeScore[] = [];
  for (const [playerId, byHole] of Object.entries(table)) {
    byHole.forEach((gross, idx) => {
      if (typeof gross === 'number') {
        out.push({
          id: `${playerId}-${idx + 1}`,
          matchId,
          playerId,
          holeNumber: idx + 1,
          gross,
          createdAt: '2026-04-23T00:00:00Z',
          updatedAt: '2026-04-23T00:00:00Z',
        });
      }
    });
  }
  return out;
}

describe('ballsCountedForHole', () => {
  it('returns 1/2/3 for 1-2-3 progressive', () => {
    expect(ballsCountedForHole('one-two-three', 1)).toBe(1);
    expect(ballsCountedForHole('one-two-three', 6)).toBe(1);
    expect(ballsCountedForHole('one-two-three', 7)).toBe(2);
    expect(ballsCountedForHole('one-two-three', 12)).toBe(2);
    expect(ballsCountedForHole('one-two-three', 13)).toBe(3);
    expect(ballsCountedForHole('one-two-three', 18)).toBe(3);
  });

  it('defaults to 1 for unknown formats', () => {
    expect(ballsCountedForHole('whatever-unknown', 5)).toBe(1);
    expect(ballsCountedForHole(undefined, 5)).toBe(1);
  });
});

describe('getGroupScoreToPar', () => {
  it('returns undefined until the group has a scored hole with par', () => {
    expect(
      getGroupScoreToPar({
        groupNumber: 1,
        matchId: 'm1',
        players: [],
        holes: [
          {
            holeNumber: 1,
            par: 4,
            ballsCounted: 1,
            groupNet: undefined,
            groupGross: undefined,
            contributions: [],
          },
        ],
        grossTotal: undefined,
        netTotal: undefined,
        holesPlayed: 0,
      })
    ).toBeUndefined();
  });

  it('sums score-to-par across counted balls', () => {
    expect(
      getGroupScoreToPar({
        groupNumber: 1,
        matchId: 'm1',
        players: [],
        holes: [
          {
            holeNumber: 1,
            par: 4,
            ballsCounted: 2,
            groupNet: 7,
            groupGross: 8,
            contributions: [],
          },
          {
            holeNumber: 2,
            par: 5,
            ballsCounted: 1,
            groupNet: 6,
            groupGross: 6,
            contributions: [],
          },
        ],
        grossTotal: 14,
        netTotal: 13,
        holesPlayed: 2,
      })
    ).toBe(0);
  });
});

describe('computeSessionPracticeLeaderboard — 1-2-3 format', () => {
  it('groups 1 net ball on hole 1-6, 2 on 7-12, 3 on 13-18', () => {
    const players: Player[] = [
      makePlayer('p1', 'Alice'),
      makePlayer('p2', 'Bob'),
      makePlayer('p3', 'Cole'),
      makePlayer('p4', 'Dana'),
    ];
    const match = makeMatch(1, ['p1', 'p2', 'p3', 'p4']);

    // Hole-by-hole gross strokes for each player. Zero-handicap so
    // gross == net, which keeps the best-ball math obvious in the
    // assertions.
    const strokeTable: Record<string, number[]> = {
      p1: [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
      p2: [5, 5, 5, 5, 5, 5, 3, 3, 3, 3, 3, 3, 5, 5, 5, 5, 5, 5],
      p3: [5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 4, 4, 4, 4, 4, 4],
      p4: [5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 3, 3, 3, 3, 3, 3],
    };
    const scores = scoresFromStrokeTable(match.id, strokeTable);

    const result = computeSessionPracticeLeaderboard({
      session: session(),
      matches: [match],
      scores,
      players,
      teeSet: teeSet(),
    });

    expect(result.formatSupported).toBe(true);
    expect(result.groups).toHaveLength(1);
    const group = result.groups[0]!;

    // Holes 1-6: best 1 ball. Alice's 4 is always lowest, so 6 * 4 = 24.
    // Holes 7-12: best 2 balls. p2 plays 3s, p1 plays 4s → 3 + 4 = 7
    //             per hole × 6 holes = 42.
    // Holes 13-18: best 3 balls. p4 plays 3s, p3 plays 4s, p1 plays 4s →
    //              3 + 4 + 4 = 11 per hole × 6 holes = 66.
    // Total: 24 + 42 + 66 = 132.
    expect(group.netTotal).toBe(132);
    expect(group.holesPlayed).toBe(18);
  });

  it('ranks groups by net ascending, pushes unscored groups to the bottom', () => {
    const players: Player[] = [
      makePlayer('g1p1', 'A1'),
      makePlayer('g1p2', 'A2'),
      makePlayer('g2p1', 'B1'),
      makePlayer('g2p2', 'B2'),
    ];
    const matchA = makeMatch(1, ['g1p1', 'g1p2']);
    const matchB = makeMatch(2, ['g2p1', 'g2p2']);

    // Group A is better everywhere; group B has no scores yet.
    const scores = scoresFromStrokeTable(matchA.id, {
      g1p1: Array(18).fill(4),
      g1p2: Array(18).fill(5),
    });

    const result = computeSessionPracticeLeaderboard({
      session: session(),
      matches: [matchA, matchB],
      scores,
      players,
      teeSet: teeSet(),
    });

    expect(result.groups[0]?.groupNumber).toBe(1);
    expect(result.groups[1]?.groupNumber).toBe(2);
    expect(result.groups[0]?.holesPlayed).toBeGreaterThan(0);
    expect(result.groups[1]?.holesPlayed).toBe(0);
  });

  it('applies handicap strokes when computing net', () => {
    // Handicap 18 → 1 stroke on every hole. Gross 5 everywhere = net 4.
    const players = [makePlayer('solo', 'Pat', 18)];
    const match = makeMatch(1, ['solo']);
    const scores = scoresFromStrokeTable(match.id, { solo: Array(18).fill(5) });

    const result = computeSessionPracticeLeaderboard({
      session: session({ sessionType: 'fourball' }),
      matches: [match],
      scores,
      players,
      teeSet: teeSet(),
    });

    const group = result.groups[0]!;
    expect(group.grossTotal).toBe(90);
    expect(group.netTotal).toBe(72);
  });

  it('emits bestNetByHole as the lowest net from any player in any group', () => {
    const players = [
      makePlayer('g1', 'Alpha'),
      makePlayer('g2', 'Bravo'),
      makePlayer('g3', 'Charlie'),
    ];
    const matchA = makeMatch(1, ['g1']);
    const matchB = makeMatch(2, ['g2', 'g3']);

    const scores = [
      ...scoresFromStrokeTable(matchA.id, { g1: [4, 5, 6] }),
      ...scoresFromStrokeTable(matchB.id, { g2: [5, 3, 7], g3: [6, 4, 5] }),
    ];

    const result = computeSessionPracticeLeaderboard({
      session: session({ sessionType: 'fourball' }),
      matches: [matchA, matchB],
      scores,
      players,
      teeSet: teeSet(),
    });

    expect(result.bestNetByHole[0]).toBe(4); // g1
    expect(result.bestNetByHole[1]).toBe(3); // g2
    expect(result.bestNetByHole[2]).toBe(5); // g3
    expect(result.bestNetByHole[3]).toBeUndefined();
  });

  it('labels unknown formats with the default fallback', () => {
    const match = makeMatch(1, ['p1']);
    const result = computeSessionPracticeLeaderboard({
      session: session({
        sessionType: 'custom-thing' as unknown as RyderCupSession['sessionType'],
      }),
      matches: [match],
      scores: [],
      players: [makePlayer('p1', 'Solo')],
      teeSet: teeSet(),
    });
    expect(result.formatSupported).toBe(false);
    expect(result.formatName).toBe('Stroke Play (best ball)');
  });

  it('only includes practice-mode matches for the given session', () => {
    const practiceMatch = { ...makeMatch(1, ['p1']), mode: 'practice' as const };
    const cupMatch = {
      ...makeMatch(2, ['p2']),
      mode: 'ryderCup' as const,
    };
    const otherSessionMatch = {
      ...makeMatch(3, ['p3']),
      sessionId: 'other',
      mode: 'practice' as const,
    };

    const players = [makePlayer('p1', 'A'), makePlayer('p2', 'B'), makePlayer('p3', 'C')];
    const result = computeSessionPracticeLeaderboard({
      session: session(),
      matches: [practiceMatch, cupMatch, otherSessionMatch],
      scores: [],
      players,
      teeSet: teeSet(),
    });

    expect(result.groups).toHaveLength(1);
    expect(result.groups[0]?.matchId).toBe('m1');
  });
});
