'use client';

import { useEffect, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useScoringStore, useTripStore, useUIStore } from '@/lib/stores';
import { useMatchState, useHaptic } from '@/lib/hooks';
import { AppShell } from '@/components/layout';
import { ScoreButton, HoleStrip } from '@/components/ui';
import { cn, formatPlayerName } from '@/lib/utils';
import { Undo2, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import type { HoleWinner } from '@/lib/types/models';

export default function MatchScoringPage() {
  const router = useRouter();
  const params = useParams();
  const matchId = params.matchId as string;

  const { players } = useTripStore();
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

  // Live match state
  const liveMatchState = useMatchState(matchId);
  const matchState = liveMatchState || activeMatchState;

  // Load match if not already loaded
  useEffect(() => {
    if (matchId && (!activeMatch || activeMatch.id !== matchId)) {
      selectMatch(matchId);
    }
  }, [matchId, activeMatch, selectMatch]);

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

  const handleScore = async (winner: HoleWinner) => {
    if (isSaving) return;

    // Check if this would close out the match
    if (scoringPreferences.confirmCloseout && matchState) {
      const wouldCloseOut =
        Math.abs(matchState.currentScore + (winner === 'teamA' ? 1 : winner === 'teamB' ? -1 : 0))
        > (matchState.holesRemaining - 1);

      if (wouldCloseOut && winner !== 'halved') {
        const winningTeam = winner === 'teamA' ? 'USA' : 'Europe';
        if (!confirm(`This will end the match with ${winningTeam} winning. Continue?`)) {
          return;
        }
      }
    }

    haptic(winner === 'halved' ? 'light' : 'medium');
    await scoreHole(winner);
    showToast('success', `Hole ${currentHole} recorded`);
  };

  const handleUndo = async () => {
    if (undoStack.length === 0) return;

    haptic('warning');
    await undoLastHole();
    showToast('info', 'Last score undone');
  };

  if (!activeMatch || !matchState) {
    return (
      <AppShell showBack headerTitle="Score Match">
        <div className="p-4 flex items-center justify-center h-64">
          <div className="animate-pulse text-surface-400">Loading match...</div>
        </div>
      </AppShell>
    );
  }

  const isMatchComplete = matchState.isClosedOut || matchState.holesRemaining === 0;

  return (
    <AppShell
      showBack
      headerTitle={`Match ${activeMatch.matchNumber}`}
      headerRight={
        undoStack.length > 0 && (
          <button
            onClick={handleUndo}
            className="p-2 rounded-full hover:bg-surface-200 dark:hover:bg-surface-800 transition-colors"
            aria-label="Undo last score"
          >
            <Undo2 className="w-5 h-5" />
          </button>
        )
      }
    >
      <div className="p-4 space-y-6">
        {/* Match Score Display */}
        <div className="card p-4">
          <div className="flex items-center justify-between">
            {/* Team A */}
            <div className="text-center flex-1">
              <div className="w-3 h-3 rounded-full bg-team-usa mx-auto mb-2" />
              <p className="text-xs text-surface-500 uppercase">USA</p>
              <div className="mt-1 space-y-0.5">
                {teamAPlayers.map(player => (
                  <p key={player!.id} className="text-sm font-medium truncate">
                    {formatPlayerName(player!.firstName, player!.lastName, 'short')}
                  </p>
                ))}
              </div>
            </div>

            {/* Score */}
            <div className="px-6 text-center">
              <p className={cn(
                'text-4xl font-bold',
                matchState.currentScore > 0 && 'text-team-usa',
                matchState.currentScore < 0 && 'text-team-europe',
                matchState.currentScore === 0 && 'text-surface-500'
              )}>
                {matchState.displayScore}
              </p>
              <p className="text-xs text-surface-400 mt-1">
                thru {matchState.holesPlayed}
              </p>
              {matchState.isDormie && (
                <span className="badge badge-warning mt-2">Dormie</span>
              )}
              {isMatchComplete && (
                <span className="badge badge-success mt-2">Complete</span>
              )}
            </div>

            {/* Team B */}
            <div className="text-center flex-1">
              <div className="w-3 h-3 rounded-full bg-team-europe mx-auto mb-2" />
              <p className="text-xs text-surface-500 uppercase">EUR</p>
              <div className="mt-1 space-y-0.5">
                {teamBPlayers.map(player => (
                  <p key={player!.id} className="text-sm font-medium truncate">
                    {formatPlayerName(player!.firstName, player!.lastName, 'short')}
                  </p>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Hole Strip */}
        <div className="card p-4">
          <p className="text-xs text-surface-500 uppercase mb-2">Match Progress</p>
          <HoleStrip
            results={matchState.holeResults.map(r => ({
              holeNumber: r.holeNumber,
              winner: r.winner,
            }))}
            currentHole={currentHole}
            onHoleClick={goToHole}
            size="md"
          />
        </div>

        {/* Scoring Controls */}
        {!isMatchComplete && (
          <div className="card p-4 space-y-4">
            {/* Hole Navigation */}
            <div className="flex items-center justify-between">
              <button
                onClick={prevHole}
                disabled={currentHole <= 1}
                className="p-2 rounded-full hover:bg-surface-200 dark:hover:bg-surface-800 disabled:opacity-50"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>

              <div className="text-center">
                <p className="text-3xl font-bold">Hole {currentHole}</p>
                {currentHoleResult && currentHoleResult.winner !== 'none' && (
                  <p className="text-sm text-surface-500">
                    Scored: {currentHoleResult.winner === 'halved' ? 'Halved' :
                      currentHoleResult.winner === 'teamA' ? 'USA' : 'EUR'}
                  </p>
                )}
              </div>

              <button
                onClick={nextHole}
                disabled={currentHole >= 18}
                className="p-2 rounded-full hover:bg-surface-200 dark:hover:bg-surface-800 disabled:opacity-50"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </div>

            {/* Score Buttons */}
            <div className="grid grid-cols-3 gap-3">
              <ScoreButton
                winner="teamA"
                label="USA"
                teamColor="usa"
                isSelected={currentHoleResult?.winner === 'teamA'}
                disabled={isSaving}
                onClick={() => handleScore('teamA')}
                size="lg"
              />
              <ScoreButton
                winner="halved"
                label="Halve"
                isSelected={currentHoleResult?.winner === 'halved'}
                disabled={isSaving}
                onClick={() => handleScore('halved')}
                size="lg"
              />
              <ScoreButton
                winner="teamB"
                label="EUR"
                teamColor="europe"
                isSelected={currentHoleResult?.winner === 'teamB'}
                disabled={isSaving}
                onClick={() => handleScore('teamB')}
                size="lg"
              />
            </div>

            {/* Helper text */}
            <p className="text-xs text-center text-surface-400">
              Tap a button to record who won the hole
            </p>
          </div>
        )}

        {/* Match Complete */}
        {isMatchComplete && (
          <div className="card p-6 text-center bg-augusta-green/5">
            <Check className="w-12 h-12 mx-auto mb-3 text-augusta-green" />
            <h3 className="text-xl font-bold mb-2">Match Complete</h3>
            <p className="text-surface-600 dark:text-surface-400">
              {matchState.currentScore > 0 ? 'USA wins' :
                matchState.currentScore < 0 ? 'Europe wins' :
                  'Match halved'} {matchState.displayScore}
            </p>
            <button
              onClick={() => router.push('/score')}
              className="btn-primary mt-4"
            >
              Back to Matches
            </button>
          </div>
        )}
      </div>
    </AppShell>
  );
}
