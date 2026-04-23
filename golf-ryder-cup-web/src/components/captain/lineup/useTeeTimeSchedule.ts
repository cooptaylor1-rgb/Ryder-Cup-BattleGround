'use client';

import { useMemo } from 'react';

/**
 * Computes the per-match tee time stagger for a lineup based on the
 * first tee time and match count. Real golf groups four players per
 * tee time:
 *
 *   * Singles (1 per team, two head-to-head per group of four) → 2
 *     matches share one tee time.
 *   * Team formats (foursomes, fourball, pinehurst, …) → 1 match
 *     per tee time.
 *   * Everything else defaults to one-per-tee-time.
 *
 * Without this grouping, a 12-singles session would print twelve
 * separate tee times when the course only needs six.
 *
 * Pure hook — no store reads, no Dexie, no router. Extracted from
 * NewLineupPageClient so it can be unit tested and reused by any
 * other lineup flow that builds its own schedule.
 */
export function useTeeTimeSchedule(options: {
  firstTeeTime: string;
  teeTimeInterval: number;
  matchCount: number;
  playersPerTeam: number;
}): string[] {
  const { firstTeeTime, teeTimeInterval, matchCount, playersPerTeam } = options;
  return useMemo(() => {
    if (!firstTeeTime) return [];

    const [hours, minutes] = firstTeeTime.split(':').map(Number);
    const baseTime = new Date();
    baseTime.setHours(hours, minutes, 0, 0);

    const playersPerMatch = Math.max(2, playersPerTeam * 2);
    const matchesPerTeeTime = Math.max(1, Math.floor(4 / playersPerMatch));

    return Array.from({ length: matchCount }, (_, index) => {
      const teeTimeIndex = Math.floor(index / matchesPerTeeTime);
      const matchTime = new Date(
        baseTime.getTime() + teeTimeIndex * teeTimeInterval * 60 * 1000
      );
      return matchTime.toTimeString().slice(0, 5);
    });
  }, [firstTeeTime, teeTimeInterval, matchCount, playersPerTeam]);
}
