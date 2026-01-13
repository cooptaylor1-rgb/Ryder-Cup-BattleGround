'use client';

import { useEffect, useMemo, useState, TouchEvent } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useScoringStore, useTripStore, useUIStore } from '@/lib/stores';
import { useMatchState, useHaptic } from '@/lib/hooks';
import { AppShellNew } from '@/components/layout';
import { cn, formatPlayerName } from '@/lib/utils';
import { Undo2, ChevronLeft, ChevronRight, Check, AlertCircle } from 'lucide-react';
import { BUTTON_SCALE_SIZES } from '@/lib/types/scoringPreferences';
import type { HoleWinner } from '@/lib/types/models';

/**
 * MATCH SCORING PAGE - Masters Tournament Inspired
 *
 * This is sacred. Design for:
 * - Fast, legible, stress-free
 * - Large tap targets for outdoor use
 * - Clear score deltas
 * - No unnecessary animation
 * - Undo is mandatory
 */

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

  // Local state for swipe gesture
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  // Live match state
  const liveMatchState = useMatchState(matchId);
  const matchState = liveMatchState || activeMatchState;

  // Load match if not already loaded
  useEffect(() => {
    if (matchId && (!activeMatch || activeMatch.id !== matchId)) {
      selectMatch(matchId);
    }
  }, [matchId, activeMatch, selectMatch]);

  // Get team names
  const teamA = teams.find(t => t.color === 'usa');
  const teamB = teams.find(t => t.color === 'europe');
  const teamAName = teamA?.name || 'Team A';
  const teamBName = teamB?.name || 'Team B';

  // Get players for this match
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

  // Current hole result
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
      haptic('light');
    } else if (isRightSwipe && currentHole > 1) {
      prevHole();
      haptic('light');
    }
  };

  const handleScore = async (winner: HoleWinner) => {
    if (isSaving) return;

    // Check if this would close out the match
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

    haptic(winner === 'halved' ? 'light' : 'medium');
    await scoreHole(winner);
  };

  const handleUndo = async () => {
    if (undoStack.length === 0) return;
    haptic('warning');
    await undoLastHole();
    showToast('info', 'Score undone');
  };

  if (!activeMatch || !matchState) {
    return (
      <AppShellNew showBack headerTitle="Scoring">
        <div 
          className="flex items-center justify-center h-64"
          style={{ color: 'var(--text-tertiary)' }}
        >
          Loading match...
        </div>
      </AppShellNew>
    );
  }

  const isMatchComplete = matchState.isClosedOut || matchState.holesRemaining === 0;

  return (
    <AppShellNew
      showBack
      headerTitle={`Match ${activeMatch.matchOrder}`}
    >
      <div
        className="px-5 py-6 max-w-lg mx-auto pb-24 lg:pb-8"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Match Score Header */}
        <div 
          className="rounded-lg p-5 mb-6"
          style={{ 
            background: 'var(--surface-card)',
            border: '1px solid var(--border-subtle)'
          }}
        >
          <div className="flex items-center justify-between">
            {/* Team A */}
            <div className="text-center flex-1">
              <div 
                className="w-3 h-3 rounded-full mx-auto mb-2"
                style={{ background: 'var(--team-a-color)' }}
              />
              <p 
                className="text-overline"
                style={{ color: 'var(--team-a-color)' }}
              >
                {teamAName}
              </p>
              <div className="mt-2 space-y-0.5">
                {teamAPlayers.map(player => (
                  <p 
                    key={player!.id} 
                    className="text-sm truncate"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {formatPlayerName(player!.firstName, player!.lastName, 'short')}
                  </p>
                ))}
              </div>
            </div>

            {/* Score */}
            <div className="px-6 text-center">
              <p 
                className="font-score text-5xl"
                style={{ 
                  color: matchState.currentScore > 0 
                    ? 'var(--team-a-color)'
                    : matchState.currentScore < 0 
                      ? 'var(--team-b-color)'
                      : 'var(--text-tertiary)'
                }}
              >
                {matchState.displayScore}
              </p>
              <p 
                className="text-xs mt-1"
                style={{ color: 'var(--text-tertiary)' }}
              >
                thru {matchState.holesPlayed}
              </p>
              {matchState.isDormie && (
                <div 
                  className="inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded text-xs font-medium"
                  style={{ 
                    background: 'rgba(196, 152, 61, 0.1)',
                    color: 'var(--warning)'
                  }}
                >
                  <AlertCircle className="w-3 h-3" />
                  Dormie
                </div>
              )}
            </div>

            {/* Team B */}
            <div className="text-center flex-1">
              <div 
                className="w-3 h-3 rounded-full mx-auto mb-2"
                style={{ background: 'var(--team-b-color)' }}
              />
              <p 
                className="text-overline"
                style={{ color: 'var(--team-b-color)' }}
              >
                {teamBName}
              </p>
              <div className="mt-2 space-y-0.5">
                {teamBPlayers.map(player => (
                  <p 
                    key={player!.id} 
                    className="text-sm truncate"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {formatPlayerName(player!.firstName, player!.lastName, 'short')}
                  </p>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Hole Progress Strip */}
        <div className="mb-6">
          <div className="flex gap-1 overflow-x-auto pb-2 -mx-2 px-2">
            {Array.from({ length: 18 }, (_, i) => i + 1).map(hole => {
              const result = matchState.holeResults.find(r => r.holeNumber === hole);
              const isCurrent = hole === currentHole;
              
              return (
                <button
                  key={hole}
                  onClick={() => goToHole(hole)}
                  className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium shrink-0 transition-all',
                  )}
                  style={{
                    background: result?.winner === 'teamA' 
                      ? 'var(--team-a-color)'
                      : result?.winner === 'teamB'
                        ? 'var(--team-b-color)'
                        : result?.winner === 'halved'
                          ? 'var(--surface-elevated)'
                          : isCurrent
                            ? 'var(--masters-green)'
                            : 'var(--surface-raised)',
                    color: result?.winner && result.winner !== 'halved'
                      ? 'white'
                      : isCurrent
                        ? 'white'
                        : 'var(--text-tertiary)',
                    border: isCurrent ? '2px solid var(--masters-gold)' : '1px solid var(--border-subtle)',
                  }}
                >
                  {hole}
                </button>
              );
            })}
          </div>
        </div>

        {/* Scoring Controls */}
        {!isMatchComplete ? (
          <div 
            className="rounded-lg p-5"
            style={{ 
              background: 'var(--surface-card)',
              border: '1px solid var(--border-subtle)'
            }}
          >
            {/* Hole Navigation */}
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={prevHole}
                disabled={currentHole <= 1}
                className="p-3 rounded-lg touch-target transition-colors"
                style={{ 
                  background: currentHole > 1 ? 'var(--surface-elevated)' : 'transparent',
                  color: currentHole > 1 ? 'var(--text-primary)' : 'var(--text-disabled)',
                  opacity: currentHole <= 1 ? 0.4 : 1
                }}
              >
                <ChevronLeft className="w-6 h-6" />
              </button>

              <div className="text-center">
                <p 
                  className="font-display text-3xl"
                  style={{ color: 'var(--text-primary)' }}
                >
                  Hole {currentHole}
                </p>
                {currentHoleResult && currentHoleResult.winner !== 'none' && (
                  <p 
                    className="text-sm mt-1"
                    style={{ color: 'var(--text-tertiary)' }}
                  >
                    {currentHoleResult.winner === 'halved' ? 'Halved' :
                      currentHoleResult.winner === 'teamA' ? `${teamAName} won` : `${teamBName} won`}
                  </p>
                )}
              </div>

              <button
                onClick={nextHole}
                disabled={currentHole >= 18}
                className="p-3 rounded-lg touch-target transition-colors"
                style={{ 
                  background: currentHole < 18 ? 'var(--surface-elevated)' : 'transparent',
                  color: currentHole < 18 ? 'var(--text-primary)' : 'var(--text-disabled)',
                  opacity: currentHole >= 18 ? 0.4 : 1
                }}
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </div>

            {/* Score Buttons - Large, clear tap targets */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <button
                onClick={() => handleScore('teamA')}
                disabled={isSaving}
                className={cn(
                  'py-5 px-4 rounded-lg font-semibold text-center transition-all touch-target-xl',
                  currentHoleResult?.winner === 'teamA' && 'ring-2 ring-offset-2',
                )}
                style={{
                  background: 'var(--team-a-color)',
                  color: 'white',
                  opacity: isSaving ? 0.5 : 1,
                  ringColor: 'var(--team-a-color)',
                  ringOffsetColor: 'var(--surface-card)',
                }}
              >
                <span className="block text-lg">{teamAName}</span>
                <span className="block text-xs opacity-75 mt-0.5">wins hole</span>
              </button>

              <button
                onClick={() => handleScore('halved')}
                disabled={isSaving}
                className={cn(
                  'py-5 px-4 rounded-lg font-semibold text-center transition-all touch-target-xl',
                  currentHoleResult?.winner === 'halved' && 'ring-2 ring-offset-2',
                )}
                style={{
                  background: 'var(--surface-elevated)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-default)',
                  opacity: isSaving ? 0.5 : 1,
                  ringColor: 'var(--text-tertiary)',
                  ringOffsetColor: 'var(--surface-card)',
                }}
              >
                <span className="block text-lg">Halve</span>
                <span className="block text-xs opacity-75 mt-0.5">tie hole</span>
              </button>

              <button
                onClick={() => handleScore('teamB')}
                disabled={isSaving}
                className={cn(
                  'py-5 px-4 rounded-lg font-semibold text-center transition-all touch-target-xl',
                  currentHoleResult?.winner === 'teamB' && 'ring-2 ring-offset-2',
                )}
                style={{
                  background: 'var(--team-b-color)',
                  color: 'white',
                  opacity: isSaving ? 0.5 : 1,
                  ringColor: 'var(--team-b-color)',
                  ringOffsetColor: 'var(--surface-card)',
                }}
              >
                <span className="block text-lg">{teamBName}</span>
                <span className="block text-xs opacity-75 mt-0.5">wins hole</span>
              </button>
            </div>

            {/* Undo - Always accessible, mandatory */}
            <button
              onClick={handleUndo}
              disabled={undoStack.length === 0}
              className="w-full py-3 rounded-lg flex items-center justify-center gap-2 transition-colors"
              style={{
                background: undoStack.length > 0 ? 'var(--surface-raised)' : 'transparent',
                color: undoStack.length > 0 ? 'var(--text-secondary)' : 'var(--text-disabled)',
                border: '1px solid var(--border-subtle)',
                opacity: undoStack.length === 0 ? 0.5 : 1,
              }}
            >
              <Undo2 className="w-4 h-4" />
              <span className="text-sm font-medium">Undo Last Score</span>
            </button>
          </div>
        ) : (
          /* Match Complete State */
          <div 
            className="rounded-lg p-8 text-center"
            style={{ 
              background: 'var(--masters-gold-muted)',
              border: '1px solid rgba(201, 162, 39, 0.2)'
            }}
          >
            <Check 
              className="w-12 h-12 mx-auto mb-4" 
              style={{ color: 'var(--masters-gold)' }}
            />
            <h3 
              className="font-display text-xl mb-2"
              style={{ color: 'var(--text-primary)' }}
            >
              Match Complete
            </h3>
            <p style={{ color: 'var(--text-secondary)' }}>
              {matchState.currentScore > 0 
                ? `${teamAName} wins` 
                : matchState.currentScore < 0 
                  ? `${teamBName} wins` 
                  : 'Match halved'
              } {matchState.displayScore}
            </p>
            <button
              onClick={() => router.push('/score')}
              className="btn btn-primary mt-6"
            >
              Back to Matches
            </button>
          </div>
        )}
      </div>
    </AppShellNew>
  );
}
