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
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🔨</span>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Setup Hammer Game</h2>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            >
              ✕
            </button>
          )}
        </div>

        <div className="space-y-6">
          {/* Game Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Game Name
            </label>
            <input
              type="text"
              value={gameName}
              onChange={(e) => setGameName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Hammer Game"
            />
          </div>

          {/* Starting Value & Max Hammers */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Starting Value ($)
              </label>
              <input
                type="number"
                value={startingValue}
                onChange={(e) => setStartingValue(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                min={1}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Max Hammers/Hole
              </label>
              <input
                type="number"
                value={maxHammers}
                onChange={(e) => setMaxHammers(Math.max(1, parseInt(e.target.value) || 4))}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                min={1}
                max={10}
              />
            </div>
          </div>

          {/* Team Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Team 1 (Select 2)
            </label>
            <div className="flex flex-wrap gap-2">
              {players.map((player) => (
                <button
                  key={`t1-${player.id}`}
                  onClick={() => togglePlayer(player.id, 'team1')}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    team1.includes(player.id)
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {player.firstName} {player.lastName?.[0] || ''}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Team 2 (Select 2)
            </label>
            <div className="flex flex-wrap gap-2">
              {players.map((player) => (
                <button
                  key={`t2-${player.id}`}
                  onClick={() => togglePlayer(player.id, 'team2')}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    team2.includes(player.id)
                      ? 'bg-red-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
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
            className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold
                     rounded-lg hover:from-amber-600 hover:to-orange-700 disabled:opacity-50
                     disabled:cursor-not-allowed transition-all"
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
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-amber-500 to-orange-600 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🔨</span>
              <div>
                <h2 className="text-xl font-bold text-white">Hammer Game</h2>
                <p className="text-amber-100 text-sm">Game unavailable</p>
              </div>
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="p-2 text-white/80 hover:text-white rounded-lg hover:bg-white/10"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        <div className="p-6">
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/20 p-4 text-center">
            <p className="text-sm font-medium text-gray-900 dark:text-white">We couldn’t load this Hammer game.</p>
            <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
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
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-500 to-orange-600 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🔨</span>
            <div>
              <h2 className="text-xl font-bold text-white">{game.name}</h2>
              <p className="text-amber-100 text-sm">
                Hole {currentHole} • Current Value: ${game.currentValue}
              </p>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 text-white/80 hover:text-white rounded-lg hover:bg-white/10"
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
          <div className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-100 to-orange-100
                        dark:from-amber-900/30 dark:to-orange-900/30 rounded-full">
            <span className="text-3xl font-bold text-amber-600 dark:text-amber-400">
              ${game.currentValue}
            </span>
            <span className="text-amber-700 dark:text-amber-300 text-sm">at stake</span>
          </div>
        </motion.div>

        {/* Team Standings */}
        <div className="grid grid-cols-2 gap-4">
          <div
            className={`p-4 rounded-lg border-2 ${
              game.hammerHolder === 'team1'
                ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20'
                : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-blue-600 dark:text-blue-400">Team 1</span>
              {game.hammerHolder === 'team1' && <span className="text-xl">🔨</span>}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              {game.team1PlayerIds.map(getPlayerName).join(' & ')}
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {game.runningScore > 0 ? '+' : ''}
              {game.runningScore > 0 ? game.runningScore : 0}
            </div>
          </div>

          <div
            className={`p-4 rounded-lg border-2 ${
              game.hammerHolder === 'team2'
                ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20'
                : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-red-600 dark:text-red-400">Team 2</span>
              {game.hammerHolder === 'team2' && <span className="text-xl">🔨</span>}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              {game.team2PlayerIds.map(getPlayerName).join(' & ')}
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {game.runningScore < 0 ? '+' : ''}
              {game.runningScore < 0 ? Math.abs(game.runningScore) : 0}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        {game.status === 'active' && !hasAcceptedOrDeclined && (
          <div className="space-y-3">
            <div className="text-center text-sm text-gray-600 dark:text-gray-400 mb-2">
              {game.hammerHolder === 'team1' ? 'Team 1' : 'Team 2'} has the hammer
            </div>
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => handleAction('hammer')}
                disabled={!canHammer}
                className="px-4 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold
                         rounded-lg hover:from-amber-600 hover:to-orange-600 disabled:opacity-50
                         disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
              >
                🔨 Hammer
                <span className="text-xs opacity-75">(×2)</span>
              </button>
              <button
                onClick={() => handleAction('accept')}
                className="px-4 py-3 bg-green-600 text-white font-semibold rounded-lg
                         hover:bg-green-700 transition-colors"
              >
                ✓ Accept
              </button>
              <button
                onClick={() => handleAction('decline')}
                className="px-4 py-3 bg-red-600 text-white font-semibold rounded-lg
                         hover:bg-red-700 transition-colors"
              >
                ✗ Decline
              </button>
            </div>
            {hammerCount > 0 && (
              <p className="text-center text-xs text-gray-500 dark:text-gray-400">
                Hammers this hole: {hammerCount}/{game.maxHammers}
              </p>
            )}
          </div>
        )}

        {/* Score Entry (after accept) */}
        {game.status === 'active' && hasAcceptedOrDeclined && (
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900 dark:text-white text-center">Enter Hole Scores</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1 text-center">
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
                  className="w-full px-4 py-2 text-center text-lg font-semibold border border-gray-300
                           dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  min={1}
                  max={15}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1 text-center">
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
                  className="w-full px-4 py-2 text-center text-lg font-semibold border border-gray-300
                           dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  min={1}
                  max={15}
                />
              </div>
            </div>
            <button
              onClick={handleCompleteHole}
              disabled={pendingScores.team1 === '' || pendingScores.team2 === ''}
              className="w-full py-3 bg-green-600 text-white font-semibold rounded-lg
                       hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Complete Hole
            </button>
          </div>
        )}

        {/* Hole History */}
        {game.holeResults.length > 0 && (
          <div className="mt-6">
            <h4 className="font-medium text-gray-900 dark:text-white mb-3">Hole Results</h4>
            <div className="max-h-48 overflow-y-auto space-y-2">
              <AnimatePresence>
                {game.holeResults
                  .filter((hr) => hr.winner !== 'halved' || hr.pointsWon > 0)
                  .map((hr) => (
                    <motion.div
                      key={hr.holeNumber}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 bg-gray-200 dark:bg-gray-600 rounded-full flex items-center justify-center text-sm font-medium">
                          {hr.holeNumber}
                        </span>
                        <div>
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {hr.winner === 'team1'
                              ? 'Team 1 wins'
                              : hr.winner === 'team2'
                              ? 'Team 2 wins'
                              : 'Halved'}
                          </span>
                          {hr.hammerActions.length > 0 && (
                            <p className="text-xs text-gray-500 dark:text-gray-400">
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
                            ? 'text-blue-600'
                            : hr.winner === 'team2'
                            ? 'text-red-600'
                            : 'text-gray-500'
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
            className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold
                     rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all"
          >
            Finalize Game
          </button>
        )}

        {/* Payouts Display */}
        {showPayouts && payouts && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50
                     dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg"
          >
            <h4 className="font-semibold text-gray-900 dark:text-white mb-3 text-center">
              Final Settlement
            </h4>
            <div className="text-center mb-4">
              <span
                className={`text-2xl font-bold ${
                  payouts.winningTeam === 'team1'
                    ? 'text-blue-600'
                    : payouts.winningTeam === 'team2'
                    ? 'text-red-600'
                    : 'text-gray-600'
                }`}
              >
                {payouts.winningTeam === 'push'
                  ? 'Push!'
                  : `${payouts.winningTeam === 'team1' ? 'Team 1' : 'Team 2'} wins $${payouts.netSettlement}`}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Team 1 Total</p>
                <p className="text-lg font-semibold text-blue-600">${payouts.team1Total}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Team 2 Total</p>
                <p className="text-lg font-semibold text-red-600">${payouts.team2Total}</p>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

export default HammerGameCard;
