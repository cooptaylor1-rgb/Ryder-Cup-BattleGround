/**
 * Tests for the app motion system.
 *
 * Verifies that the tokens are internally consistent and that the
 * reduced-motion fallback works correctly. The goal isn't to test
 * framer-motion itself — it's to lock in the API contract so a
 * refactor can't silently break "all animations now play even when
 * the user asked for reduced motion".
 */

import { describe, it, expect, vi } from 'vitest';
import { springs, eases, durations } from '@/lib/motion/appMotion';

// Mock framer-motion's useReducedMotion so we can test both branches.
vi.mock('framer-motion', async () => {
  const actual = await vi.importActual<typeof import('framer-motion')>('framer-motion');
  return {
    ...actual,
    useReducedMotion: vi.fn(),
  };
});

import { useReducedMotion } from 'framer-motion';
import { renderHook } from '@testing-library/react';
import { useAppMotion } from '@/lib/motion/appMotion';

describe('motion tokens', () => {
  it('all springs declare spring type', () => {
    for (const [name, value] of Object.entries(springs)) {
      expect(value.type, `spring "${name}"`).toBe('spring');
    }
  });

  it('all eases declare tween type with finite duration', () => {
    for (const [name, value] of Object.entries(eases)) {
      expect(value.type, `ease "${name}"`).toBe('tween');
      expect(value.duration, `ease "${name}" duration`).toBeGreaterThanOrEqual(0);
    }
  });

  it('durations are positive integers', () => {
    for (const [name, value] of Object.entries(durations)) {
      expect(Number.isInteger(value), `duration "${name}" is integer`).toBe(true);
      expect(value, `duration "${name}" is positive`).toBeGreaterThan(0);
    }
  });

  it('exit ease is shorter than enter ease', () => {
    // Exits feel faster than entries — this is a hard design rule.
    expect(eases.exit.duration).toBeLessThan(eases.enter.duration);
  });
});

describe('useAppMotion', () => {
  const mockedUseReducedMotion = useReducedMotion as unknown as ReturnType<typeof vi.fn>;

  it('returns real spring tokens when reduced motion is OFF', () => {
    mockedUseReducedMotion.mockReturnValue(false);
    const { result } = renderHook(() => useAppMotion());

    expect(result.current.reduced).toBe(false);
    expect(result.current.spring('snappy')).toEqual(springs.snappy);
    expect(result.current.ease('enter')).toEqual(eases.enter);
    expect(result.current.duration('base')).toBe(durations.base);
  });

  it('collapses everything to instant when reduced motion is ON', () => {
    mockedUseReducedMotion.mockReturnValue(true);
    const { result } = renderHook(() => useAppMotion());

    expect(result.current.reduced).toBe(true);
    expect(result.current.spring('snappy')).toEqual(eases.instant);
    expect(result.current.ease('enter')).toEqual(eases.instant);
    expect(result.current.ease('emphatic')).toEqual(eases.instant);
    expect(result.current.duration('base')).toBe(0);
    expect(result.current.duration('emphatic')).toBe(0);
  });

  it('handles the null case from framer-motion (useReducedMotion returns null on SSR)', () => {
    mockedUseReducedMotion.mockReturnValue(null);
    const { result } = renderHook(() => useAppMotion());
    expect(result.current.reduced).toBe(false);
    expect(result.current.spring('standard')).toEqual(springs.standard);
  });
});
