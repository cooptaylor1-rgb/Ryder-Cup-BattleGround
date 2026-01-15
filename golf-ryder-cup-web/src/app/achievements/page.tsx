'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTripStore } from '@/lib/stores';
import {
  ChevronLeft,
  Home,
  Target,
  Users,
  Trophy,
  MoreHorizontal,
  Award,
  Star,
  Flame,
  Zap,
  Crown,
  Medal,
  Lock,
  Check,
  TrendingUp,
  CalendarDays,
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
  common: { bg: '#6b7280', text: '#9ca3af' },
  rare: { bg: '#3b82f6', text: '#60a5fa' },
  epic: { bg: '#8b5cf6', text: '#a78bfa' },
  legendary: { bg: '#f59e0b', text: '#fbbf24' },
};

export default function AchievementsPage() {
  const router = useRouter();
  const { currentTrip, players } = useTripStore();
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'unlocked' | 'locked'>('all');

  useEffect(() => {
    if (!currentTrip) {
      router.push('/');
    }
  }, [currentTrip, router]);

  // Demo achievements
  const achievements: Achievement[] = [
    {
      id: '1',
      name: 'First Blood',
      description: 'Win your first hole',
      icon: <Zap size={24} />,
      rarity: 'common',
      unlocked: true,
      unlockedAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    },
    {
      id: '2',
      name: 'Hat Trick',
      description: 'Win 3 holes in a row',
      icon: <Flame size={24} />,
      rarity: 'rare',
      unlocked: true,
      unlockedAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    },
    {
      id: '3',
      name: 'Eagle Eye',
      description: 'Make an eagle',
      icon: <Star size={24} />,
      rarity: 'epic',
      unlocked: false,
      progress: 0,
      maxProgress: 1,
    },
    {
      id: '4',
      name: 'Closer',
      description: 'Close out a match',
      icon: <Trophy size={24} />,
      rarity: 'common',
      unlocked: true,
      unlockedAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    },
    {
      id: '5',
      name: 'Comeback Kid',
      description: 'Win a match after being 3 down',
      icon: <TrendingUp size={24} />,
      rarity: 'epic',
      unlocked: false,
    },
    {
      id: '6',
      name: 'Perfect Round',
      description: 'Win every hole in a match',
      icon: <Crown size={24} />,
      rarity: 'legendary',
      unlocked: false,
    },
    {
      id: '7',
      name: 'Iron Man',
      description: 'Play in 5 matches',
      icon: <Medal size={24} />,
      rarity: 'rare',
      unlocked: false,
      progress: 3,
      maxProgress: 5,
    },
    {
      id: '8',
      name: 'Money Player',
      description: 'Win a skins pot',
      icon: <Zap size={24} />,
      rarity: 'rare',
      unlocked: false,
    },
    {
      id: '9',
      name: 'Team Player',
      description: 'Contribute 3 points to your team',
      icon: <Users size={24} />,
      rarity: 'common',
      unlocked: true,
      unlockedAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    },
    {
      id: '10',
      name: 'MVP',
      description: 'Top individual scorer of the trip',
      icon: <Award size={24} />,
      rarity: 'legendary',
      unlocked: false,
    },
  ];

  const filteredAchievements = achievements.filter((a) => {
    if (selectedCategory === 'unlocked') return a.unlocked;
    if (selectedCategory === 'locked') return !a.unlocked;
    return true;
  });

  const unlockedCount = achievements.filter((a) => a.unlocked).length;
  const totalCount = achievements.length;

  if (!currentTrip) return null;

  return (
    <div className="min-h-screen pb-nav" style={{ background: 'var(--canvas)' }}>
      {/* Header */}
      <header className="header">
        <div className="container-editorial flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2 -ml-2 press-scale"
            style={{ color: 'var(--ink-secondary)' }}
            aria-label="Back"
          >
            <ChevronLeft size={22} />
          </button>
          <div>
            <span className="type-overline">Achievements</span>
            <p className="type-caption">{unlockedCount} of {totalCount} unlocked</p>
          </div>
        </div>
      </header>

      <main className="container-editorial py-4">
        {/* Progress Overview */}
        <div
          className="p-6 rounded-2xl mb-6 text-center"
          style={{
            background: 'linear-gradient(135deg, var(--masters) 0%, #1d4d2c 100%)',
            color: 'white',
          }}
        >
          <Award size={48} className="mx-auto mb-3 opacity-90" />
          <h2 className="text-3xl font-bold mb-1">
            {Math.round((unlockedCount / totalCount) * 100)}%
          </h2>
          <p className="opacity-80">Trip Progress</p>

          {/* Progress Bar */}
          <div className="mt-4 h-2 rounded-full bg-white/20 overflow-hidden">
            <div
              className="h-full rounded-full bg-white transition-all duration-500"
              style={{ width: `${(unlockedCount / totalCount) * 100}%` }}
            />
          </div>
        </div>

        {/* Category Filter */}
        <div className="flex gap-2 mb-6">
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
        <div className="grid grid-cols-2 gap-3">
          {filteredAchievements.map((achievement) => (
            <AchievementCard key={achievement.id} achievement={achievement} />
          ))}
        </div>
      </main>

      {/* Bottom Navigation */}
      <nav className="bottom-nav">
        <Link href="/" className="nav-item">
          <Home size={22} strokeWidth={1.75} />
          <span>Home</span>
        </Link>
        <Link href="/schedule" className="nav-item">
          <CalendarDays size={22} strokeWidth={1.75} />
          <span>Schedule</span>
        </Link>
        <Link href="/score" className="nav-item">
          <Target size={22} strokeWidth={1.75} />
          <span>Score</span>
        </Link>
        <Link href="/matchups" className="nav-item">
          <Users size={22} strokeWidth={1.75} />
          <span>Matches</span>
        </Link>
        <Link href="/standings" className="nav-item">
          <Trophy size={22} strokeWidth={1.75} />
          <span>Standings</span>
        </Link>
        <Link href="/more" className="nav-item">
          <MoreHorizontal size={22} strokeWidth={1.75} />
          <span>More</span>
        </Link>
      </nav>
    </div>
  );
}

/* Category Button */
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
      className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
        active ? 'text-white' : ''
      }`}
      style={{
        background: active ? 'var(--masters)' : 'var(--surface)',
        border: active ? 'none' : '1px solid var(--rule)',
      }}
    >
      {label} ({count})
    </button>
  );
}

/* Achievement Card */
interface AchievementCardProps {
  achievement: Achievement;
}

function AchievementCard({ achievement }: AchievementCardProps) {
  const colors = RARITY_COLORS[achievement.rarity];

  return (
    <div
      className={`relative p-4 rounded-xl transition-all ${
        achievement.unlocked ? 'opacity-100' : 'opacity-60'
      }`}
      style={{
        background: achievement.unlocked
          ? `linear-gradient(135deg, ${colors.bg}20 0%, ${colors.bg}10 100%)`
          : 'var(--surface)',
        border: `1px solid ${achievement.unlocked ? colors.bg : 'var(--rule)'}`,
      }}
    >
      {/* Rarity Badge */}
      <span
        className="absolute top-2 right-2 text-xs px-2 py-0.5 rounded-full font-medium capitalize"
        style={{
          background: `${colors.bg}30`,
          color: colors.text,
        }}
      >
        {achievement.rarity}
      </span>

      {/* Icon */}
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center mb-3"
        style={{
          background: achievement.unlocked ? colors.bg : 'var(--rule)',
          color: achievement.unlocked ? 'white' : 'var(--ink-tertiary)',
        }}
      >
        {achievement.unlocked ? achievement.icon : <Lock size={24} />}
      </div>

      {/* Info */}
      <h3 className="font-semibold text-sm mb-1">{achievement.name}</h3>
      <p className="type-caption text-xs">{achievement.description}</p>

      {/* Progress or Status */}
      {achievement.unlocked ? (
        <div className="flex items-center gap-1 mt-3" style={{ color: 'var(--success)' }}>
          <Check size={14} />
          <span className="text-xs font-medium">Unlocked</span>
        </div>
      ) : achievement.progress !== undefined && achievement.maxProgress ? (
        <div className="mt-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs opacity-70">Progress</span>
            <span className="text-xs font-medium">
              {achievement.progress}/{achievement.maxProgress}
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
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
