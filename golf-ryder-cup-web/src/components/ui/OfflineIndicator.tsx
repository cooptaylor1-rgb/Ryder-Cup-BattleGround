/**
 * Offline Indicator Component
 *
 * Subtle status banner for connectivity.
 * Design principles:
 * - Non-intrusive, doesn't block content
 * - Uses design system colors
 * - Calm messaging, no alarm
 */

'use client';

import { useOnlineStatus } from '@/lib/hooks';
import { cn } from '@/lib/utils';
import { WifiOff, Wifi } from 'lucide-react';
import { useEffect, useState } from 'react';

export function OfflineIndicator() {
  const isOnline = useOnlineStatus();
  const [show, setShow] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      setShow(true);
      setWasOffline(true);
    } else if (wasOffline) {
      // Show "back online" briefly
      setShow(true);
      const timer = setTimeout(() => {
        setShow(false);
        setWasOffline(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, wasOffline]);

  if (!show) return null;

  return (
    <div
      className={cn(
        'fixed top-0 left-0 right-0 z-50 px-4 py-2 text-center text-sm font-medium flex items-center justify-center gap-2 toast-enter transition-colors duration-200',
        isOnline
          ? 'bg-[var(--success)] text-[var(--canvas)]'
          : 'bg-[var(--surface-raised)] border-b border-[var(--warning)] text-[var(--ink)] shadow-[var(--shadow-card-sm)]'
      )}
      role="status"
      aria-live="polite"
    >
      {isOnline ? (
        <>
          <Wifi className="w-4 h-4 text-[var(--canvas)]" />
          <span className="text-[var(--canvas)]">Back online</span>
        </>
      ) : (
        <>
          <WifiOff className="w-4 h-4 text-[var(--warning)]" />
          <span className="text-[var(--ink-secondary)]">Offline — scores saved locally</span>
        </>
      )}
    </div>
  );
}

export default OfflineIndicator;
