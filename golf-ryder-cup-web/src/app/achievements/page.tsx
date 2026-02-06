'use client';

import { useEffect, useMemo, useState } from 'react';
import type React from 'react';
import { useRouter } from 'next/navigation';
// (Link removed; BottomNav provides navigation)
import { useTripStore, useUIStore } from '@/lib/stores';
import { calculatePlayerStats } from '@/lib/services/awardsService';
import { EmptyStatePremium, PageLoadingSkeleton } from '@/components/ui';
import { createLogger } from '@/lib/utils/logger';
import { BottomNav, PageHeader } from '@/components/layout';
import type { PlayerStats } from '@/lib/types/awards';
import {
  Users,
  Award,
  Star,
  Flame,
  Zap,
  Crown,
  Medal,
  Lock,
  Check,
  TrendingUp,
} from 'lucide-react';

/**
 * ACHIEVEMENTS PAGE — Awards & Badges
 *
 * Track trip achievements, unlock badges, and
 * celebrate memorable moments!
 */

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  unlocked: boolean;
  unlockedAt?: string;
  progress?: number;
  maxProgress?: number;
}

const RARITY_COLORS = {
  common: { bg: 'var(--ink-secondary)', text: 'var(--ink-tertiary)' },
  rare: { bg: 'var(--team-usa)', text: 'var(--team-usa-muted)' },
  epic: { bg: 'var(--team-europe)', text: 'var(--team-europe-muted)' },
  legendary: { bg: 'var(--color-accent)', text: 'var(--warning)' },
};

const logger = createLogger('achievements');

export default function AchievementsPage() {
  const router = useRouter();
  const { currentTrip } = useTripStore();
  const { showToast } = useUIStore();
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'unlocked' | 'locked'>('all');
  const [playerStats, setPlayerStats] = useState<PlayerStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // If no active trip, we render an explicit empty state instead of redirecting.

  useEffect(() => {
    async function loadStats() {
      if (!currentTrip) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const stats = await calculatePlayerStats(currentTrip.id);
        setPlayerStats(stats);
      } catch (error) {
        logger.error('Failed to load player stats', { error });
        showToast('error', 'Failed to load achievements');
      } finally {
        setIsLoading(false);
      }
    }

    loadStats();
  }, [currentTrip, showToast]);

  const achievements = useMemo((): Achievement[] => {
    // Aggregate stats across all players
    const totalHolesWon = playerStats.reduce((sum, s) => sum + s.holesWon, 0);
    const maxMatchesPlayed = Math.max(0, ...playerStats.map((s) => s.matchesPlayed));
    const maxWins = Math.max(0, ...playerStats.map((s) => s.wins));
    const maxPoints = Math.max(0, ...playerStats.map((s) => s.points));
    const maxStreak = Math.max(0, ...playerStats.map((s) => s.longestWinStreak));
    const maxBiggestWin = Math.max(0, ...playerStats.map((s) => s.biggestWin));

    return [
      {
        id: '1',
        name: 'First Blood',
        description: 'Win your first hole',
        icon: <Zap size={24} />,
        rarity: 'common',
        unlocked: totalHolesWon > 0,
      },
      {
        id: '2',
        name: 'Hat Trick',
        description: 'Win 3 holes in a row',
        icon: <Flame size={24} />,
        rarity: 'rare',
        unlocked: maxStreak >= 3,
        progress: maxStreak,
        maxProgress: 3,
      },
      {
        id: '3',
        name: 'Dominant Force',
        description: 'Win a match by 5+ holes',
        icon: <Star size={24} />,
        rarity: 'epic',
        unlocked: maxBiggestWin >= 5,
        progress: maxBiggestWin,
        maxProgress: 5,
      },
      {
        id: '4',
        name: 'Closer',
        description: 'Win a match',
        icon: <Award size={24} />,
        rarity: 'common',
        unlocked: maxWins > 0,
        progress: maxWins,
        maxProgress: 1,
      },
      {
        id: '5',
        name: 'On Fire',
        description: 'Win 3 matches in a row',
        icon: <TrendingUp size={24} />,
        rarity: 'epic',
        unlocked: maxStreak >= 3,
        progress: maxStreak,
        maxProgress: 3,
      },
      {
        id: '6',
        name: 'Perfect Record',
        description: 'Win 5 matches without a loss',
        icon: <Crown size={24} />,
        rarity: 'legendary',
        unlocked: maxWins >= 5 && playerStats.some((s) => s.wins >= 5 && s.losses === 0),
        progress: maxWins,
        maxProgress: 5,
      },
      {
        id: '7',
        name: 'Iron Man',
        description: 'Play in 5 matches',
        icon: <Medal size={24} />,
        rarity: 'rare',
        unlocked: maxMatchesPlayed >= 5,
        progress: maxMatchesPlayed,
        maxProgress: 5,
      },
      {
        id: '8',
        name: 'Match Machine',
        description: 'Play in 10 matches',
        icon: <Zap size={24} />,
        rarity: 'epic',
        unlocked: maxMatchesPlayed >= 10,
        progress: maxMatchesPlayed,
        maxProgress: 10,
      },
      {
        id: '9',
        name: 'Team Player',
        description: 'Contribute 3 points to your team',
        icon: <Users size={24} />,
        rarity: 'common',
        unlocked: maxPoints >= 3,
        progress: maxPoints,
        maxProgress: 3,
      },
      {
        id: '10',
        name: 'MVP',
        description: 'Score 5+ points in a trip',
        icon: <Award size={24} />,
        rarity: 'legendary',
        unlocked: maxPoints >= 5,
        progress: maxPoints,
        maxProgress: 5,
      },
    ];
  }, [playerStats]);

  const filteredAchievements = achievements.filter((a) => {
    if (selectedCategory === 'unlocked') return a.unlocked;
    if (selectedCategory === 'locked') return !a.unlocked;
    return true;
  });

  const unlockedCount = achievements.filter((a) => a.unlocked).length;
  const totalCount = achievements.length;

  if (!currentTrip) {
    return (
      <div
        className="min-h-screen pb-nav page-premium-enter texture-grain"
        style={{ background: 'var(--canvas)' }}
      >
        <main className="container-editorial py-12">
          <EmptyStatePremium
            illustration="trophy"
            title="No trip selected"
            description="Pick a trip to view achievements."
            action={{
              label: 'Back to Home',
              onClick: () => router.push('/'),
            }}
          />
        </main>
        <BottomNav />
      </div>
    );
  }

  if (isLoading) {
    return <PageLoadingSkeleton title="Achievements" variant="grid" />;
  }

  return (
    <div
      className="min-h-screen pb-nav page-premium-enter texture-grain"
      style={{ background: 'var(--canvas)' }}
    >
      <PageHeader
        title="Achievements"
        subtitle={`${unlockedCount} of ${totalCount} unlocked`}
        icon={<Award size={16} style={{ color: 'var(--color-accent)' }} />}
        onBack={() => router.back()}
      />

      <main
        className="container-editorial"
        style={{ paddingTop: 'var(--space-4)', paddingBottom: 'var(--space-4)' }}
      >
        {/* Progress Overview */}
        <div
          className="card text-center"
          style={{
            background: 'linear-gradient(135deg, var(--masters) 0%, var(--masters-hover) 100%)',
            color: 'white',
            padding: 'var(--space-6)',
            marginBottom: 'var(--space-6)',
          }}
        >
          <Award size={48} style={{ margin: '0 auto var(--space-3)', opacity: 0.9 }} />
          <h2 className="score-large" style={{ marginBottom: 'var(--space-1)' }}>
            {Math.round((unlockedCount / totalCount) * 100)}%
          </h2>
          <p className="type-body" style={{ opacity: 0.8 }}>
            Trip Progress
          </p>

          {/* Progress Bar */}
          <div
            style={{
              marginTop: 'var(--space-4)',
              height: '8px',
              borderRadius: 'var(--radius-full)',
              background: 'rgba(255,255,255,0.2)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                borderRadius: 'var(--radius-full)',
                background: 'white',
                transition: 'width 0.5s ease',
                width: `${(unlockedCount / totalCount) * 100}%`,
              }}
            />
          </div>
        </div>

        {/* Category Filter */}
        <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-6)' }}>
          <CategoryButton
            label="All"
            count={totalCount}
            active={selectedCategory === 'all'}
            onClick={() => setSelectedCategory('all')}
          />
          <CategoryButton
            label="Unlocked"
            count={unlockedCount}
            active={selectedCategory === 'unlocked'}
            onClick={() => setSelectedCategory('unlocked')}
          />
          <CategoryButton
            label="Locked"
            count={totalCount - unlockedCount}
            active={selectedCategory === 'locked'}
            onClick={() => setSelectedCategory('locked')}
          />
        </div>

        {/* Achievements Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-3)' }}>
          {filteredAchievements.map((achievement) => (
            <AchievementCard key={achievement.id} achievement={achievement} />
          ))}
        </div>
      </main>

      <BottomNav />
    </div>
  );
}

interface CategoryButtonProps {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}

function CategoryButton({ label, count, active, onClick }: CategoryButtonProps) {
  return (
    <button
      onClick={onClick}
      className={active ? 'btn btn-primary' : 'btn btn-secondary'}
      style={{ flex: 1 }}
    >
      {label} ({count})
    </button>
  );
}

interface AchievementCardProps {
  achievement: Achievement;
}

function AchievementCard({ achievement }: AchievementCardProps) {
  const colors = RARITY_COLORS[achievement.rarity];

  return (
    <div
      className="card"
      style={{
        position: 'relative',
        padding: 'var(--space-4)',
        opacity: achievement.unlocked ? 1 : 0.6,
        background: achievement.unlocked
          ? `linear-gradient(135deg, ${colors.bg}20 0%, ${colors.bg}10 100%)`
          : 'var(--canvas-raised)',
        border: `1px solid ${achievement.unlocked ? colors.bg : 'var(--rule)'}`,
      }}
    >
      <span
        className="type-micro"
        style={{
          position: 'absolute',
          top: 'var(--space-2)',
          right: 'var(--space-2)',
          padding: 'var(--space-1) var(--space-2)',
          borderRadius: 'var(--radius-full)',
          background: `${colors.bg}30`,
          color: colors.text,
          textTransform: 'capitalize',
        }}
      >
        {achievement.rarity}
      </span>

      <div
        style={{
          width: '48px',
          height: '48px',
          borderRadius: 'var(--radius-lg)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 'var(--space-3)',
          background: achievement.unlocked ? colors.bg : 'var(--rule)',
          color: achievement.unlocked ? 'white' : 'var(--ink-tertiary)',
        }}
      >
        {achievement.unlocked ? achievement.icon : <Lock size={24} />}
      </div>

      <h3 className="type-body-sm" style={{ fontWeight: 600, marginBottom: 'var(--space-1)' }}>
        {achievement.name}
      </h3>
      <p className="type-caption">{achievement.description}</p>

      {achievement.unlocked ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-1)',
            marginTop: 'var(--space-3)',
            color: 'var(--success)',
          }}
        >
          <Check size={14} />
          <span className="type-micro" style={{ fontWeight: 500 }}>
            Unlocked
          </span>
        </div>
      ) : achievement.progress !== undefined && achievement.maxProgress ? (
        <div style={{ marginTop: 'var(--space-3)' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 'var(--space-1)',
            }}
          >
            <span className="type-micro" style={{ opacity: 0.7 }}>
              Progress
            </span>
            <span className="type-micro" style={{ fontWeight: 500 }}>
              {achievement.progress}/{achievement.maxProgress}
            </span>
          </div>
          <div
            style={{
              height: '6px',
              borderRadius: 'var(--radius-full)',
              background: 'var(--rule)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                borderRadius: 'var(--radius-full)',
                transition: 'width 0.3s ease',
                width: `${(achievement.progress / achievement.maxProgress) * 100}%`,
                background: colors.bg,
              }}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
