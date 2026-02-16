'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import {
  syncPendingScores,
  hasPendingScores,
  getPendingScoreCount,
} from '@/lib/services/backgroundSyncService';
import { syncLogger } from '@/lib/utils/logger';

/**
 * Check if Background Sync API is supported
 */
function isBackgroundSyncSupported(): boolean {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'SyncManager' in window;
}

/**
 * Detect iOS Safari
 */
function isIOSSafari(): boolean {
  if (typeof window === 'undefined') return false;

  const ua = window.navigator.userAgent;
  const iOS = /iPad|iPhone|iPod/.test(ua);
  const webkit = /WebKit/.test(ua);
  const notCriOS = !/CriOS/.test(ua);

  return iOS && webkit && notCriOS;
}

interface UseBackgroundSyncFallbackOptions {
  /** Polling interval when online and have pending items (default: 30 seconds) */
  pollingInterval?: number;
  /** Whether to enable fallback (default: auto-detect based on Background Sync support) */
  enableFallback?: boolean;
  /** Callback when sync completes */
  onSyncComplete?: (result: { synced: number; failed: number }) => void;
  /** Callback when sync fails */
  onSyncError?: (error: Error) => void;
}

interface SyncState {
  isSyncing: boolean;
  lastSyncTime: number | null;
  lastSyncResult: { synced: number; failed: number } | null;
  pendingCount: number;
  isOnline: boolean;
}

/**
 * Hook for Background Sync with iOS fallback
 *
 * iOS Safari doesn't support the Background Sync API, so this hook provides:
 * - Polling-based sync when online
 * - Sync on visibility change (app comes to foreground)
 * - Sync on online event
 * - Sync on page load
 *
 * For browsers with Background Sync support, this hook is a no-op
 * (the service worker handles sync)
 */
export function useBackgroundSyncFallback(options: UseBackgroundSyncFallbackOptions = {}) {
  const {
    pollingInterval = 30 * 1000, // 30 seconds
    enableFallback = !isBackgroundSyncSupported(),
    onSyncComplete,
    onSyncError,
  } = options;

  const [syncState, setSyncState] = useState<SyncState>({
    isSyncing: false,
    lastSyncTime: null,
    lastSyncResult: null,
    pendingCount: 0,
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  });

  const isSyncingRef = useRef(false);
  const pollingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastVisibilityChangeRef = useRef(Date.now());

  /**
   * Perform sync operation
   */
  const performSync = useCallback(
    async (reason: string): Promise<void> => {
      // Prevent concurrent syncs
      if (isSyncingRef.current) {
        syncLogger.info(`[iOS Sync Fallback] Skipping sync (${reason}), already in progress`);
        return;
      }

      // Check if there's anything to sync
      const hasPending = await hasPendingScores();
      if (!hasPending) {
        syncLogger.info(`[iOS Sync Fallback] No pending items to sync (${reason})`);
        return;
      }

      // Check if online
      if (!navigator.onLine) {
        syncLogger.info(`[iOS Sync Fallback] Skipping sync (${reason}), offline`);
        return;
      }

      isSyncingRef.current = true;
      setSyncState((prev) => ({ ...prev, isSyncing: true }));

      try {
        syncLogger.info(`[iOS Sync Fallback] Starting sync: ${reason}`);
        const result = await syncPendingScores();

        setSyncState((prev) => ({
          ...prev,
          isSyncing: false,
          lastSyncTime: Date.now(),
          lastSyncResult: { synced: result.synced, failed: result.failed },
          pendingCount: result.failed,
        }));

        syncLogger.info(
          `[iOS Sync Fallback] Sync complete: ${result.synced} synced, ${result.failed} failed`
        );
        onSyncComplete?.({ synced: result.synced, failed: result.failed });
      } catch (error) {
        setSyncState((prev) => ({ ...prev, isSyncing: false }));
        syncLogger.error(`[iOS Sync Fallback] Sync failed:`, error);
        onSyncError?.(error instanceof Error ? error : new Error('Sync failed'));
      } finally {
        isSyncingRef.current = false;
      }
    },
    [onSyncComplete, onSyncError]
  );

  /**
   * Update pending count
   */
  const updatePendingCount = useCallback(async () => {
    try {
      const count = await getPendingScoreCount();
      setSyncState((prev) => ({ ...prev, pendingCount: count }));
    } catch {
      // Ignore errors during count update
    }
  }, []);

  /**
   * Manual sync trigger
   */
  const triggerSync = useCallback(async () => {
    await performSync('manual');
  }, [performSync]);

  // Set up iOS fallback behavior
  useEffect(() => {
    if (!enableFallback) {
      syncLogger.info('[iOS Sync Fallback] Native Background Sync supported, fallback disabled');
      return;
    }

    syncLogger.info('[iOS Sync Fallback] Background Sync fallback enabled');

    // Initial pending count check
    updatePendingCount();

    // Handle online/offline events
    const handleOnline = () => {
      syncLogger.info('[iOS Sync Fallback] Device came online');
      setSyncState((prev) => ({ ...prev, isOnline: true }));
      // Sync after a short delay to ensure connection is stable
      setTimeout(() => performSync('online'), 1000);
    };

    const handleOffline = () => {
      syncLogger.info('[iOS Sync Fallback] Device went offline');
      setSyncState((prev) => ({ ...prev, isOnline: false }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Handle visibility changes (app foreground/background)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const hiddenDuration = Date.now() - lastVisibilityChangeRef.current;

        // Sync if app was in background for more than 30 seconds
        if (hiddenDuration > 30 * 1000) {
          syncLogger.info(
            `[iOS Sync Fallback] App visible after ${Math.round(hiddenDuration / 1000)}s`
          );
          performSync('visibility');
        }

        // Also update pending count
        updatePendingCount();
      } else {
        lastVisibilityChangeRef.current = Date.now();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Polling for sync (only when online and not already syncing)
    pollingTimerRef.current = setInterval(async () => {
      if (!isSyncingRef.current && navigator.onLine) {
        const hasPending = await hasPendingScores();
        if (hasPending) {
          performSync('polling');
        }
      }
    }, pollingInterval);

    // Initial sync attempt on mount
    if (navigator.onLine) {
      performSync('initial');
    }

    // Listen for sync complete messages from service worker
    const handleSWMessage = (event: MessageEvent) => {
      if (event.data?.type === 'SYNC_COMPLETE') {
        syncLogger.info('[iOS Sync Fallback] Received SYNC_COMPLETE from service worker');
        updatePendingCount();
      }
    };

    navigator.serviceWorker?.addEventListener('message', handleSWMessage);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      navigator.serviceWorker?.removeEventListener('message', handleSWMessage);

      if (pollingTimerRef.current) {
        clearInterval(pollingTimerRef.current);
      }
    };
  }, [enableFallback, pollingInterval, performSync, updatePendingCount]);

  // Update sync state with isIOSSafari flag
  return {
    ...syncState,
    isIOSSafari: isIOSSafari(),
    isBackgroundSyncSupported: isBackgroundSyncSupported(),
    triggerSync,
    updatePendingCount,
  };
}

/**
 * Provider component that initializes Background Sync fallback
 * Add this to your app for automatic iOS sync handling
 */
export function BackgroundSyncFallbackProvider({ children }: { children: React.ReactNode }) {
  useBackgroundSyncFallback();

  return <>{children}</>;
}
