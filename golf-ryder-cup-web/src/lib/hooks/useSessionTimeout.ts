/**
 * Session Timeout Hook
 *
 * Monitors user activity and provides session management:
 * - Tracks user interaction (mouse, keyboard, touch, scroll)
 * - Shows warning dialog before timeout
 * - Auto-extends session on activity
 * - Executes callback when session expires
 *
 * @example
 * const { isWarningShown, timeRemaining, extendSession } = useSessionTimeout({
 *   timeout: 30 * 60 * 1000, // 30 minutes
 *   warningTime: 5 * 60 * 1000, // 5 minute warning
 *   onTimeout: () => signOut(),
 * });
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

// ============================================
// TYPES
// ============================================

export interface SessionTimeoutOptions {
  /** Total session timeout in milliseconds (default: 30 minutes) */
  timeout?: number;
  /** Time before timeout to show warning in milliseconds (default: 5 minutes) */
  warningTime?: number;
  /** Callback when session expires */
  onTimeout: () => void;
  /** Callback when warning is shown */
  onWarning?: () => void;
  /** Events that count as user activity */
  activityEvents?: string[];
  /** Whether the session timeout is enabled */
  enabled?: boolean;
  /** Minimum time between activity checks (debounce) */
  debounceMs?: number;
}

export interface SessionTimeoutState {
  /** Whether the warning dialog should be shown */
  isWarningShown: boolean;
  /** Time remaining until timeout in milliseconds */
  timeRemaining: number;
  /** Last activity timestamp */
  lastActivity: number;
  /** Manually extend the session */
  extendSession: () => void;
  /** Reset the session timer */
  resetTimer: () => void;
  /** Whether the session has expired */
  isExpired: boolean;
}

// ============================================
// CONSTANTS
// ============================================

const DEFAULT_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const DEFAULT_WARNING_TIME = 5 * 60 * 1000; // 5 minutes
const DEFAULT_DEBOUNCE = 1000; // 1 second
const UPDATE_INTERVAL = 1000; // Update countdown every second

const DEFAULT_ACTIVITY_EVENTS = [
  'mousedown',
  'mousemove',
  'keydown',
  'touchstart',
  'scroll',
  'wheel',
  'click',
];

// ============================================
// HOOK
// ============================================

export function useSessionTimeout(options: SessionTimeoutOptions): SessionTimeoutState {
  const {
    timeout = DEFAULT_TIMEOUT,
    warningTime = DEFAULT_WARNING_TIME,
    onTimeout,
    onWarning,
    activityEvents = DEFAULT_ACTIVITY_EVENTS,
    enabled = true,
    debounceMs = DEFAULT_DEBOUNCE,
  } = options;

  // Use a callback to avoid calling Date.now() during render
  const [lastActivity, setLastActivity] = useState(() => Date.now());
  const [timeRemaining, setTimeRemaining] = useState(timeout);
  const [isWarningShown, setIsWarningShown] = useState(false);
  const [isExpired, setIsExpired] = useState(false);

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const warningRef = useRef<NodeJS.Timeout | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef(lastActivity);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const hasCalledWarningRef = useRef(false);
  const hasCalledTimeoutRef = useRef(false);

  // Update last activity (debounced)
  const updateActivity = useCallback(() => {
    if (debounceRef.current) {
      return;
    }

    const now = Date.now();
    setLastActivity(now);
    lastActivityRef.current = now;
    setIsWarningShown(false);
    hasCalledWarningRef.current = false;

    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
    }, debounceMs);
  }, [debounceMs]);

  // Extend session manually
  const extendSession = useCallback(() => {
    updateActivity();
  }, [updateActivity]);

  // Reset the timer completely
  const resetTimer = useCallback(() => {
    setIsExpired(false);
    hasCalledTimeoutRef.current = false;
    hasCalledWarningRef.current = false;
    updateActivity();
  }, [updateActivity]);

  // Setup activity listeners
  useEffect(() => {
    if (!enabled) return;

    // Add activity event listeners
    activityEvents.forEach((event) => {
      window.addEventListener(event, updateActivity, { passive: true });
    });

    // Handle visibility change - pause when hidden, resume when visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // User returned - check if session should have expired
        const elapsed = Date.now() - lastActivityRef.current;
        if (elapsed >= timeout && !hasCalledTimeoutRef.current) {
          hasCalledTimeoutRef.current = true;
          setIsExpired(true);
          onTimeout();
        } else if (!isExpired) {
          // Reset warning state if not expired
          setIsWarningShown(elapsed >= timeout - warningTime);
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      activityEvents.forEach((event) => {
        window.removeEventListener(event, updateActivity);
      });
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, activityEvents, updateActivity, timeout, warningTime, onTimeout, isExpired]);

  // Main timer logic
  useEffect(() => {
    if (!enabled || isExpired) return;

    // Clear existing timers
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (warningRef.current) clearTimeout(warningRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);

    const elapsed = Date.now() - lastActivity;
    const remaining = Math.max(0, timeout - elapsed);
    const warningAt = Math.max(0, remaining - warningTime);

    setTimeRemaining(remaining);

    // Set warning timer
    if (warningAt > 0) {
      warningRef.current = setTimeout(() => {
        if (!hasCalledWarningRef.current) {
          hasCalledWarningRef.current = true;
          setIsWarningShown(true);
          onWarning?.();
        }
      }, warningAt);
    } else if (remaining > 0 && !hasCalledWarningRef.current) {
      // Already in warning period
      hasCalledWarningRef.current = true;
      setIsWarningShown(true);
      onWarning?.();
    }

    // Set timeout timer
    if (remaining > 0) {
      timeoutRef.current = setTimeout(() => {
        if (!hasCalledTimeoutRef.current) {
          hasCalledTimeoutRef.current = true;
          setIsExpired(true);
          setTimeRemaining(0);
          onTimeout();
        }
      }, remaining);
    }

    // Update countdown every second when warning is shown
    intervalRef.current = setInterval(() => {
      const newRemaining = Math.max(0, timeout - (Date.now() - lastActivityRef.current));
      setTimeRemaining(newRemaining);

      if (newRemaining <= warningTime && !hasCalledWarningRef.current) {
        hasCalledWarningRef.current = true;
        setIsWarningShown(true);
        onWarning?.();
      }
    }, UPDATE_INTERVAL);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (warningRef.current) clearTimeout(warningRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [enabled, lastActivity, timeout, warningTime, onTimeout, onWarning, isExpired]);

  return {
    isWarningShown,
    timeRemaining,
    lastActivity,
    extendSession,
    resetTimer,
    isExpired,
  };
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Format time remaining as human-readable string
 */
export function formatTimeRemaining(ms: number): string {
  if (ms <= 0) return 'Session expired';

  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  }

  if (minutes > 0) {
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  }

  return `${seconds}s`;
}

/**
 * Get warning severity based on time remaining
 */
export function getWarningSeverity(ms: number): 'low' | 'medium' | 'high' | 'critical' {
  const minutes = ms / 60000;
  if (minutes <= 1) return 'critical';
  if (minutes <= 2) return 'high';
  if (minutes <= 3) return 'medium';
  return 'low';
}

export default useSessionTimeout;
