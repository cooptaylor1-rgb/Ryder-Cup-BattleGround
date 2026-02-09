'use client';

import { useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { PageLoadingSkeleton } from '@/components/ui';

function JoinPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const code = searchParams.get('code');

  useEffect(() => {
    // Store the code and redirect to home where JoinTripModal can pick it up.
    // If there is no code, just go home.
    if (code) {
      sessionStorage.setItem('pendingJoinCode', code);
    }
    router.replace('/');
  }, [code, router]);

  return <PageLoadingSkeleton title="Joining trip…" showBackButton={false} variant="default" />;
}

export default function JoinPage() {
  return (
    <Suspense fallback={<PageLoadingSkeleton title="Joining trip…" showBackButton={false} variant="default" />}>
      <JoinPageInner />
    </Suspense>
  );
}
