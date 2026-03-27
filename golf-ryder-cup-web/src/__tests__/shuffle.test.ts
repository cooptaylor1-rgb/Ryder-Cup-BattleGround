import { describe, it, expect } from 'vitest';
import { shuffle } from '@/lib/utils/shuffle';

describe('shuffle', () => {
  it('returns a new array with the same elements', () => {
    const input = [1, 2, 3, 4, 5];
    const result = shuffle(input);
    expect(result).toHaveLength(input.length);
    expect(result.sort()).toEqual([...input].sort());
  });

  it('does not mutate the original array', () => {
    const input = Object.freeze([10, 20, 30, 40]);
    const result = shuffle(input);
    expect(result).toHaveLength(4);
    expect(result.sort()).toEqual([10, 20, 30, 40]);
  });

  it('returns an empty array for empty input', () => {
    expect(shuffle([])).toEqual([]);
  });

  it('returns a single-element array unchanged', () => {
    expect(shuffle([42])).toEqual([42]);
  });

  it('produces a reasonably uniform distribution (chi-squared sanity check)', () => {
    // Shuffle [0,1,2] many times and count how often each element lands in position 0.
    const n = 60_000;
    const counts = [0, 0, 0];
    for (let i = 0; i < n; i++) {
      counts[shuffle([0, 1, 2])[0]]++;
    }
    // Each element should appear ~n/3 times. Allow 10% tolerance.
    const expected = n / 3;
    for (const c of counts) {
      expect(c).toBeGreaterThan(expected * 0.9);
      expect(c).toBeLessThan(expected * 1.1);
    }
  });
});
