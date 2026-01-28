'use client';

import { useEffect, useState, createContext, useContext, ReactNode } from 'react';
import {
  registerServiceWorker,
  skipWaiting,
  isOnline,
  isInstalledPWA,
  type SWUpdateCallback,
} from '@/lib/utils/serviceWorker';
import { pwaLogger } from '@/lib/utils/logger';

interface PWAContextValue {
  isOnline: boolean;
  isInstalled: boolean;
  hasUpdate: boolean;
  updateApp: () => void;
}

const PWAContext = createContext<PWAContextValue>({
  isOnline: true,
  isInstalled: false,
  hasUpdate: false,
  updateApp: () => {},
});

export function usePWA() {
  return useContext(PWAContext);
}

interface PWAProviderProps {
  children: ReactNode;
}

export function PWAProvider({ children }: PWAProviderProps) {
  const [online, setOnline] = useState(true);
  const [installed, setInstalled] = useState(false);
  const [hasUpdate, setHasUpdate] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    // Check initial state - deferred to avoid setState-in-effect
    const timeoutId = setTimeout(() => {
      setOnline(isOnline());
      setInstalled(isInstalledPWA());
    }, 0);

    // Register service worker
    const handleUpdate: SWUpdateCallback = (reg) => {
      setHasUpdate(true);
      setRegistration(reg);
    };

    registerServiceWorker({
      onUpdate: handleUpdate,
      onOffline: () => setOnline(false),
      onOnline: () => setOnline(true),
      onSuccess: () => {
        pwaLogger.log('App ready for offline use');
      },
    });

    return () => clearTimeout(timeoutId);

    // Listen for online/offline events
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Listen for display mode changes (user installs/uninstalls PWA)
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleDisplayModeChange = (e: MediaQueryListEvent) => {
      setInstalled(e.matches);
    };
    mediaQuery.addEventListener('change', handleDisplayModeChange);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      mediaQuery.removeEventListener('change', handleDisplayModeChange);
    };
  }, []);

  const updateApp = () => {
    if (registration?.waiting) {
      skipWaiting();
      // Reload once the new SW takes over - use once to avoid leak
      navigator.serviceWorker.addEventListener(
        'controllerchange',
        () => {
          window.location.reload();
        },
        { once: true }
      );

      // iOS Safari fallback: if controllerchange doesn't fire within 3s, force reload
      // This handles cases where iOS Safari's SW behavior differs from other browsers
      setTimeout(() => {
        window.location.reload();
      }, 3000);
    } else {
      // No waiting worker - just reload to get fresh content
      // This handles iOS Safari edge cases where the SW state isn't as expected
      window.location.reload();
    }
  };

  return (
    <PWAContext.Provider value={{ isOnline: online, isInstalled: installed, hasUpdate, updateApp }}>
      {children}
    </PWAContext.Provider>
  );
}
