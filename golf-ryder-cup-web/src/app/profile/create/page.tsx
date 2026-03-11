'use client';

import dynamic from 'next/dynamic';
import { PageLoadingSkeleton } from '@/components/ui';

const CreateProfilePageClient = dynamic(
  () => import('@/components/profile/CreateProfilePageClient'),
  {
    loading: () => (
      <PageLoadingSkeleton title="Loading account creation…" variant="form" showBackButton={false} />
    ),
    ssr: false,
  }
);

export default function CreateProfilePage() {
  return <CreateProfilePageClient />;
}
