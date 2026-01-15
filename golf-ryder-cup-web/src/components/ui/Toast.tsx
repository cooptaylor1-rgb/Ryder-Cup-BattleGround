/**
 * Toast Component
 *
 * Masters-inspired toast notifications.
 * Design principles:
 * - Subtle, not distracting
 * - Uses design system colors, not raw Tailwind
 * - Fade in/out with minimal translation
 * - Auto-dismiss with visible progress indicator
 * - Pause on hover for user control
 */

'use client';

import { useUIStore } from '@/lib/stores';
import { cn } from '@/lib/utils';
import { X, Check, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { useState, useEffect, useRef, useCallback } from 'react';

interface ToastItemProps {
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  onDismiss: () => void;
  duration?: number;
}

/**
 * Progress bar showing auto-dismiss countdown
 * Pauses when toast is hovered
 */
function ToastProgress({
  duration,
  isPaused,
  color,
  onComplete,
}: {
  duration: number;
  isPaused: boolean;
  color: string;
  onComplete: () => void;
}) {
  const [progress, setProgress] = useState(100);
  const startTimeRef = useRef(Date.now());
  const remainingRef = useRef(duration);

  useEffect(() => {
    if (isPaused) {
      // Save remaining time when paused
      remainingRef.current = (progress / 100) * duration;
      return;
    }

    // Resume countdown
    startTimeRef.current = Date.now();
    const startProgress = progress;

    const animate = () => {
      const elapsed = Date.now() - startTimeRef.current;
      const newProgress = Math.max(0, startProgress - (elapsed / duration) * 100);

      if (newProgress <= 0) {
        setProgress(0);
        onComplete();
        return;
      }

      setProgress(newProgress);
      requestAnimationFrame(animate);
    };

    const frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, [isPaused, duration, onComplete, progress]);

  return (
    <div
      className="absolute bottom-0 left-0 right-0 h-1 rounded-b-lg overflow-hidden bg-black/15 dark:bg-white/15"
    >
      <div
        className="h-full"
        style={{
          width: `${progress}%`,
          background: color,
          opacity: 0.7,
          transition: isPaused ? 'width 0.1s ease-out' : 'none',
        }}
      />
    </div>
  );
}

function ToastItem({ type, message, onDismiss, duration = 4000 }: ToastItemProps) {
  const [isExiting, setIsExiting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const handleDismiss = useCallback(() => {
    if (isExiting) return;
    setIsExiting(true);
    setTimeout(onDismiss, 150);
  }, [isExiting, onDismiss]);

  const icons = {
    success: Check,
    error: AlertCircle,
    info: Info,
    warning: AlertTriangle,
  };

  const Icon = icons[type];

  // Design system colors - subtle, not loud
  const styles = {
    success: {
      background: 'var(--surface-card)',
      border: '1px solid var(--success)',
      iconColor: 'var(--success)',
      progressColor: 'var(--success)',
    },
    error: {
      background: 'var(--surface-card)',
      border: '1px solid var(--error)',
      iconColor: 'var(--error)',
      progressColor: 'var(--error)',
    },
    info: {
      background: 'var(--surface-card)',
      border: '1px solid var(--masters-gold)',
      iconColor: 'var(--masters-gold)',
      progressColor: 'var(--masters-gold)',
    },
    warning: {
      background: 'var(--surface-card)',
      border: '1px solid var(--warning)',
      iconColor: 'var(--warning)',
      progressColor: 'var(--warning)',
    },
  };

  const style = styles[type];

  return (
    <div
      className={cn(
        'relative flex items-center gap-3 px-4 py-3 pb-4 rounded-lg',
        'min-w-[280px] max-w-[400px]',
        'transition-transform duration-150',
        isPaused && 'scale-[1.02]',
        isExiting ? 'toast-exit' : 'toast-enter'
      )}
      style={{
        background: style.background,
        border: style.border,
        boxShadow: 'var(--shadow-card-lg)',
        color: 'var(--text-primary)',
      }}
      role="alert"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <Icon
        className="w-5 h-5 flex-shrink-0"
        style={{ color: style.iconColor }}
      />
      <p className="flex-1 text-sm font-medium">{message}</p>
      <button
        onClick={handleDismiss}
        className={cn(
          'p-1.5 rounded-full',
          'transition-transform duration-150 ease-out',
          'hover:scale-110 active:scale-90',
          'hover:bg-surface-highlight',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold'
        )}
        style={{ color: 'var(--text-tertiary)' }}
        aria-label="Dismiss notification"
      >
        <X className="w-4 h-4" />
      </button>
      {/* Progress indicator - pauses on hover */}
      <ToastProgress
        duration={duration}
        isPaused={isPaused}
        color={style.progressColor}
        onComplete={handleDismiss}
      />
    </div>
  );
}

export function ToastContainer() {
  const { toasts, dismissToast } = useUIStore();

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 lg:bottom-8"
      aria-live="polite"
      aria-label="Notifications"
    >
      {toasts.map(toast => (
        <ToastItem
          key={toast.id}
          type={toast.type}
          message={toast.message}
          onDismiss={() => dismissToast(toast.id)}
        />
      ))}
    </div>
  );
}
