/**
 * Profile Page Loading State
 *
 * Warm cream skeleton in the Fried Egg editorial style.
 */
import { PageSkeleton, Skeleton } from '@/components/ui';

export default function Loading() {
  return (
    <PageSkeleton>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
        {/* Avatar and name */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Skeleton className="w-24 h-24 rounded-full" />
          <Skeleton className="h-6 w-32 mt-4" />
          <Skeleton className="h-4 w-24 mt-2" />
        </div>
        {/* Handicap badge */}
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <Skeleton className="h-10 w-28 rounded-full" />
        </div>
        {/* Section cards */}
        <div
          style={{
            background: 'var(--canvas-raised)',
            border: '1px solid var(--rule)',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--space-5)',
          }}
        >
          <Skeleton className="h-5 w-24 mb-4" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
        <div
          style={{
            background: 'var(--canvas-raised)',
            border: '1px solid var(--rule)',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--space-5)',
          }}
        >
          <Skeleton className="h-5 w-20 mb-4" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      </div>
    </PageSkeleton>
  );
}
