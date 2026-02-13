import { PageSkeleton, AchievementCardSkeleton } from '@/components/ui';

export default function Loading() {
  return (
    <PageSkeleton>
      <div className="flex flex-col gap-[var(--space-3)]">
        <AchievementCardSkeleton />
        <AchievementCardSkeleton />
        <AchievementCardSkeleton />
        <AchievementCardSkeleton />
      </div>
    </PageSkeleton>
  );
}
