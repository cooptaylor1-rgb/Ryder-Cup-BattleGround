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
import { AnimatePresence } from 'framer-motion';
import { useAuthStore, useScoringStore, useTripStore, useUIStore } from '@/lib/stores';
import { useMatchState, useHaptic } from '@/lib/hooks';
import { useOnlineStatus } from '@/lib/hooks/useOnlineStatus';
import { formatPlayerName } from '@/lib/utils';
import { deriveScoreAuditAction } from '@/lib/utils/scoringAudit';
import { usePrefersReducedMotion } from '@/lib/utils/accessibility';
import { addAuditLogEntry, db } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { createAuditEntry } from '@/lib/services/sessionLockService';
import { createCorrelationId, trackFeature, trackScoreEntry, trackScoreUndo } from '@/lib/services/analyticsService';
import { playScoreSound } from '@/lib/services/soundEffects';
import type { HoleWinner, PlayerHoleScore } from '@/lib/types/models';
import { TEAM_COLORS } from '@/lib/constants/teamColors';

// Core scoring components - loaded immediately
import {
  ScoreToast,
  type Press,
} from '@/components/scoring';
// Lazy load heavy components that aren't immediately needed
const ScoreCelebration = lazy(() =>
  import('@/components/scoring').then((mod) => ({ default: mod.ScoreCelebration }))
);
import {
  StickyUndoBanner,
  WeatherAlerts,
  type UndoAction,
} from '@/components/live-play';
import { useConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyStatePremium, ErrorEmpty, PageLoadingSkeleton } from '@/components/ui';

import { MatchScoringCompleteState } from './MatchScoringCompleteState';
import { MatchScoringActiveState } from './MatchScoringActiveState';
import { MatchScoringHeroSection } from './MatchScoringHeroSection';
import { MatchScoringSupportLayer } from './MatchScoringSupportLayer';
import {
  getScoringModeMeta,
  type ScoringMode,
} from './matchScoringShared';
import { hashStringToSeed, mulberry32, toReminderBet } from './matchScoringUtils';

/**
 * Enhanced Match Scoring Page
 *
 * Sacred action surface redesigned for Phase 1 excellence.
 */
export default function MatchScoringPageClient() {
  const router = useRouter();
  const params = useParams();
  const matchId = params.matchId as string;

  const { currentTrip, players, teams, teeSets, sessions } = useTripStore();

  // Load real side bets for this trip from IndexedDB
  const dbSideBets = useLiveQuery(
    async () => {
      if (!currentTrip) return [];
      return db.sideBets
        .where('tripId')
        .equals(currentTrip.id)
        .toArray();
    },
    [currentTrip?.id],
    []
  );
  const activeSideBets = useMemo(
    () => (dbSideBets ?? []).filter(b => b.status === 'active').map(toReminderBet),
    [dbSideBets]
  );
  const { currentUser, isAuthenticated } = useAuthStore();
  const {
    showToast,
    scoringPreferences,
    getScoringModeForFormat,
    setScoringModeForFormat,
    isCaptainMode,
  } = useUIStore();
  const haptic = useHaptic();
  const isOnline = useOnlineStatus();
  const prefersReducedMotion = usePrefersReducedMotion();

  const [isEditingScores, setIsEditingScores] = useState(false);

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
  const [scoringMode, setScoringMode] = useState<ScoringMode>(() => {
    if (!currentSession) return scoringPreferences.oneHandedMode ? 'oneHanded' : 'swipe';
    return getScoringModeForFormat(currentSession.sessionType);
  });

  const handleScoringModeChange = (mode: ScoringMode) => {
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
  const teamAFourballPlayers = useMemo(
    () =>
      teamAPlayers.map((player) => ({
        id: player!.id,
        name: formatPlayerName(player!.firstName, player!.lastName),
        courseHandicap: player!.handicapIndex || 0,
      })),
    [teamAPlayers]
  );
  const teamBFourballPlayers = useMemo(
    () =>
      teamBPlayers.map((player) => ({
        id: player!.id,
        name: formatPlayerName(player!.firstName, player!.lastName),
        courseHandicap: player!.handicapIndex || 0,
      })),
    [teamBPlayers]
  );

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
      } catch {
        // Audit logging is best-effort; don't pollute the console in production
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
      source?: 'swipe' | 'buttons' | 'strokes' | 'fourball' | 'oneHanded' | 'voice',
      teamAPlayerScores?: PlayerHoleScore[],
      teamBPlayerScores?: PlayerHoleScore[],
    ) => {
      if (!matchState) return;
      const scoringSource = source ?? scoringMode;
      const scoreAuditAction = deriveScoreAuditAction(currentHoleResult);
      const wasUnscored = scoreAuditAction === 'scoreEntered';
      const analyticsMethod: 'manual' | 'quick' | 'voice' | 'ocr' =
        scoringSource === 'voice'
          ? 'voice'
          : scoringSource === 'swipe' || scoringSource === 'oneHanded'
            ? 'quick'
            : 'manual';

      // Show saving indicator
      setSavingIndicator('Saving score...');

      // Score the hole (with optional individual player scores for fourball)
      haptic.scorePoint();
      if (teamAStrokeScore !== undefined && teamBStrokeScore !== undefined) {
        await scoreHole(winner, teamAStrokeScore, teamBStrokeScore, teamAPlayerScores, teamBPlayerScores);
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
        action: scoreAuditAction,
        holeNumber: currentHole,
        winner,
        teamAStrokeScore,
        teamBStrokeScore,
        method: analyticsMethod,
      });

      // Show save confirmation with sync context
      setSavingIndicator(isOnline ? 'Score saved' : 'Saved offline');
      setTimeout(() => setSavingIndicator(null), 1500);

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
      isOnline,
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
      teamAPlayerScores: PlayerHoleScore[],
      teamBPlayerScores: PlayerHoleScore[]
    ) => {
      if (isSaving || !matchState) return;

      // Pass individual player scores through to be stored on the HoleResult
      await executeScore(winner, teamABestScore, teamBBestScore, 'fourball', teamAPlayerScores, teamBPlayerScores);
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

  const teamALineup = teamAPlayers
    .map((p) => formatPlayerName(p!.firstName, p!.lastName, 'short'))
    .join(' & ');
  const teamBLineup = teamBPlayers
    .map((p) => formatPlayerName(p!.firstName, p!.lastName, 'short'))
    .join(' & ');
  const currentPar = currentTeeSet?.holePars?.[currentHole - 1] || 4;
  const scoringModeMeta = getScoringModeMeta(scoringMode, isFourball);
  const isMatchComplete = Boolean(matchState && (matchState.isClosedOut || matchState.holesRemaining === 0));
  const matchStatusLabel = isMatchComplete
    ? 'Final card'
    : isEditingScores
      ? 'Captain editing'
      : 'Live scoring';
  const summaryText = useMemo(() => buildMatchSummaryText(), [buildMatchSummaryText]);

  const handleShareSummary = useCallback(() => {
    if (!summaryText) return;

    if (navigator.share) {
      void navigator.share({ text: summaryText });
      return;
    }

    navigator.clipboard.writeText(summaryText);
    showToast('success', 'Summary copied to clipboard!');
  }, [summaryText, showToast]);

  const handleShareResult = useCallback(() => {
    if (!matchState) return;

    const winnerText =
      matchState.winningTeam === 'halved'
        ? 'Match halved!'
        : `${matchState.winningTeam === 'teamA' ? teamAName : teamBName} wins ${matchState.displayScore}!`;
    const shareText = `${winnerText}\n${teamALineup} vs ${teamBLineup}`;

    if (navigator.share) {
      void navigator.share({ text: shareText });
      return;
    }

    navigator.clipboard.writeText(shareText);
    showToast('success', 'Result copied to clipboard!');
  }, [matchState, showToast, teamALineup, teamAName, teamBLineup, teamBName]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen page-premium-enter texture-grain bg-canvas font-sans">
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
      </div>
    );
  }

  if (isLoading) {
    return <PageLoadingSkeleton title="Scoring" variant="detail" />;
  }

  if (error) {
    return (
      <div
        className="min-h-screen page-premium-enter texture-grain bg-canvas font-sans"
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
      </div>
    );
  }

  if (!activeMatch || !matchState) {
    return (
      <div
        className="min-h-screen page-premium-enter texture-grain bg-canvas font-sans"
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
      </div>
    );
  }

  return (
    <div className="min-h-screen page-premium-enter texture-grain bg-canvas font-sans">
      {/* Celebration Overlay - Lazy loaded for performance */}
      <AnimatePresence>
        {celebration && (
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

      <MatchScoringSupportLayer
        isMatchComplete={isMatchComplete}
        showVoiceModal={showVoiceModal}
        currentHole={currentHole}
        matchId={matchId}
        teamAName={teamAName}
        teamBName={teamBName}
        teamAHandicapAllowance={activeMatch.teamAHandicapAllowance}
        teamBHandicapAllowance={activeMatch.teamBHandicapAllowance}
        holeHandicaps={holeHandicaps}
        onCloseVoiceModal={() => setShowVoiceModal(false)}
        onOpenVoiceModal={() => setShowVoiceModal(true)}
        onVoiceScoreConfirmed={handleVoiceScore}
        onPhotoCapture={handlePhotoCapture}
        onStrokeAlertShown={(_hole, aStrokes, bStrokes) => {
          if (aStrokes > 0 || bStrokes > 0) {
            haptic.tap();
          }
        }}
      />

      <MatchScoringHeroSection
        matchOrder={activeMatch.matchOrder}
        sessionLabel={currentSession ? currentSession.sessionType : 'Match play'}
        teamALineup={teamALineup}
        teamBLineup={teamBLineup}
        matchStatusLabel={matchStatusLabel}
        isMatchComplete={isMatchComplete}
        matchState={matchState}
        prefersReducedMotion={prefersReducedMotion}
        teamAName={teamAName}
        teamBName={teamBName}
        teamAColor={teamAColor}
        teamBColor={teamBColor}
        currentHole={currentHole}
        currentPar={currentPar}
        scoringModeMeta={scoringModeMeta}
        savingIndicator={savingIndicator}
        undoCount={undoStack.length}
        onBack={() => router.push('/score')}
        onOpenVoiceScoring={() => setShowVoiceModal(true)}
        onUndo={handleUndo}
        onHoleSelect={goToHole}
      />

      <main className="container-editorial">
        {!isMatchComplete || isEditingScores ? (
          <MatchScoringActiveState
            isEditingScores={isEditingScores}
            isMatchComplete={isMatchComplete}
            currentHole={currentHole}
            currentHoleResult={currentHoleResult}
            currentPar={currentPar}
            matchState={matchState}
            scoringMode={scoringMode}
            scoringModeMeta={scoringModeMeta}
            isFourball={isFourball}
            quickScoreMode={scoringPreferences.quickScoreMode}
            preferredHand={scoringPreferences.preferredHand}
            quickScorePendingTeam={quickScorePending?.team}
            showHandicapDetails={showHandicapDetails}
            showScoringModeTip={showScoringModeTip}
            showAdvancedTools={showAdvancedTools}
            prefersReducedMotion={prefersReducedMotion}
            isSaving={isSaving}
            undoCount={undoStack.length}
            teamAName={teamAName}
            teamBName={teamBName}
            teamAColor={teamAColor}
            teamBColor={teamBColor}
            teamAHandicapAllowance={activeMatch.teamAHandicapAllowance}
            teamBHandicapAllowance={activeMatch.teamBHandicapAllowance}
            holeHandicaps={holeHandicaps}
            presses={presses}
            activeSideBets={activeSideBets}
            currentPlayerIdForBets={teamAPlayers[0]?.id}
            teamAFourballPlayers={teamAFourballPlayers}
            teamBFourballPlayers={teamBFourballPlayers}
            onFinishEditing={() => setIsEditingScores(false)}
            onPrevHole={prevHole}
            onNextHole={nextHole}
            onDismissScoringModeTip={dismissScoringModeTip}
            onScoringModeChange={handleScoringModeChange}
            onQuickScoreTap={handleQuickScoreTap}
            onToggleShowHandicapDetails={() => setShowHandicapDetails((prev) => !prev)}
            onScore={handleScore}
            onScoreWithStrokes={handleScoreWithStrokes}
            onFourballScore={handleFourballScore}
            onUndo={handleUndo}
            onToggleShowAdvancedTools={() => setShowAdvancedTools((prev) => !prev)}
            onPress={handlePress}
          />
        ) : (
          <MatchScoringCompleteState
            confettiPieces={confettiPieces}
            prefersReducedMotion={prefersReducedMotion}
            winningTeam={matchState.winningTeam}
            displayScore={matchState.displayScore}
            teamAHolesWon={matchState.teamAHolesWon}
            teamBHolesWon={matchState.teamBHolesWon}
            halvedHoles={matchState.holeResults.filter((result) => result.winner === 'halved').length}
            holesPlayed={matchState.holesPlayed}
            teamAName={teamAName}
            teamBName={teamBName}
            summaryText={summaryText}
            nextIncompleteMatchId={nextIncompleteMatch?.id}
            canEditScores={isCaptainMode}
            onScoreNextMatch={(id) => router.push(`/score/${id}`)}
            onViewStandings={() => router.push('/standings')}
            onShareSummary={handleShareSummary}
            onExportSummary={handleExportSummary}
            onShareResult={handleShareResult}
            onEditScores={() => {
              setIsEditingScores(true);
              goToHole(1);
            }}
            onBackToMatches={() => router.push('/score')}
          />
        )}

        {/* Weather Alerts */}
        <section className="mt-4">
          <WeatherAlerts showWeatherBar={true} />
        </section>
      </main>

      {/* Confirm Dialog */}
      {ConfirmDialogComponent}

    </div>
  );
}
