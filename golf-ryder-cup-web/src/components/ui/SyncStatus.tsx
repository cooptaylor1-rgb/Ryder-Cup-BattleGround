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

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/lib/stores';
import {
  Cloud,
  CloudOff,
  RefreshCw,
  Check,
  AlertTriangle,
  Upload,
} from 'lucide-react';
import { useSyncQueue } from '@/lib/hooks/useOptimistic';

type SyncState = 'synced' | 'pending' | 'syncing' | 'offline' | 'error';

interface SyncStatusProps {
  variant?: 'badge' | 'full' | 'minimal';
  className?: string;
  showLabel?: boolean;
}

export function SyncStatus({
  variant = 'badge',
  className,
  showLabel = true,
}: SyncStatusProps) {
  const { isOnline } = useUIStore();
  const { pendingCount, isSyncing, processQueue } = useSyncQueue();
  const [lastSynced, setLastSynced] = useState<Date | null>(null);

  // Determine current sync state
  const syncState: SyncState = (() => {
    if (!isOnline) return 'offline';
    if (isSyncing) return 'syncing';
    if (pendingCount > 0) return 'pending';
    return 'synced';
  })();

  // Update last synced time when going from pending to synced
  useEffect(() => {
    if (syncState === 'synced' && pendingCount === 0) {
      setLastSynced(new Date());
    }
  }, [syncState, pendingCount]);

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
      lastSynced={lastSynced}
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
    synced: 'var(--success, #22C55E)',
    pending: 'var(--warning, #F59E0B)',
    syncing: 'var(--info)',
    offline: 'var(--ink-tertiary, #807868)',
    error: 'var(--error, #DC2626)',
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
      label: 'Synced',
      color: 'var(--success)',
      bg: 'color-mix(in srgb, var(--success) 12%, transparent)',
      border: 'color-mix(in srgb, var(--success) 25%, transparent)',
    },
    pending: {
      icon: <Upload className="w-3.5 h-3.5" />,
      label: `${pendingCount} pending`,
      color: 'var(--warning)',
      bg: 'color-mix(in srgb, var(--warning) 12%, transparent)',
      border: 'color-mix(in srgb, var(--warning) 25%, transparent)',
    },
    syncing: {
      icon: <RefreshCw className="w-3.5 h-3.5 animate-spin" />,
      label: 'Syncing...',
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
      label: 'Sync failed',
      color: 'var(--error)',
      bg: 'color-mix(in srgb, var(--error) 12%, transparent)',
      border: 'color-mix(in srgb, var(--error) 25%, transparent)',
    },
  };

  const { icon, label, color, bg, border } = config[state];
  const isInteractive = state === 'pending' || state === 'error';

  return (
    <button
      onClick={onTap}
      disabled={!isInteractive}
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-1 rounded-full',
        'text-xs font-medium transition-all',
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
  lastSynced: Date | null;
  onTap: () => void;
  className?: string;
}

function SyncFull({ state, pendingCount, lastSynced, onTap, className }: SyncFullProps) {
  const formatLastSynced = (date: Date | null): string => {
    if (!date) return 'Never';
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString();
  };

  const config = {
    synced: {
      icon: <Cloud className="w-5 h-5" />,
      title: 'All synced',
      subtitle: `Last synced ${formatLastSynced(lastSynced)}`,
      color: 'var(--success, #22C55E)',
    },
    pending: {
      icon: <Upload className="w-5 h-5" />,
      title: `${pendingCount} changes pending`,
      subtitle: 'Tap to sync now',
      color: 'var(--warning, #F59E0B)',
    },
    syncing: {
      icon: <RefreshCw className="w-5 h-5 animate-spin" />,
      title: 'Syncing...',
      subtitle: 'Please wait',
      color: 'var(--info)',
    },
    offline: {
      icon: <CloudOff className="w-5 h-5" />,
      title: 'You\'re offline',
      subtitle: pendingCount > 0 ? `${pendingCount} changes will sync when online` : 'Changes will sync when online',
      color: 'var(--ink-tertiary, #807868)',
    },
    error: {
      icon: <AlertTriangle className="w-5 h-5" />,
      title: 'Sync failed',
      subtitle: 'Tap to retry',
      color: 'var(--error, #DC2626)',
    },
  };

  const { icon, title, subtitle, color } = config[state];
  const isInteractive = state === 'pending' || state === 'error';

  return (
    <button
      onClick={onTap}
      disabled={!isInteractive}
      className={cn(
        'w-full p-4 rounded-xl flex items-center gap-4 text-left',
        'transition-all',
        isInteractive && 'cursor-pointer active:scale-[0.98]',
        !isInteractive && 'cursor-default',
        className
      )}
      style={{
        background: 'var(--surface, #1A1814)',
        border: '1px solid var(--rule, #3A3530)',
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
        <p
          className="font-medium text-sm"
          style={{ color: 'var(--ink, #F5F1E8)' }}
        >
          {title}
        </p>
        <p
          className="text-xs mt-0.5"
          style={{ color: 'var(--ink-secondary, #B8B0A0)' }}
        >
          {subtitle}
        </p>
      </div>

      {/* Progress ring for syncing */}
      {state === 'syncing' && (
        <div className="w-8 h-8 relative">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 32 32">
            <circle
              cx="16"
              cy="16"
              r="14"
              fill="none"
              stroke="var(--rule, #3A3530)"
              strokeWidth="3"
            />
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
  const { isOnline } = useUIStore();
  const { pendingCount, isSyncing, processQueue: _processQueue } = useSyncQueue();

  // Don't show if everything is synced
  if (isOnline && pendingCount === 0 && !isSyncing) return null;

  const _state: SyncState = !isOnline ? 'offline' : isSyncing ? 'syncing' : 'pending';

  return (
    <div
      className={cn(
        'fixed bottom-20 left-4 right-4 z-40',
        'animate-slide-up',
        className
      )}
    >
      <SyncStatus variant="full" />
    </div>
  );
}

export default SyncStatus;
