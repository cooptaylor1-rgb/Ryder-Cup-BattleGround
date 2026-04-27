/**
 * Match Scoring Page — Fried Egg Golf Editorial Design
 *
 * Sacred action surface redesigned for Phase 1 excellence.
 */

'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

import {
  useAuthStore,
  useScoringStore,
  useTripStore,
  useToastStore,
  useScoringPrefsStore,
  useAccessStore,
} from '@/lib/stores';
import { useShallow } from 'zustand/shallow';
import { useHaptic, useMatchState } from '@/lib/hooks';
import { useOnlineStatus } from '@/lib/hooks/useOnlineStatus';
import { usePrefersReducedMotion } from '@/lib/utils/accessibility';
import { withTripPlayerIdentity } from '@/lib/utils/tripPlayerIdentity';
import { useConfirmDialog } from '@/components/ui/ConfirmDialog';
import { reopenMatch } from '@/lib/services/scoringEngine';
import { scoringLogger } from '@/lib/utils/logger';

import {
  MatchScoringErrorState,
  MatchScoringLoadingState,
  MatchScoringPageSections,
  MatchScoringUnauthenticatedState,
  MatchScoringUnavailableState,
} from './MatchScoringPageSections';
import { PracticeScoringPage } from '../practice-scoring/PracticeScoringPage';
import { normalizeScoringMode, useMatchScoringPageModel } from './matchScoringPageModel';
import { type ScoringMode } from './matchScoringShared';
import { useMatchPressTracking } from './useMatchPressTracking';
import { useMatchScoringPageActions } from './useMatchScoringPageActions';
import { useMatchScoringPageUiState } from './useMatchScoringPageUiState';

export default function MatchScoringPageClient() {
  const router = useRouter();
  const params = useParams();
  const matchId = params.matchId as string;

  const { currentTrip, courses, players, teams, teeSets, sessions } = useTripStore(
    useShallow((s) => ({
      currentTrip: s.currentTrip,
      courses: s.courses,
      players: s.players,
      teams: s.teams,
      teeSets: s.teeSets,
      sessions: s.sessions,
    }))
  );
  const { currentUser, isAuthenticated, authUserId } = useAuthStore();
  const { showToast } = useToastStore(useShallow((s) => ({ showToast: s.showToast })));
  const {
    scoringPreferences,
    scoringModeByFormat,
    getScoringModeForFormat,
    setScoringModeForFormat,
  } = useScoringPrefsStore(
    useShallow((s) => ({
      scoringPreferences: s.scoringPreferences,
      scoringModeByFormat: s.scoringModeByFormat,
      getScoringModeForFormat: s.getScoringModeForFormat,
      setScoringModeForFormat: s.setScoringModeForFormat,
    }))
  );
  const { isCaptainMode } = useAccessStore(useShallow((s) => ({ isCaptainMode: s.isCaptainMode })));
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

  const [scoringModeOverrides, setScoringModeOverrides] = useState<Record<string, ScoringMode>>({});
  const currentIdentity = useMemo(
    () => withTripPlayerIdentity(currentUser, authUserId),
    [authUserId, currentUser]
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
    currentIdentity,
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

  // Practice matches don't have a team to score against — short-circuit
  // to a guidance state that points the captain at side bets, which are
  // the scoring unit for warm-up rounds.
  if (activeMatch.mode === 'practice') {
    // Practice matches now get their own scoring UI: per-player
    // stroke entry plus a live gross/net leaderboard. The previous
    // empty-state screen that punted to "go attach a side bet" is
    // superseded by PracticeScoringPage, which still links out to
    // the bets composer but actually lets the captain record scores.
    return <PracticeScoringPage matchId={activeMatch.id} />;
  }

  return (
    <>
      <MatchScoringPageSections
        matchId={matchId}
        currentTripId={currentTrip?.id}
        matchOrder={activeMatch.matchOrder}
        matchState={matchState}
        currentHole={currentHole}
        currentHoleResult={model.currentHoleResult}
        model={model}
        ui={ui}
        actions={actions}
        presses={presses}
        isSaving={isSaving}
        isOnline={isOnline}
        undoCount={undoStack.length}
        isCaptainMode={isCaptainMode}
        prefersReducedMotion={prefersReducedMotion}
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
        onSelectMatch={(otherMatchId) => router.push(`/score/${otherMatchId}`)}
        onEditScores={async () => {
          // Flip the match out of completed state so the rest of the UI
          // treats it as live and subsequent scoring writes follow the
          // normal inProgress path. Previously "Correct a Score" only
          // switched the UI into edit mode, leaving match.status as
          // 'completed' — peer devices, standings, and the audit log all
          // still saw a finalized match while the captain was actively
          // rewriting it.
          if (activeMatch?.status === 'completed') {
            try {
              await reopenMatch(activeMatch.id);
              scoringLogger.info('Match reopened for correction', { matchId: activeMatch.id });
            } catch (error) {
              scoringLogger.error('Failed to reopen match for correction', {
                matchId: activeMatch.id,
                error,
              });
            }
          }
          ui.setIsEditingScores(true);
          goToHole(1);
        }}
        onScoringModeChange={handleScoringModeChange}
      />
    </>
  );
}
