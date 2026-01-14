/**
 * Hooks barrel export
 */

// Core hooks
export { useOnlineStatus } from './useOnlineStatus';
export { useHaptic } from './useHaptic';
export { useMatchState, useHoleResults } from './useMatchState';
export { useOnboarding } from './useOnboarding';

// Optimistic updates & sync
export {
  useOptimistic,
  useSyncQueue,
  addPendingOperation,
  removePendingOperation,
  getPendingOperationsCount,
} from './useOptimistic';

// Connection-aware data fetching
export {
  useConnectionAwareFetch,
  useConnectionQuality,
  usePrefetch,
  useOfflineMutation,
  getConnectionQuality,
  type ConnectionQuality,
  type FetchOptions,
  type ConnectionAwareResult,
} from './useConnectionAware';
