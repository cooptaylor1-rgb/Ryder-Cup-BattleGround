'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RefreshCw, Home, WifiOff } from 'lucide-react';
import { BottomNav } from '@/components/layout';

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function RouteError({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  const isNetworkError =
    error.message?.toLowerCase().includes('fetch') ||
    error.message?.toLowerCase().includes('network') ||
    error.message?.toLowerCase().includes('timeout') ||
    error.message?.toLowerCase().includes('failed to load') ||
    error.name === 'TypeError';

  const title = isNetworkError ? 'Connection issue' : 'Something went wrong';
  const description = isNetworkError
    ? 'Looks like you\'re offline or have a weak signal. Your data is saved locally and will sync when you reconnect.'
    : 'We encountered an unexpected error. Your data is safe \u2014 please try again or return to the home screen.';

  return (
    <div className="min-h-screen pb-nav page-premium-enter texture-grain flex flex-col items-center justify-center p-6 bg-[var(--canvas)]">
      <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6 bg-[color:var(--error)]/10">
        {isNetworkError ? (
          <WifiOff size={40} className="text-[var(--warning)]" />
        ) : (
          <AlertTriangle size={40} className="text-[var(--error)]" />
        )}
      </div>

      <h1 className="text-2xl font-semibold mb-3 text-[var(--ink)]">{title}</h1>

      <p className="text-center max-w-md mb-8 text-[var(--ink-secondary)]">
        {description}
      </p>

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
