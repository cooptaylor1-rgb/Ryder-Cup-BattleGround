/**
 * Player Stats Card Component
 *
 * Production-ready display of comprehensive player statistics.
 */

'use client';

import { useMemo } from 'react';
import {
  Trophy,
  Target,
  TrendingUp,
  Users,
  Zap,
  Activity,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PlayerStatistics } from '@/lib/types/captain';
import type { Player } from '@/lib/types/models';

interface PlayerStatsCardProps {
  stats: PlayerStatistics;
  player: Player;
  allPlayers?: Player[];
  rank?: number;
  showDetails?: boolean;
  className?: string;
}

export function PlayerStatsCard({
  stats,
  player,
  allPlayers = [],
  rank,
  showDetails = false,
  className,
}: PlayerStatsCardProps) {
  const winRate = stats.matchesPlayed > 0
    ? Math.round(stats.winPercentage)
    : 0;

  const record = `${stats.wins}-${stats.losses}-${stats.halves}`;

  const getPartnerName = (playerId: string) => {
    const p = allPlayers.find(pl => pl.id === playerId);
    return p ? `${p.firstName} ${p.lastName}` : 'Unknown';
  };

  const statsItems = useMemo(() => [
    {
      label: 'Matches',
      value: stats.matchesPlayed,
      icon: Activity,
    },
    {
      label: 'Points',
      value: stats.points,
      icon: Trophy,
      highlight: true,
    },
    {
      label: 'Holes Won',
      value: stats.holesWon,
      icon: Target,
      color: 'green',
    },
    {
      label: 'Holes Lost',
      value: stats.holesLost,
      icon: Target,
      color: 'red',
    },
    {
      label: 'Comebacks',
      value: stats.comebacks,
      icon: TrendingUp,
      color: 'green',
    },
    {
      label: 'Biggest Win',
      value: stats.biggestWin > 0 ? `${stats.biggestWin}&${18 - stats.biggestWin}` : '-',
      icon: Zap,
    },
  ], [stats]);

  return (
    <div className={cn('card rounded-xl overflow-hidden', className)}>
      {/* Header */}
      <div className="p-4 bg-gradient-to-r from-[var(--surface-secondary)] to-transparent">
        <div className="flex items-start gap-4">
          {/* Avatar with rank */}
          <div className="relative">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[var(--accent)] to-[var(--masters)] flex items-center justify-center text-[var(--canvas)] text-xl font-bold">
              {player.firstName.charAt(0)}{player.lastName.charAt(0)}
            </div>
            {rank && rank <= 3 && (
              <div className={cn(
                'absolute -top-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold',
                rank === 1 && 'bg-[color:var(--warning)] text-[var(--ink)]',
                rank === 2 && 'bg-[var(--surface-tertiary)] text-[var(--ink-secondary)]',
                rank === 3 && 'bg-[color:var(--accent)]/25 text-[var(--accent)]'
              )}>
                {rank}
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="type-h4 text-[var(--ink-primary)] truncate">
              {player.firstName} {player.lastName}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <span className={cn(
                'px-2 py-0.5 rounded-full type-caption font-semibold',
                winRate >= 60
                  ? 'bg-[color:var(--masters)]/20 text-[var(--masters)]'
                  : winRate >= 40
                    ? 'bg-[color:var(--accent)]/20 text-[var(--accent)]'
                    : 'bg-[var(--surface-tertiary)] text-[var(--ink-tertiary)]'
              )}>
                {winRate}% Win Rate
              </span>
              <span className="type-caption text-[var(--ink-tertiary)]">
                ({record})
              </span>
            </div>
          </div>

          {/* Points display */}
          <div className="text-right">
            <div className="type-h2 text-[var(--masters)] font-bold">
              {stats.points}
            </div>
            <div className="type-caption text-[var(--ink-tertiary)]">
              points
            </div>
          </div>
        </div>
      </div>

      {/* Format Records */}
      <div className="px-4 py-3 border-t border-[var(--rule)] grid grid-cols-3 gap-4">
        <FormatRecord
          label="Singles"
          record={stats.singlesRecord}
        />
        <FormatRecord
          label="Foursomes"
          record={stats.foursomesRecord}
        />
        <FormatRecord
          label="Four-Ball"
          record={stats.fourballRecord}
        />
      </div>

      {/* Detailed Stats */}
      {showDetails && (
        <>
          <div className="px-4 py-3 border-t border-[var(--rule)] grid grid-cols-3 gap-3">
            {statsItems.map((item, index) => (
              <div key={index} className="text-center">
                <div className={cn(
                  'type-h4 font-semibold',
                  item.highlight && 'text-[var(--masters)]',
                  item.color === 'green' && 'text-[var(--success)]',
                  item.color === 'red' && 'text-[var(--error)]'
                )}>
                  {item.value}
                </div>
                <div className="type-caption text-[var(--ink-tertiary)]">
                  {item.label}
                </div>
              </div>
            ))}
          </div>

          {/* Best Partner / Worst Matchup */}
          {(stats.bestPartner || stats.worstMatchup) && (
            <div className="px-4 py-3 border-t border-[var(--rule)] grid grid-cols-2 gap-4">
              {stats.bestPartner && (
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-[color:var(--masters)]/10 text-[var(--masters)]">
                    <Users size={14} />
                  </div>
                  <div className="min-w-0">
                    <div className="type-caption text-[var(--ink-tertiary)]">Best Partner</div>
                    <div className="type-caption font-semibold text-[var(--ink-primary)] truncate">
                      {getPartnerName(stats.bestPartner.playerId)} ({stats.bestPartner.record})
                    </div>
                  </div>
                </div>
              )}
              {stats.worstMatchup && (
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-[color:var(--error)]/10 text-[var(--error)]">
                    <Target size={14} />
                  </div>
                  <div className="min-w-0">
                    <div className="type-caption text-[var(--ink-tertiary)]">Tough Matchup</div>
                    <div className="type-caption font-semibold text-[var(--ink-primary)] truncate">
                      {getPartnerName(stats.worstMatchup.playerId)} ({stats.worstMatchup.record})
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Closing Rate */}
          {stats.closingRate > 0 && (
            <div className="px-4 py-3 border-t border-[var(--rule)]">
              <div className="flex items-center justify-between">
                <span className="type-caption text-[var(--ink-tertiary)]">Closing Rate (when 2+ up)</span>
                <span className={cn(
                  'type-caption font-semibold',
                  stats.closingRate >= 70 ? 'text-[var(--masters)]' : 'text-[var(--ink-primary)]'
                )}>
                  {Math.round(stats.closingRate)}%
                </span>
              </div>
              <div className="mt-1 h-1.5 bg-[color:var(--ink-tertiary)]/15 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[var(--masters)] rounded-full transition-all"
                  style={{ width: `${stats.closingRate}%` }}
                />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

interface FormatRecordProps {
  label: string;
  record: { w: number; l: number; h: number };
}

function FormatRecord({ label, record }: FormatRecordProps) {
  const total = record.w + record.l + record.h;
  const winRate = total > 0 ? Math.round((record.w / total) * 100) : 0;

  return (
    <div className="text-center">
      <div className="type-caption text-[var(--ink-tertiary)] mb-1">{label}</div>
      <div className={cn(
        'type-body font-semibold',
        winRate > 50 && 'text-[var(--masters)]',
        winRate < 50 && total > 0 && 'text-[var(--error)]'
      )}>
        {record.w}-{record.l}-{record.h}
      </div>
    </div>
  );
}

export default PlayerStatsCard;
