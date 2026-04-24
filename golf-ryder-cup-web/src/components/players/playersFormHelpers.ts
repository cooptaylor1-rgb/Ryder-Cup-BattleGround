/**
 * Pure helpers used by PlayersPageClient's form flows. Extracted so
 * the main file stays focused on orchestration (router, store wiring,
 * sync queue, permission checks) rather than carrying bulk-row
 * factories and USGA-bounded validators inline. Nothing here imports
 * React or touches stores — safe to use from tests or other pages.
 */

import type { Player } from '@/lib/types/models';

export interface BulkPlayerRow {
  id: string;
  firstName: string;
  lastName: string;
  handicapIndex: string;
  teamId: string;
}

export function createEmptyRow(): BulkPlayerRow {
  return {
    id: crypto.randomUUID(),
    firstName: '',
    lastName: '',
    handicapIndex: '',
    teamId: '',
  };
}

/**
 * USGA handicap index range is -10 to 54 (plus handicaps are negative).
 * Blanks return false so the caller can treat "not filled in" and
 * "invalid" the same way at the UI layer — the roster import row is
 * already ignored when firstName/lastName are both empty, so an
 * empty handicap on a blank row never triggers this path.
 */
export function isValidHandicapIndex(value: string) {
  const handicap = parseFloat(value);
  return !Number.isNaN(handicap) && handicap >= -10 && handicap <= 54;
}

/** Minimal RFC-5322-adjacent check that accepts the emails captains
 * actually type on mobile. Doesn't attempt full RFC compliance;
 * rejects whitespace and requires a dot-containing host. */
export function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function getHandicapValue(player: Player, fallback: number) {
  return player.handicapIndex ?? fallback;
}
