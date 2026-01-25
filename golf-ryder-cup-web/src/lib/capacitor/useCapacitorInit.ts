/**
 * Capacitor App Initialization Hook
 *
 * Initializes Capacitor native features when running on iOS/Android.
 * Should be used in the root layout component.
 *
 * @example
 * // In app/layout.tsx
 * export default function RootLayout({ children }) {
 *   useCapacitorInit();
 *   return <html>...</html>;
 * }
 */

'use client';

import { useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { nativeBridge, isNative } from './nativeBridge';

interface CapacitorInitOptions {
  /** Handle deep links */
  onDeepLink?: (url: string) => void;
  /** Handle back button (Android) */
  onBackButton?: () => boolean;
  /** Handle app state changes */
  onStateChange?: (isActive: boolean) => void;
}

/**
 * Initialize Capacitor for native app functionality
 */
export function useCapacitorInit(options: CapacitorInitOptions = {}) {
  const router = useRouter();

  // Handle back button (Android)
  const handleBackButton = useCallback(() => {
    if (options.onBackButton) {
      const handled = options.onBackButton();
      if (handled) return;
    }

    // Default: go back in history or exit
    if (window.history.length > 1) {
      router.back();
    } else {
      nativeBridge.app.exitApp();
    }
  }, [options, router]);

  // Handle deep links
  const handleDeepLink = useCallback((data: { url: string }) => {
    const url = data.url;

    if (options.onDeepLink) {
      options.onDeepLink(url);
      return;
    }

    // Default deep link handling
    try {
      const parsedUrl = new URL(url);
      const path = parsedUrl.pathname + parsedUrl.search;

      // Navigate to the path
      if (path && path !== '/') {
        router.push(path);
      }
    } catch {
      console.warn('Invalid deep link URL:', url);
    }
  }, [options, router]);

  // Handle app state changes
  const handleStateChange = useCallback((state: { isActive: boolean }) => {
    if (options.onStateChange) {
      options.onStateChange(state.isActive);
    }

    // Sync data when app becomes active
    if (state.isActive) {
      // Trigger any pending syncs
      window.dispatchEvent(new CustomEvent('app-active'));
    }
  }, [options]);

  useEffect(() => {
    if (!isNative()) return;

    // Initialize status bar
    const initStatusBar = async () => {
      await nativeBridge.statusBar.setStyle('dark');
      await nativeBridge.statusBar.setBackgroundColor('#1A1F2E');
      await nativeBridge.statusBar.setOverlaysWebView(true);
    };

    // Hide splash screen after a delay
    const hideSplash = async () => {
      // Wait for app to be ready
      await new Promise((resolve) => setTimeout(resolve, 500));
      await nativeBridge.splashScreen.hide(300);
    };

    // Initialize keyboard settings
    const initKeyboard = async () => {
      await nativeBridge.keyboard.setResizeMode('body');
      await nativeBridge.keyboard.setScroll(true);
    };

    // Set up listeners
    nativeBridge.app.addBackButtonListener(handleBackButton);
    nativeBridge.app.addUrlOpenListener(handleDeepLink);
    nativeBridge.app.addStateChangeListener(handleStateChange);

    // Run initializations
    initStatusBar();
    hideSplash();
    initKeyboard();

    // Log app info
    nativeBridge.app.getInfo().then((info) => {
      if (info) {
        console.log(`[Capacitor] ${info.name} v${info.version} (${info.build})`);
      }
    });

    return () => {
      // Listeners are cleaned up automatically by Capacitor
    };
  }, [handleBackButton, handleDeepLink, handleStateChange]);
}

/**
 * Initialize push notifications for native apps
 */
export function useCapacitorPush(onToken?: (token: string) => void) {
  useEffect(() => {
    if (!isNative()) return;

    const initPush = async () => {
      // Request permission
      const permission = await nativeBridge.pushNotifications.requestPermission();

      if (permission === 'granted') {
        // Register for push
        await nativeBridge.pushNotifications.register();

        // Set up listeners
        const cleanup = nativeBridge.pushNotifications.addListeners({
          onRegistration: (token) => {
            console.log('[Push] Registered with token:', token.value);
            onToken?.(token.value);
          },
          onRegistrationError: (error) => {
            console.error('[Push] Registration failed:', error);
          },
          onPushReceived: (notification) => {
            console.log('[Push] Received:', notification);
          },
          onPushActionPerformed: (action) => {
            console.log('[Push] Action:', action);
            // Handle notification tap - navigate to relevant screen
            const data = action.notification.data;
            if (data?.path) {
              window.location.href = data.path;
            }
          },
        });

        return cleanup;
      }
    };

    let cleanup: (() => void) | undefined;
    initPush().then((c) => { cleanup = c; });

    return () => {
      cleanup?.();
    };
  }, [onToken]);
}

export default useCapacitorInit;
