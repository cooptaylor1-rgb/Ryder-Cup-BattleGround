/**
 * iOS Install Banner
 *
 * Thin persistent strip across the top of the app on iOS Safari (when the
 * app isn't already installed as a PWA). Tapping it expands the same
 * step-by-step instructions as the modal prompt. Unlike the modal this
 * banner keeps sitting at the top until the user installs or dismisses —
 * the modal's 30-second gate is easy to miss, and we want players who
 * joined mid-event on a share link to see the add-to-home-screen path
 * without having to wait for a popup.
 *
 * Dismissal is per-browser session (sessionStorage) so the next time
 * they open the app in Safari the banner comes back, gently nudging
 * them to install. Once actually installed the PWA display mode check
 * hides it forever.
 */

'use client';

import { useCallback, useEffect, useState } from 'react';
import { ArrowUp, ChevronDown, ChevronUp, PlusSquare, Share, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const SESSION_DISMISS_KEY = 'ios-install-banner-dismissed-session';

function isIOSSafari(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = window.navigator.userAgent;
  const iOS = /iPad|iPhone|iPod/.test(ua);
  const webkit = /WebKit/.test(ua);
  const notCriOS = !/CriOS/.test(ua);
  const notFxiOS = !/FxiOS/.test(ua);
  return iOS && webkit && notCriOS && notFxiOS;
}

function isStandalonePWA(): boolean {
  if (typeof window === 'undefined') return false;
  const standaloneNav = (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
  const displayMode = window.matchMedia('(display-mode: standalone)').matches;
  return standaloneNav || displayMode;
}

export function IOSInstallBanner() {
  const [shouldShow, setShouldShow] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!isIOSSafari() || isStandalonePWA()) return;
    if (window.sessionStorage.getItem(SESSION_DISMISS_KEY) === '1') return;
    setShouldShow(true);
  }, []);

  const dismiss = useCallback(() => {
    setShouldShow(false);
    try {
      window.sessionStorage.setItem(SESSION_DISMISS_KEY, '1');
    } catch {
      // sessionStorage can throw in private mode — banner just won't
      // stay dismissed across navigations, which is harmless.
    }
  }, []);

  if (!shouldShow) return null;

  return (
    <div
      className={cn(
        'relative z-40 border-b border-[color:var(--masters)]/30',
        'bg-[linear-gradient(90deg,rgba(0,102,68,0.08),rgba(0,102,68,0.04))]',
      )}
      role="region"
      aria-label="Install app instructions"
    >
      <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-2">
        <ArrowUp className="h-4 w-4 shrink-0 text-[var(--masters)]" aria-hidden />
        <button
          type="button"
          onClick={() => setIsExpanded((v) => !v)}
          className="flex-1 min-w-0 text-left text-sm font-medium text-[var(--ink)]"
          aria-expanded={isExpanded}
        >
          {isExpanded
            ? 'Hide install steps'
            : 'Install this app for faster access — tap for how.'}
        </button>
        <button
          type="button"
          onClick={() => setIsExpanded((v) => !v)}
          className="shrink-0 rounded-full border border-[color:var(--masters)]/30 bg-[var(--canvas)]/80 p-1 text-[var(--masters)]"
          aria-label={isExpanded ? 'Collapse install steps' : 'Expand install steps'}
        >
          {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
        <button
          type="button"
          onClick={dismiss}
          className="shrink-0 rounded-full p-1 text-[var(--ink-tertiary)] hover:text-[var(--ink)]"
          aria-label="Dismiss install banner"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {isExpanded && (
        <div className="mx-auto max-w-3xl px-4 pb-3 text-sm text-[var(--ink-secondary)]">
          <ol className="space-y-2">
            <li className="flex items-start gap-3">
              <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[color:var(--masters)]/14 text-xs font-bold text-[var(--masters)]">
                1
              </span>
              <span className="flex flex-wrap items-center gap-1">
                Tap the
                <Share className="inline h-4 w-4 text-[var(--info)]" />
                <span className="font-medium">Share</span>
                button in Safari&apos;s toolbar.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[color:var(--masters)]/14 text-xs font-bold text-[var(--masters)]">
                2
              </span>
              <span className="flex flex-wrap items-center gap-1">
                Scroll and choose
                <PlusSquare className="inline h-4 w-4 text-[var(--info)]" />
                <span className="font-medium">Add to Home Screen</span>.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[color:var(--masters)]/14 text-xs font-bold text-[var(--masters)]">
                3
              </span>
              <span>
                Tap <span className="font-semibold text-[var(--info)]">Add</span> in the top-right. Open the
                new icon from your home screen — scoring, offline play, and push alerts all work better there.
              </span>
            </li>
          </ol>
        </div>
      )}
    </div>
  );
}

export default IOSInstallBanner;
