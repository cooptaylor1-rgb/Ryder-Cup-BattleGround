/**
 * Safe Storage Utility
 *
 * Wrapper around localStorage/sessionStorage that:
 * - Handles private browsing mode (throws QuotaExceededError)
 * - Handles storage quota exceeded errors
 * - Provides fallback to in-memory storage
 * - Handles SSR (server-side rendering) gracefully
 * - Includes JSON serialization/deserialization
 */

import { createLogger } from './logger';

const logger = createLogger('Storage');

// ============================================
// IN-MEMORY FALLBACK
// ============================================

const memoryStorage = new Map<string, string>();

// ============================================
// STORAGE AVAILABILITY CHECK
// ============================================

let localStorageAvailable: boolean | null = null;
let sessionStorageAvailable: boolean | null = null;

function isStorageAvailable(type: 'localStorage' | 'sessionStorage'): boolean {
    // Check cached result
    if (type === 'localStorage' && localStorageAvailable !== null) {
        return localStorageAvailable;
    }
    if (type === 'sessionStorage' && sessionStorageAvailable !== null) {
        return sessionStorageAvailable;
    }

    // SSR check
    if (typeof window === 'undefined') {
        return false;
    }

    try {
        const storage = window[type];
        const testKey = '__storage_test__';
        storage.setItem(testKey, testKey);
        storage.removeItem(testKey);

        // Cache result
        if (type === 'localStorage') {
            localStorageAvailable = true;
        } else {
            sessionStorageAvailable = true;
        }

        return true;
    } catch (e) {
        // Cache negative result
        if (type === 'localStorage') {
            localStorageAvailable = false;
        } else {
            sessionStorageAvailable = false;
        }

        logger.warn(`${type} not available:`, e);
        return false;
    }
}

// ============================================
// SAFE STORAGE CLASS
// ============================================

class SafeStorage {
    private storage: Storage | null = null;
    private type: 'localStorage' | 'sessionStorage';
    private useMemoryFallback: boolean = false;

    constructor(type: 'localStorage' | 'sessionStorage') {
        this.type = type;
    }

    private getStorage(): Storage | null {
        // Lazy initialization
        if (this.storage === null && !this.useMemoryFallback) {
            if (isStorageAvailable(this.type)) {
                this.storage = typeof window !== 'undefined' ? window[this.type] : null;
            } else {
                this.useMemoryFallback = true;
                logger.info(`Using memory fallback for ${this.type}`);
            }
        }
        return this.storage;
    }

    /**
     * Get an item from storage
     */
    getItem(key: string): string | null {
        try {
            const storage = this.getStorage();
            if (storage) {
                return storage.getItem(key);
            }
            return memoryStorage.get(key) ?? null;
        } catch (e) {
            logger.error(`Failed to get item "${key}":`, e);
            return memoryStorage.get(key) ?? null;
        }
    }

    /**
     * Set an item in storage
     */
    setItem(key: string, value: string): boolean {
        try {
            const storage = this.getStorage();
            if (storage) {
                storage.setItem(key, value);
                return true;
            }
            memoryStorage.set(key, value);
            return true;
        } catch (e) {
            // Handle quota exceeded
            if (e instanceof Error && (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED')) {
                logger.warn(`Storage quota exceeded for "${key}", using memory fallback`);
                memoryStorage.set(key, value);
                return true;
            }
            logger.error(`Failed to set item "${key}":`, e);
            memoryStorage.set(key, value);
            return false;
        }
    }

    /**
     * Remove an item from storage
     */
    removeItem(key: string): boolean {
        try {
            const storage = this.getStorage();
            if (storage) {
                storage.removeItem(key);
            }
            memoryStorage.delete(key);
            return true;
        } catch (e) {
            logger.error(`Failed to remove item "${key}":`, e);
            memoryStorage.delete(key);
            return false;
        }
    }

    /**
     * Clear all items from storage
     */
    clear(): boolean {
        try {
            const storage = this.getStorage();
            if (storage) {
                storage.clear();
            }
            memoryStorage.clear();
            return true;
        } catch (e) {
            logger.error('Failed to clear storage:', e);
            memoryStorage.clear();
            return false;
        }
    }

    /**
     * Get all keys in storage
     */
    keys(): string[] {
        try {
            const storage = this.getStorage();
            if (storage) {
                return Object.keys(storage);
            }
            return Array.from(memoryStorage.keys());
        } catch (e) {
            logger.error('Failed to get keys:', e);
            return Array.from(memoryStorage.keys());
        }
    }

    /**
     * Get the number of items in storage
     */
    get length(): number {
        try {
            const storage = this.getStorage();
            if (storage) {
                return storage.length;
            }
            return memoryStorage.size;
        } catch {
            return memoryStorage.size;
        }
    }
}

// ============================================
// TYPED STORAGE HELPERS
// ============================================

/**
 * Get a JSON-parsed value from storage
 */
export function getJSON<T>(key: string, defaultValue: T): T {
    try {
        const value = safeLocalStorage.getItem(key);
        if (value === null) return defaultValue;
        return JSON.parse(value) as T;
    } catch (e) {
        logger.error(`Failed to parse JSON for "${key}":`, e);
        return defaultValue;
    }
}

/**
 * Set a JSON-serialized value in storage
 */
export function setJSON<T>(key: string, value: T): boolean {
    try {
        const serialized = JSON.stringify(value);
        return safeLocalStorage.setItem(key, serialized);
    } catch (e) {
        logger.error(`Failed to serialize JSON for "${key}":`, e);
        return false;
    }
}

/**
 * Get a JSON-parsed value from session storage
 */
export function getSessionJSON<T>(key: string, defaultValue: T): T {
    try {
        const value = safeSessionStorage.getItem(key);
        if (value === null) return defaultValue;
        return JSON.parse(value) as T;
    } catch (e) {
        logger.error(`Failed to parse session JSON for "${key}":`, e);
        return defaultValue;
    }
}

/**
 * Set a JSON-serialized value in session storage
 */
export function setSessionJSON<T>(key: string, value: T): boolean {
    try {
        const serialized = JSON.stringify(value);
        return safeSessionStorage.setItem(key, serialized);
    } catch (e) {
        logger.error(`Failed to serialize session JSON for "${key}":`, e);
        return false;
    }
}

// ============================================
// SINGLETON EXPORTS
// ============================================

export const safeLocalStorage = new SafeStorage('localStorage');
export const safeSessionStorage = new SafeStorage('sessionStorage');

/**
 * Check if storage is available (not in private browsing, etc.)
 */
export function isLocalStorageAvailable(): boolean {
    return isStorageAvailable('localStorage');
}

export function isSessionStorageAvailable(): boolean {
    return isStorageAvailable('sessionStorage');
}
