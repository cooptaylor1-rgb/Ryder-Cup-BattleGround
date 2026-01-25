/**
 * Scoring Page Loading State
 *
 * Displays match card skeletons while scoring interface loads.
 */
import { PageSkeleton, MatchCardSkeleton } from '@/components/ui';

export default function Loading() {
  return (
    <PageSkeleton>
      <div className="space-y-4">
        <MatchCardSkeleton />
        <MatchCardSkeleton />
      </div>
    </PageSkeleton>
  );
}
