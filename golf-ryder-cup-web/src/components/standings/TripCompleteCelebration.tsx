'use client';

/**
 * Trip-complete celebration. Two surfaces in one component:
 *
 *   1. Persistent "Trip Complete" banner. Renders whenever the trip is
 *      finished — every time a captain reopens standings post-event,
 *      they see a clear, concise summary at the top with a one-tap
 *      handoff to the recap / share card. Renders nothing until the
 *      trip is actually complete.
 *
 *   2. One-shot full-screen celebration overlay. Fires the FIRST time
 *      a given device sees the trip in a complete state. Gated by
 *      localStorage so reloading the page or coming back tomorrow does
 *      NOT re-trigger the moment — every captain on every device
 *      should still get the moment exactly once. Tapping anywhere
 *      dismisses it; it also auto-dismisses after a few seconds so a
 *      captain who opens standings, sees the win, then locks their
 *      phone isn't holding the screen captive on the next captain's
 *      device.
 *
 * The celebration is intentionally simple — animated copy + a couple
 * of CSS confetti pieces — to keep the bundle small and to avoid yet
 * another third-party animation dep on a screen captains hit on a
 * potentially flaky course connection.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PartyPopper, Share2, Trophy } from 'lucide-react';

interface TripCompleteCelebrationProps {
  /** When false, the component renders nothing — caller does the gating. */
  isComplete: boolean;
  /** Stable trip id, used as the localStorage key. */
  tripId: string;
  /** Display name of the trip — shown in both the banner and overlay. */
  tripName: string;
  /** Display name of the cup-winning team, or null when the trip ended tied. */
  winningTeamName: string | null;
  /** Final score string like "15.5–12.5" for the banner. */
  finalScoreLine?: string;
}

const STORAGE_PREFIX = 'tripCelebrated:';
const AUTO_DISMISS_MS = 6500;

function hasCelebrated(tripId: string): boolean {
  if (typeof window === 'undefined') return true;
  try {
    return window.localStorage.getItem(STORAGE_PREFIX + tripId) === '1';
  } catch {
    // Some browsers throw on localStorage access in private mode.
    // Treat that as "already celebrated" so we never re-trigger; the
    // banner still renders for those users.
    return true;
  }
}

function markCelebrated(tripId: string) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_PREFIX + tripId, '1');
  } catch {
    // ignore — see hasCelebrated
  }
}

export function TripCompleteCelebration({
  isComplete,
  tripId,
  tripName,
  winningTeamName,
  finalScoreLine,
}: TripCompleteCelebrationProps) {
  const [showOverlay, setShowOverlay] = useState(false);

  useEffect(() => {
    // We deliberately drive `showOverlay` from prop changes here:
    // the overlay should only ever appear in response to the trip
    // transitioning from "in progress" to "complete," not from any
    // other React state. Suppress the lint rule for these two
    // intentional setState-in-effect calls.
    /* eslint-disable react-hooks/set-state-in-effect */
    if (!isComplete) {
      setShowOverlay(false);
      return;
    }
    if (hasCelebrated(tripId)) return;

    setShowOverlay(true);
    markCelebrated(tripId);

    const t = window.setTimeout(() => setShowOverlay(false), AUTO_DISMISS_MS);
    return () => window.clearTimeout(t);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [isComplete, tripId]);

  if (!isComplete) return null;

  const headline = winningTeamName ? `${winningTeamName} wins` : 'Cup Tied';

  return (
    <>
      <div className="rounded-[1.5rem] border-2 border-[var(--masters)] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--masters)_12%,white)_0%,color-mix(in_srgb,var(--gold)_18%,white)_100%)] px-[var(--space-5)] py-[var(--space-4)] shadow-[0_18px_36px_rgba(36,82,52,0.12)]">
        <div className="flex items-start gap-[var(--space-3)]">
          <div className="shrink-0 rounded-full bg-[var(--masters)] p-[var(--space-2)] text-[var(--canvas)]">
            <Trophy size={18} strokeWidth={2} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="type-overline text-[var(--masters-deep)]">Trip Complete</p>
            <h2 className="mt-[var(--space-1)] font-serif text-[clamp(1.4rem,3.6vw,1.9rem)] italic leading-tight text-[var(--ink)]">
              {headline}
              {finalScoreLine ? (
                <span className="ml-2 text-[var(--ink-secondary)]">· {finalScoreLine}</span>
              ) : null}
            </h2>
            <p className="mt-[var(--space-1)] type-body-sm text-[var(--ink-secondary)]">
              The book is closed on {tripName}. Share the recap with the group.
            </p>
          </div>
          <Link
            href="/recap"
            className="shrink-0 inline-flex items-center gap-[var(--space-2)] rounded-full bg-[var(--masters)] px-[var(--space-4)] py-[var(--space-2)] text-sm font-semibold text-[var(--canvas)] press-scale no-underline"
          >
            <Share2 size={14} />
            <span className="hidden sm:inline">Recap</span>
          </Link>
        </div>
      </div>

      {showOverlay && (
        <button
          type="button"
          onClick={() => setShowOverlay(false)}
          aria-label="Dismiss celebration"
          className="trip-complete-overlay fixed inset-0 z-[100] flex items-center justify-center bg-[color:var(--ink)]/70 px-[var(--space-5)] backdrop-blur-md"
        >
          <div className="trip-complete-overlay-card relative w-full max-w-[480px] overflow-hidden rounded-[2rem] border border-[var(--rule)] bg-[var(--canvas-raised)] px-[var(--space-6)] py-[var(--space-7)] text-center shadow-[0_30px_60px_rgba(26,24,21,0.25)]">
            <div className="trip-complete-confetti" aria-hidden>
              <span />
              <span />
              <span />
              <span />
              <span />
              <span />
              <span />
              <span />
              <span />
              <span />
              <span />
              <span />
            </div>
            <div className="relative">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[var(--masters)] text-[var(--canvas)]">
                <PartyPopper size={26} strokeWidth={1.75} />
              </div>
              <p className="mt-[var(--space-4)] type-overline text-[var(--masters-deep)]">
                Trip Complete
              </p>
              <h2 className="mt-[var(--space-2)] font-serif text-[clamp(1.9rem,5vw,2.4rem)] italic leading-tight text-[var(--ink)]">
                {headline}
              </h2>
              {finalScoreLine ? (
                <p className="mt-[var(--space-2)] font-serif text-[1.5rem] italic text-[var(--ink-secondary)]">
                  {finalScoreLine}
                </p>
              ) : null}
              <p className="mt-[var(--space-3)] type-body text-[var(--ink-secondary)]">
                {tripName} is in the books.
              </p>
              <p className="mt-[var(--space-5)] type-caption text-[var(--ink-tertiary)]">
                Tap anywhere to dismiss
              </p>
            </div>
          </div>
        </button>
      )}
    </>
  );
}
