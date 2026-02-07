'use client';

/**
 * Login Error Boundary
 *
 * Handles errors in login routes with context-specific messaging.
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

export default function LoginError({ error, reset }: ErrorPageProps) {
    useEffect(() => {
        Sentry.captureException(error, { tags: { feature: 'login' } });
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
                style={{
                    fontFamily: 'var(--font-serif)',
                    fontSize: 'clamp(1.5rem, 5vw, 2rem)',
                    fontWeight: 400,
                    fontStyle: 'italic',
                    color: 'var(--ink)',
                    marginBottom: 'var(--space-3)',
                }}
            >
                Something Went Wrong
            </h1>

            <p
                className="text-center max-w-md mb-8"
                style={{ color: 'var(--ink-secondary)' }}
            >
                Something went wrong during login. Please try again.
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
                    className="btn-premium press-scale"
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-2)',
                        padding: 'var(--space-3) var(--space-6)',
                        borderRadius: 'var(--radius-md)',
                        fontFamily: 'var(--font-sans)',
                        fontWeight: 600,
                        fontSize: 'var(--text-sm)',
                        background: 'var(--masters)',
                        color: 'white',
                        border: 'none',
                        cursor: 'pointer',
                    }}
                >
                    <RefreshCw size={18} />
                    Try Again
                </button>

                <Link
                    href="/"
                    className="press-scale"
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-2)',
                        padding: 'var(--space-3) var(--space-6)',
                        borderRadius: 'var(--radius-md)',
                        fontFamily: 'var(--font-sans)',
                        fontWeight: 500,
                        fontSize: 'var(--text-sm)',
                        background: 'var(--canvas-raised)',
                        border: '1px solid var(--rule)',
                        color: 'var(--ink)',
                        textDecoration: 'none',
                    }}
                >
                    <Home size={18} />
                    Go Home
                </Link>
            </div>
        </div>
    );
}
