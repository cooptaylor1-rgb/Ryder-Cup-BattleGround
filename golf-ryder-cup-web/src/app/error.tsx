'use client';

/**
 * Route Error Page
 *
 * Next.js 13+ error boundary for route-level error handling.
 * This catches errors in the route tree and displays a recovery UI.
 * Uses error categorization for user-friendly messages.
 * Reports errors to Sentry for monitoring.
 */

import * as Sentry from '@sentry/nextjs';
import { useEffect, useMemo } from 'react';
import Link from 'next/link';
import { AlertTriangle, RefreshCw, Home, WifiOff, Lock, Database } from 'lucide-react';
import { normalizeError, type AppError } from '@/lib/utils/errorHandling';

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

type ErrorCategory = 'network' | 'auth' | 'data' | 'general';

function categorizeError(appError: AppError): ErrorCategory {
  if (appError.code.startsWith('NETWORK_')) return 'network';
  if (appError.code.startsWith('AUTH_')) return 'auth';
  if (appError.code.startsWith('DATA_') || appError.code.startsWith('STORAGE_')) return 'data';
  return 'general';
}

const categoryConfig: Record<ErrorCategory, {
  icon: React.ReactNode;
  title: string;
  iconColor: string;
}> = {
  network: {
    icon: <WifiOff size={40} />,
    title: 'Connection issue',
    iconColor: 'var(--warning)',
  },
  auth: {
    icon: <Lock size={40} />,
    title: 'Authentication required',
    iconColor: 'var(--gold)',
  },
  data: {
    icon: <Database size={40} />,
    title: 'Data problem',
    iconColor: 'var(--info, #5B8FA8)',
  },
  general: {
    icon: <AlertTriangle size={40} />,
    title: 'Something went wrong',
    iconColor: 'var(--error)',
  },
};

export default function RouteError({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  const appError = useMemo(() => normalizeError(error), [error]);
  const category = useMemo(() => categorizeError(appError), [appError]);
  const config = categoryConfig[category];

  return (
    <div className="min-h-screen page-premium-enter texture-grain flex flex-col items-center justify-center p-6 bg-[var(--canvas)]">
      <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6 bg-[color:var(--error)]/10">
        <span style={{ color: config.iconColor }}>{config.icon}</span>
      </div>

      <h1 className="text-2xl font-semibold mb-3 text-[var(--ink)]">{config.title}</h1>

      <p className="text-center max-w-md mb-8 text-[var(--ink-secondary)]">
        {appError.userMessage}
      </p>

      {process.env.NODE_ENV === 'development' && (
        <details className="w-full max-w-lg mb-8 rounded-xl overflow-hidden bg-[var(--surface)] border border-[var(--rule)]">
          <summary className="px-4 py-3 cursor-pointer text-sm font-medium text-[var(--ink-secondary)]">
            Error Details
          </summary>
          <div className="px-4 pb-4">
            <p className="text-xs mb-2 text-[var(--ink-tertiary)]">Code: {appError.code}</p>
            <pre className="text-xs overflow-auto p-3 rounded bg-[var(--canvas)] text-[var(--ink-tertiary)] max-h-[200px]">
              {error.message}
              {'\n\n'}
              {error.stack}
            </pre>
            {error.digest && (
              <p className="mt-2 text-xs text-[var(--ink-tertiary)]">Error ID: {error.digest}</p>
            )}
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

    </div>
  );
}
