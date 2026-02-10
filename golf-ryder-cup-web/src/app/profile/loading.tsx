/**
 * Profile Page Loading State
 *
 * Warm cream skeleton in the Fried Egg editorial style.
 */
import { PageSkeleton, Skeleton } from '@/components/ui';

export default function Loading() {
  return (
    <PageSkeleton>
      <div className="flex flex-col gap-[var(--space-6)]">
        {/* Avatar and name */}
        <div className="flex flex-col items-center">
          <Skeleton className="w-24 h-24 rounded-full" />
          <Skeleton className="h-6 w-32 mt-4" />
          <Skeleton className="h-4 w-24 mt-2" />
        </div>

        {/* Handicap badge */}
        <div className="flex justify-center">
          <Skeleton className="h-10 w-28 rounded-full" />
        </div>

        {/* Section cards */}
        <div className="rounded-[var(--radius-lg)] border border-[var(--rule)] bg-[var(--canvas-raised)] p-[var(--space-5)]">
          <Skeleton className="h-5 w-24 mb-4" />
          <div className="flex flex-col gap-[var(--space-4)]">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>

        <div className="rounded-[var(--radius-lg)] border border-[var(--rule)] bg-[var(--canvas-raised)] p-[var(--space-5)]">
          <Skeleton className="h-5 w-20 mb-4" />
          <div className="flex flex-col gap-[var(--space-4)]">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      </div>
    </PageSkeleton>
  );
}
