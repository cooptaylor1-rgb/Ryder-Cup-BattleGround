/**
 * Leaderboard math for practice rounds. Guards the gross/net totals,
 * stroke allocation, and sort order against a few concrete scenarios.
 */

import { describe, expect, it } from 'vitest';

import {
  allocateStrokes,
  computePracticeLeaderboard,
} from '../components/scoring/practice-scoring/practiceLeaderboard';
import type { Player, PracticeScore, TeeSet } from '../lib/types/models';

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

function teeSet(overrides: Partial<TeeSet> = {}): TeeSet {
  return {
    id: 't',
    courseId: 'c',
    name: 'Blue',
    rating: 72,
    slope: 113,
    par: 72,
    // 1 = hardest, 18 = easiest. Monotonic for predictable tests.
    holeHandicaps: Array.from({ length: 18 }, (_, i) => i + 1),
    holePars: Array(18).fill(4),
    createdAt: '2026-04-23T00:00:00Z',
    updatedAt: '2026-04-23T00:00:00Z',
    ...overrides,
  };
}

describe('allocateStrokes', () => {
  const handicaps = Array.from({ length: 18 }, (_, i) => i + 1);

  it('gives zero strokes when the course handicap is 0', () => {
    expect(allocateStrokes(0, handicaps)).toEqual(Array(18).fill(0));
  });

  it('gives one stroke on the hardest N holes for a non-wrapping course handicap', () => {
    const allocated = allocateStrokes(6, handicaps);
    expect(allocated.slice(0, 6)).toEqual([1, 1, 1, 1, 1, 1]);
    expect(allocated.slice(6)).toEqual(Array(12).fill(0));
  });

  it('wraps beyond 18 for high-handicap players', () => {
    const allocated = allocateStrokes(20, handicaps);
    // Everyone gets at least 1 (full round of 18); top 2 hardest get 2.
    expect(allocated[0]).toBe(2);
    expect(allocated[1]).toBe(2);
    expect(allocated[2]).toBe(1);
    expect(allocated[17]).toBe(1);
  });

  it('returns zero strokes when holeHandicaps is missing', () => {
    expect(allocateStrokes(18, [])).toEqual(Array(18).fill(0));
  });

  it('ignores negative course handicaps', () => {
    expect(allocateStrokes(-2, handicaps)).toEqual(Array(18).fill(0));
  });
});

describe('computePracticeLeaderboard', () => {
  const matchId = 'm1';
  const alice: Player = {
    id: 'alice',
    firstName: 'Alice',
    lastName: 'Ace',
    handicapIndex: 10,
  };
  const bob: Player = {
    id: 'bob',
    firstName: 'Bob',
    lastName: 'Birdie',
    handicapIndex: 20,
  };

  it('computes gross totals and holes played', () => {
    const scores: PracticeScore[] = [
      score(matchId, 'alice', 1, 5),
      score(matchId, 'alice', 2, 4),
      score(matchId, 'bob', 1, 6),
    ];

    const rows = computePracticeLeaderboard([alice, bob], scores, teeSet());

    const aliceRow = rows.find((r) => r.player.id === 'alice');
    expect(aliceRow?.grossTotal).toBe(9);
    expect(aliceRow?.holesPlayed).toBe(2);

    const bobRow = rows.find((r) => r.player.id === 'bob');
    expect(bobRow?.grossTotal).toBe(6);
    expect(bobRow?.holesPlayed).toBe(1);
  });

  it('computes net by allocating strokes against hole handicaps', () => {
    // handicapIndex 10, slope 113 → courseHandicap 10.
    // Alice gets 1 stroke on holes 1..10, 0 on 11..18.
    // Entered holes 1, 2, and 11. Net = gross - strokes =
    //   (5 - 1) + (4 - 1) + (3 - 0) = 4 + 3 + 3 = 10
    const scores: PracticeScore[] = [
      score(matchId, 'alice', 1, 5),
      score(matchId, 'alice', 2, 4),
      score(matchId, 'alice', 11, 3),
    ];
    const rows = computePracticeLeaderboard([alice], scores, teeSet());
    expect(rows[0]?.grossTotal).toBe(12);
    expect(rows[0]?.courseHandicap).toBe(10);
    expect(rows[0]?.netTotal).toBe(10);
  });

  it('returns netTotal=null when no tee set is available', () => {
    const scores = [score(matchId, 'alice', 1, 4)];
    const rows = computePracticeLeaderboard([alice], scores, null);
    expect(rows[0]?.netTotal).toBeNull();
    expect(rows[0]?.courseHandicap).toBeNull();
  });

  it('sorts by net total ascending, then gross, then id', () => {
    // Two players, same handicap, different gross. Lower net first.
    const grossOnly = computePracticeLeaderboard(
      [alice, bob],
      [score(matchId, 'alice', 1, 10), score(matchId, 'bob', 1, 4)],
      teeSet()
    );
    expect(grossOnly[0]?.player.id).toBe('bob');
    expect(grossOnly[1]?.player.id).toBe('alice');
  });

  it('pushes players with no scores to the bottom', () => {
    const rows = computePracticeLeaderboard(
      [alice, bob],
      [score(matchId, 'alice', 1, 4)],
      teeSet()
    );
    expect(rows[0]?.player.id).toBe('alice');
    expect(rows[1]?.player.id).toBe('bob');
    expect(rows[1]?.holesPlayed).toBe(0);
  });
});
