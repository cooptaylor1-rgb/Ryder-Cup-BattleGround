/**
 * Player Profile Card Component
 *
 * Displays player information with stats and achievements.
 * Used in player lists, leaderboards, and social feeds.
 *
 * Features:
 * - Compact and expanded variants
 * - Win/loss/halved record
 * - Current streak indicator
 * - Achievement badges preview
 * - Team affiliation colors
 */

'use client';

import { cn } from '@/lib/utils';
import {
  Flame,
  TrendingDown,
  ChevronRight,
} from 'lucide-react';

// ============================================
// TYPES
// ============================================

export interface PlayerStats {
  wins: number;
  losses: number;
  halves: number;
  points: number;
  matchesPlayed: number;
  currentStreak: number;
  streakType: 'win' | 'loss' | 'none';
  holesWon: number;
  holesLost: number;
}

export interface PlayerBadge {
  id: string;
  name: string;
  icon: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary';
}

export interface PlayerProfile {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  handicapIndex?: number;
  team?: 'A' | 'B';
  stats?: PlayerStats;
  badges?: PlayerBadge[];
  isOnline?: boolean;
}

interface PlayerProfileCardProps {
  player: PlayerProfile;
  variant?: 'compact' | 'full' | 'mini';
  showStats?: boolean;
  showBadges?: boolean;
  onClick?: () => void;
  className?: string;
  rank?: number;
}

// ============================================
// MAIN COMPONENT
// ============================================

export function PlayerProfileCard({
  player,
  variant = 'compact',
  showStats = true,
  showBadges = true,
  onClick,
  className,
  rank,
}: PlayerProfileCardProps) {
  const fullName = `${player.firstName} ${player.lastName}`;
  const initials = `${player.firstName[0]}${player.lastName[0]}`;
  const teamColor = player.team === 'A' ? 'var(--team-usa)' : 'var(--team-europe)';

  if (variant === 'mini') {
    return (
      <MiniProfile
        player={player}
        onClick={onClick}
        className={className}
      />
    );
  }

  if (variant === 'full') {
    return (
      <FullProfile
        player={player}
        showStats={showStats}
        showBadges={showBadges}
        onClick={onClick}
        className={className}
      />
    );
  }

  // Compact variant (default)
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className={cn(
        'w-full p-4 rounded-xl text-left transition-all',
        onClick && 'cursor-pointer active:scale-[0.98]',
        className
      )}
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--rule)',
      }}
    >
      <div className="flex items-center gap-3">
        {/* Rank */}
        {rank !== undefined && (
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm"
            style={{
              background: rank <= 3 ? 'var(--masters)' : 'var(--surface-raised)',
              color: rank <= 3 ? 'white' : 'var(--ink-secondary)',
            }}
          >
            {rank}
          </div>
        )}

        {/* Avatar */}
        <div className="relative">
          {player.avatarUrl ? (
            <img
              src={player.avatarUrl}
              alt={fullName}
              className="w-12 h-12 rounded-full object-cover"
              style={{ border: `2px solid ${teamColor}` }}
            />
          ) : (
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold"
              style={{
                background: `${teamColor}20`,
                color: teamColor,
                border: `2px solid ${teamColor}`,
              }}
            >
              {initials}
            </div>
          )}
          {/* Online indicator */}
          {player.isOnline && (
            <span
              className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2"
              style={{
                background: 'var(--success)',
                borderColor: 'var(--surface)',
              }}
            />
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p
              className="font-semibold truncate"
              style={{ color: 'var(--ink)' }}
            >
              {fullName}
            </p>
            {player.stats?.currentStreak && player.stats.currentStreak >= 2 && (
              <StreakBadge
                streak={player.stats.currentStreak}
                type={player.stats.streakType}
              />
            )}
          </div>
          {showStats && player.stats && (
            <div className="flex items-center gap-3 mt-1">
              <RecordDisplay stats={player.stats} />
              {player.handicapIndex !== undefined && (
                <span
                  className="text-xs"
                  style={{ color: 'var(--ink-tertiary)' }}
                >
                  {player.handicapIndex.toFixed(1)} HCP
                </span>
              )}
            </div>
          )}
        </div>

        {/* Points */}
        {showStats && player.stats && (
          <div className="text-right">
            <p
              className="text-xl font-bold"
              style={{ color: 'var(--masters)' }}
            >
              {player.stats.points}
            </p>
            <p
              className="text-xs"
              style={{ color: 'var(--ink-tertiary)' }}
            >
              pts
            </p>
          </div>
        )}

        {onClick && (
          <ChevronRight
            className="w-5 h-5 flex-shrink-0"
            style={{ color: 'var(--ink-tertiary)' }}
          />
        )}
      </div>

      {/* Badges Preview */}
      {showBadges && player.badges && player.badges.length > 0 && (
        <div className="flex items-center gap-1 mt-3 pt-3" style={{ borderTop: '1px solid var(--rule)' }}>
          {player.badges.slice(0, 4).map((badge) => (
            <span
              key={badge.id}
              className="w-6 h-6 rounded-md flex items-center justify-center text-sm"
              style={{ background: 'var(--surface-raised)' }}
              title={badge.name}
            >
              {badge.icon}
            </span>
          ))}
          {player.badges.length > 4 && (
            <span
              className="text-xs font-medium px-2"
              style={{ color: 'var(--ink-tertiary)' }}
            >
              +{player.badges.length - 4}
            </span>
          )}
        </div>
      )}
    </button>
  );
}

// ============================================
// SUB-COMPONENTS
// ============================================

function MiniProfile({
  player,
  onClick,
  className,
}: {
  player: PlayerProfile;
  onClick?: () => void;
  className?: string;
}) {
  const initials = `${player.firstName[0]}${player.lastName[0]}`;
  const teamColor = player.team === 'A' ? 'var(--team-usa)' : 'var(--team-europe)';

  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className={cn(
        'flex flex-col items-center gap-1 p-2 rounded-lg transition-all',
        onClick && 'cursor-pointer active:scale-95',
        className
      )}
    >
      <div className="relative">
        {player.avatarUrl ? (
          <img
            src={player.avatarUrl}
            alt={player.firstName}
            className="w-10 h-10 rounded-full object-cover"
            style={{ border: `2px solid ${teamColor}` }}
          />
        ) : (
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold"
            style={{
              background: `${teamColor}20`,
              color: teamColor,
              border: `2px solid ${teamColor}`,
            }}
          >
            {initials}
          </div>
        )}
        {player.isOnline && (
          <span
            className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2"
            style={{
              background: 'var(--success)',
              borderColor: 'var(--surface)',
            }}
          />
        )}
      </div>
      <span
        className="text-xs font-medium truncate max-w-[60px]"
        style={{ color: 'var(--ink-secondary)' }}
      >
        {player.firstName}
      </span>
    </button>
  );
}

function FullProfile({
  player,
  showStats,
  showBadges,
  onClick,
  className,
}: {
  player: PlayerProfile;
  showStats?: boolean;
  showBadges?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  const fullName = `${player.firstName} ${player.lastName}`;
  const initials = `${player.firstName[0]}${player.lastName[0]}`;
  const teamColor = player.team === 'A' ? 'var(--team-usa)' : 'var(--team-europe)';

  return (
    <div
      className={cn('rounded-2xl overflow-hidden', className)}
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--rule)',
      }}
    >
      {/* Header with team color */}
      <div
        className="h-20 relative"
        style={{
          background: `linear-gradient(135deg, ${teamColor}40 0%, ${teamColor}20 100%)`,
        }}
      >
        <div className="absolute -bottom-8 left-4">
          {player.avatarUrl ? (
            <img
              src={player.avatarUrl}
              alt={fullName}
              className="w-16 h-16 rounded-2xl object-cover shadow-lg"
              style={{ border: `3px solid var(--surface)` }}
            />
          ) : (
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-bold shadow-lg"
              style={{
                background: 'var(--surface)',
                color: teamColor,
                border: `3px solid var(--surface)`,
              }}
            >
              {initials}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="pt-10 p-4">
        <div className="flex items-start justify-between">
          <div>
            <h3
              className="font-bold text-lg"
              style={{ color: 'var(--ink)' }}
            >
              {fullName}
            </h3>
            <p
              className="text-sm"
              style={{ color: 'var(--ink-secondary)' }}
            >
              Team {player.team === 'A' ? 'USA' : 'Europe'}
              {player.handicapIndex !== undefined && ` • ${player.handicapIndex.toFixed(1)} HCP`}
            </p>
          </div>
          {player.stats?.currentStreak && player.stats.currentStreak >= 2 && (
            <StreakBadge
              streak={player.stats.currentStreak}
              type={player.stats.streakType}
              size="lg"
            />
          )}
        </div>

        {/* Stats Grid */}
        {showStats && player.stats && (
          <div className="grid grid-cols-4 gap-3 mt-4">
            <StatBox label="Wins" value={player.stats.wins} color="var(--success)" />
            <StatBox label="Losses" value={player.stats.losses} color="var(--error)" />
            <StatBox label="Halves" value={player.stats.halves} color="var(--ink-tertiary)" />
            <StatBox label="Points" value={player.stats.points} color="var(--masters)" />
          </div>
        )}

        {/* Badges */}
        {showBadges && player.badges && player.badges.length > 0 && (
          <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--rule)' }}>
            <p
              className="text-xs font-medium uppercase tracking-wide mb-2"
              style={{ color: 'var(--ink-tertiary)' }}
            >
              Achievements
            </p>
            <div className="flex flex-wrap gap-2">
              {player.badges.map((badge) => (
                <div
                  key={badge.id}
                  className="px-2 py-1 rounded-lg flex items-center gap-1.5"
                  style={{
                    background: getRarityBackground(badge.rarity),
                  }}
                >
                  <span>{badge.icon}</span>
                  <span className="text-xs font-medium text-white">{badge.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {onClick && (
          <button
            onClick={onClick}
            className="w-full mt-4 py-3 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
            style={{
              background: 'var(--masters)',
              color: 'white',
            }}
          >
            View Full Profile
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

function RecordDisplay({ stats }: { stats: PlayerStats }) {
  return (
    <div className="flex items-center gap-1.5 text-xs">
      <span style={{ color: 'var(--success)' }}>{stats.wins}W</span>
      <span style={{ color: 'var(--ink-tertiary)' }}>-</span>
      <span style={{ color: 'var(--error)' }}>{stats.losses}L</span>
      <span style={{ color: 'var(--ink-tertiary)' }}>-</span>
      <span style={{ color: 'var(--ink-secondary)' }}>{stats.halves}H</span>
    </div>
  );
}

function StreakBadge({
  streak,
  type,
  size = 'sm',
}: {
  streak: number;
  type: 'win' | 'loss' | 'none';
  size?: 'sm' | 'lg';
}) {
  if (type === 'none' || streak < 2) return null;

  const isWin = type === 'win';
  const color = isWin ? 'var(--error)' : 'var(--team-europe)';
  const Icon = isWin ? Flame : TrendingDown;

  return (
    <div
      className={cn(
        'flex items-center gap-1 rounded-full',
        size === 'sm' ? 'px-1.5 py-0.5' : 'px-2 py-1'
      )}
      style={{
        background: `${color}20`,
        color,
      }}
    >
      <Icon className={size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} />
      <span className={cn('font-bold', size === 'sm' ? 'text-xs' : 'text-sm')}>
        {streak}
      </span>
    </div>
  );
}

function StatBox({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div
      className="p-3 rounded-xl text-center"
      style={{ background: 'var(--surface-raised)' }}
    >
      <p className="text-xl font-bold" style={{ color }}>
        {value}
      </p>
      <p
        className="text-xs mt-0.5"
        style={{ color: 'var(--ink-tertiary)' }}
      >
        {label}
      </p>
    </div>
  );
}

function getRarityBackground(rarity: string): string {
  switch (rarity) {
    case 'legendary':
      return 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)';
    case 'rare':
      return 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)';
    case 'uncommon':
      return 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)';
    default:
      return 'linear-gradient(135deg, #6B7280 0%, #4B5563 100%)';
  }
}

export default PlayerProfileCard;
