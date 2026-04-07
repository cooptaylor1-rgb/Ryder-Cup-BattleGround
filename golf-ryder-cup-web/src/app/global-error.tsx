'use client';

/**
 * Global Error Page
 *
 * Catches unhandled errors at the app level and reports to Sentry.
 * Provides a user-friendly error recovery experience.
 */

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    const router = useRouter();
    useEffect(() => {
        // Report error to Sentry
        Sentry.captureException(error);
    }, [error]);

    return (
        <html>
            <body>
                <div className="min-h-screen page-premium-enter texture-grain flex items-center justify-center bg-linear-to-b from-[var(--canvas)] to-[var(--surface-secondary)] px-4">
                    <div className="max-w-md w-full text-center">
                        {/* Error Icon */}
                        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-[color:var(--error)]/12 flex items-center justify-center">
                            <AlertTriangle className="w-10 h-10 text-[var(--error)]" />
                        </div>

                        {/* Error Message — copy follows docs/TERMINOLOGY.md */}
                        <h1 className="text-2xl font-bold text-[var(--ink-primary)] mb-2">
                            Unexpected error
                        </h1>
                        <p className="text-[var(--ink-secondary)] mb-6">
                            Your scores and trip data are safe on this device.
                            We’ve logged what happened — tap Try again to reload,
                            or head back home.
                        </p>

                        {/* Error Details (development only) */}
                        {process.env.NODE_ENV === 'development' && (
                            <div className="mb-6 p-4 rounded-lg text-left border border-[var(--rule)] bg-[var(--surface)]">
                                <p className="text-sm font-mono text-[var(--error)] break-all">
                                    {error.message}
                                </p>
                                {error.digest && (
                                    <p className="text-xs text-[var(--ink-tertiary)] mt-2">
                                        Error ID: {error.digest}
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-3 justify-center">
                            <Button
                                variant="secondary"
                                size="lg"
                                onClick={() => router.push('/')}
                            >
                                <Home className="w-4 h-4 mr-2" />
                                Go Home
                            </Button>
                            <Button variant="primary" size="lg" onClick={reset}>
                                <RefreshCw className="w-4 h-4 mr-2" />
                                Try Again
                            </Button>
                        </div>
                    </div>

                </div>
            </body>
        </html>
    );
}
