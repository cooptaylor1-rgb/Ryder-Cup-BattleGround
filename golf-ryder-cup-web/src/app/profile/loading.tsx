/**
 * Profile Page Loading State
 *
 * Displays profile skeleton while user data loads.
 */
import { PageSkeleton, Skeleton } from '@/components/ui';

export default function Loading() {
  return (
    <PageSkeleton>
      <div className="space-y-6">
        {/* Avatar and name */}
        <div className="flex flex-col items-center">
          <Skeleton className="w-24 h-24 rounded-full" />
          <Skeleton className="h-6 w-32 mt-4" />
          <Skeleton className="h-4 w-24 mt-2" />
        </div>
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Skeleton className="h-20 rounded-lg" />
          <Skeleton className="h-20 rounded-lg" />
          <Skeleton className="h-20 rounded-lg" />
        </div>
        {/* Settings */}
        <Skeleton className="h-40 rounded-lg" />
      </div>
    </PageSkeleton>
  );
}
