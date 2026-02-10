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
    Sentry.captureException(error, {
      tags: {
        feature: 'scoring',
        matchId: matchId || 'unknown',
      },
      extra: {
        errorDigest: error.digest,
      },
    });

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
      <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6 bg-[rgba(239,68,68,0.1)]">
        <Target size={40} className="text-[var(--error)]" />
      </div>

      <h1 className="text-2xl font-semibold mb-3 text-[var(--ink)]">Scoring Error</h1>

      <p className="text-center max-w-md mb-2 text-[var(--ink-secondary)]">
        There was a problem with the scoring system.
      </p>

      {hasOfflineData && (
        <div className="flex items-center gap-2 px-4 py-2 rounded-lg mb-4 bg-[rgba(34,197,94,0.1)] text-[#16a34a]">
          <Save size={16} />
          <span className="text-sm font-medium">Your scores are saved locally</span>
        </div>
      )}

      <p className="text-center max-w-md mb-8 text-sm text-[var(--ink-tertiary)]">
        Try again to continue scoring. Your progress won&apos;t be lost.
      </p>

      {process.env.NODE_ENV === 'development' && (
        <details className="w-full max-w-lg mb-8 rounded-xl overflow-hidden bg-[var(--surface)] border border-[var(--rule)]">
          <summary className="px-4 py-3 cursor-pointer text-sm font-medium flex items-center gap-2 text-[var(--ink-secondary)]">
            <AlertTriangle size={14} />
            Error Details {matchId && `(Match: ${matchId.slice(0, 8)}...)`}
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
