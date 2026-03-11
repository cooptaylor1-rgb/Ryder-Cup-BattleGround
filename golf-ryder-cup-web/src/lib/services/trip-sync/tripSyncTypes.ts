export interface TripSyncResult {
  success: boolean;
  tripId: string;
  cloudId?: string;
  error?: string;
  queued?: boolean;
}

export interface BulkSyncResult {
  success: boolean;
  synced: number;
  failed: number;
  queued: number;
  errors: string[];
}

export type SyncStatus = 'synced' | 'pending' | 'syncing' | 'failed' | 'offline' | 'unknown';
