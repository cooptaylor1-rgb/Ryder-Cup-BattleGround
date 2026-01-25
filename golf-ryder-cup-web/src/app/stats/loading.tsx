/**
 * Stats Page Loading State
 *
 * Displays placeholder while statistics data loads.
 */
import { PageSkeleton, Skeleton } from '@/components/ui';

export default function Loading() {
  return (
    <PageSkeleton>
      <div className="space-y-4">
        {/* Stats summary cards */}
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-24 rounded-lg" />
          <Skeleton className="h-24 rounded-lg" />
          <Skeleton className="h-24 rounded-lg" />
          <Skeleton className="h-24 rounded-lg" />
        </div>
        {/* Chart placeholder */}
        <Skeleton className="h-48 rounded-lg" />
        {/* Table placeholder */}
        <Skeleton className="h-32 rounded-lg" />
      </div>
    </PageSkeleton>
  );
}
