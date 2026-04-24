/**
 * Trip settings are stored as opaque JSONB in Supabase, so the pull
 * path cannot trust the shape. These guards are the only line of
 * defense between "what Supabase returned" and "what React
 * components read as fully typed". A bad blob dropped into Dexie
 * would blow up deep in a reducer later — much harder to diagnose
 * than an undefined settings field at load time.
 */

import { describe, expect, it } from 'vitest';

import {
  coerceHandicapSettings,
  coerceScoringSettings,
} from '@/lib/utils/tripSettingsGuards';

const goodScoring = {
  defaultFormat: 'match-play',
  allowFormatPerSession: false,
  winCondition: 'most-points',
  stablefordPoints: {
    eagle: 4,
    birdie: 3,
    par: 2,
    bogey: 1,
    doubleBogey: 0,
    worse: 0,
  },
  modifiedStablefordPoints: {
    albatross: 8,
    eagle: 5,
    birdie: 2,
    par: 0,
    bogey: -1,
    doubleBogey: -3,
    worse: -3,
  },
};

const goodHandicap = {
  allowancePercent: 100,
  maxHandicap: 36,
  useNetScoring: true,
  matchPlayAllowance: 'full',
  strokePlayAllowance: 'full',
  foursomesMethod: 'combined',
  fourballMethod: 'percentage',
  roundHandicaps: true,
};

describe('coerceScoringSettings', () => {
  it('accepts a well-shaped blob', () => {
    const result = coerceScoringSettings(goodScoring);
    expect(result).toBeDefined();
    expect(result?.defaultFormat).toBe('match-play');
    expect(result?.stablefordPoints.eagle).toBe(4);
  });

  it('rejects a bogus defaultFormat value', () => {
    expect(
      coerceScoringSettings({ ...goodScoring, defaultFormat: 'speed-golf' })
    ).toBeUndefined();
  });

  it('rejects when a stableford key is missing (partial-valid blob)', () => {
    const bad = {
      ...goodScoring,
      stablefordPoints: { eagle: 4, birdie: 3, par: 2, bogey: 1, doubleBogey: 0 },
    };
    expect(coerceScoringSettings(bad)).toBeUndefined();
  });

  it('returns undefined for arrays, primitives, and null', () => {
    expect(coerceScoringSettings(null)).toBeUndefined();
    expect(coerceScoringSettings(undefined)).toBeUndefined();
    expect(coerceScoringSettings(42)).toBeUndefined();
    expect(coerceScoringSettings([goodScoring])).toBeUndefined();
  });
});

describe('coerceHandicapSettings', () => {
  it('accepts a well-shaped blob', () => {
    const result = coerceHandicapSettings(goodHandicap);
    expect(result).toBeDefined();
    expect(result?.matchPlayAllowance).toBe('full');
    expect(result?.fourballMethod).toBe('percentage');
  });

  it('rejects unknown allowance strings instead of trusting the value', () => {
    expect(
      coerceHandicapSettings({ ...goodHandicap, matchPlayAllowance: 'quarter' })
    ).toBeUndefined();
  });

  it('rejects non-numeric allowancePercent / maxHandicap', () => {
    expect(
      coerceHandicapSettings({ ...goodHandicap, allowancePercent: '100%' })
    ).toBeUndefined();
    expect(
      coerceHandicapSettings({ ...goodHandicap, maxHandicap: NaN })
    ).toBeUndefined();
  });
});
