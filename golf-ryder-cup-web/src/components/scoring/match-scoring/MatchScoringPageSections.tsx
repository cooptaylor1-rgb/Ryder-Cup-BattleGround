/**
 * MatchScoringPageSections — v2 cockpit composition.
 *
 * Phase 1 redesign: this file is now a thin shell that wires the new
 * cockpit (header + cockpit body + drawer) to the existing model and
 * action hooks. Empty / loading / error states are unchanged.
 *
 * What used to render here as a single 14-section dashboard now renders
 * as three coherent zones:
 *   - CockpitHeader (sticky, slim)
 *   - MatchCockpit (hole hero + score input + hole pager)
 *   - ScoringDrawer (Match | Standings | Bets — collapsible)
 */

import { lazy, Suspense, useState, type ReactNode } from 'react';
import { AnimatePresence } from 'framer-motion';

import type { MatchState } from '@/lib/types/computed';
import type { Press } from '@/components/scoring';
import { ScoreToast } from '@/components/scoring';
import type { ScoringPreferences } from '@/lib/types/scoringPreferences';
import { StickyUndoBanner, WeatherAlerts } from '@/components/live-play';
import { EmptyStatePremium, ErrorEmpty, PageLoadingSkeleton } from '@/components/ui';

import { MatchScoringCompleteState } from './MatchScoringCompleteState';
import { MatchScoringSupportLayer } from './MatchScoringSupportLayer';
import { countHalvedHoles } from './matchScoringReport';
import type { MatchScoringPageModel } from './matchScoringPageModel';
import type { ScoringMode } from './matchScoringShared';
import type { MatchScoringPageActions } from './useMatchScoringPageActions';
import type { MatchScoringPageUiState } from './useMatchScoringPageUiState';
import {
  CockpitHeader,
  CockpitOverflowSheet,
  MatchCockpit,
  ScoringDrawer,
} from './v2';
import { LiveRegion } from './v2/LiveRegion';
import { useCockpitShortcuts } from './v2/useCockpitShortcuts';

const ScoreCelebration = lazy(() =>
  import('@/components/scoring').then((mod) => ({ default: mod.ScoreCelebration }))
);

export function MatchScoringUnauthenticatedState({
  onSignIn,
  onBackToScore,
}: {
  onSignIn: () => void;
  onBackToScore: () => void;
}) {
  return (
    <div className="min-h-screen page-premium-enter texture-grain bg-canvas font-sans">
      <main className="container-editorial py-12">
        <EmptyStatePremium
          illustration="scorecard"
          title="Sign in to score this match"
          description="Match scoring is available after you sign in."
          action={{
            label: 'Sign In',
            onClick: onSignIn,
          }}
          secondaryAction={{
            label: 'Back to Score',
            onClick: onBackToScore,
          }}
          variant="large"
        />
      </main>
    </div>
  );
}

export function MatchScoringLoadingState() {
  return <PageLoadingSkeleton title="Scoring" variant="detail" />;
}

export function MatchScoringErrorState({
  error,
  onRetry,
  onBackToScore,
}: {
  error: string;
  onRetry: () => void;
  onBackToScore: () => void;
}) {
  return (
    <div className="min-h-screen page-premium-enter texture-grain bg-canvas font-sans" role="alert">
      <main className="container-editorial py-12">
        <ErrorEmpty message={error} onRetry={onRetry} />
        <div className="mt-4 flex justify-center">
          <button
            onClick={onBackToScore}
            className="px-4 py-2 rounded-xl font-medium bg-canvas-raised border border-rule font-sans"
          >
            Back to Score
          </button>
        </div>
      </main>
    </div>
  );
}

export function MatchScoringUnavailableState({ onBackToScore }: { onBackToScore: () => void }) {
  return (
    <div className="min-h-screen page-premium-enter texture-grain bg-canvas font-sans" role="alert">
      <main className="container-editorial py-12">
        <EmptyStatePremium
          illustration="flag"
          title="Match unavailable"
          description="This match may have been deleted or hasn't synced yet."
          action={{ label: 'Back to Score', onClick: onBackToScore }}
          variant="large"
        />
      </main>
    </div>
  );
}

export function PracticeMatchEmptyState({
  matchId,
  onBackToScore,
  onOpenBets,
  onNewBet,
}: {
  matchId: string;
  onBackToScore: () => void;
  onOpenBets: () => void;
  onNewBet?: () => void;
}) {
  const primary = onNewBet
    ? { label: 'New bet on this group', onClick: onNewBet }
    : { label: 'Open bets', onClick: onOpenBets };
  const secondary = onNewBet
    ? { label: 'All bets', onClick: onOpenBets }
    : { label: 'Back to Score', onClick: onBackToScore };

  return (
    <div className="min-h-screen page-premium-enter texture-grain bg-canvas font-sans">
      <main className="container-editorial py-12">
        <EmptyStatePremium
          illustration="flag"
          title="Practice round — no cup points"
          description={
            'Warm-up groups sit outside the Ryder Cup standings. Attach a side bet — skins, CTP, long drive, nassau — to score this group hole-by-hole.'
          }
          action={primary}
          secondaryAction={secondary}
          variant="large"
        />
        <p className="mt-6 text-center text-xs text-[var(--ink-tertiary)]">Match id: {matchId}</p>
      </main>
    </div>
  );
}

interface MatchScoringPageSectionsProps {
  matchId: string;
  currentTripId?: string;
  matchOrder: number;
  matchState: MatchState;
  currentHole: number;
  currentHoleResult: MatchScoringPageModel['currentHoleResult'];
  model: MatchScoringPageModel;
  ui: MatchScoringPageUiState;
  actions: MatchScoringPageActions;
  presses: Press[];
  isSaving: boolean;
  isOnline: boolean;
  undoCount: number;
  isCaptainMode: boolean;
  prefersReducedMotion: boolean;
  preferredHand: ScoringPreferences['preferredHand'];
  confirmDialog: ReactNode;
  onBackToScore: () => void;
  onHoleSelect: (holeNumber: number) => void;
  onPrevHole: () => void;
  onNextHole: () => void;
  onPress: (pressedBy: 'teamA' | 'teamB') => void;
  onScoringModeChange: (mode: ScoringMode) => void;
  onStrokeAlertShown: (_hole: number, aStrokes: number, bStrokes: number) => void;
  onOpenVoiceModal: () => void;
  onCloseVoiceModal: () => void;
  onViewStandings: () => void;
  onScoreNextMatch: (matchId: string) => void;
  onBackToMatches: () => void;
  onEditScores: () => void;
  onSelectMatch: (matchId: string) => void;
}

export function MatchScoringPageSections({
  matchId,
  currentTripId,
  matchOrder,
  matchState,
  currentHole,
  currentHoleResult,
  model,
  ui,
  actions,
  presses,
  isSaving,
  isOnline,
  undoCount,
  isCaptainMode,
  prefersReducedMotion,
  preferredHand,
  confirmDialog,
  onBackToScore,
  onHoleSelect,
  onPrevHole,
  onNextHole,
  onPress,
  onScoringModeChange,
  onStrokeAlertShown,
  onOpenVoiceModal,
  onCloseVoiceModal,
  onViewStandings,
  onScoreNextMatch,
  onBackToMatches,
  onEditScores,
  onSelectMatch,
}: MatchScoringPageSectionsProps) {
  const [overflowOpen, setOverflowOpen] = useState(false);

  // Phase 5 power-user shortcuts. Disabled when match is complete (the
  // recap and complete-state surfaces are read-only, so navigation
  // shortcuts would be confusing).
  useCockpitShortcuts({
    onPrevHole,
    onNextHole,
    onJumpToHole: onHoleSelect,
    onUndo: actions.handleUndo,
    onOpenScorecard: () => {
      if (typeof window !== 'undefined') {
        window.location.assign(`/score/${matchId}/scorecard`);
      }
    },
  });

  // Derive a single live status line for the header. This is the only
  // place the match score should appear above the cockpit body — v1
  // rendered it three times.
  const matchScoreLabel =
    matchState.currentScore === 0
      ? 'All square'
      : matchState.currentScore > 0
        ? `${model.teamAName} ${matchState.currentScore}UP`
        : `${model.teamBName} ${Math.abs(matchState.currentScore)}UP`;
  const matchProgressLabel =
    matchState.holesPlayed === 0
      ? 'Opening tee'
      : matchState.holesRemaining === 0 || model.isMatchComplete
        ? `${matchState.holesPlayed}/18`
        : `Thru ${matchState.holesPlayed}`;

  const saveState: 'idle' | 'saving' | 'saved' | 'offline' = ui.savingIndicator
    ? ui.savingIndicator === 'Saving score...'
      ? 'saving'
      : ui.savingIndicator === 'Saved on this device'
        ? 'offline'
        : 'saved'
    : isOnline
      ? 'idle'
      : 'offline';

  return (
    <div className="min-h-screen page-premium-enter texture-grain bg-[var(--canvas)] font-sans">
      <AnimatePresence>
        {ui.celebration && (
          <Suspense
            fallback={
              <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-[color:var(--ink)]/35"
                role="status"
                aria-live="polite"
                aria-label="Loading celebration"
              >
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-canvas border border-rule">
                  <span className="w-3 h-3 border-2 border-masters border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm text-ink-secondary">Loading…</span>
                </div>
              </div>
            }
          >
            <ScoreCelebration
              type={ui.celebration.type}
              winner={ui.celebration.winner}
              teamName={ui.celebration.teamName}
              teamColor={ui.celebration.teamColor}
              holeNumber={ui.celebration.holeNumber}
              finalScore={ui.celebration.finalScore}
              show={true}
              onComplete={() => ui.setCelebration(null)}
              duration={ui.celebration.type === 'matchWon' ? 3500 : 1500}
            />
          </Suspense>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {ui.toast && (
          <ScoreToast
            message={ui.toast.message}
            type={ui.toast.type}
            show={true}
            onComplete={() => ui.setToast(null)}
          />
        )}
      </AnimatePresence>

      {/* Undo banner sits above the drawer peek strip. */}
      <StickyUndoBanner
        action={ui.undoAction}
        duration={8000}
        bottomOffset={72}
        onDismiss={() => ui.setUndoAction(null)}
      />

      {/* Voice modal + stroke alerts. We deliberately strip the floating
          camera FAB and floating Voice FAB here — voice is now an action
          in the overflow sheet, photos move to the trip moments tab. */}
      <MatchScoringSupportLayerSlim
        isMatchComplete={model.isMatchComplete}
        showVoiceModal={ui.showVoiceModal}
        currentHole={currentHole}
        teamAName={model.teamAName}
        teamBName={model.teamBName}
        teamAHandicapAllowance={model.matchHandicapContext.teamAHandicapAllowance}
        teamBHandicapAllowance={model.matchHandicapContext.teamBHandicapAllowance}
        holeHandicaps={model.holeHandicaps}
        showTeamStrokeAlerts={!model.isFourball}
        onCloseVoiceModal={onCloseVoiceModal}
        onVoiceScoreConfirmed={actions.handleVoiceScore}
        onStrokeAlertShown={onStrokeAlertShown}
      />

      <LiveRegion
        matchState={matchState}
        currentHole={currentHole}
        currentPar={model.currentPar}
        currentStrokeIndex={model.currentStrokeIndex}
        teamAName={model.teamAName}
        teamBName={model.teamBName}
        saveState={saveState}
        totalHoles={model.totalHoles}
      />

      <CockpitHeader
        matchOrder={matchOrder}
        sessionLabel={model.currentSession ? model.currentSession.sessionType : 'Match play'}
        teamAName={model.teamAName}
        teamBName={model.teamBName}
        teamAColor={model.teamAColor}
        teamBColor={model.teamBColor}
        teamALineup={model.teamALineup}
        teamBLineup={model.teamBLineup}
        matchScoreLabel={matchScoreLabel}
        matchProgressLabel={matchProgressLabel}
        isMatchComplete={model.isMatchComplete}
        isSaving={isSaving}
        saveState={saveState}
        undoCount={undoCount}
        onBack={onBackToScore}
        onUndo={actions.handleUndo}
        onOpenOverflow={() => setOverflowOpen(true)}
      />

      <main className="container-editorial">
        <WeatherAlertsBar />

        {!model.isMatchComplete || ui.isEditingScores ? (
          <MatchCockpit
            scoring={{
              matchState,
              currentHole,
              currentHoleResult,
              currentPar: model.currentPar,
              currentStrokeIndex: model.currentStrokeIndex,
              currentYardage: model.currentYardage,
              scoringMode: model.effectiveScoringMode,
              scoringModeMeta: model.scoringModeMeta,
              isFourball: model.isFourball,
              isMatchComplete: model.isMatchComplete,
              isEditingScores: ui.isEditingScores,
              isSaving,
              undoCount,
              presses,
              sessionLeaderboard: model.sessionLeaderboard,
              totalHoles: model.totalHoles,
              strokesByHole: model.strokesByHole,
            }}
            teams={{
              teamAName: model.teamAName,
              teamBName: model.teamBName,
              teamAColor: model.teamAColor,
              teamBColor: model.teamBColor,
              teamALineup: model.teamALineup,
              teamBLineup: model.teamBLineup,
              teamAHandicapAllowance: model.matchHandicapContext.teamAHandicapAllowance,
              teamBHandicapAllowance: model.matchHandicapContext.teamBHandicapAllowance,
              holeHandicaps: model.holeHandicaps,
              teamAFourballPlayers: model.teamAFourballPlayers,
              teamBFourballPlayers: model.teamBFourballPlayers,
              teamAPlayers: model.teamAPlayers,
              teamBPlayers: model.teamBPlayers,
            }}
            preferences={{
              preferredHand,
              prefersReducedMotion,
            }}
            handlers={{
              onPrevHole,
              onNextHole,
              onScore: actions.handleScore,
              onScoreWithStrokes: actions.handleScoreWithStrokes,
              onFourballScore: actions.handleFourballScore,
              onUndo: actions.handleUndo,
              onPress,
              onScoringModeChange,
              onFinishEditing: () => ui.setIsEditingScores(false),
              onJumpToHole: onHoleSelect,
            }}
            isCaptainMode={isCaptainMode}
          />
        ) : (
          <MatchScoringCompleteState
            confettiPieces={ui.confettiPieces}
            prefersReducedMotion={prefersReducedMotion}
            winningTeam={matchState.winningTeam}
            displayScore={matchState.displayScore}
            teamAHolesWon={matchState.teamAHolesWon}
            teamBHolesWon={matchState.teamBHolesWon}
            halvedHoles={countHalvedHoles(matchState)}
            holesPlayed={matchState.holesPlayed}
            teamAName={model.teamAName}
            teamBName={model.teamBName}
            summaryText={model.summaryText}
            nextIncompleteMatchId={model.nextIncompleteMatch?.id}
            canEditScores={isCaptainMode}
            onScoreNextMatch={onScoreNextMatch}
            onViewStandings={onViewStandings}
            onShareSummary={actions.handleShareSummary}
            onExportSummary={actions.handleExportSummary}
            onShareResult={actions.handleShareResult}
            onEditScores={onEditScores}
            onBackToMatches={onBackToMatches}
          />
        )}
      </main>

      {/* Bottom drawer — the new home for standings, presses, side bets. */}
      {!model.isMatchComplete && (
        <ScoringDrawer
          scoring={{
            matchState,
            currentHole,
            currentHoleResult,
            currentPar: model.currentPar,
            currentStrokeIndex: model.currentStrokeIndex,
            currentYardage: model.currentYardage,
            scoringMode: model.effectiveScoringMode,
            scoringModeMeta: model.scoringModeMeta,
            isFourball: model.isFourball,
            isMatchComplete: model.isMatchComplete,
            isEditingScores: ui.isEditingScores,
            isSaving,
            undoCount,
            presses,
            sessionLeaderboard: model.sessionLeaderboard,
            totalHoles: model.totalHoles,
            strokesByHole: model.strokesByHole,
          }}
          teams={{
            teamAName: model.teamAName,
            teamBName: model.teamBName,
            teamAColor: model.teamAColor,
            teamBColor: model.teamBColor,
            teamALineup: model.teamALineup,
            teamBLineup: model.teamBLineup,
            teamAHandicapAllowance: model.matchHandicapContext.teamAHandicapAllowance,
            teamBHandicapAllowance: model.matchHandicapContext.teamBHandicapAllowance,
            holeHandicaps: model.holeHandicaps,
            teamAFourballPlayers: model.teamAFourballPlayers,
            teamBFourballPlayers: model.teamBFourballPlayers,
            teamAPlayers: model.teamAPlayers,
            teamBPlayers: model.teamBPlayers,
          }}
          handlers={{
            onJumpToHole: onHoleSelect,
            onPress,
          }}
          presses={presses}
          sideBets={model.activeMatchSideBets}
          match={matchState.match}
          currentTripId={currentTripId}
          currentPlayerIdForBets={model.currentUserPlayerId}
          onSelectMatch={onSelectMatch}
        />
      )}

      <CockpitOverflowSheet
        open={overflowOpen}
        onClose={() => setOverflowOpen(false)}
        matchId={matchId}
        scoringMode={model.effectiveScoringMode}
        scoringModeMeta={model.scoringModeMeta}
        isFourball={model.isFourball}
        isMatchComplete={model.isMatchComplete}
        isCaptainMode={isCaptainMode}
        preferredHand={preferredHand}
        onScoringModeChange={onScoringModeChange}
        onOpenVoiceScoring={onOpenVoiceModal}
        onShareSummary={actions.handleShareSummary}
        onExportSummary={actions.handleExportSummary}
        onEditScores={onEditScores}
      />

      {confirmDialog}
    </div>
  );
}

/**
 * Slim variant of MatchScoringSupportLayer that drops the floating photo
 * and voice FABs — voice is in the overflow sheet now and photos move to
 * the trip moments drawer tab. Keeping the voice modal + stroke alert
 * banner since both are critical and contextual.
 */
function MatchScoringSupportLayerSlim(props: {
  isMatchComplete: boolean;
  showVoiceModal: boolean;
  currentHole: number;
  teamAName: string;
  teamBName: string;
  teamAHandicapAllowance: number;
  teamBHandicapAllowance: number;
  holeHandicaps: number[];
  showTeamStrokeAlerts?: boolean;
  onCloseVoiceModal: () => void;
  onVoiceScoreConfirmed: (winner: 'teamA' | 'teamB' | 'halved' | 'none') => void;
  onStrokeAlertShown: (hole: number, teamAStrokes: number, teamBStrokes: number) => void;
}) {
  return (
    <MatchScoringSupportLayer
      isMatchComplete={props.isMatchComplete}
      showVoiceModal={props.showVoiceModal}
      currentHole={props.currentHole}
      matchId="" // FABs disabled below — matchId is unused for stroke alerts
      teamAName={props.teamAName}
      teamBName={props.teamBName}
      teamAHandicapAllowance={props.teamAHandicapAllowance}
      teamBHandicapAllowance={props.teamBHandicapAllowance}
      holeHandicaps={props.holeHandicaps}
      showTeamStrokeAlerts={props.showTeamStrokeAlerts}
      onCloseVoiceModal={props.onCloseVoiceModal}
      onOpenVoiceModal={() => {}}
      onVoiceScoreConfirmed={props.onVoiceScoreConfirmed}
      onPhotoCapture={() => {}}
      onStrokeAlertShown={props.onStrokeAlertShown}
    />
  );
}

function WeatherAlertsBar() {
  return (
    <section className="-mx-4 mt-2 sm:-mx-5">
      <WeatherAlerts showWeatherBar={true} />
    </section>
  );
}
