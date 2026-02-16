'use client';

import React, { useState } from 'react';
import {
  autoPickPlayer,
  balanceTeamsByHandicap,
  createDraftConfig,
  DraftConfig,
  DraftState,
  initializeDraftState,
  makeDraftPick,
  randomizeTeams,
} from '@/lib/services/draftService';
import { useTripStore } from '@/lib/stores/tripStore';
import { Player, Team } from '@/lib/types';
import {
  Gavel,
  Pause,
  Play,
  RotateCcw,
  Scale,
  Shuffle,
  Trophy,
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
    setDraftState(
      initializeDraftState(draftConfig, players, {
        teamA: teams[0]?.id || 'A',
        teamB: teams[1]?.id || 'B',
      })
    );
  };

  const handlePick = (playerId: string) => {
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

  const currentTeam =
    config && draftState
      ? teams.find(
          t => t.id === config.draftOrder[draftState.currentPick % config.draftOrder.length]
        )
      : null;

  const currentPickNumber = (draftState?.currentPick ?? 0) + 1;

  // Mode selection screen
  if (!mode) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <Trophy className="w-12 h-12 text-[var(--warning)] mx-auto mb-3" />
          <h2 className="text-xl font-bold text-[var(--ink-primary)]">Team Draft</h2>
          <p className="text-[var(--ink-secondary)] mt-1">
            Choose how to assign {players.length} players to {teams.length} teams
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => startDraft('snake')}
            className="p-6 border border-[var(--rule)] rounded-xl hover:bg-[var(--surface-secondary)] transition-all text-center bg-[var(--surface-card)]"
          >
            <Users className="w-10 h-10 text-[var(--info)] mx-auto mb-3" />
            <h3 className="font-semibold text-[var(--ink-primary)]">Snake Draft</h3>
            <p className="text-sm text-[var(--ink-secondary)] mt-1">
              Take turns picking, order reverses each round
            </p>
          </button>

          <button
            onClick={() => startDraft('auction')}
            className="p-6 border border-[var(--rule)] rounded-xl hover:bg-[var(--surface-secondary)] transition-all text-center bg-[var(--surface-card)]"
          >
            <Gavel className="w-10 h-10 text-[var(--success)] mx-auto mb-3" />
            <h3 className="font-semibold text-[var(--ink-primary)]">Auction Draft</h3>
            <p className="text-sm text-[var(--ink-secondary)] mt-1">
              Bid on players with limited budget
            </p>
          </button>

          <button
            onClick={() => startDraft('random')}
            className="p-6 border border-[var(--rule)] rounded-xl hover:bg-[var(--surface-secondary)] transition-all text-center bg-[var(--surface-card)]"
          >
            <Shuffle className="w-10 h-10 text-[var(--masters)] mx-auto mb-3" />
            <h3 className="font-semibold text-[var(--ink-primary)]">Random</h3>
            <p className="text-sm text-[var(--ink-secondary)] mt-1">
              Randomly assign players to teams
            </p>
          </button>

          <button
            onClick={() => startDraft('balanced')}
            className="p-6 border border-[var(--rule)] rounded-xl hover:bg-[var(--surface-secondary)] transition-all text-center bg-[var(--surface-card)]"
          >
            <Scale className="w-10 h-10 text-[var(--warning)] mx-auto mb-3" />
            <h3 className="font-semibold text-[var(--ink-primary)]">Auto-Balance</h3>
            <p className="text-sm text-[var(--ink-secondary)] mt-1">
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
            <Users className="w-6 h-6 text-[var(--info)]" />
          ) : (
            <Gavel className="w-6 h-6 text-[var(--success)]" />
          )}
          <div>
            <h3 className="font-semibold text-[var(--ink-primary)]">
              {mode === 'snake' ? 'Snake Draft' : 'Auction Draft'}
            </h3>
            <p className="text-sm text-[var(--ink-secondary)]">
              Pick {currentPickNumber} of {players.length}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPaused(!isPaused)}
            className="p-2 hover:bg-[var(--surface-secondary)] rounded-lg transition-colors"
          >
            {isPaused ? (
              <Play className="w-5 h-5 text-[var(--success)]" />
            ) : (
              <Pause className="w-5 h-5 text-[var(--ink-secondary)]" />
            )}
          </button>
          <button
            onClick={resetDraft}
            className="p-2 hover:bg-[var(--surface-secondary)] rounded-lg transition-colors"
          >
            <RotateCcw className="w-5 h-5 text-[var(--ink-secondary)]" />
          </button>
        </div>
      </div>

      {/* Current Pick Banner */}
      {currentTeam && (
        <div
          className={`p-4 rounded-lg border ${currentTeam.name.toLowerCase().includes('usa')
            ? 'bg-team-usa/10 border-team-usa/30'
            : 'bg-team-europe/10 border-team-europe/30'
            }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[var(--ink-secondary)]">On the Clock</p>
              <p className="text-lg font-bold text-[var(--ink-primary)]">{currentTeam.name}</p>
            </div>
            {mode === 'auction' && config && (
              <div className="text-right">
                <p className="text-sm text-[var(--ink-secondary)]">Budget</p>
                <p className="text-lg font-bold text-[var(--ink-primary)]">${config.auctionBudget}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Auction Bidding */}
      {mode === 'auction' && selectedPlayer && (
        <div className="p-4 bg-[color:var(--success)]/10 rounded-lg border border-[color:var(--success)]/30">
          <p className="text-sm text-[var(--ink-secondary)] mb-2">
            Bidding on:{' '}
            <strong className="text-[var(--ink-primary)]">
              {(() => {
                const p = players.find(p => p.id === selectedPlayer);
                return p ? `${p.firstName} ${p.lastName}` : 'Unknown';
              })()}
            </strong>
          </p>
          <div className="flex items-center gap-3">
            <input
              type="number"
              value={currentBid}
              onChange={e => setCurrentBid(parseInt(e.target.value) || 0)}
              min={1}
              max={config?.auctionBudget || 100}
              className="flex-1 px-3 py-2 border border-[var(--rule)] rounded-lg bg-[var(--surface)] text-[var(--ink-primary)]"
            />
            <button
              onClick={() => handlePick(selectedPlayer)}
              disabled={currentBid < 1}
              className="px-4 py-2 bg-[var(--success)] text-[var(--canvas)] rounded-lg hover:bg-[color:var(--success)]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Win Bid (${currentBid})
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        {/* Available Players */}
        <div className="border border-[var(--rule)] rounded-lg overflow-hidden bg-[var(--surface-card)]">
          <div className="bg-[var(--surface-secondary)] px-4 py-3 border-b border-[var(--rule)]">
            <h4 className="font-medium text-[var(--ink-primary)]">Available ({availablePlayers.length})</h4>
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
                className={`w-full px-4 py-3 text-left hover:bg-[var(--surface-secondary)] transition-colors flex items-center justify-between ${
                  selectedPlayer === player.id ? 'bg-[color:var(--success)]/10' : ''
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <div className="flex items-center gap-3">
                  <User className="w-4 h-4 text-[var(--ink-tertiary)]" />
                  <span className="text-[var(--ink-primary)]">
                    {player.firstName} {player.lastName}
                  </span>
                </div>
                <span className="text-sm text-[var(--ink-secondary)]">
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
                className={`border rounded-lg overflow-hidden bg-[var(--surface-card)] ${
                  currentTeam?.id === team.id
                    ? 'border-[color:var(--warning)] ring-2 ring-[color:var(--warning)]/20'
                    : 'border-[var(--rule)]'
                }`}
              >
                <div
                  className={`px-4 py-2 ${team.name.toLowerCase().includes('usa') ? 'bg-team-usa/10' : 'bg-team-europe/10'}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-[var(--ink-primary)]">{team.name}</span>
                    <span className="text-sm text-[var(--ink-secondary)]">
                      {teamPlayers.length} players • {totalHandicap.toFixed(1)} total
                    </span>
                  </div>
                </div>
                <div className="p-2">
                  {teamPlayers.length === 0 ? (
                    <p className="text-sm text-[var(--ink-tertiary)] text-center py-2">No players yet</p>
                  ) : (
                    <div className="space-y-1">
                      {teamPlayers.map(player => (
                        <div key={player.id} className="flex items-center justify-between px-2 py-1 text-sm">
                          <span className="text-[var(--ink-primary)]">
                            {player.firstName} {player.lastName}
                          </span>
                          <span className="text-[var(--ink-secondary)]">
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
          className="px-4 py-2 text-sm text-[var(--ink-secondary)] hover:bg-[var(--surface-secondary)] rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Auto-pick (Best Available)
        </button>
      </div>
    </div>
  );
}

export default DraftBoard;
