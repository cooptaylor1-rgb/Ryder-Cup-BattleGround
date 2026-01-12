/**
 * Offline Indicator Component
 *
 * Shows a banner when the app is offline.
 * Positioned at top of viewport, doesn't block interaction.
 */

'use client';

import { useOnlineStatus } from '@/lib/hooks';
import { WifiOff, Wifi } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';

export function OfflineIndicator() {
    const isOnline = useOnlineStatus();
    const [show, setShow] = useState(false);
    const [wasOffline, setWasOffline] = useState(false);

    useEffect(() => {
        if (!isOnline) {
            setShow(true);
            setWasOffline(true);
        } else if (wasOffline) {
            // Show "back online" briefly
            setShow(true);
            const timer = setTimeout(() => {
                setShow(false);
                setWasOffline(false);
            }, 2000);
            return () => clearTimeout(timer);
        }
    }, [isOnline, wasOffline]);

    if (!show) return null;

    return (
        <div
            className={cn(
                'fixed top-0 left-0 right-0 z-50',
                'px-4 py-2 text-center text-sm font-medium',
                'transition-all duration-300 ease-out',
                'flex items-center justify-center gap-2',
                isOnline
                    ? 'bg-green-600 text-white'
                    : 'bg-yellow-500 text-yellow-900'
            )}
            role="status"
            aria-live="polite"
        >
            {isOnline ? (
                <>
                    <Wifi className="w-4 h-4" />
                    <span>Back online - syncing...</span>
                </>
            ) : (
                <>
                    <WifiOff className="w-4 h-4" />
                    <span>You&apos;re offline - scores saved locally</span>
                </>
            )}
        </div>
    );
}

export default OfflineIndicator;
