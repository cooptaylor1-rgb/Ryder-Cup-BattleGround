import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, Check, ChevronLeft, Mic, Undo2 } from 'lucide-react';
import { HoleMiniMap } from '@/components/scoring';
import type { MatchState } from '@/lib/types/computed';
import { cn } from '@/lib/utils';
import {
  ScoringFactCard,
  ScoringStatusBadge,
  type ScoringModeMeta,
} from './matchScoringShared';

interface MatchScoringHeroSectionProps {
  matchOrder: number;
  sessionLabel: string;
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
  scoringModeMeta: ScoringModeMeta;
  savingIndicator: string | null;
  undoCount: number;
  onBack: () => void;
  onOpenVoiceScoring: () => void;
  onUndo: () => void;
  onHoleSelect: (hole: number) => void;
}

export function MatchScoringHeroSection({
  matchOrder,
  sessionLabel,
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
  scoringModeMeta,
  savingIndicator,
  undoCount,
  onBack,
  onOpenVoiceScoring,
  onUndo,
  onHoleSelect,
}: MatchScoringHeroSectionProps) {
  return (
    <>
      <header className="sticky top-0 z-30 border-b border-[color:var(--rule)] bg-[color:var(--canvas)]/95 backdrop-blur">
        <div className="container-editorial py-[var(--space-3)]">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <button
                onClick={onBack}
                className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-[color:var(--rule)] bg-[color:var(--canvas)] text-[var(--ink-secondary)] transition-colors hover:text-[var(--ink)]"
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
              <button
                onClick={onOpenVoiceScoring}
                className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-[color:var(--rule)] bg-[color:var(--canvas)] text-[var(--ink-secondary)] transition-colors hover:text-[var(--ink)]"
                aria-label="Voice scoring"
              >
                <Mic size={18} />
              </button>
              <button
                onClick={onUndo}
                disabled={undoCount === 0}
                className={cn(
                  'inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] transition-colors',
                  undoCount > 0
                    ? 'bg-[var(--gold-subtle)] text-[var(--masters)]'
                    : 'bg-transparent text-[var(--ink-tertiary)] opacity-50'
                )}
                aria-label={`Undo last action${undoCount > 0 ? ` (${undoCount} available)` : ''}`}
              >
                <Undo2 size={14} />
                Undo
              </button>
            </div>
          </div>
        </div>
      </header>

      <section className="container-editorial space-y-4 pt-[var(--space-8)]">
        <div className="card-editorial overflow-hidden p-[var(--space-5)] sm:p-[var(--space-6)]">
          <div className="flex items-start justify-between gap-[var(--space-4)]">
            <div>
              <p className="type-overline text-[var(--masters)]">{sessionLabel}</p>
              <h1 className="mt-[var(--space-2)] font-serif text-[length:var(--text-3xl)] font-normal tracking-[-0.03em] text-[var(--ink)]">
                Sacred scoring
              </h1>
              <p className="mt-[var(--space-2)] text-sm text-[var(--ink-secondary)]">
                {teamALineup} vs {teamBLineup}
              </p>
            </div>
            <ScoringStatusBadge
              label={matchStatusLabel}
              tone={isMatchComplete ? 'muted' : 'masters'}
            />
          </div>

          <div className="mt-[var(--space-6)] grid gap-4 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
            <div className="rounded-[24px] border border-[color:var(--rule)]/75 bg-[color:var(--canvas)]/70 px-4 py-4 text-left">
              <p className="type-overline text-[color:var(--team-usa)]">{teamAName}</p>
              <p className="mt-2 text-sm text-[var(--ink-secondary)]">
                {matchState.teamAHolesWon} holes won
              </p>
            </div>

            <motion.div
              key={matchState.displayScore}
              initial={prefersReducedMotion ? false : { scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="text-center"
            >
              <p
                className={cn(
                  'score-monumental',
                  matchState.currentScore > 0
                    ? 'text-[color:var(--team-usa)]'
                    : matchState.currentScore < 0
                      ? 'text-[color:var(--team-europe)]'
                      : 'text-[var(--ink-tertiary)]'
                )}
              >
                {matchState.displayScore}
              </p>
              <p className="mt-2 text-sm text-[var(--ink-secondary)]">
                {matchState.holesPlayed > 0 ? `Through ${matchState.holesPlayed}` : 'Opening tee'}
              </p>
              {matchState.isDormie && (
                <p className="mt-1 inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--gold)]">
                  <AlertCircle size={12} />
                  Dormie
                </p>
              )}
            </motion.div>

            <div className="rounded-[24px] border border-[color:var(--rule)]/75 bg-[color:var(--canvas)]/70 px-4 py-4 text-left sm:text-right">
              <p className="type-overline text-[color:var(--team-europe)]">{teamBName}</p>
              <p className="mt-2 text-sm text-[var(--ink-secondary)]">
                {matchState.teamBHolesWon} holes won
              </p>
            </div>
          </div>

          <div className="mt-[var(--space-5)] grid grid-cols-3 gap-3">
            <ScoringFactCard eyebrow="Current hole" value={`Hole ${currentHole}`} note={`Par ${currentPar}`} />
            <ScoringFactCard eyebrow="Remaining" value={matchState.holesRemaining} note="Still in play" />
            <ScoringFactCard eyebrow="Mode" value={scoringModeMeta.label} note={scoringModeMeta.note} />
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
                  : savingIndicator === 'Saved offline'
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
