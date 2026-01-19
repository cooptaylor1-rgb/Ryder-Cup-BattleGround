/**
 * Error Handling Tests
 *
 * Tests for the standardized error handling utilities.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    handleError,
    withErrorHandling,
    createAppError,
    isAppError,
    normalizeError,
    ErrorCodes,
} from '@/lib/utils/errorHandling';

describe('Error Handling Utilities', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('createAppError', () => {
        it('creates an error with the correct properties', () => {
            const error = createAppError(
                ErrorCodes.DATA_VALIDATION_FAILED,
                'Test error',
                { field: 'name' }
            );

            expect(error.message).toBe('Test error');
            expect(error.code).toBe('DATA_VALIDATION_FAILED');
            expect(error.context).toEqual({ field: 'name' });
            expect(error.userMessage).toBe('Please check your input and try again.');
        });

        it('provides default user message for unknown errors', () => {
            const error = createAppError(ErrorCodes.UNKNOWN_ERROR, 'Test error');
            expect(error.userMessage).toBe('Something went wrong. Please try again.');
        });
    });

    describe('isAppError', () => {
        it('returns true for AppError objects', () => {
            const error = createAppError(ErrorCodes.UNKNOWN_ERROR, 'Test');
            expect(isAppError(error)).toBe(true);
        });

        it('returns false for regular Error instances', () => {
            const error = new Error('Test');
            expect(isAppError(error)).toBe(false);
        });

        it('returns false for non-errors', () => {
            expect(isAppError('string')).toBe(false);
            expect(isAppError(null)).toBe(false);
            expect(isAppError(undefined)).toBe(false);
        });
    });

    describe('normalizeError', () => {
        it('returns AppError unchanged', () => {
            const appError = createAppError(ErrorCodes.DATA_NOT_FOUND, 'Not found');
            const result = normalizeError(appError);

            expect(result.code).toBe('DATA_NOT_FOUND');
        });

        it('wraps regular errors', () => {
            const error = new Error('Regular error');
            const result = normalizeError(error, { component: 'TestComponent' });

            expect(isAppError(result)).toBe(true);
            expect(result.code).toBe(ErrorCodes.UNKNOWN_ERROR);
            expect(result.context?.component).toBe('TestComponent');
        });

        it('handles string errors', () => {
            const result = normalizeError('String error');

            expect(isAppError(result)).toBe(true);
            expect(result.message).toBe('String error');
        });

        it('detects network errors', () => {
            const error = new Error('Failed to fetch');
            const result = normalizeError(error);

            expect(result.code).toBe(ErrorCodes.NETWORK_ERROR);
        });

        it('detects timeout errors', () => {
            const error = new Error('Request timed out');
            error.name = 'AbortError';
            const result = normalizeError(error);

            expect(result.code).toBe(ErrorCodes.NETWORK_TIMEOUT);
        });
    });

    describe('handleError', () => {
        it('normalizes and returns AppError', () => {
            const error = new Error('Test error');
            const result = handleError(error, { action: 'test' });

            expect(isAppError(result)).toBe(true);
            expect(result.context?.action).toBe('test');
        });
    });

    describe('withErrorHandling', () => {
        it('returns data on success', async () => {
            const fn = async () => 'success';
            const result = await withErrorHandling(fn, { action: 'test' });

            expect(result.data).toBe('success');
            expect(result.error).toBeNull();
        });

        it('returns error on failure', async () => {
            const fn = async () => { throw new Error('Failed'); };
            const result = await withErrorHandling(fn, { action: 'test' });

            expect(result.data).toBeNull();
            expect(result.error).not.toBeNull();
            expect(isAppError(result.error)).toBe(true);
        });

        it('returns fallback value when provided', async () => {
            const fn = async () => { throw new Error('Failed'); };
            const result = await withErrorHandling(fn, { action: 'test' }, { fallback: 'fallback' });

            expect(result.data).toBe('fallback');
        });
    });
});
