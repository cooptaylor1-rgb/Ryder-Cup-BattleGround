/**
 * useOnlineStatus Hook
 *
 * Tracks online/offline status and syncs with UI store.
 * Shows toast notifications on status changes.
 */

'use client';

import { useEffect, useState } from 'react';
import { useUIStore } from '../stores';

/**
 * Hook to track online/offline status
 *
 * @returns Current online status
 */
export function useOnlineStatus(): boolean {
    const { isOnline, setOnlineStatus } = useUIStore();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);

        // Set initial status
        setOnlineStatus(navigator.onLine);

        // Listen for online/offline events
        const handleOnline = () => setOnlineStatus(true);
        const handleOffline = () => setOnlineStatus(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [setOnlineStatus]);

    // Return true on server/before mount to avoid hydration mismatch
    if (!mounted) return true;

    return isOnline;
}

export default useOnlineStatus;
