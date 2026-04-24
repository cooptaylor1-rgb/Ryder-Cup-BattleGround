/**
 * Stateless presentation helpers for ManageSessionsSection.
 *
 * Extracted so the main file stays focused on orchestration (data
 * loading, sync queueing, state transitions) instead of carrying
 * 250 lines of pill / format / readiness helpers that never touch
 * parent state. Everything here is pure — take props, return JSX
 * or a string. Safe to memoize, safe to import anywhere.
 */

import type { ReactNode } from 'react';
import { CheckCircle2, Clock3, Lock, Zap } from 'lucide-react';

import { cn, parseDateInLocalZone } from '@/lib/utils';
import type { RyderCupSession, TeeSet } from '@/lib/types/models';

type SessionStatus = RyderCupSession['status'];

export type MatchReadinessState = 'needs-course' | 'needs-tee' | 'ready';

export const sessionStatusStyles: Record<
  SessionStatus,
  {
    pill: string;
    panel: string;
    icon: ReactNode;
    label: string;
  }
> = {
  scheduled: {
    pill: 'border-[var(--rule)] bg-[var(--canvas)] text-[var(--ink-secondary)]',
    panel:
      'border-[var(--rule)] bg-[linear-gradient(180deg,rgba(255,255,255,0.86),rgba(248,244,237,0.95))]',
    icon: <Clock3 size={16} className="text-[var(--ink-tertiary)]" />,
    label: 'Scheduled',
  },
  inProgress: {
    pill:
      'border-[color:var(--warning)]/18 bg-[color:var(--warning)]/12 text-[var(--warning)]',
    panel:
      'border-[color:var(--warning)]/16 bg-[linear-gradient(180deg,rgba(184,134,11,0.10),rgba(255,255,255,0.96))]',
    icon: <Zap size={16} className="text-[var(--warning)]" />,
    label: 'In Progress',
  },
  completed: {
    pill:
      'border-[color:var(--success)]/18 bg-[color:var(--success)]/12 text-[var(--success)]',
    panel:
      'border-[color:var(--success)]/16 bg-[linear-gradient(180deg,rgba(45,122,79,0.10),rgba(255,255,255,0.96))]',
    icon: <CheckCircle2 size={16} className="text-[var(--success)]" />,
    label: 'Completed',
  },
  paused: {
    pill: 'border-[var(--rule)] bg-[color:var(--ink)]/6 text-[var(--ink-secondary)]',
    panel:
      'border-[var(--rule)] bg-[linear-gradient(180deg,rgba(0,0,0,0.04),rgba(255,255,255,0.96))]',
    icon: <Lock size={16} className="text-[var(--ink-tertiary)]" />,
    label: 'Paused',
  },
};

export function SessionStatusPill({ status }: { status: SessionStatus }) {
  return (
    <div
      className={cn(
        'rounded-full border px-[var(--space-2)] py-[6px]',
        sessionStatusStyles[status].pill
      )}
    >
      <span className="type-micro font-semibold">{sessionStatusStyles[status].label}</span>
    </div>
  );
}

export function getMatchReadinessState({
  selectedCourse,
  selectedTeeSet,
}: {
  selectedCourse?: { id: string } | undefined;
  selectedTeeSet?: { id: string } | undefined;
}): MatchReadinessState {
  if (!selectedCourse) return 'needs-course';
  if (!selectedTeeSet) return 'needs-tee';
  return 'ready';
}

export function MatchReadinessPill({ readiness }: { readiness: MatchReadinessState }) {
  const config =
    readiness === 'ready'
      ? {
          label: 'Ready for handicaps',
          className:
            'border-[color:var(--success)]/18 bg-[color:var(--success)]/12 text-[var(--success)]',
        }
      : readiness === 'needs-tee'
        ? {
            label: 'Needs tee',
            className:
              'border-[color:var(--warning)]/18 bg-[color:var(--warning)]/12 text-[var(--warning)]',
          }
        : {
            label: 'Needs course',
            className:
              'border-[color:var(--warning)]/18 bg-[color:var(--warning)]/12 text-[var(--warning)]',
          };

  return (
    <div className={cn('rounded-full border px-[var(--space-2)] py-[5px]', config.className)}>
      <span className="type-micro font-semibold">{config.label}</span>
    </div>
  );
}

export function formatShortDate(isoString: string) {
  // Route through parseDateInLocalZone so a bare YYYY-MM-DD doesn't flip
  // to the prior day in US timezones.
  return parseDateInLocalZone(isoString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export function formatSessionType(type: RyderCupSession['sessionType']) {
  switch (type) {
    case 'foursomes':
      return 'Foursomes';
    case 'fourball':
      return 'Fourball';
    case 'singles':
      return 'Singles';
    default:
      return type;
  }
}

/**
 * Tee option label with rating + slope. Captains picking a tee need
 * the course numbers visible at the point of decision — not buried
 * under another tap — because the handicap answer they're actually
 * trying to compute ("which tees should my group play?") depends on
 * both. Degree signs + slash match the scorecard convention (72.1 /
 * 131). Falls back to just the name when either field is missing so
 * a half-configured tee doesn't render "— NaN/NaN".
 */
export function formatTeeOptionLabel(tee: TeeSet): string {
  const rating = Number.isFinite(tee.rating) ? tee.rating.toFixed(1) : null;
  const slope = Number.isFinite(tee.slope) ? String(Math.round(tee.slope)) : null;
  if (rating && slope) {
    return `${tee.name} — ${rating} / ${slope}`;
  }
  return tee.name;
}
