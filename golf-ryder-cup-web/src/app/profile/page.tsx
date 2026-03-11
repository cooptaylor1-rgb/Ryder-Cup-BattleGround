'use client';

import dynamic from 'next/dynamic';
import { PageLoadingSkeleton } from '@/components/ui';

const ProfilePageClient = dynamic(() => import('@/components/profile/ProfilePageClient'), {
  loading: () => <PageLoadingSkeleton title="Loading profile…" variant="form" />,
  ssr: false,
});

export default function ProfilePage() {
  return <ProfilePageClient />;
}
