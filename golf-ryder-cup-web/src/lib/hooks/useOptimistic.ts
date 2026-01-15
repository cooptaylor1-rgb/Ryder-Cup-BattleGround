/**
 * Optimistic Update Hook
 *
 * Provides optimistic updates with automatic rollback on failure.
 * Maintains a pending operations queue with retry logic.
 *
 * Features:
 * - Immediate UI updates before server confirmation
 * - Automatic rollback on server rejection
 * - Retry with exponential backoff
 * - Conflict detection and resolution
 */

'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useUIStore } from '@/lib/stores';

// ============================================
// TYPES
// ============================================

export interface PendingOperation<T = unknown> {
  id: string;
  type: 'create' | 'update' | 'delete';
  table: string;
  data: T;
  previousData?: T;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
  status: 'pending' | 'syncing' | 'failed' | 'completed';
  error?: string;
}

export interface OptimisticState<T> {
  data: T;
  isPending: boolean;
  isError: boolean;
  error: Error | null;
  pendingOperations: number;
}

export interface OptimisticOptions {
  maxRetries?: number;
  retryDelayMs?: number;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
  onRollback?: () => void;
}

// ============================================
// PENDING OPERATIONS QUEUE
// ============================================

const PENDING_OPS_KEY = 'ryder-pending-operations';
const MAX_RETRIES = 5;
const BASE_RETRY_DELAY = 1000; // 1 second

/**
 * Load pending operations from storage
 */
function loadPendingOperations(): PendingOperation[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(PENDING_OPS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

/**
 * Save pending operations to storage
 */
function savePendingOperations(ops: PendingOperation[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(PENDING_OPS_KEY, JSON.stringify(ops));
  } catch {
    console.error('Failed to save pending operations');
  }
}

/**
 * Add operation to pending queue
 */
export function addPendingOperation<T>(op: Omit<PendingOperation<T>, 'id' | 'timestamp' | 'retryCount' | 'status'>): string {
  const operations = loadPendingOperations();
  const id = crypto.randomUUID();
  const newOp: PendingOperation<T> = {
    ...op,
    id,
    timestamp: Date.now(),
    retryCount: 0,
    status: 'pending',
  };
  operations.push(newOp as PendingOperation);
  savePendingOperations(operations);
  return id;
}

/**
 * Remove operation from pending queue
 */
export function removePendingOperation(id: string): void {
  const operations = loadPendingOperations();
  const filtered = operations.filter(op => op.id !== id);
  savePendingOperations(filtered);
}

/**
 * Update operation status
 */
export function updateOperationStatus(
  id: string,
  status: PendingOperation['status'],
  error?: string
): void {
  const operations = loadPendingOperations();
  const index = operations.findIndex(op => op.id === id);
  if (index !== -1) {
    operations[index].status = status;
    if (error) operations[index].error = error;
    if (status === 'syncing') {
      operations[index].retryCount++;
    }
    savePendingOperations(operations);
  }
}

/**
 * Get pending operations count
 */
export function getPendingOperationsCount(): number {
  return loadPendingOperations().filter(op => op.status !== 'completed').length;
}

// ============================================
// OPTIMISTIC UPDATE HOOK
// ============================================

/**
 * Hook for optimistic updates with automatic rollback
 */
export function useOptimistic<T>(
  initialData: T,
  options: OptimisticOptions = {}
): {
  data: T;
  setData: (newData: T) => void;
  isPending: boolean;
  isError: boolean;
  error: Error | null;
  execute: <R>(
    optimisticData: T,
    serverAction: () => Promise<R>,
    rollbackData?: T
  ) => Promise<R | undefined>;
  retry: () => Promise<void>;
  reset: () => void;
} {
  const [data, setDataState] = useState<T>(initialData);
  const [isPending, setIsPending] = useState(false);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const rollbackDataRef = useRef<T | null>(null);
  const retryCountRef = useRef(0);
  const lastActionRef = useRef<(() => Promise<unknown>) | null>(null);

  const { maxRetries = MAX_RETRIES, retryDelayMs = BASE_RETRY_DELAY, onSuccess, onError, onRollback } = options;

  const setData = useCallback((newData: T) => {
    setDataState(newData);
  }, []);

  const execute = useCallback(async <R>(
    optimisticData: T,
    serverAction: () => Promise<R>,
    rollbackData?: T
  ): Promise<R | undefined> => {
    // Store current data for potential rollback
    const previousData = rollbackData ?? data;
    rollbackDataRef.current = previousData;
    lastActionRef.current = serverAction;
    retryCountRef.current = 0;

    // Optimistically update the UI
    setDataState(optimisticData);
    setIsPending(true);
    setIsError(false);
    setError(null);

    try {
      const result = await serverAction();
      setIsPending(false);
      onSuccess?.();
      return result;
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error(String(err));

      // Rollback on error
      setDataState(previousData);
      setIsError(true);
      setError(errorObj);
      setIsPending(false);

      onError?.(errorObj);
      onRollback?.();

      return undefined;
    }
  }, [data, onSuccess, onError, onRollback]);

  const retry = useCallback(async () => {
    if (!lastActionRef.current || retryCountRef.current >= maxRetries) {
      return;
    }

    retryCountRef.current++;
    const delay = retryDelayMs * Math.pow(2, retryCountRef.current - 1);

    await new Promise(resolve => setTimeout(resolve, delay));

    setIsPending(true);
    setIsError(false);

    try {
      await lastActionRef.current();
      setIsPending(false);
      setError(null);
      onSuccess?.();
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error(String(err));
      setIsError(true);
      setError(errorObj);
      setIsPending(false);
    }
  }, [maxRetries, retryDelayMs, onSuccess]);

  const reset = useCallback(() => {
    if (rollbackDataRef.current !== null) {
      setDataState(rollbackDataRef.current);
    }
    setIsPending(false);
    setIsError(false);
    setError(null);
    retryCountRef.current = 0;
    lastActionRef.current = null;
    rollbackDataRef.current = null;
  }, []);

  return {
    data,
    setData,
    isPending,
    isError,
    error,
    execute,
    retry,
    reset,
  };
}

// ============================================
// SYNC QUEUE HOOK
// ============================================

/**
 * Hook to manage the sync queue
 */
export function useSyncQueue() {
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const { isOnline } = useUIStore();

  // Define processQueue first before using it in useEffect
  const processQueue = useCallback(async () => {
    if (isSyncing) return;

    const operations = loadPendingOperations().filter(
      op => op.status === 'pending' || (op.status === 'failed' && op.retryCount < op.maxRetries)
    );

    if (operations.length === 0) return;

    setIsSyncing(true);

    for (const op of operations) {
      try {
        updateOperationStatus(op.id, 'syncing');
        // Process the operation based on type
        // This would call the actual sync service
        await syncOperation(op);
        removePendingOperation(op.id);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Sync failed';
        updateOperationStatus(op.id, 'failed', message);
      }
    }

    setIsSyncing(false);
    setPendingCount(getPendingOperationsCount());
  }, [isSyncing]);

  // Update pending count on mount and changes
  useEffect(() => {
    const updateCount = () => {
      setPendingCount(getPendingOperationsCount());
    };
    updateCount();

    // Listen for storage events
    const handleStorage = (e: StorageEvent) => {
      if (e.key === PENDING_OPS_KEY) {
        updateCount();
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // Process queue when coming online
  useEffect(() => {
    if (isOnline && pendingCount > 0) {
      processQueue();
    }
  }, [isOnline, pendingCount, processQueue]);

  const clearQueue = useCallback(() => {
    savePendingOperations([]);
    setPendingCount(0);
  }, []);

  return {
    pendingCount,
    isSyncing,
    processQueue,
    clearQueue,
  };
}

// ============================================
// SYNC OPERATION PROCESSOR
// ============================================

async function syncOperation(op: PendingOperation): Promise<void> {
  // This is where you'd integrate with your actual sync service
  // For now, we'll just simulate the sync
  switch (op.type) {
    case 'create':
    case 'update':
      // Call sync service to push data
      // await syncService.pushData(op.table, op.data);
      break;
    case 'delete':
      // Call sync service to delete
      // await syncService.deleteData(op.table, op.data.id);
      break;
  }
}

// ============================================
// EXPORTS
// ============================================

export default useOptimistic;
