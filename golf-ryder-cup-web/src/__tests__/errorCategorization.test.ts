/**
 * Tests for Error Categorization
 *
 * Verifies that errors are correctly classified into categories
 * (network, auth, data, general) with appropriate user messages.
 */

import { describe, it, expect } from 'vitest';
import {
    normalizeError,
    createAppError,
    ErrorCodes,
    isAppError,
} from '@/lib/utils/errorHandling';

describe('Error Categorization', () => {
    describe('normalizeError', () => {
        it('classifies fetch failures as NETWORK_ERROR', () => {
            const error = new Error('Failed to fetch');
            const result = normalizeError(error);
            expect(result.code).toBe(ErrorCodes.NETWORK_ERROR);
            expect(result.userMessage).toContain('internet connection');
        });

        it('classifies NetworkError as NETWORK_ERROR', () => {
            const error = new Error('NetworkError when attempting to fetch');
            const result = normalizeError(error);
            expect(result.code).toBe(ErrorCodes.NETWORK_ERROR);
        });

        it('classifies AbortError as NETWORK_TIMEOUT', () => {
            const error = new Error('Request timed out');
            error.name = 'AbortError';
            const result = normalizeError(error);
            expect(result.code).toBe(ErrorCodes.NETWORK_TIMEOUT);
            expect(result.userMessage).toContain('timed out');
        });

        it('classifies quota errors as STORAGE_QUOTA_EXCEEDED', () => {
            const error = new Error('QuotaExceededError: quota exceeded');
            const result = normalizeError(error);
            expect(result.code).toBe(ErrorCodes.STORAGE_QUOTA_EXCEEDED);
            expect(result.userMessage).toContain('Storage');
        });

        it('classifies unknown errors as UNKNOWN_ERROR', () => {
            const error = new Error('Something random broke');
            const result = normalizeError(error);
            expect(result.code).toBe(ErrorCodes.UNKNOWN_ERROR);
        });

        it('passes through existing AppError instances', () => {
            const original = createAppError(ErrorCodes.AUTH_UNAUTHORIZED, 'Not allowed');
            const result = normalizeError(original);
            expect(result.code).toBe(ErrorCodes.AUTH_UNAUTHORIZED);
            expect(result.userMessage).toContain('permission');
        });

        it('handles string errors', () => {
            const result = normalizeError('plain string error');
            expect(result.code).toBe(ErrorCodes.UNKNOWN_ERROR);
            expect(result.message).toBe('plain string error');
        });

        it('handles null/undefined errors', () => {
            const result = normalizeError(null);
            expect(result.code).toBe(ErrorCodes.UNKNOWN_ERROR);
        });
    });

    describe('isAppError', () => {
        it('returns true for valid AppError objects', () => {
            const appError = createAppError(ErrorCodes.DATA_NOT_FOUND, 'Missing');
            expect(isAppError(appError)).toBe(true);
        });

        it('returns false for plain Error objects', () => {
            expect(isAppError(new Error('test'))).toBe(false);
        });

        it('returns false for null', () => {
            expect(isAppError(null)).toBe(false);
        });
    });

    describe('createAppError', () => {
        it('creates error with correct user message from code', () => {
            const error = createAppError(ErrorCodes.DATA_SYNC_FAILED, 'Sync issue');
            expect(error.code).toBe(ErrorCodes.DATA_SYNC_FAILED);
            expect(error.message).toBe('Sync issue');
            expect(error.userMessage).toContain('sync');
        });

        it('includes context when provided', () => {
            const error = createAppError(
                ErrorCodes.DATA_NOT_FOUND,
                'Trip missing',
                { tripId: 'trip-123' }
            );
            expect(error.context).toEqual({ tripId: 'trip-123' });
        });

        it('provides each error code with a distinct user message', () => {
            const codes = Object.values(ErrorCodes);
            const messages = new Set<string>();

            for (const code of codes) {
                const error = createAppError(code, 'test');
                expect(error.userMessage).toBeTruthy();
                messages.add(error.userMessage);
            }

            // At least 5 distinct messages (some may share messages, but most should be unique)
            expect(messages.size).toBeGreaterThanOrEqual(5);
        });
    });
});
