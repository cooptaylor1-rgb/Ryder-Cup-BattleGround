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

const userMessages: Record<ErrorCode, string> = {
    [ErrorCodes.NETWORK_OFFLINE]: 'You appear to be offline. Changes will sync when you reconnect.',
    [ErrorCodes.NETWORK_TIMEOUT]: 'The request timed out. Please try again.',
    [ErrorCodes.NETWORK_ERROR]: 'Unable to connect. Please check your internet connection.',
    [ErrorCodes.AUTH_INVALID_CREDENTIALS]: 'Invalid email or PIN. Please try again.',
    [ErrorCodes.AUTH_SESSION_EXPIRED]: 'Your session has expired. Please sign in again.',
    [ErrorCodes.AUTH_UNAUTHORIZED]: 'You don\'t have permission to perform this action.',
    [ErrorCodes.DATA_NOT_FOUND]: 'The requested data could not be found.',
    [ErrorCodes.DATA_VALIDATION_FAILED]: 'Please check your input and try again.',
    [ErrorCodes.DATA_CONFLICT]: 'This data was modified elsewhere. Please refresh and try again.',
    [ErrorCodes.DATA_SYNC_FAILED]: 'Failed to sync data. Your changes are saved locally.',
    [ErrorCodes.STORAGE_QUOTA_EXCEEDED]: 'Storage is full. Please clear some data.',
    [ErrorCodes.STORAGE_UNAVAILABLE]: 'Unable to save data locally. Please try again.',
    [ErrorCodes.UNKNOWN_ERROR]: 'Something went wrong. Please try again.',
    [ErrorCodes.OPERATION_FAILED]: 'The operation could not be completed. Please try again.',
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
 * Convert unknown error to AppError
 */
export function normalizeError(error: unknown, context?: ErrorContext): AppError {
    // Already an AppError
    if (isAppError(error)) {
        return { ...error, context: { ...error.context, ...context } };
    }

    // Standard Error
    if (error instanceof Error) {
        // Check for specific error types
        if (error.name === 'AbortError') {
            return createAppError(ErrorCodes.NETWORK_TIMEOUT, error.message, context, error);
        }
        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
            return createAppError(ErrorCodes.NETWORK_ERROR, error.message, context, error);
        }
        if (error.message.includes('quota')) {
            return createAppError(ErrorCodes.STORAGE_QUOTA_EXCEEDED, error.message, context, error);
        }

        return createAppError(ErrorCodes.UNKNOWN_ERROR, error.message, context, error);
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
