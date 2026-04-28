'use client';

/**
 * EventDayPreFlightBanner
 *
 * Surfaces the captain pre-flight check on the home page when a
 * session starts today and setup isn't complete. Captains setting
 * up at 7:45 AM for an 8:15 tee time don't always know what they've
 * forgotten — the existing `/captain/checklist` page covers it
 * thoroughly but they have to navigate there first. This banner is
 * the proactive signal: "Tee off in 30 min — 2 setup items still
 * pending, tap to fix."
 *
 * Quietly does nothing when:
 *   • There's no active trip, or
 *   • No session starts today, or
 *   • Pre-flight check passes (no errors *and* no warnings).
 *
 * Tapping the banner deep-links to /captain/checklist where the
 * existing PreFlightChecklist can drive the fixes.
 *
 * Uses the existing runPreFlightCheck — same source of truth as the
 * Captain page, so the banner can't disagree with the checklist.
 */

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useLiveQuery } from 'dexie-react-hooks';
import { AlertTriangle, ChevronRight, Clock } from 'lucide-react';
import { useShallow } from 'zustand/shallow';
import { db } from '@/lib/db';
import {
  getPreFlightSummary,
  runPreFlightCheck,
} from '@/lib/services/preFlightValidationService';
import { useAccessStore, useTripStore } from '@/lib/stores';
import type { RyderCupSession } from '@/lib/types/models';
import { cn } from '@/lib/utils';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function isSessionStartingToday(session: RyderCupSession, now: Date): boolean {
  if (!session.scheduledDate) return false;
  // scheduledDate is ISO YYYY-MM-DD; compare in local time so a 9 AM
  // tee time on the captain's phone isn't pushed off the home page by
  // the browser's UTC interpretation.
  const today = new Date(now.getTime());
  today.setHours(0, 0, 0, 0);
  const sessionDate = new Date(`${session.scheduledDate}T00:00:00`);
  sessionDate.setHours(0, 0, 0, 0);
  return Math.abs(sessionDate.getTime() - today.getTime()) < ONE_DAY_MS;
}

function nextTeeTimeMinutes(sessions: RyderCupSession[], now: Date): number | null {
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
    2,
    '0'
  )}-${String(now.getDate()).padStart(2, '0')}`;
  let earliest: number | null = null;
  for (const s of sessions) {
    if (s.scheduledDate !== todayStr) continue;
    if (!s.firstTeeTime || !/^\d{2}:\d{2}$/.test(s.firstTeeTime)) continue;
    const [hh, mm] = s.firstTeeTime.split(':').map(Number);
    const teeTime = new Date(now.getTime());
    teeTime.setHours(hh, mm, 0, 0);
    const diffMin = Math.round((teeTime.getTime() - now.getTime()) / 60_000);
    if (diffMin >= 0 && (earliest == null || diffMin < earliest)) {
      earliest = diffMin;
    }
  }
  return earliest;
}

export function EventDayPreFlightBanner() {
  const router = useRouter();
  const { currentTrip, players, teams, teamMembers, sessions } = useTripStore(
    useShallow((s) => ({
      currentTrip: s.currentTrip,
      players: s.players,
      teams: s.teams,
      teamMembers: s.teamMembers,
      sessions: s.sessions,
    }))
  );
  const { isCaptainMode } = useAccessStore(
    useShallow((s) => ({ isCaptainMode: s.isCaptainMode }))
  );

  // Pull matches + courses + tee sets from Dexie so the banner can
  // reuse runPreFlightCheck. Using useLiveQuery means the banner
  // updates the moment the captain fixes something elsewhere
  // (publishing a lineup, setting a course) — no manual refresh.
  const tripId = currentTrip?.id;
  const sessionIdsKey = useMemo(
    () =>
      sessions
        .filter((s) => s.tripId === tripId)
        .map((s) => s.id)
        .sort()
        .join('|'),
    [sessions, tripId]
  );
  const matches = useLiveQuery(
    async () => {
      if (!tripId) return [];
      const ids = sessionIdsKey.split('|').filter(Boolean);
      if (ids.length === 0) return [];
      return db.matches.where('sessionId').anyOf(ids).toArray();
    },
    [tripId, sessionIdsKey],
    []
  );
  const courses = useLiveQuery(async () => db.courses.toArray(), [], []);
  const teeSets = useLiveQuery(async () => db.teeSets.toArray(), [], []);

  const now = new Date();
  const sessionsToday = useMemo(
    () => sessions.filter((s) => s.tripId === tripId && isSessionStartingToday(s, now)),
    // we deliberately don't depend on `now` — re-running every render is fine,
    // and a depending value would force re-renders every minute.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sessions, tripId]
  );

  // Don't render when there's no work to do. The banner only fires
  // for captains on an active trip with a session starting today.
  if (!currentTrip || !isCaptainMode) return null;
  if (sessionsToday.length === 0) return null;

  const result = runPreFlightCheck(
    currentTrip,
    players,
    teams,
    teamMembers,
    sessions,
    matches,
    courses,
    teeSets
  );

  // Quiet-success: if everything's ready, don't show the banner at
  // all. Captain doesn't need a "you're good" pat on the back here —
  // the absence of a banner is the signal.
  if (result.isReady && result.warnings.length === 0) return null;

  const minutesToTee = nextTeeTimeMinutes(sessions, now);
  const summary = getPreFlightSummary(result);
  const errorCount = result.errors.length;
  const warningCount = result.warnings.length;

  const isBlocking = errorCount > 0;
  const itemNoun = (n: number) => `${n} item${n === 1 ? '' : 's'}`;
  const headline = isBlocking
    ? `${itemNoun(errorCount)} need${errorCount === 1 ? 's' : ''} to be fixed`
    : `${itemNoun(warningCount)} to review`;

  const teeOffLabel = (() => {
    if (minutesToTee == null) return null;
    if (minutesToTee < 1) return 'Teeing off now';
    if (minutesToTee < 60) return `Tee off in ${minutesToTee} min`;
    const hours = Math.floor(minutesToTee / 60);
    const mins = minutesToTee % 60;
    return `Tee off in ${hours}h ${mins}m`;
  })();

  return (
    <button
      type="button"
      onClick={() => router.push('/captain/checklist')}
      aria-label={`Pre-flight check: ${headline}. Tap to fix.`}
      className={cn(
        'group flex w-full items-center gap-3 rounded-2xl border bg-[var(--canvas-raised)] px-4 py-3 text-left shadow-card transition-transform active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--canvas)]',
        isBlocking
          ? 'border-[color:var(--error)]/45'
          : 'border-[color:var(--warning)]/40'
      )}
    >
      <span
        aria-hidden
        className={cn(
          'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[var(--canvas)]',
          isBlocking ? 'bg-[var(--error)]' : 'bg-[var(--warning)]'
        )}
      >
        <AlertTriangle size={18} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <p className="type-overline text-[var(--ink-tertiary)]">
            Pre-flight check {summary.icon}
          </p>
          {teeOffLabel && (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-tertiary)]">
              <Clock size={10} />
              {teeOffLabel}
            </span>
          )}
        </div>
        <p className="mt-1 truncate text-sm font-semibold text-[var(--ink)]">
          {headline}
        </p>
        <p className="mt-0.5 truncate text-xs text-[var(--ink-tertiary)]">
          Tap to open the captain checklist · {result.completionPercentage}% complete
        </p>
      </div>
      <ChevronRight
        size={18}
        className="shrink-0 text-[var(--ink-tertiary)] transition-transform group-hover:translate-x-0.5"
      />
    </button>
  );
}
