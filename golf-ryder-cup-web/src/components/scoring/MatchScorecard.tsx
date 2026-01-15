'use client';

import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronUp, Eye, EyeOff, CircleDot } from 'lucide-react';
import { GrossNetScoreDisplay, ScoreLegend } from './GrossNetScoreDisplay';
import { allocateStrokes } from '@/lib/services/handicapCalculator';
import type { ScoringMode } from '@/lib/types/scoringFormats';

/**
 * MATCH SCORECARD
 *
 * Full scorecard display showing gross and net scores for a match.
 * Designed for match play with handicap stroke visualization.
 *
 * Features:
 * - Hole-by-hole scores with stroke indicators
 * - Gross and net score columns
 * - Team color coding
 * - Par/handicap reference row
 * - Expandable player details
 */

export interface PlayerScore {
  playerId: string;
  playerName: string;
  team: 'A' | 'B';
  courseHandicap: number;
  scores: (number | null)[]; // 18-element array, null = not played
}

export interface MatchScorecardProps {
  matchId: string;
  teamAName: string;
  teamBName: string;
  teamAPlayers: PlayerScore[];
  teamBPlayers: PlayerScore[];
  holePars: number[];
  holeHandicaps: number[];
  holeResults?: { holeNumber: number; winner: 'teamA' | 'teamB' | 'halved' }[];
  currentHole?: number;
  matchScore?: number; // Positive = Team A leading
  scoringMode?: ScoringMode;
  showNetScores?: boolean;
  compact?: boolean;
  className?: string;
}

export function MatchScorecard({
  matchId,
  teamAName,
  teamBName,
  teamAPlayers,
  teamBPlayers,
  holePars,
  holeHandicaps,
  holeResults = [],
  currentHole,
  matchScore = 0,
  scoringMode = 'net',
  showNetScores = true,
  compact = false,
  className,
}: MatchScorecardProps) {
  const [expandedPlayer, setExpandedPlayer] = useState<string | null>(null);
  const [showNet, setShowNet] = useState(showNetScores);

  // Calculate totals
  const totalPar = holePars.reduce((sum, p) => sum + p, 0);
  const frontPar = holePars.slice(0, 9).reduce((sum, p) => sum + p, 0);
  const backPar = holePars.slice(9, 18).reduce((sum, p) => sum + p, 0);

  // Calculate stroke allocations for all players
  const playerStrokeAllocations = useMemo(() => {
    const allocations: Record<string, number[]> = {};
    [...teamAPlayers, ...teamBPlayers].forEach(player => {
      allocations[player.playerId] = allocateStrokes(player.courseHandicap, holeHandicaps);
    });
    return allocations;
  }, [teamAPlayers, teamBPlayers, holeHandicaps]);

  // Calculate player totals
  const calculatePlayerTotals = (player: PlayerScore) => {
    const strokes = playerStrokeAllocations[player.playerId] || Array(18).fill(0);

    let frontGross = 0, frontNet = 0;
    let backGross = 0, backNet = 0;

    for (let i = 0; i < 18; i++) {
      const score = player.scores[i];
      if (score !== null) {
        const net = score - strokes[i];
        if (i < 9) {
          frontGross += score;
          frontNet += net;
        } else {
          backGross += score;
          backNet += net;
        }
      }
    }

    return {
      frontGross,
      frontNet,
      backGross,
      backNet,
      totalGross: frontGross + backGross,
      totalNet: frontNet + backNet,
    };
  };

  // Render player row
  const renderPlayerRow = (player: PlayerScore, isExpanded: boolean) => {
    const strokes = playerStrokeAllocations[player.playerId] || Array(18).fill(0);
    const totals = calculatePlayerTotals(player);
    const teamColor = player.team === 'A' ? 'var(--team-usa)' : 'var(--team-europe)';

    return (
      <div
        key={player.playerId}
        className={cn('border-b', isExpanded && 'bg-canvas-sunken')}
        style={{ borderColor: 'var(--rule)' }}
      >
        {/* Player Header */}
        <button
          onClick={() => setExpandedPlayer(isExpanded ? null : player.playerId)}
          className="w-full px-3 py-2 flex items-center justify-between hover:bg-canvas-sunken/50"
        >
          <div className="flex items-center gap-2">
            <span
              className="w-2 h-2 rounded-full"
              style={{ background: teamColor }}
            />
            <span className="font-medium" style={{ color: 'var(--ink)' }}>
              {player.playerName}
            </span>
            <span className="text-xs" style={{ color: 'var(--ink-tertiary)' }}>
              ({player.courseHandicap > 0 ? '+' : ''}{player.courseHandicap})
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <span className="font-bold" style={{ color: 'var(--ink)' }}>
                {showNet
                  ? `${totals.totalGross} / ${totals.totalNet}`
                  : totals.totalGross}
              </span>
              <span
                className="text-xs ml-2"
                style={{
                  color: (showNet ? totals.totalNet : totals.totalGross) - totalPar < 0
                    ? 'var(--birdie-text, #dc2626)'
                    : (showNet ? totals.totalNet : totals.totalGross) - totalPar > 0
                      ? 'var(--bogey-text, #3b82f6)'
                      : 'var(--ink)',
                }}
              >
                {(() => {
                  const diff = (showNet ? totals.totalNet : totals.totalGross) - totalPar;
                  if (diff === 0) return 'E';
                  return diff > 0 ? `+${diff}` : diff;
                })()}
              </span>
            </div>
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        </button>

        {/* Expanded Hole-by-Hole Scores */}
        {isExpanded && (
          <div className="px-3 pb-3">
            {/* Front 9 */}
            <div className="mb-4">
              <p className="text-xs font-medium uppercase tracking-wider mb-2" style={{ color: 'var(--ink-tertiary)' }}>
                Front 9 (Par {frontPar})
              </p>
              <div className="grid grid-cols-10 gap-1">
                {/* Hole numbers */}
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(hole => (
                  <div
                    key={`hole-${hole}`}
                    className="text-center text-[10px]"
                    style={{ color: 'var(--ink-tertiary)' }}
                  >
                    {hole}
                  </div>
                ))}
                <div className="text-center text-[10px] font-bold" style={{ color: 'var(--ink-secondary)' }}>
                  OUT
                </div>

                {/* Scores */}
                {[0, 1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                  <GrossNetScoreDisplay
                    key={`score-${i}`}
                    grossScore={player.scores[i]}
                    netScore={player.scores[i] !== null ? player.scores[i]! - strokes[i] : null}
                    par={holePars[i]}
                    strokesReceived={strokes[i]}
                    size="sm"
                    mode={showNet ? 'detailed' : 'compact'}
                    highlightNet={scoringMode === 'net'}
                  />
                ))}
                {/* Front Total */}
                <div
                  className="w-10 h-10 rounded flex flex-col items-center justify-center text-xs font-bold"
                  style={{ background: 'var(--surface)', border: '1px solid var(--rule-strong)' }}
                >
                  {showNet ? (
                    <>
                      <span>{totals.frontGross}</span>
                      <span className="text-[9px]" style={{ color: 'var(--ink-tertiary)' }}>
                        ({totals.frontNet})
                      </span>
                    </>
                  ) : (
                    totals.frontGross
                  )}
                </div>
              </div>
            </div>

            {/* Back 9 */}
            <div>
              <p className="text-xs font-medium uppercase tracking-wider mb-2" style={{ color: 'var(--ink-tertiary)' }}>
                Back 9 (Par {backPar})
              </p>
              <div className="grid grid-cols-10 gap-1">
                {/* Hole numbers */}
                {[10, 11, 12, 13, 14, 15, 16, 17, 18].map(hole => (
                  <div
                    key={`hole-${hole}`}
                    className="text-center text-[10px]"
                    style={{ color: 'var(--ink-tertiary)' }}
                  >
                    {hole}
                  </div>
                ))}
                <div className="text-center text-[10px] font-bold" style={{ color: 'var(--ink-secondary)' }}>
                  IN
                </div>

                {/* Scores */}
                {[9, 10, 11, 12, 13, 14, 15, 16, 17].map(i => (
                  <GrossNetScoreDisplay
                    key={`score-${i}`}
                    grossScore={player.scores[i]}
                    netScore={player.scores[i] !== null ? player.scores[i]! - strokes[i] : null}
                    par={holePars[i]}
                    strokesReceived={strokes[i]}
                    size="sm"
                    mode={showNet ? 'detailed' : 'compact'}
                    highlightNet={scoringMode === 'net'}
                  />
                ))}
                {/* Back Total */}
                <div
                  className="w-10 h-10 rounded flex flex-col items-center justify-center text-xs font-bold"
                  style={{ background: 'var(--surface)', border: '1px solid var(--rule-strong)' }}
                >
                  {showNet ? (
                    <>
                      <span>{totals.backGross}</span>
                      <span className="text-[9px]" style={{ color: 'var(--ink-tertiary)' }}>
                        ({totals.backNet})
                      </span>
                    </>
                  ) : (
                    totals.backGross
                  )}
                </div>
              </div>
            </div>

            {/* Total Row */}
            <div
              className="mt-3 p-2 rounded-lg flex items-center justify-between"
              style={{ background: teamColor + '10', border: `1px solid ${teamColor}40` }}
            >
              <span className="font-medium" style={{ color: teamColor }}>
                Total
              </span>
              <div className="flex items-center gap-4">
                <div>
                  <span className="text-xs" style={{ color: 'var(--ink-tertiary)' }}>Gross:</span>
                  <span className="font-bold ml-1" style={{ color: 'var(--ink)' }}>
                    {totals.totalGross}
                  </span>
                </div>
                {showNet && (
                  <div>
                    <span className="text-xs" style={{ color: 'var(--ink-tertiary)' }}>Net:</span>
                    <span className="font-bold ml-1" style={{ color: teamColor }}>
                      {totals.totalNet}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      className={cn('rounded-xl overflow-hidden', className)}
      style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}
    >
      {/* Header */}
      <div
        className="px-4 py-3 flex items-center justify-between"
        style={{ borderBottom: '1px solid var(--rule)' }}
      >
        <div className="flex items-center gap-3">
          <h3 className="font-bold" style={{ color: 'var(--ink)' }}>
            Scorecard
          </h3>
          {matchScore !== 0 && (
            <span
              className="px-2 py-0.5 rounded text-xs font-bold"
              style={{
                background: matchScore > 0 ? 'var(--team-usa)' : 'var(--team-europe)',
                color: 'white',
              }}
            >
              {matchScore > 0 ? teamAName : teamBName} {Math.abs(matchScore)} UP
            </span>
          )}
        </div>

        {/* Toggle Net Scores */}
        <button
          onClick={() => setShowNet(!showNet)}
          className="flex items-center gap-1 text-xs px-2 py-1 rounded"
          style={{
            background: showNet ? 'rgba(0, 103, 71, 0.1)' : 'var(--canvas-sunken)',
            color: showNet ? 'var(--masters)' : 'var(--ink-secondary)',
          }}
        >
          {showNet ? <Eye size={14} /> : <EyeOff size={14} />}
          {showNet ? 'Net On' : 'Net Off'}
        </button>
      </div>

      {/* Course Info */}
      <div
        className="px-4 py-2 flex items-center justify-between text-xs"
        style={{ background: 'var(--canvas-sunken)' }}
      >
        <span style={{ color: 'var(--ink-tertiary)' }}>
          Par {totalPar} • Front {frontPar} • Back {backPar}
        </span>
        {currentHole && (
          <span style={{ color: 'var(--masters)' }}>
            Thru {currentHole}
          </span>
        )}
      </div>

      {/* Team A Players */}
      <div>
        <div
          className="px-4 py-2 text-xs font-medium uppercase tracking-wider"
          style={{ background: 'rgba(179, 39, 57, 0.1)', color: 'var(--team-usa)' }}
        >
          {teamAName}
        </div>
        {teamAPlayers.map(player =>
          renderPlayerRow(player, expandedPlayer === player.playerId)
        )}
      </div>

      {/* Team B Players */}
      <div>
        <div
          className="px-4 py-2 text-xs font-medium uppercase tracking-wider"
          style={{ background: 'rgba(0, 39, 118, 0.1)', color: 'var(--team-europe)' }}
        >
          {teamBName}
        </div>
        {teamBPlayers.map(player =>
          renderPlayerRow(player, expandedPlayer === player.playerId)
        )}
      </div>

      {/* Match Result by Hole */}
      {holeResults.length > 0 && (
        <div className="px-4 py-3" style={{ borderTop: '1px solid var(--rule)' }}>
          <p className="text-xs font-medium uppercase tracking-wider mb-2" style={{ color: 'var(--ink-tertiary)' }}>
            Hole Results
          </p>
          <div className="flex gap-1 flex-wrap">
            {Array.from({ length: 18 }, (_, i) => i + 1).map(hole => {
              const result = holeResults.find(r => r.holeNumber === hole);
              let bg = 'var(--canvas-sunken)';
              let color = 'var(--ink-tertiary)';

              if (result) {
                if (result.winner === 'teamA') {
                  bg = 'var(--team-usa)';
                  color = 'white';
                } else if (result.winner === 'teamB') {
                  bg = 'var(--team-europe)';
                  color = 'white';
                } else {
                  bg = 'var(--canvas-raised)';
                  color = 'var(--ink-secondary)';
                }
              }

              return (
                <div
                  key={hole}
                  className="w-6 h-6 rounded flex items-center justify-center text-[10px] font-medium"
                  style={{ background: bg, color }}
                >
                  {hole}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="px-4 py-3" style={{ borderTop: '1px solid var(--rule)' }}>
        <ScoreLegend />
      </div>
    </div>
  );
}

export default MatchScorecard;
