/**
 * Sync Status Indicator Component
 *
 * Shows the current sync state with visual feedback.
 * Displays pending changes, sync progress, and errors.
 *
 * Features:
 * - Real-time sync status
 * - Pending changes counter
 * - Tap to force sync
 * - Error state with retry
 */

'use client';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/lib/stores';
import { useShallow } from 'zustand/shallow';
import { Cloud, CloudOff, RefreshCw, Check, AlertTriangle, Upload } from 'lucide-react';
import { useSyncQueue } from '@/lib/hooks/useOptimistic';

type SyncState = 'synced' | 'pending' | 'syncing' | 'offline' | 'error';

interface SyncStatusProps {
  variant?: 'badge' | 'full' | 'minimal';
  className?: string;
  showLabel?: boolean;
}

export function SyncStatus({ variant = 'badge', className, showLabel = true }: SyncStatusProps) {
  const { isOnline } = useUIStore(useShallow((s) => ({ isOnline: s.isOnline })));
  const { pendingCount, isSyncing, processQueue } = useSyncQueue();

  // Determine current sync state
  const syncState: SyncState = (() => {
    if (!isOnline) return 'offline';
    if (isSyncing) return 'syncing';
    if (pendingCount > 0) return 'pending';
    return 'synced';
  })();

  const handleTap = () => {
    if (syncState === 'pending') {
      processQueue();
    }
  };

  if (variant === 'minimal') {
    return <SyncDot state={syncState} className={className} />;
  }

  if (variant === 'badge') {
    return (
      <SyncBadge
        state={syncState}
        pendingCount={pendingCount}
        onTap={handleTap}
        showLabel={showLabel}
        className={className}
      />
    );
  }

  return (
    <SyncFull
      state={syncState}
      pendingCount={pendingCount}
      onTap={handleTap}
      className={className}
    />
  );
}

// ============================================
// SUB-COMPONENTS
// ============================================

interface SyncDotProps {
  state: SyncState;
  className?: string;
}

function SyncDot({ state, className }: SyncDotProps) {
  const colors: Record<SyncState, string> = {
    synced: 'var(--success)',
    pending: 'var(--warning)',
    syncing: 'var(--info)',
    offline: 'var(--ink-tertiary)',
    error: 'var(--error)',
  };

  return (
    <span
      className={cn(
        'inline-block w-2 h-2 rounded-full',
        state === 'syncing' && 'animate-pulse',
        className
      )}
      style={{ background: colors[state] }}
      aria-label={`Sync status: ${state}`}
    />
  );
}

interface SyncBadgeProps {
  state: SyncState;
  pendingCount: number;
  onTap: () => void;
  showLabel: boolean;
  className?: string;
}

function SyncBadge({ state, pendingCount, onTap, showLabel, className }: SyncBadgeProps) {
  const config = {
    synced: {
      icon: <Check className="w-3.5 h-3.5" />,
      label: 'Cloud saved',
      color: 'var(--success)',
      bg: 'color-mix(in srgb, var(--success) 12%, transparent)',
      border: 'color-mix(in srgb, var(--success) 25%, transparent)',
    },
    pending: {
      icon: <Upload className="w-3.5 h-3.5" />,
      label: `${pendingCount} waiting`,
      color: 'var(--warning)',
      bg: 'color-mix(in srgb, var(--warning) 12%, transparent)',
      border: 'color-mix(in srgb, var(--warning) 25%, transparent)',
    },
    syncing: {
      icon: <RefreshCw className="w-3.5 h-3.5 animate-spin" />,
      label: 'Saving...',
      color: 'var(--info)',
      bg: 'color-mix(in srgb, var(--info) 12%, transparent)',
      border: 'color-mix(in srgb, var(--info) 25%, transparent)',
    },
    offline: {
      icon: <CloudOff className="w-3.5 h-3.5" />,
      label: 'Offline',
      color: 'var(--ink-tertiary)',
      bg: 'var(--surface)',
      border: 'var(--rule)',
    },
    error: {
      icon: <AlertTriangle className="w-3.5 h-3.5" />,
      label: 'Retry needed',
      color: 'var(--error)',
      bg: 'color-mix(in srgb, var(--error) 12%, transparent)',
      border: 'color-mix(in srgb, var(--error) 25%, transparent)',
    },
  };

  const { icon, label, color, bg, border } = config[state];
  const isInteractive = state === 'pending' || state === 'error';

  return (
    <button
      type="button"
      onClick={onTap}
      disabled={!isInteractive}
      className={cn(
        'inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 py-1',
        'text-xs font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)]',
        isInteractive && 'cursor-pointer hover:scale-105 active:scale-95',
        !isInteractive && 'cursor-default',
        className
      )}
      style={{
        background: bg,
        color,
        border: `1px solid ${border}`,
      }}
      aria-label={label}
    >
      {icon}
      {showLabel && <span>{label}</span>}
    </button>
  );
}

interface SyncFullProps {
  state: SyncState;
  pendingCount: number;
  onTap: () => void;
  className?: string;
}

function SyncFull({ state, pendingCount, onTap, className }: SyncFullProps) {
  const config = {
    synced: {
      icon: <Cloud className="w-5 h-5" />,
      title: 'Cloud saved',
      subtitle: 'No changes waiting',
      color: 'var(--success)',
    },
    pending: {
      icon: <Upload className="w-5 h-5" />,
      title: `${pendingCount} changes waiting`,
      subtitle: 'Tap to save now',
      color: 'var(--warning)',
    },
    syncing: {
      icon: <RefreshCw className="w-5 h-5 animate-spin" />,
      title: 'Saving...',
      subtitle: 'Keeping this trip up to date',
      color: 'var(--info)',
    },
    offline: {
      icon: <CloudOff className="w-5 h-5" />,
      title: "You're offline",
      subtitle:
        pendingCount > 0
          ? `${pendingCount} saved changes will sync when online`
          : 'Saved changes will sync when online',
      color: 'var(--ink-tertiary)',
    },
    error: {
      icon: <AlertTriangle className="w-5 h-5" />,
      title: 'Retry needed',
      subtitle: 'Tap to retry',
      color: 'var(--error)',
    },
  };

  const { icon, title, subtitle, color } = config[state];
  const isInteractive = state === 'pending' || state === 'error';

  return (
    <button
      type="button"
      onClick={onTap}
      disabled={!isInteractive}
      className={cn(
        'flex min-h-16 w-full items-center gap-4 rounded-xl p-4 text-left',
        'transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)]',
        isInteractive && 'cursor-pointer active:scale-[0.98]',
        !isInteractive && 'cursor-default',
        className
      )}
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--rule)',
      }}
    >
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center"
        style={{
          background: `color-mix(in srgb, ${color} 12%, transparent)`,
          color,
        }}
      >
        {icon}
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm" style={{ color: 'var(--ink)' }}>
          {title}
        </p>
        <p className="text-xs mt-0.5" style={{ color: 'var(--ink-secondary)' }}>
          {subtitle}
        </p>
      </div>

      {/* Progress ring for syncing */}
      {state === 'syncing' && (
        <div className="w-8 h-8 relative">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 32 32">
            <circle cx="16" cy="16" r="14" fill="none" stroke="var(--rule)" strokeWidth="3" />
            <circle
              cx="16"
              cy="16"
              r="14"
              fill="none"
              stroke={color}
              strokeWidth="3"
              strokeDasharray="88"
              strokeDashoffset="22"
              className="animate-pulse"
            />
          </svg>
        </div>
      )}
    </button>
  );
}

/**
 * Floating sync status indicator
 * Shows at bottom of screen when changes are pending
 */
interface FloatingSyncStatusProps {
  className?: string;
}

export function FloatingSyncStatus({ className }: FloatingSyncStatusProps) {
  const { isOnline } = useUIStore(useShallow((s) => ({ isOnline: s.isOnline })));
  const { pendingCount, isSyncing, processQueue: _processQueue } = useSyncQueue();

  // Don't show if everything is synced
  if (isOnline && pendingCount === 0 && !isSyncing) return null;

  const _state: SyncState = !isOnline ? 'offline' : isSyncing ? 'syncing' : 'pending';

  return (
    <div
      className={cn(
        'fixed bottom-[calc(5rem+env(safe-area-inset-bottom,0px))] left-4 right-4 z-40',
        'animate-slide-up',
        className
      )}
    >
      <SyncStatus variant="full" />
    </div>
  );
}

export default SyncStatus;
