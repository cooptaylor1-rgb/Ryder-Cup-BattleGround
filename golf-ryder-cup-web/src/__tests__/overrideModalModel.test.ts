import { describe, expect, it } from 'vitest';

import {
  computeNewMatchScore,
  getOriginalHoleScore,
} from '@/components/captain/dashboard/overrideModalModel';
import type { MatchScore } from '@/components/captain/dashboard/OverrideModal';
import { canSubmitOverride } from '@/components/captain/dashboard/overrideModalValidation';

const MATCH_SCORE: MatchScore = {
  matchId: 'match-1',
  matchNumber: 1,
  teamAPlayers: ['a1'],
  teamBPlayers: ['b1'],
  teamAColor: '#123456',
  teamBColor: '#654321',
  teamAName: 'USA',
  teamBName: 'Europe',
  currentMatchScore: 0,
  currentHolesPlayed: 3,
  holeScores: [
    { hole: 1, teamAScore: 4, teamBScore: 5, winner: 'teamA' },
    { hole: 2, teamAScore: 5, teamBScore: 4, winner: 'teamB' },
    { hole: 3, teamAScore: 4, teamBScore: 4, winner: 'halved' },
  ],
  auditHistory: [],
};

describe('overrideModalModel', () => {
  it('returns the original score for the selected hole', () => {
    expect(getOriginalHoleScore(MATCH_SCORE, 2)).toEqual(MATCH_SCORE.holeScores[1]);
    expect(getOriginalHoleScore(MATCH_SCORE, 9)).toBeNull();
    expect(getOriginalHoleScore(MATCH_SCORE, null)).toBeNull();
  });

  it('recomputes the match score from edited hole values', () => {
    expect(computeNewMatchScore(MATCH_SCORE.holeScores, {})).toBe(0);

    expect(
      computeNewMatchScore(MATCH_SCORE.holeScores, {
        3: { teamA: 3, teamB: 4 },
      })
    ).toBe(1);

    expect(
      computeNewMatchScore(MATCH_SCORE.holeScores, {
        1: { teamA: 6, teamB: 4 },
      })
    ).toBe(-2);
  });

  it('requires notes only for the other reason path', () => {
    expect(
      canSubmitOverride({
        selectedHole: 4,
        reason: 'scoring_error',
        notes: '',
      })
    ).toBe(true);

    expect(
      canSubmitOverride({
        selectedHole: 4,
        reason: 'other',
        notes: '',
      })
    ).toBe(false);

    expect(
      canSubmitOverride({
        selectedHole: 4,
        reason: 'other',
        notes: 'Captain confirmed with both teams',
      })
    ).toBe(true);
  });
});
