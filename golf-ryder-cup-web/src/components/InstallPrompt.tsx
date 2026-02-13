'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Interface for the BeforeInstallPromptEvent
 * This is a non-standard event only available on Chromium browsers
 */
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

/**
 * Custom hook to handle the PWA install prompt
 * Captures the beforeinstallprompt event and provides methods to show it
 */
export function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);

  // Use lazy initialization to check standalone mode
  const [isInstalled, setIsInstalled] = useState(() => {
    if (typeof window === 'undefined') return false;
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true
    );
  });

  // Use lazy initialization to check if dismissed
  const [isDismissed, setIsDismissed] = useState(() => {
    if (typeof window === 'undefined') return false;
    const dismissedAt = localStorage.getItem('pwa-install-dismissed');
    if (dismissedAt) {
      const dismissedTime = parseInt(dismissedAt, 10);
      const daysSinceDismiss = (Date.now() - dismissedTime) / (1000 * 60 * 60 * 24);
      return daysSinceDismiss < 7;
    }
    return false;
  });

  useEffect(() => {
    // Skip setup if already installed or dismissed
    if (isInstalled || isDismissed) return;

    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    // Listen for app installed event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
      localStorage.removeItem('pwa-install-dismissed');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [isInstalled, isDismissed]);

  const showInstallPrompt = useCallback(async () => {
    if (!deferredPrompt) return false;

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === 'accepted') {
        setIsInstalled(true);
      }

      setDeferredPrompt(null);
      setIsInstallable(false);
      return outcome === 'accepted';
    } catch (error) {
      console.error('Error showing install prompt:', error);
      return false;
    }
  }, [deferredPrompt]);

  const dismissPrompt = useCallback(() => {
    setIsDismissed(true);
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
  }, []);

  return {
    isInstallable: isInstallable && !isInstalled && !isDismissed,
    isInstalled,
    showInstallPrompt,
    dismissPrompt,
  };
}

/**
 * PWA Install Banner Component
 * Shows a non-intrusive banner prompting users to install the app
 */
interface InstallBannerProps {
  /** Position of the banner */
  position?: 'top' | 'bottom';
  /** Custom class name */
  className?: string;
}

export function InstallBanner({ position = 'bottom', className = '' }: InstallBannerProps) {
  const { isInstallable, showInstallPrompt, dismissPrompt } = useInstallPrompt();
  // Track if user has seen the delayed prompt
  const [hasDelayPassed, setHasDelayPassed] = useState(false);

  // Delay showing the banner to avoid being too intrusive
  useEffect(() => {
    if (!isInstallable) return undefined;

    const timer = setTimeout(() => setHasDelayPassed(true), 3000);
    return () => clearTimeout(timer);
  }, [isInstallable]);

  // Computed visibility: installable AND delay has passed
  const isVisible = isInstallable && hasDelayPassed;

  const handleInstall = async () => {
    const success = await showInstallPrompt();
    // success will trigger isInstallable to become false
    void success;
  };

  const handleDismiss = () => {
    dismissPrompt();
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: position === 'bottom' ? 100 : -100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: position === 'bottom' ? 100 : -100 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className={`fixed ${position === 'bottom' ? 'bottom-0' : 'top-0'} left-0 right-0 z-50 p-4 ${className}`}
          style={{
            paddingBottom:
              position === 'bottom' ? 'calc(1rem + env(safe-area-inset-bottom))' : undefined,
            paddingTop: position === 'top' ? 'calc(1rem + env(safe-area-inset-top))' : undefined,
          }}
        >
          <div className="mx-auto max-w-md bg-[var(--surface-raised)] rounded-2xl shadow-lg border border-[var(--rule)] overflow-hidden">
            <div className="flex items-center gap-3 p-4">
              {/* App Icon */}
              <div className="flex-shrink-0 w-12 h-12 bg-[color:var(--masters)]/10 rounded-xl flex items-center justify-center">
                <svg className="w-7 h-7 text-[color:var(--masters)]" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
                </svg>
              </div>

              {/* Text */}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-[var(--ink-primary)] text-[15px]">Install Golf Buddies</p>
                <p className="text-[var(--ink-secondary)] text-[13px]">
                  Add to home screen for the best experience
                </p>
              </div>

              {/* Dismiss button */}
              <button
                onClick={handleDismiss}
                className="flex-shrink-0 p-2 -mr-1 text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] transition-colors"
                aria-label="Dismiss"
              >
                <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>

            {/* Install button */}
            <div className="px-4 pb-4">
              <button
                onClick={handleInstall}
                className="w-full py-3 bg-[color:var(--masters)] text-white font-semibold rounded-xl active:scale-[0.98] transition-transform"
              >
                Install App
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Compact Install Button Component
 * A small button for use in settings or menus
 */
interface InstallButtonProps {
  /** Custom class name */
  className?: string;
  /** Button variant */
  variant?: 'primary' | 'secondary' | 'ghost';
}

export function InstallButton({ className = '', variant = 'primary' }: InstallButtonProps) {
  const { isInstallable, isInstalled, showInstallPrompt } = useInstallPrompt();

  if (isInstalled) {
    return (
      <div className={`flex items-center gap-2 text-[color:var(--masters)] font-medium ${className}`}>
        <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
            clipRule="evenodd"
          />
        </svg>
        App Installed
      </div>
    );
  }

  if (!isInstallable) {
    return null;
  }

  const variantClasses = {
    primary: 'bg-[color:var(--masters)] text-white hover:bg-[color:var(--masters-deep)]',
    secondary: 'bg-[color:var(--masters)]/10 text-[color:var(--masters)] hover:bg-[color:var(--masters)]/15',
    ghost: 'text-[color:var(--masters)] hover:bg-[color:var(--masters)]/10',
  };

  return (
    <button
      onClick={showInstallPrompt}
      className={`
        flex items-center gap-2 px-4 py-2 rounded-lg font-medium
        transition-colors active:scale-[0.98]
        ${variantClasses[variant]}
        ${className}
      `}
    >
      <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
        <path
          fillRule="evenodd"
          d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
          clipRule="evenodd"
        />
      </svg>
      Install App
    </button>
  );
}

/**
 * iOS Install Instructions Component
 * Shows instructions for iOS users who can't use beforeinstallprompt
 */
interface IOSInstallInstructionsProps {
  /** Whether to show the instructions */
  isOpen: boolean;
  /** Callback when closed */
  onClose: () => void;
}

export function IOSInstallInstructions({ isOpen, onClose }: IOSInstallInstructionsProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-[var(--surface-raised)] rounded-t-3xl overflow-hidden"
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 bg-[var(--rule)] rounded-full" />
            </div>

            {/* Content */}
            <div className="px-6 pb-6">
              <h2 className="text-xl font-bold text-[var(--ink-primary)] mb-1">Install Golf Buddies</h2>
              <p className="text-[var(--ink-secondary)] text-sm mb-6">
                Add to your home screen for the best experience
              </p>

              {/* Steps */}
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-[color:var(--info)] text-white rounded-lg flex items-center justify-center font-bold text-sm">
                    1
                  </div>
                  <div className="flex-1 pt-1">
                    <p className="font-medium text-[var(--ink-primary)]">Tap the Share button</p>
                    <p className="text-sm text-[var(--ink-secondary)] mt-0.5">
                      It&apos;s at the bottom of Safari (the box with arrow)
                    </p>
                    <div className="mt-2 p-3 bg-[var(--surface-secondary)] rounded-xl inline-flex">
                      <svg
                        className="w-6 h-6 text-[color:var(--info)]"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={1.5}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M9 8.25H7.5a2.25 2.25 0 00-2.25 2.25v9a2.25 2.25 0 002.25 2.25h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25H15m0-3l-3-3m0 0l-3 3m3-3V15"
                        />
                      </svg>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-[color:var(--info)] text-white rounded-lg flex items-center justify-center font-bold text-sm">
                    2
                  </div>
                  <div className="flex-1 pt-1">
                    <p className="font-medium text-[var(--ink-primary)]">Tap &quot;Add to Home Screen&quot;</p>
                    <p className="text-sm text-[var(--ink-secondary)] mt-0.5">
                      Scroll down in the share menu to find it
                    </p>
                    <div className="mt-2 p-3 bg-[var(--surface-secondary)] rounded-xl inline-flex items-center gap-2">
                      <svg
                        className="w-5 h-5 text-[var(--ink-secondary)]"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
                      </svg>
                      <span className="font-medium text-[var(--ink-primary)] text-sm">Add to Home Screen</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-[color:var(--info)] text-white rounded-lg flex items-center justify-center font-bold text-sm">
                    3
                  </div>
                  <div className="flex-1 pt-1">
                    <p className="font-medium text-[var(--ink-primary)]">Tap &quot;Add&quot;</p>
                    <p className="text-sm text-[var(--ink-secondary)] mt-0.5">
                      Confirm to add the app to your home screen
                    </p>
                  </div>
                </div>
              </div>

              {/* Close button */}
              <button
                onClick={onClose}
                className="w-full mt-6 py-3 bg-[var(--surface-secondary)] text-[var(--ink-primary)] font-semibold rounded-xl active:scale-[0.98] transition-transform"
              >
                Got it
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/**
 * Smart Install Prompt Component
 * Shows native install for Android, instructions for iOS
 */
export function SmartInstallPrompt() {
  const { isInstallable, isInstalled } = useInstallPrompt();
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);

  // Detect iOS at initialization
  const [isIOS] = useState(() => {
    if (typeof window === 'undefined') return false;
    return (
      /iPad|iPhone|iPod/.test(navigator.userAgent) &&
      !(window as Window & { MSStream?: unknown }).MSStream
    );
  });

  // Detect if should show prompt at initialization
  const [shouldShowIOSPrompt] = useState(() => {
    if (typeof window === 'undefined') return false;

    const iOS =
      /iPad|iPhone|iPod/.test(navigator.userAgent) &&
      !(window as Window & { MSStream?: unknown }).MSStream;

    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

    const dismissedAt = localStorage.getItem('pwa-install-dismissed');
    const recentlyDismissed =
      dismissedAt && Date.now() - parseInt(dismissedAt, 10) < 7 * 24 * 60 * 60 * 1000;

    return iOS && !isStandalone && !recentlyDismissed;
  });

  useEffect(() => {
    // Show prompt for iOS users after delay
    if (shouldShowIOSPrompt) {
      const timer = setTimeout(() => setShowPrompt(true), 5000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [shouldShowIOSPrompt]);

  // Don't show anything if installed
  if (isInstalled) return null;

  // For Android/Chrome, show the native install banner
  if (isInstallable) {
    return <InstallBanner position="bottom" />;
  }

  // For iOS, show our custom prompt that opens instructions
  if (isIOS && showPrompt) {
    return (
      <>
        <motion.div
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-0 left-0 right-0 z-50 p-4"
          style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
        >
          <div className="mx-auto max-w-md bg-[var(--surface-raised)] rounded-2xl shadow-lg border border-[var(--rule)] overflow-hidden">
            <div className="flex items-center gap-3 p-4">
              <div className="flex-shrink-0 w-12 h-12 bg-[color:var(--masters)]/10 rounded-xl flex items-center justify-center">
                <svg className="w-7 h-7 text-[color:var(--masters)]" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-[var(--ink-primary)] text-[15px]">Install Golf Buddies</p>
                <p className="text-[var(--ink-secondary)] text-[13px]">
                  Add to home screen for the best experience
                </p>
              </div>
              <button
                onClick={() => {
                  setShowPrompt(false);
                  localStorage.setItem('pwa-install-dismissed', Date.now().toString());
                }}
                className="flex-shrink-0 p-2 -mr-1 text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] transition-colors"
                aria-label="Dismiss"
              >
                <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>
            <div className="px-4 pb-4">
              <button
                onClick={() => setShowIOSInstructions(true)}
                className="w-full py-3 bg-[color:var(--masters)] text-white font-semibold rounded-xl active:scale-[0.98] transition-transform"
              >
                Show Me How
              </button>
            </div>
          </div>
        </motion.div>

        <IOSInstallInstructions
          isOpen={showIOSInstructions}
          onClose={() => setShowIOSInstructions(false)}
        />
      </>
    );
  }

  return null;
}
