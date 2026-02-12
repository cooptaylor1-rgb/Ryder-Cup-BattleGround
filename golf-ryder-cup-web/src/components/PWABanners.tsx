'use client';

import { useState } from 'react';
import { usePWA } from './PWAProvider';

/**
 * Shows update banner when new version is available
 * and offline banner when internet is unavailable
 */
export function PWABanners() {
    const { isOnline, hasUpdate, updateApp } = usePWA();
    const [isDismissed, setIsDismissed] = useState(false);

    return (
        <>
            {/* Offline Banner */}
            {!isOnline && (
                <div className="fixed top-0 left-0 right-0 z-50 bg-[color:var(--warning)]/15 text-[var(--ink-primary)] border-b border-[color:var(--warning)]/25 px-4 py-2 text-center text-sm font-medium">
                    <span className="inline-flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414"
                            />
                        </svg>
                        You&apos;re offline — Changes will sync when back online
                    </span>
                </div>
            )}

            {/* Update Available Banner */}
            {hasUpdate && !isDismissed && (
                <div className="fixed bottom-20 left-4 right-4 z-50 sm:left-auto sm:right-4 sm:w-80">
                    <div className="bg-[var(--masters)] text-white rounded-lg shadow-lg p-4">
                        <div className="flex items-start gap-3">
                            <div className="shrink-0">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                                    />
                                </svg>
                            </div>
                            <div className="flex-1">
                                <h3 className="font-semibold">Update Available</h3>
                                <p className="text-sm text-white/80 mt-1">A new version of the app is ready.</p>
                                <div className="mt-3 flex gap-2">
                                    <button
                                        onClick={updateApp}
                                        className="bg-[var(--surface-raised)] text-[var(--masters)] px-3 py-1.5 rounded text-sm font-medium border border-[color:var(--rule)]/25 hover:bg-[var(--surface-secondary)] transition-colors"
                                    >
                                        Update Now
                                    </button>
                                    <button
                                        onClick={() => setIsDismissed(true)}
                                        className="text-white/80 px-3 py-1.5 rounded text-sm hover:text-white transition-colors"
                                    >
                                        Later
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
