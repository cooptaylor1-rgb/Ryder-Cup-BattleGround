/**
 * Awards Page Loading State
 *
 * Displays achievement card skeletons while awards data loads.
 */
import { PageSkeleton, AchievementCardSkeleton } from '@/components/ui';

export default function Loading() {
  return (
    <PageSkeleton>
      <div className="space-y-4">
        <AchievementCardSkeleton />
        <AchievementCardSkeleton />
        <AchievementCardSkeleton />
      </div>
    </PageSkeleton>
  );
}
