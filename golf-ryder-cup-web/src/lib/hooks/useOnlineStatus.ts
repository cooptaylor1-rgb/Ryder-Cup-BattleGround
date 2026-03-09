/**
 * useOnlineStatus Hook
 *
 * Tracks online/offline status and syncs with UI store.
 * Shows toast notifications on status changes.
 */

'use client';

import { useSyncExternalStore } from 'react';
import { useUIStore } from '../stores';

function subscribeToOnlineStatus(callback: () => void): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const emit = () => {
    useUIStore.getState().setOnlineStatus(navigator.onLine);
    callback();
  };

  window.addEventListener('online', emit);
  window.addEventListener('offline', emit);
  emit();

  return () => {
    window.removeEventListener('online', emit);
    window.removeEventListener('offline', emit);
  };
}

function getOnlineSnapshot(): boolean {
  return typeof navigator === 'undefined' ? true : navigator.onLine;
}

/**
 * Hook to track online/offline status
 *
 * @returns Current online status
 */
export function useOnlineStatus(): boolean {
    return useSyncExternalStore(subscribeToOnlineStatus, getOnlineSnapshot, () => true);
}

export default useOnlineStatus;
