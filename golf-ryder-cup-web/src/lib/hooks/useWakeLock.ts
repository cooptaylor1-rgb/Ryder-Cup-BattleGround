/**
 * useWakeLock — Keep the screen on while the cockpit is mounted.
 *
 * A 4-hour round of golf with the phone on dim means a captain
 * unlocks their device 60+ times. It drains battery, breaks
 * scoring flow at the next tee box, and means a captain who's
 * mid-stroke-entry watches their phone sleep on them.
 *
 * The Web Wake Lock API (`navigator.wakeLock.request('screen')`)
 * solves this without any Capacitor plugin — supported on iOS
 * Safari 16.4+ and modern Android Chromium. When the API is
 * missing the hook quietly no-ops; when the user backgrounds the
 * tab the OS auto-releases the lock and we re-acquire on visibility.
 *
 * Scope is the caller's responsibility: this hook should be mounted
 * only on the surfaces that need to stay awake (the scoring cockpit,
 * not the whole app), so battery isn't drained when the captain is
 * on home, standings, or settings.
 */

'use client';

import { useEffect, useRef } from 'react';

// `WakeLockSentinel` and `Navigator.wakeLock` are part of the DOM lib
// in modern TypeScript. We just narrow the runtime check to handle
// older Safari (pre-16.4) and Firefox where the API is missing —
// fallback path is a no-op.

export function useWakeLock(active: boolean): void {
  const sentinelRef = useRef<WakeLockSentinel | null>(null);
  const requestInFlightRef = useRef(false);

  useEffect(() => {
    if (!active) return;
    if (typeof navigator === 'undefined' || !navigator.wakeLock) return;

    let cancelled = false;

    const acquire = async () => {
      if (cancelled) return;
      if (sentinelRef.current && !sentinelRef.current.released) return;
      if (requestInFlightRef.current) return;
      requestInFlightRef.current = true;
      try {
        const sentinel = await navigator.wakeLock.request('screen');
        if (cancelled) {
          // Caller unmounted while we were awaiting — release immediately
          // so we don't keep the screen awake on a page they've left.
          await sentinel.release().catch(() => {});
          return;
        }
        sentinelRef.current = sentinel;
        sentinel.addEventListener('release', onRelease);
      } catch {
        // The browser will reject if the tab isn't visible, the user is
        // in a Picture-in-Picture window, or the platform refuses for
        // power-saving reasons. None of those are recoverable here —
        // we'll try again on the next visibility change.
      } finally {
        requestInFlightRef.current = false;
      }
    };

    const onRelease = () => {
      // OS released the lock (tab hidden, low battery, etc.). Try to
      // re-acquire once the page is visible again.
      sentinelRef.current = null;
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void acquire();
      }
    };

    void acquire();
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisibilityChange);
      const sentinel = sentinelRef.current;
      sentinelRef.current = null;
      if (sentinel && !sentinel.released) {
        sentinel.removeEventListener('release', onRelease);
        void sentinel.release().catch(() => {});
      }
    };
  }, [active]);
}
