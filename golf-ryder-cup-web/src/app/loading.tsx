/**
 * Root Loading State
 *
 * Displays a full-page skeleton while the app initializes.
 * Uses Next.js Instant Loading UI with React Suspense.
 */
import { PageSkeleton, DashboardSkeleton } from '@/components/ui';

export default function Loading() {
  return (
    <PageSkeleton>
      <DashboardSkeleton />
    </PageSkeleton>
  );
}
