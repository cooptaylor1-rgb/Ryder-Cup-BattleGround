import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Flag, Gauge, Shield, Sparkles } from 'lucide-react';
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
  currentStrokeIndex: number;
  currentYardage?: number;
  matchState: MatchState;
  scoringMode: ScoringMode;
  scoringModeMeta: ScoringModeMeta;
  isFourball: boolean;
  quickScoreMode: boolean;
  quickScorePendingTeam?: 'teamA' | 'teamB';
  isSaving: boolean;
  undoCount: number;
  presses: Press[];
  sessionLeaderboard: Array<{
    matchId: string;
    matchOrder: number;
    displayScore: string;
    currentScore: number;
    holesPlayed: number;
    holesRemaining: number;
    status: MatchState['status'];
    teamALineup: string;
    teamBLineup: string;
  }>;
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
    currentStrokeIndex,
    currentYardage,
    matchState,
    scoringMode,
    scoringModeMeta,
    isFourball,
    quickScoreMode,
    quickScorePendingTeam,
    isSaving,
    undoCount,
    presses,
    sessionLeaderboard,
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

  const { activeSideBets, activeMatchSideBets, currentTripId, currentPlayerIdForBets } = sideBets;

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

  const currentHoleOutcome =
    currentHoleResult && currentHoleResult.winner !== 'none'
      ? currentHoleResult.winner === 'halved'
        ? 'Recorded halved'
        : currentHoleResult.winner === 'teamA'
          ? `${teamAName} won this hole`
          : `${teamBName} won this hole`
      : 'Awaiting score';
  const leaderName =
    matchState.currentScore > 0 ? teamAName : matchState.currentScore < 0 ? teamBName : undefined;
  const liveScoreLabel = leaderName
    ? `${leaderName} ${Math.abs(matchState.currentScore)} up`
    : 'All square';
  const currentHoleFacts = [
    { label: 'Par', value: currentPar, icon: Flag },
    { label: 'Stroke index', value: currentStrokeIndex, icon: Gauge },
    { label: 'Yardage', value: currentYardage ? currentYardage : '—', icon: Flag },
  ];

  return (
    <section className="space-y-4 py-[var(--space-6)] pb-[calc(112px+env(safe-area-inset-bottom,0px))] lg:pb-[var(--space-6)]">
      {isEditingScores && isMatchComplete && (
        <div className="flex items-center justify-between gap-3 rounded-[22px] border border-[var(--gold)] bg-[var(--gold-subtle)] px-4 py-3">
          <div className="flex items-center gap-2">
            <Shield size={16} className="shrink-0 text-[var(--gold)]" />
            <p className="text-sm font-medium text-[var(--ink)]">
              Captain is correcting a completed card.
            </p>
          </div>
          <button
            type="button"
            onClick={onFinishEditing}
            className="rounded-full border border-[color:var(--rule)] bg-[color:var(--canvas)] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--gold-subtle)]"
          >
            Done
          </button>
        </div>
      )}

      <div className="card-editorial overflow-hidden border-2 border-[color:var(--masters)]/10">
        <div className="border-b border-[color:var(--rule)] bg-[linear-gradient(180deg,var(--surface-raised)_0%,var(--canvas)_100%)] px-4 py-4 sm:px-5">
          <div className="flex items-start justify-between gap-3">
            <button
              type="button"
              onClick={onPrevHole}
              disabled={currentHole <= 1}
              className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[color:var(--rule)] bg-[color:var(--canvas)] text-[var(--ink-secondary)] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--canvas)] active:scale-[0.96] disabled:cursor-not-allowed disabled:opacity-30"
              aria-label="Previous hole"
            >
              <ChevronLeft size={20} />
            </button>

            <div className="min-w-0 flex-1 text-center">
              <p className="type-overline text-[var(--masters)]">Score this hole</p>
              <p className="mt-1 font-serif text-[length:var(--text-4xl)] font-normal leading-none text-[var(--ink)]">
                Hole {currentHole}
              </p>
              <p className="mt-2 text-sm font-medium text-[var(--ink-secondary)]">
                {currentHoleOutcome}
              </p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ink-tertiary)]">
                {liveScoreLabel} · Through {matchState.holesPlayed}
              </p>
            </div>

            <button
              type="button"
              onClick={onNextHole}
              disabled={currentHole >= 18}
              className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[color:var(--rule)] bg-[color:var(--canvas)] text-[var(--ink-secondary)] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--canvas)] active:scale-[0.96] disabled:cursor-not-allowed disabled:opacity-30"
              aria-label="Next hole"
            >
              <ChevronRight size={20} />
            </button>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            {currentHoleFacts.map(({ label, value, icon: Icon }) => (
              <div
                key={label}
                className="min-w-0 rounded-[18px] border border-[color:var(--rule)]/75 bg-[color:var(--canvas)]/78 px-3 py-3 text-center"
              >
                <Icon size={14} className="mx-auto text-[var(--ink-tertiary)]" />
                <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-tertiary)]">
                  {label}
                </p>
                <p className="mt-1 truncate text-sm font-semibold text-[var(--ink)]">{value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4 px-4 py-4 sm:px-5 sm:py-5">
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
            <button
              type="button"
              onClick={onToggleShowHandicapDetails}
              className="w-full rounded-[22px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--canvas)]"
            >
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
                  par={currentPar}
                  strokeIndex={currentStrokeIndex}
                  yardage={currentYardage}
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
                className="grid grid-cols-[minmax(0,1fr)_4.75rem_minmax(0,1fr)] gap-2 sm:grid-cols-3 sm:gap-3"
              >
                <button
                  type="button"
                  onClick={() => onScore('teamA')}
                  disabled={isSaving}
                  className={cn(
                    'min-h-[92px] min-w-0 overflow-hidden rounded-[22px] border px-3 py-4 text-left font-sans shadow-card-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--canvas)] active:scale-[0.98] disabled:cursor-not-allowed sm:px-4 sm:py-5',
                    currentHoleResult?.winner === 'teamA'
                      ? 'border-[color:var(--gold)] ring-2 ring-[var(--gold)] ring-offset-2 ring-offset-[var(--canvas)]'
                      : 'border-transparent'
                  )}
                  style={{
                    background: `linear-gradient(180deg, ${teamAColor} 0%, color-mix(in srgb, ${teamAColor} 88%, var(--ink)) 100%)`,
                    color: 'var(--canvas)',
                    opacity: isSaving ? 0.5 : 1,
                  }}
                  aria-pressed={currentHoleResult?.winner === 'teamA'}
                  aria-label={`Score hole: ${teamAName} wins${currentHoleResult?.winner === 'teamA' ? ' (selected)' : ''}`}
                >
                  <span
                    className="block truncate text-[length:var(--text-lg)] font-semibold"
                    title={teamAName}
                  >
                    {teamAName}
                  </span>
                  <span className="mt-1 block text-[length:var(--text-xs)] opacity-80">
                    wins hole
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => onScore('halved')}
                  disabled={isSaving}
                  className={cn(
                    'min-h-[92px] min-w-0 rounded-[22px] border px-2 py-4 font-sans shadow-card-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--canvas)] active:scale-[0.98] disabled:cursor-not-allowed sm:px-4 sm:py-5',
                    currentHoleResult?.winner === 'halved'
                      ? 'border-[color:var(--gold)] ring-2 ring-[var(--gold)] ring-offset-2 ring-offset-[var(--canvas)]'
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
                    tie the hole
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => onScore('teamB')}
                  disabled={isSaving}
                  className={cn(
                    'min-h-[92px] min-w-0 overflow-hidden rounded-[22px] border px-3 py-4 text-right font-sans shadow-card-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--canvas)] active:scale-[0.98] disabled:cursor-not-allowed sm:px-4 sm:py-5',
                    currentHoleResult?.winner === 'teamB'
                      ? 'border-[color:var(--gold)] ring-2 ring-[var(--gold)] ring-offset-2 ring-offset-[var(--canvas)]'
                      : 'border-transparent'
                  )}
                  style={{
                    background: `linear-gradient(180deg, ${teamBColor} 0%, color-mix(in srgb, ${teamBColor} 88%, var(--ink)) 100%)`,
                    color: 'var(--canvas)',
                    opacity: isSaving ? 0.5 : 1,
                  }}
                  aria-pressed={currentHoleResult?.winner === 'teamB'}
                  aria-label={`Score hole: ${teamBName} wins${currentHoleResult?.winner === 'teamB' ? ' (selected)' : ''}`}
                >
                  <span
                    className="block truncate text-[length:var(--text-lg)] font-semibold"
                    title={teamBName}
                  >
                    {teamBName}
                  </span>
                  <span className="mt-1 block text-[length:var(--text-xs)] opacity-80">
                    wins hole
                  </span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="rounded-[22px] border border-[color:var(--rule)]/75 bg-[color:var(--canvas-sunken)] px-3 py-3">
            <div className="flex items-start justify-between gap-3 px-1">
              <div className="min-w-0">
                <p className="type-overline text-[var(--ink-secondary)]">Entry style</p>
                <p className="mt-1 text-sm text-[var(--ink-secondary)]">
                  {scoringModeMeta.description}
                </p>
              </div>
              <ScoringStatusBadge label={scoringModeMeta.note} tone="muted" />
            </div>

            <div className="mt-3 overflow-x-auto">
              <div
                className="inline-flex min-w-full gap-2 rounded-[20px] bg-[color:var(--canvas)] px-2 py-2"
                role="group"
                aria-label="Scoring mode"
              >
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

          <AnimatePresence initial={false}>
            {showScoringModeTip && (
              <motion.div
                initial={prefersReducedMotion ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="rounded-[22px] border border-[color:rgba(0,102,68,0.15)] bg-[linear-gradient(135deg,rgba(0,102,68,0.10)_0%,rgba(255,255,255,0.74)_100%)] px-4 py-3"
              >
                <div className="flex items-start gap-3">
                  <Sparkles size={16} className="mt-0.5 shrink-0 text-[var(--masters)]" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-[var(--ink)]">
                      Tune the input, keep the score visible.
                    </p>
                    <p className="mt-1 text-xs text-[var(--ink-secondary)]">
                      Winner taps stay front and center. Switch entry style only when the card needs
                      strokes or one-handed controls.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={onDismissScoringModeTip}
                    className="min-h-10 rounded-full bg-[var(--masters)] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--canvas)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--canvas)] active:scale-[0.98]"
                  >
                    Close
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <SessionLeaderboardPanel
        rows={sessionLeaderboard}
        activeMatchId={matchState.match.id}
        teamAName={teamAName}
        teamBName={teamBName}
      />

      <div className="card-editorial overflow-hidden">
        <button
          type="button"
          onClick={onToggleShowAdvancedTools}
          className="flex w-full items-center justify-between px-4 py-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--focus-ring)] sm:px-5"
          aria-expanded={showAdvancedTools}
          aria-controls="advanced-scoring-tools"
        >
          <div className="text-left">
            <p className="type-overline text-[var(--ink-secondary)]">Advanced tools</p>
            <p className="mt-1 text-sm text-[var(--ink-secondary)]">
              Presses, side games, stats, and awards.
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

function SessionLeaderboardPanel({
  rows,
  activeMatchId,
  teamAName,
  teamBName,
}: {
  rows: ScoringContext['sessionLeaderboard'];
  activeMatchId: string;
  teamAName: string;
  teamBName: string;
}) {
  if (rows.length === 0) return null;

  return (
    <div className="card-editorial overflow-hidden">
      <div className="border-b border-[color:var(--rule)] px-4 py-4 sm:px-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="type-overline text-[var(--ink-secondary)]">Session leaderboard</p>
            <p className="mt-1 text-sm text-[var(--ink-secondary)]">
              Live match positions without leaving the card.
            </p>
          </div>
          <ScoringStatusBadge label={`${rows.length} matches`} tone="muted" />
        </div>
      </div>
      <div className="divide-y divide-[color:var(--rule)]/70">
        {rows.slice(0, 6).map((row) => {
          const isActive = row.matchId === activeMatchId;
          const leader =
            row.currentScore > 0
              ? teamAName
              : row.currentScore < 0
                ? teamBName
                : row.holesPlayed > 0
                  ? 'All square'
                  : 'Opening tee';

          return (
            <div
              key={row.matchId}
              className={cn(
                'grid grid-cols-[minmax(0,1fr)_auto] gap-3 px-4 py-3 sm:px-5',
                isActive && 'bg-[color:var(--masters)]/8'
              )}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-tertiary)]">
                    Match {row.matchOrder}
                  </p>
                  {isActive ? (
                    <span className="rounded-full bg-[color:var(--masters)]/12 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--masters)]">
                      Scoring now
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 truncate text-sm font-semibold text-[var(--ink)]">
                  {row.teamALineup || teamAName}
                </p>
                <p className="mt-0.5 truncate text-sm text-[var(--ink-secondary)]">
                  {row.teamBLineup || teamBName}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p
                  className={cn(
                    'font-serif text-[length:var(--text-xl)] leading-none',
                    row.currentScore > 0
                      ? 'text-[var(--team-usa)]'
                      : row.currentScore < 0
                        ? 'text-[var(--team-europe)]'
                        : 'text-[var(--ink-tertiary)]'
                  )}
                >
                  {row.displayScore}
                </p>
                <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-tertiary)]">
                  {row.holesPlayed > 0 ? `Thru ${row.holesPlayed}` : 'Not started'}
                </p>
                <p className="mt-0.5 text-[11px] text-[var(--ink-secondary)]">{leader}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
