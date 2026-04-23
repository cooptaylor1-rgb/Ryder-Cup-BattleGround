/**
 * Auto-stagger filling for practice group tee times.
 */

import { describe, expect, it } from 'vitest';

import {
  applyAutoStagger,
  staggerTeeTime,
} from '../components/captain/lineup/PracticeGroupsEditor';
import type { PracticeGroupDraft } from '../lib/services/lineup-builder/practiceLineupPersistence';

function group(n: number, teeTime = ''): PracticeGroupDraft {
  return {
    localId: `g-${n}`,
    groupNumber: n,
    playerIds: ['a', 'b'],
    teeTime,
  };
}

describe('staggerTeeTime', () => {
  it('adds offsetMinutes and pads HH/MM', () => {
    expect(staggerTeeTime('08:00', 10)).toBe('08:10');
    expect(staggerTeeTime('08:00', 30)).toBe('08:30');
    expect(staggerTeeTime('08:55', 10)).toBe('09:05');
    expect(staggerTeeTime('23:50', 10)).toBe('23:59'); // clamp, not wrap
  });

  it('returns empty for malformed input instead of "NaN:NaN"', () => {
    expect(staggerTeeTime('', 10)).toBe('');
    expect(staggerTeeTime('8:00', 10)).toBe('');
    expect(staggerTeeTime('not-a-time', 10)).toBe('');
  });
});

describe('applyAutoStagger', () => {
  it('fills blanks from Group 1 with a 10-minute interval', () => {
    const groups = [group(1, '08:00'), group(2), group(3)];
    const filled = applyAutoStagger(groups);
    expect(filled[0]?.teeTime).toBe('08:00');
    expect(filled[1]?.teeTime).toBe('08:10');
    expect(filled[2]?.teeTime).toBe('08:20');
  });

  it('leaves existing tee times untouched', () => {
    const groups = [group(1, '08:00'), group(2, '09:30'), group(3)];
    const filled = applyAutoStagger(groups);
    expect(filled[0]?.teeTime).toBe('08:00');
    expect(filled[1]?.teeTime).toBe('09:30');
    // Stagger is anchored on Group 1, so Group 3 is 08:00 + 2*10 = 08:20
    expect(filled[2]?.teeTime).toBe('08:20');
  });

  it('no-ops when no group has a tee time set', () => {
    const groups = [group(1), group(2)];
    const filled = applyAutoStagger(groups);
    expect(filled).toEqual(groups);
  });

  it('supports a custom stagger interval', () => {
    const filled = applyAutoStagger([group(1, '07:30'), group(2), group(3)], 8);
    expect(filled[1]?.teeTime).toBe('07:38');
    expect(filled[2]?.teeTime).toBe('07:46');
  });
});
