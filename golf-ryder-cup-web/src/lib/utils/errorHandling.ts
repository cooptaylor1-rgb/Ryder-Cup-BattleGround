/**
 * Error Handling Utilities
 *
 * Standardized error handling patterns for the app.
 * Provides consistent error reporting, logging, and user feedback.
 */

import * as Sentry from '@sentry/nextjs';
import { createLogger } from './logger';

const logger = createLogger('ErrorHandler');

// ============================================
// TYPES
// ============================================

export interface AppError {
    code: string;
    message: string;
    userMessage: string;
    context?: Record<string, unknown>;
    originalError?: unknown;
}

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface ErrorContext {
    component?: string;
    action?: string;
    userId?: string;
    tripId?: string;
    matchId?: string;
    [key: string]: unknown;
}

// ============================================
// ERROR CODES
// ============================================

export const ErrorCodes = {
    // Network errors
    NETWORK_OFFLINE: 'NETWORK_OFFLINE',
    NETWORK_TIMEOUT: 'NETWORK_TIMEOUT',
    NETWORK_ERROR: 'NETWORK_ERROR',

    // Auth errors
    AUTH_INVALID_CREDENTIALS: 'AUTH_INVALID_CREDENTIALS',
    AUTH_SESSION_EXPIRED: 'AUTH_SESSION_EXPIRED',
    AUTH_UNAUTHORIZED: 'AUTH_UNAUTHORIZED',

    // Data errors
    DATA_NOT_FOUND: 'DATA_NOT_FOUND',
    DATA_VALIDATION_FAILED: 'DATA_VALIDATION_FAILED',
    DATA_CONFLICT: 'DATA_CONFLICT',
    DATA_SYNC_FAILED: 'DATA_SYNC_FAILED',

    // Storage errors
    STORAGE_QUOTA_EXCEEDED: 'STORAGE_QUOTA_EXCEEDED',
    STORAGE_UNAVAILABLE: 'STORAGE_UNAVAILABLE',

    // Generic errors
    UNKNOWN_ERROR: 'UNKNOWN_ERROR',
    OPERATION_FAILED: 'OPERATION_FAILED',
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];

// ============================================
// USER-FRIENDLY MESSAGES
// ============================================

// User-facing error copy. Voice rules from docs/TERMINOLOGY.md:
// - lead with reassurance about data safety where applicable
// - name the actual problem (no "Something went wrong")
// - end with a verb-led next action when one exists
const userMessages: Record<ErrorCode, string> = {
    [ErrorCodes.NETWORK_OFFLINE]: 'You’re offline. Your changes are saved here and will sync the moment you’re back online.',
    [ErrorCodes.NETWORK_TIMEOUT]: 'That took too long. Tap to try again.',
    [ErrorCodes.NETWORK_ERROR]: 'Couldn’t reach the server. Your data is safe — try again in a moment.',
    [ErrorCodes.AUTH_INVALID_CREDENTIALS]: 'That email or PIN didn’t match. Try again.',
    [ErrorCodes.AUTH_SESSION_EXPIRED]: 'Your sign-in expired. Please sign in again.',
    [ErrorCodes.AUTH_UNAUTHORIZED]: 'You don’t have permission for that. Ask the captain.',
    [ErrorCodes.DATA_NOT_FOUND]: 'We couldn’t find that.',
    [ErrorCodes.DATA_VALIDATION_FAILED]: 'Check the highlighted fields and try again.',
    [ErrorCodes.DATA_CONFLICT]: 'Someone else just changed this. Refresh and try again.',
    [ErrorCodes.DATA_SYNC_FAILED]: 'Sync paused. Your changes are saved locally and will retry automatically.',
    [ErrorCodes.STORAGE_QUOTA_EXCEEDED]: 'This device is out of storage. Clear some space and try again.',
    [ErrorCodes.STORAGE_UNAVAILABLE]: 'Couldn’t write to local storage. Reload the app and try again.',
    [ErrorCodes.UNKNOWN_ERROR]: 'Unexpected error. Your data is safe — tap to try again.',
    [ErrorCodes.OPERATION_FAILED]: 'That action didn’t complete. Tap to try again.',
};

// ============================================
// ERROR CREATION
// ============================================

/**
 * Create a standardized app error
 */
export function createAppError(
    code: ErrorCode,
    message: string,
    context?: ErrorContext,
    originalError?: unknown
): AppError {
    return {
        code,
        message,
        userMessage: userMessages[code] || userMessages[ErrorCodes.UNKNOWN_ERROR],
        context,
        originalError,
    };
}

/**
 * Best-effort detection of whether the browser is currently offline.
 * Safe in non-browser environments (SSR, tests).
 */
function isBrowserOffline(): boolean {
    if (typeof navigator === 'undefined') return false;
    return navigator.onLine === false;
}

/**
 * Convert unknown error to AppError
 *
 * Detection priority (most specific first):
 *   1. Already-normalized AppError
 *   2. Browser offline state — promotes any network-shaped error to OFFLINE
 *   3. Standard Error subtypes (AbortError, Dexie, etc.)
 *   4. String / unknown
 */
export function normalizeError(error: unknown, context?: ErrorContext): AppError {
    // Already an AppError
    if (isAppError(error)) {
        return { ...error, context: { ...error.context, ...context } };
    }

    // Standard Error
    if (error instanceof Error) {
        const message = error.message ?? '';
        const name = error.name ?? '';

        // Timeout / cancellation
        if (name === 'AbortError') {
            return createAppError(ErrorCodes.NETWORK_TIMEOUT, message, context, error);
        }

        // Network-shaped errors. If the browser reports offline, prefer the
        // OFFLINE code so the user sees "your changes are saved locally" copy
        // instead of the more alarming generic network message.
        const looksLikeNetwork =
            message.includes('Failed to fetch') ||
            message.includes('NetworkError') ||
            message.includes('Network request failed') ||
            name === 'TypeError' && message.toLowerCase().includes('fetch');
        if (looksLikeNetwork) {
            return createAppError(
                isBrowserOffline() ? ErrorCodes.NETWORK_OFFLINE : ErrorCodes.NETWORK_ERROR,
                message,
                context,
                error,
            );
        }

        // Auth-shaped errors (Supabase / API responses)
        if (
            name === 'AuthApiError' ||
            /unauthorized|invalid (?:credentials|token|jwt)|jwt expired/i.test(message)
        ) {
            return createAppError(
                /expired/i.test(message)
                    ? ErrorCodes.AUTH_SESSION_EXPIRED
                    : ErrorCodes.AUTH_UNAUTHORIZED,
                message,
                context,
                error,
            );
        }

        // IndexedDB / Dexie storage errors
        if (
            name === 'QuotaExceededError' ||
            message.toLowerCase().includes('quota')
        ) {
            return createAppError(ErrorCodes.STORAGE_QUOTA_EXCEEDED, message, context, error);
        }
        if (
            name === 'OpenFailedError' ||
            name === 'InvalidStateError' ||
            name === 'DatabaseClosedError' ||
            message.includes('IDBDatabase')
        ) {
            return createAppError(ErrorCodes.STORAGE_UNAVAILABLE, message, context, error);
        }

        // Validation / not-found shapes
        if (/not found|404/i.test(message)) {
            return createAppError(ErrorCodes.DATA_NOT_FOUND, message, context, error);
        }
        if (/validation|invalid input|400/i.test(message)) {
            return createAppError(ErrorCodes.DATA_VALIDATION_FAILED, message, context, error);
        }
        if (/conflict|409|version mismatch/i.test(message)) {
            return createAppError(ErrorCodes.DATA_CONFLICT, message, context, error);
        }

        return createAppError(ErrorCodes.UNKNOWN_ERROR, message, context, error);
    }

    // String error
    if (typeof error === 'string') {
        return createAppError(ErrorCodes.UNKNOWN_ERROR, error, context);
    }

    // Unknown type
    return createAppError(ErrorCodes.UNKNOWN_ERROR, 'An unknown error occurred', context, error);
}

/**
 * Type guard for AppError
 */
export function isAppError(error: unknown): error is AppError {
    return (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        'message' in error &&
        'userMessage' in error
    );
}

// ============================================
// ERROR HANDLING
// ============================================

/**
 * Handle an error with logging and optional Sentry reporting
 */
export function handleError(
    error: unknown,
    context?: ErrorContext,
    options: {
        severity?: ErrorSeverity;
        reportToSentry?: boolean;
        showToast?: boolean;
    } = {}
): AppError {
    const {
        severity = 'medium',
        reportToSentry = true,
    } = options;

    const appError = normalizeError(error, context);

    // Log the error
    if (severity === 'critical' || severity === 'high') {
        logger.error(`[${appError.code}] ${appError.message}`, { context: appError.context });
    } else {
        logger.warn(`[${appError.code}] ${appError.message}`, { context: appError.context });
    }

    // Report to Sentry in production
    if (reportToSentry && process.env.NODE_ENV === 'production') {
        Sentry.withScope((scope) => {
            scope.setTag('error_code', appError.code);
            scope.setLevel(severityToSentryLevel(severity));

            if (appError.context) {
                scope.setExtras(appError.context);
            }

            if (appError.originalError instanceof Error) {
                Sentry.captureException(appError.originalError);
            } else {
                Sentry.captureMessage(appError.message);
            }
        });
    }

    return appError;
}

/**
 * Map severity to Sentry level
 */
function severityToSentryLevel(severity: ErrorSeverity): Sentry.SeverityLevel {
    switch (severity) {
        case 'critical': return 'fatal';
        case 'high': return 'error';
        case 'medium': return 'warning';
        case 'low': return 'info';
    }
}

// ============================================
// ASYNC ERROR WRAPPER
// ============================================

/**
 * Wrap an async function with standardized error handling
 */
export async function withErrorHandling<T>(
    fn: () => Promise<T>,
    context?: ErrorContext,
    options?: {
        severity?: ErrorSeverity;
        reportToSentry?: boolean;
        fallback?: T;
    }
): Promise<{ data: T | null; error: AppError | null }> {
    try {
        const data = await fn();
        return { data, error: null };
    } catch (err) {
        const error = handleError(err, context, options);
        return { data: options?.fallback ?? null, error };
    }
}

/**
 * Create a try-catch wrapper for component event handlers
 */
export function createSafeHandler<T extends unknown[]>(
    handler: (...args: T) => Promise<void> | void,
    context?: ErrorContext,
    onError?: (error: AppError) => void
) {
    return async (...args: T) => {
        try {
            await handler(...args);
        } catch (err) {
            const error = handleError(err, context);
            onError?.(error);
        }
    };
}
