/**
 * Hooks barrel export
 *
 * Phase 5: Data Integration & Hooks
 */

// Core hooks
export { useOnlineStatus } from './useOnlineStatus';
export { useHaptic } from './useHaptic';
export { useMatchState, useHoleResults } from './useMatchState';
export { useOnboarding } from './useOnboarding';
export { useHomeData } from './useHomeData';

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

// ============================================
// Phase 5: Data Integration Hooks
// ============================================

// Match scoring management
export {
  useMatchScoring,
  type HoleScore,
  type MatchStatus,
  type PlayerRoundStats,
} from './useMatchScoring';

// Real-time live updates
export {
  useLiveUpdates,
  useLiveMatchScores,
  useMatchCompletions,
  useLiveReactions,
  type LiveUpdate,
  type LiveUpdateType,
} from './useLiveUpdates';

// Offline queue management
export {
  useOfflineQueue,
  type QueuedAction,
} from './useOfflineQueue';

// Trip data management
export {
  useTripData,
  useTripStandings,
  useTripPlayers,
  type Trip,
  type TripPlayer,
  type TripSession,
  type TripStandings,
  type TripActivity,
} from './useTripData';

// Player statistics
export {
  usePlayerStats,
  useTripLeaderboard,
  useHeadToHead,
  type RoundStats,
  type CareerStats,
  type HeadToHeadRecord,
  type ScoringTrend,
  type Achievement,
} from './usePlayerStats';
