/**
 * Standings Page Loading State
 *
 * Displays standings card skeleton while data loads.
 */
import { PageSkeleton, StandingsCardSkeleton } from '@/components/ui';

export default function Loading() {
  return (
    <PageSkeleton>
      <StandingsCardSkeleton />
    </PageSkeleton>
  );
}
