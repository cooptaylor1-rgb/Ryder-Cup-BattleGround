import { PageSkeleton, StatsSkeleton } from '@/components/ui';

export default function Loading() {
  return (
    <PageSkeleton>
      <StatsSkeleton count={6} />
    </PageSkeleton>
  );
}
