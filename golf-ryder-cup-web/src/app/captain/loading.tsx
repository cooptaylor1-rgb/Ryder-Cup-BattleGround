/**
 * Captain Page Loading State
 *
 * Displays placeholder while captain dashboard loads.
 */
import { PageSkeleton, SessionCardSkeleton, PlayerListSkeleton } from '@/components/ui';

export default function Loading() {
  return (
    <PageSkeleton>
      <div className="space-y-4">
        <SessionCardSkeleton />
        <PlayerListSkeleton count={6} />
      </div>
    </PageSkeleton>
  );
}
