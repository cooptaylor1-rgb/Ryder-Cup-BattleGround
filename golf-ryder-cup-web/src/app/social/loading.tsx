/**
 * Social Page Loading State
 *
 * Displays comment/photo skeleton while social feed loads.
 */
import { PageSkeleton, CommentCardSkeleton, PhotoGridSkeleton } from '@/components/ui';

export default function Loading() {
  return (
    <PageSkeleton>
      <div className="space-y-4">
        <PhotoGridSkeleton />
        <CommentCardSkeleton />
        <CommentCardSkeleton />
        <CommentCardSkeleton />
      </div>
    </PageSkeleton>
  );
}
