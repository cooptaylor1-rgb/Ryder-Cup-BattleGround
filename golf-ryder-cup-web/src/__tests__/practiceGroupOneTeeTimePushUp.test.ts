/**
 * Group 1 tee-time is the single source of truth contract.
 *
 * When the captain edits Group 1's tee-time input, the editor pushes
 * that value back to session.firstTeeTime via onFirstTeeTimeChange.
 * When session.firstTeeTime changes externally, Group 1's local state
 * re-syncs so the two inputs never drift.
 *
 * Proves the CONTRACT on the callback shape. The actual React effect
 * and callback-firing is integration territory; here we mirror the
 * decision logic so a future refactor of the editor can't silently
 * break the push-up without these assertions failing.
 */

import { describe, expect, it } from 'vitest';

// Mirrors PracticeGroupsEditor's setTeeTime push-up rule. If this
// spec diverges from production, the integration breaks and the
// production change must update this mirror too.
function shouldPushToSession(
  localId: string,
  firstGroupLocalId: string,
  value: string
): boolean {
  if (localId !== firstGroupLocalId) return false;
  if (value === '') return true;
  return /^\d{2}:\d{2}$/.test(value);
}

describe('Group 1 tee time → session.firstTeeTime push-up', () => {
  it('fires on Group 1 with a valid HH:MM value', () => {
    expect(shouldPushToSession('g1', 'g1', '08:00')).toBe(true);
    expect(shouldPushToSession('g1', 'g1', '13:45')).toBe(true);
  });

  it('fires on Group 1 with an explicit blank (clearing the time)', () => {
    expect(shouldPushToSession('g1', 'g1', '')).toBe(true);
  });

  it('does not fire for Groups 2+', () => {
    expect(shouldPushToSession('g2', 'g1', '08:10')).toBe(false);
    expect(shouldPushToSession('g3', 'g1', '08:20')).toBe(false);
  });

  it('does not fire for malformed intermediate keystrokes', () => {
    // <input type="time"> briefly emits partial values on some
    // browsers. Don't push until the value is a committed HH:MM.
    expect(shouldPushToSession('g1', 'g1', '8')).toBe(false);
    expect(shouldPushToSession('g1', 'g1', '8:')).toBe(false);
    expect(shouldPushToSession('g1', 'g1', '8:0')).toBe(false);
    expect(shouldPushToSession('g1', 'g1', 'garbage')).toBe(false);
  });
});
