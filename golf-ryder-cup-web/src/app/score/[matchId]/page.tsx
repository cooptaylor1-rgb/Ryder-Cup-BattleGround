'use client';

import { useEffect, useMemo, useState, TouchEvent } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useScoringStore, useTripStore, useUIStore } from '@/lib/stores';
import { useMatchState, useHaptic } from '@/lib/hooks';
import { formatPlayerName } from '@/lib/utils';
import { Undo2, ChevronLeft, ChevronRight, Check, AlertCircle } from 'lucide-react';
import type { HoleWinner } from '@/lib/types/models';

/**
 * MATCH SCORING PAGE - Sacred Action Surface
 *
 * This is sacred. Design for:
 * - Fast, legible, stress-free
 * - Large tap targets for outdoor use
 * - Clear score deltas
 * - Minimal decoration
 * - Undo is always visible
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

  // Swipe state
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  // Live match state
  const liveMatchState = useMatchState(matchId);
  const matchState = liveMatchState || activeMatchState;

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
      haptic('light');
    } else if (isRightSwipe && currentHole > 1) {
      prevHole();
      haptic('light');
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
            <div className="flex items-center justify-between" style={{ marginBottom: 'var(--space-6)' }}>
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
      </main>
    </div>
  );
}
