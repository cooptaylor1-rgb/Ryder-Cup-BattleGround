import type { Dispatch, SetStateAction } from 'react';
import { useEffect, useMemo, useState } from 'react';

import type { HoleWinner } from '@/lib/types/models';
import type { UndoAction } from '@/components/live-play';

import { hashStringToSeed, mulberry32 } from './matchScoringUtils';

export interface MatchScoringCelebrationState {
  type: 'holeWon' | 'holeLost' | 'holeHalved' | 'matchWon' | 'matchHalved';
  winner?: HoleWinner;
  teamName?: string;
  teamColor?: string;
  holeNumber?: number;
  finalScore?: string;
}

export interface MatchScoringToastState {
  message: string;
  type: 'success' | 'info';
}

export interface MatchScoringQuickScorePending {
  team: 'teamA' | 'teamB';
  expiresAt: number;
}

export interface MatchScoringPageUiState {
  isEditingScores: boolean;
  setIsEditingScores: Dispatch<SetStateAction<boolean>>;
  showVoiceModal: boolean;
  setShowVoiceModal: Dispatch<SetStateAction<boolean>>;
  undoAction: UndoAction | null;
  setUndoAction: Dispatch<SetStateAction<UndoAction | null>>;
  showHandicapDetails: boolean;
  setShowHandicapDetails: Dispatch<SetStateAction<boolean>>;
  showScoringModeTip: boolean;
  setShowScoringModeTip: Dispatch<SetStateAction<boolean>>;
  savingIndicator: string | null;
  setSavingIndicator: Dispatch<SetStateAction<string | null>>;
  showAdvancedTools: boolean;
  setShowAdvancedTools: Dispatch<SetStateAction<boolean>>;
  quickScorePending: MatchScoringQuickScorePending | undefined;
  setQuickScorePending: Dispatch<SetStateAction<MatchScoringQuickScorePending | undefined>>;
  celebration: MatchScoringCelebrationState | null;
  setCelebration: Dispatch<SetStateAction<MatchScoringCelebrationState | null>>;
  toast: MatchScoringToastState | null;
  setToast: Dispatch<SetStateAction<MatchScoringToastState | null>>;
  confettiPieces: Array<{
    i: number;
    x: string;
    y: string;
    rotate: number;
    duration: number;
  }>;
  dismissScoringModeTip: () => void;
}

export function useMatchScoringPageUiState(
  matchId: string,
  hasActiveMatch: boolean
): MatchScoringPageUiState {
  const [isEditingScores, setIsEditingScores] = useState(false);
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [undoAction, setUndoAction] = useState<UndoAction | null>(null);
  const [showHandicapDetails, setShowHandicapDetails] = useState(false);
  const [showScoringModeTip, setShowScoringModeTip] = useState(false);
  const [savingIndicator, setSavingIndicator] = useState<string | null>(null);
  const [showAdvancedTools, setShowAdvancedTools] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(min-width: 1024px)').matches;
  });
  const [quickScorePending, setQuickScorePending] = useState<
    MatchScoringQuickScorePending | undefined
  >(undefined);
  const [celebration, setCelebration] = useState<MatchScoringCelebrationState | null>(null);
  const [toast, setToast] = useState<MatchScoringToastState | null>(null);

  const confettiPieces = useMemo(() => {
    const rand = mulberry32(hashStringToSeed(matchId));
    return Array.from({ length: 20 }, (_, i) => ({
      i,
      x: `${50 + (rand() - 0.5) * 100}%`,
      y: `${30 + rand() * 60}%`,
      rotate: rand() * 360,
      duration: 2 + rand(),
    }));
  }, [matchId]);

  useEffect(() => {
    const hasSeenTip = localStorage.getItem('scoring-mode-tip-seen');
    if (!hasSeenTip && hasActiveMatch) {
      const timer = setTimeout(() => {
        setShowScoringModeTip(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [hasActiveMatch]);

  useEffect(() => {
    if (!quickScorePending) return;
    const timeoutId = setTimeout(() => {
      setQuickScorePending((current) =>
        current && current.expiresAt <= Date.now() ? undefined : current
      );
    }, 2100);

    return () => clearTimeout(timeoutId);
  }, [quickScorePending]);

  const dismissScoringModeTip = () => {
    setShowScoringModeTip(false);
    localStorage.setItem('scoring-mode-tip-seen', 'true');
  };

  return {
    isEditingScores,
    setIsEditingScores,
    showVoiceModal,
    setShowVoiceModal,
    undoAction,
    setUndoAction,
    showHandicapDetails,
    setShowHandicapDetails,
    showScoringModeTip,
    setShowScoringModeTip,
    savingIndicator,
    setSavingIndicator,
    showAdvancedTools,
    setShowAdvancedTools,
    quickScorePending,
    setQuickScorePending,
    celebration,
    setCelebration,
    toast,
    setToast,
    confettiPieces,
    dismissScoringModeTip,
  };
}
