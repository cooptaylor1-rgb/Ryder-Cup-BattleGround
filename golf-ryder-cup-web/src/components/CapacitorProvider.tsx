'use client';

/**
 * Capacitor Provider
 *
 * Initializes native Capacitor features when running as a native app.
 * This component should be included in the root layout to ensure
 * native features like haptics, push notifications, and status bar
 * are properly configured on app startup.
 */

import { ReactNode } from 'react';
import { useCapacitorInit, isNative } from '@/lib/capacitor';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('Capacitor');

interface CapacitorProviderProps {
  children: ReactNode;
}

export function CapacitorProvider({ children }: CapacitorProviderProps) {
  // Initialize Capacitor when running as native app
  useCapacitorInit({
    onDeepLink: (url: string) => {
      // Handle deep links - can be extended for specific routes
      logger.info('Deep link received:', url);

      // Parse URL and navigate if needed
      if (typeof window !== 'undefined') {
        const path = new URL(url).pathname;
        if (path && path !== '/') {
          window.location.href = path;
        }
      }
    },
    onStateChange: (isActive: boolean) => {
      // Handle app state changes (foreground/background)
      logger.info('App state:', isActive ? 'active' : 'background');
    },
  });

  // If running as native, we could add native-specific UI here
  // For now, just render children
  return <>{children}</>;
}

/**
 * Hook to check if running as native app
 */
export function useIsNative(): boolean {
  return isNative();
}

export default CapacitorProvider;
