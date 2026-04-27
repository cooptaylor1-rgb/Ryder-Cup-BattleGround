/**
 * CockpitHeader — Phase 1 slim header for the scoring cockpit.
 *
 * Replaces the much larger MatchScoringHeroSection. One job: tell the
 * scorer where they are (match, teams) and how the match stands —
 * without repeating any single piece of information.
 *
 * What's intentionally not here (vs v1):
 *  - Big team-A / score / team-B 3-up card (was redundant with the score input)
 *  - 4-up facts grid (par + SI + yardage are now a single inline line)
 *  - HoleMiniMap full panel (we render an inline dot row in the cockpit instead)
 *  - Saving indicator (now an inline pill on the cockpit)
 *  - Voice button (moved to overflow ⋮)
 */

'use client';

import { ChevronLeft, MoreHorizontal, Undo2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SyncStatusBadge } from '@/components/SyncStatusBadge';

interface CockpitHeaderProps {
  matchOrder: number;
  sessionLabel: string;
  teamAName: string;
  teamBName: string;
  teamAColor: string;
  teamBColor: string;
  teamALineup: string;
  teamBLineup: string;
  matchScoreLabel: string;
  matchProgressLabel: string;
  isMatchComplete: boolean;
  isSaving: boolean;
  saveState: 'idle' | 'saving' | 'saved' | 'offline';
  undoCount: number;
  onBack: () => void;
  onUndo: () => void;
  onOpenOverflow: () => void;
}

export function CockpitHeader({
  matchOrder,
  sessionLabel,
  teamAName,
  teamBName,
  teamAColor,
  teamBColor,
  teamALineup,
  teamBLineup,
  matchScoreLabel,
  matchProgressLabel,
  isMatchComplete,
  saveState,
  undoCount,
  onBack,
  onUndo,
  onOpenOverflow,
}: CockpitHeaderProps) {
  return (
    <header
      className="sticky top-0 z-30 border-b border-[color:var(--rule)] bg-[color:var(--canvas)]/95 backdrop-blur"
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
    >
      {/* Single thin team-color rule across the top — replaces the large
          tri-color gradient bar from v1. Reads as "this is THIS match"
          without consuming any vertical space. */}
      <div
        aria-hidden
        className="h-1"
        style={{
          background: `linear-gradient(90deg, ${teamAColor} 0%, ${teamAColor} 49%, var(--gold) 49%, var(--gold) 51%, ${teamBColor} 51%, ${teamBColor} 100%)`,
        }}
      />

      <div className="container-editorial py-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[color:var(--rule)] bg-[color:var(--canvas)] text-[var(--ink-secondary)] transition-colors hover:text-[var(--ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--canvas)] active:scale-[0.96]"
            aria-label="Back"
          >
            <ChevronLeft size={18} />
          </button>

          <div className="min-w-0 flex-1">
            <p className="type-overline text-[var(--masters)]">
              Match {matchOrder} · {sessionLabel}
            </p>
            <p className="truncate text-[length:var(--text-xs)] text-[var(--ink-tertiary)]">
              <span style={{ color: teamAColor }}>{teamAName}</span>{' '}
              <span className="text-[var(--ink-tertiary)]">vs</span>{' '}
              <span style={{ color: teamBColor }}>{teamBName}</span>
              {(teamALineup || teamBLineup) && (
                <>
                  {' · '}
                  <span className="text-[var(--ink-tertiary)]">
                    {teamALineup || '—'} / {teamBLineup || '—'}
                  </span>
                </>
              )}
            </p>
          </div>

          <SaveStatePill state={saveState} />

          <button
            type="button"
            onClick={onUndo}
            disabled={undoCount === 0}
            className={cn(
              'inline-flex h-11 items-center gap-1.5 rounded-full px-3 text-[11px] font-semibold uppercase tracking-[0.12em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--canvas)] active:scale-[0.96] disabled:cursor-not-allowed',
              undoCount > 0
                ? 'bg-[var(--gold-subtle)] text-[var(--masters)]'
                : 'bg-transparent text-[var(--ink-tertiary)] opacity-40'
            )}
            aria-label={`Undo last action${undoCount > 0 ? ` (${undoCount} available)` : ''}`}
          >
            <Undo2 size={14} />
            Undo
          </button>

          <button
            type="button"
            onClick={onOpenOverflow}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[color:var(--rule)] bg-[color:var(--canvas)] text-[var(--ink-secondary)] transition-colors hover:text-[var(--ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--canvas)] active:scale-[0.96]"
            aria-label="Match menu"
          >
            <MoreHorizontal size={18} />
          </button>
        </div>

        {/* Single live status line. Replaces "Match position" card,
            duplicate scoreboard, and the "Live match" badge. */}
        <p className="mt-2 text-center font-mono text-[length:var(--text-xs)] font-semibold uppercase tracking-[0.18em] text-[var(--ink-secondary)]">
          {isMatchComplete ? 'Final · ' : ''}
          {matchScoreLabel} · {matchProgressLabel}
        </p>
      </div>

      {/* Hidden v1 sync badge mount-point so anyone scanning Sentry/analytics
          for old hooks still finds something — but visually inert. */}
      <div className="sr-only" aria-hidden>
        <SyncStatusBadge />
      </div>
    </header>
  );
}

function SaveStatePill({ state }: { state: 'idle' | 'saving' | 'saved' | 'offline' }) {
  if (state === 'idle') {
    return (
      <span
        className="inline-flex h-7 items-center gap-1 rounded-full bg-[color:var(--canvas-sunken)] px-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-tertiary)]"
        aria-hidden
      >
        <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--ink-tertiary)]/60" />
        Live
      </span>
    );
  }

  if (state === 'saving') {
    return (
      <span
        className="inline-flex h-7 items-center gap-1.5 rounded-full bg-[color:var(--masters)] px-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--canvas)]"
        role="status"
        aria-live="polite"
      >
        <span className="h-2 w-2 animate-spin rounded-full border-2 border-[color:var(--canvas)]/30 border-t-[var(--canvas)]" />
        Saving
      </span>
    );
  }

  if (state === 'offline') {
    return (
      <span
        className="inline-flex h-7 items-center gap-1.5 rounded-full bg-[color:var(--warning)] px-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--canvas)]"
        role="status"
        aria-live="polite"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--canvas)]" />
        Offline
      </span>
    );
  }

  return (
    <span
      className="inline-flex h-7 items-center gap-1.5 rounded-full bg-[color:var(--success)] px-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--canvas)]"
      role="status"
      aria-live="polite"
    >
      <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--canvas)]" />
      Saved
    </span>
  );
}
