/**
 * Base Sync Service
 *
 * Abstract base class for sync services that provides common functionality:
 * - Network status monitoring with proper cleanup
 * - Debounced queue processing
 * - Exponential backoff retry logic
 * - Online/offline state management
 *
 * Extend this class to create specific sync services (trip, course, etc.)
 */

import { createLogger, Logger } from '@/lib/utils/logger';

// ============================================
// TYPES
// ============================================

export interface BaseSyncConfig {
    /** Service name for logging */
    name: string;
    /** Maximum retry attempts before marking as failed */
    maxRetryCount?: number;
    /** Base delay between retries in milliseconds */
    baseRetryDelayMs?: number;
    /** Maximum delay between retries in milliseconds */
    maxRetryDelayMs?: number;
    /** Debounce time for queue processing in milliseconds */
    syncDebounceMs?: number;
}

export interface SyncServiceState {
    isOnline: boolean;
    syncInProgress: boolean;
}

// ============================================
// DEFAULT CONFIG
// ============================================

const DEFAULT_CONFIG: Required<Omit<BaseSyncConfig, 'name'>> = {
    maxRetryCount: 5,
    baseRetryDelayMs: 1000,
    maxRetryDelayMs: 30000,
    syncDebounceMs: 1000,
};

// ============================================
// BASE SYNC SERVICE
// ============================================

export abstract class BaseSyncService {
    protected readonly logger: Logger;
    protected readonly config: Required<BaseSyncConfig>;

    // State
    protected isOnline: boolean;
    protected syncInProgress: boolean = false;
    protected syncDebounceTimer: ReturnType<typeof setTimeout> | null = null;

    // Network listener references for cleanup
    private onlineHandler: (() => void) | null = null;
    private offlineHandler: (() => void) | null = null;

    constructor(config: BaseSyncConfig) {
        this.config = {
            ...DEFAULT_CONFIG,
            ...config,
        };
        this.logger = createLogger(this.config.name);
        this.isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    }

    // ============================================
    // ABSTRACT METHODS (implement in subclasses)
    // ============================================

    /**
     * Check if the service can perform sync operations.
     * Override to add additional checks (e.g., API key configured).
     */
    protected abstract canSync(): boolean;

    /**
     * Process the sync queue. Called when online and debounced.
     */
    protected abstract processQueue(): Promise<void>;

    // ============================================
    // NETWORK MANAGEMENT
    // ============================================

    /**
     * Initialize network listeners for automatic sync on reconnect.
     * Returns a cleanup function to remove listeners.
     */
    public initNetworkListeners(): () => void {
        if (typeof window === 'undefined') return () => { };

        // Clean up any existing listeners first
        this.cleanupNetworkListeners();

        this.onlineHandler = () => {
            this.isOnline = true;
            this.logger.log('Network online - triggering sync');
            this.debouncedProcessQueue();
        };

        this.offlineHandler = () => {
            this.isOnline = false;
            this.logger.log('Network offline - queuing changes');
        };

        window.addEventListener('online', this.onlineHandler);
        window.addEventListener('offline', this.offlineHandler);

        this.isOnline = navigator.onLine;

        return () => this.cleanupNetworkListeners();
    }

    /**
     * Clean up network listeners to prevent memory leaks.
     */
    public cleanupNetworkListeners(): void {
        if (typeof window === 'undefined') return;

        if (this.onlineHandler) {
            window.removeEventListener('online', this.onlineHandler);
            this.onlineHandler = null;
        }
        if (this.offlineHandler) {
            window.removeEventListener('offline', this.offlineHandler);
            this.offlineHandler = null;
        }
    }

    // ============================================
    // QUEUE PROCESSING
    // ============================================

    /**
     * Debounced queue processing to avoid rapid-fire syncs.
     */
    protected debouncedProcessQueue(): void {
        if (this.syncDebounceTimer) {
            clearTimeout(this.syncDebounceTimer);
        }

        this.syncDebounceTimer = setTimeout(() => {
            this.syncDebounceTimer = null;
            if (this.canSync() && !this.syncInProgress) {
                this.processQueue().catch((err) => {
                    this.logger.error('Queue processing error:', err);
                });
            }
        }, this.config.syncDebounceMs);
    }

    // ============================================
    // RETRY LOGIC
    // ============================================

    /**
     * Calculate exponential backoff delay with jitter.
     */
    protected getRetryDelay(retryCount: number): number {
        const delay = Math.min(
            this.config.baseRetryDelayMs * Math.pow(2, retryCount),
            this.config.maxRetryDelayMs
        );
        // Add jitter (±20%) to prevent thundering herd
        return delay * (0.8 + Math.random() * 0.4);
    }

    /**
     * Check if retry count exceeds maximum.
     */
    protected shouldRetry(retryCount: number): boolean {
        return retryCount < this.config.maxRetryCount;
    }

    // ============================================
    // UTILITIES
    // ============================================

    /**
     * Sleep for specified milliseconds.
     */
    protected sleep(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    /**
     * Get current sync state.
     */
    public getState(): SyncServiceState {
        return {
            isOnline: this.isOnline,
            syncInProgress: this.syncInProgress,
        };
    }

    // ============================================
    // LIFECYCLE
    // ============================================

    /**
     * Initialize the service.
     * Returns a cleanup function.
     */
    public init(): () => void {
        const cleanupNetworkListeners = this.initNetworkListeners();

        // Process any pending items on startup
        if (this.canSync()) {
            setTimeout(() => {
                this.processQueue().catch((err) => {
                    this.logger.error('Startup sync error:', err);
                });
            }, 3000);
        }

        return () => {
            cleanupNetworkListeners();
            if (this.syncDebounceTimer) {
                clearTimeout(this.syncDebounceTimer);
                this.syncDebounceTimer = null;
            }
        };
    }

    /**
     * Clean up all resources.
     */
    public dispose(): void {
        this.cleanupNetworkListeners();
        if (this.syncDebounceTimer) {
            clearTimeout(this.syncDebounceTimer);
            this.syncDebounceTimer = null;
        }
    }
}

// ============================================
// STANDALONE UTILITIES
// Shared by functional-style sync modules (tripSyncService, etc.)
// that don't extend the class but need the same retry/backoff logic.
// ============================================

/**
 * Calculate exponential backoff delay with jitter.
 * Standalone version of BaseSyncService.getRetryDelay for use in
 * functional modules that can't extend the class.
 */
export function calcRetryDelay(
    retryCount: number,
    baseDelayMs: number = DEFAULT_CONFIG.baseRetryDelayMs,
    maxDelayMs: number = DEFAULT_CONFIG.maxRetryDelayMs
): number {
    const delay = Math.min(baseDelayMs * Math.pow(2, retryCount), maxDelayMs);
    return delay * (0.8 + Math.random() * 0.4);
}

/**
 * Sleep for specified milliseconds.
 */
export function syncSleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Check if retry count is below maximum.
 */
export function canRetry(
    retryCount: number,
    maxRetryCount: number = DEFAULT_CONFIG.maxRetryCount
): boolean {
    return retryCount < maxRetryCount;
}

/** Re-export default config for use by functional sync modules */
export { DEFAULT_CONFIG as SYNC_DEFAULTS };
