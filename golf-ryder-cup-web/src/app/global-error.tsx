'use client';

/**
 * Global Error Page
 *
 * Catches unhandled errors at the app level and reports to Sentry.
 * Provides a user-friendly error recovery experience.
 */

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';
import { Button } from '@/components/ui';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { BottomNav } from '@/components/layout';

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // Report error to Sentry
        Sentry.captureException(error);
    }, [error]);

    return (
        <html>
            <body>
                <div className="min-h-screen pb-nav page-premium-enter texture-grain flex items-center justify-center bg-linear-to-b from-surface-50 to-surface-100 px-4">
                    <div className="max-w-md w-full text-center">
                        {/* Error Icon */}
                        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-100 flex items-center justify-center">
                            <AlertTriangle className="w-10 h-10 text-red-600" />
                        </div>

                        {/* Error Message */}
                        <h1 className="text-2xl font-bold text-surface-900 mb-2">
                            Something went wrong
                        </h1>
                        <p className="text-surface-600 mb-6">
                            We&apos;ve been notified and are working to fix the issue.
                            Please try again or return to the home page.
                        </p>

                        {/* Error Details (development only) */}
                        {process.env.NODE_ENV === 'development' && (
                            <div className="mb-6 p-4 bg-surface-100 rounded-lg text-left">
                                <p className="text-sm font-mono text-red-600 break-all">
                                    {error.message}
                                </p>
                                {error.digest && (
                                    <p className="text-xs text-surface-500 mt-2">
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
                                onClick={() => {
                                    window.location.href = '/';
                                }}
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

                    <BottomNav />
                </div>
            </body>
        </html>
    );
}
