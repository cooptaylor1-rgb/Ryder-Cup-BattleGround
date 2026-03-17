/**
 * Match Scoring Page — Fried Egg Golf Editorial Design
 *
 * Sacred action surface redesigned for Phase 1 excellence.
 */

'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

import { useAuthStore, useScoringStore, useTripStore, useUIStore } from '@/lib/stores';
import { useHaptic, useMatchState } from '@/lib/hooks';
import { useOnlineStatus } from '@/lib/hooks/useOnlineStatus';
import { usePrefersReducedMotion } from '@/lib/utils/accessibility';
import { useConfirmDialog } from '@/components/ui/ConfirmDialog';

import {
  MatchScoringErrorState,
  MatchScoringLoadingState,
  MatchScoringPageSections,
  MatchScoringUnauthenticatedState,
  MatchScoringUnavailableState,
} from './MatchScoringPageSections';
import { normalizeScoringMode, useMatchScoringPageModel } from './matchScoringPageModel';
import { type ScoringMode } from './matchScoringShared';
import { useMatchPressTracking } from './useMatchPressTracking';
import { useMatchScoringPageActions } from './useMatchScoringPageActions';
import { useMatchScoringPageUiState } from './useMatchScoringPageUiState';

export default function MatchScoringPageClient() {
  const router = useRouter();
  const params = useParams();
  const matchId = params.matchId as string;

  const { currentTrip, courses, players, teams, teeSets, sessions } = useTripStore();
  const { currentUser, isAuthenticated } = useAuthStore();
  const {
    showToast,
    scoringPreferences,
    scoringModeByFormat,
    getScoringModeForFormat,
    setScoringModeForFormat,
    isCaptainMode,
  } = useUIStore();
  const haptic = useHaptic();
  const isOnline = useOnlineStatus();
  const prefersReducedMotion = usePrefersReducedMotion();
  const { showConfirm, ConfirmDialogComponent } = useConfirmDialog();
  const handleBackToScore = () => router.push('/score');

  const {
    activeMatch,
    activeMatchState,
    currentHole,
    isLoading,
    error,
    isSaving,
    undoStack,
    sessionMatches,
    selectMatch,
    scoreHole,
    undoLastHole,
    goToHole,
    nextHole,
    prevHole,
    isSessionLocked,
  } = useScoringStore();

  const ui = useMatchScoringPageUiState(matchId, Boolean(activeMatch));
  const liveMatchState = useMatchState(matchId);
  const matchState = liveMatchState || activeMatchState;

  const [scoringModeOverrides, setScoringModeOverrides] = useState<Record<string, ScoringMode>>(
    {}
  );

  useEffect(() => {
    if (matchId && (!activeMatch || activeMatch.id !== matchId)) {
      void selectMatch(matchId);
    }
  }, [matchId, activeMatch, selectMatch]);

  const model = useMatchScoringPageModel({
    currentTrip,
    courses,
    players,
    teams,
    teeSets,
    sessions,
    activeMatch,
    matchState,
    currentHole,
    sessionMatches,
    currentUser,
    scoringPreferences,
    scoringModeByFormat,
    getScoringModeForFormat,
    setScoringModeForFormat,
    scoringModeOverrides,
    isEditingScores: ui.isEditingScores,
  });

  const handleScoringModeChange = (mode: ScoringMode) => {
    const normalizedMode = normalizeScoringMode(mode, model.isFourball);
    setScoringModeOverrides((current) => ({
      ...current,
      [model.scoringModeSessionKey]: normalizedMode,
    }));

    if (model.currentSession) {
      setScoringModeForFormat(model.currentSession.sessionType, normalizedMode);
    }
  };

  const actions = useMatchScoringPageActions({
    currentTrip,
    activeMatch,
    matchState,
    currentHole,
    isSaving,
    isOnline,
    model,
    ui,
    scoringPreferences,
    currentHoleResult: model.currentHoleResult,
    undoStack,
    isSessionLocked,
    scoreHole,
    undoLastHole,
    showConfirm,
    showToast,
    haptic,
  });

  const { presses, handlePress } = useMatchPressTracking({
    matchState,
    currentHole,
    onPressTriggered: (team) => {
      haptic.tap();
      ui.setToast({
        message: `${team === 'teamA' ? model.teamAName : model.teamBName} pressed!`,
        type: 'info',
      });
    },
  });

  if (!isAuthenticated) {
    return (
      <MatchScoringUnauthenticatedState
        onSignIn={() => router.push('/login')}
        onBackToScore={handleBackToScore}
      />
    );
  }

  if (isLoading) {
    return <MatchScoringLoadingState />;
  }

  if (error) {
    return (
      <MatchScoringErrorState
        error={error}
        onRetry={() => void selectMatch(matchId)}
        onBackToScore={handleBackToScore}
      />
    );
  }

  if (!activeMatch || !matchState) {
    return <MatchScoringUnavailableState onBackToScore={handleBackToScore} />;
  }

  return (
    <MatchScoringPageSections
      matchId={matchId}
      matchOrder={activeMatch.matchOrder}
      matchState={matchState}
      currentHole={currentHole}
      currentHoleResult={model.currentHoleResult}
      model={model}
      ui={ui}
      actions={actions}
      presses={presses}
      isSaving={isSaving}
      undoCount={undoStack.length}
      isCaptainMode={isCaptainMode}
      prefersReducedMotion={prefersReducedMotion}
      quickScoreMode={scoringPreferences.quickScoreMode}
      preferredHand={scoringPreferences.preferredHand}
      confirmDialog={ConfirmDialogComponent}
      onBackToScore={handleBackToScore}
      onHoleSelect={goToHole}
      onPrevHole={prevHole}
      onNextHole={nextHole}
      onPress={handlePress}
      onStrokeAlertShown={(_hole, teamAStrokes, teamBStrokes) => {
        if (teamAStrokes > 0 || teamBStrokes > 0) {
          haptic.tap();
        }
      }}
      onOpenVoiceModal={() => ui.setShowVoiceModal(true)}
      onCloseVoiceModal={() => ui.setShowVoiceModal(false)}
      onViewStandings={() => router.push('/standings')}
      onScoreNextMatch={(nextMatchId) => router.push(`/score/${nextMatchId}`)}
      onBackToMatches={handleBackToScore}
      onEditScores={() => {
        ui.setIsEditingScores(true);
        goToHole(1);
      }}
      onScoringModeChange={handleScoringModeChange}
    />
  );
}
