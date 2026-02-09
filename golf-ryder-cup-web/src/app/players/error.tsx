'use client';

/**
 * Players Error Boundary
 *
 * Phase 1: Never strand users on a dead end.
 * - Use standard premium wrapper
 * - Keep BottomNav available
 * - Prefer shared ErrorEmpty for consistent messaging
 */

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Users } from 'lucide-react';
import { BottomNav, PageHeader } from '@/components/layout';
import { ErrorEmpty } from '@/components/ui';

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function PlayersError({ error, reset }: ErrorPageProps) {
  const router = useRouter();

  useEffect(() => {
    Sentry.captureException(error, { tags: { feature: 'players' } });
  }, [error]);

  return (
    <div className="min-h-screen pb-nav page-premium-enter texture-grain bg-[var(--canvas)]" role="alert">
      <PageHeader
        title="Players"
        subtitle="Something went wrong"
        icon={<Users size={16} style={{ color: 'var(--color-accent)' }} />}
        onBack={() => router.back()}
      />

      <main className="container-editorial py-12">
        <ErrorEmpty message="We couldn't load player data right now." onRetry={reset} />

        {process.env.NODE_ENV === 'development' ? (
          <details
            className="mt-6 rounded-xl overflow-hidden"
            style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}
          >
            <summary
              className="px-4 py-3 cursor-pointer text-sm font-medium"
              style={{ color: 'var(--ink-secondary)' }}
            >
              Error Details
            </summary>
            <div className="px-4 pb-4">
              <pre
                className="text-xs overflow-auto p-3 rounded"
                style={{
                  background: 'var(--canvas)',
                  color: 'var(--ink-tertiary)',
                  maxHeight: '200px',
                }}
              >
                {error.message}
              </pre>
            </div>
          </details>
        ) : null}

        <div className="mt-6 flex justify-center">
          <Link
            href="/"
            className="px-4 py-2 rounded-xl font-medium"
            style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}
          >
            Back to Home
          </Link>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
