import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, Check, ChevronLeft, Flag, MapPin, Mic, Undo2 } from 'lucide-react';
import { HoleMiniMap } from '@/components/scoring';
import { SyncStatusBadge } from '@/components/SyncStatusBadge';
import type { MatchState } from '@/lib/types/computed';
import { cn } from '@/lib/utils';
import {
  colorWithAlpha,
  ScoringFactCard,
  ScoringStatusBadge,
  type ScoringModeMeta,
} from './matchScoringShared';

interface MatchScoringHeroSectionProps {
  matchOrder: number;
  sessionLabel: string;
  currentCourseName?: string;
  currentTeeSetName?: string;
  teamALineup: string;
  teamBLineup: string;
  matchStatusLabel: string;
  isMatchComplete: boolean;
  matchState: MatchState;
  prefersReducedMotion: boolean;
  teamAName: string;
  teamBName: string;
  teamAColor: string;
  teamBColor: string;
  currentHole: number;
  currentPar: number;
  currentStrokeIndex: number;
  currentYardage?: number;
  scoringModeMeta: ScoringModeMeta;
  savingIndicator: string | null;
  undoCount: number;
  isCaptain: boolean;
  onBack: () => void;
  onOpenVoiceScoring: () => void;
  onUndo: () => void;
  onHoleSelect: (hole: number) => void;
}

export function MatchScoringHeroSection({
  matchOrder,
  sessionLabel,
  currentCourseName,
  currentTeeSetName,
  teamALineup,
  teamBLineup,
  matchStatusLabel,
  isMatchComplete,
  matchState,
  prefersReducedMotion,
  teamAName,
  teamBName,
  teamAColor,
  teamBColor,
  currentHole,
  currentPar,
  currentStrokeIndex,
  currentYardage,
  scoringModeMeta,
  savingIndicator,
  isCaptain,
  undoCount,
  onBack,
  onOpenVoiceScoring,
  onUndo,
  onHoleSelect,
}: MatchScoringHeroSectionProps) {
  const leaderName =
    matchState.currentScore > 0 ? teamAName : matchState.currentScore < 0 ? teamBName : undefined;
  const trailingName =
    matchState.currentScore > 0 ? teamBName : matchState.currentScore < 0 ? teamAName : undefined;
  const matchNarrative =
    matchState.holesPlayed === 0
      ? 'Opening tee'
      : leaderName
        ? `${leaderName} leads ${matchState.displayScore}`
        : 'All square';
  const currentHoleNote = [`Par ${currentPar}`, currentYardage ? `${currentYardage} yds` : null]
    .filter(Boolean)
    .join(' · ');

  return (
    <>
      <header
        className="sticky top-0 z-30 border-b border-[color:var(--rule)] bg-[color:var(--canvas)]/95 backdrop-blur"
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        <div className="container-editorial py-[var(--space-3)]">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <button
                type="button"
                onClick={onBack}
                className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-[color:var(--rule)] bg-[color:var(--canvas)] text-[var(--ink-secondary)] transition-colors hover:text-[var(--ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--canvas)] active:scale-[0.96]"
                aria-label="Back"
              >
                <ChevronLeft size={18} />
              </button>
              <div className="min-w-0">
                <p className="type-overline text-masters">Match {matchOrder}</p>
                <p className="truncate font-sans text-[length:var(--text-xs)] text-ink-tertiary">
                  {teamALineup} vs {teamBLineup}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/*
                Trip-level sync status — critical on a flaky course connection.
                Icon-only on phones to preserve sticky-header space; the badge
                itself opens a tooltip and acts as a manual retry when failed.
              */}
              <SyncStatusBadge />
              <button
                type="button"
                onClick={onOpenVoiceScoring}
                className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-[color:var(--rule)] bg-[color:var(--canvas)] text-[var(--ink-secondary)] transition-colors hover:text-[var(--ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--canvas)] active:scale-[0.96]"
                aria-label="Voice scoring"
              >
                <Mic size={18} />
              </button>
              <button
                type="button"
                onClick={onUndo}
                disabled={undoCount === 0}
                className={cn(
                  // h-11 (44px) meets the iOS touch target recommendation.
                  // High-frequency action during live scoring — needs to be
                  // confidently tappable with a gloved hand in wind.
                  'inline-flex h-11 items-center gap-2 rounded-full px-4 text-xs font-semibold uppercase tracking-[0.12em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--canvas)] active:scale-[0.96] disabled:cursor-not-allowed',
                  undoCount > 0
                    ? 'bg-[var(--gold-subtle)] text-[var(--masters)]'
                    : 'bg-transparent text-[var(--ink-tertiary)] opacity-50'
                )}
                aria-label={`Undo last action${undoCount > 0 ? ` (${undoCount} available)` : ''}`}
              >
                <Undo2 size={16} />
                Undo
              </button>
            </div>
          </div>
        </div>
      </header>

      <section className="container-editorial space-y-4 pt-[var(--space-8)]">
        <div className="overflow-hidden rounded-[28px] border border-[color:var(--rule)] bg-[var(--canvas-raised)] shadow-[0_24px_70px_rgba(26,24,21,0.10)]">
          <div className="h-1.5 bg-[linear-gradient(90deg,var(--team-usa)_0%,var(--gold)_50%,var(--team-europe)_100%)]" />
          <div className="p-[var(--space-5)] sm:p-[var(--space-6)]">
            <div className="flex items-start justify-between gap-[var(--space-4)]">
              <div className="min-w-0">
                <p className="type-overline text-[var(--masters)]">{sessionLabel}</p>
                <h1 className="mt-[var(--space-2)] font-serif text-[length:var(--text-3xl)] font-normal text-[var(--ink)]">
                  Match scoreboard
                </h1>
                <p className="mt-[var(--space-2)] text-sm font-medium text-[var(--ink-secondary)]">
                  {matchNarrative}
                  {trailingName && !isMatchComplete ? ` · ${trailingName} chasing` : ''}
                </p>
                {/*
                Course / tee badges. Must stay legible in bright sunlight
                on the course — bumped to text-xs (12px → ~13px scaled)
                with py-2 padding for a larger visual target. Previously
                rendered at text-[11px] / py-1 which was borderline
                unreadable at arm's length.
              */}
                <div className="mt-[var(--space-3)] flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ink-secondary)]">
                  <div className="inline-flex items-center gap-1.5 rounded-full border border-[color:var(--rule)] bg-[color:var(--canvas)]/72 px-3 py-2">
                    <MapPin size={14} className="text-[var(--ink-tertiary)]" />
                    <span>{currentCourseName ?? 'Course not assigned'}</span>
                  </div>
                  <div className="inline-flex items-center gap-1.5 rounded-full border border-[color:var(--rule)] bg-[color:var(--canvas)]/72 px-3 py-2">
                    <Flag size={14} className="text-[var(--ink-tertiary)]" />
                    <span>{currentTeeSetName ?? 'Tee set not assigned'}</span>
                  </div>
                </div>
                {(!currentCourseName || !currentTeeSetName) && (
                  <p className="mt-2 text-xs text-[var(--warning)]">
                    {isCaptain
                      ? 'Assign a course and tee set in Manage Trip session settings to turn on handicap-adjusted scoring. You can still score gross without it.'
                      : 'Scores will still count, but handicap strokes won’t apply until the captain sets a course and tee.'}
                  </p>
                )}
              </div>
              <ScoringStatusBadge
                label={matchStatusLabel}
                tone={isMatchComplete ? 'muted' : 'masters'}
              />
            </div>

            <div className="mt-[var(--space-6)] grid gap-3 lg:grid-cols-[minmax(0,1fr)_16rem_minmax(0,1fr)] lg:items-stretch">
              <TeamScoreCard
                teamName={teamAName}
                lineup={teamALineup}
                holesWon={matchState.teamAHolesWon}
                teamColor={teamAColor}
                tone={
                  matchState.currentScore > 0
                    ? 'leading'
                    : matchState.currentScore < 0
                      ? 'trailing'
                      : 'even'
                }
              />
              <motion.div
                key={matchState.displayScore}
                initial={prefersReducedMotion ? false : { scale: 0.96, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="flex min-h-[170px] flex-col items-center justify-center rounded-[28px] border border-[color:var(--masters)]/20 bg-[linear-gradient(180deg,var(--masters-subtle)_0%,var(--canvas)_82%)] px-5 py-5 text-center shadow-[0_18px_42px_rgba(26,24,21,0.08)]"
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--masters)]">
                  {isMatchComplete ? 'Final' : 'Live match'}
                </p>
                <p
                  className={cn(
                    'score-monumental mt-2',
                    matchState.currentScore > 0
                      ? 'text-[color:var(--team-usa)]'
                      : matchState.currentScore < 0
                        ? 'text-[color:var(--team-europe)]'
                        : 'text-[var(--ink-tertiary)]'
                  )}
                >
                  {matchState.displayScore}
                </p>
                <p className="mt-2 text-sm font-semibold text-[var(--ink-secondary)]">
                  {matchState.holesPlayed > 0 ? `Through ${matchState.holesPlayed}` : 'Opening tee'}
                </p>
                {matchState.isDormie && (
                  <p className="mt-1 inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--gold)]">
                    <AlertCircle size={12} />
                    Dormie
                  </p>
                )}
              </motion.div>
              <TeamScoreCard
                teamName={teamBName}
                lineup={teamBLineup}
                holesWon={matchState.teamBHolesWon}
                teamColor={teamBColor}
                tone={
                  matchState.currentScore < 0
                    ? 'leading'
                    : matchState.currentScore > 0
                      ? 'trailing'
                      : 'even'
                }
                align="right"
              />
            </div>

            <div className="mt-[var(--space-5)] grid gap-3 min-[420px]:grid-cols-2 sm:grid-cols-4">
              <ScoringFactCard
                eyebrow="Current hole"
                value={`Hole ${currentHole}`}
                note={currentHoleNote}
              />
              <ScoringFactCard
                eyebrow="Stroke index"
                value={currentStrokeIndex}
                note={currentStrokeIndex === 1 ? 'Hardest hole' : 'Handicap rank'}
              />
              <ScoringFactCard
                eyebrow="Remaining"
                value={matchState.holesRemaining}
                note="Still in play"
              />
              <ScoringFactCard
                eyebrow="Mode"
                value={scoringModeMeta.label}
                note={scoringModeMeta.note}
              />
            </div>
          </div>
        </div>

        <HoleMiniMap
          currentHole={currentHole}
          holeResults={matchState.holeResults}
          teamAName={teamAName}
          teamBName={teamBName}
          teamAColor={teamAColor}
          teamBColor={teamBColor}
          onHoleSelect={onHoleSelect}
          isComplete={isMatchComplete}
        />

        <AnimatePresence>
          {savingIndicator && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={cn(
                'mx-auto flex w-fit items-center justify-center gap-2 rounded-full px-4 py-2 text-[var(--canvas)]',
                savingIndicator === 'Saving score...'
                  ? 'bg-[var(--masters)]'
                  : savingIndicator === 'Saved on this device'
                    ? 'bg-[var(--warning)]'
                    : 'bg-[var(--success)]'
              )}
              role="status"
              aria-live="polite"
            >
              {savingIndicator === 'Saving score...' ? (
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-[color:var(--canvas)]/30 border-t-[var(--canvas)]" />
              ) : (
                <Check size={14} strokeWidth={3} />
              )}
              <span className="text-sm font-medium">{savingIndicator}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </section>
    </>
  );
}

function TeamScoreCard({
  teamName,
  lineup,
  holesWon,
  teamColor,
  tone,
  align = 'left',
}: {
  teamName: string;
  lineup: string;
  holesWon: number;
  teamColor: string;
  tone: 'leading' | 'trailing' | 'even';
  align?: 'left' | 'right';
}) {
  const label = tone === 'leading' ? 'Leading' : tone === 'trailing' ? 'Chasing' : 'All square';

  return (
    <div
      className={cn(
        'flex min-h-[170px] flex-col justify-between rounded-[28px] border px-4 py-4 shadow-[0_14px_34px_rgba(26,24,21,0.06)]',
        align === 'right' ? 'text-left lg:text-right' : 'text-left'
      )}
      style={{
        borderColor:
          tone === 'leading' ? teamColor : 'color-mix(in srgb, var(--rule) 92%, transparent)',
        background:
          tone === 'leading'
            ? `linear-gradient(180deg, ${colorWithAlpha(teamColor, 16)} 0%, var(--canvas-raised) 86%)`
            : 'linear-gradient(180deg, var(--canvas-raised) 0%, var(--canvas) 100%)',
      }}
    >
      <div className="min-w-0">
        <p className="type-overline" style={{ color: teamColor }}>
          {teamName}
        </p>
        <p className="mt-2 truncate text-base font-semibold text-[var(--ink)]" title={lineup}>
          {lineup || 'Lineup pending'}
        </p>
      </div>
      <div
        className={cn(
          'mt-5 flex items-end justify-between gap-3',
          align === 'right' && 'lg:flex-row-reverse'
        )}
      >
        <div>
          <p className="font-serif text-[length:var(--text-4xl)] leading-none text-[var(--ink)]">
            {holesWon}
          </p>
          <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ink-tertiary)]">
            holes won
          </p>
        </div>
        <span
          className="rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em]"
          style={{
            background:
              tone === 'leading' ? colorWithAlpha(teamColor, 16) : 'var(--surface-secondary)',
            color: tone === 'leading' ? teamColor : 'var(--ink-secondary)',
          }}
        >
          {label}
        </span>
      </div>
    </div>
  );
}
