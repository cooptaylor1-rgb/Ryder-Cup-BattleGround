'use client';

import dynamic from 'next/dynamic';
import { PageLoadingSkeleton } from '@/components/ui';

const CompleteProfilePageClient = dynamic(
  () => import('@/components/profile/CompleteProfilePageClient'),
  {
    loading: () => (
      <PageLoadingSkeleton title="Loading profile…" variant="form" showBackButton={false} />
    ),
    ssr: false,
  }
);

export default function CompleteProfilePage() {
  return <CompleteProfilePageClient />;
}
