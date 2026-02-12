'use client';

/**
 * HammerGameCard - Hammer Game UI Component
 *
 * Full-featured Hammer game interface with:
 * - Hammer/Accept/Decline actions
 * - Value doubling display
 * - Live action history
 * - Team standings
 */

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  createHammerGame,
  processHammerAction,
  completeHammerHole,
  calculateHammerPayouts,
} from '@/lib/services/extendedSideGamesService';
import type { HammerGame } from '@/lib/types/sideGames';
import type { Player, UUID } from '@/lib/types/models';

interface HammerGameCardProps {
  tripId: UUID;
  sessionId?: UUID;
  players: Player[];
  existingGame?: HammerGame;
  onSave?: (game: HammerGame) => void;
  onClose?: () => void;
}

export function HammerGameCard({
  tripId,
  sessionId,
  players,
  existingGame,
  onSave,
  onClose,
}: HammerGameCardProps) {
  const [game, setGame] = useState<HammerGame | null>(existingGame || null);
  const [setupMode, setSetupMode] = useState(!existingGame);
  const [gameName, setGameName] = useState('Hammer');
  const [startingValue, setStartingValue] = useState(1);
  const [maxHammers, setMaxHammers] = useState(4);
  const [team1, setTeam1] = useState<UUID[]>([]);
  const [team2, setTeam2] = useState<UUID[]>([]);
  const [currentHole, setCurrentHole] = useState(1);
  const [pendingScores, setPendingScores] = useState<{ team1: number | ''; team2: number | '' }>({
    team1: '',
    team2: '',
  });
  const [showPayouts, setShowPayouts] = useState(false);

  // Get player name
  const getPlayerName = useCallback(
    (playerId: UUID): string => {
      const player = players.find((p) => p.id === playerId);
      return player ? `${player.firstName} ${player.lastName?.[0] || ''}`.trim() : 'Unknown';
    },
    [players]
  );

  // Start game
  const handleStartGame = useCallback(() => {
    if (team1.length !== 2 || team2.length !== 2) {
      alert('Each team must have exactly 2 players');
      return;
    }

    const newGame = createHammerGame(
      tripId,
      gameName,
      startingValue,
      team1,
      team2,
      sessionId,
      maxHammers
    );

    setGame(newGame);
    setSetupMode(false);
    onSave?.(newGame);
  }, [tripId, sessionId, gameName, startingValue, maxHammers, team1, team2, onSave]);

  // Handle hammer action
  const handleAction = useCallback(
    (action: 'hammer' | 'accept' | 'decline') => {
      if (!game) return;

      const actingTeam = game.hammerHolder;
      const result = processHammerAction(game, currentHole, actingTeam, action);

      setGame(result.game);
      onSave?.(result.game);

      // If hole completed via decline, move to next hole
      if (result.holeComplete && result.winner) {
        setCurrentHole((h) => h + 1);
        setPendingScores({ team1: '', team2: '' });
      }
    },
    [game, currentHole, onSave]
  );

  // Complete hole with scores
  const handleCompleteHole = useCallback(() => {
    if (!game || pendingScores.team1 === '' || pendingScores.team2 === '') return;

    const updatedGame = completeHammerHole(
      game,
      currentHole,
      Number(pendingScores.team1),
      Number(pendingScores.team2)
    );

    setGame(updatedGame);
    onSave?.(updatedGame);
    setCurrentHole((h) => h + 1);
    setPendingScores({ team1: '', team2: '' });
  }, [game, currentHole, pendingScores, onSave]);

  // Finalize game
  const handleFinalize = useCallback(() => {
    if (!game) return;

    const finalGame: HammerGame = {
      ...game,
      status: 'completed',
    };

    setGame(finalGame);
    onSave?.(finalGame);
    setShowPayouts(true);
  }, [game, onSave]);

  // Toggle player selection
  const togglePlayer = (playerId: UUID, team: 'team1' | 'team2') => {
    if (team === 'team1') {
      if (team1.includes(playerId)) {
        setTeam1(team1.filter((id) => id !== playerId));
      } else if (team1.length < 2) {
        setTeam1([...team1, playerId]);
        // Remove from other team if selected there
        setTeam2(team2.filter((id) => id !== playerId));
      }
    } else {
      if (team2.includes(playerId)) {
        setTeam2(team2.filter((id) => id !== playerId));
      } else if (team2.length < 2) {
        setTeam2([...team2, playerId]);
        setTeam1(team1.filter((id) => id !== playerId));
      }
    }
  };

  // Setup mode
  if (setupMode) {
    return (
      <div className="card p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🔨</span>
            <h2 className="text-xl font-bold text-[var(--ink-primary)]">Setup Hammer Game</h2>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 text-[var(--ink-tertiary)] hover:text-[var(--ink-secondary)]"
            >
              ✕
            </button>
          )}
        </div>

        <div className="space-y-6">
          {/* Game Name */}
          <div>
            <label className="block text-sm font-medium text-[var(--ink-secondary)] mb-2">
              Game Name
            </label>
            <input
              type="text"
              value={gameName}
              onChange={(e) => setGameName(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-[var(--rule)] bg-[var(--surface-raised)] text-[var(--ink-primary)] placeholder:text-[var(--ink-tertiary)]
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--masters)] focus-visible:ring-offset-2 ring-offset-[color:var(--canvas)]"
              placeholder="Hammer Game"
            />
          </div>

          {/* Starting Value & Max Hammers */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--ink-secondary)] mb-2">
                Starting Value ($)
              </label>
              <input
                type="number"
                value={startingValue}
                onChange={(e) => setStartingValue(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full px-4 py-2 rounded-lg border border-[var(--rule)] bg-[var(--surface-raised)] text-[var(--ink-primary)] placeholder:text-[var(--ink-tertiary)]
                         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--masters)] focus-visible:ring-offset-2 ring-offset-[color:var(--canvas)]"
                min={1}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--ink-secondary)] mb-2">
                Max Hammers/Hole
              </label>
              <input
                type="number"
                value={maxHammers}
                onChange={(e) => setMaxHammers(Math.max(1, parseInt(e.target.value) || 4))}
                className="w-full px-4 py-2 rounded-lg border border-[var(--rule)] bg-[var(--surface-raised)] text-[var(--ink-primary)] placeholder:text-[var(--ink-tertiary)]
                         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--masters)] focus-visible:ring-offset-2 ring-offset-[color:var(--canvas)]"
                min={1}
                max={10}
              />
            </div>
          </div>

          {/* Team Selection */}
          <div>
            <label className="block text-sm font-medium text-[var(--ink-secondary)] mb-2">
              Team 1 (Select 2)
            </label>
            <div className="flex flex-wrap gap-2">
              {players.map((player) => (
                <button
                  key={`t1-${player.id}`}
                  onClick={() => togglePlayer(player.id, 'team1')}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    team1.includes(player.id)
                      ? 'bg-team-usa text-white'
                      : 'bg-[var(--surface-secondary)] text-[var(--ink-secondary)] hover:bg-[var(--surface-tertiary)]'
                  }`}
                >
                  {player.firstName} {player.lastName?.[0] || ''}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--ink-secondary)] mb-2">
              Team 2 (Select 2)
            </label>
            <div className="flex flex-wrap gap-2">
              {players.map((player) => (
                <button
                  key={`t2-${player.id}`}
                  onClick={() => togglePlayer(player.id, 'team2')}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    team2.includes(player.id)
                      ? 'bg-team-europe text-white'
                      : 'bg-[var(--surface-secondary)] text-[var(--ink-secondary)] hover:bg-[var(--surface-tertiary)]'
                  }`}
                >
                  {player.firstName} {player.lastName?.[0] || ''}
                </button>
              ))}
            </div>
          </div>

          {/* Start Button */}
          <button
            onClick={handleStartGame}
            disabled={team1.length !== 2 || team2.length !== 2}
            className="w-full py-3 bg-[var(--masters)] text-[var(--canvas)] font-semibold rounded-lg
                     hover:bg-[color:var(--masters)]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Start Hammer Game 🔨
          </button>
        </div>
      </div>
    );
  }

  // No game
  if (!game) {
    return (
      <div className="card overflow-hidden">
        <div className="bg-[var(--masters)] px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🔨</span>
              <div>
                <h2 className="text-xl font-bold text-white">Hammer Game</h2>
                <p className="text-[color:var(--canvas)]/80 text-sm">Game unavailable</p>
              </div>
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="p-2 text-[color:var(--canvas)]/80 hover:text-[var(--canvas)] rounded-lg hover:bg-[color:var(--canvas)]/10"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        <div className="p-6">
          <div className="rounded-lg border border-[var(--rule)] bg-[var(--surface-secondary)] p-4 text-center">
            <p className="text-sm font-medium text-[var(--ink-primary)]">We couldn’t load this Hammer game.</p>
            <p className="mt-1 text-xs text-[var(--ink-secondary)]">
              Try reopening the game, or start a new one.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Calculate payouts for display
  const payouts = showPayouts ? calculateHammerPayouts(game, players) : null;

  // Get current hole result
  const currentHoleResult = game.holeResults.find((hr) => hr.holeNumber === currentHole);
  const hammerCount = currentHoleResult?.hammerActions.filter((a) => a.action === 'hammer').length || 0;
  const canHammer = hammerCount < game.maxHammers;
  const hasAcceptedOrDeclined = currentHoleResult?.hammerActions.some(
    (a) => a.action === 'accept' || a.action === 'decline'
  );

  return (
    <div className="card overflow-hidden">
      {/* Header */}
      <div className="bg-[var(--masters)] px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🔨</span>
            <div>
              <h2 className="text-xl font-bold text-white">{game.name}</h2>
              <p className="text-[color:var(--canvas)]/80 text-sm">
                Hole {currentHole} • Current Value: ${game.currentValue}
              </p>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 text-[color:var(--canvas)]/80 hover:text-[var(--canvas)] rounded-lg hover:bg-[color:var(--canvas)]/10"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Current Value Display */}
        <motion.div
          key={game.currentValue}
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          className="text-center"
        >
          <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[var(--surface-secondary)] ring-1 ring-[var(--rule)]">
            <span className="text-3xl font-bold text-[var(--masters)]">${game.currentValue}</span>
            <span className="text-[var(--ink-secondary)] text-sm">at stake</span>
          </div>
        </motion.div>

        {/* Team Standings */}
        <div className="grid grid-cols-2 gap-4">
          <div
            className={`p-4 rounded-lg border-2 ${
              game.hammerHolder === 'team1'
                ? 'border-[color:var(--masters)]/60 bg-[color:var(--masters)]/10'
                : 'border-[var(--rule)] bg-[var(--surface-secondary)]'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-team-usa">Team 1</span>
              {game.hammerHolder === 'team1' && <span className="text-xl">🔨</span>}
            </div>
            <div className="text-sm text-[var(--ink-secondary)] mb-2">
              {game.team1PlayerIds.map(getPlayerName).join(' & ')}
            </div>
            <div className="text-2xl font-bold text-[var(--ink-primary)]">
              {game.runningScore > 0 ? '+' : ''}
              {game.runningScore > 0 ? game.runningScore : 0}
            </div>
          </div>

          <div
            className={`p-4 rounded-lg border-2 ${
              game.hammerHolder === 'team2'
                ? 'border-[color:var(--masters)]/60 bg-[color:var(--masters)]/10'
                : 'border-[var(--rule)] bg-[var(--surface-secondary)]'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-team-europe">Team 2</span>
              {game.hammerHolder === 'team2' && <span className="text-xl">🔨</span>}
            </div>
            <div className="text-sm text-[var(--ink-secondary)] mb-2">
              {game.team2PlayerIds.map(getPlayerName).join(' & ')}
            </div>
            <div className="text-2xl font-bold text-[var(--ink-primary)]">
              {game.runningScore < 0 ? '+' : ''}
              {game.runningScore < 0 ? Math.abs(game.runningScore) : 0}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        {game.status === 'active' && !hasAcceptedOrDeclined && (
          <div className="space-y-3">
            <div className="text-center text-sm text-[var(--ink-secondary)] mb-2">
              {game.hammerHolder === 'team1' ? 'Team 1' : 'Team 2'} has the hammer
            </div>
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => handleAction('hammer')}
                disabled={!canHammer}
                className="px-4 py-3 bg-[var(--masters)] text-[var(--canvas)] font-semibold rounded-lg
                         hover:bg-[color:var(--masters)]/90 disabled:opacity-50 disabled:cursor-not-allowed
                         transition-colors flex items-center justify-center gap-2"
              >
                🔨 Hammer
                <span className="text-xs opacity-75">(×2)</span>
              </button>
              <button
                onClick={() => handleAction('accept')}
                className="px-4 py-3 bg-[var(--success)] text-[var(--canvas)] font-semibold rounded-lg
                         hover:bg-[color:var(--success)]/90 transition-colors"
              >
                ✓ Accept
              </button>
              <button
                onClick={() => handleAction('decline')}
                className="px-4 py-3 bg-[var(--error)] text-[var(--canvas)] font-semibold rounded-lg
                         hover:bg-[color:var(--error)]/90 transition-colors"
              >
                ✗ Decline
              </button>
            </div>
            {hammerCount > 0 && (
              <p className="text-center text-xs text-[var(--ink-tertiary)]">
                Hammers this hole: {hammerCount}/{game.maxHammers}
              </p>
            )}
          </div>
        )}

        {/* Score Entry (after accept) */}
        {game.status === 'active' && hasAcceptedOrDeclined && (
          <div className="space-y-4">
            <h4 className="font-medium text-[var(--ink-primary)] text-center">Enter Hole Scores</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-[var(--ink-secondary)] mb-1 text-center">
                  Team 1 Score
                </label>
                <input
                  type="number"
                  value={pendingScores.team1}
                  onChange={(e) =>
                    setPendingScores((s) => ({
                      ...s,
                      team1: e.target.value === '' ? '' : parseInt(e.target.value),
                    }))
                  }
                  className="w-full px-4 py-2 text-center text-lg font-semibold rounded-lg border border-[var(--rule)]
                           bg-[var(--surface-raised)] text-[var(--ink-primary)] focus-visible:outline-none focus-visible:ring-2
                           focus-visible:ring-[var(--masters)] focus-visible:ring-offset-2 ring-offset-[color:var(--canvas)]"
                  min={1}
                  max={15}
                />
              </div>
              <div>
                <label className="block text-sm text-[var(--ink-secondary)] mb-1 text-center">
                  Team 2 Score
                </label>
                <input
                  type="number"
                  value={pendingScores.team2}
                  onChange={(e) =>
                    setPendingScores((s) => ({
                      ...s,
                      team2: e.target.value === '' ? '' : parseInt(e.target.value),
                    }))
                  }
                  className="w-full px-4 py-2 text-center text-lg font-semibold rounded-lg border border-[var(--rule)]
                           bg-[var(--surface-raised)] text-[var(--ink-primary)] focus-visible:outline-none focus-visible:ring-2
                           focus-visible:ring-[var(--masters)] focus-visible:ring-offset-2 ring-offset-[color:var(--canvas)]"
                  min={1}
                  max={15}
                />
              </div>
            </div>
            <button
              onClick={handleCompleteHole}
              disabled={pendingScores.team1 === '' || pendingScores.team2 === ''}
              className="w-full py-3 bg-[var(--success)] text-[var(--canvas)] font-semibold rounded-lg
                       hover:bg-[color:var(--success)]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Complete Hole
            </button>
          </div>
        )}

        {/* Hole History */}
        {game.holeResults.length > 0 && (
          <div className="mt-6">
            <h4 className="font-medium text-[var(--ink-primary)] mb-3">Hole Results</h4>
            <div className="max-h-48 overflow-y-auto space-y-2">
              <AnimatePresence>
                {game.holeResults
                  .filter((hr) => hr.winner !== 'halved' || hr.pointsWon > 0)
                  .map((hr) => (
                    <motion.div
                      key={hr.holeNumber}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-center justify-between p-3 bg-[var(--surface-secondary)] rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 bg-[var(--surface-tertiary)] rounded-full flex items-center justify-center text-sm font-medium text-[var(--ink-secondary)]">
                          {hr.holeNumber}
                        </span>
                        <div>
                          <span className="text-sm font-medium text-[var(--ink-primary)]">
                            {hr.winner === 'team1'
                              ? 'Team 1 wins'
                              : hr.winner === 'team2'
                              ? 'Team 2 wins'
                              : 'Halved'}
                          </span>
                          {hr.hammerActions.length > 0 && (
                            <p className="text-xs text-[var(--ink-tertiary)]">
                              {hr.hammerActions.filter((a) => a.action === 'hammer').length} hammer
                              {hr.hammerActions.filter((a) => a.action === 'hammer').length !== 1
                                ? 's'
                                : ''}
                            </p>
                          )}
                        </div>
                      </div>
                      <span
                        className={`font-semibold ${
                          hr.winner === 'team1'
                            ? 'text-team-usa'
                            : hr.winner === 'team2'
                            ? 'text-team-europe'
                            : 'text-[var(--ink-tertiary)]'
                        }`}
                      >
                        {hr.winner !== 'halved' ? `$${hr.pointsWon}` : '-'}
                      </span>
                    </motion.div>
                  ))}
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* Finalize Button */}
        {game.status === 'active' && game.holeResults.length >= 9 && (
          <button
            onClick={handleFinalize}
            className="w-full py-3 bg-[var(--info)] text-[var(--canvas)] font-semibold rounded-lg
                     hover:bg-[color:var(--info)]/90 transition-colors"
          >
            Finalize Game
          </button>
        )}

        {/* Payouts Display */}
        {showPayouts && payouts && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 p-4 rounded-lg bg-[color:var(--success)]/10 ring-1 ring-[var(--rule)]"
          >
            <h4 className="font-semibold text-[var(--ink-primary)] mb-3 text-center">
              Final Settlement
            </h4>
            <div className="text-center mb-4">
              <span
                className={`text-2xl font-bold ${
                  payouts.winningTeam === 'team1'
                    ? 'text-team-usa'
                    : payouts.winningTeam === 'team2'
                    ? 'text-team-europe'
                    : 'text-[var(--ink-secondary)]'
                }`}
              >
                {payouts.winningTeam === 'push'
                  ? 'Push!'
                  : `${payouts.winningTeam === 'team1' ? 'Team 1' : 'Team 2'} wins $${payouts.netSettlement}`}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <p className="text-sm text-[var(--ink-secondary)]">Team 1 Total</p>
                <p className="text-lg font-semibold text-team-usa">${payouts.team1Total}</p>
              </div>
              <div>
                <p className="text-sm text-[var(--ink-secondary)]">Team 2 Total</p>
                <p className="text-lg font-semibold text-team-europe">${payouts.team2Total}</p>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

export default HammerGameCard;
