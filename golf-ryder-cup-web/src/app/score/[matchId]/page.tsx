/**
 * Match Scoring Page — Fried Egg Golf Editorial Design
 *
 * Immersive scoring experience:
 * - Minimal chrome, maximum focus on the current hole
 * - var(--font-serif) for monumental score numbers
 * - var(--font-sans) for all UI text
 * - Cream canvas (#FAF8F5), warm ink (#1A1815)
 * - Masters green (#006644), gold (#C9A227), maroon (#722F37)
 * - Restrained animations, no glow effects
 * - Generous whitespace, editorial spacing
 *
 * Sacred action surface: Fast, legible, stress-free.
 */

'use client';

import { useEffect, useMemo, useState, useCallback, lazy, Suspense } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore, useScoringStore, useTripStore, useUIStore } from '@/lib/stores';
import { useMatchState, useHaptic } from '@/lib/hooks';
import { cn, formatPlayerName } from '@/lib/utils';
import { usePrefersReducedMotion } from '@/lib/utils/accessibility';
import { addAuditLogEntry } from '@/lib/db';
import { createAuditEntry } from '@/lib/services/sessionLockService';
import { track, trackFeature, trackScoreEntry } from '@/lib/services/analyticsService';
import { playScoreSound } from '@/lib/services/soundEffects';
import {
  Undo2,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Mic,
  Trophy,
  X,
  Sparkles,
  Share2,
  BarChart3,
  ArrowRight,
} from 'lucide-react';
import type { HoleWinner, PlayerHoleScore } from '@/lib/types/models';
import { TEAM_COLORS } from '@/lib/constants/teamColors';

function hashStringToSeed(input: string): number {
  // Simple non-crypto hash → 32-bit seed (deterministic)
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  return function rand() {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Core scoring components - loaded immediately
import {
  SwipeScorePanel,
  HoleMiniMap,
  ScoreToast,
  HandicapStrokeIndicator,
  StrokeAlertBanner,
  PressTracker,
  StrokeScoreEntry,
  FourballScoreEntry,
  OneHandedScoringPanel,
  type Press,
} from '@/components/scoring';
// Lazy load heavy components that aren't immediately needed
const ScoreCelebration = lazy(() =>
  import('@/components/scoring').then((mod) => ({ default: mod.ScoreCelebration }))
);
import {
  StickyUndoBanner,
  VoiceScoring,
  QuickPhotoCapture,
  SideBetReminder,
  WeatherAlerts,
  type UndoAction,
} from '@/components/live-play';
import { useConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyStatePremium, ErrorEmpty, PageLoadingSkeleton } from '@/components/ui';
import { BottomNav } from '@/components/layout';

// Demo side bets for testing - in production these come from the bets store
const DEMO_SIDE_BETS = [
  {
    id: 'ctp-7',
    type: 'ctp' as const,
    name: 'Closest to Pin #7',
    holes: [7],
    buyIn: 5,
    pot: 40,
    participants: [],
    status: 'active' as const,
  },
  {
    id: 'long-12',
    type: 'long_drive' as const,
    name: 'Long Drive #12',
    holes: [12],
    buyIn: 5,
    pot: 40,
    participants: [],
    status: 'active' as const,
  },
];

/**
 * Enhanced Match Scoring Page
 *
 * Sacred action surface redesigned for Phase 1 excellence.
 */
export default function EnhancedMatchScoringPage() {
  const router = useRouter();
  const params = useParams();
  const matchId = params.matchId as string;

  const { currentTrip, players, teams, teeSets, sessions } = useTripStore();
  const { currentUser, isAuthenticated } = useAuthStore();
  const { showToast, scoringPreferences, getScoringModeForFormat, setScoringModeForFormat } =
    useUIStore();
  const haptic = useHaptic();
  const prefersReducedMotion = usePrefersReducedMotion();

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

  // UI State
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [undoAction, setUndoAction] = useState<UndoAction | null>(null);
  const [presses, setPresses] = useState<Press[]>([]);
  const [showHandicapDetails, setShowHandicapDetails] = useState(false);
  const { showConfirm, ConfirmDialogComponent } = useConfirmDialog();
  const [showScoringModeTip, setShowScoringModeTip] = useState(false);
  const [savingIndicator, setSavingIndicator] = useState<string | null>(null);
  // Default advanced tools visibility based on screen size (no setState-in-effect)
  const [showAdvancedTools, setShowAdvancedTools] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(min-width: 1024px)').matches;
  });
  const [quickScorePending, setQuickScorePending] = useState<{
    team: 'teamA' | 'teamB';
    expiresAt: number;
  } | undefined>(undefined);

  // Celebration state
  const [celebration, setCelebration] = useState<{
    type: 'holeWon' | 'holeLost' | 'holeHalved' | 'matchWon' | 'matchHalved';
    winner?: HoleWinner;
    teamName?: string;
    teamColor?: string;
    holeNumber?: number;
    finalScore?: string;
  } | null>(null);

  // Toast state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' } | null>(null);

  // Live match state (reactive updates)
  const liveMatchState = useMatchState(matchId);
  const matchState = liveMatchState || activeMatchState;

  // Get tee set for handicap info
  const currentTeeSet = activeMatch?.teeSetId
    ? teeSets.find((t) => t.id === activeMatch.teeSetId)
    : teeSets[0];

  const holeHandicaps = currentTeeSet?.holeHandicaps || [
    7, 11, 3, 13, 9, 1, 15, 5, 17, 8, 16, 10, 4, 12, 6, 18, 2, 14,
  ];

  // Load match on mount
  useEffect(() => {
    if (matchId && (!activeMatch || activeMatch.id !== matchId)) {
      selectMatch(matchId);
    }
  }, [matchId, activeMatch, selectMatch]);

  // Show scoring mode tip on first visit
  useEffect(() => {
    const hasSeenTip = localStorage.getItem('scoring-mode-tip-seen');
    if (!hasSeenTip && activeMatch) {
      // Delay showing tip until user has been on page for a moment
      const timer = setTimeout(() => {
        setShowScoringModeTip(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [activeMatch]);

  // Default advanced tools visibility is set via useState initializer.

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

  // Team data
  const teamA = teams.find((t) => t.color === 'usa');
  const teamB = teams.find((t) => t.color === 'europe');
  const teamAName = teamA?.name || 'USA';
  const teamBName = teamB?.name || 'Europe';
  // BUG-021 FIX: Use centralized team color constants
  const teamAColor = TEAM_COLORS.teamA;
  const teamBColor = TEAM_COLORS.teamB;

  const actorName = useMemo(() => {
    if (!currentUser) return 'Unknown';
    const fullName = `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim();
    return currentUser.nickname?.trim() || fullName || currentUser.email || 'User';
  }, [currentUser]);

  // Get session type to determine scoring mode
  const currentSession = useMemo(() => {
    if (!activeMatch) return undefined;
    return sessions.find((s) => s.id === activeMatch.sessionId);
  }, [activeMatch, sessions]);

  const isFourball = currentSession?.sessionType === 'fourball';

  // Power user: Initialize scoring mode from persisted preference for this format
  const [scoringMode, setScoringMode] = useState<
    'swipe' | 'buttons' | 'strokes' | 'fourball' | 'oneHanded'
  >(() => {
    if (!currentSession) return scoringPreferences.oneHandedMode ? 'oneHanded' : 'swipe';
    return getScoringModeForFormat(currentSession.sessionType);
  });

  // Update scoring mode when format changes and persist preference
  const handleScoringModeChange = (
    mode: 'swipe' | 'buttons' | 'strokes' | 'fourball' | 'oneHanded'
  ) => {
    setScoringMode(mode);
    if (currentSession) {
      setScoringModeForFormat(currentSession.sessionType, mode);
    }
  };

  const teamAPlayers = useMemo(() => {
    if (!activeMatch) return [];
    return activeMatch.teamAPlayerIds.map((id) => players.find((p) => p.id === id)).filter(Boolean);
  }, [activeMatch, players]);

  const teamBPlayers = useMemo(() => {
    if (!activeMatch) return [];
    return activeMatch.teamBPlayerIds.map((id) => players.find((p) => p.id === id)).filter(Boolean);
  }, [activeMatch, players]);

  const currentHoleResult = useMemo(() => {
    if (!matchState) return undefined;
    return matchState.holeResults.find((r) => r.holeNumber === currentHole);
  }, [matchState, currentHole]);

  const recordScoreAudit = useCallback(
    async (options: {
      action: 'scoreEntered' | 'scoreUndone' | 'scoreEdited';
      holeNumber: number;
      winner?: HoleWinner;
      teamAStrokeScore?: number;
      teamBStrokeScore?: number;
      method?: 'manual' | 'quick' | 'voice' | 'ocr';
    }) => {
      if (!currentTrip || !activeMatch) return;

      const summary =
        options.action === 'scoreUndone'
          ? `Undid hole ${options.holeNumber}`
          : options.action === 'scoreEdited'
            ? `Updated hole ${options.holeNumber} score`
            : `Scored hole ${options.holeNumber}`;

      const entry = createAuditEntry(currentTrip.id, options.action, actorName, summary, {
        details: {
          holeNumber: options.holeNumber,
          winner: options.winner ?? null,
          teamAStrokeScore: options.teamAStrokeScore ?? null,
          teamBStrokeScore: options.teamBStrokeScore ?? null,
          method: options.method ?? null,
        },
        relatedEntityId: activeMatch.id,
        relatedEntityType: 'match',
      });

      try {
        await addAuditLogEntry(entry);
      } catch (error) {
        console.warn('[Score Audit] Failed to record audit entry', error);
      }
    },
    [currentTrip, activeMatch, actorName]
  );

  const buildMatchSummaryText = useCallback(() => {
    if (!matchState || !activeMatch) return '';
    const winnerText =
      matchState.winningTeam === 'halved'
        ? 'Match halved'
        : `${matchState.winningTeam === 'teamA' ? teamAName : teamBName} wins`;
    const teamALabel = teamAPlayers
      .map((p) => formatPlayerName(p!.firstName, p!.lastName, 'short'))
      .join(' & ');
    const teamBLabel = teamBPlayers
      .map((p) => formatPlayerName(p!.firstName, p!.lastName, 'short'))
      .join(' & ');

    return `⛳ ${winnerText} ${matchState.displayScore}\n${teamALabel} vs ${teamBLabel}\nHoles won: ${teamAName} ${matchState.teamAHolesWon} | ${teamBName} ${matchState.teamBHolesWon}\nHalved: ${matchState.holeResults.filter((r) => r.winner === 'halved').length}\nCompleted thru hole ${matchState.holesPlayed}`;
  }, [matchState, activeMatch, teamAName, teamBName, teamAPlayers, teamBPlayers]);

  const handleExportSummary = useCallback(() => {
    if (!matchState) return;
    const summaryText = buildMatchSummaryText();
    const winnerLabel =
      matchState.winningTeam === 'halved'
        ? 'Match Halved'
        : `${matchState.winningTeam === 'teamA' ? teamAName : teamBName} Wins`;

    const printable = `
      <html>
        <head>
          <title>Match Summary</title>
          <style>
            body { font-family: 'Plus Jakarta Sans', system-ui, sans-serif; padding: 32px; color: #1A1815; }
            .card { border: 1px solid #e5e7eb; border-radius: 16px; padding: 24px; }
            h1 { margin: 0 0 8px; font-size: 24px; }
            .score { font-size: 32px; font-weight: 700; margin: 8px 0 16px; }
            .meta { font-size: 14px; color: #4b5563; margin-top: 12px; }
            .rows { margin-top: 16px; display: grid; gap: 8px; }
            .label { font-weight: 600; }
            pre { white-space: pre-wrap; font-size: 13px; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>${winnerLabel}</h1>
            <div class="score">${matchState.displayScore}</div>
            <div class="rows">
              <div><span class="label">${teamAName}:</span> ${matchState.teamAHolesWon} holes</div>
              <div><span class="label">${teamBName}:</span> ${matchState.teamBHolesWon} holes</div>
              <div><span class="label">Halved:</span> ${matchState.holeResults.filter((r) => r.winner === 'halved').length}</div>
              <div><span class="label">Completed:</span> Thru hole ${matchState.holesPlayed}</div>
            </div>
            <div class="meta">Generated by Golf Ryder Cup</div>
            <pre>${summaryText}</pre>
          </div>
        </body>
      </html>
    `;

    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(printable);
    win.document.close();
    win.focus();
    win.print();
  }, [matchState, teamAName, teamBName, buildMatchSummaryText]);

  // Find next incomplete match in session for "Score Next Match" navigation
  const nextIncompleteMatch = useMemo(() => {
    if (!activeMatch || !sessionMatches.length) return undefined;
    const currentIndex = sessionMatches.findIndex((m) => m.id === activeMatch.id);
    // Look for the next match after current that isn't completed
    for (let i = currentIndex + 1; i < sessionMatches.length; i++) {
      if (sessionMatches[i].status !== 'completed') {
        return sessionMatches[i];
      }
    }
    // Wrap around - look from start to current
    for (let i = 0; i < currentIndex; i++) {
      if (sessionMatches[i].status !== 'completed') {
        return sessionMatches[i];
      }
    }
    return undefined;
  }, [activeMatch, sessionMatches]);

  // Undo handler - must be defined before executeScore to avoid "accessed before declaration" error
  const handleUndo = useCallback(async () => {
    if (undoStack.length === 0) return;
    if (isSessionLocked()) {
      setToast({ message: 'Session is finalized. Unlock to undo scores.', type: 'info' });
      return;
    }

    const lastUndo = undoStack[undoStack.length - 1];
    const holeNumber = lastUndo?.holeNumber ?? currentHole;

    haptic.warning();
    await undoLastHole();
    setUndoAction(null);
    setToast({ message: 'Score undone', type: 'info' });

    track('score_undo', 'scoring', {
      match_id: activeMatch?.id ?? null,
      hole: holeNumber,
    });

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
    setToast,
    activeMatch,
    recordScoreAudit,
  ]);

  // Execute score after confirmation
  const executeScore = useCallback(
    async (
      winner: HoleWinner,
      teamAStrokeScore?: number,
      teamBStrokeScore?: number,
      source?: 'swipe' | 'buttons' | 'strokes' | 'fourball' | 'oneHanded' | 'voice'
    ) => {
      if (!matchState) return;
      const wasUnscored = !currentHoleResult || currentHoleResult.winner === 'none';
      const scoringSource = source ?? scoringMode;
      const analyticsMethod: 'manual' | 'quick' | 'voice' | 'ocr' =
        scoringSource === 'voice'
          ? 'voice'
          : scoringSource === 'swipe' || scoringSource === 'oneHanded'
            ? 'quick'
            : 'manual';

      // Show saving indicator
      setSavingIndicator('Saving score...');

      // Score the hole
      haptic.scorePoint();
      if (teamAStrokeScore !== undefined && teamBStrokeScore !== undefined) {
        await scoreHole(winner, teamAStrokeScore, teamBStrokeScore);
      } else {
        await scoreHole(winner);
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
        action: 'scoreEntered',
        holeNumber: currentHole,
        winner,
        teamAStrokeScore,
        teamBStrokeScore,
        method: analyticsMethod,
      });

      // Clear saving indicator
      setSavingIndicator(null);

      // Check for match closeout
      const wouldCloseOut =
        Math.abs(matchState.currentScore + (winner === 'teamA' ? 1 : winner === 'teamB' ? -1 : 0)) >
        matchState.holesRemaining - 1;

      if (scoringPreferences.soundEffects) {
        playScoreSound({
          outcome: winner === 'teamA' ? 'teamA' : winner === 'teamB' ? 'teamB' : 'halved',
          isMatchWin: wouldCloseOut && winner !== 'halved',
        });
      }

      // Show celebration
      if (wouldCloseOut && winner !== 'halved') {
        setCelebration({
          type: 'matchWon',
          winner,
          teamName: winner === 'teamA' ? teamAName : teamBName,
          teamColor: winner === 'teamA' ? teamAColor : teamBColor,
          finalScore: matchState.displayScore,
        });
      } else if (winner === 'halved') {
        if (teamAStrokeScore !== undefined && teamBStrokeScore !== undefined) {
          setToast({
            message: `Hole ${currentHole} halved (${teamAStrokeScore}-${teamBStrokeScore})`,
            type: 'success',
          });
        } else {
          setCelebration({
            type: 'holeHalved',
            holeNumber: currentHole,
          });
        }
      } else {
        // Show brief toast instead of full celebration for normal holes
        const scoreText =
          teamAStrokeScore !== undefined ? ` (${teamAStrokeScore}-${teamBStrokeScore})` : '';
        setToast({
          message: `Hole ${currentHole}: ${winner === 'teamA' ? teamAName : teamBName} wins${scoreText}`,
          type: 'success',
        });
      }

      // Show undo banner
      setUndoAction({
        id: crypto.randomUUID(),
        type: 'score',
        description:
          teamAStrokeScore !== undefined
            ? `Hole ${currentHole}: ${teamAStrokeScore}-${teamBStrokeScore}`
            : `Hole ${currentHole} scored`,
        metadata: {
          holeNumber: currentHole,
          result: winner === 'none' ? undefined : winner,
          teamAName,
          teamBName,
          teamAScore: teamAStrokeScore,
          teamBScore: teamBStrokeScore,
        },
        timestamp: Date.now(),
        onUndo: handleUndo,
      });

      if (scoringPreferences.autoAdvance && wasUnscored && !wouldCloseOut && currentHole < 18) {
        setTimeout(() => {
          nextHole();
        }, 300);
      }
    },
    [
      matchState,
      currentHoleResult,
      haptic,
      scoreHole,
      activeMatch,
      teamAName,
      teamBName,
      teamAColor,
      teamBColor,
      currentHole,
      handleUndo,
      scoringMode,
      scoringPreferences.autoAdvance,
      scoringPreferences.soundEffects,
      nextHole,
      recordScoreAudit,
    ]
  );

  // Score handler with celebrations
  const handleScore = useCallback(
    async (
      winner: HoleWinner,
      source?: 'swipe' | 'buttons' | 'strokes' | 'fourball' | 'oneHanded' | 'voice'
    ) => {
      if (isSaving || !matchState) return;
      const scoringSource = source ?? scoringMode;

      // Check for match closeout
      const wouldCloseOut =
        Math.abs(matchState.currentScore + (winner === 'teamA' ? 1 : winner === 'teamB' ? -1 : 0)) >
        matchState.holesRemaining - 1;

      if (scoringPreferences.confirmCloseout && wouldCloseOut && winner !== 'halved') {
        const winningTeam = winner === 'teamA' ? teamAName : teamBName;
        showConfirm({
          title: 'End Match?',
          message: `This will end the match with ${winningTeam} winning. Are you sure?`,
          confirmLabel: 'End Match',
          cancelLabel: 'Cancel',
          variant: 'warning',
          onConfirm: () => executeScore(winner, undefined, undefined, scoringSource),
        });
        return;
      }

      await executeScore(winner, undefined, undefined, scoringSource);
    },
    [
      isSaving,
      matchState,
      scoringPreferences.confirmCloseout,
      teamAName,
      teamBName,
      showConfirm,
      scoringMode,
      executeScore,
    ]
  );

  // Score handler with stroke scores (gross/net)
  const handleScoreWithStrokes = useCallback(
    async (winner: HoleWinner, teamAStrokeScore: number, teamBStrokeScore: number) => {
      if (isSaving || !matchState) return;

      // Check for match closeout
      const wouldCloseOut =
        Math.abs(matchState.currentScore + (winner === 'teamA' ? 1 : winner === 'teamB' ? -1 : 0)) >
        matchState.holesRemaining - 1;

      if (scoringPreferences.confirmCloseout && wouldCloseOut && winner !== 'halved') {
        const winningTeam = winner === 'teamA' ? teamAName : teamBName;
        showConfirm({
          title: 'End Match?',
          message: `This will end the match with ${winningTeam} winning. Are you sure?`,
          confirmLabel: 'End Match',
          cancelLabel: 'Cancel',
          variant: 'warning',
          onConfirm: () => executeScore(winner, teamAStrokeScore, teamBStrokeScore, 'strokes'),
        });
        return;
      }

      await executeScore(winner, teamAStrokeScore, teamBStrokeScore, 'strokes');
    },
    [
      isSaving,
      matchState,
      scoringPreferences.confirmCloseout,
      teamAName,
      teamBName,
      showConfirm,
      executeScore,
    ]
  );

  // Fourball score handler (individual player scores)
  const handleFourballScore = useCallback(
    async (
      winner: HoleWinner,
      teamABestScore: number,
      teamBBestScore: number,
      _teamAPlayerScores: PlayerHoleScore[],
      _teamBPlayerScores: PlayerHoleScore[]
    ) => {
      if (isSaving || !matchState) return;

      // TODO: Store individual player scores in HoleResult
      // For now, just record the best ball scores
      await executeScore(winner, teamABestScore, teamBBestScore, 'fourball');
    },
    [isSaving, matchState, executeScore]
  );

  // Voice score handler
  const handleVoiceScore = useCallback(
    (winner: HoleWinner) => {
      setShowVoiceModal(false);
      trackFeature('voice_scoring', 'used');
      handleScore(winner, 'voice');
    },
    [handleScore]
  );

  const handleQuickScoreTap = useCallback(
    (team: 'teamA' | 'teamB') => {
      if (isSaving || !matchState) return;
      const now = Date.now();
      const isConfirmed = quickScorePending?.team === team && quickScorePending.expiresAt > now;

      if (isConfirmed) {
        setQuickScorePending(undefined);
        handleScore(team === 'teamA' ? 'teamA' : 'teamB', 'buttons');
        return;
      }

      setQuickScorePending({ team, expiresAt: now + 2000 });
    },
    [isSaving, matchState, quickScorePending, handleScore]
  );

  // Photo capture handler
  const handlePhotoCapture = useCallback(
    (_photo: { id: string }) => {
      showToast('success', 'Photo saved to gallery');
    },
    [showToast]
  );

  // Press handler
  const handlePress = useCallback(
    (pressedBy: 'teamA' | 'teamB') => {
      if (!matchState) return;

      const newPress: Press = {
        id: `press-${Date.now()}`,
        startHole: currentHole,
        pressedBy,
        status: 'active',
        score: 0,
      };

      setPresses((prev) => [...prev, newPress]);
      haptic.tap();
      setToast({
        message: `${pressedBy === 'teamA' ? teamAName : teamBName} pressed!`,
        type: 'info',
      });
    },
    [currentHole, matchState, haptic, teamAName, teamBName]
  );

  // Update press scores - deferred to avoid setState-in-effect warning
  useEffect(() => {
    if (!matchState) return;

    // Defer state update to next tick to avoid cascading renders
    const timeoutId = setTimeout(() => {
      setPresses((prev) =>
        prev.map((press) => {
          if (press.status !== 'active') return press;

          const pressHoleResults = matchState.holeResults.filter(
            (r) => r.holeNumber >= press.startHole
          );

          let score = 0;
          for (const result of pressHoleResults) {
            if (result.winner === 'teamA') score += 1;
            else if (result.winner === 'teamB') score -= 1;
          }

          const holesRemaining = 18 - matchState.holesPlayed;
          const isClosedOut = Math.abs(score) > holesRemaining;

          if (isClosedOut || matchState.isClosedOut) {
            return {
              ...press,
              score,
              status: 'closed' as const,
              result: score > 0 ? 'teamA' : score < 0 ? 'teamB' : 'halved',
              closedAtHole: matchState.holesPlayed,
            };
          }

          return { ...press, score };
        })
      );
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [matchState]);

  // Loading / error / missing states
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen pb-nav page-premium-enter texture-grain bg-canvas font-sans">
        <main className="container-editorial py-12">
          <EmptyStatePremium
            illustration="scorecard"
            title="Sign in to score this match"
            description="Match scoring is available after you sign in."
            action={{
              label: 'Sign In',
              onClick: () => router.push('/login'),
            }}
            secondaryAction={{
              label: 'Back to Score',
              onClick: () => router.push('/score'),
            }}
            variant="large"
          />
        </main>
        <BottomNav />
      </div>
    );
  }

  if (isLoading) {
    return <PageLoadingSkeleton title="Scoring" variant="detail" />;
  }

  if (error) {
    return (
      <div
        className="min-h-screen pb-nav page-premium-enter texture-grain bg-canvas font-sans"
        role="alert"
      >
        <main className="container-editorial py-12">
          <ErrorEmpty message={error} onRetry={() => selectMatch(matchId)} />
          <div className="mt-4 flex justify-center">
            <button
              onClick={() => router.push('/score')}
              className="px-4 py-2 rounded-xl font-medium bg-canvas-raised border border-rule font-sans"
            >
              Back to Score
            </button>
          </div>
        </main>
        <BottomNav activeMatchId={matchId} />
      </div>
    );
  }

  if (!activeMatch || !matchState) {
    return (
      <div
        className="min-h-screen pb-nav page-premium-enter texture-grain bg-canvas font-sans"
        role="alert"
      >
        <main className="container-editorial py-12">
          <EmptyStatePremium
            illustration="flag"
            title="Match unavailable"
            description="This match may have been deleted or hasn't synced yet."
            action={{ label: 'Back to Score', onClick: () => router.push('/score') }}
            variant="large"
          />
        </main>
        <BottomNav activeMatchId={matchId} />
      </div>
    );
  }

  const isMatchComplete = matchState.isClosedOut || matchState.holesRemaining === 0;

  return (
    <div className="min-h-screen pb-nav page-premium-enter texture-grain bg-canvas font-sans">
      {/* Celebration Overlay - Lazy loaded for performance */}
      <AnimatePresence>
        {celebration && (
          <Suspense
            fallback={
              <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/35"
                role="status"
                aria-live="polite"
                aria-label="Loading celebration"
              >
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-canvas border border-rule">
                  <span className="w-3 h-3 border-2 border-masters border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm text-ink-secondary">
                    Loading…
                  </span>
                </div>
              </div>
            }
          >
            <ScoreCelebration
              type={celebration.type}
              winner={celebration.winner}
              teamName={celebration.teamName}
              teamColor={celebration.teamColor}
              holeNumber={celebration.holeNumber}
              finalScore={celebration.finalScore}
              show={true}
              onComplete={() => setCelebration(null)}
              duration={celebration.type === 'matchWon' ? 3500 : 1500}
            />
          </Suspense>
        )}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <ScoreToast
            message={toast.message}
            type={toast.type}
            show={true}
            onComplete={() => setToast(null)}
          />
        )}
      </AnimatePresence>

      {/* Sticky Undo Banner */}
      <StickyUndoBanner
        action={undoAction}
        duration={8000}
        bottomOffset={80}
        onDismiss={() => setUndoAction(null)}
      />

      {/* Voice Scoring Modal */}
      <AnimatePresence>
        {showVoiceModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          >
            <motion.div
              initial={prefersReducedMotion ? false : { scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-sm mx-4 p-6 rounded-2xl bg-canvas border border-rule"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-serif text-[length:var(--text-lg)] font-normal text-ink">Voice Score</h3>
                <button
                  onClick={() => setShowVoiceModal(false)}
                  className="p-2 rounded-xl transition-opacity"
                >
                  <X size={18} className="text-ink-secondary" />
                </button>
              </div>
              <VoiceScoring
                teamAName={teamAName}
                teamBName={teamBName}
                currentHole={currentHole}
                onScoreConfirmed={handleVoiceScore}
                floating={false}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stroke Alert Banner */}
      {!isMatchComplete &&
        (activeMatch.teamAHandicapAllowance > 0 || activeMatch.teamBHandicapAllowance > 0) && (
          <StrokeAlertBanner
            currentHole={currentHole}
            teamAStrokes={activeMatch.teamAHandicapAllowance}
            teamBStrokes={activeMatch.teamBHandicapAllowance}
            holeHandicaps={holeHandicaps}
            teamAName={teamAName}
            teamBName={teamBName}
            autoDismissMs={5000}
            onAlertShown={(hole, aStrokes, bStrokes) => {
              if (aStrokes > 0 || bStrokes > 0) {
                haptic.tap();
              }
            }}
            position="top"
          />
        )}

      {/* Header — minimal chrome, editorial restraint */}
      <header className="sticky top-0 z-30 border-b bg-canvas border-rule">
        <div className="container-editorial py-[var(--space-3)]">
          <div className="flex items-center justify-between">
            {/* Back + Title */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => router.push('/score')}
                className="p-2 -ml-2 rounded-xl transition-opacity"
                aria-label="Back"
              >
                <ChevronLeft size={20} className="text-ink-secondary" />
              </button>
              <div>
                <p className="type-overline text-masters">
                  Match {activeMatch.matchOrder}
                </p>
                <p className="font-sans text-[length:var(--text-xs)] text-ink-tertiary">
                  {teamAPlayers
                    .map((p) => formatPlayerName(p!.firstName, p!.lastName, 'short'))
                    .join(' & ')}{' '}
                  vs{' '}
                  {teamBPlayers
                    .map((p) => formatPlayerName(p!.firstName, p!.lastName, 'short'))
                    .join(' & ')}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1">
              {/* Voice */}
              <button
                onClick={() => setShowVoiceModal(true)}
                className="p-2 rounded-xl transition-opacity"
                aria-label="Voice scoring"
              >
                <Mic size={18} className="text-ink-secondary" />
              </button>

              {/* Undo */}
              <button
                onClick={handleUndo}
                disabled={undoStack.length === 0}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-xl font-sans transition-[opacity,background-color] duration-150 ${
                  undoStack.length > 0
                    ? 'text-masters bg-[var(--gold-subtle)] opacity-100'
                    : 'text-ink-tertiary bg-transparent opacity-50'
                }`}
                aria-label={`Undo last action${undoStack.length > 0 ? ` (${undoStack.length} available)` : ''}`}
              >
                <Undo2 size={14} />
                <span className="text-[length:var(--text-xs)] font-medium">Undo</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="container-editorial">
        {/* Score Hero — Monumental serif display, editorial whitespace */}
        <section className="pt-[var(--space-8)] pb-[var(--space-6)] text-center">
          <div className="flex items-center justify-center gap-8">
            {/* Team A */}
            <div className="flex-1 text-right">
              <p className="type-overline text-[color:var(--team-usa)]">{teamAName}</p>
              <p className="font-sans text-[length:var(--text-xs)] text-ink-tertiary mt-xs">
                {matchState.teamAHolesWon} holes
              </p>
            </div>

            {/* Score Display — monumental serif number */}
            <motion.div
              key={matchState.displayScore}
              initial={prefersReducedMotion ? false : { scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="text-center"
            >
              <p
                className={cn(
                  'score-monumental',
                  matchState.currentScore > 0
                    ? 'text-[color:var(--team-usa)]'
                    : matchState.currentScore < 0
                      ? 'text-[color:var(--team-europe)]'
                      : 'text-ink-tertiary'
                )}
              >
                {matchState.displayScore}
              </p>
              <p className="font-sans text-[length:var(--text-xs)] text-ink-tertiary mt-xs">
                thru {matchState.holesPlayed}
              </p>
              {matchState.isDormie && (
                <p className="flex items-center justify-center gap-1 font-sans text-[length:var(--text-xs)] text-gold mt-xs">
                  <AlertCircle size={12} />
                  Dormie
                </p>
              )}
            </motion.div>

            {/* Team B */}
            <div className="flex-1 text-left">
              <p className="type-overline text-[color:var(--team-europe)]">{teamBName}</p>
              <p className="font-sans text-[length:var(--text-xs)] text-ink-tertiary mt-xs">
                {matchState.teamBHolesWon} holes
              </p>
            </div>
          </div>
        </section>

        {/* Hole Mini-Map */}
        <section className="mb-4">
          <HoleMiniMap
            currentHole={currentHole}
            holeResults={matchState.holeResults}
            teamAName={teamAName}
            teamBName={teamBName}
            teamAColor={teamAColor}
            teamBColor={teamBColor}
            onHoleSelect={goToHole}
            isComplete={isMatchComplete}
          />
        </section>

        {/* Saving Indicator */}
        <AnimatePresence>
          {savingIndicator && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-4 flex items-center justify-center gap-2 py-2 px-4 rounded-full mx-auto w-fit bg-masters text-white"
            >
              <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span className="text-sm font-medium">{savingIndicator}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Scoring Area */}
        {!isMatchComplete ? (
          <section className="space-y-4">
            {/* Hole Navigation Header — immersive, focused */}
            <div className="flex items-center justify-between px-[var(--space-2)]">
              <button
                onClick={prevHole}
                disabled={currentHole <= 1}
                className={`p-3 rounded-xl transition-opacity ${currentHole <= 1 ? 'opacity-30' : 'opacity-100'}`}
              >
                <ChevronLeft size={24} className="text-ink-secondary" />
              </button>

              <div className="text-center">
                <p className="font-serif text-[length:var(--text-2xl)] font-normal tracking-[-0.01em] text-ink">
                  Hole {currentHole}
                </p>
                {currentHoleResult && currentHoleResult.winner !== 'none' && (
                  <p className="font-sans text-[length:var(--text-sm)] text-ink-tertiary mt-xxs">
                    {currentHoleResult.winner === 'halved'
                      ? 'Halved'
                      : currentHoleResult.winner === 'teamA'
                        ? `${teamAName} won`
                        : `${teamBName} won`}
                  </p>
                )}
              </div>

              <button
                onClick={nextHole}
                disabled={currentHole >= 18}
                className={`p-3 rounded-xl transition-opacity ${currentHole >= 18 ? 'opacity-30' : 'opacity-100'}`}
              >
                <ChevronRight size={24} className="text-ink-secondary" />
              </button>
            </div>

            {scoringPreferences.quickScoreMode && (
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleQuickScoreTap('teamA')}
                  className="rounded-2xl border-2 border-dashed px-4 py-6 text-center transition-colors bg-[color:var(--team-usa-glow)] border-[color:var(--team-usa)] text-[color:var(--team-usa)]"
                  aria-label={`Quick score ${teamAName}`}
                >
                  <p className="text-sm font-semibold uppercase tracking-wide">{teamAName}</p>
                  <p className="text-xs mt-2 text-ink-tertiary">
                    {quickScorePending?.team === 'teamA' ? 'Tap again to confirm' : 'Tap to score'}
                  </p>
                </button>
                <button
                  onClick={() => handleQuickScoreTap('teamB')}
                  className="rounded-2xl border-2 border-dashed px-4 py-6 text-center transition-colors bg-[color:var(--team-europe-glow)] border-[color:var(--team-europe)] text-[color:var(--team-europe)]"
                  aria-label={`Quick score ${teamBName}`}
                >
                  <p className="text-sm font-semibold uppercase tracking-wide">{teamBName}</p>
                  <p className="text-xs mt-2 text-ink-tertiary">
                    {quickScorePending?.team === 'teamB' ? 'Tap again to confirm' : 'Tap to score'}
                  </p>
                </button>
                {quickScorePending && (
                  <p className="col-span-2 text-center text-xs text-ink-tertiary">
                    Quick Score armed for{' '}
                    {quickScorePending.team === 'teamA' ? teamAName : teamBName}.
                  </p>
                )}
              </div>
            )}

            {/* Handicap Strokes */}
            {(activeMatch.teamAHandicapAllowance > 0 || activeMatch.teamBHandicapAllowance > 0) && (
              <button
                onClick={() => setShowHandicapDetails(!showHandicapDetails)}
                className="w-full"
              >
                <HandicapStrokeIndicator
                  currentHole={currentHole}
                  teamAStrokes={activeMatch.teamAHandicapAllowance}
                  teamBStrokes={activeMatch.teamBHandicapAllowance}
                  holeHandicaps={holeHandicaps}
                  teamAName={teamAName}
                  teamBName={teamBName}
                  showAllHoles={showHandicapDetails}
                />
              </button>
            )}

            {/* Swipe Score Panel */}
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
                    onScore={handleScore}
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
                    par={currentTeeSet?.holePars?.[currentHole - 1] || 4}
                    teamAName={teamAName}
                    teamBName={teamBName}
                    teamAColor={teamAColor}
                    teamBColor={teamBColor}
                    teamAHandicapStrokes={activeMatch.teamAHandicapAllowance}
                    teamBHandicapStrokes={activeMatch.teamBHandicapAllowance}
                    holeHandicaps={holeHandicaps}
                    initialTeamAScore={currentHoleResult?.teamAScore || null}
                    initialTeamBScore={currentHoleResult?.teamBScore || null}
                    onSubmit={handleScoreWithStrokes}
                    isSubmitting={isSaving}
                  />
                  {/* Show current hole gross/net if already scored */}
                  {currentHoleResult &&
                    (currentHoleResult.teamAScore || currentHoleResult.teamBScore) && (
                      <div className="mt-4 p-3 rounded-xl bg-canvas-sunken">
                        <p className="text-xs text-center text-ink-tertiary">
                          Previous score: {teamAName} {currentHoleResult.teamAScore} -{' '}
                          {currentHoleResult.teamBScore} {teamBName}
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
                    par={currentTeeSet?.holePars?.[currentHole - 1] || 4}
                    teamAName={teamAName}
                    teamBName={teamBName}
                    teamAColor={teamAColor}
                    teamBColor={teamBColor}
                    teamAPlayers={teamAPlayers.map((p) => ({
                      id: p!.id,
                      name: formatPlayerName(p!.firstName, p!.lastName),
                      courseHandicap: p!.handicapIndex || 0,
                    }))}
                    teamBPlayers={teamBPlayers.map((p) => ({
                      id: p!.id,
                      name: formatPlayerName(p!.firstName, p!.lastName),
                      courseHandicap: p!.handicapIndex || 0,
                    }))}
                    holeHandicaps={holeHandicaps}
                    initialTeamAScores={currentHoleResult?.teamAPlayerScores}
                    initialTeamBScores={currentHoleResult?.teamBPlayerScores}
                    onSubmit={handleFourballScore}
                    isSubmitting={isSaving}
                  />
                </motion.div>
              ) : scoringMode === 'oneHanded' ? (
                <motion.div
                  key="oneHanded"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="min-h-[50vh]"
                >
                  <OneHandedScoringPanel
                    holeNumber={currentHole}
                    teamAName={teamAName}
                    teamBName={teamBName}
                    teamAColor={teamAColor}
                    teamBColor={teamBColor}
                    existingResult={currentHoleResult?.winner}
                    onScore={handleScore}
                    onPrevHole={prevHole}
                    onNextHole={nextHole}
                    onUndo={handleUndo}
                    canUndo={undoStack.length > 0}
                    disabled={isSaving}
                    preferredHand={scoringPreferences.preferredHand}
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
                  className="space-y-3"
                >
                  {/* Traditional Buttons — clean, no scale transforms or glow */}
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      onClick={() => handleScore('teamA')}
                      disabled={isSaving}
                      className={`py-4 px-4 rounded-xl text-white font-sans font-semibold border-[3px] transition bg-[color:var(--team-usa)] ${
                        isSaving ? 'opacity-50' : 'opacity-100'
                      } ${
                        currentHoleResult?.winner === 'teamA' ? 'border-gold' : 'border-transparent'
                      }`}
                      aria-pressed={currentHoleResult?.winner === 'teamA'}
                      aria-label={`Score hole: ${teamAName} wins${currentHoleResult?.winner === 'teamA' ? ' (selected)' : ''}`}
                    >
                      <span className="block text-[length:var(--text-lg)]">{teamAName}</span>
                      <span className="block mt-0.5 text-[length:var(--text-xs)] opacity-80">wins hole</span>
                    </button>

                    <button
                      onClick={() => handleScore('halved')}
                      disabled={isSaving}
                      className={`py-4 px-4 rounded-xl font-sans font-semibold bg-canvas-raised border-[3px] transition ${
                        isSaving ? 'opacity-50' : 'opacity-100'
                      } ${
                        currentHoleResult?.winner === 'halved' ? 'border-gold' : 'border-rule'
                      }`}
                      aria-pressed={currentHoleResult?.winner === 'halved'}
                      aria-label={`Score hole: Halved${currentHoleResult?.winner === 'halved' ? ' (selected)' : ''}`}
                    >
                      <span className="block text-[length:var(--text-lg)]">Halve</span>
                      <span className="block mt-0.5 text-[length:var(--text-xs)] opacity-60">tie hole</span>
                    </button>

                    <button
                      onClick={() => handleScore('teamB')}
                      disabled={isSaving}
                      className={`py-4 px-4 rounded-xl text-white font-sans font-semibold border-[3px] transition bg-[color:var(--team-europe)] ${
                        isSaving ? 'opacity-50' : 'opacity-100'
                      } ${
                        currentHoleResult?.winner === 'teamB' ? 'border-gold' : 'border-transparent'
                      }`}
                      aria-pressed={currentHoleResult?.winner === 'teamB'}
                      aria-label={`Score hole: ${teamBName} wins${currentHoleResult?.winner === 'teamB' ? ' (selected)' : ''}`}
                    >
                      <span className="block text-[length:var(--text-lg)]">{teamBName}</span>
                      <span className="block mt-0.5 text-[length:var(--text-xs)] opacity-80">wins hole</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Advanced Tools (Presses, Side Bets) */}
            <div className="rounded-2xl border border-rule">
              <button
                onClick={() => setShowAdvancedTools((prev) => !prev)}
                className="w-full flex items-center justify-between px-4 py-3"
                aria-expanded={showAdvancedTools}
                aria-controls="advanced-scoring-tools"
              >
                <div className="text-left">
                  <p className="text-sm font-semibold text-ink">
                    Advanced tools
                  </p>
                  <p className="text-xs text-ink-tertiary">
                    Press tracker and side bets
                  </p>
                </div>
                <ChevronRight
                  size={18}
                  className={`transition-transform text-ink-tertiary ${showAdvancedTools ? 'rotate-90' : ''}`}
                />
              </button>

              {showAdvancedTools && (
                <div id="advanced-scoring-tools" className="px-4 pb-4 space-y-4">
                  <PressTracker
                    currentHole={currentHole}
                    mainMatchScore={matchState.currentScore}
                    holesRemaining={matchState.holesRemaining}
                    presses={presses}
                    onPress={handlePress}
                    teamAName={teamAName}
                    teamBName={teamBName}
                    betAmount={10}
                    autoPress={false}
                  />

                  <SideBetReminder
                    currentHole={currentHole}
                    bets={DEMO_SIDE_BETS}
                    currentPlayerId={teamAPlayers[0]?.id}
                  />
                </div>
              )}
            </div>

            {/* Scoring Mode Toggle — editorial pill selector */}
            <div className="flex justify-center pt-2 relative font-sans">
              {/* First-time onboarding tooltip */}
              <AnimatePresence>
                {showScoringModeTip && (
                  <motion.div
                    initial={prefersReducedMotion ? false : { opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 6 }}
                    transition={{ duration: 0.2 }}
                    className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 w-64 p-3 rounded-xl z-50 bg-canvas-raised border border-rule shadow-card"
                  >
                    <div className="flex items-start gap-2">
                      <Sparkles
                        size={16}
                        className="shrink-0 mt-0.5 text-masters"
                      />
                      <div>
                        <p className="text-sm font-medium text-ink">
                          Multiple scoring modes!
                        </p>
                        <p className="text-xs mt-1 text-ink-secondary">
                          Try <strong>Swipe</strong> for fast scoring, <strong>Strokes</strong> for
                          detailed entry, or <strong>One-Hand</strong> while holding a beer.
                        </p>
                        <button
                          onClick={dismissScoringModeTip}
                          className="mt-2 text-xs font-medium px-2 py-1 rounded bg-masters text-white"
                        >
                          Got it!
                        </button>
                      </div>
                    </div>
                    {/* Arrow pointing down */}
                    <div className="absolute left-1/2 -translate-x-1/2 -bottom-2 w-4 h-4 rotate-45 bg-[var(--surface-raised)] border-r border-b border-[var(--rule)]" />
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-canvas-sunken">
                <button
                  onClick={() => handleScoringModeChange('swipe')}
                  className={`px-3 py-1 rounded-full transition-all ${
                    scoringMode === 'swipe'
                      ? 'bg-canvas text-ink shadow-card-sm'
                      : 'bg-transparent text-ink-tertiary shadow-none'
                  }`}
                >
                  Swipe
                </button>
                <button
                  onClick={() => handleScoringModeChange('buttons')}
                  className={`px-3 py-1 rounded-full transition-all ${
                    scoringMode === 'buttons'
                      ? 'bg-canvas text-ink shadow-card-sm'
                      : 'bg-transparent text-ink-tertiary shadow-none'
                  }`}
                >
                  Buttons
                </button>
                <button
                  onClick={() => handleScoringModeChange('strokes')}
                  className={`px-3 py-1 rounded-full transition-all ${
                    scoringMode === 'strokes'
                      ? 'bg-canvas text-ink shadow-card-sm'
                      : 'bg-transparent text-ink-tertiary shadow-none'
                  }`}
                >
                  Strokes
                </button>
                {isFourball && (
                  <button
                    onClick={() => handleScoringModeChange('fourball')}
                    className={`px-3 py-1 rounded-full transition-all ${
                      scoringMode === 'fourball'
                        ? 'bg-masters text-white shadow-card-sm'
                        : 'bg-transparent text-ink-tertiary shadow-none'
                    }`}
                  >
                    Best Ball
                  </button>
                )}
                <button
                  onClick={() => handleScoringModeChange('oneHanded')}
                  className={`px-3 py-1 rounded-full transition-all ${
                    scoringMode === 'oneHanded'
                      ? 'bg-masters text-white shadow-card-sm'
                      : 'bg-transparent text-ink-tertiary shadow-none'
                  }`}
                >
                  ✋ One-Hand
                </button>
              </div>
            </div>
          </section>
        ) : (
          /* Match Complete State — Editorial, restrained celebration */
          <section className="pt-[var(--space-10)] pb-[var(--space-8)] text-center">
            {/* Restrained confetti — fewer pieces, no glow */}
            {!prefersReducedMotion && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.6 }}
                className="absolute inset-0 pointer-events-none overflow-hidden"
              >
                {confettiPieces.slice(0, 12).map((piece) => (
                  <motion.div
                    key={piece.i}
                    className={`absolute w-2 h-2 rounded-full ${
                      piece.i % 3 === 0
                        ? 'bg-masters'
                        : piece.i % 3 === 1
                          ? 'bg-gold'
                          : 'bg-maroon'
                    }`}
                    initial={{
                      opacity: 1,
                      x: '50%',
                      y: '30%',
                      scale: 0,
                    }}
                    animate={{
                      opacity: [1, 0.6, 0],
                      x: piece.x,
                      y: piece.y,
                      scale: [0, 1, 0.5],
                      rotate: piece.rotate,
                    }}
                    transition={{
                      duration: piece.duration,
                      delay: piece.i * 0.06,
                      ease: 'easeOut',
                    }}
                  />
                ))}
              </motion.div>
            )}

            <motion.div
              initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              className="relative z-10"
            >
              {/* Trophy Icon — clean, no glow */}
              <div
                className={cn(
                  'w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-[var(--space-6)]',
                  matchState.winningTeam === 'teamA'
                    ? 'bg-[color:var(--team-usa)]'
                    : matchState.winningTeam === 'teamB'
                      ? 'bg-[color:var(--team-europe)]'
                      : 'bg-[color:var(--ink-tertiary)]'
                )}
              >
                <Trophy className="w-10 h-10 text-white" />
              </div>

              {/* Winner Announcement — serif display */}
              <h2 className="font-serif text-[length:var(--text-3xl)] font-normal tracking-[-0.02em] text-ink mb-[var(--space-2)]">
                {matchState.winningTeam === 'halved'
                  ? 'Match Halved'
                  : `${matchState.winningTeam === 'teamA' ? teamAName : teamBName} Wins`}
              </h2>

              {/* Final Score — monumental serif */}
              <p
                className={cn(
                  'score-monumental mb-[var(--space-8)]',
                  matchState.winningTeam === 'teamA'
                    ? 'text-[color:var(--team-usa)]'
                    : matchState.winningTeam === 'teamB'
                      ? 'text-[color:var(--team-europe)]'
                      : 'text-ink-secondary'
                )}
              >
                {matchState.displayScore}
              </p>

              {/* Match Stats Card — editorial card */}
              <div className="card-editorial mx-auto max-w-sm mb-[var(--space-6)]">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="font-serif text-[length:var(--text-2xl)] text-[color:var(--team-usa)]">
                      {matchState.teamAHolesWon}
                    </p>
                    <p className="font-sans text-[length:var(--text-xs)] text-ink-tertiary mt-xs">
                      {teamAName} Holes
                    </p>
                  </div>
                  <div>
                    <p className="font-serif text-[length:var(--text-2xl)] text-ink-tertiary">
                      {matchState.holeResults.filter((r) => r.winner === 'halved').length}
                    </p>
                    <p className="font-sans text-[length:var(--text-xs)] text-ink-tertiary mt-xs">
                      Halved
                    </p>
                  </div>
                  <div>
                    <p className="font-serif text-[length:var(--text-2xl)] text-[color:var(--team-europe)]">
                      {matchState.teamBHolesWon}
                    </p>
                    <p className="font-sans text-[length:var(--text-xs)] text-ink-tertiary mt-xs">
                      {teamBName} Holes
                    </p>
                  </div>
                </div>
                <div className="mt-[var(--space-4)] pt-[var(--space-4)] border-t border-rule">
                  <p className="font-sans text-[length:var(--text-sm)] text-ink-secondary">
                    Completed through hole {matchState.holesPlayed}
                  </p>
                </div>
              </div>

              <div className="card-editorial mx-auto max-w-sm text-left mb-[var(--space-6)]">
                <p className="font-sans text-[length:var(--text-sm)] font-semibold text-ink">
                  Match Summary
                </p>
                <p className="font-sans text-[length:var(--text-xs)] text-ink-tertiary whitespace-pre-line mt-[var(--space-2)]">
                  {buildMatchSummaryText()}
                </p>
                <div className="mt-[var(--space-4)] flex flex-col gap-[var(--space-2)]">
                  <button
                    onClick={() => {
                      const shareText = buildMatchSummaryText();
                      if (navigator.share) {
                        navigator.share({ text: shareText });
                      } else {
                        navigator.clipboard.writeText(shareText);
                        showToast('success', 'Summary copied to clipboard!');
                      }
                    }}
                    className="w-full py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 font-sans font-medium bg-canvas border border-rule"
                  >
                    <Share2 size={16} />
                    Share Summary
                  </button>
                  <button
                    onClick={handleExportSummary}
                    className="w-full py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 font-sans font-medium bg-masters text-white"
                  >
                    <Trophy size={16} />
                    Export PDF Keepsake
                  </button>
                </div>
              </div>

              {/* Action Buttons -- editorial CTAs, no scale transforms */}
              <div className="flex flex-col gap-3 max-w-sm mx-auto">
                {/* Score Next Match - Primary CTA if available */}
                {nextIncompleteMatch && (
                  <button
                    onClick={() => router.push(`/score/${nextIncompleteMatch.id}`)}
                    className="w-full py-4 px-6 rounded-xl flex items-center justify-center gap-2 font-sans font-semibold bg-masters text-white"
                  >
                    Score Next Match
                    <ArrowRight size={20} />
                  </button>
                )}

                {/* View Standings */}
                <button
                  onClick={() => router.push('/standings')}
                  className={`w-full py-3 px-6 rounded-xl flex items-center justify-center gap-2 font-sans ${
                    nextIncompleteMatch
                      ? 'font-medium bg-canvas-raised border border-rule text-ink'
                      : 'font-semibold bg-masters text-white'
                  }`}
                >
                  <BarChart3 size={nextIncompleteMatch ? 18 : 20} />
                  View Standings
                </button>

                {/* Share Result */}
                <button
                  onClick={() => {
                    const winnerText =
                      matchState.winningTeam === 'halved'
                        ? 'Match halved!'
                        : `${matchState.winningTeam === 'teamA' ? teamAName : teamBName} wins ${matchState.displayScore}!`;
                    const shareText = `${winnerText}\n${teamAPlayers.map((p) => formatPlayerName(p!.firstName, p!.lastName, 'short')).join(' & ')} vs ${teamBPlayers.map((p) => formatPlayerName(p!.firstName, p!.lastName, 'short')).join(' & ')}`;

                    if (navigator.share) {
                      navigator.share({ text: shareText });
                    } else {
                      navigator.clipboard.writeText(shareText);
                      showToast('success', 'Result copied to clipboard!');
                    }
                  }}
                  className="w-full py-3 px-6 rounded-xl flex items-center justify-center gap-2 font-sans font-medium bg-canvas-raised border border-rule text-ink"
                >
                  <Share2 size={18} />
                  Share Result
                </button>

                {/* Back to Matches */}
                <button
                  onClick={() => router.push('/score')}
                  className="w-full py-3 px-6 rounded-xl text-center font-sans font-medium text-ink-secondary"
                >
                  Back to Matches
                </button>
              </div>
            </motion.div>
          </section>
        )}

        {/* Weather Alerts */}
        <section className="mt-4">
          <WeatherAlerts showWeatherBar={true} />
        </section>
      </main>

      {/* Quick Photo Capture - Fixed position */}
      {!isMatchComplete && (
        <div className="fixed bottom-24 left-4 z-40">
          <QuickPhotoCapture
            matchId={matchId}
            holeNumber={currentHole}
            teamAName={teamAName}
            teamBName={teamBName}
            onCapture={handlePhotoCapture}
          />
        </div>
      )}

      {/* Voice Scoring FAB - Fixed position, restrained */}
      {!isMatchComplete && (
        <div className="fixed bottom-24 right-4 z-40">
          <button
            onClick={() => setShowVoiceModal(true)}
            className="w-14 h-14 rounded-full flex items-center justify-center bg-masters text-white shadow-[0_2px_8px_rgba(0,102,68,0.2)] transition-opacity"
            aria-label="Voice scoring"
          >
            <Mic size={24} />
          </button>
        </div>
      )}

      {/* Confirm Dialog */}
      {ConfirmDialogComponent}

      <BottomNav activeMatchId={activeMatch.id} />
    </div>
  );
}
