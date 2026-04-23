/**
 * Tee-time schedule math. The stagger rule is subtle enough that
 * a 12-singles session would print twelve tee times if
 * matchesPerTeeTime wasn't clamped; pin the logic here so any
 * future simplification can't silently regress the groupings.
 */

import { describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';

import { useTeeTimeSchedule } from '@/components/captain/lineup/useTeeTimeSchedule';

describe('useTeeTimeSchedule', () => {
  it('returns [] when no first tee time is set', () => {
    const { result } = renderHook(() =>
      useTeeTimeSchedule({
        firstTeeTime: '',
        teeTimeInterval: 10,
        matchCount: 4,
        playersPerTeam: 2,
      })
    );
    expect(result.current).toEqual([]);
  });

  it('emits one tee time per match for team formats (foursomes, fourball)', () => {
    const { result } = renderHook(() =>
      useTeeTimeSchedule({
        firstTeeTime: '08:00',
        teeTimeInterval: 10,
        matchCount: 4,
        // fourball / foursomes = 2 players per team
        playersPerTeam: 2,
      })
    );
    expect(result.current).toEqual(['08:00', '08:10', '08:20', '08:30']);
  });

  it('groups singles matches two-per-tee-time (4 players per foursome)', () => {
    const { result } = renderHook(() =>
      useTeeTimeSchedule({
        firstTeeTime: '08:00',
        teeTimeInterval: 10,
        matchCount: 6,
        // singles = 1 player per team → 2 matches share one tee time
        playersPerTeam: 1,
      })
    );
    // 6 singles should produce 3 distinct tee times each used twice.
    expect(result.current).toEqual([
      '08:00',
      '08:00',
      '08:10',
      '08:10',
      '08:20',
      '08:20',
    ]);
  });

  it('respects an odd tee-time interval', () => {
    const { result } = renderHook(() =>
      useTeeTimeSchedule({
        firstTeeTime: '07:15',
        teeTimeInterval: 12,
        matchCount: 3,
        playersPerTeam: 2,
      })
    );
    expect(result.current).toEqual(['07:15', '07:27', '07:39']);
  });

  it('rolls over the hour when the schedule pushes past :59', () => {
    const { result } = renderHook(() =>
      useTeeTimeSchedule({
        firstTeeTime: '07:50',
        teeTimeInterval: 10,
        matchCount: 3,
        playersPerTeam: 2,
      })
    );
    expect(result.current).toEqual(['07:50', '08:00', '08:10']);
  });
});
