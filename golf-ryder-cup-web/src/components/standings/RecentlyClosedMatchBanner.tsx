'use client';

/**
 * RecentlyClosedMatchBanner
 *
 * Renders on the standings page when the user just finished a match
 * and the cockpit handed them off here via `?matchClosed=<id>`.
 *
 * The post-match flow is intentional: per our research captains
 * almost always want to check standings the moment a match ends.
 * Recap is the persistent shareable surface — accessible from this
 * banner ("View recap"), the cockpit overflow if the match is later
 * reopened, and direct nav to /score/<id>/recap.
 *
 * The banner also surfaces "Score next match" when the session has
 * an incomplete match queued up — a one-tap handoff to the next
 * cockpit without leaving standings.
 *
 * Auto-clears the URL param when dismissed (or when the user
 * navigates away) so a refresh doesn't re-show stale celebration.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLiveQuery } from 'dexie-react-hooks';
import { ArrowRight, FileText, Trophy, X } from 'lucide-react';
import { db } from '@/lib/db';
import { calculateMatchState } from '@/lib/services/scoringEngine';
import { findNextIncompleteMatch } from '@/components/scoring/match-scoring/matchScoringReport';
import { TEAM_COLORS } from '@/lib/constants/teamColors';
import { cn } from '@/lib/utils';

interface RecentlyClosedMatchBannerProps {
  className?: string;
}

export function RecentlyClosedMatchBanner({ className }: RecentlyClosedMatchBannerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [dismissed, setDismissed] = useState(false);

  const matchClosedId = searchParams?.get('matchClosed') ?? null;

  // Read the just-finished match + its session siblings so we can show
  // the result line and find the next incomplete match in this session.
  const banner = useLiveQuery(
    async () => {
      if (!matchClosedId) return null;
      const match = await db.matches.get(matchClosedId);
      if (!match) return null;
      const holeResults = await db.holeResults
        .where('matchId')
        .equals(match.id)
        .toArray();
      const matchState = calculateMatchState(match, holeResults);

      // Pull session siblings to find the next incomplete match.
      const sessionMatches = match.sessionId
        ? await db.matches
            .where('sessionId')
            .equals(match.sessionId)
            .sortBy('matchOrder')
        : [];

      const nextMatch = findNextIncompleteMatch(match.id, sessionMatches);
      return { match, matchState, nextMatch };
    },
    [matchClosedId],
    null
  );

  // Clear dismissal whenever the param changes — a *new* match-close
  // event should always show the banner even if a previous one was
  // dismissed. The setState is the intended sync-from-prop here; the
  // React 19 set-state-in-effect rule is a false flag for this
  // pattern.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setDismissed(false);
  }, [matchClosedId]);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (!matchClosedId || !banner || dismissed) return null;

  const { matchState, nextMatch } = banner;
  const winningTeam = matchState.winningTeam;
  const teamAColor = TEAM_COLORS.teamA;
  const teamBColor = TEAM_COLORS.teamB;
  const accent =
    winningTeam === 'teamA'
      ? teamAColor
      : winningTeam === 'teamB'
        ? teamBColor
        : 'var(--ink-secondary)';
  const headline =
    winningTeam === 'halved'
      ? 'Match halved'
      : winningTeam === 'teamA'
        ? 'USA wins'
        : winningTeam === 'teamB'
          ? 'Europe wins'
          : 'Match closed';

  const dismiss = () => {
    setDismissed(true);
    // Strip the param so a refresh doesn't pop the banner again.
    router.replace('/standings');
  };

  const goToNextMatch = () => {
    if (!nextMatch) return;
    router.replace(`/score/${nextMatch.id}`);
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'relative overflow-hidden rounded-2xl border bg-[var(--canvas-raised)] shadow-card',
        className
      )}
      style={{ borderColor: `color-mix(in srgb, ${accent} 38%, var(--rule))` }}
    >
      <div
        aria-hidden
        className="h-1 w-full"
        style={{ background: accent }}
      />
      <div className="flex flex-wrap items-start gap-3 px-4 py-3 sm:px-5 sm:py-4">
        <span
          aria-hidden
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[var(--canvas)]"
          style={{ background: accent }}
        >
          <Trophy size={16} />
        </span>

        <div className="min-w-0 flex-1">
          <p className="type-overline text-[var(--ink-tertiary)]">
            Match {banner.match.matchOrder} just finished
          </p>
          <p className="mt-1 font-serif text-[length:var(--text-lg)] leading-tight text-[var(--ink)]">
            <span style={{ color: accent }}>{headline}</span>
            {winningTeam !== 'halved' && winningTeam !== null && (
              <span className="ml-2 font-mono text-base text-[var(--ink-secondary)]">
                {matchState.displayScore}
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/score/${matchClosedId}/recap`}
            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-[color:var(--rule)] bg-[var(--canvas)] px-3 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ink-secondary)] transition-colors hover:text-[var(--ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--canvas-raised)]"
          >
            <FileText size={12} />
            Recap
          </Link>
          {nextMatch && (
            <button
              type="button"
              onClick={goToNextMatch}
              className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[var(--masters)] px-3 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--canvas)] transition-colors hover:bg-[var(--masters-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--canvas-raised)]"
            >
              Next match
              <ArrowRight size={12} />
            </button>
          )}
          <button
            type="button"
            onClick={dismiss}
            aria-label="Dismiss match-finished banner"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-transparent text-[var(--ink-tertiary)] transition-colors hover:border-[color:var(--rule)] hover:text-[var(--ink-secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--canvas-raised)]"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
