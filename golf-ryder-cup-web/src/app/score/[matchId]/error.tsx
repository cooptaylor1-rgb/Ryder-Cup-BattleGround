'use client';

/**
 * Match Scoring Error Boundary
 *
 * Specialized error boundary for the match scoring page.
 * Provides recovery options and preserves offline scores.
 * Reports to Sentry with match context.
 */

import * as Sentry from '@sentry/nextjs';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { RefreshCw, ArrowLeft, Target, Save, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function MatchScoringError({ error, reset }: ErrorPageProps) {
  const params = useParams();
  const matchId = params?.matchId as string | undefined;
  const [hasOfflineData, setHasOfflineData] = useState(false);

  useEffect(() => {
    // Report scoring errors with match context
    Sentry.captureException(error, {
      tags: {
        feature: 'scoring',
        matchId: matchId || 'unknown',
      },
      extra: {
        errorDigest: error.digest,
      },
    });

    // Check for offline score data
    const checkOfflineData = async () => {
      try {
        if (matchId && typeof window !== 'undefined') {
          const { db } = await import('@/lib/db');
          const offlineScores = await db.holeResults.where('matchId').equals(matchId).count();
          setHasOfflineData(offlineScores > 0);
        }
      } catch {
        // Silently fail - just showing status
      }
    };

    checkOfflineData();
  }, [error, matchId]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[var(--canvas)]">
      {/* Icon */}
      <div
        className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6"
        style={{ background: 'rgba(220, 38, 38, 0.1)' }}
      >
        <Target size={40} style={{ color: '#DC2626' }} />
      </div>

      {/* Title */}
      <h1 className="text-2xl font-semibold mb-3" style={{ color: 'var(--ink)' }}>
        Scoring Error
      </h1>

      {/* Description */}
      <p className="text-center max-w-md mb-2" style={{ color: 'var(--ink-secondary)' }}>
        There was a problem with the scoring system.
      </p>

      {/* Offline data status */}
      {hasOfflineData && (
        <div
          className="flex items-center gap-2 px-4 py-2 rounded-lg mb-4"
          style={{
            background: 'rgba(34, 197, 94, 0.1)',
            color: '#16a34a',
          }}
        >
          <Save size={16} />
          <span className="text-sm font-medium">Your scores are saved locally</span>
        </div>
      )}

      <p className="text-center max-w-md mb-8 text-sm" style={{ color: 'var(--ink-tertiary)' }}>
        Try again to continue scoring. Your progress won&apos;t be lost.
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
            className="px-4 py-3 cursor-pointer text-sm font-medium flex items-center gap-2"
            style={{ color: 'var(--ink-secondary)' }}
          >
            <AlertTriangle size={14} />
            Error Details {matchId && `(Match: ${matchId.slice(0, 8)}...)`}
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
          href="/matchups"
          className="flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-opacity hover:opacity-90"
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--rule)',
            color: 'var(--ink)',
          }}
        >
          <ArrowLeft size={18} />
          Back to Matches
        </Link>
      </div>
    </div>
  );
}
