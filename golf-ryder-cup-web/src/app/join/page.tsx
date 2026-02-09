'use client';

import { useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense } from 'react';

function JoinLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center page-premium-enter texture-grain bg-[var(--canvas)]">
      <div style={{ textAlign: 'center' }}>
        <div className="animate-pulse" style={{ fontSize: '3rem' }}>
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none" style={{ margin: '0 auto' }}>
            <circle cx="24" cy="24" r="20" stroke="var(--masters)" strokeWidth="2" fill="none" />
            <path
              d="M24 14v20M14 24h20"
              stroke="var(--masters)"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </div>
        <p
          className="type-body-sm"
          style={{ marginTop: 'var(--space-4)', color: 'var(--ink-secondary)' }}
        >
          Joining trip...
        </p>
      </div>
    </div>
  );
}

function JoinPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const code = searchParams.get('code');

  useEffect(() => {
    if (code) {
      // Store the code and redirect to home where JoinTripModal can pick it up
      sessionStorage.setItem('pendingJoinCode', code);
      router.replace('/');
    } else {
      router.replace('/');
    }
  }, [code, router]);

  return <JoinLoading />;
}

export default function JoinPage() {
  return (
    <Suspense fallback={<JoinLoading />}>
      <JoinPageInner />
    </Suspense>
  );
}
