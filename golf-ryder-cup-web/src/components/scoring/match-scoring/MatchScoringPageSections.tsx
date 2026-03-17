import { lazy, Suspense, type ReactNode } from 'react';

import { AnimatePresence } from 'framer-motion';

import type { MatchState } from '@/lib/types/computed';
import type { Press } from '@/components/scoring';
import { ScoreToast } from '@/components/scoring';
import type { ScoringPreferences } from '@/lib/types/scoringPreferences';
import {
  StickyUndoBanner,
  WeatherAlerts,
} from '@/components/live-play';
import { EmptyStatePremium, ErrorEmpty, PageLoadingSkeleton } from '@/components/ui';

import { MatchScoringActiveState } from './MatchScoringActiveState';
import { MatchScoringCompleteState } from './MatchScoringCompleteState';
import { MatchScoringHeroSection } from './MatchScoringHeroSection';
import { MatchScoringSupportLayer } from './MatchScoringSupportLayer';
import { countHalvedHoles } from './matchScoringReport';
import type { MatchScoringPageModel } from './matchScoringPageModel';
import type { ScoringMode } from './matchScoringShared';
import type { MatchScoringPageActions } from './useMatchScoringPageActions';
import type { MatchScoringPageUiState } from './useMatchScoringPageUiState';

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

export function MatchScoringUnavailableState({
  onBackToScore,
}: {
  onBackToScore: () => void;
}) {
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

interface MatchScoringPageSectionsProps {
  matchId: string;
  matchOrder: number;
  matchState: MatchState;
  currentHole: number;
  currentHoleResult: MatchScoringPageModel['currentHoleResult'];
  model: MatchScoringPageModel;
  ui: MatchScoringPageUiState;
  actions: MatchScoringPageActions;
  presses: Press[];
  isSaving: boolean;
  undoCount: number;
  isCaptainMode: boolean;
  prefersReducedMotion: boolean;
  quickScoreMode: ScoringPreferences['quickScoreMode'];
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
}

export function MatchScoringPageSections({
  matchId,
  matchOrder,
  matchState,
  currentHole,
  currentHoleResult,
  model,
  ui,
  actions,
  presses,
  isSaving,
  undoCount,
  isCaptainMode,
  prefersReducedMotion,
  quickScoreMode,
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
}: MatchScoringPageSectionsProps) {
  return (
    <div className="min-h-screen page-premium-enter texture-grain bg-canvas font-sans">
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

      <StickyUndoBanner
        action={ui.undoAction}
        duration={8000}
        bottomOffset={80}
        onDismiss={() => ui.setUndoAction(null)}
      />

      <MatchScoringSupportLayer
        isMatchComplete={model.isMatchComplete}
        showVoiceModal={ui.showVoiceModal}
        currentHole={currentHole}
        matchId={matchId}
        teamAName={model.teamAName}
        teamBName={model.teamBName}
        teamAHandicapAllowance={model.matchHandicapContext.teamAHandicapAllowance}
        teamBHandicapAllowance={model.matchHandicapContext.teamBHandicapAllowance}
        holeHandicaps={model.holeHandicaps}
        showTeamStrokeAlerts={!model.isFourball}
        onCloseVoiceModal={onCloseVoiceModal}
        onOpenVoiceModal={onOpenVoiceModal}
        onVoiceScoreConfirmed={actions.handleVoiceScore}
        onPhotoCapture={actions.handlePhotoCapture}
        onStrokeAlertShown={onStrokeAlertShown}
      />

      <MatchScoringHeroSection
        matchOrder={matchOrder}
        sessionLabel={model.currentSession ? model.currentSession.sessionType : 'Match play'}
        currentCourseName={model.currentCourse?.name}
        currentTeeSetName={model.currentTeeSet?.name}
        teamALineup={model.teamALineup}
        teamBLineup={model.teamBLineup}
        matchStatusLabel={model.matchStatusLabel}
        isMatchComplete={model.isMatchComplete}
        matchState={matchState}
        prefersReducedMotion={prefersReducedMotion}
        teamAName={model.teamAName}
        teamBName={model.teamBName}
        teamAColor={model.teamAColor}
        teamBColor={model.teamBColor}
        currentHole={currentHole}
        currentPar={model.currentPar}
        scoringModeMeta={model.scoringModeMeta}
        savingIndicator={ui.savingIndicator}
        undoCount={undoCount}
        onBack={onBackToScore}
        onOpenVoiceScoring={onOpenVoiceModal}
        onUndo={actions.handleUndo}
        onHoleSelect={onHoleSelect}
      />

      <main className="container-editorial">
        {!model.isMatchComplete || ui.isEditingScores ? (
          <MatchScoringActiveState
            isEditingScores={ui.isEditingScores}
            isMatchComplete={model.isMatchComplete}
            currentHole={currentHole}
            currentHoleResult={currentHoleResult}
            currentPar={model.currentPar}
            matchState={matchState}
            scoringMode={model.effectiveScoringMode}
            scoringModeMeta={model.scoringModeMeta}
            isFourball={model.isFourball}
            quickScoreMode={quickScoreMode}
            preferredHand={preferredHand}
            quickScorePendingTeam={ui.quickScorePending?.team}
            showHandicapDetails={ui.showHandicapDetails}
            showScoringModeTip={ui.showScoringModeTip}
            showAdvancedTools={ui.showAdvancedTools}
            prefersReducedMotion={prefersReducedMotion}
            isSaving={isSaving}
            undoCount={undoCount}
            teamAName={model.teamAName}
            teamBName={model.teamBName}
            teamAColor={model.teamAColor}
            teamBColor={model.teamBColor}
            teamAHandicapAllowance={model.matchHandicapContext.teamAHandicapAllowance}
            teamBHandicapAllowance={model.matchHandicapContext.teamBHandicapAllowance}
            holeHandicaps={model.holeHandicaps}
            presses={presses}
            activeSideBets={model.activeSideBets}
            currentPlayerIdForBets={model.teamAPlayers[0]?.id}
            teamAFourballPlayers={model.teamAFourballPlayers}
            teamBFourballPlayers={model.teamBFourballPlayers}
            onFinishEditing={() => ui.setIsEditingScores(false)}
            onPrevHole={onPrevHole}
            onNextHole={onNextHole}
            onDismissScoringModeTip={ui.dismissScoringModeTip}
            onScoringModeChange={onScoringModeChange}
            onQuickScoreTap={actions.handleQuickScoreTap}
            onToggleShowHandicapDetails={() =>
              ui.setShowHandicapDetails((previous) => !previous)
            }
            onScore={actions.handleScore}
            onScoreWithStrokes={actions.handleScoreWithStrokes}
            onFourballScore={actions.handleFourballScore}
            onUndo={actions.handleUndo}
            onToggleShowAdvancedTools={() =>
              ui.setShowAdvancedTools((previous) => !previous)
            }
            onPress={onPress}
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

        <section className="mt-4">
          <WeatherAlerts showWeatherBar={true} />
        </section>
      </main>

      {confirmDialog}
    </div>
  );
}
