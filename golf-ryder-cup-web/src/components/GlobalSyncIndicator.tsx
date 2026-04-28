'use client';

/**
 * GlobalSyncIndicator
 *
 * Persistent, on-every-page pill that surfaces *pending* sync
 * activity. Lives at top-right of the viewport, respecting the
 * safe-area inset so it doesn't bury under the iOS notch.
 *
 * Visibility rules:
 *   • Hidden when the queue is clean (no pending, no failed).
 *   • Hidden when failed > 0 — the SyncFailureBanner takes over and
 *     handing the user two sync UIs at once is worse than handing
 *     them one. The banner is louder and includes recovery actions.
 *   • Shows when pending > 0 AND failed === 0. This is the
 *     "captain-on-standings-with-8-pending-writes" case — until now
 *     nothing on standings, home, or schedule told them sync was
 *     queued behind the scenes.
 *
 * The pill is non-interactive on purpose — there's nothing for the
 * user to do; the queue drains itself. We still expose it as a
 * `role="status"` with `aria-live="polite"` so screen readers
 * announce changes.
 */

import { useEffect, useState } from 'react';
import { Cloud } from 'lucide-react';
import { zIndex } from '@/lib/constants/zIndex';
import {
  getSyncQueueStatus,
  TRIP_SYNC_QUEUE_CHANGED_EVENT,
} from '@/lib/services/tripSyncService';

export function GlobalSyncIndicator() {
  const [{ pending, failed }, setStatus] = useState({ pending: 0, failed: 0 });

  useEffect(() => {
    const tick = () => {
      const s = getSyncQueueStatus();
      setStatus({ pending: s.pending, failed: s.failed });
    };
    tick();

    window.addEventListener(TRIP_SYNC_QUEUE_CHANGED_EVENT, tick);
    // Light-touch poll as a safety net for environments where the
    // queue-changed event is missed (very rare but cheap insurance).
    const interval = window.setInterval(tick, 5000);
    return () => {
      window.removeEventListener(TRIP_SYNC_QUEUE_CHANGED_EVENT, tick);
      window.clearInterval(interval);
    };
  }, []);

  if (failed > 0) return null;
  if (pending <= 0) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      style={{
        zIndex: zIndex.toast,
        top: 'calc(env(safe-area-inset-top, 0px) + 8px)',
      }}
      className="pointer-events-none fixed right-3 inline-flex items-center gap-1.5 rounded-full border border-[color:var(--rule)] bg-[var(--canvas-raised)]/92 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-secondary)] shadow-card backdrop-blur supports-[backdrop-filter]:bg-[var(--canvas-raised)]/82"
    >
      <span aria-hidden className="relative flex h-2 w-2 items-center justify-center">
        <span className="absolute inset-0 animate-ping rounded-full bg-[color:var(--gold)] opacity-50" />
        <span className="relative h-1.5 w-1.5 rounded-full bg-[color:var(--gold-dark)]" />
      </span>
      <Cloud size={11} aria-hidden />
      <span>{pending} saving</span>
    </div>
  );
}
