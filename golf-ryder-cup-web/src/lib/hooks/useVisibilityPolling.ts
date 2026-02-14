/**
 * useVisibilityPolling Hook
 *
 * Smart polling that respects battery life by pausing
 * when the tab is hidden. Resumes immediately when visible.
 *
 * Features:
 * - Pauses polling when tab/window is hidden
 * - Immediate fetch on visibility restore
 * - Configurable intervals for active vs background
 * - Respects user's reduced motion preference for battery
 */

'use client';

import { useEffect, useRef, useCallback, useState } from 'react';

interface UseVisibilityPollingOptions {
  /** Polling interval when tab is visible (ms) */
  interval: number;
  /** Whether polling is enabled */
  enabled?: boolean;
  /** Callback when visibility changes */
  onVisibilityChange?: (isVisible: boolean) => void;
  /** Whether to fetch immediately on mount */
  fetchOnMount?: boolean;
  /** Whether to fetch immediately when becoming visible */
  fetchOnVisible?: boolean;
  /** Optional slower interval when battery saver is detected */
  reducedMotionInterval?: number;
}

interface UseVisibilityPollingReturn {
  /** Whether the tab is currently visible */
  isVisible: boolean;
  /** Whether polling is currently active */
  isPolling: boolean;
  /** Manually trigger a fetch */
  refetch: () => void;
  /** Pause polling */
  pause: () => void;
  /** Resume polling */
  resume: () => void;
}

/**
 * Hook for visibility-aware polling that saves battery
 */
export function useVisibilityPolling(
  fetchFn: () => Promise<void> | void,
  options: UseVisibilityPollingOptions
): UseVisibilityPollingReturn {
  const {
    interval,
    enabled = true,
    onVisibilityChange,
    fetchOnMount = true,
    fetchOnVisible = true,
    reducedMotionInterval,
  } = options;

  const [isVisible, setIsVisible] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const fetchFnRef = useRef(fetchFn);
  const lastFetchRef = useRef<number>(0);

  // Keep fetchFn ref updated
  useEffect(() => {
    fetchFnRef.current = fetchFn;
  }, [fetchFn]);

  // Check for reduced motion preference (often indicates battery saver)
  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  const effectiveInterval =
    prefersReducedMotion && reducedMotionInterval ? reducedMotionInterval : interval;

  const clearPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const doFetch = useCallback(async () => {
    try {
      lastFetchRef.current = Date.now();
      await fetchFnRef.current();
    } catch (error) {
      // Swallow — callers handle their own error states
    }
  }, []);

  const startPolling = useCallback(() => {
    clearPolling();
    if (enabled && !isPaused && isVisible) {
      intervalRef.current = setInterval(doFetch, effectiveInterval);
    }
  }, [clearPolling, doFetch, effectiveInterval, enabled, isPaused, isVisible]);

  // Handle visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      const visible = document.visibilityState === 'visible';
      setIsVisible(visible);
      onVisibilityChange?.(visible);

      if (visible && fetchOnVisible && enabled && !isPaused) {
        // Fetch immediately if enough time has passed
        const timeSinceLastFetch = Date.now() - lastFetchRef.current;
        if (timeSinceLastFetch > effectiveInterval / 2) {
          doFetch();
        }
      }
    };

    // Set initial state
    setIsVisible(document.visibilityState === 'visible');

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [doFetch, effectiveInterval, enabled, fetchOnVisible, isPaused, onVisibilityChange]);

  // Start/stop polling based on visibility and enabled state
  useEffect(() => {
    if (enabled && !isPaused && isVisible) {
      startPolling();
    } else {
      clearPolling();
    }

    return clearPolling;
  }, [clearPolling, enabled, isPaused, isVisible, startPolling]);

  // Initial fetch on mount only - intentionally empty deps
  // We only want this to run once when the component mounts
  useEffect(() => {
    if (fetchOnMount && enabled) {
      doFetch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Intentional: mount-only effect
  }, []);

  const refetch = useCallback(() => {
    doFetch();
  }, [doFetch]);

  const pause = useCallback(() => {
    setIsPaused(true);
  }, []);

  const resume = useCallback(() => {
    setIsPaused(false);
  }, []);

  return {
    isVisible,
    isPolling: enabled && !isPaused && isVisible,
    refetch,
    pause,
    resume,
  };
}

export default useVisibilityPolling;
