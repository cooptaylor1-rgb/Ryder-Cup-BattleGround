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
      className="pwa-update-toast"
      role="alert"
      aria-live="polite"
      style={{
        position: 'fixed',
        bottom: 'calc(env(safe-area-inset-bottom, 0px) + 80px)', // Above bottom nav
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        animation: 'slideUpFade 0.3s ease-out',
      }}
    >
      <div
        className="card-glass"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-3)',
          padding: 'var(--space-3) var(--space-4)',
          borderRadius: 'var(--radius-full)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
          maxWidth: '360px',
          border: '1px solid var(--masters)',
        }}
      >
        {/* Icon */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            background: 'rgba(0, 103, 71, 0.15)',
            color: 'var(--masters)',
            flexShrink: 0,
          }}
        >
          <Sparkles size={18} />
        </div>

        {/* Message */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 'var(--text-sm)',
              fontWeight: 600,
              color: 'var(--ink-primary)',
            }}
          >
            Update Available
          </div>
          <div
            style={{
              fontSize: 'var(--text-xs)',
              color: 'var(--ink-secondary)',
            }}
          >
            New features and improvements ready
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 'var(--space-2)', flexShrink: 0 }}>
          <Button
            variant="primary"
            size="sm"
            onClick={handleUpdate}
            onTouchEnd={(e) => {
              e.preventDefault();
              handleUpdate();
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-1)',
              padding: 'var(--space-2) var(--space-3)',
              minHeight: '44px',
              WebkitTapHighlightColor: 'transparent',
              touchAction: 'manipulation',
            }}
          >
            <RefreshCw size={14} />
            Update
          </Button>

          <button
            onClick={handleDismiss}
            onTouchEnd={(e) => {
              e.preventDefault();
              handleDismiss();
            }}
            aria-label="Dismiss update notification"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              border: 'none',
              background: 'var(--surface-secondary)',
              color: 'var(--ink-tertiary)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              WebkitTapHighlightColor: 'transparent',
              touchAction: 'manipulation',
            }}
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
