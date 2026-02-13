import { PageSkeleton, PlayerListSkeleton } from '@/components/ui';

export default function Loading() {
  return (
    <PageSkeleton>
      <PlayerListSkeleton count={8} />
    </PageSkeleton>
  );
}
