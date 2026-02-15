'use client';

/**
 * Courses Error Boundary
 *
 * Handles errors in courses routes with context-specific messaging.
 * Reports to Sentry for monitoring.
 */

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { BottomNav } from '@/components/layout';

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function CoursesError({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    Sentry.captureException(error, { tags: { feature: 'courses' } });
  }, [error]);

  return (
    <div className="min-h-screen pb-nav page-premium-enter texture-grain flex flex-col items-center justify-center p-6 bg-[var(--canvas)]">
      <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6 bg-red-500/10">
        <AlertTriangle size={40} className="text-[var(--error)]" />
      </div>

      <h1 className="text-2xl font-semibold mb-3 text-[var(--ink)]">Couldn&apos;t Load Courses</h1>

      <p className="text-center max-w-md mb-8 text-[var(--ink-secondary)]">
        There was a problem loading course information. Please try again.
      </p>

      {process.env.NODE_ENV === 'development' && (
        <details className="w-full max-w-lg mb-8 rounded-xl overflow-hidden bg-[var(--surface)] border border-[var(--rule)]">
          <summary className="px-4 py-3 cursor-pointer text-sm font-medium text-[var(--ink-secondary)]">
            Error Details
          </summary>
          <div className="px-4 pb-4">
            <pre className="text-xs overflow-auto p-3 rounded bg-[var(--canvas)] text-[var(--ink-tertiary)] max-h-[200px]">
              {error.message}
            </pre>
          </div>
        </details>
      )}

      <div className="flex gap-4">
        <button
          onClick={reset}
          className="flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-opacity hover:opacity-90 bg-[var(--masters)] text-[var(--canvas)]"
        >
          <RefreshCw size={18} />
          Try Again
        </button>

        <Link
          href="/"
          className="flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-opacity hover:opacity-90 bg-[var(--surface)] border border-[var(--rule)] text-[var(--ink)]"
        >
          <Home size={18} />
          Go Home
        </Link>
      </div>

      <BottomNav />
    </div>
  );
}
