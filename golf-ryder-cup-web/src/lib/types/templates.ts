/**
 * Trip Templates - Types and Data
 *
 * This module contains:
 * 1. The new templates system types (TripTemplate, TemplateConfig, etc.)
 *    for the Phase 5.1 template picker and persistence layer.
 * 2. Legacy template types and data preserved for backward compatibility
 *    with the existing trip creation flow and tests.
 */

import type { UUID, ISODateString, SessionType, TeamMode } from './models';

// ============================================
// NEW TEMPLATE SYSTEM (Phase 5.1)
// ============================================

/**
 * A single session within a template configuration.
 * Describes one block of play (e.g., "Friday AM Foursomes").
 */
export interface TemplateSession {
  name: string;
  sessionType: SessionType;
  matchCount: number;
  timeSlot?: 'AM' | 'PM';
  /** Day offset from trip start: 0 = first day, 1 = second day, etc. */
  dayOffset: number;
}

/**
 * The configuration payload stored inside a template.
 * Contains everything needed to scaffold sessions and settings.
 */
export interface TemplateConfig {
  teamMode: TeamMode;
  teamAName: string;
  teamBName: string;
  /** Session structure */
  sessions: TemplateSession[];
  /** Default points needed to win */
  pointsToWin?: number;
  /** Total number of matches across all sessions */
  totalMatches?: number;
}

/**
 * A complete trip template (Phase 5.1).
 * Can be a built-in preset or a user-saved custom template.
 * Stored in the Dexie tripTemplates table.
 */
export interface TripTemplate {
  id: UUID;
  name: string;
  description?: string;
  /** Is this a built-in template shipped with the app? */
  isBuiltin: boolean;
  /** Template configuration */
  config: TemplateConfig;
  /** Number of times this template has been used */
  useCount: number;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

/**
 * Calculate total matches from a template config
 */
export function calculateTemplateTotalMatches(config: TemplateConfig): number {
  return config.sessions.reduce((total, session) => total + session.matchCount, 0);
}

/**
 * Calculate the number of days a template spans
 */
export function calculateTemplateDays(config: TemplateConfig): number {
  if (config.sessions.length === 0) return 1;
  const maxOffset = Math.max(...config.sessions.map((s) => s.dayOffset));
  return maxOffset + 1;
}

// ============================================
// LEGACY TEMPLATE TYPES (backward compatibility)
// ============================================

/**
 * Legacy template session configuration.
 * Used by the existing TripTemplatePicker and trip creation flow.
 */
export interface LegacyTemplateSession {
  dayOffset: number;
  timeSlot: 'AM' | 'PM';
  sessionType: SessionType;
  matchCount: number;
  name?: string;
}

/**
 * Legacy trip template definition.
 * Used by the existing TripTemplatePicker and tripTemplateService.
 * @deprecated Use TripTemplate from Phase 5.1 instead.
 */
export interface LegacyTripTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  days: number;
  sessions: LegacyTemplateSession[];
  defaultPointsToWin: number;
  playersPerTeam: number;
  features: string[];
}

/**
 * Pre-defined trip templates (legacy format).
 * @deprecated Use BUILTIN_TEMPLATES from builtinTemplates.ts instead.
 */
export const TRIP_TEMPLATES: LegacyTripTemplate[] = [
  {
    id: 'classic-ryder-cup',
    name: 'Classic Ryder Cup',
    description: '3-day tournament with foursomes, fourball, and singles. The full experience.',
    icon: '\u{1F3C6}',
    days: 3,
    playersPerTeam: 6,
    defaultPointsToWin: 14.5,
    features: ['6 sessions', '28 total points', 'Full Ryder Cup format'],
    sessions: [
      { dayOffset: 0, timeSlot: 'AM', sessionType: 'foursomes', matchCount: 4, name: 'Friday AM Foursomes' },
      { dayOffset: 0, timeSlot: 'PM', sessionType: 'fourball', matchCount: 4, name: 'Friday PM Fourball' },
      { dayOffset: 1, timeSlot: 'AM', sessionType: 'foursomes', matchCount: 4, name: 'Saturday AM Foursomes' },
      { dayOffset: 1, timeSlot: 'PM', sessionType: 'fourball', matchCount: 4, name: 'Saturday PM Fourball' },
      { dayOffset: 2, timeSlot: 'AM', sessionType: 'singles', matchCount: 12, name: 'Sunday Singles' },
    ],
  },
  {
    id: 'weekend-warrior',
    name: 'Weekend Warrior',
    description: '2-day tournament perfect for a weekend getaway. Fast and furious.',
    icon: '\u{26A1}',
    days: 2,
    playersPerTeam: 4,
    defaultPointsToWin: 9.5,
    features: ['4 sessions', '18 total points', 'Compact format'],
    sessions: [
      { dayOffset: 0, timeSlot: 'AM', sessionType: 'fourball', matchCount: 2, name: 'Saturday AM Fourball' },
      { dayOffset: 0, timeSlot: 'PM', sessionType: 'foursomes', matchCount: 2, name: 'Saturday PM Foursomes' },
      { dayOffset: 1, timeSlot: 'AM', sessionType: 'fourball', matchCount: 2, name: 'Sunday AM Fourball' },
      { dayOffset: 1, timeSlot: 'PM', sessionType: 'singles', matchCount: 8, name: 'Sunday Singles' },
    ],
  },
  {
    id: 'singles-showdown',
    name: 'Singles Showdown',
    description: 'One day of head-to-head matches. Pure 1v1 competition.',
    icon: '\u{1F3AF}',
    days: 1,
    playersPerTeam: 6,
    defaultPointsToWin: 6.5,
    features: ['2 sessions', '12 total points', 'All singles'],
    sessions: [
      { dayOffset: 0, timeSlot: 'AM', sessionType: 'singles', matchCount: 6, name: 'Morning Singles' },
      { dayOffset: 0, timeSlot: 'PM', sessionType: 'singles', matchCount: 6, name: 'Afternoon Singles' },
    ],
  },
  {
    id: 'partners-paradise',
    name: 'Partners Paradise',
    description: 'Team format only - foursomes and fourball. Great for partner chemistry.',
    icon: '\u{1F91D}',
    days: 2,
    playersPerTeam: 4,
    defaultPointsToWin: 8.5,
    features: ['4 sessions', '16 total points', 'No singles'],
    sessions: [
      { dayOffset: 0, timeSlot: 'AM', sessionType: 'fourball', matchCount: 2, name: 'Day 1 AM Fourball' },
      { dayOffset: 0, timeSlot: 'PM', sessionType: 'foursomes', matchCount: 2, name: 'Day 1 PM Foursomes' },
      { dayOffset: 1, timeSlot: 'AM', sessionType: 'foursomes', matchCount: 2, name: 'Day 2 AM Foursomes' },
      { dayOffset: 1, timeSlot: 'PM', sessionType: 'fourball', matchCount: 2, name: 'Day 2 PM Fourball' },
    ],
  },
  {
    id: '9-hole-popup',
    name: '9-Hole Pop-Up',
    description: 'Quick 9-hole format. Perfect for after work or limited time.',
    icon: '\u{1F305}',
    days: 1,
    playersPerTeam: 4,
    defaultPointsToWin: 4.5,
    features: ['2 sessions', '8 total points', 'Quick play'],
    sessions: [
      { dayOffset: 0, timeSlot: 'AM', sessionType: 'fourball', matchCount: 2, name: 'Fourball' },
      { dayOffset: 0, timeSlot: 'PM', sessionType: 'singles', matchCount: 4, name: 'Singles' },
    ],
  },
  {
    id: 'custom',
    name: 'Custom Setup',
    description: 'Start from scratch and build your own format.',
    icon: '\u{270F}\u{FE0F}',
    days: 1,
    playersPerTeam: 4,
    defaultPointsToWin: 14.5,
    features: ['Fully customizable', 'Add sessions manually'],
    sessions: [],
  },
];

/**
 * Get a legacy template by ID
 * @deprecated Use getTemplate from templateService instead.
 */
export function getTemplateById(id: string): LegacyTripTemplate | undefined {
  return TRIP_TEMPLATES.find((t) => t.id === id);
}

/**
 * Calculate total points available in a legacy template
 * @deprecated Use calculateTemplateTotalMatches instead.
 */
export function calculateTemplatePoints(template: LegacyTripTemplate): number {
  return template.sessions.reduce((total, session) => total + session.matchCount, 0);
}
