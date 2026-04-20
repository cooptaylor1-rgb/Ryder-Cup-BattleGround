/**
 * PWA Update Toast
 *
 * Shown when a new service worker version is waiting to activate.
 * Auto-applies the update after a short grace period so every device
 * picks up bug fixes and schema patches without the captain having to
 * walk every player through "remove the app and reinstall it" — the
 * exact failure mode we hit during the first event.
 *
 * The grace period gives someone actively entering a score a chance to
 * tap "Not now" and defer the reload until they're done. Otherwise
 * after ~7s we skip waiting and reload.
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import { RefreshCw, Sparkles } from 'lucide-react';
import { usePWA } from './PWAProvider';
import { Button } from './ui';

// Grace period between the toast appearing and the auto-reload. Long
// enough that someone mid-scoring can tap "Not now"; short enough that
// the expected behaviour from the user's perspective is "the app keeps
// itself up to date".
const AUTO_UPDATE_DELAY_MS = 7000;
// If the user defers, try again every 5 minutes so the update still
// lands the same session — not on the captain's next app restart.
const DEFERRED_RETRY_MS = 5 * 60 * 1000;

export function PWAUpdateToast() {
  const { hasUpdate, updateApp } = usePWA();
  const [visible, setVisible] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const deferredRetryRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = () => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    if (deferredRetryRef.current) {
      clearTimeout(deferredRetryRef.current);
      deferredRetryRef.current = null;
    }
  };

  useEffect(() => {
    if (!hasUpdate) return;
    setVisible(true);
    setSecondsLeft(Math.ceil(AUTO_UPDATE_DELAY_MS / 1000));

    const startedAt = Date.now();
    const tick = () => {
      const elapsed = Date.now() - startedAt;
      const remaining = Math.max(0, AUTO_UPDATE_DELAY_MS - elapsed);
      setSecondsLeft(Math.ceil(remaining / 1000));
      if (remaining <= 0) {
        clearTimers();
        updateApp();
      }
    };
    countdownRef.current = setInterval(tick, 250);

    return clearTimers;
  }, [hasUpdate, updateApp]);

  if (!visible) return null;

  const handleDefer = () => {
    clearTimers();
    setVisible(false);
    // Re-show the toast in a few minutes so the update still lands this
    // session. `hasUpdate` stays true on the provider, so the effect
    // above will fire again when we bump the UI back to visible.
    deferredRetryRef.current = setTimeout(() => {
      setVisible(true);
    }, DEFERRED_RETRY_MS);
  };

  const handleUpdate = () => {
    clearTimers();
    updateApp();
  };

  return (
    <div
      className="pwa-update-toast fixed left-1/2 bottom-[calc(env(safe-area-inset-bottom,_0px)_+_80px)] z-[9999] animate-[slideUpFade_0.3s_ease-out]"
      role="alert"
      aria-live="polite"
    >
      <div className="card-glass flex items-center gap-[var(--space-3)] px-[var(--space-4)] py-[var(--space-3)] rounded-[var(--radius-full)] shadow-[var(--shadow-lg)] max-w-[360px] border border-[color:var(--masters)]">
        {/* Icon */}
        <div className="flex items-center justify-center w-9 h-9 rounded-full bg-[color:var(--masters)]/15 text-[var(--masters)] shrink-0">
          <Sparkles size={18} />
        </div>

        {/* Message */}
        <div className="flex-1 min-w-0">
          <div className="text-[var(--text-sm)] font-semibold text-[var(--ink-primary)]">
            New version ready
          </div>
          <div className="text-[var(--text-xs)] text-[var(--ink-secondary)]">
            {secondsLeft !== null && secondsLeft > 0
              ? `Auto-updating in ${secondsLeft}s…`
              : 'Updating now…'}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-[var(--space-2)] shrink-0">
          <Button
            variant="primary"
            size="sm"
            onClick={handleUpdate}
            onTouchEnd={(e) => {
              e.preventDefault();
              handleUpdate();
            }}
            className="flex items-center gap-[var(--space-1)] px-[var(--space-3)] py-[var(--space-2)] min-h-[44px] [webkit-tap-highlight-color:transparent] touch-manipulation"
          >
            <RefreshCw size={14} />
            Update
          </Button>

          <button
            type="button"
            onClick={handleDefer}
            onTouchEnd={(e) => {
              e.preventDefault();
              handleDefer();
            }}
            aria-label="Defer update"
            className="flex items-center justify-center px-[var(--space-3)] h-11 rounded-full border-0 bg-[var(--surface-secondary)] text-[var(--ink-secondary)] text-[var(--text-xs)] font-medium cursor-pointer transition-all duration-200 ease-out hover:bg-[var(--surface)] [webkit-tap-highlight-color:transparent] touch-manipulation"
          >
            Not now
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes slideUpFade {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
