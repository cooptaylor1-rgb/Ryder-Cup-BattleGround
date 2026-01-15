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
  common: { bg: 'var(--ink-secondary)', text: 'var(--ink-tertiary)' },
  rare: { bg: 'var(--team-usa)', text: 'var(--team-usa-muted)' },
  epic: { bg: 'var(--team-europe)', text: 'var(--team-europe-muted)' },
  legendary: { bg: 'var(--color-accent)', text: 'var(--warning)' },
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

      <main className="container-editorial" style={{ paddingTop: 'var(--space-4)', paddingBottom: 'var(--space-4)' }}>
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
          <p className="type-body" style={{ opacity: 0.8 }}>Trip Progress</p>

          {/* Progress Bar */}
          <div style={{ marginTop: 'var(--space-4)', height: '8px', borderRadius: 'var(--radius-full)', background: 'rgba(255,255,255,0.2)', overflow: 'hidden' }}>
            <div
              style={{ height: '100%', borderRadius: 'var(--radius-full)', background: 'white', transition: 'width 0.5s ease', width: `${(unlockedCount / totalCount) * 100}%` }}
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
      className={active ? 'btn btn-primary' : 'btn btn-secondary'}
      style={{ flex: 1 }}
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
      {/* Rarity Badge */}
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

      {/* Icon */}
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

      {/* Info */}
      <h3 className="type-body-sm" style={{ fontWeight: 600, marginBottom: 'var(--space-1)' }}>{achievement.name}</h3>
      <p className="type-caption">{achievement.description}</p>

      {/* Progress or Status */}
      {achievement.unlocked ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)', marginTop: 'var(--space-3)', color: 'var(--success)' }}>
          <Check size={14} />
          <span className="type-micro" style={{ fontWeight: 500 }}>Unlocked</span>
        </div>
      ) : achievement.progress !== undefined && achievement.maxProgress ? (
        <div style={{ marginTop: 'var(--space-3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-1)' }}>
            <span className="type-micro" style={{ opacity: 0.7 }}>Progress</span>
            <span className="type-micro" style={{ fontWeight: 500 }}>
              {achievement.progress}/{achievement.maxProgress}
            </span>
          </div>
          <div style={{ height: '6px', borderRadius: 'var(--radius-full)', background: 'var(--rule)', overflow: 'hidden' }}>
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
