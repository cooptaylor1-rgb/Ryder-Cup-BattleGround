/**
 * iOS Install Prompt — Add to Home Screen Banner
 *
 * iOS Safari doesn't support the beforeinstallprompt API,
 * so we need a custom banner with instructions.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { X, Share, PlusSquare, ArrowDown } from 'lucide-react';

interface IOSInstallPromptProps {
  /** Delay before showing prompt (ms) */
  delay?: number;
  /** Days to wait before showing again if dismissed */
  dismissDays?: number;
}

const STORAGE_KEY = 'ios-install-prompt-dismissed';

/**
 * Check if running in iOS Safari (not standalone PWA)
 */
function shouldShowIOSPrompt(): boolean {
  if (typeof window === 'undefined') return false;

  const ua = window.navigator.userAgent;
  const iOS = /iPad|iPhone|iPod/.test(ua);
  const webkit = /WebKit/.test(ua);
  const notCriOS = !/CriOS/.test(ua);
  const isIOSSafari = iOS && webkit && notCriOS;

  // Check if already installed as PWA
  const isStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
  const isDisplayModeStandalone = window.matchMedia('(display-mode: standalone)').matches;

  return isIOSSafari && !isStandalone && !isDisplayModeStandalone;
}

export function IOSInstallPrompt({
  delay = 30000, // Show after 30 seconds by default
  dismissDays = 7,
}: IOSInstallPromptProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isIOS] = useState(() => {
    // Initialize on first render
    if (typeof window === 'undefined') return false;
    return shouldShowIOSPrompt();
  });

  useEffect(() => {
    // Check on mount for SSR hydration
    if (typeof window === 'undefined') return;

    const shouldShow = shouldShowIOSPrompt();

    // If conditions changed since initial render, we need to bail out
    // The next render will pick up the correct initial value
    if (!shouldShow) {
      return;
    }

    // Check if dismissed recently
    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (dismissed) {
      const dismissedAt = parseInt(dismissed, 10);
      const daysSince = (Date.now() - dismissedAt) / (1000 * 60 * 60 * 24);
      if (daysSince < dismissDays) return;
    }

    const timer = setTimeout(() => {
      setIsVisible(true);
    }, delay);

    return () => clearTimeout(timer);
  }, [delay, dismissDays, isIOS]);

  const handleDismiss = useCallback(() => {
    setIsVisible(false);
    localStorage.setItem(STORAGE_KEY, Date.now().toString());
  }, []);

  const handleInstall = useCallback(() => {
    // Can't programmatically install on iOS, just highlight the instructions
    setIsVisible(false);
    localStorage.setItem(STORAGE_KEY, Date.now().toString());
  }, []);

  if (!isIOS || !isVisible) return null;

  return (
    <div
      className="fixed inset-0 z-9999 flex items-end justify-center p-4 ios-backdrop-enter"
      onClick={handleDismiss}
      role="dialog"
      aria-modal="true"
      aria-labelledby="ios-install-title"
    >
      <div
        className="w-full max-w-md bg-[color:var(--surface-raised)]/95 backdrop-blur-xl rounded-[20px] shadow-2xl overflow-hidden ios-sheet-enter"
        onClick={(e) => e.stopPropagation()}
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 16px)' }}
      >
        {/* Header */}
        <div className="relative bg-linear-to-br from-[color:var(--masters)] to-[color:var(--masters-deep)] p-6 text-[var(--canvas)]">
          <button
            onClick={handleDismiss}
            className="absolute top-4 right-4 p-2 rounded-full bg-[color:var(--canvas)]/15 hover:bg-[color:var(--canvas)]/25 active:scale-95 transition-all duration-150"
            aria-label="Dismiss"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-[color:var(--canvas)]/15 flex items-center justify-center overflow-hidden shadow-lg">
              <Image
                src="/icons/icon-96.png"
                alt="Golf Ryder Cup"
                width={48}
                height={48}
                className="rounded-xl"
              />
            </div>
            <div>
              <h2 id="ios-install-title" className="text-xl font-bold">
                Add to Home Screen
              </h2>
              <p className="text-[color:var(--canvas)]/80 text-sm mt-1">
                Get the full app experience
              </p>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="p-6 space-y-4">
          <p className="text-[var(--ink-secondary)] text-sm">
            Install Golf Ryder Cup for quick access and offline scoring:
          </p>

          <ol className="space-y-4">
            <li className="flex items-start gap-4" style={{ animationDelay: '0.1s' }}>
              <div className="shrink-0 w-8 h-8 rounded-full bg-[var(--masters-subtle)] flex items-center justify-center">
                <span className="text-[var(--masters)] font-bold text-sm">1</span>
              </div>
              <div className="flex-1 pt-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[var(--ink-primary)]">Tap the</span>
                  <Share className="w-5 h-5 text-[var(--info)]" />
                  <span className="text-[var(--ink-primary)] font-medium">Share</span>
                  <span className="text-[var(--ink-primary)]">button</span>
                </div>
                <p className="text-[var(--ink-tertiary)] text-xs mt-1">
                  In Safari&apos;s bottom toolbar
                </p>
              </div>
            </li>

            <li className="flex items-start gap-4" style={{ animationDelay: '0.2s' }}>
              <div className="shrink-0 w-8 h-8 rounded-full bg-[var(--masters-subtle)] flex items-center justify-center">
                <span className="text-[var(--masters)] font-bold text-sm">2</span>
              </div>
              <div className="flex-1 pt-1">
                <div className="flex items-center gap-2">
                  <span className="text-[var(--ink-primary)]">Scroll down and tap</span>
                </div>
                <div className="flex items-center gap-2 mt-2 p-3 bg-[var(--surface-secondary)] rounded-xl">
                  <PlusSquare className="w-5 h-5 text-[var(--info)]" />
                  <span className="text-[var(--ink-primary)] font-medium">Add to Home Screen</span>
                </div>
              </div>
            </li>

            <li className="flex items-start gap-4" style={{ animationDelay: '0.3s' }}>
              <div className="shrink-0 w-8 h-8 rounded-full bg-[var(--masters-subtle)] flex items-center justify-center">
                <span className="text-[var(--masters)] font-bold text-sm">3</span>
              </div>
              <div className="flex-1 pt-1">
                <div className="flex items-center gap-2">
                  <span className="text-[var(--ink-primary)]">Tap</span>
                  <span className="text-[var(--info)] font-semibold">Add</span>
                  <span className="text-[var(--ink-primary)]">in the top right</span>
                </div>
              </div>
            </li>
          </ol>

          {/* Benefits */}
          <div className="pt-4 border-t border-[var(--rule)]">
            <div className="flex items-center justify-center gap-4 text-xs text-[var(--ink-secondary)]">
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4 text-[var(--masters)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Works offline
              </span>
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4 text-[var(--masters)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Faster loading
              </span>
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4 text-[var(--masters)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
                Full screen
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 flex gap-3">
          <button
            onClick={handleDismiss}
            className="flex-1 py-3.5 px-4 rounded-xl bg-[var(--surface-secondary)] text-[var(--ink-primary)] font-semibold active:scale-[0.98] transition-transform duration-100"
          >
            Maybe Later
          </button>
          <button
            onClick={handleInstall}
            className="flex-1 py-3.5 px-4 rounded-xl bg-[var(--masters)] text-[var(--canvas)] font-semibold active:scale-[0.98] transition-transform duration-100 flex items-center justify-center gap-2"
          >
            <ArrowDown className="w-4 h-4" />
            Got It
          </button>
        </div>
      </div>
    </div>
  );
}

export default IOSInstallPrompt;
