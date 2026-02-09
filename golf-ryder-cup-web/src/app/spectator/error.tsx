'use client';

/**
 * Spectator Error Page
 *
 * Error boundary for spectator routes.
 * Reports to Sentry with context.
 */

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';
import { RefreshCw, ArrowLeft, Tv } from 'lucide-react';
import Link from 'next/link';

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function SpectatorError({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    Sentry.captureException(error, {
      tags: { feature: 'spectator' },
    });
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[var(--canvas)]">
      {/* Icon */}
      <div
        className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6"
        style={{ background: 'rgba(220, 38, 38, 0.1)' }}
      >
        <Tv size={40} style={{ color: '#DC2626' }} />
      </div>

      {/* Title */}
      <h1 className="text-2xl font-semibold mb-3" style={{ color: 'var(--ink)' }}>
        Spectator View Error
      </h1>

      {/* Description */}
      <p className="text-center max-w-md mb-2" style={{ color: 'var(--ink-secondary)' }}>
        There was a problem loading the live view.
      </p>
      <p className="text-center max-w-md mb-8 text-sm" style={{ color: 'var(--ink-tertiary)' }}>
        Please try refreshing. Live scores may still be updating in the background.
      </p>

      {/* Error Details (Development only) */}
      {process.env.NODE_ENV === 'development' && (
        <details
          className="w-full max-w-lg mb-8 rounded-xl overflow-hidden"
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--rule)',
          }}
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
          className="flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-opacity hover:opacity-90"
          style={{
            background: 'var(--masters)',
            color: 'white',
          }}
        >
          <RefreshCw size={18} />
          Try Again
        </button>

        <Link
          href="/live"
          className="flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-opacity hover:opacity-90"
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--rule)',
            color: 'var(--ink)',
          }}
        >
          <ArrowLeft size={18} />
          Back to Live
        </Link>
      </div>
    </div>
  );
}
