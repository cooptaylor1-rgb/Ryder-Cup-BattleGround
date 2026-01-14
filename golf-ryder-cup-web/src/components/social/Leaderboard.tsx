/**
 * Leaderboard Component
 *
 * Displays player rankings with various sorting options.
 * Shows individual achievements, records, and head-to-head stats.
 *
 * Features:
 * - Multiple sort criteria (points, wins, win %)
 * - Team filtering
 * - Animated rank changes
 * - Head-to-head comparison
 */

'use client';

import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import {
  Trophy,
  Medal,
  TrendingUp,
  TrendingDown,
  Minus,
  Crown,
  Target,
  Percent,
  Users,
  ChevronDown,
} from 'lucide-react';
import { PlayerProfileCard, type PlayerProfile, type PlayerStats } from './PlayerProfileCard';

// ============================================
// TYPES
// ============================================

export type SortCriteria = 'points' | 'wins' | 'win_pct' | 'holes_won' | 'streak';

export interface LeaderboardEntry extends PlayerProfile {
  previousRank?: number;
  stats: PlayerStats;
}

interface LeaderboardProps {
  entries: LeaderboardEntry[];
  sortBy?: SortCriteria;
  onSortChange?: (criteria: SortCriteria) => void;
  teamFilter?: 'all' | 'A' | 'B';
  onTeamFilterChange?: (team: 'all' | 'A' | 'B') => void;
  onPlayerClick?: (playerId: string) => void;
  showPodium?: boolean;
  className?: string;
}

// ============================================
// MAIN COMPONENT
// ============================================

export function Leaderboard({
  entries,
  sortBy = 'points',
  onSortChange,
  teamFilter = 'all',
  onTeamFilterChange,
  onPlayerClick,
  showPodium = true,
  className,
}: LeaderboardProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Sort and filter entries
  const sortedEntries = useMemo(() => {
    let filtered = [...entries];

    // Apply team filter
    if (teamFilter !== 'all') {
      filtered = filtered.filter((e) => e.team === teamFilter);
    }

    // Apply sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'points':
          return b.stats.points - a.stats.points;
        case 'wins':
          return b.stats.wins - a.stats.wins;
        case 'win_pct':
          const aPct = a.stats.matchesPlayed > 0 ? a.stats.wins / a.stats.matchesPlayed : 0;
          const bPct = b.stats.matchesPlayed > 0 ? b.stats.wins / b.stats.matchesPlayed : 0;
          return bPct - aPct;
        case 'holes_won':
          return b.stats.holesWon - a.stats.holesWon;
        case 'streak':
          return (b.stats.streakType === 'win' ? b.stats.currentStreak : 0) -
                 (a.stats.streakType === 'win' ? a.stats.currentStreak : 0);
        default:
          return 0;
      }
    });

    return filtered;
  }, [entries, sortBy, teamFilter]);

  const sortOptions: { value: SortCriteria; label: string; icon: React.ReactNode }[] = [
    { value: 'points', label: 'Points', icon: <Trophy className="w-4 h-4" /> },
    { value: 'wins', label: 'Wins', icon: <Medal className="w-4 h-4" /> },
    { value: 'win_pct', label: 'Win %', icon: <Percent className="w-4 h-4" /> },
    { value: 'holes_won', label: 'Holes Won', icon: <Target className="w-4 h-4" /> },
    { value: 'streak', label: 'Streak', icon: <TrendingUp className="w-4 h-4" /> },
  ];

  const currentSort = sortOptions.find((o) => o.value === sortBy);

  return (
    <div className={cn('space-y-4', className)}>
      {/* Controls */}
      <div className="flex items-center gap-3">
        {/* Team Filter */}
        {onTeamFilterChange && (
          <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid var(--rule)' }}>
            {(['all', 'A', 'B'] as const).map((team) => (
              <button
                key={team}
                onClick={() => onTeamFilterChange(team)}
                className={cn(
                  'px-3 py-1.5 text-sm font-medium transition-colors',
                )}
                style={{
                  background: teamFilter === team ? 'var(--masters)' : 'var(--surface)',
                  color: teamFilter === team ? 'white' : 'var(--ink-secondary)',
                }}
              >
                {team === 'all' ? 'All' : team === 'A' ? 'USA' : 'EUR'}
              </button>
            ))}
          </div>
        )}

        {/* Sort Dropdown */}
        {onSortChange && (
          <div className="relative ml-auto">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
              style={{
                background: 'var(--surface)',
                color: 'var(--ink-secondary)',
                border: '1px solid var(--rule)',
              }}
            >
              {currentSort?.icon}
              {currentSort?.label}
              <ChevronDown className={cn('w-4 h-4 transition-transform', isDropdownOpen && 'rotate-180')} />
            </button>

            {isDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setIsDropdownOpen(false)}
                />
                <div
                  className="absolute right-0 mt-2 py-1 rounded-lg shadow-lg z-20 min-w-[140px]"
                  style={{
                    background: 'var(--surface)',
                    border: '1px solid var(--rule)',
                  }}
                >
                  {sortOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => {
                        onSortChange(option.value);
                        setIsDropdownOpen(false);
                      }}
                      className={cn(
                        'w-full px-3 py-2 flex items-center gap-2 text-sm transition-colors',
                      )}
                      style={{
                        background: sortBy === option.value ? 'var(--surface-raised)' : 'transparent',
                        color: sortBy === option.value ? 'var(--masters)' : 'var(--ink-secondary)',
                      }}
                    >
                      {option.icon}
                      {option.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Podium (Top 3) */}
      {showPodium && sortedEntries.length >= 3 && (
        <Podium
          first={sortedEntries[0]}
          second={sortedEntries[1]}
          third={sortedEntries[2]}
          onPlayerClick={onPlayerClick}
        />
      )}

      {/* List */}
      <div className="space-y-2">
        {sortedEntries.slice(showPodium ? 3 : 0).map((entry, index) => (
          <LeaderboardRow
            key={entry.id}
            entry={entry}
            rank={showPodium ? index + 4 : index + 1}
            sortBy={sortBy}
            onClick={() => onPlayerClick?.(entry.id)}
          />
        ))}
      </div>

      {/* Empty State */}
      {sortedEntries.length === 0 && (
        <div className="py-12 text-center">
          <Users
            className="w-12 h-12 mx-auto mb-4"
            style={{ color: 'var(--ink-tertiary)' }}
          />
          <p style={{ color: 'var(--ink-secondary)' }}>
            No players to display
          </p>
        </div>
      )}
    </div>
  );
}

// ============================================
// PODIUM COMPONENT
// ============================================

interface PodiumProps {
  first: LeaderboardEntry;
  second: LeaderboardEntry;
  third: LeaderboardEntry;
  onPlayerClick?: (playerId: string) => void;
}

function Podium({ first, second, third, onPlayerClick }: PodiumProps) {
  return (
    <div className="flex items-end justify-center gap-2 py-6">
      {/* Second Place */}
      <PodiumSpot
        entry={second}
        rank={2}
        height="h-24"
        onClick={() => onPlayerClick?.(second.id)}
      />

      {/* First Place */}
      <PodiumSpot
        entry={first}
        rank={1}
        height="h-32"
        isWinner
        onClick={() => onPlayerClick?.(first.id)}
      />

      {/* Third Place */}
      <PodiumSpot
        entry={third}
        rank={3}
        height="h-20"
        onClick={() => onPlayerClick?.(third.id)}
      />
    </div>
  );
}

interface PodiumSpotProps {
  entry: LeaderboardEntry;
  rank: number;
  height: string;
  isWinner?: boolean;
  onClick?: () => void;
}

function PodiumSpot({ entry, rank, height, isWinner, onClick }: PodiumSpotProps) {
  const initials = `${entry.firstName?.[0] || '?'}${entry.lastName?.[0] || '?'}`;
  const teamColor = entry.team === 'A' ? 'var(--team-usa)' : 'var(--team-europe)';

  const rankColors: Record<number, string> = {
    1: 'var(--warning)',
    2: '#C0C0C0',
    3: '#CD7F32',
  };

  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-2"
    >
      {/* Crown for winner */}
      {isWinner && (
        <Crown
          className="w-6 h-6 animate-bounce"
          style={{ color: 'var(--warning)' }}
        />
      )}

      {/* Avatar */}
      <div className="relative">
        {entry.avatarUrl ? (
          <img
            src={entry.avatarUrl}
            alt={entry.firstName}
            className={cn(
              'rounded-full object-cover',
              isWinner ? 'w-16 h-16' : 'w-12 h-12'
            )}
            style={{
              border: `3px solid ${teamColor}`,
              boxShadow: isWinner ? '0 0 20px rgba(245, 158, 11, 0.5)' : undefined,
            }}
          />
        ) : (
          <div
            className={cn(
              'rounded-full flex items-center justify-center font-bold',
              isWinner ? 'w-16 h-16 text-lg' : 'w-12 h-12 text-sm'
            )}
            style={{
              background: `${teamColor}20`,
              color: teamColor,
              border: `3px solid ${teamColor}`,
            }}
          >
            {initials}
          </div>
        )}

        {/* Rank Badge */}
        <div
          className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
          style={{
            background: rankColors[rank],
            color: rank === 1 ? '#1A1814' : 'white',
            border: '2px solid var(--canvas)',
          }}
        >
          {rank}
        </div>
      </div>

      {/* Name */}
      <div className="text-center">
        <p
          className={cn('font-semibold', isWinner ? 'text-sm' : 'text-xs')}
          style={{ color: 'var(--ink)' }}
        >
          {entry.firstName}
        </p>
        <p
          className="text-lg font-bold"
          style={{ color: 'var(--masters)' }}
        >
          {entry.stats.points}
        </p>
      </div>

      {/* Pedestal */}
      <div
        className={cn('w-20 rounded-t-lg transition-all', height)}
        style={{
          background: `linear-gradient(180deg, ${rankColors[rank]}40 0%, ${rankColors[rank]}20 100%)`,
          border: `1px solid ${rankColors[rank]}40`,
          borderBottom: 'none',
        }}
      />
    </button>
  );
}

// ============================================
// LEADERBOARD ROW
// ============================================

interface LeaderboardRowProps {
  entry: LeaderboardEntry;
  rank: number;
  sortBy: SortCriteria;
  onClick?: () => void;
}

function LeaderboardRow({ entry, rank, sortBy, onClick }: LeaderboardRowProps) {
  const fullName = `${entry.firstName || ''} ${entry.lastName || ''}`.trim() || 'Unknown';
  const initials = `${entry.firstName?.[0] || '?'}${entry.lastName?.[0] || '?'}`;
  const teamColor = entry.team === 'A' ? 'var(--team-usa)' : 'var(--team-europe)';

  // Calculate rank change
  const rankChange = entry.previousRank !== undefined ? entry.previousRank - rank : 0;

  // Get display value based on sort
  const displayValue = (() => {
    switch (sortBy) {
      case 'points':
        return { value: entry.stats.points, label: 'pts' };
      case 'wins':
        return { value: entry.stats.wins, label: 'wins' };
      case 'win_pct':
        const pct = entry.stats.matchesPlayed > 0
          ? Math.round((entry.stats.wins / entry.stats.matchesPlayed) * 100)
          : 0;
        return { value: `${pct}%`, label: '' };
      case 'holes_won':
        return { value: entry.stats.holesWon, label: 'holes' };
      case 'streak':
        return { value: entry.stats.currentStreak, label: 'streak' };
      default:
        return { value: entry.stats.points, label: 'pts' };
    }
  })();

  return (
    <button
      onClick={onClick}
      className="w-full p-3 rounded-xl flex items-center gap-3 transition-all active:scale-[0.98]"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--rule)',
      }}
    >
      {/* Rank */}
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm"
        style={{
          background: 'var(--surface-raised)',
          color: 'var(--ink-secondary)',
        }}
      >
        {rank}
      </div>

      {/* Rank Change */}
      {rankChange !== 0 && (
        <div className="w-4">
          {rankChange > 0 ? (
            <TrendingUp className="w-4 h-4" style={{ color: 'var(--success)' }} />
          ) : (
            <TrendingDown className="w-4 h-4" style={{ color: 'var(--error)' }} />
          )}
        </div>
      )}

      {/* Avatar */}
      {entry.avatarUrl ? (
        <img
          src={entry.avatarUrl}
          alt={fullName}
          className="w-10 h-10 rounded-full object-cover"
          style={{ border: `2px solid ${teamColor}` }}
        />
      ) : (
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold"
          style={{
            background: `${teamColor}20`,
            color: teamColor,
            border: `2px solid ${teamColor}`,
          }}
        >
          {initials}
        </div>
      )}

      {/* Info */}
      <div className="flex-1 min-w-0 text-left">
        <p
          className="font-semibold text-sm truncate"
          style={{ color: 'var(--ink)' }}
        >
          {fullName}
        </p>
        <p
          className="text-xs"
          style={{ color: 'var(--ink-secondary)' }}
        >
          {entry.stats.wins}W - {entry.stats.losses}L - {entry.stats.halves}H
        </p>
      </div>

      {/* Value */}
      <div className="text-right">
        <p
          className="text-lg font-bold"
          style={{ color: 'var(--masters)' }}
        >
          {displayValue.value}
        </p>
        {displayValue.label && (
          <p
            className="text-xs"
            style={{ color: 'var(--ink-tertiary)' }}
          >
            {displayValue.label}
          </p>
        )}
      </div>
    </button>
  );
}

export default Leaderboard;
