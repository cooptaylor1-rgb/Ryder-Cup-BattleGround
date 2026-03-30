/**
 * Sync Orchestrator
 *
 * Single point of control for online/offline event listeners.
 * Sync services register their handlers here instead of attaching
 * their own window event listeners independently.
 *
 * This prevents duplicate listener registration and potential race
 * conditions when multiple sync services react to the same online event.
 */

import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('SyncOrchestrator');

// ============================================
// TYPES
// ============================================

export interface SyncHandler {
  /** Called when the browser transitions to online */
  onOnline: () => void;
  /** Called when the browser transitions to offline */
  onOffline: () => void;
}

// ============================================
// STATE
// ============================================

const handlers = new Map<string, SyncHandler>();
let isListening = false;

// ============================================
// INTERNAL HANDLERS
// ============================================

function handleOnline(): void {
  logger.log(`Network online — notifying ${handlers.size} sync services`);
  for (const [name, handler] of handlers) {
    try {
      handler.onOnline();
    } catch (err) {
      logger.error(`Error in ${name}.onOnline:`, err);
    }
  }
}

function handleOffline(): void {
  logger.log(`Network offline — notifying ${handlers.size} sync services`);
  for (const [name, handler] of handlers) {
    try {
      handler.onOffline();
    } catch (err) {
      logger.error(`Error in ${name}.onOffline:`, err);
    }
  }
}

// ============================================
// PUBLIC API
// ============================================

/**
 * Register a sync service to be notified of online/offline transitions.
 * Returns a cleanup function to unregister.
 */
export function registerSyncHandler(name: string, handler: SyncHandler): () => void {
  handlers.set(name, handler);
  ensureListening();

  return () => {
    handlers.delete(name);
    if (handlers.size === 0) {
      stopListening();
    }
  };
}

/**
 * Initialize the orchestrator and start listening for network events.
 * Call once at app startup. Returns a cleanup function.
 */
export function initSyncOrchestrator(): () => void {
  ensureListening();
  return stopListening;
}

/**
 * Check if the browser is currently online.
 */
export function isOnline(): boolean {
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
}

// ============================================
// LIFECYCLE
// ============================================

function ensureListening(): void {
  if (isListening || typeof window === 'undefined') return;

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  isListening = true;
  logger.log('Network listeners attached');
}

function stopListening(): void {
  if (!isListening || typeof window === 'undefined') return;

  window.removeEventListener('online', handleOnline);
  window.removeEventListener('offline', handleOffline);
  isListening = false;
  handlers.clear();
  logger.log('Network listeners removed');
}
