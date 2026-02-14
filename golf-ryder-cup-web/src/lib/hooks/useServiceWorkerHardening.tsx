'use client';

import { useEffect, useCallback, useRef } from 'react';

/**
 * Detect if running on iOS Safari
 */
function isIOSSafari(): boolean {
  if (typeof window === 'undefined') return false;

  const ua = window.navigator.userAgent;
  const iOS = /iPad|iPhone|iPod/.test(ua);
  const webkit = /WebKit/.test(ua);
  const notCriOS = !/CriOS/.test(ua); // Not Chrome on iOS

  return iOS && webkit && notCriOS;
}

/**
 * Detect if running as installed PWA (standalone mode)
 */
function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;

  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

interface UseServiceWorkerOptions {
  /** Interval for keep-alive pings in milliseconds (default: 4 minutes) */
  keepAliveInterval?: number;
  /** Interval for cache refresh checks in milliseconds (default: 30 minutes) */
  cacheRefreshInterval?: number;
  /** Whether to enable aggressive iOS hardening (default: auto-detect iOS) */
  enableIOSHardening?: boolean;
}

interface CacheStatus {
  version: number;
  lastRefresh: number;
  caches: Array<{
    name: string;
    entries: number;
    urls: string[];
  }>;
}

/**
 * Hook for managing service worker lifecycle with iOS Safari hardening
 *
 * iOS Safari has aggressive cache eviction policies:
 * - Can evict caches after 7 days of inactivity
 * - Service worker can go idle and be killed
 * - IndexedDB may also be evicted
 *
 * This hook implements:
 * - Periodic keep-alive pings to keep SW active
 * - Regular cache refreshes to prevent eviction
 * - Visibility-based refresh triggers
 */
export function useServiceWorkerHardening(options: UseServiceWorkerOptions = {}) {
  const {
    keepAliveInterval = 4 * 60 * 1000, // 4 minutes (SW idle timeout is ~5 min)
    cacheRefreshInterval = 30 * 60 * 1000, // 30 minutes
    enableIOSHardening = isIOSSafari(),
  } = options;

  const keepAliveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cacheRefreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastVisibilityChangeRef = useRef(Date.now());

  /**
   * Send keep-alive ping to service worker
   */
  const sendKeepAlive = useCallback(async (): Promise<boolean> => {
    if (!('serviceWorker' in navigator)) return false;

    try {
      const registration = await navigator.serviceWorker.ready;
      const activeWorker = registration.active;
      if (!activeWorker) return false;

      return new Promise((resolve) => {
        const channel = new MessageChannel();
        channel.port1.onmessage = () => resolve(true);

        // Timeout after 5 seconds
        setTimeout(() => resolve(false), 5000);

        activeWorker.postMessage({ type: 'KEEP_ALIVE' }, [channel.port2]);
      });
    } catch (error) {
      // Keep-alive is best-effort; failures are expected when offline
      return false;
    }
  }, []);

  /**
   * Request cache refresh from service worker
   */
  const refreshCache = useCallback(async (): Promise<void> => {
    if (!('serviceWorker' in navigator)) return;

    try {
      const registration = await navigator.serviceWorker.ready;
      if (registration.active) {
        registration.active.postMessage({ type: 'REFRESH_CACHE' });
        // Cache refresh requested silently
      }
    } catch (error) {
      // Cache refresh is best-effort; failures are expected when offline
    }
  }, []);

  /**
   * Get cache status from service worker
   */
  const getCacheStatus = useCallback(async (): Promise<CacheStatus | null> => {
    if (!('serviceWorker' in navigator)) return null;

    try {
      const registration = await navigator.serviceWorker.ready;
      const activeWorker = registration.active;
      if (!activeWorker) return null;

      return new Promise((resolve) => {
        const channel = new MessageChannel();
        channel.port1.onmessage = (e) => resolve(e.data);

        // Timeout after 5 seconds
        setTimeout(() => resolve(null), 5000);

        activeWorker.postMessage({ type: 'GET_CACHE_STATUS' }, [channel.port2]);
      });
    } catch (error) {
      // Cache status check is best-effort
      return null;
    }
  }, []);

  // Set up iOS hardening
  useEffect(() => {
    if (!enableIOSHardening) return;
    if (typeof window === 'undefined') return;

    console.log('[SW Hardening] iOS Safari hardening enabled');

    // Keep-alive ping interval
    keepAliveTimerRef.current = setInterval(() => {
      sendKeepAlive();
    }, keepAliveInterval);

    // Cache refresh interval
    cacheRefreshTimerRef.current = setInterval(() => {
      refreshCache();
    }, cacheRefreshInterval);

    // Initial keep-alive
    sendKeepAlive();

    return () => {
      if (keepAliveTimerRef.current) {
        clearInterval(keepAliveTimerRef.current);
      }
      if (cacheRefreshTimerRef.current) {
        clearInterval(cacheRefreshTimerRef.current);
      }
    };
  }, [enableIOSHardening, keepAliveInterval, cacheRefreshInterval, sendKeepAlive, refreshCache]);

  // Refresh cache when app becomes visible after being hidden
  useEffect(() => {
    if (!enableIOSHardening) return;
    if (typeof window === 'undefined') return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const hiddenDuration = Date.now() - lastVisibilityChangeRef.current;

        // If hidden for more than 5 minutes, refresh cache
        if (hiddenDuration > 5 * 60 * 1000) {
          console.log(
            `[SW Hardening] App was hidden for ${Math.round(hiddenDuration / 1000)}s, refreshing cache`
          );
          refreshCache();
        }

        // Always send keep-alive when becoming visible
        sendKeepAlive();
      } else {
        lastVisibilityChangeRef.current = Date.now();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enableIOSHardening, refreshCache, sendKeepAlive]);

  // Refresh cache on page load if installed as PWA
  useEffect(() => {
    if (!enableIOSHardening) return;
    if (!isStandalone()) return;

    // Refresh cache on PWA launch
    const timeoutId = setTimeout(() => {
      refreshCache();
    }, 2000); // Slight delay to not block initial render

    return () => clearTimeout(timeoutId);
  }, [enableIOSHardening, refreshCache]);

  return {
    sendKeepAlive,
    refreshCache,
    getCacheStatus,
    isIOSSafari: enableIOSHardening,
    isStandalone: isStandalone(),
  };
}

/**
 * Provider component that initializes service worker hardening
 * Add this to your layout/app for automatic iOS Safari hardening
 */
export function ServiceWorkerHardeningProvider({ children }: { children: React.ReactNode }) {
  useServiceWorkerHardening();

  return <>{children}</>;
}
