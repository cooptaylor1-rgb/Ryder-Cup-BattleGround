/**
 * Built-in Trip Templates
 *
 * Pre-configured tournament formats shipped with the app.
 * These cannot be deleted by users. Each uses a deterministic ID
 * so they are stable across app restarts.
 */

import type { TripTemplate } from '@/lib/types/templates';

const now = new Date().toISOString();

/**
 * Classic Ryder Cup - 3 days
 *
 * The authentic format: Day 1 and 2 feature morning foursomes and
 * afternoon fourball, with Day 3 devoted to 12 singles matches.
 * 28 total points, 14.5 to win.
 */
const classicRyderCup: TripTemplate = {
  id: 'template-classic-ryder-cup',
  name: 'Classic Ryder Cup',
  description:
    '3-day tournament with foursomes, fourball, and singles. The full Ryder Cup experience.',
  isBuiltin: true,
  useCount: 0,
  createdAt: now,
  updatedAt: now,
  config: {
    teamMode: 'ryderCup',
    teamAName: 'USA',
    teamBName: 'Europe',
    pointsToWin: 14.5,
    totalMatches: 28,
    sessions: [
      {
        name: 'Friday AM Foursomes',
        sessionType: 'foursomes',
        matchCount: 4,
        timeSlot: 'AM',
        dayOffset: 0,
      },
      {
        name: 'Friday PM Fourball',
        sessionType: 'fourball',
        matchCount: 4,
        timeSlot: 'PM',
        dayOffset: 0,
      },
      {
        name: 'Saturday AM Foursomes',
        sessionType: 'foursomes',
        matchCount: 4,
        timeSlot: 'AM',
        dayOffset: 1,
      },
      {
        name: 'Saturday PM Fourball',
        sessionType: 'fourball',
        matchCount: 4,
        timeSlot: 'PM',
        dayOffset: 1,
      },
      {
        name: 'Sunday Singles',
        sessionType: 'singles',
        matchCount: 12,
        timeSlot: 'AM',
        dayOffset: 2,
      },
    ],
  },
};

/**
 * Mini Ryder Cup - Weekend (2 days)
 *
 * A condensed format ideal for a weekend outing: fourball and
 * foursomes on Day 1, then singles to close it out on Day 2.
 * 12 total points, 7.5 to win.
 */
const miniRyderCup: TripTemplate = {
  id: 'template-mini-ryder-cup',
  name: 'Mini Ryder Cup',
  description: 'Weekend tournament with fourball, foursomes, and singles. Compact and competitive.',
  isBuiltin: true,
  useCount: 0,
  createdAt: now,
  updatedAt: now,
  config: {
    teamMode: 'ryderCup',
    teamAName: 'USA',
    teamBName: 'Europe',
    pointsToWin: 7.5,
    totalMatches: 12,
    sessions: [
      {
        name: 'Saturday AM Fourball',
        sessionType: 'fourball',
        matchCount: 3,
        timeSlot: 'AM',
        dayOffset: 0,
      },
      {
        name: 'Saturday PM Foursomes',
        sessionType: 'foursomes',
        matchCount: 3,
        timeSlot: 'PM',
        dayOffset: 0,
      },
      {
        name: 'Sunday Singles',
        sessionType: 'singles',
        matchCount: 6,
        timeSlot: 'AM',
        dayOffset: 1,
      },
    ],
  },
};

/**
 * Buddies Cup - 1 Day
 *
 * A quick single-day format for a group of friends:
 * morning fourball followed by afternoon singles.
 * 6 total points, 4 to win.
 */
const buddiesCup: TripTemplate = {
  id: 'template-buddies-cup',
  name: 'Buddies Cup',
  description: 'Single-day battle with morning fourball and afternoon singles. Quick and fun.',
  isBuiltin: true,
  useCount: 0,
  createdAt: now,
  updatedAt: now,
  config: {
    teamMode: 'ryderCup',
    teamAName: 'Team A',
    teamBName: 'Team B',
    pointsToWin: 4,
    totalMatches: 6,
    sessions: [
      {
        name: 'AM Fourball',
        sessionType: 'fourball',
        matchCount: 2,
        timeSlot: 'AM',
        dayOffset: 0,
      },
      {
        name: 'PM Singles',
        sessionType: 'singles',
        matchCount: 4,
        timeSlot: 'PM',
        dayOffset: 0,
      },
    ],
  },
};

/**
 * Presidents Cup - 3 days
 *
 * The Presidents Cup format with 5 matches per team session
 * across two days and 12 singles on the final day.
 * 32 total points, 16.5 to win.
 */
const presidentsCup: TripTemplate = {
  id: 'template-presidents-cup',
  name: 'Presidents Cup',
  description:
    '3-day international format with 5-match team sessions and 12 singles. 32 total points.',
  isBuiltin: true,
  useCount: 0,
  createdAt: now,
  updatedAt: now,
  config: {
    teamMode: 'ryderCup',
    teamAName: 'USA',
    teamBName: 'International',
    pointsToWin: 16.5,
    totalMatches: 32,
    sessions: [
      {
        name: 'Day 1 AM Foursomes',
        sessionType: 'foursomes',
        matchCount: 5,
        timeSlot: 'AM',
        dayOffset: 0,
      },
      {
        name: 'Day 1 PM Fourball',
        sessionType: 'fourball',
        matchCount: 5,
        timeSlot: 'PM',
        dayOffset: 0,
      },
      {
        name: 'Day 2 AM Fourball',
        sessionType: 'fourball',
        matchCount: 5,
        timeSlot: 'AM',
        dayOffset: 1,
      },
      {
        name: 'Day 2 PM Foursomes',
        sessionType: 'foursomes',
        matchCount: 5,
        timeSlot: 'PM',
        dayOffset: 1,
      },
      {
        name: 'Day 3 Singles',
        sessionType: 'singles',
        matchCount: 12,
        timeSlot: 'AM',
        dayOffset: 2,
      },
    ],
  },
};

/**
 * All built-in templates, exported as a readonly array.
 */
export const BUILTIN_TEMPLATES: readonly TripTemplate[] = [
  classicRyderCup,
  miniRyderCup,
  buddiesCup,
  presidentsCup,
];

/**
 * Get a built-in template by ID
 */
export function getBuiltinTemplate(id: string): TripTemplate | undefined {
  return BUILTIN_TEMPLATES.find((t) => t.id === id);
}
