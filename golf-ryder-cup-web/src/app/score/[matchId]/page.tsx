'use client';

import { useEffect, useMemo, useState, useCallback, TouchEvent } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useScoringStore, useTripStore, useUIStore } from '@/lib/stores';
import { useMatchState, useHaptic } from '@/lib/hooks';
import { formatPlayerName } from '@/lib/utils';
import { Undo2, ChevronLeft, ChevronRight, Check, AlertCircle, Camera, Mic, Zap } from 'lucide-react';
import type { HoleWinner } from '@/lib/types/models';
import {
  StickyUndoBanner,
  QuickPhotoCapture,
  VoiceScoring,
  SideBetReminder,
  WeatherAlerts,
  type UndoAction,
} from '@/components/live-play';
import { PressTracker, HandicapStrokeIndicator, StrokeAlertBanner, type Press } from '@/components/scoring';

/**
 * MATCH SCORING PAGE - Sacred Action Surface
 *
 * This is sacred. Design for:
 * - Fast, legible, stress-free
 * - Large tap targets for outdoor use
 * - Clear score deltas
 * - Minimal decoration
 * - Undo is always visible
 *
 * Enhanced (v2.0):
 * - Sticky undo banner with 5-second window
 * - Quick photo capture
 * - Voice scoring
 * - Side bet reminders
 * - Weather alerts
 */

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

export default function MatchScoringPage() {
  const router = useRouter();
  const params = useParams();
  const matchId = params.matchId as string;

  const { players, teams } = useTripStore();
  const { showToast, scoringPreferences } = useUIStore();
  const haptic = useHaptic();

  const {
    activeMatch,
    activeMatchState,
    currentHole,
    isSaving,
    undoStack,
    selectMatch,
    scoreHole,
    undoLastHole,
    goToHole,
    nextHole,
    prevHole,
  } = useScoringStore();

  // Swipe state
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  // Undo banner state
  const [undoAction, setUndoAction] = useState<UndoAction | null>(null);

  // Press tracking state
  const [presses, setPresses] = useState<Press[]>([]);
  const [showHandicapDetails, setShowHandicapDetails] = useState(false);

  // Live match state
  const liveMatchState = useMatchState(matchId);
  const matchState = liveMatchState || activeMatchState;

  // Get tee set for handicap info (would come from match/course data)
  const { teeSets } = useTripStore();
  const currentTeeSet = activeMatch?.teeSetId
    ? teeSets.find(t => t.id === activeMatch.teeSetId)
    : teeSets[0]; // Fallback to first tee set

  // Demo hole handicaps if no real data (standard layout)
  const holeHandicaps = currentTeeSet?.holeHandicaps || [
    7, 11, 3, 13, 9, 1, 15, 5, 17, 8, 16, 10, 4, 12, 6, 18, 2, 14
  ];

  useEffect(() => {
    if (matchId && (!activeMatch || activeMatch.id !== matchId)) {
      selectMatch(matchId);
    }
  }, [matchId, activeMatch, selectMatch]);

  const teamA = teams.find(t => t.color === 'usa');
  const teamB = teams.find(t => t.color === 'europe');
  const teamAName = teamA?.name || 'USA';
  const teamBName = teamB?.name || 'Europe';

  const teamAPlayers = useMemo(() => {
    if (!activeMatch) return [];
    return activeMatch.teamAPlayerIds
      .map(id => players.find(p => p.id === id))
      .filter(Boolean);
  }, [activeMatch, players]);

  const teamBPlayers = useMemo(() => {
    if (!activeMatch) return [];
    return activeMatch.teamBPlayerIds
      .map(id => players.find(p => p.id === id))
      .filter(Boolean);
  }, [activeMatch, players]);

  const currentHoleResult = useMemo(() => {
    if (!matchState) return null;
    return matchState.holeResults.find(r => r.holeNumber === currentHole);
  }, [matchState, currentHole]);

  // Swipe handlers
  const minSwipeDistance = 50;

  const onTouchStart = (e: TouchEvent) => {
    if (!scoringPreferences.swipeNavigation) return;
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: TouchEvent) => {
    if (!scoringPreferences.swipeNavigation) return;
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!scoringPreferences.swipeNavigation || !touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && currentHole < 18) {
      nextHole();
      haptic.tap();
    } else if (isRightSwipe && currentHole > 1) {
      prevHole();
      haptic.tap();
    }
  };

  const handleScore = async (winner: HoleWinner) => {
    if (isSaving) return;

    if (scoringPreferences.confirmCloseout && matchState) {
      const wouldCloseOut =
        Math.abs(matchState.currentScore + (winner === 'teamA' ? 1 : winner === 'teamB' ? -1 : 0))
        > (matchState.holesRemaining - 1);

      if (wouldCloseOut && winner !== 'halved') {
        const winningTeam = winner === 'teamA' ? teamAName : teamBName;
        if (!confirm(`This will end the match with ${winningTeam} winning. Continue?`)) {
          return;
        }
      }
    }

    haptic.scorePoint();
    try {
      await scoreHole(winner);
    } catch (error) {
      console.error('Failed to score hole:', error);
      return;
    }

    // Show sticky undo banner
    setUndoAction({
      id: crypto.randomUUID(),
      type: 'score',
      description: `Hole ${currentHole} scored`,
      metadata: {
        holeNumber: currentHole,
        result: winner === 'none' ? undefined : winner,
        teamAName,
        teamBName,
      },
      timestamp: Date.now(),
      onUndo: handleUndo,
    });
  };

  const handleUndo = useCallback(async () => {
    if (undoStack.length === 0) return;
    haptic.warning();
    await undoLastHole();
    setUndoAction(null);
  }, [undoStack.length, haptic, undoLastHole]);

  // Handle voice score - intentionally not including handleScore in deps
  // as we want to capture the current handleScore function at call time
  const handleVoiceScore = useCallback((winner: HoleWinner) => {
    handleScore(winner);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSaving, scoringPreferences.confirmCloseout, matchState, teamAName, teamBName, currentHole]);

  // Handle photo capture
  const handlePhotoCapture = useCallback((photo: { id: string }) => {
    showToast('success', 'Photo saved to gallery');
  }, [showToast]);

  // Handle press bet
  const handlePress = useCallback((pressedBy: 'teamA' | 'teamB') => {
    if (!matchState) return;

    const newPress: Press = {
      id: `press-${Date.now()}`,
      startHole: currentHole,
      pressedBy,
      status: 'active',
      score: 0,
    };

    setPresses(prev => [...prev, newPress]);
    haptic.tap();
    showToast('info', `${pressedBy === 'teamA' ? teamAName : teamBName} pressed!`);
  }, [currentHole, matchState, haptic, showToast, teamAName, teamBName]);

  // Update press scores when match score changes
  useEffect(() => {
    if (!matchState) return;

    setPresses(prev => prev.map(press => {
      if (press.status !== 'active') return press;

      // Calculate score for this press from its start hole
      const pressHoleResults = matchState.holeResults.filter(
        r => r.holeNumber >= press.startHole
      );

      let score = 0;
      for (const result of pressHoleResults) {
        if (result.winner === 'teamA') score += 1;
        else if (result.winner === 'teamB') score -= 1;
      }

      // Check if press should close (match ends)
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
    }));
  }, [matchState]);

  if (!activeMatch || !matchState) {
    return (
      <div className="min-h-screen" style={{ background: 'var(--canvas)' }}>
        <header className="header">
          <div className="container-editorial flex items-center gap-3">
            <button onClick={() => router.back()} className="nav-item p-1" aria-label="Back">
              <ChevronLeft size={20} />
            </button>
            <span className="type-overline">Scoring</span>
          </div>
        </header>
        <div className="flex items-center justify-center h-64">
          <p className="type-meta">Loading…</p>
        </div>
      </div>
    );
  }

  const isMatchComplete = matchState.isClosedOut || matchState.holesRemaining === 0;

  return (
    <div
      className="min-h-screen"
      style={{ background: 'var(--canvas)' }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Header */}
      <header className="header">
        <div className="container-editorial flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/score')} className="nav-item p-1" aria-label="Back">
              <ChevronLeft size={20} />
            </button>
            <span className="type-overline">Match {activeMatch.matchOrder}</span>
          </div>

          {/* Undo - Always visible in header */}
          <button
            onClick={handleUndo}
            disabled={undoStack.length === 0}
            className="flex items-center gap-1 type-meta"
            style={{
              color: undoStack.length > 0 ? 'var(--masters)' : 'var(--ink-tertiary)',
              opacity: undoStack.length === 0 ? 0.5 : 1,
            }}
          >
            <Undo2 size={16} />
            <span>Undo</span>
          </button>
        </div>
      </header>

      <main className="container-editorial">
        {/* Match Score - Hero */}
        <section className="section text-center" style={{ paddingTop: 'var(--space-6)', paddingBottom: 'var(--space-6)' }}>
          <div className="flex items-baseline justify-center gap-8">
            {/* Team A */}
            <div className="text-center">
              <p className="type-overline" style={{ color: 'var(--team-usa)', marginBottom: 'var(--space-2)' }}>
                {teamAName}
              </p>
              <div className="type-meta">
                {teamAPlayers.map(p => (
                  <p key={p!.id}>{formatPlayerName(p!.firstName, p!.lastName, 'short')}</p>
                ))}
              </div>
            </div>

            {/* Score */}
            <div className="text-center">
              <p
                className="score-hero"
                style={{
                  color: matchState.currentScore > 0 ? 'var(--team-usa)' :
                    matchState.currentScore < 0 ? 'var(--team-europe)' : 'var(--ink-tertiary)'
                }}
              >
                {matchState.displayScore}
              </p>
              <p className="type-meta" style={{ marginTop: 'var(--space-1)' }}>
                thru {matchState.holesPlayed}
              </p>
              {matchState.isDormie && (
                <p className="type-meta" style={{ color: 'var(--warning)', marginTop: 'var(--space-2)' }}>
                  <AlertCircle size={12} style={{ display: 'inline', marginRight: '4px' }} />
                  Dormie
                </p>
              )}
            </div>

            {/* Team B */}
            <div className="text-center">
              <p className="type-overline" style={{ color: 'var(--team-europe)', marginBottom: 'var(--space-2)' }}>
                {teamBName}
              </p>
              <div className="type-meta">
                {teamBPlayers.map(p => (
                  <p key={p!.id}>{formatPlayerName(p!.firstName, p!.lastName, 'short')}</p>
                ))}
              </div>
            </div>
          </div>
        </section>

        <hr className="divider" />

        {/* Hole Progress */}
        <section className="section" style={{ paddingTop: 'var(--space-4)', paddingBottom: 'var(--space-4)' }}>
          <div className="flex gap-1 overflow-x-auto pb-2 -mx-4 px-4">
            {Array.from({ length: 18 }, (_, i) => i + 1).map(hole => {
              const result = matchState.holeResults.find(r => r.holeNumber === hole);
              const isCurrent = hole === currentHole;

              let bg = 'var(--canvas-sunken)';
              let color = 'var(--ink-tertiary)';
              let border = '1px solid var(--rule)';

              if (result?.winner === 'teamA') {
                bg = 'var(--team-usa)';
                color = 'white';
                border = 'none';
              } else if (result?.winner === 'teamB') {
                bg = 'var(--team-europe)';
                color = 'white';
                border = 'none';
              } else if (result?.winner === 'halved') {
                bg = 'var(--canvas-raised)';
                color = 'var(--ink-secondary)';
                border = '1px solid var(--rule-strong)';
              } else if (isCurrent) {
                bg = 'var(--masters)';
                color = 'white';
                border = 'none';
              }

              return (
                <button
                  key={hole}
                  onClick={() => goToHole(hole)}
                  className="shrink-0"
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    fontWeight: 500,
                    background: bg,
                    color: color,
                    border: border,
                  }}
                >
                  {hole}
                </button>
              );
            })}
          </div>
        </section>

        <hr className="divider" />

        {/* Scoring Controls */}
        {!isMatchComplete ? (
          <section className="section" style={{ paddingTop: 'var(--space-6)' }}>
            {/* Hole Navigation */}
            <div className="flex items-center justify-between" style={{ marginBottom: 'var(--space-4)' }}>
              <button
                onClick={prevHole}
                disabled={currentHole <= 1}
                className="p-3"
                style={{
                  opacity: currentHole <= 1 ? 0.3 : 1,
                  color: currentHole > 1 ? 'var(--ink)' : 'var(--ink-tertiary)',
                }}
              >
                <ChevronLeft size={24} />
              </button>

              <div className="text-center">
                <p className="type-headline">Hole {currentHole}</p>
                {currentHoleResult && currentHoleResult.winner !== 'none' && (
                  <p className="type-meta" style={{ marginTop: 'var(--space-1)' }}>
                    {currentHoleResult.winner === 'halved' ? 'Halved' :
                      currentHoleResult.winner === 'teamA' ? `${teamAName} won` : `${teamBName} won`}
                  </p>
                )}
              </div>

              <button
                onClick={nextHole}
                disabled={currentHole >= 18}
                className="p-3"
                style={{
                  opacity: currentHole >= 18 ? 0.3 : 1,
                  color: currentHole < 18 ? 'var(--ink)' : 'var(--ink-tertiary)',
                }}
              >
                <ChevronRight size={24} />
              </button>
            </div>

            {/* Handicap Stroke Indicator */}
            {(activeMatch.teamAHandicapAllowance > 0 || activeMatch.teamBHandicapAllowance > 0) && (
              <div style={{ marginBottom: 'var(--space-4)' }}>
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
              </div>
            )}

            {/* Score Buttons */}
            <div className="grid grid-cols-3 gap-3" style={{ marginBottom: 'var(--space-4)' }}>
              <button
                onClick={() => handleScore('teamA')}
                disabled={isSaving}
                className="score-btn"
                style={{
                  background: 'var(--team-usa)',
                  color: 'white',
                  opacity: isSaving ? 0.5 : 1,
                  boxShadow: currentHoleResult?.winner === 'teamA'
                    ? '0 0 0 3px var(--canvas), 0 0 0 5px var(--team-usa)'
                    : undefined,
                }}
              >
                <span className="score-btn-label">{teamAName}</span>
                <span className="score-btn-hint">wins hole</span>
              </button>

              <button
                onClick={() => handleScore('halved')}
                disabled={isSaving}
                className="score-btn"
                style={{
                  background: 'var(--canvas-raised)',
                  color: 'var(--ink)',
                  border: '1px solid var(--rule-strong)',
                  opacity: isSaving ? 0.5 : 1,
                  boxShadow: currentHoleResult?.winner === 'halved'
                    ? '0 0 0 3px var(--canvas), 0 0 0 5px var(--ink-tertiary)'
                    : undefined,
                }}
              >
                <span className="score-btn-label">Halve</span>
                <span className="score-btn-hint">tie hole</span>
              </button>

              <button
                onClick={() => handleScore('teamB')}
                disabled={isSaving}
                className="score-btn"
                style={{
                  background: 'var(--team-europe)',
                  color: 'white',
                  opacity: isSaving ? 0.5 : 1,
                  boxShadow: currentHoleResult?.winner === 'teamB'
                    ? '0 0 0 3px var(--canvas), 0 0 0 5px var(--team-europe)'
                    : undefined,
                }}
              >
                <span className="score-btn-label">{teamBName}</span>
                <span className="score-btn-hint">wins hole</span>
              </button>
            </div>

            {/* Press Tracker */}
            <PressTracker
              currentHole={currentHole}
              mainMatchScore={matchState.currentScore}
              holesRemaining={matchState.holesRemaining}
              presses={presses}
              onPress={handlePress}
              teamAName={teamAName}
              teamBName={teamBName}
              betAmount={10} // Would come from bet configuration
              autoPress={false}
            />
          </section>
        ) : (
          /* Match Complete */
          <section className="section text-center" style={{ paddingTop: 'var(--space-10)', paddingBottom: 'var(--space-10)' }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                margin: '0 auto var(--space-4)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(0, 103, 71, 0.1)',
              }}
            >
              <Check size={24} style={{ color: 'var(--masters)' }} />
            </div>

            <p className="type-headline" style={{ marginBottom: 'var(--space-2)' }}>
              {matchState.currentScore > 0 ? teamAName :
                matchState.currentScore < 0 ? teamBName : 'Match Halved'}
            </p>

            <p className="score-large" style={{ color: 'var(--masters)', marginBottom: 'var(--space-1)' }}>
              {matchState.displayScore}
            </p>

            {matchState.currentScore !== 0 && (
              <p className="type-meta">wins</p>
            )}

            <button
              onClick={() => router.push('/score')}
              className="btn btn-secondary"
              style={{ marginTop: 'var(--space-8)' }}
            >
              Back to Matches
            </button>
          </section>
        )}

        {/* Side Bet Reminders */}
        {!isMatchComplete && (
          <section className="section" style={{ paddingTop: 'var(--space-4)', paddingBottom: 'var(--space-4)' }}>
            <SideBetReminder
              currentHole={currentHole}
              bets={DEMO_SIDE_BETS}
              currentPlayerId={teamAPlayers[0]?.id}
            />
          </section>
        )}

        {/* Weather Alerts */}
        <section className="section" style={{ paddingBottom: 'var(--space-4)' }}>
          <WeatherAlerts showWeatherBar={true} />
        </section>
      </main>

      {/* Quick Photo Capture - Fixed position */}
      {
        !isMatchComplete && (
          <div className="fixed bottom-24 left-4 z-40">
            <QuickPhotoCapture
              matchId={matchId}
              holeNumber={currentHole}
              teamAName={teamAName}
              teamBName={teamBName}
              onCapture={handlePhotoCapture}
            />
          </div>
        )
      }

      {/* Voice Scoring - Fixed position */}
      {
        !isMatchComplete && (
          <VoiceScoring
            teamAName={teamAName}
            teamBName={teamBName}
            currentHole={currentHole}
            onScoreConfirmed={handleVoiceScore}
            floating={true}
            position={{ bottom: 160, right: 16 }}
          />
        )
      }

      {/* Sticky Undo Banner */}
      <StickyUndoBanner
        action={undoAction}
        duration={5000}
        bottomOffset={80}
        onDismiss={() => setUndoAction(null)}
      />

      {/* Stroke Alert Banner */}
      {!isMatchComplete && (activeMatch.teamAHandicapAllowance > 0 || activeMatch.teamBHandicapAllowance > 0) && (
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
    </div >
  );
}
