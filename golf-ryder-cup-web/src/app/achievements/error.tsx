'use client';

/**
 * Achievements Error Boundary
 *
 * Handles errors in achievements routes with context-specific messaging.
 * Reports to Sentry for monitoring.
 */

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface ErrorPageProps {
    error: Error & { digest?: string };
    reset: () => void;
}

export default function AchievementsError({ error, reset }: ErrorPageProps) {
    useEffect(() => {
        Sentry.captureException(error, { tags: { feature: 'achievements' } });
    }, [error]);

    return (
        <div
            className="min-h-screen flex flex-col items-center justify-center p-6"
            style={{ background: 'var(--canvas)' }}
        >
            <div
                className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6"
                style={{ background: 'rgba(239, 68, 68, 0.1)' }}
            >
                <AlertTriangle size={40} style={{ color: 'var(--error)' }} />
            </div>

            <h1
                className="text-2xl font-semibold mb-3"
                style={{ color: 'var(--ink)' }}
            >
                Couldn&apos;t Load Achievements
            </h1>

            <p
                className="text-center max-w-md mb-8"
                style={{ color: 'var(--ink-secondary)' }}
            >
                There was a problem loading your achievements. Please try again.
            </p>

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
                        </pre>
                    </div>
                </details>
            )}

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
        </div>
    );
}
