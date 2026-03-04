/**
 * Match Scoring Page — Fried Egg Golf Editorial Design
 *
 * Immersive scoring experience:
 * - Minimal chrome, maximum focus on the current hole
 * - var(--font-serif) for monumental score numbers
 * - Tactile micro-interactions for score entry
 * - Real-time sync with visual feedback
 * - Keyboard shortcuts for power users
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { useScoringStore } from '@/lib/stores/scoringStore';
import { formatMatchResult, getMatchStatusText } from '@/lib/utils/matchUtils';
import analytics, { AnalyticsEvents } from '@/lib/services/analyticsService';

// ============================================
// TYPES
// ============================================

type ScoreValue = number | null;

interface PlayerScore {
  playerId: string;
  playerName: string;
  teamId: string;
  scores: ScoreValue[];
  total: number;
  toPar: number;
}

interface HoleInfo {
  number: number;
  par: number;
  handicapIndex: number;
  yardage?: number;
}

// ============================================
// SUB-COMPONENTS
// ============================================

function ScoreInput({
  value,
  par,
  onChange,
  onFocus,
  isFocused,
  playerName,
}: {
  value: ScoreValue;
  par: number;
  onChange: (score: ScoreValue) => void;
  onFocus: () => void;
  isFocused: boolean;
  playerName: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isFocused && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isFocused]);

  const getScoreClass = (score: ScoreValue, par: number) => {
    if (score === null) return '';
    const diff = score - par;
    if (diff <= -2) return 'eagle';
    if (diff === -1) return 'birdie';
    if (diff === 0) return 'par';
    if (diff === 1) return 'bogey';
    return 'double-bogey';
  };

  return (
    <div
      className={`score-input-wrapper ${isFocused ? 'focused' : ''} ${getScoreClass(value, par)}`}
      onClick={onFocus}
    >
      <span className="player-label">{playerName}</span>
      <input
        ref={inputRef}
        type="number"
        min="1"
        max="15"
        value={value ?? ''}
        onChange={(e) => {
          const val = e.target.value === '' ? null : parseInt(e.target.value, 10);
          if (val === null || (val >= 1 && val <= 15)) {
            onChange(val);
          }
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.currentTarget.blur();
          }
        }}
        className="score-number-input"
        aria-label={`Score for ${playerName}`}
      />
      {value !== null && (
        <span className={`score-badge ${getScoreClass(value, par)}`}>
          {value - par === 0 ? 'E' : value - par > 0 ? `+${value - par}` : value - par}
        </span>
      )}
    </div>
  );
}

function HoleNavigator({
  currentHole,
  totalHoles,
  completedHoles,
  onNavigate,
}: {
  currentHole: number;
  totalHoles: number;
  completedHoles: Set<number>;
  onNavigate: (hole: number) => void;
}) {
  return (
    <div className="hole-navigator">
      <button
        onClick={() => onNavigate(currentHole - 1)}
        disabled={currentHole <= 1}
        className="nav-btn prev"
        aria-label="Previous hole"
      >
        ←
      </button>
      <div className="hole-dots">
        {Array.from({ length: totalHoles }, (_, i) => i + 1).map((hole) => (
          <button
            key={hole}
            onClick={() => onNavigate(hole)}
            className={`hole-dot ${
              hole === currentHole ? 'current' : ''
            } ${completedHoles.has(hole) ? 'completed' : ''}`}
            aria-label={`Go to hole ${hole}`}
          />
        ))}
      </div>
      <button
        onClick={() => onNavigate(currentHole + 1)}
        disabled={currentHole >= totalHoles}
        className="nav-btn next"
        aria-label="Next hole"
      >
        →
      </button>
    </div>
  );
}

function MatchStatus({
  homeScore,
  awayScore,
  holesPlayed,
  totalHoles,
  format,
}: {
  homeScore: number;
  awayScore: number;
  holesPlayed: number;
  totalHoles: number;
  format: string;
}) {
  const result = formatMatchResult(homeScore, awayScore, holesPlayed, totalHoles, format);

  return (
    <div className="match-status">
      <div className="status-text">{result.display}</div>
      {result.isComplete && (
        <div className="status-badge complete">{result.winner ? `${result.winner} wins` : 'All Square'}</div>
      )}
    </div>
  );
}

function SyncIndicator({ isSyncing, lastSync, error }: { isSyncing: boolean; lastSync: Date | null; error: string | null }) {
  if (error) {
    return <div className="sync-indicator error">⚠ Sync error</div>;
  }
  if (isSyncing) {
    return <div className="sync-indicator syncing">↻ Syncing...</div>;
  }
  if (lastSync) {
    const secondsAgo = Math.floor((Date.now() - lastSync.getTime()) / 1000);
    return (
      <div className="sync-indicator synced">
        ✓ {secondsAgo < 60 ? `${secondsAgo}s ago` : `${Math.floor(secondsAgo / 60)}m ago`}
      </div>
    );
  }
  return null;
}

// ============================================
// SCORECARD TABLE
// ============================================

function ScorecardTable({
  players,
  holes,
  currentHole,
  onHoleClick,
}: {
  players: PlayerScore[];
  holes: HoleInfo[];
  currentHole: number;
  onHoleClick: (hole: number) => void;
}) {
  return (
    <div className="scorecard-wrapper">
      <table className="scorecard-table">
        <thead>
          <tr>
            <th className="player-col">Player</th>
            {holes.map((h) => (
              <th
                key={h.number}
                className={`hole-col ${h.number === currentHole ? 'current-hole' : ''}`}
                onClick={() => onHoleClick(h.number)}
              >
                {h.number}
              </th>
            ))}
            <th className="total-col">Total</th>
            <th className="par-col">+/-</th>
          </tr>
          <tr className="par-row">
            <td>Par</td>
            {holes.map((h) => (
              <td key={h.number} className="par-cell">
                {h.par}
              </td>
            ))}
            <td>{holes.reduce((sum, h) => sum + h.par, 0)}</td>
            <td>—</td>
          </tr>
        </thead>
        <tbody>
          {players.map((player) => (
            <tr key={player.playerId} className={`player-row team-${player.teamId}`}>
              <td className="player-name-cell">{player.playerName}</td>
              {holes.map((h, idx) => {
                const score = player.scores[idx];
                const diff = score !== null && score !== undefined ? score - h.par : null;
                let cellClass = 'score-cell';
                if (diff !== null) {
                  if (diff <= -2) cellClass += ' eagle';
                  else if (diff === -1) cellClass += ' birdie';
                  else if (diff === 0) cellClass += ' par';
                  else if (diff === 1) cellClass += ' bogey';
                  else cellClass += ' double-bogey';
                }
                return (
                  <td
                    key={h.number}
                    className={`${cellClass} ${h.number === currentHole ? 'current-hole' : ''}`}
                    onClick={() => onHoleClick(h.number)}
                  >
                    {score ?? '—'}
                  </td>
                );
              })}
              <td className="total-cell">{player.total > 0 ? player.total : '—'}</td>
              <td className="to-par-cell">
                {player.toPar === 0 ? 'E' : player.toPar > 0 ? `+${player.toPar}` : player.toPar}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ============================================
// QUICK SCORE BUTTONS
// ============================================

function QuickScoreButtons({
  par,
  currentScore,
  onSelect,
}: {
  par: number;
  currentScore: ScoreValue;
  onSelect: (score: number) => void;
}) {
  const options = [
    { score: par - 2, label: 'Eagle', class: 'eagle' },
    { score: par - 1, label: 'Birdie', class: 'birdie' },
    { score: par, label: 'Par', class: 'par' },
    { score: par + 1, label: 'Bogey', class: 'bogey' },
    { score: par + 2, label: 'Double', class: 'double-bogey' },
  ].filter((o) => o.score >= 1);

  return (
    <div className="quick-score-buttons">
      {options.map((opt) => (
        <button
          key={opt.score}
          onClick={() => onSelect(opt.score)}
          className={`quick-score-btn ${opt.class} ${currentScore === opt.score ? 'selected' : ''}`}
        >
          <span className="score-val">{opt.score}</span>
          <span className="score-label">{opt.label}</span>
        </button>
      ))}
    </div>
  );
}

// ============================================
// MAIN PAGE COMPONENT
// ============================================

export default function ScorePage() {
  const params = useParams();
  const router = useRouter();
  const matchId = params.matchId as string;

  // Store
  const {
    activeMatchId,
    scores,
    isSyncing,
    lastSyncTime,
    syncError,
    initMatch,
    updateScore,
    undoLastScore,
    submitScores,
    resetMatch,
  } = useScoringStore();

  // Local state
  const [currentHole, setCurrentHole] = useState(1);
  const [focusedPlayer, setFocusedPlayer] = useState<string | null>(null);
  const [showScorecard, setShowScorecard] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // DB queries
  const match = useLiveQuery(() => db.matches.get(matchId), [matchId]);
  const trip = useLiveQuery(
    () => (match?.tripId ? db.trips.get(match.tripId) : undefined),
    [match?.tripId]
  );
  const players = useLiveQuery(
    () =>
      match?.playerIds
        ? db.players.where('id').anyOf(match.playerIds).toArray()
        : [],
    [match?.playerIds]
  );
  const course = useLiveQuery(
    () => (match?.courseId ? db.courses.get(match.courseId) : undefined),
    [match?.courseId]
  );

  // Initialize scoring session
  useEffect(() => {
    if (match && activeMatchId !== matchId) {
      initMatch(matchId);
      analytics.track(AnalyticsEvents.SCORING_STARTED, 'scoring', {
        matchId,
        format: match.format,
      });
    }
  }, [match, matchId, activeMatchId, initMatch]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;

      switch (e.key) {
        case 'ArrowLeft':
          setCurrentHole((h) => Math.max(1, h - 1));
          break;
        case 'ArrowRight':
          setCurrentHole((h) => Math.min(totalHoles, h + 1));
          break;
        case 'z':
          if (e.metaKey || e.ctrlKey) undoLastScore();
          break;
        case 's':
          if (e.metaKey || e.ctrlKey) {
            e.preventDefault();
            setShowScorecard((v) => !v);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undoLastScore]);

  // ----------------------------------------
  // DERIVED DATA
  // ----------------------------------------

  const totalHoles = course?.holes?.length || 18;
  const currentHoleInfo = course?.holes?.[currentHole - 1] || {
    number: currentHole,
    par: 4,
    handicapIndex: currentHole,
  };

  const playerScores: PlayerScore[] = (players || []).map((player) => {
    const playerScoreData = scores[player.id] || {};
    const holeScores = Array.from({ length: totalHoles }, (_, i) => playerScoreData[i + 1] ?? null);
    const completedScores = holeScores.filter((s) => s !== null) as number[];
    const totalStrokes = completedScores.reduce((sum, s) => sum + s, 0);
    const holesPlayed = completedScores.length;
    const parPlayed = (course?.holes || [])
      .slice(0, holesPlayed)
      .reduce((sum, h) => sum + h.par, 0);

    return {
      playerId: player.id,
      playerName: player.name,
      teamId: player.teamId,
      scores: holeScores,
      total: totalStrokes,
      toPar: totalStrokes - parPlayed,
    };
  });

  // Team score calculation for match play
  const teamScores = playerScores.reduce(
    (acc, ps) => {
      if (!acc[ps.teamId]) acc[ps.teamId] = 0;
      acc[ps.teamId] += ps.toPar;
      return acc;
    },
    {} as Record<string, number>
  );

  const teamIds = Object.keys(teamScores);
  const homeScore = teamIds[0] ? teamScores[teamIds[0]] : 0;
  const awayScore = teamIds[1] ? teamScores[teamIds[1]] : 0;

  const completedHoles = new Set(
    (players || []).length > 0
      ? Array.from({ length: totalHoles }, (_, i) => i + 1).filter((hole) =>
          (players || []).every((p) => scores[p.id]?.[hole] != null)
        )
      : []
  );

  // ----------------------------------------
  // HANDLERS
  // ----------------------------------------

  const handleScoreChange = useCallback(
    (playerId: string, hole: number, score: ScoreValue) => {
      updateScore(playerId, hole, score);
      if (score !== null) {
        analytics.track(AnalyticsEvents.SCORE_ENTERED, 'scoring', {
          matchId,
          playerId,
          hole,
          score,
        });
        // Auto-advance to next player or hole
        const playerList = players || [];
        const currentPlayerIndex = playerList.findIndex((p) => p.id === playerId);
        if (currentPlayerIndex < playerList.length - 1) {
          setFocusedPlayer(playerList[currentPlayerIndex + 1].id);
        } else if (hole < totalHoles) {
          setCurrentHole(hole + 1);
          setFocusedPlayer(playerList[0]?.id || null);
        }
      }
    },
    [updateScore, matchId, players, totalHoles]
  );

  const handleSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      await submitScores(matchId);
      setSubmitSuccess(true);
      analytics.track(AnalyticsEvents.MATCH_COMPLETED, 'match', { matchId });
      setTimeout(() => router.push(`/matches/${matchId}`), 1500);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to submit scores');
      analytics.track(AnalyticsEvents.SYNC_ERROR, 'error', {
        matchId,
        error: err instanceof Error ? err.message : 'unknown',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    if (window.confirm('Reset all scores for this match? This cannot be undone.')) {
      resetMatch(matchId);
    }
  };

  // ----------------------------------------
  // LOADING STATE
  // ----------------------------------------

  if (!match || !players) {
    return (
      <div className="score-page loading">
        <div className="loading-spinner" aria-label="Loading match data" />
      </div>
    );
  }

  // ----------------------------------------
  // RENDER
  // ----------------------------------------

  return (
    <div className="score-page" data-format={match.format}>
      {/* Header */}
      <header className="score-header">
        <Link href={`/matches/${matchId}`} className="back-link">
          ← Back
        </Link>
        <div className="header-center">
          <h1 className="match-title">{match.name || 'Match Scoring'}</h1>
          {trip && <span className="trip-badge">{trip.name}</span>}
        </div>
        <SyncIndicator isSyncing={isSyncing} lastSync={lastSyncTime} error={syncError} />
      </header>

      {/* Match Status */}
      <MatchStatus
        homeScore={homeScore}
        awayScore={awayScore}
        holesPlayed={completedHoles.size}
        totalHoles={totalHoles}
        format={match.format}
      />

      {/* Current Hole Info */}
      <section className="hole-section">
        <div className="hole-header">
          <span className="hole-number">Hole {currentHole}</span>
          <span className="hole-par">Par {currentHoleInfo.par}</span>
          {currentHoleInfo.yardage && (
            <span className="hole-yardage">{currentHoleInfo.yardage} yds</span>
          )}
          <span className="hole-hcp">HCP {currentHoleInfo.handicapIndex}</span>
        </div>

        {/* Score Entry */}
        <div className="score-entry-grid">
          {playerScores.map((ps) => (
            <div key={ps.playerId} className={`player-score-entry team-${ps.teamId}`}>
              <QuickScoreButtons
                par={currentHoleInfo.par}
                currentScore={ps.scores[currentHole - 1]}
                onSelect={(score) => handleScoreChange(ps.playerId, currentHole, score)}
              />
              <ScoreInput
                value={ps.scores[currentHole - 1]}
                par={currentHoleInfo.par}
                onChange={(score) => handleScoreChange(ps.playerId, currentHole, score)}
                onFocus={() => setFocusedPlayer(ps.playerId)}
                isFocused={focusedPlayer === ps.playerId}
                playerName={ps.playerName}
              />
            </div>
          ))}
        </div>
      </section>

      {/* Hole Navigation */}
      <HoleNavigator
        currentHole={currentHole}
        totalHoles={totalHoles}
        completedHoles={completedHoles}
        onNavigate={setCurrentHole}
      />

      {/* Actions */}
      <div className="score-actions">
        <button
          onClick={() => undoLastScore()}
          className="action-btn undo"
          aria-label="Undo last score"
        >
          ↩ Undo
        </button>
        <button
          onClick={() => setShowScorecard((v) => !v)}
          className="action-btn scorecard"
          aria-label="Toggle scorecard"
        >
          📋 Scorecard
        </button>
        <button onClick={handleReset} className="action-btn reset" aria-label="Reset scores">
          ✕ Reset
        </button>
      </div>

      {/* Scorecard Overlay */}
      {showScorecard && (
        <div className="scorecard-overlay" onClick={() => setShowScorecard(false)}>
          <div className="scorecard-modal" onClick={(e) => e.stopPropagation()}>
            <div className="scorecard-modal-header">
              <h2>Scorecard</h2>
              <button onClick={() => setShowScorecard(false)} className="close-btn">
                ✕
              </button>
            </div>
            <ScorecardTable
              players={playerScores}
              holes={course?.holes || Array.from({ length: 18 }, (_, i) => ({ number: i + 1, par: 4, handicapIndex: i + 1 }))}
              currentHole={currentHole}
              onHoleClick={(hole) => {
                setCurrentHole(hole);
                setShowScorecard(false);
              }}
            />
          </div>
        </div>
      )}

      {/* Submit */}
      <div className="submit-section">
        {submitError && <div className="submit-error">{submitError}</div>}
        {submitSuccess && <div className="submit-success">Scores submitted!</div>}
        <button
          onClick={handleSubmit}
          disabled={isSubmitting || completedHoles.size < totalHoles}
          className="submit-btn"
        >
          {isSubmitting ? 'Submitting...' : `Submit Scores (${completedHoles.size}/${totalHoles} holes)`}
        </button>
      </div>
    </div>
  );
}
