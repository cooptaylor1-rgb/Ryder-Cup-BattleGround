/**
 * Toast Component
 *
 * Masters-inspired toast notifications.
 * Design principles:
 * - Subtle, not distracting
 * - Uses design system colors, not raw Tailwind
 * - Fade in/out with minimal translation
 * - Auto-dismiss with manual option
 */

'use client';

import { useUIStore } from '@/lib/stores';
import { cn } from '@/lib/utils';
import { X, Check, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { useState } from 'react';

interface ToastItemProps {
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  onDismiss: () => void;
}

function ToastItem({ type, message, onDismiss }: ToastItemProps) {
  const [isExiting, setIsExiting] = useState(false);

  const handleDismiss = () => {
    setIsExiting(true);
    setTimeout(onDismiss, 150);
  };

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
    },
    error: {
      background: 'var(--surface-card)',
      border: '1px solid var(--error)',
      iconColor: 'var(--error)',
    },
    info: {
      background: 'var(--surface-card)',
      border: '1px solid var(--masters-gold)',
      iconColor: 'var(--masters-gold)',
    },
    warning: {
      background: 'var(--surface-card)',
      border: '1px solid var(--warning)',
      iconColor: 'var(--warning)',
    },
  };

  const style = styles[type];

  return (
    <div
      className={cn(
        'flex items-center gap-3 px-4 py-3 rounded-lg',
        'min-w-[280px] max-w-[400px]',
        isExiting ? 'toast-exit' : 'toast-enter'
      )}
      style={{
        background: style.background,
        border: style.border,
        boxShadow: 'var(--shadow-card-lg)',
        color: 'var(--text-primary)',
      }}
      role="alert"
    >
      <Icon
        className="w-5 h-5 flex-shrink-0"
        style={{ color: style.iconColor }}
      />
      <p className="flex-1 text-sm font-medium">{message}</p>
      <button
        onClick={handleDismiss}
        className="p-1 rounded-full transition-opacity hover:opacity-70"
        style={{ color: 'var(--text-tertiary)' }}
        aria-label="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>
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
