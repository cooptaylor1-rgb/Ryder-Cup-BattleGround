/**
 * Sync Queue Types
 *
 * Shared types for trip-level sync queue persistence.
 */

export type SyncOperation = 'create' | 'update' | 'delete';

export type SyncEntity =
  | 'trip'
  | 'player'
  | 'team'
  | 'teamMember'
  | 'session'
  | 'match'
  | 'holeResult'
  | 'course'
  | 'teeSet';

export interface SyncQueueItem {
  id: string;
  entity: SyncEntity;
  entityId: string;
  operation: SyncOperation;
  data?: unknown;
  tripId: string;
  status: 'pending' | 'syncing' | 'failed' | 'completed';
  retryCount: number;
  createdAt: string;
  lastAttemptAt?: string;
  error?: string;
  idempotencyKey?: string;
}
