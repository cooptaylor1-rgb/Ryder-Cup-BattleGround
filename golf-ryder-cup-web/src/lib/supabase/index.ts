/**
 * Supabase Module - Barrel Export
 *
 * Real-time sync capabilities for the Golf Ryder Cup App.
 */

export {
    supabase,
    isSupabaseConfigured,
    getSupabase,
    insertRecord,
    updateRecord,
    upsertRecord,
    deleteRecord,
} from './client';
export type { ConnectionStatus, TableName } from './client';

// Note: the legacy syncService and its localStorage-backed pending-changes
// queue have been removed. All sync now flows through the typed
// IndexedDB queue in src/lib/services/trip-sync/. Import pullTripByShareCode
// and syncTripToCloudFull from '@/lib/services/tripSyncService'.

export { useRealtime, useLiveScores } from './useRealtime';
export type { RealtimeUser, UseRealtimeResult, LiveScore } from './useRealtime';

export type * from './types';
