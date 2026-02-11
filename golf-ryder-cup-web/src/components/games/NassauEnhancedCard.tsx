'use client';

/**
 * NassauEnhancedCard - Nassau with Auto-Press UI Component
 *
 * Full-featured Nassau game interface with:
 * - Front 9, Back 9, Overall tracking
 * - Auto-press at threshold
 * - Manual press option
 * - Complete payout calculation
 */

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  createNassauEnhanced,
  recordNassauHoleResult,
  addManualPress,
  calculateNassauPayouts,
} from '@/lib/services/extendedSideGamesService';
import type { NassauEnhanced, NassauPress } from '@/lib/types/sideGames';
import type { Player, UUID } from '@/lib/types/models';

interface NassauEnhancedCardProps {
  tripId: UUID;
  sessionId?: UUID;
  players: Player[];
  existingGame?: NassauEnhanced;
  onSave?: (game: NassauEnhanced) => void;
  onClose?: () => void;
}

export function NassauEnhancedCard({
  tripId,
  sessionId,
  players,
  existingGame,
  onSave,
  onClose,
}: NassauEnhancedCardProps) {
  const [game, setGame] = useState<NassauEnhanced | null>(existingGame || null);
  const [setupMode, setSetupMode] = useState(!existingGame);
  const [gameName, setGameName] = useState('Nassau');
  const [baseValue, setBaseValue] = useState(10);
  const [autoPressEnabled, setAutoPressEnabled] = useState(true);
  const [autoPressThreshold, setAutoPressThreshold] = useState(2);
  const [maxPresses, setMaxPresses] = useState(3);
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
    if (team1.length === 0 || team2.length === 0) {
      alert('Each team must have at least 1 player');
      return;
    }

    const newGame = createNassauEnhanced(
      tripId,
      gameName,
      baseValue,
      team1,
      team2,
      sessionId,
      autoPressEnabled,
      autoPressThreshold,
      maxPresses
    );

    setGame(newGame);
    setSetupMode(false);
    onSave?.(newGame);
  }, [
    tripId,
    sessionId,
    gameName,
    baseValue,
    team1,
    team2,
    autoPressEnabled,
    autoPressThreshold,
    maxPresses,
    onSave,
  ]);

  // Record hole score
  const handleRecordHole = useCallback(() => {
    if (!game || pendingScores.team1 === '' || pendingScores.team2 === '') return;

    const updatedGame = recordNassauHoleResult(
      game,
      currentHole,
      Number(pendingScores.team1),
      Number(pendingScores.team2)
    );

    setGame(updatedGame);
    onSave?.(updatedGame);

    if (currentHole < 18) {
      setCurrentHole((h) => h + 1);
      setPendingScores({ team1: '', team2: '' });
    } else {
      setShowPayouts(true);
    }
  }, [game, currentHole, pendingScores, onSave]);

  // Add manual press
  const handleAddPress = useCallback(
    (nine: 'front' | 'back' | 'overall', team: 'team1' | 'team2') => {
      if (!game) return;

      try {
        const updatedGame = addManualPress(game, nine, team, currentHole);
        setGame(updatedGame);
        onSave?.(updatedGame);
      } catch (error) {
        alert(error instanceof Error ? error.message : 'Could not add press');
      }
    },
    [game, currentHole, onSave]
  );

  // Toggle player selection
  const togglePlayer = (playerId: UUID, team: 'team1' | 'team2') => {
    if (team === 'team1') {
      if (team1.includes(playerId)) {
        setTeam1(team1.filter((id) => id !== playerId));
      } else {
        setTeam1([...team1, playerId]);
        setTeam2(team2.filter((id) => id !== playerId));
      }
    } else {
      if (team2.includes(playerId)) {
        setTeam2(team2.filter((id) => id !== playerId));
      } else {
        setTeam2([...team2, playerId]);
        setTeam1(team1.filter((id) => id !== playerId));
      }
    }
  };

  // Calculate current standing for a nine
  const getNineStanding = (nine: NassauEnhanced['frontNine']) => {
    const diff = nine.team1Holes - nine.team2Holes;
    if (diff > 0) return `Team 1 +${diff}`;
    if (diff < 0) return `Team 2 +${Math.abs(diff)}`;
    return 'All Square';
  };

  // Setup mode
  if (setupMode) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🏆</span>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Setup Nassau Game</h2>
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
              placeholder="Nassau"
            />
          </div>

          {/* Base Value */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Base Value ($) - Each Nine + Overall
            </label>
            <input
              type="number"
              value={baseValue}
              onChange={(e) => setBaseValue(Math.max(1, parseInt(e.target.value) || 10))}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              min={1}
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Total at stake: ${baseValue * 3} (Front + Back + Overall)
            </p>
          </div>

          {/* Auto-Press Settings */}
          <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-medium text-gray-900 dark:text-white">Auto-Press</span>
              <button
                onClick={() => setAutoPressEnabled(!autoPressEnabled)}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  autoPressEnabled ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                }`}
              >
                <span
                  className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    autoPressEnabled ? 'translate-x-6' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>

            {autoPressEnabled && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                    Press when down by
                  </label>
                  <input
                    type="number"
                    value={autoPressThreshold}
                    onChange={(e) => setAutoPressThreshold(Math.max(1, parseInt(e.target.value) || 2))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                             bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    min={1}
                    max={5}
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                    Max presses per nine
                  </label>
                  <input
                    type="number"
                    value={maxPresses}
                    onChange={(e) => setMaxPresses(Math.max(1, parseInt(e.target.value) || 3))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                             bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    min={1}
                    max={10}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Team Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Team 1
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
              Team 2
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
            disabled={team1.length === 0 || team2.length === 0}
            className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold
                     rounded-lg hover:from-emerald-600 hover:to-teal-700 disabled:opacity-50
                     disabled:cursor-not-allowed transition-all"
          >
            Start Nassau 🏆
          </button>
        </div>
      </div>
    );
  }

  // No game
  if (!game) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🏆</span>
              <div>
                <h2 className="text-xl font-bold text-white">Nassau</h2>
                <p className="text-emerald-100 text-sm">Game unavailable</p>
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
            <p className="text-sm font-medium text-gray-900 dark:text-white">We couldn’t load this Nassau game.</p>
            <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
              Try reopening the game, or start a new one.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Calculate payouts for display
  const payouts = showPayouts ? calculateNassauPayouts(game, players) : null;

  // Get press counts
  const frontPresses = game.presses.filter((p) => p.nine === 'front');
  const backPresses = game.presses.filter((p) => p.nine === 'back');

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🏆</span>
            <div>
              <h2 className="text-xl font-bold text-white">{game.name}</h2>
              <p className="text-emerald-100 text-sm">
                Hole {currentHole} of 18 • ${game.baseValue}/nine
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
        {/* Nine Standings */}
        <div className="grid grid-cols-3 gap-3">
          {/* Front Nine */}
          <div
            className={`p-3 rounded-lg border-2 ${
              currentHole <= 9
                ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50'
            }`}
          >
            <h4 className="font-semibold text-gray-900 dark:text-white text-sm mb-1">Front 9</h4>
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
              {getNineStanding(game.frontNine)}
            </p>
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-bold text-blue-600">{game.frontNine.team1Holes}</span>
              <span className="text-gray-400">-</span>
              <span className="text-lg font-bold text-red-600">{game.frontNine.team2Holes}</span>
            </div>
            {frontPresses.length > 0 && (
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                {frontPresses.length} press{frontPresses.length !== 1 ? 'es' : ''}
              </p>
            )}
          </div>

          {/* Back Nine */}
          <div
            className={`p-3 rounded-lg border-2 ${
              currentHole > 9 && currentHole <= 18
                ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50'
            }`}
          >
            <h4 className="font-semibold text-gray-900 dark:text-white text-sm mb-1">Back 9</h4>
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
              {getNineStanding(game.backNine)}
            </p>
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-bold text-blue-600">{game.backNine.team1Holes}</span>
              <span className="text-gray-400">-</span>
              <span className="text-lg font-bold text-red-600">{game.backNine.team2Holes}</span>
            </div>
            {backPresses.length > 0 && (
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                {backPresses.length} press{backPresses.length !== 1 ? 'es' : ''}
              </p>
            )}
          </div>

          {/* Overall */}
          <div className="p-3 rounded-lg border-2 border-purple-300 dark:border-purple-700 bg-purple-50 dark:bg-purple-900/20">
            <h4 className="font-semibold text-gray-900 dark:text-white text-sm mb-1">Overall</h4>
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
              {game.overall.team1Total > game.overall.team2Total
                ? `Team 1 +${game.overall.team1Total - game.overall.team2Total}`
                : game.overall.team2Total > game.overall.team1Total
                ? `Team 2 +${game.overall.team2Total - game.overall.team1Total}`
                : 'All Square'}
            </p>
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-bold text-blue-600">{game.overall.team1Total}</span>
              <span className="text-gray-400">-</span>
              <span className="text-lg font-bold text-red-600">{game.overall.team2Total}</span>
            </div>
          </div>
        </div>

        {/* Teams */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <h4 className="font-semibold text-blue-700 dark:text-blue-300 text-sm mb-1">Team 1</h4>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              {game.team1PlayerIds.map(getPlayerName).join(', ')}
            </p>
          </div>
          <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <h4 className="font-semibold text-red-700 dark:text-red-300 text-sm mb-1">Team 2</h4>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              {game.team2PlayerIds.map(getPlayerName).join(', ')}
            </p>
          </div>
        </div>

        {/* Score Entry */}
        {game.status !== 'completed' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-gray-900 dark:text-white">
                Hole {currentHole} - {currentHole <= 9 ? 'Front 9' : 'Back 9'}
              </h4>
              {game.autoPressEnabled && (
                <span className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                  ⚡ Auto-press @ {game.autoPressThreshold} down
                </span>
              )}
            </div>

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
                  className="w-full px-4 py-3 text-center text-xl font-semibold border border-gray-300
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
                  className="w-full px-4 py-3 text-center text-xl font-semibold border border-gray-300
                           dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  min={1}
                  max={15}
                />
              </div>
            </div>

            <button
              onClick={handleRecordHole}
              disabled={pendingScores.team1 === '' || pendingScores.team2 === ''}
              className="w-full py-3 bg-emerald-600 text-white font-semibold rounded-lg
                       hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Record Hole {currentHole}
            </button>

            {/* Manual Press Buttons */}
            {!game.autoPressEnabled && (
              <div className="flex gap-2">
                <button
                  onClick={() =>
                    handleAddPress(currentHole <= 9 ? 'front' : 'back', 'team1')
                  }
                  className="flex-1 py-2 text-sm bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300
                           rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                >
                  Team 1 Press
                </button>
                <button
                  onClick={() =>
                    handleAddPress(currentHole <= 9 ? 'front' : 'back', 'team2')
                  }
                  className="flex-1 py-2 text-sm bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300
                           rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                >
                  Team 2 Press
                </button>
              </div>
            )}
          </div>
        )}

        {/* Presses Display */}
        {game.presses.length > 0 && (
          <div className="mt-4">
            <h4 className="font-medium text-gray-900 dark:text-white mb-2 text-sm">Active Presses</h4>
            <div className="flex flex-wrap gap-2">
              <AnimatePresence>
                {game.presses.map((press: NassauPress) => (
                  <motion.div
                    key={press.id}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium ${
                      press.pressedByTeam === 'team1'
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                        : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                    }`}
                  >
                    {press.nine === 'front' ? 'F9' : 'B9'} - ${press.value}
                    {press.isAuto && ' ⚡'}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* Payouts Display */}
        {showPayouts && payouts && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50
                     dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg"
          >
            <h4 className="font-semibold text-gray-900 dark:text-white mb-4 text-center">
              Final Settlement
            </h4>

            {/* Nine Results */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400">Front 9</p>
                <p
                  className={`font-semibold ${
                    payouts.frontNineResult.winner === 'team1'
                      ? 'text-blue-600'
                      : payouts.frontNineResult.winner === 'team2'
                      ? 'text-red-600'
                      : 'text-gray-500'
                  }`}
                >
                  {payouts.frontNineResult.winner === 'push'
                    ? 'Push'
                    : `${payouts.frontNineResult.winner === 'team1' ? 'T1' : 'T2'} $${
                        payouts.frontNineResult.amount
                      }`}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400">Back 9</p>
                <p
                  className={`font-semibold ${
                    payouts.backNineResult.winner === 'team1'
                      ? 'text-blue-600'
                      : payouts.backNineResult.winner === 'team2'
                      ? 'text-red-600'
                      : 'text-gray-500'
                  }`}
                >
                  {payouts.backNineResult.winner === 'push'
                    ? 'Push'
                    : `${payouts.backNineResult.winner === 'team1' ? 'T1' : 'T2'} $${
                        payouts.backNineResult.amount
                      }`}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400">Overall</p>
                <p
                  className={`font-semibold ${
                    payouts.overallResult.winner === 'team1'
                      ? 'text-blue-600'
                      : payouts.overallResult.winner === 'team2'
                      ? 'text-red-600'
                      : 'text-gray-500'
                  }`}
                >
                  {payouts.overallResult.winner === 'push'
                    ? 'Push'
                    : `${payouts.overallResult.winner === 'team1' ? 'T1' : 'T2'} $${
                        payouts.overallResult.amount
                      }`}
                </p>
              </div>
            </div>

            {/* Press Results */}
            {payouts.pressResults.length > 0 && (
              <div className="mb-4">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 text-center">Presses</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {payouts.pressResults.map((pr, idx) => (
                    <span
                      key={idx}
                      className={`px-2 py-1 rounded text-xs ${
                        pr.winner === 'team1'
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                          : pr.winner === 'team2'
                          ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                          : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                      }`}
                    >
                      {pr.nine === 'front' ? 'F9' : 'B9'}: {pr.winner === 'push' ? '-' : `$${pr.amount}`}
                      {pr.isAuto && ' ⚡'}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Totals */}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="text-center">
                <p className="text-sm text-gray-600 dark:text-gray-400">Team 1 Wins</p>
                <p className="text-2xl font-bold text-blue-600">${payouts.totalTeam1}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600 dark:text-gray-400">Team 2 Wins</p>
                <p className="text-2xl font-bold text-red-600">${payouts.totalTeam2}</p>
              </div>
            </div>

            <div className="mt-4 text-center">
              <span
                className={`text-xl font-bold ${
                  payouts.totalTeam1 > payouts.totalTeam2
                    ? 'text-blue-600'
                    : payouts.totalTeam2 > payouts.totalTeam1
                    ? 'text-red-600'
                    : 'text-gray-600'
                }`}
              >
                {payouts.totalTeam1 === payouts.totalTeam2
                  ? 'Push!'
                  : `${payouts.totalTeam1 > payouts.totalTeam2 ? 'Team 1' : 'Team 2'} owes $${
                      payouts.netSettlement
                    }`}
              </span>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

export default NassauEnhancedCard;
