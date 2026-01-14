/**
 * Connection-Aware Data Fetching Hooks
 *
 * Smart data fetching that adapts to network conditions.
 * Automatically switches between online/offline strategies.
 *
 * Features:
 * - Automatic fallback to cached data when offline
 * - Stale-while-revalidate pattern
 * - Network quality detection
 * - Prefetching on good connections
 * - Background sync when coming online
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useUIStore } from '@/lib/stores';
import { db } from '@/lib/db';

// ============================================
// TYPES
// ============================================

export type ConnectionQuality = 'offline' | 'slow' | 'good' | 'fast';

export interface FetchOptions<T> {
  /** Cache key for storing/retrieving data */
  cacheKey: string;
  /** Function to fetch fresh data from server */
  fetchFn: () => Promise<T>;
  /** Function to load cached data from IndexedDB */
  cacheFn?: () => Promise<T | null>;
  /** Time in ms before cached data is considered stale */
  staleTime?: number;
  /** Whether to refetch on reconnect */
  refetchOnReconnect?: boolean;
  /** Whether to use stale-while-revalidate */
  staleWhileRevalidate?: boolean;
  /** Dependencies that trigger refetch */
  deps?: unknown[];
}

export interface ConnectionAwareResult<T> {
  data: T | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  isStale: boolean;
  isOffline: boolean;
  connectionQuality: ConnectionQuality;
  refetch: () => Promise<void>;
  lastUpdated: Date | null;
}

// ============================================
// CONNECTION QUALITY DETECTION
// ============================================

/**
 * Get current connection quality based on Network Information API
 */
export function getConnectionQuality(): ConnectionQuality {
  if (typeof navigator === 'undefined') return 'good';
  if (!navigator.onLine) return 'offline';

  // Use Network Information API if available
  const connection = (navigator as Navigator & {
    connection?: {
      effectiveType?: string;
      downlink?: number;
      rtt?: number;
      saveData?: boolean;
    };
  }).connection;

  if (!connection) return 'good';

  // Check for data saver mode
  if (connection.saveData) return 'slow';

  // Check effective connection type
  const effectiveType = connection.effectiveType;
  if (effectiveType === 'slow-2g' || effectiveType === '2g') return 'slow';
  if (effectiveType === '3g') return 'slow';
  if (effectiveType === '4g') return 'fast';

  // Fallback to checking downlink speed
  const downlink = connection.downlink;
  if (downlink !== undefined) {
    if (downlink < 0.5) return 'slow';
    if (downlink >= 5) return 'fast';
  }

  return 'good';
}

/**
 * Hook to track connection quality
 */
export function useConnectionQuality(): ConnectionQuality {
  const { isOnline } = useUIStore();
  const [quality, setQuality] = useState<ConnectionQuality>('good');

  useEffect(() => {
    if (!isOnline) {
      setQuality('offline');
      return;
    }

    setQuality(getConnectionQuality());

    // Listen for connection changes
    const connection = (navigator as Navigator & {
      connection?: EventTarget;
    }).connection;

    if (connection) {
      const handleChange = () => setQuality(getConnectionQuality());
      connection.addEventListener('change', handleChange);
      return () => connection.removeEventListener('change', handleChange);
    }
  }, [isOnline]);

  return quality;
}

// ============================================
// CACHE MANAGEMENT
// ============================================

const CACHE_PREFIX = 'fetch-cache:';
const CACHE_TIMESTAMP_PREFIX = 'fetch-cache-ts:';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

async function getCached<T>(key: string): Promise<CacheEntry<T> | null> {
  try {
    const meta = await db.syncMeta.get(CACHE_PREFIX + key);
    const timestampMeta = await db.syncMeta.get(CACHE_TIMESTAMP_PREFIX + key);

    if (meta?.value && timestampMeta?.value) {
      return {
        data: JSON.parse(meta.value) as T,
        timestamp: parseInt(timestampMeta.value, 10),
      };
    }
  } catch {
    // Fall back to localStorage
    const stored = localStorage.getItem(CACHE_PREFIX + key);
    const timestampStr = localStorage.getItem(CACHE_TIMESTAMP_PREFIX + key);
    if (stored && timestampStr) {
      return {
        data: JSON.parse(stored) as T,
        timestamp: parseInt(timestampStr, 10),
      };
    }
  }
  return null;
}

async function setCache<T>(key: string, data: T): Promise<void> {
  const timestamp = Date.now();
  const now = new Date().toISOString();
  try {
    await db.syncMeta.put({
      key: CACHE_PREFIX + key,
      value: JSON.stringify(data),
      updatedAt: now,
    });
    await db.syncMeta.put({
      key: CACHE_TIMESTAMP_PREFIX + key,
      value: String(timestamp),
      updatedAt: now,
    });
  } catch {
    // Fall back to localStorage
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(data));
    localStorage.setItem(CACHE_TIMESTAMP_PREFIX + key, String(timestamp));
  }
}

// ============================================
// MAIN HOOK
// ============================================

/**
 * Connection-aware data fetching hook
 *
 * Automatically handles offline/online states, caching,
 * and stale-while-revalidate pattern.
 */
export function useConnectionAwareFetch<T>({
  cacheKey,
  fetchFn,
  cacheFn,
  staleTime = 5 * 60 * 1000, // 5 minutes default
  refetchOnReconnect = true,
  staleWhileRevalidate = true,
  deps = [],
}: FetchOptions<T>): ConnectionAwareResult<T> {
  const { isOnline } = useUIStore();
  const connectionQuality = useConnectionQuality();

  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isStale, setIsStale] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const isMountedRef = useRef(true);
  const wasOfflineRef = useRef(!isOnline);

  // Fetch fresh data
  const fetchData = useCallback(async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    setIsError(false);
    setError(null);

    try {
      const freshData = await fetchFn();
      if (isMountedRef.current) {
        setData(freshData);
        setIsStale(false);
        setLastUpdated(new Date());
        await setCache(cacheKey, freshData);
      }
    } catch (err) {
      if (isMountedRef.current) {
        setIsError(true);
        setError(err instanceof Error ? err : new Error(String(err)));
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [cacheKey, fetchFn]);

  // Load cached data
  const loadCached = useCallback(async () => {
    // Try custom cache function first (e.g., direct DB query)
    if (cacheFn) {
      const cached = await cacheFn();
      if (cached && isMountedRef.current) {
        setData(cached);
        setIsStale(true);
        setIsLoading(false);
        return true;
      }
    }

    // Fall back to generic cache
    const cached = await getCached<T>(cacheKey);
    if (cached && isMountedRef.current) {
      setData(cached.data);
      setLastUpdated(new Date(cached.timestamp));

      // Check if stale
      const age = Date.now() - cached.timestamp;
      setIsStale(age > staleTime);
      setIsLoading(false);
      return true;
    }

    return false;
  }, [cacheKey, cacheFn, staleTime]);

  // Initial load
  useEffect(() => {
    isMountedRef.current = true;

    const init = async () => {
      const hasCached = await loadCached();

      if (isOnline) {
        // Stale-while-revalidate: show cached immediately, fetch in background
        if (hasCached && staleWhileRevalidate) {
          fetchData(false); // Don't show loading spinner
        } else {
          await fetchData(true);
        }
      } else if (!hasCached) {
        setIsLoading(false);
        setIsError(true);
        setError(new Error('No cached data available offline'));
      }
    };

    init();

    return () => {
      isMountedRef.current = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheKey, ...deps]);

  // Refetch on reconnect
  useEffect(() => {
    if (refetchOnReconnect && isOnline && wasOfflineRef.current) {
      fetchData(false);
    }
    wasOfflineRef.current = !isOnline;
  }, [isOnline, refetchOnReconnect, fetchData]);

  const refetch = useCallback(async () => {
    if (!isOnline) {
      await loadCached();
      return;
    }
    await fetchData(true);
  }, [isOnline, fetchData, loadCached]);

  return {
    data,
    isLoading,
    isError,
    error,
    isStale,
    isOffline: !isOnline,
    connectionQuality,
    refetch,
    lastUpdated,
  };
}

/**
 * Prefetch data on good connections
 */
export function usePrefetch<T>(
  cacheKey: string,
  fetchFn: () => Promise<T>,
  enabled = true
) {
  const connectionQuality = useConnectionQuality();

  useEffect(() => {
    if (!enabled) return;
    if (connectionQuality !== 'fast' && connectionQuality !== 'good') return;

    // Prefetch after a short delay
    const timer = setTimeout(async () => {
      try {
        const data = await fetchFn();
        await setCache(cacheKey, data);
      } catch {
        // Silently fail for prefetch
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [cacheKey, fetchFn, connectionQuality, enabled]);
}

/**
 * Hook for offline-first mutations
 */
export function useOfflineMutation<TData, TVariables>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options: {
    onSuccess?: (data: TData) => void;
    onError?: (error: Error) => void;
    onOffline?: (variables: TVariables) => void;
  } = {}
) {
  const { isOnline } = useUIStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = useCallback(async (variables: TVariables) => {
    setIsLoading(true);
    setError(null);

    if (!isOnline) {
      // Queue for later
      options.onOffline?.(variables);
      setIsLoading(false);
      return;
    }

    try {
      const result = await mutationFn(variables);
      options.onSuccess?.(result);
      return result;
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error(String(err));
      setError(errorObj);
      options.onError?.(errorObj);
    } finally {
      setIsLoading(false);
    }
  }, [isOnline, mutationFn, options]);

  return { mutate, isLoading, error };
}

export default useConnectionAwareFetch;
