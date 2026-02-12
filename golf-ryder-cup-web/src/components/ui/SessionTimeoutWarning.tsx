/**
 * Session Timeout Warning Dialog
 *
 * Displays a warning when the user's session is about to expire.
 * Allows users to extend their session or be informed of expiration.
 *
 * Features:
 * - Countdown timer display
 * - Visual severity indication (changes color as time decreases)
 * - Extend session button
 * - Accessible with proper ARIA attributes
 */

'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, AlertTriangle, LogOut, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './Button';
import {
  useSessionTimeout,
  formatTimeRemaining,
  getWarningSeverity,
  type SessionTimeoutOptions,
} from '@/lib/hooks/useSessionTimeout';
import { useHaptic } from '@/lib/hooks';

// ============================================
// TYPES
// ============================================

export interface SessionTimeoutWarningProps extends SessionTimeoutOptions {
  /** Custom class name for the warning container */
  className?: string;
  /** Custom title for the warning */
  title?: string;
  /** Custom message for the warning */
  message?: string;
  /** Label for the extend button */
  extendButtonLabel?: string;
  /** Label for the logout button (shown when expired) */
  logoutButtonLabel?: string;
  /** Handler for manual logout */
  onLogout?: () => void;
}

// ============================================
// COMPONENT
// ============================================

export function SessionTimeoutWarning({
  className,
  title = 'Session Expiring Soon',
  message = 'Your session will expire due to inactivity. Any unsaved changes may be lost.',
  extendButtonLabel = 'Stay Signed In',
  logoutButtonLabel = 'Sign Out Now',
  onLogout,
  ...timeoutOptions
}: SessionTimeoutWarningProps) {
  const haptic = useHaptic();
  const {
    isWarningShown,
    timeRemaining,
    extendSession,
    isExpired,
  } = useSessionTimeout(timeoutOptions);

  const severity = getWarningSeverity(timeRemaining);
  const formattedTime = formatTimeRemaining(timeRemaining);

  // Haptic feedback when warning shows
  useEffect(() => {
    if (isWarningShown && !isExpired) {
      haptic.warning();
    }
  }, [isWarningShown, isExpired, haptic]);

  // Haptic feedback when expired
  useEffect(() => {
    if (isExpired) {
      haptic.error();
    }
  }, [isExpired, haptic]);

  const severityStyles = {
    low: {
      bg: 'bg-warning/10',
      border: 'border-warning/30',
      text: 'text-warning',
      icon: 'text-warning',
    },
    medium: {
      bg: 'bg-warning/20',
      border: 'border-warning/50',
      text: 'text-warning',
      icon: 'text-warning',
    },
    high: {
      bg: 'bg-error/20',
      border: 'border-error/50',
      text: 'text-error',
      icon: 'text-error',
    },
    critical: {
      bg: 'bg-error/30',
      border: 'border-error/70',
      text: 'text-error',
      icon: 'text-error animate-pulse',
    },
  };

  const styles = severityStyles[severity];

  if (!isWarningShown && !isExpired) {
    return null;
  }

  return (
    <AnimatePresence>
      {(isWarningShown || isExpired) && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-9998"
            aria-hidden="true"
          />

          {/* Warning Dialog */}
          <motion.div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="session-warning-title"
            aria-describedby="session-warning-message"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', duration: 0.3 }}
            className={cn(
              'fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-9999',
              'w-full max-w-sm mx-4 p-6 rounded-2xl shadow-2xl',
              'border-2',
              styles.bg,
              styles.border,
              className
            )}
          >
            {/* Icon */}
            <div className="flex justify-center mb-4">
              {isExpired ? (
                <div className="p-3 rounded-full bg-error/20">
                  <LogOut className="w-8 h-8 text-error" />
                </div>
              ) : (
                <div className={cn('p-3 rounded-full', styles.bg)}>
                  <AlertTriangle className={cn('w-8 h-8', styles.icon)} />
                </div>
              )}
            </div>

            {/* Title */}
            <h2
              id="session-warning-title"
              className={cn('text-lg font-bold text-center mb-2', styles.text)}
            >
              {isExpired ? 'Session Expired' : title}
            </h2>

            {/* Message */}
            <p
              id="session-warning-message"
              className="text-sm text-center text-[var(--ink-secondary)] mb-4"
            >
              {isExpired
                ? 'Your session has expired due to inactivity. Please sign in again to continue.'
                : message}
            </p>

            {/* Countdown Timer */}
            {!isExpired && (
              <div className="flex items-center justify-center gap-2 mb-6">
                <Clock className={cn('w-5 h-5', styles.icon)} />
                <span className={cn('text-2xl font-mono font-bold tabular-nums', styles.text)}>
                  {formattedTime}
                </span>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col gap-3">
              {!isExpired ? (
                <>
                  <Button
                    variant="primary"
                    size="lg"
                    onClick={extendSession}
                    className="w-full"
                    autoFocus
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    {extendButtonLabel}
                  </Button>
                  {onLogout && (
                    <Button
                      variant="ghost"
                      size="md"
                      onClick={onLogout}
                      className="w-full text-[var(--ink-tertiary)]"
                    >
                      {logoutButtonLabel}
                    </Button>
                  )}
                </>
              ) : (
                <Button
                  variant="primary"
                  size="lg"
                  onClick={onLogout || timeoutOptions.onTimeout}
                  className="w-full"
                  autoFocus
                >
                  Sign In Again
                </Button>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default SessionTimeoutWarning;
