'use client';

/**
 * Offline Status Indicator
 *
 * Shows network status and sync state to users:
 * - Banner when offline (data saved locally)
 * - Quick indicator when back online
 * - Respects user's reduced motion preferences
 */

import { useState, useEffect } from 'react';
import { WifiOff, Wifi, CloudOff, Check } from 'lucide-react';
import { usePWA } from './PWAProvider';

type SyncStatus = 'offline' | 'online' | 'syncing' | 'synced';

export function OfflineIndicator() {
    const { isOnline } = usePWA();
    const [syncStatus, setSyncStatus] = useState<SyncStatus>(isOnline ? 'online' : 'offline');
    const [showBanner, setShowBanner] = useState(false);
    const [justCameOnline, setJustCameOnline] = useState(false);

    useEffect(() => {
        if (!isOnline) {
            setSyncStatus('offline');
            setShowBanner(true);
            setJustCameOnline(false);
        } else if (syncStatus === 'offline') {
            // Just came back online
            setSyncStatus('synced');
            setJustCameOnline(true);

            // Show "back online" message briefly
            setTimeout(() => {
                setShowBanner(false);
            }, 3000);

            // Hide "just came online" indicator after animation
            setTimeout(() => {
                setJustCameOnline(false);
            }, 4000);
        }
    }, [isOnline, syncStatus]);

    // Don't show anything if online and not just reconnected
    if (isOnline && !showBanner && !justCameOnline) {
        return null;
    }

    return (
        <>
            {/* Offline Banner */}
            {showBanner && (
                <div
                    className="fixed top-0 left-0 right-0 z-50 animate-in slide-in-from-top duration-300"
                    style={{
                        background: !isOnline
                            ? 'linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)'
                            : 'linear-gradient(135deg, var(--masters) 0%, #005238 100%)',
                        paddingTop: 'env(safe-area-inset-top)',
                    }}
                >
                    <div className="flex items-center justify-center gap-2 px-4 py-2">
                        {!isOnline ? (
                            <>
                                <WifiOff size={16} className="text-white" />
                                <span className="text-sm font-medium text-white">
                                    You're offline - changes saved locally
                                </span>
                            </>
                        ) : (
                            <>
                                <Check size={16} className="text-white" />
                                <span className="text-sm font-medium text-white">
                                    Back online
                                </span>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Small status pill (shows briefly when reconnecting) */}
            {justCameOnline && !showBanner && (
                <div
                    className="fixed top-4 right-4 z-50 flex items-center gap-2 px-3 py-1.5 rounded-full animate-in fade-in slide-in-from-top-2 duration-300"
                    style={{
                        background: 'var(--canvas-raised)',
                        border: '1px solid var(--rule)',
                    }}
                >
                    <Wifi size={14} style={{ color: 'var(--success)' }} />
                    <span
                        className="text-xs font-medium"
                        style={{ color: 'var(--ink)' }}
                    >
                        Online
                    </span>
                </div>
            )}
        </>
    );
}

/**
 * Compact offline indicator for headers
 */
export function OfflineChip() {
    const { isOnline } = usePWA();

    if (isOnline) return null;

    return (
        <div
            className="flex items-center gap-1.5 px-2 py-1 rounded-full"
            style={{
                background: 'rgba(220, 38, 38, 0.15)',
                border: '1px solid rgba(220, 38, 38, 0.3)',
            }}
        >
            <CloudOff size={12} style={{ color: '#DC2626' }} />
            <span className="text-xs font-medium" style={{ color: '#DC2626' }}>
                Offline
            </span>
        </div>
    );
}
