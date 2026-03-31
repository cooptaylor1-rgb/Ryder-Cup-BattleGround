import { useCallback, useRef } from 'react';

import { addAuditLogEntry } from '@/lib/db';
import { createAuditEntry } from '@/lib/services/sessionLockService';
import {
  createCorrelationId,
  trackFeature,
  trackScoreEntry,
  trackScoreUndo,
} from '@/lib/services/analyticsService';
import { playScoreSound } from '@/lib/services/soundEffects';
import type { MatchState } from '@/lib/types/computed';
import type {
  HoleResult,
  HoleWinner,
  Match,
  PlayerHoleScore,
  Trip,
} from '@/lib/types/models';
import type { ScoringPreferences } from '@/lib/types/scoringPreferences';
import { deriveScoreAuditAction } from '@/lib/utils/scoringAudit';

import {
  buildMatchResultShareText,
  buildMatchSummaryText,
  buildPrintableMatchSummary,
} from './matchScoringReport';
import type { MatchScoringPageModel } from './matchScoringPageModel';
import type { MatchScoringPageUiState } from './useMatchScoringPageUiState';

type ScoreSource = 'swipe' | 'buttons' | 'strokes' | 'fourball' | 'oneHanded' | 'voice';

interface MatchScoringPageActionsOptions {
  currentTrip: Trip | null;
  activeMatch: Match | null;
  matchState?: MatchState | null;
  currentHole: number;
  isSaving: boolean;
  isOnline: boolean;
  model: MatchScoringPageModel;
  ui: MatchScoringPageUiState;
  scoringPreferences: ScoringPreferences;
  currentHoleResult?: HoleResult;
  undoStack: Array<{
    matchId: string;
    holeNumber: number;
    previousResult: HoleResult | null;
  }>;
  isSessionLocked: () => boolean;
  scoreHole: (
    winner: HoleWinner,
    teamAScore?: number,
    teamBScore?: number,
    teamAPlayerScores?: PlayerHoleScore[],
    teamBPlayerScores?: PlayerHoleScore[],
    options?: { advanceHole?: boolean }
  ) => Promise<void>;
  undoLastHole: () => Promise<void>;
  showConfirm: (options: {
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: 'danger' | 'warning' | 'info';
    onConfirm: () => void;
  }) => void;
  showToast: (
    type: 'success' | 'error' | 'info' | 'warning',
    message: string,
    duration?: number
  ) => void;
  haptic: {
    warning: () => void;
    scorePoint: () => void;
  };
}

export interface MatchScoringPageActions {
  handleExportSummary: () => void;
  handleFourballScore: (
    winner: HoleWinner,
    teamABestScore: number,
    teamBBestScore: number,
    teamAPlayerScores: PlayerHoleScore[],
    teamBPlayerScores: PlayerHoleScore[]
  ) => Promise<void>;
  handlePhotoCapture: (_photo: { id: string }) => void;
  handleQuickScoreTap: (team: 'teamA' | 'teamB') => void;
  handleScore: (winner: HoleWinner, source?: ScoreSource) => Promise<void>;
  handleScoreWithStrokes: (
    winner: HoleWinner,
    teamAStrokeScore: number,
    teamBStrokeScore: number
  ) => Promise<void>;
  handleShareResult: () => void;
  handleShareSummary: () => void;
  handleUndo: () => Promise<void>;
  handleVoiceScore: (winner: HoleWinner) => void;
}

export function useMatchScoringPageActions(
  options: MatchScoringPageActionsOptions
): MatchScoringPageActions {
  const {
    currentTrip,
    activeMatch,
    matchState,
    currentHole,
    isSaving,
    isOnline,
    model,
    ui,
    scoringPreferences,
    currentHoleResult,
    undoStack,
    isSessionLocked,
    scoreHole,
    undoLastHole,
    showConfirm,
    showToast,
    haptic,
  } = options;

  // UI-level debounce: prevent rapid double-tap from triggering two score submissions
  const lastScoreTimestampRef = useRef(0);
  const SCORE_DEBOUNCE_MS = 500;

  const recordScoreAudit = useCallback(
    async (audit: {
      action: 'scoreEntered' | 'scoreUndone' | 'scoreEdited';
      holeNumber: number;
      winner?: HoleWinner;
      teamAStrokeScore?: number;
      teamBStrokeScore?: number;
      method?: 'manual' | 'quick' | 'voice' | 'ocr';
    }) => {
      if (!currentTrip || !activeMatch) return;

      const summary =
        audit.action === 'scoreUndone'
          ? `Undid hole ${audit.holeNumber}`
          : audit.action === 'scoreEdited'
            ? `Updated hole ${audit.holeNumber} score`
            : `Scored hole ${audit.holeNumber}`;

      const entry = createAuditEntry(currentTrip.id, audit.action, model.actorName, summary, {
        details: {
          holeNumber: audit.holeNumber,
          winner: audit.winner ?? null,
          teamAStrokeScore: audit.teamAStrokeScore ?? null,
          teamBStrokeScore: audit.teamBStrokeScore ?? null,
          method: audit.method ?? null,
        },
        relatedEntityId: activeMatch.id,
        relatedEntityType: 'match',
      });

      try {
        await addAuditLogEntry(entry);
      } catch {
        // Best effort only.
      }
    },
    [currentTrip, activeMatch, model.actorName]
  );

  const handleUndo = useCallback(async () => {
    if (undoStack.length === 0) return;
    if (isSessionLocked()) {
      ui.setToast({ message: 'Session is finalized. Unlock to undo scores.', type: 'info' });
      return;
    }

    const lastUndo = undoStack[undoStack.length - 1];
    const holeNumber = lastUndo?.holeNumber ?? currentHole;

    haptic.warning();
    await undoLastHole();
    ui.setUndoAction(null);
    ui.setToast({ message: 'Score undone', type: 'info' });

    if (activeMatch?.id) {
      trackScoreUndo({
        matchId: activeMatch.id,
        hole: holeNumber,
        correlationId: createCorrelationId('undo'),
      });
    }

    await recordScoreAudit({
      action: 'scoreUndone',
      holeNumber,
      winner: lastUndo?.previousResult?.winner,
      teamAStrokeScore:
        lastUndo?.previousResult?.teamAScore ?? lastUndo?.previousResult?.teamAStrokes,
      teamBStrokeScore:
        lastUndo?.previousResult?.teamBScore ?? lastUndo?.previousResult?.teamBStrokes,
    });
  }, [
    undoStack,
    isSessionLocked,
    currentHole,
    haptic,
    undoLastHole,
    activeMatch,
    recordScoreAudit,
    ui,
  ]);

  const executeScore = useCallback(
    async (
      winner: HoleWinner,
      teamAStrokeScore?: number,
      teamBStrokeScore?: number,
      source?: ScoreSource,
      teamAPlayerScores?: PlayerHoleScore[],
      teamBPlayerScores?: PlayerHoleScore[],
    ) => {
      if (!matchState) return;

      // Debounce rapid submissions (double-tap protection)
      const now = Date.now();
      if (now - lastScoreTimestampRef.current < SCORE_DEBOUNCE_MS) return;
      lastScoreTimestampRef.current = now;

      const scoringSource = source ?? model.effectiveScoringMode;
      const scoreAuditAction = deriveScoreAuditAction(currentHoleResult);
      const wasUnscored = scoreAuditAction === 'scoreEntered';
      const analyticsMethod: 'manual' | 'quick' | 'voice' | 'ocr' =
        scoringSource === 'voice'
          ? 'voice'
          : scoringSource === 'swipe' || scoringSource === 'oneHanded'
            ? 'quick'
            : 'manual';
      const wouldCloseOut =
        Math.abs(
          matchState.currentScore + (winner === 'teamA' ? 1 : winner === 'teamB' ? -1 : 0)
        ) >
        matchState.holesRemaining - 1;

      ui.setSavingIndicator('Saving score...');

      haptic.scorePoint();
      if (teamAStrokeScore !== undefined && teamBStrokeScore !== undefined) {
        await scoreHole(
          winner,
          teamAStrokeScore,
          teamBStrokeScore,
          teamAPlayerScores,
          teamBPlayerScores,
          { advanceHole: scoringPreferences.autoAdvance && wasUnscored && !wouldCloseOut }
        );
      } else {
        await scoreHole(winner, undefined, undefined, undefined, undefined, {
          advanceHole: scoringPreferences.autoAdvance && wasUnscored && !wouldCloseOut,
        });
      }

      if (activeMatch) {
        trackScoreEntry({
          matchId: activeMatch.id,
          hole: currentHole,
          score: winner === 'teamA' ? 1 : winner === 'teamB' ? -1 : 0,
          method: analyticsMethod,
        });
      }

      await recordScoreAudit({
        action: scoreAuditAction,
        holeNumber: currentHole,
        winner,
        teamAStrokeScore,
        teamBStrokeScore,
        method: analyticsMethod,
      });

      ui.setSavingIndicator(isOnline ? 'Score saved' : 'Saved offline');
      setTimeout(() => ui.setSavingIndicator(null), 1500);
      if (scoringPreferences.soundEffects) {
        playScoreSound({
          outcome: winner === 'teamA' ? 'teamA' : winner === 'teamB' ? 'teamB' : 'halved',
          isMatchWin: wouldCloseOut && winner !== 'halved',
        });
      }

      if (wouldCloseOut && winner !== 'halved') {
        ui.setCelebration({
          type: 'matchWon',
          winner,
          teamName: winner === 'teamA' ? model.teamAName : model.teamBName,
          teamColor: winner === 'teamA' ? model.teamAColor : model.teamBColor,
          finalScore: matchState.displayScore,
        });
      } else if (winner === 'halved') {
        if (teamAStrokeScore !== undefined && teamBStrokeScore !== undefined) {
          ui.setToast({
            message: `Hole ${currentHole} halved (${teamAStrokeScore}-${teamBStrokeScore})`,
            type: 'success',
          });
        } else {
          ui.setCelebration({
            type: 'holeHalved',
            holeNumber: currentHole,
          });
        }
      } else {
        const scoreText =
          teamAStrokeScore !== undefined ? ` (${teamAStrokeScore}-${teamBStrokeScore})` : '';
        ui.setToast({
          message: `Hole ${currentHole}: ${winner === 'teamA' ? model.teamAName : model.teamBName} wins${scoreText}`,
          type: 'success',
        });
      }

      ui.setUndoAction({
        id: crypto.randomUUID(),
        type: 'score',
        description:
          teamAStrokeScore !== undefined
            ? `Hole ${currentHole}: ${teamAStrokeScore}-${teamBStrokeScore}`
            : `Hole ${currentHole} scored`,
        metadata: {
          holeNumber: currentHole,
          result: winner === 'none' ? undefined : winner,
          teamAName: model.teamAName,
          teamBName: model.teamBName,
          teamAScore: teamAStrokeScore,
          teamBScore: teamBStrokeScore,
        },
        timestamp: Date.now(),
        onUndo: handleUndo,
      });
    },
    [
      matchState,
      model,
      currentHoleResult,
      ui,
      haptic,
      scoreHole,
      activeMatch,
      currentHole,
      handleUndo,
      scoringPreferences.autoAdvance,
      scoringPreferences.soundEffects,
      recordScoreAudit,
      isOnline,
    ]
  );

  const handleScore = useCallback(
    async (winner: HoleWinner, source?: ScoreSource) => {
      if (isSaving || !matchState) return;
      const scoringSource = source ?? model.effectiveScoringMode;

      const wouldCloseOut =
        Math.abs(
          matchState.currentScore + (winner === 'teamA' ? 1 : winner === 'teamB' ? -1 : 0)
        ) >
        matchState.holesRemaining - 1;

      if (scoringPreferences.confirmCloseout && wouldCloseOut && winner !== 'halved') {
        const winningTeam = winner === 'teamA' ? model.teamAName : model.teamBName;
        showConfirm({
          title: 'End Match?',
          message: `This will end the match with ${winningTeam} winning. Are you sure?`,
          confirmLabel: 'End Match',
          cancelLabel: 'Cancel',
          variant: 'warning',
          onConfirm: () => {
            void executeScore(winner, undefined, undefined, scoringSource);
          },
        });
        return;
      }

      await executeScore(winner, undefined, undefined, scoringSource);
    },
    [isSaving, matchState, model, scoringPreferences.confirmCloseout, showConfirm, executeScore]
  );

  const handleScoreWithStrokes = useCallback(
    async (winner: HoleWinner, teamAStrokeScore: number, teamBStrokeScore: number) => {
      if (isSaving || !matchState) return;

      const wouldCloseOut =
        Math.abs(
          matchState.currentScore + (winner === 'teamA' ? 1 : winner === 'teamB' ? -1 : 0)
        ) >
        matchState.holesRemaining - 1;

      if (scoringPreferences.confirmCloseout && wouldCloseOut && winner !== 'halved') {
        const winningTeam = winner === 'teamA' ? model.teamAName : model.teamBName;
        showConfirm({
          title: 'End Match?',
          message: `This will end the match with ${winningTeam} winning. Are you sure?`,
          confirmLabel: 'End Match',
          cancelLabel: 'Cancel',
          variant: 'warning',
          onConfirm: () => {
            void executeScore(winner, teamAStrokeScore, teamBStrokeScore, 'strokes');
          },
        });
        return;
      }

      await executeScore(winner, teamAStrokeScore, teamBStrokeScore, 'strokes');
    },
    [isSaving, matchState, scoringPreferences.confirmCloseout, model, showConfirm, executeScore]
  );

  const handleFourballScore = useCallback(
    async (
      winner: HoleWinner,
      teamABestScore: number,
      teamBBestScore: number,
      teamAPlayerScores: PlayerHoleScore[],
      teamBPlayerScores: PlayerHoleScore[]
    ) => {
      if (isSaving || !matchState) return;

      await executeScore(
        winner,
        teamABestScore,
        teamBBestScore,
        'fourball',
        teamAPlayerScores,
        teamBPlayerScores
      );
    },
    [isSaving, matchState, executeScore]
  );

  const handleVoiceScore = useCallback(
    (winner: HoleWinner) => {
      ui.setShowVoiceModal(false);
      trackFeature('voice_scoring', 'used');
      void handleScore(winner, 'voice');
    },
    [ui, handleScore]
  );

  const handleQuickScoreTap = useCallback(
    (team: 'teamA' | 'teamB') => {
      if (isSaving || !matchState) return;
      const now = Date.now();
      const isConfirmed =
        ui.quickScorePending?.team === team && ui.quickScorePending.expiresAt > now;

      if (isConfirmed) {
        ui.setQuickScorePending(undefined);
        void handleScore(team === 'teamA' ? 'teamA' : 'teamB', 'buttons');
        return;
      }

      ui.setQuickScorePending({ team, expiresAt: now + 2000 });
    },
    [isSaving, matchState, ui, handleScore]
  );

  const handlePhotoCapture = useCallback(
    (_photo: { id: string }) => {
      showToast('success', 'Photo saved to gallery');
    },
    [showToast]
  );

  const handleShareSummary = useCallback(() => {
    if (!model.summaryText) return;

    if (navigator.share) {
      void navigator.share({ text: model.summaryText });
      return;
    }

    navigator.clipboard.writeText(model.summaryText);
    showToast('success', 'Summary copied to clipboard!');
  }, [model.summaryText, showToast]);

  const handleExportSummary = useCallback(() => {
    if (!matchState) return;

    const summaryText = buildMatchSummaryText({
      matchState,
      teamAName: model.teamAName,
      teamBName: model.teamBName,
      teamAPlayers: model.teamAPlayers,
      teamBPlayers: model.teamBPlayers,
    });
    const printable = buildPrintableMatchSummary({
      matchState,
      teamAName: model.teamAName,
      teamBName: model.teamBName,
      summaryText,
    });

    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(printable);
    win.document.close();
    win.focus();
    win.print();
  }, [matchState, model]);

  const handleShareResult = useCallback(() => {
    if (!matchState) return;
    const shareText = buildMatchResultShareText({
      matchState,
      teamAName: model.teamAName,
      teamBName: model.teamBName,
      teamALineup: model.teamALineup,
      teamBLineup: model.teamBLineup,
    });

    if (navigator.share) {
      void navigator.share({ text: shareText });
      return;
    }

    navigator.clipboard.writeText(shareText);
    showToast('success', 'Result copied to clipboard!');
  }, [matchState, model, showToast]);

  return {
    handleExportSummary,
    handleFourballScore,
    handlePhotoCapture,
    handleQuickScoreTap,
    handleScore,
    handleScoreWithStrokes,
    handleShareResult,
    handleShareSummary,
    handleUndo,
    handleVoiceScore,
  };
}
