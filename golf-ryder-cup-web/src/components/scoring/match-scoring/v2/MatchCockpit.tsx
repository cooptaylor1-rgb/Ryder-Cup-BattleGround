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

import { useState } from 'react';
import { ChevronLeft, ChevronRight, Pencil, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
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
  } = scoring;

  const [strokeSheetOpen, setStrokeSheetOpen] = useState(false);
  const [fourballSheetOpen, setFourballSheetOpen] = useState(false);

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

  return (
    <section
      className="space-y-4 px-4 pb-[calc(72px+env(safe-area-inset-bottom,0px))] pt-4 sm:px-5"
      aria-label="Score this hole"
    >
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

      {/* Hole hero — one zone, one fact line. No card-within-card. */}
      <div className="text-center">
        <p className="type-overline text-[var(--masters)]">
          {isMatchComplete && !isEditingScores ? 'Recap hole' : 'Score this hole'}
        </p>
        <h1
          className={cn(
            'mt-1 font-serif font-normal leading-none tracking-[-0.02em] text-[var(--ink)]',
            'text-[88px] sm:text-[104px]'
          )}
        >
          {currentHole}
        </h1>
        <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--ink-secondary)]">
          {factParts.join(' · ')}
        </p>
        {currentHoleResult && currentHoleResult.winner !== 'none' && (
          <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-[var(--canvas-sunken)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-secondary)]">
            <Pencil size={11} />
            {currentHoleResult.winner === 'halved'
              ? 'Halved — tap below to change'
              : `${currentHoleResult.winner === 'teamA' ? teams.teamAName : teams.teamBName} won — tap to change`}
          </p>
        )}
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
        onScore={handlers.onScore}
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
            onJump={handlers.onJumpToHole}
            onEditHole={isCaptainMode ? handlers.onJumpToHole : handlers.onJumpToHole}
          />
        </div>

        <button
          type="button"
          onClick={handlers.onNextHole}
          disabled={currentHole >= 18}
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
