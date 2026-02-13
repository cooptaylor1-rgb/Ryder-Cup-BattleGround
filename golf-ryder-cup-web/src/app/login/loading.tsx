import { PageLoadingSkeleton } from '@/components/ui';

export default function Loading() {
  return <PageLoadingSkeleton title="Login" showBackButton={false} variant="form" />;
}
