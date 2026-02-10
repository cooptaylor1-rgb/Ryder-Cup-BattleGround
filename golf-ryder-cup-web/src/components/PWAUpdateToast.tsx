/**
 * PWA Update Toast
 *
 * A non-intrusive toast notification that prompts users to refresh
 * when a new version of the app is available.
 *
 * Features:
 * - Animated slide-in from bottom
 * - Clear update messaging
 * - One-click refresh action
 * - Dismiss option
 * - Auto-dismiss after 30 seconds (but can be re-triggered)
 */

'use client';

import { useEffect, useState } from 'react';
import { RefreshCw, X, Sparkles } from 'lucide-react';
import { usePWA } from './PWAProvider';
import { Button } from './ui';

export function PWAUpdateToast() {
  const { hasUpdate, updateApp } = usePWA();
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (hasUpdate && !dismissed) {
      // Slight delay for better UX - don't interrupt immediately
      const timer = setTimeout(() => {
        setVisible(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [hasUpdate, dismissed]);

  // Auto-hide after 30 seconds but user can still refresh from settings
  useEffect(() => {
    if (visible) {
      const timer = setTimeout(() => {
        setVisible(false);
      }, 30000);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  if (!visible) return null;

  const handleDismiss = () => {
    setVisible(false);
    setDismissed(true);
  };

  const handleUpdate = () => {
    updateApp();
  };

  return (
    <div
      className="pwa-update-toast fixed left-1/2 bottom-[calc(env(safe-area-inset-bottom,_0px)_+_80px)] z-[9999] animate-[slideUpFade_0.3s_ease-out]"
      role="alert"
      aria-live="polite"
    >
      <div className="card-glass flex items-center gap-[var(--space-3)] px-[var(--space-4)] py-[var(--space-3)] rounded-[var(--radius-full)] shadow-[0_8px_32px_rgba(0,0,0,0.2)] max-w-[360px] border border-[var(--masters)]">
        {/* Icon */}
        <div className="flex items-center justify-center w-9 h-9 rounded-full bg-[rgba(0,103,71,0.15)] text-[var(--masters)] shrink-0">
          <Sparkles size={18} />
        </div>

        {/* Message */}
        <div className="flex-1 min-w-0">
          <div className="text-[var(--text-sm)] font-semibold text-[var(--ink-primary)]">
            Update Available
          </div>
          <div className="text-[var(--text-xs)] text-[var(--ink-secondary)]">
            New features and improvements ready
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
            onClick={handleDismiss}
            onTouchEnd={(e) => {
              e.preventDefault();
              handleDismiss();
            }}
            aria-label="Dismiss update notification"
            className="flex items-center justify-center w-11 h-11 rounded-full border-0 bg-[var(--surface-secondary)] text-[var(--ink-tertiary)] cursor-pointer transition-all duration-200 ease-out hover:bg-[var(--surface)] [webkit-tap-highlight-color:transparent] touch-manipulation"
          >
            <X size={16} />
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
