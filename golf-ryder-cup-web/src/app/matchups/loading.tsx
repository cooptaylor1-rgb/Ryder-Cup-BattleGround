/**
 * Matchups Page Loading State
 *
 * Displays player list skeleton while matchups data loads.
 */
import { PageSkeleton, PlayerListSkeleton } from '@/components/ui';

export default function Loading() {
  return (
    <PageSkeleton>
      <PlayerListSkeleton count={8} />
    </PageSkeleton>
  );
}
