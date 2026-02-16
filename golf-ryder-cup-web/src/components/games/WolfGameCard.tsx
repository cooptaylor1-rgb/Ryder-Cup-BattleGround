/**
 * Wolf Game Card Component
 *
 * Production-ready Wolf game display with scoring and standings.
 */

'use client';

import { useState, useMemo, useCallback } from 'react';
import { Trophy, ChevronDown, ChevronUp, Info, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WolfGame } from '@/lib/types/sideGames';
import type { Player } from '@/lib/types/models';
import {
  getWolfForHole,
  wolfChoosesPartner,
  calculateWolfPayouts,
} from '@/lib/services/extendedSideGamesService';

interface WolfGameCardProps {
  game: WolfGame;
  players: Player[];
  currentHole?: number;
  onGameUpdate?: (game: WolfGame) => void;
  className?: string;
}

export function WolfGameCard({
  game,
  players,
  currentHole = 1,
  onGameUpdate,
  className,
}: WolfGameCardProps) {
  const [showHistory, setShowHistory] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState<string | null>(null);
  const [isPig, setIsPig] = useState(false);

  const getPlayerName = (playerId: string) => {
    const p = players.find(pl => pl.id === playerId);
    return p ? `${p.firstName} ${p.lastName.charAt(0)}.` : 'Unknown';
  };

  const currentWolf = useMemo(() => {
    return getWolfForHole(game, currentHole);
  }, [game, currentHole]);

  const payouts = useMemo(() => {
    return calculateWolfPayouts(game, players);
  }, [game, players]);

  const nonWolfPlayers = useMemo(() => {
    return game.playerIds.filter(id => id !== currentWolf);
  }, [game.playerIds, currentWolf]);

  const handleSelectPartner = useCallback((partnerId: string | null) => {
    setSelectedPartner(partnerId);
    if (partnerId !== null) {
      setIsPig(false);
    }
  }, []);

  const handleConfirmWolfChoice = useCallback(() => {
    if (game.status === 'completed') return;

    const updatedGame = wolfChoosesPartner(
      game,
      currentHole,
      currentWolf,
      selectedPartner || undefined,
      isPig
    );

    onGameUpdate?.(updatedGame);
    setSelectedPartner(null);
    setIsPig(false);
  }, [game, currentHole, currentWolf, selectedPartner, isPig, onGameUpdate]);

  return (
    <div className={cn(
      'card overflow-hidden',
      className
    )}>
      {/* Header */}
      <div className="p-4 bg-gradient-to-r from-amber-600/20 to-transparent">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-600/20 text-amber-600">
              🐺
            </div>
            <div>
              <h3 className="type-body-lg font-semibold text-[var(--ink-primary)]">
                {game.name}
              </h3>
              <p className="type-caption text-[var(--ink-tertiary)]">
                ${game.buyIn} per point • 4 Players
              </p>
            </div>
          </div>

          <div className={cn(
            'px-2 py-1 rounded-full type-caption',
            game.status === 'active'
              ? 'bg-[color:var(--masters)]/20 text-[var(--masters)]'
              : 'bg-[var(--surface-secondary)] text-[var(--ink-tertiary)]'
          )}>
            {game.status === 'setup' ? 'Setup' : game.status === 'active' ? `Hole ${currentHole}` : 'Complete'}
          </div>
        </div>
      </div>

      {/* Current Wolf */}
      {game.status !== 'completed' && (
        <div className="p-4 border-t border-[var(--rule)]">
          <div className="flex items-center gap-2 mb-3">
            <span className="type-caption text-[var(--ink-tertiary)]">Current Wolf:</span>
            <span className="type-body font-semibold text-amber-600">
              🐺 {getPlayerName(currentWolf)}
            </span>
          </div>

          {/* Partner Selection */}
          <div className="space-y-2">
            <p className="type-caption text-[var(--ink-tertiary)]">Choose partner (or go alone):</p>
            <div className="grid grid-cols-2 gap-2">
              {nonWolfPlayers.map(playerId => (
                <button
                  key={playerId}
                  onClick={() => handleSelectPartner(playerId)}
                  className={cn(
                    'p-3 rounded-lg border-2 transition-all text-center',
                    selectedPartner === playerId
                      ? 'border-[var(--accent)] bg-[color:var(--accent)]/10'
                      : 'border-[var(--rule)] hover:border-[var(--ink-tertiary)]'
                  )}
                >
                  <span className="type-caption font-medium">
                    {getPlayerName(playerId)}
                  </span>
                </button>
              ))}
            </div>

            {/* Lone Wolf / Pig Options */}
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => {
                  handleSelectPartner(null);
                  setIsPig(false);
                }}
                className={cn(
                  'flex-1 p-3 rounded-lg border-2 transition-all',
                  selectedPartner === null && !isPig
                    ? 'border-amber-600 bg-amber-600/10'
                    : 'border-[var(--rule)] hover:border-amber-600/50'
                )}
              >
                <div className="flex items-center justify-center gap-2">
                  <Zap size={16} className="text-amber-600" />
                  <span className="type-caption font-medium">Lone Wolf (2x)</span>
                </div>
              </button>

              {game.pigAvailable && (
                <button
                  onClick={() => {
                    handleSelectPartner(null);
                    setIsPig(true);
                  }}
                  className={cn(
                    'flex-1 p-3 rounded-lg border-2 transition-all',
                    isPig
                      ? 'border-red-500 bg-red-500/10'
                      : 'border-[var(--rule)] hover:border-red-500/50'
                  )}
                >
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-xl">🐷</span>
                    <span className="type-caption font-medium">Pig! (3x)</span>
                  </div>
                </button>
              )}
            </div>

            {(selectedPartner !== null || selectedPartner === null) && (
              <button
                onClick={handleConfirmWolfChoice}
                className="btn-primary w-full mt-3"
              >
                Confirm Choice
              </button>
            )}
          </div>
        </div>
      )}

      {/* Standings */}
      <div className="p-4 border-t border-[var(--rule)]">
        <h4 className="type-caption text-[var(--ink-tertiary)] mb-3">Standings</h4>
        <div className="space-y-2">
          {payouts.map((payout, index) => (
            <div
              key={payout.playerId}
              className={cn(
                'flex items-center justify-between p-2 rounded-lg',
                index === 0 && payout.netAmount > 0 && 'bg-[color:var(--masters)]/10'
              )}
            >
              <div className="flex items-center gap-2">
                {index === 0 && payout.netAmount > 0 && <Trophy size={14} className="text-[var(--masters)]" />}
                <span className="type-body">{payout.playerName}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="type-caption text-[var(--ink-tertiary)]">
                  {payout.netPoints > 0 ? '+' : ''}{payout.netPoints} pts
                </span>
                <span className={cn(
                  'type-body font-semibold min-w-[60px] text-right',
                  payout.netAmount > 0 && 'text-[var(--masters)]',
                  payout.netAmount < 0 && 'text-red-500'
                )}>
                  {payout.netAmount >= 0 ? '+' : ''}${payout.netAmount}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* History */}
      {game.holeResults.length > 0 && (
        <div className="border-t border-[var(--rule)]">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="w-full p-3 flex items-center justify-center gap-2 text-[var(--ink-tertiary)] hover:text-[var(--ink-primary)] transition-colors"
          >
            <span className="type-caption">Hole History</span>
            {showHistory ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {showHistory && (
            <div className="px-4 pb-4 space-y-2">
              {game.holeResults.map(result => (
                <div
                  key={result.holeNumber}
                  className="flex items-center justify-between type-caption p-2 bg-[var(--surface-secondary)] rounded"
                >
                  <span>Hole {result.holeNumber}</span>
                  <span className="text-[var(--ink-tertiary)]">
                    {result.isLoneWolf ? (result.isPig ? '🐷 Pig' : '🐺 Lone') : `Partner: ${getPlayerName(result.partnerId!)}`}
                  </span>
                  <span className={cn(
                    'font-semibold',
                    result.winner === 'wolf' && 'text-[var(--masters)]',
                    result.winner === 'pack' && 'text-red-500'
                  )}>
                    {result.winner === 'wolf' ? 'Wolf wins' : result.winner === 'pack' ? 'Pack wins' : 'Push'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Rules Info */}
      <div className="p-4 border-t border-[var(--rule)] bg-[color:var(--surface-secondary)]/50">
        <div className="flex items-start gap-2">
          <Info size={14} className="text-[var(--ink-tertiary)] shrink-0 mt-0.5" />
          <p className="type-caption text-[var(--ink-tertiary)]">
            Wolf picks partner after seeing each drive, or goes Lone Wolf (2x) or Pig (3x first use only).
            Best ball vs best ball determines winner.
          </p>
        </div>
      </div>
    </div>
  );
}

export default WolfGameCard;
