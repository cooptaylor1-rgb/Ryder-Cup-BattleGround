/**
 * MatchCockpit — The new active-scoring surface.
 *
 * Replaces MatchScoringActiveState with a single sacred cockpit:
 *   1. Hole hero (hole number, par/SI/yardage on one line)
 *   2. Score input panel (winner-pick, gestures layered)
 *   3. Hole pager (chevrons + inline 18-dot strip)
 *
 * Everything else (session leaderboard, presses, side bets, trip moments)
 * has moved to the bottom drawer (ScoringDrawer). This file MUST stay
 * focused on the action — anything new added here should justify why it
 * isn't a drawer tab.
 */

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { HoleWinner } from '@/lib/types/models';
import { ScoreInputPanel } from './ScoreInputPanel';
import { HoleStrip } from './HoleStrip';
import { StrokeEntrySheet } from './StrokeEntrySheet';
import { FourballEntrySheet } from './FourballEntrySheet';
import type { CockpitHandlers, CockpitPreferences, CockpitScoring, CockpitTeams } from './types';

interface MatchCockpitProps {
  scoring: CockpitScoring;
  teams: CockpitTeams;
  preferences: CockpitPreferences;
  handlers: CockpitHandlers;
  isCaptainMode: boolean;
}

export function MatchCockpit({
  scoring,
  teams,
  preferences,
  handlers,
  isCaptainMode,
}: MatchCockpitProps) {
  const {
    matchState,
    currentHole,
    currentHoleResult,
    currentPar,
    currentStrokeIndex,
    currentYardage,
    isFourball,
    isMatchComplete,
    isEditingScores,
    isSaving,
    totalHoles,
    strokesByHole,
  } = scoring;

  const [strokeSheetOpen, setStrokeSheetOpen] = useState(false);
  const [fourballSheetOpen, setFourballSheetOpen] = useState(false);

  /**
   * Brief team-color "wash" over the cockpit body when a hole result
   * commits. Fixes the gap where a score-tap previously confirmed
   * only via the small spin pill in the header — outside the user's
   * visual focus. The wash covers the cockpit zone they were just
   * looking at, fades to transparent over ~700ms, and uses the
   * winning team's colour so the user feels which team they just
   * credited. Honours prefers-reduced-motion by skipping animation
   * but still flashing the colour briefly so the moment is felt
   * without movement.
   */
  const [washWinner, setWashWinner] = useState<HoleWinner | null>(null);
  const washTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    return () => {
      if (washTimerRef.current) clearTimeout(washTimerRef.current);
    };
  }, []);

  const onScoreWithWash = useCallback(
    (winner: HoleWinner) => {
      setWashWinner(winner);
      if (washTimerRef.current) clearTimeout(washTimerRef.current);
      washTimerRef.current = setTimeout(() => {
        setWashWinner(null);
        washTimerRef.current = null;
      }, 700);
      handlers.onScore(winner);
    },
    [handlers]
  );

  // Phase 2 collapse: the legacy 5-mode picker still flows in via
  // `scoring.scoringMode` from the model, but the cockpit only ever
  // renders the unified ScoreInputPanel. If the user (or store) picks
  // "strokes" or "fourball", we open the corresponding sheet. The
  // setState is the *intended* side-effect — mode change ⇒ sheet open
  // — which is exactly what useEffect is for; the React 19 rule's
  // suggestion to derive sheet state at render time would just split
  // the logic across two places.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (scoring.scoringMode === 'strokes' && !isFourball) {
      setStrokeSheetOpen(true);
    } else if (scoring.scoringMode === 'fourball' && isFourball) {
      setFourballSheetOpen(true);
    }
  }, [scoring.scoringMode, isFourball]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const factParts = [
    `Par ${currentPar}`,
    `SI ${currentStrokeIndex}`,
    currentYardage ? `${currentYardage} yds` : null,
  ].filter(Boolean) as string[];

  const helperLine = isFourball
    ? 'Best ball — tap to record the winner, or open detailed entry below.'
    : teams.teamAHandicapAllowance > 0 || teams.teamBHandicapAllowance > 0
      ? `Strokes: ${teams.teamAName} ${teams.teamAHandicapAllowance} · ${teams.teamBName} ${teams.teamBHandicapAllowance}`
      : 'Tap or swipe — gestures and taps both work.';

  const openStrokeEntry = () => {
    if (isFourball) setFourballSheetOpen(true);
    else setStrokeSheetOpen(true);
  };

  const washColor =
    washWinner === 'teamA'
      ? teams.teamAColor
      : washWinner === 'teamB'
        ? teams.teamBColor
        : washWinner === 'halved'
          ? 'var(--ink-secondary)'
          : null;

  return (
    <section
      className="relative space-y-4 px-4 pb-[calc(72px+env(safe-area-inset-bottom,0px))] pt-4 sm:px-5"
      aria-label="Score this hole"
    >
      {/* Score-commit wash. Sits over the cockpit at very low opacity
          for ~700ms after a score commits, fading to transparent.
          Covers the visual zone the user was just looking at, with
          the winning team's colour, so the commit *feels* like
          something happened — not just a tiny check icon flash. */}
      <AnimatePresence>
        {washColor && (
          <motion.div
            key={washColor}
            aria-hidden
            initial={{ opacity: 0 }}
            animate={{
              opacity: preferences.prefersReducedMotion ? 0.18 : [0, 0.28, 0],
            }}
            exit={{ opacity: 0 }}
            transition={{
              duration: 0.65,
              ease: 'easeOut',
              times: preferences.prefersReducedMotion ? undefined : [0, 0.18, 1],
            }}
            className="pointer-events-none absolute inset-0 -z-10 rounded-[28px]"
            style={{
              background: `radial-gradient(circle at 50% 35%, ${washColor} 0%, transparent 65%)`,
            }}
          />
        )}
      </AnimatePresence>
      {isEditingScores && isMatchComplete && (
        <div
          className="flex items-center justify-between gap-3 rounded-[18px] border border-[var(--gold)] bg-[var(--gold-subtle)] px-3 py-2.5"
          role="status"
        >
          <div className="flex items-center gap-2 min-w-0">
            <Shield size={14} className="shrink-0 text-[var(--gold)]" />
            <p className="truncate text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ink)]">
              Captain correcting completed card
            </p>
          </div>
          <button
            type="button"
            onClick={handlers.onFinishEditing}
            className="shrink-0 rounded-full border border-[color:var(--rule)] bg-[var(--canvas)] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--ink)]"
          >
            Done
          </button>
        </div>
      )}

      {/* Hole hero — one zone, one fact line. No card-within-card.
          The hole number animates on advance: AnimatePresence keys on
          currentHole so the old number slides + fades out and the new
          one slides in from below, giving the auto-advance a felt
          beat instead of a silent number swap. Reduced-motion users
          get a soft cross-fade instead of vertical motion. */}
      <div className="relative h-[120px] text-center sm:h-[140px]">
        <p className="type-overline text-[var(--masters)]">
          {isMatchComplete && !isEditingScores ? 'Recap hole' : 'Score this hole'}
        </p>
        <AnimatePresence mode="wait" initial={false}>
          <motion.h1
            key={currentHole}
            initial={
              preferences.prefersReducedMotion
                ? { opacity: 0 }
                : { opacity: 0, y: 28 }
            }
            animate={{ opacity: 1, y: 0 }}
            exit={
              preferences.prefersReducedMotion
                ? { opacity: 0 }
                : { opacity: 0, y: -28 }
            }
            transition={{ duration: preferences.prefersReducedMotion ? 0.18 : 0.32, ease: [0.32, 0.72, 0, 1] }}
            className={cn(
              'mt-1 font-serif font-normal leading-none tracking-[-0.02em] text-[var(--ink)]',
              'text-[88px] sm:text-[104px]'
            )}
          >
            {currentHole}
          </motion.h1>
        </AnimatePresence>
        {/* Par / SI / yardage fact line. Sized + weighted via CSS
            tokens (--cockpit-fact-size + --cockpit-fact-weight) so
            outdoor mode bumps it from 12px/600 to 14px/700 without
            this component having to know which theme is on. */}
        <p
          className="absolute inset-x-0 bottom-0 mt-1 uppercase"
          style={{
            fontSize: 'var(--cockpit-fact-size)',
            fontWeight: 'var(--cockpit-fact-weight)' as React.CSSProperties['fontWeight'],
            letterSpacing: 'var(--cockpit-overline-tracking)',
            color: 'var(--cockpit-secondary-text)',
          }}
        >
          {factParts.join(' · ')}
        </p>
      </div>

      {/* The single sacred surface */}
      <ScoreInputPanel
        teamAName={teams.teamAName}
        teamBName={teams.teamBName}
        teamAColor={teams.teamAColor}
        teamBColor={teams.teamBColor}
        existingResult={currentHoleResult?.winner}
        disabled={isSaving}
        preferredHand={preferences.preferredHand}
        prefersReducedMotion={preferences.prefersReducedMotion}
        onScore={onScoreWithWash}
        onOpenStrokeEntry={openStrokeEntry}
        helperLine={helperLine}
        strokesAvailable
      />

      {/* Hole pager — chevrons frame the inline 18-dot strip. */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handlers.onPrevHole}
          disabled={currentHole <= 1}
          aria-label="Previous hole"
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[color:var(--rule)] bg-[var(--canvas)] text-[var(--ink-secondary)] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--canvas)] active:scale-[0.96] disabled:cursor-not-allowed disabled:opacity-30"
        >
          <ChevronLeft size={18} />
        </button>

        <div className="flex-1 overflow-hidden rounded-2xl border border-[color:var(--rule)] bg-[var(--canvas-raised)] py-2">
          <HoleStrip
            currentHole={currentHole}
            holeResults={matchState.holeResults}
            teamAColor={teams.teamAColor}
            teamBColor={teams.teamBColor}
            totalHoles={totalHoles}
            strokesByHole={strokesByHole}
            onJump={handlers.onJumpToHole}
            onEditHole={isCaptainMode ? handlers.onJumpToHole : handlers.onJumpToHole}
          />
        </div>

        <button
          type="button"
          onClick={handlers.onNextHole}
          disabled={currentHole >= totalHoles}
          aria-label="Next hole"
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[color:var(--rule)] bg-[var(--canvas)] text-[var(--ink-secondary)] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--canvas)] active:scale-[0.96] disabled:cursor-not-allowed disabled:opacity-30"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Sheet overlays for stroke / fourball entry */}
      {!isFourball && (
        <StrokeEntrySheet
          open={strokeSheetOpen}
          onClose={() => setStrokeSheetOpen(false)}
          holeNumber={currentHole}
          par={currentPar}
          teamAName={teams.teamAName}
          teamBName={teams.teamBName}
          teamAColor={teams.teamAColor}
          teamBColor={teams.teamBColor}
          teamAHandicapStrokes={teams.teamAHandicapAllowance}
          teamBHandicapStrokes={teams.teamBHandicapAllowance}
          holeHandicaps={teams.holeHandicaps}
          initialTeamAScore={currentHoleResult?.teamAStrokes ?? null}
          initialTeamBScore={currentHoleResult?.teamBStrokes ?? null}
          isSubmitting={isSaving}
          onSubmit={(winner, a, b) => {
            handlers.onScoreWithStrokes(winner, a, b);
            setStrokeSheetOpen(false);
          }}
        />
      )}

      {isFourball && (
        <FourballEntrySheet
          open={fourballSheetOpen}
          onClose={() => setFourballSheetOpen(false)}
          holeNumber={currentHole}
          par={currentPar}
          teamAName={teams.teamAName}
          teamBName={teams.teamBName}
          teamAColor={teams.teamAColor}
          teamBColor={teams.teamBColor}
          teamAPlayers={teams.teamAFourballPlayers}
          teamBPlayers={teams.teamBFourballPlayers}
          holeHandicaps={teams.holeHandicaps}
          initialTeamAScores={currentHoleResult?.teamAPlayerScores}
          initialTeamBScores={currentHoleResult?.teamBPlayerScores}
          isSubmitting={isSaving}
          onSubmit={(winner, aBest, bBest, aScores, bScores) => {
            handlers.onFourballScore(winner, aBest, bBest, aScores, bScores);
            setFourballSheetOpen(false);
          }}
        />
      )}
    </section>
  );
}
