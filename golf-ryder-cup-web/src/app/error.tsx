'use client';

/**
 * Route Error Page
 *
 * Next.js 13+ error boundary for route-level error handling.
 * This catches errors in the route tree and displays a recovery UI.
 * Reports errors to Sentry for monitoring.
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

export default function RouteError({ error, reset }: ErrorPageProps) {
    useEffect(() => {
        // Report error to Sentry for monitoring
        Sentry.captureException(error);
    }, [error]);

    return (
        <div
            className="min-h-screen pb-nav page-premium-enter texture-grain flex flex-col items-center justify-center p-6"
            style={{ background: 'var(--canvas)' }}
        >
            {/* Icon */}
            <div
                className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6"
                style={{ background: 'rgba(239, 68, 68, 0.1)' }}
            >
                <AlertTriangle size={40} style={{ color: 'var(--error)' }} />
            </div>

            {/* Title */}
            <h1
                className="text-2xl font-semibold mb-3"
                style={{ color: 'var(--ink)' }}
            >
                Something went wrong
            </h1>

            {/* Description */}
            <p
                className="text-center max-w-md mb-8"
                style={{ color: 'var(--ink-secondary)' }}
            >
                We encountered an unexpected error. Your data is safe - please try again or return to the home screen.
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
                        {error.digest && (
                            <p
                                className="mt-2 text-xs"
                                style={{ color: 'var(--ink-tertiary)' }}
                            >
                                Error ID: {error.digest}
                            </p>
                        )}
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
                    href="/"
                    className="flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-opacity hover:opacity-90"
                    style={{
                        background: 'var(--surface)',
                        border: '1px solid var(--rule)',
                        color: 'var(--ink)',
                    }}
                >
                    <Home size={18} />
                    Go Home
                </Link>
            </div>

            <BottomNav />
        </div>
    );
}
