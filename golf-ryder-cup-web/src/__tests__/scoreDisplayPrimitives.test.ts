import { describe, expect, it } from 'vitest';

import {
  formatScoreToPar,
  scoreToParToneClass,
} from '../components/scoring/scoreDisplayPrimitives';

describe('score display primitives', () => {
  it('formats score-to-par values consistently', () => {
    expect(formatScoreToPar(undefined)).toBe('—');
    expect(formatScoreToPar(null)).toBe('—');
    expect(formatScoreToPar(0)).toBe('E');
    expect(formatScoreToPar(1)).toBe('+1');
    expect(formatScoreToPar(5)).toBe('+5');
    expect(formatScoreToPar(-1)).toBe('-1');
    expect(formatScoreToPar(-5)).toBe('-5');
  });

  it('returns stable tone classes for score-to-par states', () => {
    expect(scoreToParToneClass(undefined)).toContain('ink-tertiary');
    expect(scoreToParToneClass(-1)).toContain('success');
    expect(scoreToParToneClass(0)).toContain('masters');
    expect(scoreToParToneClass(1)).toContain('warning');
    expect(scoreToParToneClass(2)).toContain('error');
  });
});
