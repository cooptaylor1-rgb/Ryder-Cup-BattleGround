import { useEffect, useState, type ReactNode } from 'react';
import { RefreshCw } from 'lucide-react';

import type { MagicNumber, TeamStandings } from '@/lib/types/computed';

/**
 * Compact "X min ago" formatter used by the masthead's refresh pill.
 * Returns null when we don't have a timestamp yet — the pill hides
 * the relative line entirely in that case rather than showing a
 * placeholder that would just be visual noise.
 */
function formatRelativeShort(ms: number, now: number): string | null {
  if (!Number.isFinite(ms)) return null;
  const diffSec = Math.max(0, Math.round((now - ms) / 1000));
  if (diffSec < 30) return 'just now';
  if (diffSec < 90) return '1 min ago';
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHr = Math.floor(diffMin / 60);
  return `${diffHr}h ago`;
}

export function StandingsMasthead({
  standings,
  magicNumber,
  teamAName,
  teamBName,
  currentTripName,
  matchesCompleted,
  totalMatches,
  lastUpdatedAt,
  onRefresh,
  isRefreshing,
}: {
  standings: TeamStandings | null;
  magicNumber: MagicNumber | null;
  teamAName: string;
  teamBName: string;
  currentTripName: string;
  matchesCompleted: number;
  totalMatches: number;
  lastUpdatedAt: Date | null;
  onRefresh: () => void;
  isRefreshing: boolean;
}) {
  // Tick once a minute so "2 min ago" stays current without a parent
  // re-render. Cheap — only re-renders this component, and React
  // diff'ing skips the rest of the page.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(interval);
  }, []);
  const relativeUpdate = lastUpdatedAt ? formatRelativeShort(lastUpdatedAt.getTime(), now) : null;
  const summary = !standings
    ? 'The board will take shape once matches are underway.'
    : standings.leader === 'teamA'
      ? `${teamAName} holds the edge.`
      : standings.leader === 'teamB'
        ? `${teamBName} has the upper hand.`
        : 'Everything is level.';

  const progress =
    totalMatches > 0
      ? `${matchesCompleted} of ${totalMatches} matches complete`
      : 'Awaiting scores';

  return (
    <div className="overflow-hidden rounded-[2rem] border border-[var(--rule)] bg-[linear-gradient(180deg,rgba(255,255,255,0.82),rgba(248,244,237,0.94))] shadow-[0_22px_48px_rgba(46,34,18,0.08)]">
      <div className="border-b border-[color:var(--rule)]/80 px-[var(--space-5)] py-[var(--space-5)]">
        <div className="flex items-start justify-between gap-[var(--space-3)]">
          <div className="min-w-0">
            <p className="type-overline tracking-[0.2em] text-[var(--ink-tertiary)]">Leaderboard</p>
            <h1 className="mt-[var(--space-2)] font-serif text-[clamp(2rem,8vw,3.3rem)] italic leading-[1.02] text-[var(--ink)]">
              {currentTripName}
            </h1>
          </div>
          {/* Refresh affordance. The aggregates already auto-update
              from Dexie's live invalidation, but captains who suspect
              data is stale (rare proxy hiccup, returning from
              background, etc.) want a one-tap "force refresh" button
              instead of having to navigate away and back. The
              "X min ago" line gives them confidence in the data they
              are looking at. */}
          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-[var(--space-2)] rounded-full border border-[var(--rule)] bg-[rgba(255,255,255,0.78)] px-[var(--space-3)] py-[var(--space-2)] text-xs font-medium text-[var(--ink-secondary)] shadow-card-sm transition-colors hover:bg-[var(--canvas-raised)] disabled:opacity-60"
            aria-label="Refresh standings"
          >
            <RefreshCw
              size={14}
              className={isRefreshing ? 'animate-spin' : ''}
              aria-hidden
            />
            <span className="hidden sm:inline">
              {relativeUpdate ? `Updated ${relativeUpdate}` : 'Refresh'}
            </span>
          </button>
        </div>
        <p className="mt-[var(--space-3)] type-body-sm text-[var(--ink-secondary)]">{summary}</p>
      </div>

      <div className="grid grid-cols-2 gap-[var(--space-3)] px-[var(--space-5)] py-[var(--space-5)] md:grid-cols-4">
        <StandingsFactCard label={teamAName} value={standings?.teamAPoints ?? '—'} />
        <StandingsFactCard label={teamBName} value={standings?.teamBPoints ?? '—'} />
        <StandingsFactCard
          label="Progress"
          value={progress}
          valueClassName="font-sans text-[0.95rem] not-italic"
        />
        <StandingsFactCard label="To Win" value={magicNumber?.pointsToWin ?? '—'} />
      </div>
    </div>
  );
}

export function TabButton({
  id,
  active,
  onClick,
  icon,
  label,
  controls,
}: {
  id: string;
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  label: string;
  controls: string;
}) {
  return (
    <button
      id={id}
      onClick={onClick}
      className={`press-scale flex flex-1 items-center justify-center gap-[var(--space-2)] rounded-[1rem] px-[var(--space-4)] py-[var(--space-3)] font-[family-name:var(--font-sans)] text-sm transition-all duration-200 ${
        active
          ? 'border border-[color:var(--masters-deep)] bg-[linear-gradient(135deg,var(--masters)_0%,var(--masters-deep)_100%)] font-semibold text-[var(--canvas)] shadow-[0_10px_24px_rgba(22,101,52,0.24)]'
          : 'border border-[var(--rule)] bg-[rgba(255,255,255,0.58)] font-medium text-[var(--ink-secondary)]'
      }`}
      aria-selected={active}
      aria-controls={controls}
      role="tab"
      tabIndex={active ? 0 : -1}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

export function StandingsSectionHeading({
  eyebrow,
  title,
  action,
}: {
  eyebrow: ReactNode;
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-[var(--space-4)]">
      <div className="min-w-0">
        <p className="type-overline text-[var(--ink-tertiary)]">{eyebrow}</p>
        <h2 className="mt-[var(--space-2)] font-serif text-[clamp(1.45rem,5vw,2rem)] italic leading-[1.08] text-[var(--ink)]">
          {title}
        </h2>
      </div>
      {action && <div className="shrink-0 pt-[2px]">{action}</div>}
    </div>
  );
}

export function StandingsFactCard({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: ReactNode;
  valueClassName?: string;
}) {
  return (
    <div className="rounded-[1.1rem] border border-[var(--rule)] bg-[rgba(255,255,255,0.72)] px-[var(--space-4)] py-[var(--space-3)] shadow-[0_10px_20px_rgba(46,34,18,0.05)]">
      <p className="type-micro uppercase tracking-[0.14em] text-[var(--ink-tertiary)]">{label}</p>
      <p
        className={`mt-[2px] font-serif text-[1.25rem] italic leading-[1.2] text-[var(--ink)] ${valueClassName ?? ''}`}
      >
        {value}
      </p>
    </div>
  );
}
