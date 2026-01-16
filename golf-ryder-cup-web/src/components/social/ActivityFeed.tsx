/**
 * Activity Feed Component
 *
 * A unified timeline showing all trip activities including:
 * - Match completions and results
 * - Photo uploads
 * - Comments and reactions
 * - Achievements earned
 * - Milestones and streaks
 *
 * Features:
 * - Real-time updates
 * - Infinite scroll
 * - Activity filtering
 * - Relative timestamps
 */

'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import {
  Trophy,
  Camera,
  MessageCircle,
  Award,
  Flame,
  Target,
  Flag,
  Users,
  Clock,
  ChevronRight,
  Filter,
} from 'lucide-react';

// ============================================
// TYPES
// ============================================

export type ActivityType =
  | 'match_completed'
  | 'match_started'
  | 'photo_uploaded'
  | 'comment_posted'
  | 'achievement_earned'
  | 'streak_milestone'
  | 'session_started'
  | 'session_completed'
  | 'player_joined'
  | 'score_update';

export interface ActivityItem {
  id: string;
  type: ActivityType;
  timestamp: string;
  actor: {
    id: string;
    name: string;
    avatarUrl?: string;
  };
  data: {
    matchId?: string;
    sessionId?: string;
    photoUrl?: string;
    comment?: string;
    achievement?: {
      name: string;
      icon: string;
      rarity: 'common' | 'uncommon' | 'rare' | 'legendary';
    };
    result?: {
      teamA: string;
      teamB: string;
      winner?: 'A' | 'B' | 'tie';
      margin?: string;
    };
    streak?: number;
  };
}

interface ActivityFeedProps {
  activities: ActivityItem[];
  isLoading?: boolean;
  onLoadMore?: () => void;
  hasMore?: boolean;
  filter?: ActivityType | 'all';
  onFilterChange?: (filter: ActivityType | 'all') => void;
  className?: string;
}

// ============================================
// ACTIVITY FEED COMPONENT
// ============================================

export function ActivityFeed({
  activities,
  isLoading = false,
  onLoadMore,
  hasMore = false,
  filter = 'all',
  onFilterChange,
  className,
}: ActivityFeedProps) {
  const [showFilters, setShowFilters] = useState(false);

  const filteredActivities = useMemo(() => {
    if (filter === 'all') return activities;
    return activities.filter((a) => a.type === filter);
  }, [activities, filter]);

  const filters: { value: ActivityType | 'all'; label: string; icon: React.ReactNode }[] = [
    { value: 'all', label: 'All', icon: <Clock className="w-4 h-4" /> },
    { value: 'match_completed', label: 'Matches', icon: <Flag className="w-4 h-4" /> },
    { value: 'photo_uploaded', label: 'Photos', icon: <Camera className="w-4 h-4" /> },
    { value: 'comment_posted', label: 'Comments', icon: <MessageCircle className="w-4 h-4" /> },
    { value: 'achievement_earned', label: 'Awards', icon: <Award className="w-4 h-4" /> },
  ];

  return (
    <div className={cn('space-y-4', className)}>
      {/* Filter Bar */}
      {onFilterChange && (
        <div className="flex items-center gap-2 overflow-x-auto pb-2 -mx-4 px-4 no-scrollbar">
          {filters.map((f) => (
            <button
              key={f.value}
              onClick={() => onFilterChange(f.value)}
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
              )}
              style={{
                background: filter === f.value ? 'var(--masters)' : 'var(--surface)',
                color: filter === f.value ? 'white' : 'var(--ink-secondary)',
                border: filter === f.value ? 'none' : '1px solid var(--rule)',
              }}
            >
              {f.icon}
              {f.label}
            </button>
          ))}
        </div>
      )}

      {/* Activity List */}
      <div className="space-y-3">
        {filteredActivities.map((activity, index) => (
          <ActivityCard
            key={activity.id}
            activity={activity}
            isFirst={index === 0}
          />
        ))}

        {/* Loading */}
        {isLoading && (
          <div className="py-8 text-center">
            <div
              className="w-8 h-8 mx-auto border-2 rounded-full animate-spin"
              style={{
                borderColor: 'var(--rule)',
                borderTopColor: 'var(--masters)',
              }}
            />
          </div>
        )}

        {/* Empty State */}
        {!isLoading && filteredActivities.length === 0 && (
          <div className="py-12 text-center">
            <Clock
              className="w-12 h-12 mx-auto mb-4"
              style={{ color: 'var(--ink-tertiary)' }}
            />
            <p style={{ color: 'var(--ink-secondary)' }}>
              No activity yet. Start playing to see updates here!
            </p>
          </div>
        )}

        {/* Load More */}
        {hasMore && !isLoading && (
          <button
            onClick={onLoadMore}
            className="w-full py-3 rounded-xl text-sm font-medium transition-colors"
            style={{
              background: 'var(--surface)',
              color: 'var(--masters)',
              border: '1px solid var(--rule)',
            }}
          >
            Load more
          </button>
        )}
      </div>
    </div>
  );
}

// ============================================
// ACTIVITY CARD COMPONENT
// ============================================

interface ActivityCardProps {
  activity: ActivityItem;
  isFirst?: boolean;
}

function ActivityCard({ activity, isFirst }: ActivityCardProps) {
  const { icon, color, title, subtitle, action } = getActivityDisplay(activity);

  return (
    <div
      className={cn(
        'p-4 rounded-xl transition-all',
        isFirst && 'ring-2 ring-masters ring-offset-2 ring-offset-canvas',
      )}
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--rule)',
      }}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div
          className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
          style={{
            background: `${color}15`,
            color,
          }}
        >
          {icon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p
                className="font-medium text-sm"
                style={{ color: 'var(--ink)' }}
              >
                {title}
              </p>
              {subtitle && (
                <p
                  className="text-xs mt-0.5"
                  style={{ color: 'var(--ink-secondary)' }}
                >
                  {subtitle}
                </p>
              )}
            </div>
            <span
              className="text-xs whitespace-nowrap"
              style={{ color: 'var(--ink-tertiary)' }}
            >
              {formatRelativeTime(activity.timestamp)}
            </span>
          </div>

          {/* Additional Content */}
          {activity.type === 'photo_uploaded' && activity.data.photoUrl && (
            <div
              className="mt-3 rounded-lg overflow-hidden"
              style={{ maxHeight: 200 }}
            >
              <img
                src={activity.data.photoUrl}
                alt="Uploaded photo"
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {activity.type === 'comment_posted' && activity.data.comment && (
            <p
              className="mt-2 text-sm p-3 rounded-lg"
              style={{
                background: 'var(--surface-raised)',
                color: 'var(--ink-secondary)',
              }}
            >
              &quot;{activity.data.comment}&quot;
            </p>
          )}

          {activity.type === 'match_completed' && activity.data.result && (
            <div
              className="mt-3 p-3 rounded-lg flex items-center justify-between"
              style={{ background: 'var(--surface-raised)' }}
            >
              <div className="flex items-center gap-4">
                <span
                  className="font-semibold"
                  style={{
                    color: activity.data.result.winner === 'A'
                      ? 'var(--team-usa)'
                      : 'var(--ink-secondary)',
                  }}
                >
                  {activity.data.result.teamA}
                </span>
                <span style={{ color: 'var(--ink-tertiary)' }}>vs</span>
                <span
                  className="font-semibold"
                  style={{
                    color: activity.data.result.winner === 'B'
                      ? 'var(--team-europe)'
                      : 'var(--ink-secondary)',
                  }}
                >
                  {activity.data.result.teamB}
                </span>
              </div>
              {activity.data.result.margin && (
                <span
                  className="text-sm font-bold"
                  style={{ color: 'var(--masters)' }}
                >
                  {activity.data.result.margin}
                </span>
              )}
            </div>
          )}

          {activity.type === 'achievement_earned' && activity.data.achievement && (
            <div
              className="mt-3 p-3 rounded-lg flex items-center gap-3"
              style={{
                background: getRarityGradient(activity.data.achievement.rarity),
              }}
            >
              <span className="text-2xl">{activity.data.achievement.icon}</span>
              <div>
                <p className="font-semibold text-white text-sm">
                  {activity.data.achievement.name}
                </p>
                <p className="text-xs text-white/70 capitalize">
                  {activity.data.achievement.rarity}
                </p>
              </div>
            </div>
          )}

          {/* Action */}
          {action && (
            <Link
              href={action.href}
              className="mt-3 flex items-center gap-1 text-xs font-medium"
              style={{ color: 'var(--masters)' }}
            >
              {action.label}
              <ChevronRight className="w-3 h-3" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================
// HELPERS
// ============================================

function getActivityDisplay(activity: ActivityItem): {
  icon: React.ReactNode;
  color: string;
  title: string;
  subtitle?: string;
  action?: { label: string; href: string };
} {
  switch (activity.type) {
    case 'match_completed':
      return {
        icon: <Trophy className="w-5 h-5" />,
        color: 'var(--masters)',
        title: `${activity.actor.name} completed a match`,
        subtitle: activity.data.result?.margin || 'Match finished',
        action: activity.data.matchId
          ? { label: 'View match', href: `/match/${activity.data.matchId}` }
          : undefined,
      };

    case 'match_started':
      return {
        icon: <Flag className="w-5 h-5" />,
        color: 'var(--team-usa)',
        title: 'Match started',
        subtitle: `${activity.data.result?.teamA} vs ${activity.data.result?.teamB}`,
      };

    case 'photo_uploaded':
      return {
        icon: <Camera className="w-5 h-5" />,
        color: 'var(--team-europe)',
        title: `${activity.actor.name} shared a photo`,
        action: { label: 'View gallery', href: '/social/photos' },
      };

    case 'comment_posted':
      return {
        icon: <MessageCircle className="w-5 h-5" />,
        color: 'var(--warning)',
        title: `${activity.actor.name} posted`,
      };

    case 'achievement_earned':
      return {
        icon: <Award className="w-5 h-5" />,
        color: 'var(--warning)',
        title: `${activity.actor.name} earned an achievement`,
        subtitle: activity.data.achievement?.name,
        action: { label: 'View achievements', href: '/achievements' },
      };

    case 'streak_milestone':
      return {
        icon: <Flame className="w-5 h-5" />,
        color: 'var(--error)',
        title: `${activity.actor.name} is on fire!`,
        subtitle: `${activity.data.streak} match win streak`,
      };

    case 'session_started':
      return {
        icon: <Users className="w-5 h-5" />,
        color: 'var(--masters)',
        title: 'New session started',
        subtitle: 'Matches are ready to begin',
      };

    case 'session_completed':
      return {
        icon: <Target className="w-5 h-5" />,
        color: 'var(--success)',
        title: 'Session completed',
        subtitle: 'All matches finished',
      };

    case 'player_joined':
      return {
        icon: <Users className="w-5 h-5" />,
        color: 'var(--team-europe)',
        title: `${activity.actor.name} joined the trip`,
      };

    case 'score_update':
      return {
        icon: <Target className="w-5 h-5" />,
        color: 'var(--ink-secondary)',
        title: 'Score updated',
        subtitle: activity.data.result?.margin,
      };

    default:
      return {
        icon: <Clock className="w-5 h-5" />,
        color: 'var(--ink-tertiary)',
        title: 'Activity',
      };
  }
}

function formatRelativeTime(timestamp: string): string {
  const now = new Date();
  const date = new Date(timestamp);
  const diff = now.getTime() - date.getTime();

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m`;
  if (hours < 24) return `${hours}h`;
  if (days < 7) return `${days}d`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getRarityGradient(rarity: string): string {
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

// ============================================
// COMPACT ACTIVITY ITEM
// ============================================

interface CompactActivityProps {
  activity: ActivityItem;
  className?: string;
}

export function CompactActivity({ activity, className }: CompactActivityProps) {
  const { icon, color, title } = getActivityDisplay(activity);

  return (
    <div
      className={cn('flex items-center gap-3 py-2', className)}
      style={{ borderBottom: '1px solid var(--rule)' }}
    >
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{
          background: `${color}15`,
          color,
        }}
      >
        {icon}
      </div>
      <p
        className="flex-1 text-sm truncate"
        style={{ color: 'var(--ink-secondary)' }}
      >
        {title}
      </p>
      <span
        className="text-xs"
        style={{ color: 'var(--ink-tertiary)' }}
      >
        {formatRelativeTime(activity.timestamp)}
      </span>
    </div>
  );
}

export default ActivityFeed;
