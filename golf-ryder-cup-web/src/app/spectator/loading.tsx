/**
 * Spectator Page Loading State
 *
 * Displays live match skeleton while spectator view loads.
 */
import { PageSkeleton, LiveMatchCardSkeleton } from '@/components/ui';

export default function Loading() {
  return (
    <PageSkeleton>
      <div className="space-y-4">
        <LiveMatchCardSkeleton />
        <LiveMatchCardSkeleton />
      </div>
    </PageSkeleton>
  );
}
