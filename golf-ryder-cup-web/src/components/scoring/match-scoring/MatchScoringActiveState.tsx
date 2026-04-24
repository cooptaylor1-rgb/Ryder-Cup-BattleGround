import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Shield, Sparkles } from 'lucide-react';
import {
  FourballScoreEntry,
  HandicapStrokeIndicator,
  OneHandedScoringPanel,
  PressTracker,
  StrokeScoreEntry,
  SwipeScorePanel,
  type Press,
} from '@/components/scoring';
import { SideBetReminder, type SideBet as ReminderSideBet } from '@/components/live-play';
import type { MatchState } from '@/lib/types/computed';
import type { HoleResult, HoleWinner, Player, PlayerHoleScore, SideBet } from '@/lib/types/models';
import { cn } from '@/lib/utils';
import {
  QuickScoreTile,
  ScoringModeChip,
  ScoringStatusBadge,
  type ScoringMode,
  type ScoringModeMeta,
} from './matchScoringShared';
import { MatchInsideGamesPanel } from './MatchInsideGamesPanel';
import { MatchTripMomentsPanel } from './MatchTripMomentsPanel';

export interface FourballPlayer {
  id: string;
  name: string;
  courseHandicap: number;
  strokeAllowance: number;
}

export interface ScoringContext {
  isEditingScores: boolean;
  isMatchComplete: boolean;
  currentHole: number;
  currentHoleResult?: HoleResult;
  currentPar: number;
  matchState: MatchState;
  scoringMode: ScoringMode;
  scoringModeMeta: ScoringModeMeta;
  isFourball: boolean;
  quickScoreMode: boolean;
  quickScorePendingTeam?: 'teamA' | 'teamB';
  isSaving: boolean;
  undoCount: number;
  presses: Press[];
}

export interface TeamContext {
  teamAName: string;
  teamBName: string;
  teamAColor: string;
  teamBColor: string;
  teamAHandicapAllowance: number;
  teamBHandicapAllowance: number;
  holeHandicaps: number[];
  teamAFourballPlayers: FourballPlayer[];
  teamBFourballPlayers: FourballPlayer[];
  teamAPlayers: Player[];
  teamBPlayers: Player[];
}

export interface ScoringUIPreferences {
  preferredHand: 'left' | 'right';
  showHandicapDetails: boolean;
  showScoringModeTip: boolean;
  showAdvancedTools: boolean;
  prefersReducedMotion: boolean;
}

export interface SideBetContext {
  activeSideBets: ReminderSideBet[];
  activeMatchSideBets: SideBet[];
  currentTripId?: string;
  currentPlayerIdForBets?: string;
}

export interface ScoringHandlers {
  onFinishEditing: () => void;
  onPrevHole: () => void;
  onNextHole: () => void;
  onDismissScoringModeTip: () => void;
  onScoringModeChange: (mode: ScoringMode) => void;
  onQuickScoreTap: (team: 'teamA' | 'teamB') => void;
  onToggleShowHandicapDetails: () => void;
  onScore: (winner: HoleWinner) => void;
  onScoreWithStrokes: (
    winner: HoleWinner,
    teamAStrokeScore: number,
    teamBStrokeScore: number
  ) => void;
  onFourballScore: (
    winner: HoleWinner,
    teamABestScore: number,
    teamBBestScore: number,
    teamAPlayerScores: PlayerHoleScore[],
    teamBPlayerScores: PlayerHoleScore[]
  ) => void;
  onUndo: () => void;
  onToggleShowAdvancedTools: () => void;
  onPress: (pressedBy: 'teamA' | 'teamB') => void;
}

interface MatchScoringActiveStateProps {
  scoring: ScoringContext;
  teams: TeamContext;
  preferences: ScoringUIPreferences;
  sideBets: SideBetContext;
  handlers: ScoringHandlers;
}

export function MatchScoringActiveState({
  scoring,
  teams,
  preferences,
  sideBets,
  handlers,
}: MatchScoringActiveStateProps) {
  const {
    isEditingScores,
    isMatchComplete,
    currentHole,
    currentHoleResult,
    currentPar,
    matchState,
    scoringMode,
    scoringModeMeta,
    isFourball,
    quickScoreMode,
    quickScorePendingTeam,
    isSaving,
    undoCount,
    presses,
  } = scoring;

  const {
    teamAName,
    teamBName,
    teamAColor,
    teamBColor,
    teamAHandicapAllowance,
    teamBHandicapAllowance,
    holeHandicaps,
    teamAFourballPlayers,
    teamBFourballPlayers,
    teamAPlayers,
    teamBPlayers,
  } = teams;

  const {
    preferredHand,
    showHandicapDetails,
    showScoringModeTip,
    showAdvancedTools,
    prefersReducedMotion,
  } = preferences;

  const {
    activeSideBets,
    activeMatchSideBets,
    currentTripId,
    currentPlayerIdForBets,
  } = sideBets;

  const {
    onFinishEditing,
    onPrevHole,
    onNextHole,
    onDismissScoringModeTip,
    onScoringModeChange,
    onQuickScoreTap,
    onToggleShowHandicapDetails,
    onScore,
    onScoreWithStrokes,
    onFourballScore,
    onUndo,
    onToggleShowAdvancedTools,
    onPress,
  } = handlers;

  return (
    <section className="space-y-4 py-[var(--space-6)]">
      {isEditingScores && isMatchComplete && (
        <div className="flex items-center justify-between gap-3 rounded-[22px] border border-[var(--gold)] bg-[var(--gold-subtle)] px-4 py-3">
          <div className="flex items-center gap-2">
            <Shield size={16} className="shrink-0 text-[var(--gold)]" />
            <p className="text-sm font-medium text-[var(--ink)]">
              Captain is correcting a completed card.
            </p>
          </div>
          <button
            onClick={onFinishEditing}
            className="rounded-full border border-[color:var(--rule)] bg-[color:var(--canvas)] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--ink)]"
          >
            Done
          </button>
        </div>
      )}

      <div className="card-editorial overflow-hidden">
        <div className="border-b border-[color:var(--rule)] px-4 py-4 sm:px-5">
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={onPrevHole}
              disabled={currentHole <= 1}
              className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-[color:var(--rule)] bg-[color:var(--canvas)] text-[var(--ink-secondary)] transition-transform active:scale-[0.96] disabled:opacity-30"
            >
              <ChevronLeft size={20} />
            </button>

            <div className="text-center">
              <p className="type-overline text-[var(--masters)]">Current hole</p>
              <p className="mt-1 font-serif text-[length:var(--text-2xl)] font-normal tracking-[-0.02em] text-[var(--ink)]">
                Hole {currentHole}
              </p>
              <p className="mt-1 text-sm text-[var(--ink-secondary)]">
                {currentHoleResult && currentHoleResult.winner !== 'none'
                  ? currentHoleResult.winner === 'halved'
                    ? 'Hole halved'
                    : currentHoleResult.winner === 'teamA'
                      ? `${teamAName} won`
                      : `${teamBName} won`
                  : `Par ${currentPar}`}
              </p>
            </div>

            <button
              onClick={onNextHole}
              disabled={currentHole >= 18}
              className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-[color:var(--rule)] bg-[color:var(--canvas)] text-[var(--ink-secondary)] transition-transform active:scale-[0.96] disabled:opacity-30"
            >
              <ChevronRight size={20} />
            </button>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <ScoringStatusBadge label={scoringModeMeta.label} tone="subtle" />
            <ScoringStatusBadge label={`Par ${currentPar}`} tone="muted" />
            {quickScoreMode && <ScoringStatusBadge label="Quick score armed" tone="subtle" />}
          </div>
        </div>

        <div className="space-y-4 px-4 py-4 sm:px-5 sm:py-5">
          <AnimatePresence initial={false}>
            {showScoringModeTip && (
              <motion.div
                initial={prefersReducedMotion ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="rounded-[22px] border border-[color:rgba(0,102,68,0.15)] bg-[linear-gradient(135deg,rgba(0,102,68,0.12)_0%,rgba(255,255,255,0.78)_100%)] px-4 py-3"
              >
                <div className="flex items-start gap-3">
                  <Sparkles size={16} className="mt-0.5 shrink-0 text-[var(--masters)]" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-[var(--ink)]">
                      Pick the mode that fits the moment.
                    </p>
                    <p className="mt-1 text-xs text-[var(--ink-secondary)]">
                      Swipe when pace matters, use strokes when the hole needs detail, and lean on
                      one-hand mode for pure on-course convenience.
                    </p>
                  </div>
                  <button
                    onClick={onDismissScoringModeTip}
                    className="rounded-full bg-[var(--masters)] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--canvas)]"
                  >
                    Close
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-3">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="type-overline text-[var(--ink-secondary)]">Scoring mode</p>
                <p className="mt-1 text-sm text-[var(--ink-secondary)]">
                  {scoringModeMeta.description}
                </p>
              </div>
              <p className="hidden text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ink-tertiary)] sm:block">
                {scoringModeMeta.note}
              </p>
            </div>

            <div className="overflow-x-auto">
              <div className="inline-flex min-w-full gap-2 rounded-[22px] border border-[color:var(--rule)] bg-[color:var(--canvas-sunken)] px-2 py-2">
                <ScoringModeChip
                  label="Swipe"
                  active={scoringMode === 'swipe'}
                  onClick={() => onScoringModeChange('swipe')}
                />
                <ScoringModeChip
                  label="Buttons"
                  active={scoringMode === 'buttons'}
                  onClick={() => onScoringModeChange('buttons')}
                />
                {!isFourball && (
                  <ScoringModeChip
                    label="Strokes"
                    active={scoringMode === 'strokes'}
                    onClick={() => onScoringModeChange('strokes')}
                  />
                )}
                {isFourball && (
                  <ScoringModeChip
                    label="Best Ball"
                    active={scoringMode === 'fourball'}
                    onClick={() => onScoringModeChange('fourball')}
                  />
                )}
                <ScoringModeChip
                  label="One-Hand"
                  active={scoringMode === 'oneHanded'}
                  onClick={() => onScoringModeChange('oneHanded')}
                />
              </div>
            </div>
          </div>

          {quickScoreMode && (
            <div className="grid grid-cols-2 gap-3">
              <QuickScoreTile
                teamName={teamAName}
                teamColor={teamAColor}
                pending={quickScorePendingTeam === 'teamA'}
                onClick={() => onQuickScoreTap('teamA')}
              />
              <QuickScoreTile
                teamName={teamBName}
                teamColor={teamBColor}
                pending={quickScorePendingTeam === 'teamB'}
                onClick={() => onQuickScoreTap('teamB')}
              />
              {quickScorePendingTeam && (
                <p className="col-span-2 text-center text-xs text-[var(--ink-tertiary)]">
                  Quick score armed for {quickScorePendingTeam === 'teamA' ? teamAName : teamBName}.
                </p>
              )}
            </div>
          )}

          {!isFourball && (teamAHandicapAllowance > 0 || teamBHandicapAllowance > 0) && (
            <button onClick={onToggleShowHandicapDetails} className="w-full">
              <HandicapStrokeIndicator
                currentHole={currentHole}
                teamAStrokes={teamAHandicapAllowance}
                teamBStrokes={teamBHandicapAllowance}
                holeHandicaps={holeHandicaps}
                teamAName={teamAName}
                teamBName={teamBName}
                showAllHoles={showHandicapDetails}
              />
            </button>
          )}

          <AnimatePresence mode="wait">
            {scoringMode === 'swipe' ? (
              <motion.div
                key="swipe"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <SwipeScorePanel
                  holeNumber={currentHole}
                  teamAName={teamAName}
                  teamBName={teamBName}
                  teamAColor={teamAColor}
                  teamBColor={teamBColor}
                  currentScore={matchState.currentScore}
                  existingResult={currentHoleResult?.winner}
                  onScore={onScore}
                  disabled={isSaving}
                />
              </motion.div>
            ) : scoringMode === 'strokes' ? (
              <motion.div
                key="strokes"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <StrokeScoreEntry
                  holeNumber={currentHole}
                  par={currentPar}
                  teamAName={teamAName}
                  teamBName={teamBName}
                  teamAColor={teamAColor}
                  teamBColor={teamBColor}
                  teamAHandicapStrokes={teamAHandicapAllowance}
                  teamBHandicapStrokes={teamBHandicapAllowance}
                  holeHandicaps={holeHandicaps}
                  initialTeamAScore={currentHoleResult?.teamAStrokes || null}
                  initialTeamBScore={currentHoleResult?.teamBStrokes || null}
                  onSubmit={onScoreWithStrokes}
                  isSubmitting={isSaving}
                />
                {currentHoleResult &&
                  (currentHoleResult.teamAStrokes || currentHoleResult.teamBStrokes) && (
                    <div className="mt-4 rounded-[20px] border border-[color:var(--rule)] bg-[color:var(--canvas-sunken)] px-4 py-3">
                      <p className="text-center text-xs text-[var(--ink-tertiary)]">
                        Previous score: {teamAName} {currentHoleResult.teamAStrokes} -{' '}
                        {currentHoleResult.teamBStrokes} {teamBName}
                      </p>
                    </div>
                  )}
              </motion.div>
            ) : scoringMode === 'fourball' ? (
              <motion.div
                key="fourball"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <FourballScoreEntry
                  holeNumber={currentHole}
                  par={currentPar}
                  teamAName={teamAName}
                  teamBName={teamBName}
                  teamAColor={teamAColor}
                  teamBColor={teamBColor}
                  teamAPlayers={teamAFourballPlayers}
                  teamBPlayers={teamBFourballPlayers}
                  holeHandicaps={holeHandicaps}
                  initialTeamAScores={currentHoleResult?.teamAPlayerScores}
                  initialTeamBScores={currentHoleResult?.teamBPlayerScores}
                  onSubmit={onFourballScore}
                  isSubmitting={isSaving}
                />
              </motion.div>
            ) : scoringMode === 'oneHanded' ? (
              <motion.div
                key="oneHanded"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <OneHandedScoringPanel
                  holeNumber={currentHole}
                  teamAName={teamAName}
                  teamBName={teamBName}
                  teamAColor={teamAColor}
                  teamBColor={teamBColor}
                  existingResult={currentHoleResult?.winner}
                  onScore={onScore}
                  onPrevHole={onPrevHole}
                  onNextHole={onNextHole}
                  onUndo={onUndo}
                  canUndo={undoCount > 0}
                  disabled={isSaving}
                  preferredHand={preferredHand}
                  currentScore={matchState.currentScore}
                  holesPlayed={matchState.holesPlayed}
                />
              </motion.div>
            ) : (
              <motion.div
                key="buttons"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="grid grid-cols-3 gap-3"
              >
                <button
                  onClick={() => onScore('teamA')}
                  disabled={isSaving}
                  className={cn(
                    'rounded-[24px] border px-4 py-5 text-left font-sans transition-transform active:scale-[0.98]',
                    currentHoleResult?.winner === 'teamA'
                      ? 'border-[color:var(--gold)]'
                      : 'border-transparent'
                  )}
                  style={{
                    background:
                      'linear-gradient(180deg, var(--team-usa) 0%, rgba(20,92,163,0.9) 100%)',
                    color: 'var(--canvas)',
                    opacity: isSaving ? 0.5 : 1,
                  }}
                  aria-pressed={currentHoleResult?.winner === 'teamA'}
                  aria-label={`Score hole: ${teamAName} wins${currentHoleResult?.winner === 'teamA' ? ' (selected)' : ''}`}
                >
                  <span className="block text-[length:var(--text-lg)] font-semibold">{teamAName}</span>
                  <span className="mt-1 block text-[length:var(--text-xs)] opacity-80">wins hole</span>
                </button>

                <button
                  onClick={() => onScore('halved')}
                  disabled={isSaving}
                  className={cn(
                    'rounded-[24px] border px-4 py-5 font-sans transition-transform active:scale-[0.98]',
                    currentHoleResult?.winner === 'halved'
                      ? 'border-[color:var(--gold)]'
                      : 'border-[color:var(--rule)]'
                  )}
                  style={{
                    background: 'var(--canvas-raised)',
                    opacity: isSaving ? 0.5 : 1,
                  }}
                  aria-pressed={currentHoleResult?.winner === 'halved'}
                  aria-label={`Score hole: Halved${currentHoleResult?.winner === 'halved' ? ' (selected)' : ''}`}
                >
                  <span className="block text-[length:var(--text-lg)] font-semibold text-[var(--ink)]">
                    Halve
                  </span>
                  <span className="mt-1 block text-[length:var(--text-xs)] text-[var(--ink-tertiary)]">
                    tie hole
                  </span>
                </button>

                <button
                  onClick={() => onScore('teamB')}
                  disabled={isSaving}
                  className={cn(
                    'rounded-[24px] border px-4 py-5 text-right font-sans transition-transform active:scale-[0.98]',
                    currentHoleResult?.winner === 'teamB'
                      ? 'border-[color:var(--gold)]'
                      : 'border-transparent'
                  )}
                  style={{
                    background:
                      'linear-gradient(180deg, var(--team-europe) 0%, rgba(132,41,61,0.92) 100%)',
                    color: 'var(--canvas)',
                    opacity: isSaving ? 0.5 : 1,
                  }}
                  aria-pressed={currentHoleResult?.winner === 'teamB'}
                  aria-label={`Score hole: ${teamBName} wins${currentHoleResult?.winner === 'teamB' ? ' (selected)' : ''}`}
                >
                  <span className="block text-[length:var(--text-lg)] font-semibold">{teamBName}</span>
                  <span className="mt-1 block text-[length:var(--text-xs)] opacity-80">wins hole</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="card-editorial overflow-hidden">
        <button
          onClick={onToggleShowAdvancedTools}
          className="flex w-full items-center justify-between px-4 py-4 sm:px-5"
          aria-expanded={showAdvancedTools}
          aria-controls="advanced-scoring-tools"
        >
          <div className="text-left">
            <p className="type-overline text-[var(--ink-secondary)]">Advanced tools</p>
            <p className="mt-1 text-sm text-[var(--ink-secondary)]">
              Presses, inside games, stats, and awards live here.
            </p>
          </div>
          <ChevronRight
            size={18}
            className={cn(
              'text-[var(--ink-tertiary)] transition-transform',
              showAdvancedTools && 'rotate-90'
            )}
          />
        </button>

        {showAdvancedTools && (
          <div
            id="advanced-scoring-tools"
            className="space-y-4 border-t border-[color:var(--rule)] px-4 py-4 sm:px-5"
          >
            <PressTracker
              currentHole={currentHole}
              mainMatchScore={matchState.currentScore}
              holesRemaining={matchState.holesRemaining}
              presses={presses}
              onPress={onPress}
              teamAName={teamAName}
              teamBName={teamBName}
              betAmount={10}
              autoPress={false}
            />

            {currentTripId ? (
              <MatchInsideGamesPanel
                tripId={currentTripId}
                match={matchState.match}
                teamAName={teamAName}
                teamBName={teamBName}
                teamAPlayers={teamAPlayers}
                teamBPlayers={teamBPlayers}
                sideBets={activeMatchSideBets}
              />
            ) : null}

            {currentTripId ? (
              <MatchTripMomentsPanel
                tripId={currentTripId}
                match={matchState.match}
                players={[...teamAPlayers, ...teamBPlayers]}
                recordedByPlayerId={currentPlayerIdForBets}
              />
            ) : null}

            <SideBetReminder
              currentHole={currentHole}
              bets={activeSideBets}
              currentPlayerId={currentPlayerIdForBets}
            />
          </div>
        )}
      </div>
    </section>
  );
}
