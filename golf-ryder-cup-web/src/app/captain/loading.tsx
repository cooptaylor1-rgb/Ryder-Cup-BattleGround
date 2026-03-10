import { PageLoadingSkeleton } from '@/components/ui';

export default function Loading() {
  return (
    <PageLoadingSkeleton
      title="Loading captain command..."
      showBackButton={false}
      variant="default"
      cardCount={5}
    />
  );
}
