/**
 * Bets Page Loading State
 *
 * Displays bet card skeletons while bets data loads.
 */
import { PageSkeleton, BetCardSkeleton } from '@/components/ui';

export default function Loading() {
  return (
    <PageSkeleton>
      <div className="space-y-4">
        <BetCardSkeleton />
        <BetCardSkeleton />
        <BetCardSkeleton />
      </div>
    </PageSkeleton>
  );
}
