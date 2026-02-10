'use client';

/**
 * Scoring Error Page
 *
 * Specialized error boundary for scoring routes.
 * Ensures users don't lose their scoring progress.
 * Reports to Sentry with scoring context.
 */

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';
import { ArrowLeft, RefreshCw, Target } from 'lucide-react';
import Link from 'next/link';

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ScoringError({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    // Report scoring errors with context
    Sentry.captureException(error, {
      tags: { feature: 'scoring' },
    });
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[var(--canvas)]">
      {/* Icon */}
      <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6 bg-[rgba(220,38,38,0.1)]">
        <Target size={40} className="text-[#DC2626]" />
      </div>

      {/* Title */}
      <h1 className="text-2xl font-semibold mb-3 text-[var(--ink)]">Scoring Error</h1>

      {/* Description */}
      <p className="text-center max-w-md mb-2 text-[var(--ink-secondary)]">
        There was a problem with the scoring system.
      </p>
      <p className="text-center max-w-md mb-8 text-sm text-[var(--ink-tertiary)]">
        Don&apos;t worry - your scores are saved locally. Try again to continue scoring.
      </p>

      {/* Error Details (Development only) */}
      {process.env.NODE_ENV === 'development' && (
        <details className="w-full max-w-lg mb-8 rounded-xl overflow-hidden bg-[var(--surface)] border border-[var(--rule)]">
          <summary className="px-4 py-3 cursor-pointer text-sm font-medium text-[var(--ink-secondary)]">
            Error Details
          </summary>
          <div className="px-4 pb-4">
            <pre className="text-xs overflow-auto p-3 rounded bg-[var(--canvas)] text-[var(--ink-tertiary)] max-h-[200px]">
              {error.message}
              {'\n\n'}
              {error.stack}
            </pre>
          </div>
        </details>
      )}

      {/* Actions */}
      <div className="flex gap-4">
        <button
          onClick={reset}
          className="flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-opacity hover:opacity-90 bg-[var(--masters)] text-white"
        >
          <RefreshCw size={18} />
          Try Again
        </button>

        <Link
          href="/matchups"
          className="flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-opacity hover:opacity-90 bg-[var(--surface)] border border-[var(--rule)] text-[var(--ink)]"
        >
          <ArrowLeft size={18} />
          Back to Matches
        </Link>
      </div>
    </div>
  );
}
