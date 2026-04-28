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

import { useEffect, useState } from 'react';
import { CloudOff, Cloud, ChevronLeft, MoreHorizontal, Undo2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SyncStatusBadge } from '@/components/SyncStatusBadge';
import {
  getSyncQueueStatus,
  TRIP_SYNC_QUEUE_CHANGED_EVENT,
} from '@/lib/services/tripSyncService';

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
  // Live queue depth so the scorer sees, at a glance from the cockpit,
  // whether their last hole's worth of writes is still pending or
  // failed. Without this, the only sync surface visible while scoring
  // was the SaveStatePill (which only reflects the *current* op) —
  // pending or failed work behind it sat invisible until the user
  // navigated back to a page that rendered the SyncFailureBanner.
  const [queueDepth, setQueueDepth] = useState({ pending: 0, failed: 0 });
  useEffect(() => {
    const tick = () => {
      const s = getSyncQueueStatus();
      setQueueDepth({ pending: s.pending, failed: s.failed });
    };
    tick();
    window.addEventListener(TRIP_SYNC_QUEUE_CHANGED_EVENT, tick);
    return () => window.removeEventListener(TRIP_SYNC_QUEUE_CHANGED_EVENT, tick);
  }, []);

  return (
    <header
      className="sticky top-0 z-30 border-b border-[color:var(--rule)] bg-[color:var(--canvas)]/95 backdrop-blur"
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      data-cockpit-text
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
          <QueueDepthPill pending={queueDepth.pending} failed={queueDepth.failed} />

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
            duplicate scoreboard, and the "Live match" badge.
            Sized via the cockpit fact token so outdoor mode bumps
            it from 11px → 14px and switches to the higher-contrast
            ink for sunlight legibility. */}
        <p
          data-cockpit-overline
          className="mt-2 text-center font-mono uppercase"
          style={{
            fontSize: 'var(--cockpit-fact-size)',
            fontWeight: 'var(--cockpit-fact-weight)' as React.CSSProperties['fontWeight'],
            letterSpacing: 'var(--cockpit-overline-tracking)',
            color: 'var(--cockpit-secondary-text)',
          }}
        >
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

/**
 * Shows queue depth — how many writes haven't reached the cloud yet —
 * directly on the cockpit. Splits pending (still trying) from failed
 * (terminally stuck) so the user can immediately tell whether their
 * scoring is being absorbed or dropped on the floor.
 *
 * Hidden when the queue is clean. Tap-through to the failure banner
 * isn't needed here — the global SyncFailureBanner handles the action.
 */
function QueueDepthPill({ pending, failed }: { pending: number; failed: number }) {
  if (pending === 0 && failed === 0) return null;

  if (failed > 0) {
    return (
      <span
        className="inline-flex h-7 items-center gap-1 rounded-full bg-[color:var(--error)] px-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--canvas)]"
        role="status"
        aria-live="polite"
        title={`${failed} change${failed === 1 ? '' : 's'} did not reach the cloud — see the alert banner.`}
      >
        <CloudOff size={11} />
        {failed} stuck
      </span>
    );
  }

  return (
    <span
      className="inline-flex h-7 items-center gap-1 rounded-full bg-[color:var(--canvas-sunken)] px-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-secondary)]"
      role="status"
      aria-live="polite"
      title={`${pending} change${pending === 1 ? '' : 's'} waiting to sync to the cloud.`}
    >
      <Cloud size={11} />
      {pending}
    </span>
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
