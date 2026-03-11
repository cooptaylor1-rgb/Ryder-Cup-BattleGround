import { describe, expect, it } from 'vitest';
import type { Player, TeeSet } from '@/lib/types/models';
import { buildMatchHandicapContext } from '@/lib/services/matchHandicapService';

function createPlayer(id: string, handicapIndex: number): Player {
  return {
    id,
    tripId: 'trip-1',
    firstName: id,
    lastName: 'Player',
    handicapIndex,
  };
}

const teeSet: TeeSet = {
  id: 'tee-1',
  courseId: 'course-1',
  name: 'Blue',
  rating: 72.5,
  slope: 125,
  par: 72,
  holeHandicaps: [7, 11, 3, 13, 9, 1, 15, 5, 17, 8, 16, 10, 4, 12, 6, 18, 2, 14],
  holePars: Array(18).fill(4),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe('matchHandicapService', () => {
  it('uses rounded handicap index fallback for singles without a tee set', () => {
    const context = buildMatchHandicapContext({
      sessionType: 'singles',
      teamAPlayers: [createPlayer('a-1', 11.4)],
      teamBPlayers: [createPlayer('b-1', 7.2)],
    });

    expect(context.teamAPlayerCourseHandicaps).toEqual([11]);
    expect(context.teamBPlayerCourseHandicaps).toEqual([7]);
    expect(context.teamAHandicapAllowance).toBe(4);
    expect(context.teamBHandicapAllowance).toBe(0);
    expect(context.teamAPlayerAllowances).toEqual([4]);
    expect(context.teamBPlayerAllowances).toEqual([0]);
  });

  it('uses tee-set course handicap math for singles when tee data exists', () => {
    const context = buildMatchHandicapContext({
      sessionType: 'singles',
      teeSet,
      teamAPlayers: [createPlayer('a-1', 10)],
      teamBPlayers: [createPlayer('b-1', 4)],
    });

    expect(context.teamAPlayerCourseHandicaps).toEqual([12]);
    expect(context.teamBPlayerCourseHandicaps).toEqual([5]);
    expect(context.teamAHandicapAllowance).toBe(7);
    expect(context.teamBHandicapAllowance).toBe(0);
  });

  it('calculates foursomes team allowance from combined course handicaps', () => {
    const context = buildMatchHandicapContext({
      sessionType: 'foursomes',
      teamAPlayers: [createPlayer('a-1', 10), createPlayer('a-2', 14)],
      teamBPlayers: [createPlayer('b-1', 8), createPlayer('b-2', 8)],
    });

    expect(context.teamAPlayerCourseHandicaps).toEqual([10, 14]);
    expect(context.teamBPlayerCourseHandicaps).toEqual([8, 8]);
    expect(context.teamAHandicapAllowance).toBe(4);
    expect(context.teamBHandicapAllowance).toBe(0);
  });

  it('calculates four-ball player allowances off the low player', () => {
    const context = buildMatchHandicapContext({
      sessionType: 'fourball',
      teamAPlayers: [createPlayer('a-1', 8), createPlayer('a-2', 12)],
      teamBPlayers: [createPlayer('b-1', 10), createPlayer('b-2', 14)],
    });

    expect(context.teamAHandicapAllowance).toBe(0);
    expect(context.teamBHandicapAllowance).toBe(0);
    expect(context.teamAPlayerAllowances).toEqual([0, 4]);
    expect(context.teamBPlayerAllowances).toEqual([2, 5]);
    expect(context.teamAPlayers.map((player) => player.strokeAllowance)).toEqual([0, 4]);
    expect(context.teamBPlayers.map((player) => player.strokeAllowance)).toEqual([2, 5]);
  });
});
