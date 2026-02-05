/**
 * Vegas Game Card Component
 *
 * Production-ready Vegas game display with flip tracking.
 */

'use client';

import { useState, useMemo, useCallback } from 'react';
import { RefreshCw, Info, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { VegasGame } from '@/lib/types/sideGames';
import type { Player } from '@/lib/types/models';
import {
  recordVegasHoleResult,
  calculateVegasPayouts,
} from '@/lib/services/extendedSideGamesService';

interface VegasGameCardProps {
  game: VegasGame;
  players: Player[];
  currentHole?: number;
  onGameUpdate?: (game: VegasGame) => void;
  className?: string;
}

export function VegasGameCard({
  game,
  players,
  currentHole = 1,
  onGameUpdate,
  className,
}: VegasGameCardProps) {
  const [showHistory, setShowHistory] = useState(false);
  const [team1Scores, setTeam1Scores] = useState<[string, string]>(['', '']);
  const [team2Scores, setTeam2Scores] = useState<[string, string]>(['', '']);

  const getPlayerName = useCallback(
    (playerId: string) => {
      const p = players.find((pl) => pl.id === playerId);
      const initial = p?.lastName?.trim()?.charAt(0) ?? '';
      return p ? `${p.firstName} ${initial ? `${initial}.` : ''}`.trim() : 'Unknown';
    },
    [players]
  );

  const team1Names = useMemo(() => {
    return game.team1PlayerIds.map((id) => getPlayerName(id));
  }, [game.team1PlayerIds, getPlayerName]);

  const team2Names = useMemo(() => {
    return game.team2PlayerIds.map((id) => getPlayerName(id));
  }, [game.team2PlayerIds, getPlayerName]);

  const payouts = useMemo(() => {
    return calculateVegasPayouts(game, players);
  }, [game, players]);

  const handleRecordHole = useCallback(() => {
    const t1 = team1Scores.map(s => parseInt(s)).filter(n => !isNaN(n)) as [number, number];
    const t2 = team2Scores.map(s => parseInt(s)).filter(n => !isNaN(n)) as [number, number];

    if (t1.length !== 2 || t2.length !== 2) return;

    const updatedGame = recordVegasHoleResult(game, currentHole, t1, t2);
    onGameUpdate?.(updatedGame);
    setTeam1Scores(['', '']);
    setTeam2Scores(['', '']);
  }, [game, currentHole, team1Scores, team2Scores, onGameUpdate]);

  const isValidScores = team1Scores.every(s => s && !isNaN(parseInt(s))) &&
                        team2Scores.every(s => s && !isNaN(parseInt(s)));

  return (
    <div className={cn(
      'card-surface rounded-xl overflow-hidden',
      className
    )}>
      {/* Header */}
      <div className="p-4 bg-gradient-to-r from-emerald-600/20 to-transparent">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-600/20 text-emerald-600">
              🎰
            </div>
            <div>
              <h3 className="type-body-lg font-semibold text-[var(--ink-primary)]">
                {game.name}
              </h3>
              <p className="type-caption text-[var(--ink-tertiary)]">
                ${game.pointValue} per point • Flip at {game.flipThreshold}+
              </p>
            </div>
          </div>

          <div className={cn(
            'px-2 py-1 rounded-full type-caption',
            game.status === 'active' ? 'bg-[var(--masters)]/20 text-[var(--masters)]' : 'bg-[var(--surface-tertiary)] text-[var(--ink-tertiary)]'
          )}>
            {game.status === 'setup' ? 'Setup' : game.status === 'active' ? `Hole ${currentHole}` : 'Complete'}
          </div>
        </div>
      </div>

      {/* Running Score */}
      <div className="p-4 border-t border-[var(--surface-tertiary)]">
        <div className="flex items-center justify-between">
          <div className="text-center flex-1">
            <p className="type-caption text-[var(--ink-tertiary)] mb-1">Team 1</p>
            <p className="type-body font-medium">
              {team1Names.join(' & ')}
            </p>
          </div>

          <div className="px-4">
            <div className={cn(
              'type-h2 font-bold',
              game.runningScore > 0 && 'text-[var(--masters)]',
              game.runningScore < 0 && 'text-red-500'
            )}>
              {game.runningScore > 0 ? '+' : ''}{game.runningScore}
            </div>
            <p className="type-caption text-[var(--ink-tertiary)] text-center">pts</p>
          </div>

          <div className="text-center flex-1">
            <p className="type-caption text-[var(--ink-tertiary)] mb-1">Team 2</p>
            <p className="type-body font-medium">
              {team2Names.join(' & ')}
            </p>
          </div>
        </div>
      </div>

      {/* Score Entry */}
      {game.status !== 'completed' && (
        <div className="p-4 border-t border-[var(--surface-tertiary)]">
          <p className="type-caption text-[var(--ink-tertiary)] mb-3">Enter hole {currentHole} scores:</p>

          <div className="grid grid-cols-2 gap-4 mb-4">
            {/* Team 1 */}
            <div className="space-y-2">
              <p className="type-caption font-medium">Team 1</p>
              {team1Names.map((name, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="type-caption text-[var(--ink-tertiary)] w-16 truncate">{name}</span>
                  <input
                    type="number"
                    min="1"
                    max="15"
                    value={team1Scores[idx]}
                    onChange={e => {
                      const newScores = [...team1Scores] as [string, string];
                      newScores[idx] = e.target.value;
                      setTeam1Scores(newScores);
                    }}
                    className="input-premium w-16 text-center"
                    placeholder="-"
                  />
                </div>
              ))}
            </div>

            {/* Team 2 */}
            <div className="space-y-2">
              <p className="type-caption font-medium">Team 2</p>
              {team2Names.map((name, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="type-caption text-[var(--ink-tertiary)] w-16 truncate">{name}</span>
                  <input
                    type="number"
                    min="1"
                    max="15"
                    value={team2Scores[idx]}
                    onChange={e => {
                      const newScores = [...team2Scores] as [string, string];
                      newScores[idx] = e.target.value;
                      setTeam2Scores(newScores);
                    }}
                    className="input-premium w-16 text-center"
                    placeholder="-"
                  />
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={handleRecordHole}
            disabled={!isValidScores}
            className="btn-primary w-full"
          >
            Record Hole
          </button>
        </div>
      )}

      {/* Payout Summary */}
      <div className="p-4 border-t border-[var(--surface-tertiary)]">
        <div className="flex items-center justify-between">
          <span className="type-body">Settlement</span>
          <div className="flex items-center gap-2">
            {payouts.winningTeam !== 'push' && (
              <span className="type-caption text-[var(--ink-tertiary)]">
                {payouts.winningTeam === 'team1' ? 'Team 2 owes Team 1' : 'Team 1 owes Team 2'}
              </span>
            )}
            <span className={cn(
              'type-body-lg font-bold',
              payouts.settlementAmount > 0 ? 'text-[var(--masters)]' : 'text-[var(--ink-tertiary)]'
            )}>
              ${payouts.settlementAmount}
            </span>
          </div>
        </div>
      </div>

      {/* History */}
      {game.holeResults.length > 0 && (
        <div className="border-t border-[var(--surface-tertiary)]">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="w-full p-3 flex items-center justify-center gap-2 text-[var(--ink-tertiary)] hover:text-[var(--ink-primary)] transition-colors"
          >
            <span className="type-caption">Hole History</span>
            {showHistory ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {showHistory && (
            <div className="px-4 pb-4">
              <table className="w-full type-caption">
                <thead>
                  <tr className="text-[var(--ink-tertiary)]">
                    <th className="text-left p-1">Hole</th>
                    <th className="text-center p-1">T1</th>
                    <th className="text-center p-1">T2</th>
                    <th className="text-center p-1">Diff</th>
                    <th className="text-center p-1">Flip</th>
                  </tr>
                </thead>
                <tbody>
                  {game.holeResults.map(result => (
                    <tr key={result.holeNumber} className="border-t border-[var(--surface-tertiary)]">
                      <td className="p-1">{result.holeNumber}</td>
                      <td className={cn(
                        'text-center p-1',
                        result.team1Flipped && 'text-red-500'
                      )}>
                        {result.team1Vegas}
                      </td>
                      <td className={cn(
                        'text-center p-1',
                        result.team2Flipped && 'text-red-500'
                      )}>
                        {result.team2Vegas}
                      </td>
                      <td className={cn(
                        'text-center p-1 font-medium',
                        result.pointDiff > 0 && 'text-[var(--masters)]',
                        result.pointDiff < 0 && 'text-red-500'
                      )}>
                        {result.pointDiff > 0 ? '+' : ''}{result.pointDiff}
                      </td>
                      <td className="text-center p-1">
                        {(result.team1Flipped || result.team2Flipped) && (
                          <RefreshCw size={12} className="inline text-red-500" />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Rules Info */}
      <div className="p-4 border-t border-[var(--surface-tertiary)] bg-[var(--surface-secondary)]/50">
        <div className="flex items-start gap-2">
          <Info size={14} className="text-[var(--ink-tertiary)] shrink-0 mt-0.5" />
          <p className="type-caption text-[var(--ink-tertiary)]">
            Combine team scores (low-high = 45). Score {game.flipThreshold}+ flips your number (45 → 54).
            Point difference × ${game.pointValue} settles each hole.
          </p>
        </div>
      </div>
    </div>
  );
}

export default VegasGameCard;
