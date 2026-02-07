'use client';

import React, { useState } from 'react';
import {
  createDraftConfig,
  initializeDraftState,
  makeDraftPick,
  autoPickPlayer,
  randomizeTeams,
  balanceTeamsByHandicap,
  DraftConfig,
  DraftState,
} from '@/lib/services/draftService';
import { useTripStore } from '@/lib/stores/tripStore';
import { Player, Team } from '@/lib/types';
import {
  Trophy,
  Shuffle,
  Scale,
  Play,
  Pause,
  RotateCcw,
  Gavel,
  User,
  Users,
} from 'lucide-react';

interface DraftBoardProps {
  players: Player[];
  teams: Team[];
  onDraftComplete: (teamAssignments: Map<string, string>) => void;
}

type DraftMode = 'snake' | 'auction' | 'random' | 'balanced';

export function DraftBoard({ players, teams, onDraftComplete }: DraftBoardProps) {
  const { currentTrip } = useTripStore();
  const [mode, setMode] = useState<DraftMode | null>(null);
  const [config, setConfig] = useState<DraftConfig | null>(null);
  const [draftState, setDraftState] = useState<DraftState | null>(null);
  const [isPaused, setIsPaused] = useState(false);

  // Auction-specific state
  const [currentBid, setCurrentBid] = useState(0);
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);

  const availablePlayers = players.filter(
    p => !draftState?.picks.some(pick => pick.playerId === p.id)
  );

  const getTeamPlayers = (teamId: string) => {
    if (!draftState) return [];
    const teamPicks = draftState.picks.filter(p => p.teamId === teamId);
    return teamPicks.map(pick => players.find(p => p.id === pick.playerId)!).filter(Boolean);
  };

  const startDraft = (selectedMode: DraftMode) => {
    setMode(selectedMode);

    if (selectedMode === 'random') {
      // Immediate random assignment
      const result = randomizeTeams(players);
      const assignments = new Map<string, string>();
      result.teamA.forEach(p => assignments.set(p.id, teams[0]?.id || 'A'));
      result.teamB.forEach(p => assignments.set(p.id, teams[1]?.id || 'B'));
      onDraftComplete(assignments);
      return;
    }

    if (selectedMode === 'balanced') {
      // Immediate balanced assignment
      const result = balanceTeamsByHandicap(players);
      const assignments = new Map<string, string>();
      result.teamA.forEach(p => assignments.set(p.id, teams[0]?.id || 'A'));
      result.teamB.forEach(p => assignments.set(p.id, teams[1]?.id || 'B'));
      onDraftComplete(assignments);
      return;
    }

    // Initialize draft for snake or auction
    const captainIds = teams.map(t => t.id);
    const tripId = currentTrip?.id || crypto.randomUUID();
    const draftConfig = createDraftConfig(
      tripId,
      selectedMode === 'auction' ? 'auction' : 'snake',
      captainIds,
      players.length,
      selectedMode === 'auction' ? { auctionBudget: 100 } : undefined
    );

    setConfig(draftConfig);
    setDraftState(initializeDraftState(
      draftConfig,
      players,
      { teamA: teams[0]?.id || 'A', teamB: teams[1]?.id || 'B' }
    ));
  };

  const handlePick = (playerId: string, teamId?: string) => {
    if (!draftState || !config) return;

    const auctionPrice = mode === 'auction' ? currentBid : undefined;

    const { newState } = makeDraftPick(draftState, playerId, auctionPrice);
    setDraftState(newState);
    setSelectedPlayer(null);
    setCurrentBid(0);

    // Check if draft is complete
    if (newState.picks.length === players.length || newState.availablePlayers.length === 0) {
      const assignments = new Map<string, string>();
      newState.picks.forEach(pick => {
        assignments.set(pick.playerId, pick.teamId);
      });
      onDraftComplete(assignments);
    }
  };

  const handleAutoPick = () => {
    if (!draftState || !config) return;

    const result = autoPickPlayer(draftState);
    if (result) {
      handlePick(result);
    }
  };

  const resetDraft = () => {
    setMode(null);
    setConfig(null);
    setDraftState(null);
    setSelectedPlayer(null);
    setCurrentBid(0);
    setIsPaused(false);
  };

  const currentTeam = config && draftState
    ? teams.find(t => t.id === config.draftOrder[draftState.currentPick % config.draftOrder.length])
    : null;

  // Mode selection screen
  if (!mode) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <Trophy className="w-12 h-12 text-yellow-500 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Team Draft
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Choose how to assign {players.length} players to {teams.length} teams
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => startDraft('snake')}
            className="p-6 border-2 rounded-xl hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all text-center dark:border-gray-700"
          >
            <Users className="w-10 h-10 text-blue-500 mx-auto mb-3" />
            <h3 className="font-semibold text-gray-900 dark:text-white">Snake Draft</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Take turns picking, order reverses each round
            </p>
          </button>

          <button
            onClick={() => startDraft('auction')}
            className="p-6 border-2 rounded-xl hover:border-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 transition-all text-center dark:border-gray-700"
          >
            <Gavel className="w-10 h-10 text-green-500 mx-auto mb-3" />
            <h3 className="font-semibold text-gray-900 dark:text-white">Auction Draft</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Bid on players with limited budget
            </p>
          </button>

          <button
            onClick={() => startDraft('random')}
            className="p-6 border-2 rounded-xl hover:border-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all text-center dark:border-gray-700"
          >
            <Shuffle className="w-10 h-10 text-purple-500 mx-auto mb-3" />
            <h3 className="font-semibold text-gray-900 dark:text-white">Random</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Randomly assign players to teams
            </p>
          </button>

          <button
            onClick={() => startDraft('balanced')}
            className="p-6 border-2 rounded-xl hover:border-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-all text-center dark:border-gray-700"
          >
            <Scale className="w-10 h-10 text-orange-500 mx-auto mb-3" />
            <h3 className="font-semibold text-gray-900 dark:text-white">Auto-Balance</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Balance teams by total handicap
            </p>
          </button>
        </div>
      </div>
    );
  }

  // Draft in progress
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {mode === 'snake' ? (
            <Users className="w-6 h-6 text-blue-500" />
          ) : (
            <Gavel className="w-6 h-6 text-green-500" />
          )}
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">
              {mode === 'snake' ? 'Snake Draft' : 'Auction Draft'}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Pick {draftState?.currentPick || 0 + 1} of {players.length}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPaused(!isPaused)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            {isPaused ? (
              <Play className="w-5 h-5 text-green-500" />
            ) : (
              <Pause className="w-5 h-5 text-gray-500" />
            )}
          </button>
          <button
            onClick={resetDraft}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <RotateCcw className="w-5 h-5 text-gray-500" />
          </button>
        </div>
      </div>

      {/* Current Pick Banner */}
      {currentTeam && (
        <div className={`p-4 rounded-lg ${currentTeam.name.toLowerCase().includes('usa')
          ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
          : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
          } border`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-300">On the Clock</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                {currentTeam.name}
              </p>
            </div>
            {mode === 'auction' && config && (
              <div className="text-right">
                <p className="text-sm text-gray-600 dark:text-gray-300">Budget</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">
                  ${config.auctionBudget}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Auction Bidding */}
      {mode === 'auction' && selectedPlayer && (
        <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
            Bidding on: <strong>{(() => {
              const p = players.find(p => p.id === selectedPlayer);
              return p ? `${p.firstName} ${p.lastName}` : 'Unknown';
            })()}</strong>
          </p>
          <div className="flex items-center gap-3">
            <input
              type="number"
              value={currentBid}
              onChange={(e) => setCurrentBid(parseInt(e.target.value) || 0)}
              min={1}
              max={config?.auctionBudget || 100}
              className="flex-1 px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
            <button
              onClick={() => handlePick(selectedPlayer)}
              disabled={currentBid < 1}
              className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              Win Bid (${currentBid})
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        {/* Available Players */}
        <div className="border dark:border-gray-700 rounded-lg overflow-hidden">
          <div className="bg-gray-50 dark:bg-gray-800 px-4 py-3 border-b dark:border-gray-700">
            <h4 className="font-medium text-gray-900 dark:text-white">
              Available ({availablePlayers.length})
            </h4>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {availablePlayers.map(player => (
              <button
                key={player.id}
                onClick={() => {
                  if (mode === 'auction') {
                    setSelectedPlayer(player.id);
                    setCurrentBid(1);
                  } else {
                    handlePick(player.id);
                  }
                }}
                disabled={isPaused}
                className={`w-full px-4 py-3 text-left hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors flex items-center justify-between ${selectedPlayer === player.id ? 'bg-green-50 dark:bg-green-900/20' : ''
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <div className="flex items-center gap-3">
                  <User className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-900 dark:text-white">{player.firstName} {player.lastName}</span>
                </div>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {player.handicapIndex?.toFixed(1) || 'N/A'}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Teams */}
        <div className="space-y-3">
          {teams.map(team => {
            const teamPlayers = getTeamPlayers(team.id);
            const totalHandicap = teamPlayers.reduce((sum, p) => sum + (p.handicapIndex || 0), 0);

            return (
              <div
                key={team.id}
                className={`border rounded-lg overflow-hidden ${currentTeam?.id === team.id
                  ? 'border-yellow-400 ring-2 ring-yellow-200 dark:ring-yellow-800'
                  : 'dark:border-gray-700'
                  }`}
              >
                <div className={`px-4 py-2 ${team.name.toLowerCase().includes('usa')
                  ? 'bg-blue-50 dark:bg-blue-900/30'
                  : 'bg-red-50 dark:bg-red-900/30'
                  }`}>
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-900 dark:text-white">
                      {team.name}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {teamPlayers.length} players • {totalHandicap.toFixed(1)} total
                    </span>
                  </div>
                </div>
                <div className="p-2">
                  {teamPlayers.length === 0 ? (
                    <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-2">
                      No players yet
                    </p>
                  ) : (
                    <div className="space-y-1">
                      {teamPlayers.map(player => (
                        <div
                          key={player.id}
                          className="flex items-center justify-between px-2 py-1 text-sm"
                        >
                          <span className="text-gray-700 dark:text-gray-300">
                            {player.firstName} {player.lastName}
                          </span>
                          <span className="text-gray-500 dark:text-gray-400">
                            {player.handicapIndex?.toFixed(1)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Auto-pick button */}
      <div className="flex justify-center">
        <button
          onClick={handleAutoPick}
          disabled={isPaused || availablePlayers.length === 0}
          className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Auto-pick (Best Available)
        </button>
      </div>
    </div>
  );
}

export default DraftBoard;
