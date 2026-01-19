/**
 * Fetch With Timeout & Circuit Breaker
 *
 * Production-safe fetch wrapper that:
 * - Adds timeout support (prevents hanging requests)
 * - Implements circuit breaker pattern
 * - Provides retry with exponential backoff
 * - Handles network errors gracefully
 */

import { createLogger } from './logger';

const logger = createLogger('Fetch');

// ============================================
// TYPES
// ============================================

interface FetchOptions extends RequestInit {
    /** Timeout in milliseconds (default: 10000) */
    timeout?: number;
    /** Number of retry attempts (default: 3) */
    retries?: number;
    /** Base delay between retries in ms (default: 1000) */
    retryDelay?: number;
    /** Circuit breaker key for grouping related requests */
    circuitKey?: string;
}

interface CircuitState {
    failures: number;
    lastFailure: number;
    isOpen: boolean;
}

// ============================================
// CIRCUIT BREAKER STATE
// ============================================

const circuitBreakers = new Map<string, CircuitState>();

const CIRCUIT_THRESHOLD = 5; // Number of failures before opening
const CIRCUIT_RESET_TIME = 30000; // 30 seconds before trying again

function getCircuitState(key: string): CircuitState {
    if (!circuitBreakers.has(key)) {
        circuitBreakers.set(key, { failures: 0, lastFailure: 0, isOpen: false });
    }
    return circuitBreakers.get(key)!;
}

function recordFailure(key: string): void {
    const state = getCircuitState(key);
    state.failures++;
    state.lastFailure = Date.now();

    if (state.failures >= CIRCUIT_THRESHOLD) {
        state.isOpen = true;
        logger.warn(`Circuit breaker opened for: ${key}`);
    }
}

function recordSuccess(key: string): void {
    const state = getCircuitState(key);
    state.failures = 0;
    state.isOpen = false;
}

function isCircuitOpen(key: string): boolean {
    const state = getCircuitState(key);

    if (!state.isOpen) return false;

    // Check if we should try again (half-open state)
    if (Date.now() - state.lastFailure > CIRCUIT_RESET_TIME) {
        state.isOpen = false; // Allow one request through
        return false;
    }

    return true;
}

// ============================================
// FETCH WITH TIMEOUT
// ============================================

/**
 * Fetch with timeout support
 */
export async function fetchWithTimeout(
    url: string,
    options: FetchOptions = {}
): Promise<Response> {
    const {
        timeout = 10000,
        retries = 0,
        retryDelay = 1000,
        circuitKey,
        ...fetchOptions
    } = options;

    // Check circuit breaker
    if (circuitKey && isCircuitOpen(circuitKey)) {
        throw new FetchError(
            'Service temporarily unavailable (circuit breaker open)',
            'CIRCUIT_OPEN',
            503
        );
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
        const response = await fetch(url, {
            ...fetchOptions,
            signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (circuitKey) {
            recordSuccess(circuitKey);
        }

        return response;
    } catch (error) {
        clearTimeout(timeoutId);

        if (circuitKey) {
            recordFailure(circuitKey);
        }

        // Handle abort (timeout)
        if (error instanceof Error && error.name === 'AbortError') {
            throw new FetchError(
                `Request timed out after ${timeout}ms`,
                'TIMEOUT',
                408
            );
        }

        // Handle network errors
        if (error instanceof TypeError) {
            throw new FetchError(
                'Network error - please check your connection',
                'NETWORK_ERROR',
                0
            );
        }

        throw error;
    }
}

/**
 * Fetch with automatic retry and exponential backoff
 */
export async function fetchWithRetry(
    url: string,
    options: FetchOptions = {}
): Promise<Response> {
    const { retries = 3, retryDelay = 1000, ...restOptions } = options;

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            const response = await fetchWithTimeout(url, restOptions);

            // Don't retry on client errors (4xx)
            if (response.status >= 400 && response.status < 500) {
                return response;
            }

            // Retry on server errors (5xx)
            if (!response.ok && attempt < retries) {
                throw new FetchError(
                    `Server error: ${response.status}`,
                    'SERVER_ERROR',
                    response.status
                );
            }

            return response;
        } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));

            // Don't retry on circuit breaker or client errors
            if (
                error instanceof FetchError &&
                (error.code === 'CIRCUIT_OPEN' || (error.status >= 400 && error.status < 500))
            ) {
                throw error;
            }

            if (attempt < retries) {
                const delay = retryDelay * Math.pow(2, attempt);
                logger.warn(`Fetch attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
                await sleep(delay);
            }
        }
    }

    throw lastError || new FetchError('All retry attempts failed', 'RETRY_EXHAUSTED', 0);
}

// ============================================
// CUSTOM ERROR CLASS
// ============================================

export class FetchError extends Error {
    constructor(
        message: string,
        public readonly code: string,
        public readonly status: number
    ) {
        super(message);
        this.name = 'FetchError';
    }

    get isTimeout(): boolean {
        return this.code === 'TIMEOUT';
    }

    get isNetworkError(): boolean {
        return this.code === 'NETWORK_ERROR';
    }

    get isCircuitOpen(): boolean {
        return this.code === 'CIRCUIT_OPEN';
    }
}

// ============================================
// HELPERS
// ============================================

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Reset circuit breaker for testing or manual recovery
 */
export function resetCircuitBreaker(key: string): void {
    circuitBreakers.delete(key);
}

/**
 * Get all circuit breaker states (for debugging)
 */
export function getCircuitBreakerStates(): Record<string, CircuitState> {
    const states: Record<string, CircuitState> = {};
    circuitBreakers.forEach((state, key) => {
        states[key] = { ...state };
    });
    return states;
}
