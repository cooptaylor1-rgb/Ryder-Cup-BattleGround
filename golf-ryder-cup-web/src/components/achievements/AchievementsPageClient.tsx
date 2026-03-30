'use client';

import { useEffect, useMemo, useState, type ComponentType } from 'react';
import { useRouter } from 'next/navigation';
import {
  Award,
  Check,
  Crown,
  Flame,
  Lock,
  Medal,
  Star,
  TrendingUp,
  Users,
  Zap,
  type LucideProps,
} from 'lucide-react';
import { loadTripAchievementSummary, type TripAchievement, type TripAchievementIcon } from '@/lib/services/achievementService';
import { useTripStore, useUIStore } from '@/lib/stores';
import { useShallow } from 'zustand/shallow';
import { EmptyStatePremium, PageLoadingSkeleton } from '@/components/ui';
import { createLogger } from '@/lib/utils/logger';
import { PageHeader } from '@/components/layout';
import { Button } from '@/components/ui/Button';

const logger = createLogger('achievements');

const RARITY_COLORS = {
  common: { bg: 'var(--ink-secondary)', text: 'var(--ink-tertiary)' },
  rare: { bg: 'var(--team-usa)', text: 'var(--team-usa-muted)' },
  epic: { bg: 'var(--team-europe)', text: 'var(--team-europe-muted)' },
  legendary: { bg: 'var(--color-accent)', text: 'var(--warning)' },
} as const;

const ICONS: Record<TripAchievementIcon, ComponentType<LucideProps>> = {
  award: Award,
  crown: Crown,
  flame: Flame,
  medal: Medal,
  star: Star,
  'trending-up': TrendingUp,
  users: Users,
  zap: Zap,
};

export default function AchievementsPageClient() {
  const router = useRouter();
  const { currentTrip } = useTripStore(useShallow(s => ({ currentTrip: s.currentTrip })));
  const { showToast } = useUIStore(useShallow(s => ({ showToast: s.showToast })));
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'unlocked' | 'locked'>('all');
  const [achievements, setAchievements] = useState<TripAchievement[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadAchievements() {
      if (!currentTrip) {
        setAchievements([]);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const summary = await loadTripAchievementSummary(currentTrip.id);
        setAchievements(summary.achievements);
      } catch (error) {
        logger.error('Failed to load trip achievements', { error });
        showToast('error', 'Failed to load achievements');
      } finally {
        setIsLoading(false);
      }
    }

    void loadAchievements();
  }, [currentTrip, showToast]);

  const filteredAchievements = useMemo(() => {
    return achievements.filter((achievement) => {
      if (selectedCategory === 'unlocked') {
        return achievement.unlocked;
      }

      if (selectedCategory === 'locked') {
        return !achievement.unlocked;
      }

      return true;
    });
  }, [achievements, selectedCategory]);

  const unlockedCount = achievements.filter((achievement) => achievement.unlocked).length;
  const totalCount = achievements.length;

  if (!currentTrip) {
    return (
      <div className="min-h-screen page-premium-enter texture-grain bg-[var(--canvas)]">
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
      </div>
    );
  }

  if (isLoading) {
    return <PageLoadingSkeleton title="Achievements" variant="grid" />;
  }

  return (
    <div className="min-h-screen page-premium-enter texture-grain bg-[var(--canvas)]">
      <PageHeader
        title="Achievements"
        subtitle={`${unlockedCount} of ${totalCount} unlocked`}
        icon={<Award size={16} className="text-[var(--color-accent)]" />}
        onBack={() => router.back()}
        rightSlot={
          <Button variant="outline" size="sm" leftIcon={<TrendingUp size={14} />} onClick={() => router.push('/stats')}>
            Stats Hub
          </Button>
        }
      />

      <main className="container-editorial py-4 pb-[var(--space-12)]">
        <section className="card text-center text-[var(--canvas)] p-[var(--space-6)] bg-[linear-gradient(135deg,var(--masters)_0%,var(--masters-hover)_100%)]">
          <div className="flex justify-center mb-[var(--space-3)] opacity-90">
            <Award size={48} className="text-[var(--canvas)]" />
          </div>

          <h2 className="score-large mb-[var(--space-1)]">
            {totalCount === 0 ? 0 : Math.round((unlockedCount / totalCount) * 100)}%
          </h2>
          <p className="type-body opacity-80">Trip Progress</p>

          <div className="mt-[var(--space-4)] h-2 rounded-full bg-[color:var(--canvas)]/20 overflow-hidden">
            <div
              className="h-full rounded-full bg-[color:var(--canvas)] transition-[width] duration-500 ease-out"
              style={{ width: `${totalCount === 0 ? 0 : (unlockedCount / totalCount) * 100}%` }}
            />
          </div>
        </section>

        <div className="flex gap-[var(--space-2)] my-[var(--space-6)]">
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

        <div className="grid grid-cols-1 gap-[var(--space-3)] md:grid-cols-2">
          {filteredAchievements.map((achievement) => (
            <AchievementCard key={achievement.id} achievement={achievement} />
          ))}
        </div>
      </main>
    </div>
  );
}

function CategoryButton({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <Button onClick={onClick} variant={active ? 'primary' : 'secondary'} size="sm" className="flex-1">
      {label} ({count})
    </Button>
  );
}

function AchievementCard({ achievement }: { achievement: TripAchievement }) {
  const colors = RARITY_COLORS[achievement.rarity];
  const Icon = ICONS[achievement.icon];

  return (
    <article
      className={`card relative border p-[var(--space-4)] ${achievement.unlocked ? '' : 'opacity-65'}`}
      style={{
        background: achievement.unlocked
          ? `linear-gradient(135deg, ${colors.bg}20 0%, ${colors.bg}10 100%)`
          : 'var(--canvas-raised)',
        borderColor: achievement.unlocked ? colors.bg : 'var(--rule)',
      }}
    >
      <span
        className="type-micro absolute top-[var(--space-2)] right-[var(--space-2)] px-[var(--space-2)] py-[var(--space-1)] rounded-full capitalize"
        style={{ background: `${colors.bg}30`, color: colors.text }}
      >
        {achievement.rarity}
      </span>

      <div
        className="h-12 w-12 rounded-[var(--radius-lg)] flex items-center justify-center mb-[var(--space-3)]"
        style={{
          background: achievement.unlocked ? colors.bg : 'var(--rule)',
          color: achievement.unlocked ? 'var(--canvas)' : 'var(--ink-tertiary)',
        }}
      >
        {achievement.unlocked ? <Icon size={24} /> : <Lock size={24} />}
      </div>

      <h3 className="type-body-sm font-semibold mb-[var(--space-1)] text-[var(--ink)]">{achievement.name}</h3>
      <p className="type-caption text-[var(--ink-secondary)]">{achievement.description}</p>

      {achievement.leaderName ? (
        <p className="mt-[var(--space-3)] text-xs text-[var(--ink-tertiary)]">
          Current leader: <span className="font-semibold text-[var(--ink-secondary)]">{achievement.leaderName}</span>
          {typeof achievement.leaderValue === 'number' ? ` (${achievement.leaderValue})` : ''}
        </p>
      ) : null}

      {achievement.unlocked ? (
        <div className="flex items-center gap-[var(--space-1)] mt-[var(--space-3)] text-[var(--success)]">
          <Check size={14} />
          <span className="type-micro font-medium">Unlocked</span>
        </div>
      ) : (
        <div className="mt-[var(--space-3)]">
          <div className="flex items-center justify-between mb-[var(--space-1)]">
            <span className="type-micro opacity-70">Progress</span>
            <span className="type-micro font-medium">
              {achievement.progress}/{achievement.maxProgress}
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-[var(--rule)] overflow-hidden">
            <div
              className="h-full rounded-full transition-[width] duration-300 ease-out"
              style={{
                width: `${achievement.maxProgress === 0 ? 0 : (achievement.progress / achievement.maxProgress) * 100}%`,
                background: colors.bg,
              }}
            />
          </div>
        </div>
      )}
    </article>
  );
}

