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

export { syncService, useSyncStatus } from './syncService';
export type { SyncResult, SyncStatus } from './syncService';

export { useRealtime, useLiveScores } from './useRealtime';
export type { RealtimeUser, UseRealtimeResult, LiveScore } from './useRealtime';

export type * from './types';
