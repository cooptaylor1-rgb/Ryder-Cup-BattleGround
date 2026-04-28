'use client';

/**
 * SessionHandoffBanner
 *
 * Surfaces the "AM is done, PM lineup isn't set" gap that's easy to miss
 * during the in-between hours of a multi-session day. Captains tend to
 * close the app after the morning round wraps and forget that the
 * afternoon session still needs a published lineup. By the time
 * everyone is back from lunch, a captain is doing pairings under
 * pressure with players standing on the first tee.
 *
 * Detection rules:
 *   1. Find a "previous" session — one that is fully complete (every
 *      match in it has status='completed').
 *   2. Find a "next" session in the same trip whose status isn't
 *      'completed' AND has zero matches assigned.
 *   3. If both exist, render the banner pointing at the next session's
 *      lineup builder.
 *
 * Renders nothing when:
 *   - User isn't in captain mode (only captains can publish lineups).
 *   - There's no qualifying session pair.
 *   - The current trip is a practice round (no cup-style sessions).
 *
 * Mounted on home + standings so a captain hits it from either entry
 * point. The component is self-gating so the parent can mount it
 * unconditionally — it'll hide itself when the situation doesn't apply.
 */

import Link from 'next/link';
import { useMemo } from 'react';
import { ArrowRight, Flag } from 'lucide-react';
import { useAccessStore, useTripStore } from '@/lib/stores';
import { useShallow } from 'zustand/shallow';
import { useTripScopedMatches } from '@/lib/hooks/useTripScopedMatches';
import type { Match, RyderCupSession } from '@/lib/types/models';

interface PendingHandoff {
  previousSession: RyderCupSession;
  nextSession: RyderCupSession;
}

function findPendingHandoff(
  sessions: RyderCupSession[],
  matches: Match[]
): PendingHandoff | null {
  if (sessions.length < 2) return null;

  // Sort by date, then AM before PM, then sessionNumber as a final
  // tiebreaker. Captains tend to set sessionNumber consistently so this
  // ordering matches the schedule UI.
  const ordered = [...sessions]
    .filter((session) => !session.isPracticeSession)
    .sort((a, b) => {
      const dateA = a.scheduledDate ?? '';
      const dateB = b.scheduledDate ?? '';
      if (dateA !== dateB) return dateA.localeCompare(dateB);
      const slotA = a.timeSlot === 'AM' ? 0 : a.timeSlot === 'PM' ? 1 : 2;
      const slotB = b.timeSlot === 'AM' ? 0 : b.timeSlot === 'PM' ? 1 : 2;
      if (slotA !== slotB) return slotA - slotB;
      return (a.sessionNumber ?? 0) - (b.sessionNumber ?? 0);
    });

  const matchesBySession = new Map<string, Match[]>();
  for (const match of matches) {
    const list = matchesBySession.get(match.sessionId) ?? [];
    list.push(match);
    matchesBySession.set(match.sessionId, list);
  }

  for (let i = 0; i < ordered.length - 1; i++) {
    const previous = ordered[i];
    const next = ordered[i + 1];

    const previousMatches = matchesBySession.get(previous.id) ?? [];
    if (previousMatches.length === 0) continue;
    const previousAllComplete = previousMatches.every(
      (match) => match.status === 'completed'
    );
    if (!previousAllComplete) continue;

    const nextMatches = matchesBySession.get(next.id) ?? [];
    if (nextMatches.length > 0) continue;
    if (next.status === 'completed') continue;

    return { previousSession: previous, nextSession: next };
  }

  return null;
}

export function SessionHandoffBanner() {
  const { currentTrip } = useTripStore(useShallow((s) => ({ currentTrip: s.currentTrip })));
  const isCaptainMode = useAccessStore((s) => s.isCaptainMode);
  const tripData = useTripScopedMatches(currentTrip?.id);

  const handoff = useMemo(() => {
    if (!currentTrip || currentTrip.isPracticeRound) return null;
    if (!tripData) return null;
    return findPendingHandoff(tripData.sessions, tripData.matches);
  }, [currentTrip, tripData]);

  if (!isCaptainMode) return null;
  if (!handoff) return null;

  const { previousSession, nextSession } = handoff;

  return (
    <Link
      href={`/lineup/${nextSession.id}`}
      className="block rounded-[1.5rem] border border-[color:var(--gold)]/30 bg-[var(--gold-subtle)] px-[var(--space-5)] py-[var(--space-4)] no-underline transition-colors hover:bg-[color:var(--gold)]/14"
      aria-label={`Open lineup builder for ${nextSession.name}`}
    >
      <div className="flex items-start gap-[var(--space-3)]">
        <div className="shrink-0 rounded-full bg-[var(--gold)] p-[var(--space-2)] text-[var(--ink)]">
          <Flag size={16} strokeWidth={2} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="type-overline text-[var(--gold-deep,var(--gold))]">Lineup needed</p>
          <p className="mt-[var(--space-1)] type-title-sm text-[var(--ink)]">
            {nextSession.name} pairings haven&rsquo;t been published.
          </p>
          <p className="mt-[var(--space-1)] type-body-sm text-[var(--ink-secondary)]">
            {previousSession.name} just wrapped. Set the lineup before players head to the tee.
          </p>
        </div>
        <ArrowRight size={20} className="mt-[var(--space-1)] shrink-0 text-[var(--ink-secondary)]" />
      </div>
    </Link>
  );
}
