import { describe, expect, it } from 'vitest';

import {
  buildDirtyEntries,
  createInitialScores,
  getCellId,
  getDisplayedHoles,
  getNavigatedCellId,
  getRowSummary,
  parseCellId,
  validateScore,
} from '@/components/captain/dashboard/batchScoreGridModel';
import type { BatchMatch, BatchScores } from '@/components/captain/dashboard/BatchScoreGrid';

describe('batchScoreGridModel', () => {
  const matches: BatchMatch[] = [
    {
      id: 'match-one',
      matchNumber: 1,
      teamAPlayers: ['Taylor Oneill'],
      teamBPlayers: ['Shane Lowry'],
      teamAColor: '#123456',
      teamBColor: '#654321',
    },
    {
      id: 'match-two',
      matchNumber: 2,
      teamAPlayers: ['Rory McIlroy'],
      teamBPlayers: ['Scottie Scheffler'],
      teamAColor: '#123456',
      teamBColor: '#654321',
    },
  ];

  it('round-trips cell ids with hyphenated match ids', () => {
    const cellId = getCellId('match-alpha-beta', 12, 'B');
    expect(parseCellId(cellId)).toEqual({
      matchId: 'match-alpha-beta',
      hole: 12,
      team: 'B',
    });
  });

  it('validates score ranges and displayed holes', () => {
    expect(validateScore(null)).toEqual({ valid: true });
    expect(validateScore(0)).toEqual({ valid: false, message: 'Score must be at least 1' });
    expect(validateScore(16)).toEqual({ valid: false, message: 'Score seems too high' });
    expect(getDisplayedHoles(18, true, false)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(getDisplayedHoles(18, false, true)).toEqual([10, 11, 12, 13, 14, 15, 16, 17, 18]);
  });

  it('initializes visible holes without mutating caller-owned existing scores', () => {
    const existingScores: BatchScores = {
      'match-one': {
        1: { teamA: 4, teamB: 5 },
      },
    };

    const initialized = createInitialScores(matches, existingScores, [1, 2, 3]);

    expect(initialized['match-one'][1]).toEqual({ teamA: 4, teamB: 5 });
    expect(initialized['match-one'][2]).toEqual({ teamA: null, teamB: null });
    expect(initialized['match-two'][3]).toEqual({ teamA: null, teamB: null });
    expect(existingScores['match-one'][2]).toBeUndefined();
  });

  it('computes row summaries, dirty entries, and navigation consistently', () => {
    const scores = createInitialScores(matches, {}, [1, 2]);
    scores['match-one'][1] = { teamA: 4, teamB: 5 };
    scores['match-one'][2] = { teamA: 3, teamB: 3 };

    expect(getRowSummary(scores['match-one'], [1, 2])).toMatchObject({
      holesPlayed: 2,
      diff: 1,
      display: '+1',
    });

    const dirtyEntries = buildDirtyEntries(
      new Set([getCellId('match-one', 1, 'A')]),
      scores,
      new Set()
    );
    expect(dirtyEntries).toEqual([
      {
        matchId: 'match-one',
        hole: 1,
        teamAScore: 4,
        teamBScore: 5,
        isDirty: true,
        hasError: false,
      },
    ]);

    expect(getNavigatedCellId(getCellId('match-one', 1, 'A'), 'ArrowRight', matches, [1, 2])).toBe(
      getCellId('match-one', 1, 'B')
    );
    expect(getNavigatedCellId(getCellId('match-one', 2, 'B'), 'Enter', matches, [1, 2])).toBe(
      getCellId('match-two', 2, 'B')
    );
  });
});
