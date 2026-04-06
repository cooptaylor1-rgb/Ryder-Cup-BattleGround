/**
 * Tests for normalizeError() — verifies that real-world error shapes
 * (network, auth, storage, validation) get classified into the right
 * AppError code so the user sees an appropriate recovery message.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { normalizeError, ErrorCodes } from '@/lib/utils/errorHandling';

describe('normalizeError', () => {
  const originalNavigator = globalThis.navigator;

  function setOnline(value: boolean) {
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      writable: true,
      value: { ...(originalNavigator ?? {}), onLine: value },
    });
  }

  beforeEach(() => {
    setOnline(true);
  });

  afterEach(() => {
    if (originalNavigator) {
      Object.defineProperty(globalThis, 'navigator', {
        configurable: true,
        writable: true,
        value: originalNavigator,
      });
    }
    vi.restoreAllMocks();
  });

  describe('network errors', () => {
    it('detects "Failed to fetch" as NETWORK_ERROR when online', () => {
      const result = normalizeError(new TypeError('Failed to fetch'));
      expect(result.code).toBe(ErrorCodes.NETWORK_ERROR);
    });

    it('promotes network errors to NETWORK_OFFLINE when navigator is offline', () => {
      setOnline(false);
      const result = normalizeError(new TypeError('Failed to fetch'));
      expect(result.code).toBe(ErrorCodes.NETWORK_OFFLINE);
      expect(result.userMessage).toMatch(/offline/i);
    });

    it('detects AbortError as NETWORK_TIMEOUT', () => {
      const err = new Error('aborted');
      err.name = 'AbortError';
      expect(normalizeError(err).code).toBe(ErrorCodes.NETWORK_TIMEOUT);
    });

    it('detects "Network request failed" (React Native style)', () => {
      expect(normalizeError(new Error('Network request failed')).code).toBe(
        ErrorCodes.NETWORK_ERROR,
      );
    });
  });

  describe('auth errors', () => {
    it('detects unauthorized message as AUTH_UNAUTHORIZED', () => {
      expect(normalizeError(new Error('Unauthorized: missing token')).code).toBe(
        ErrorCodes.AUTH_UNAUTHORIZED,
      );
    });

    it('detects expired session as AUTH_SESSION_EXPIRED', () => {
      expect(normalizeError(new Error('JWT expired')).code).toBe(
        ErrorCodes.AUTH_SESSION_EXPIRED,
      );
    });

    it('detects AuthApiError name from Supabase', () => {
      const err = new Error('Invalid credentials');
      err.name = 'AuthApiError';
      expect(normalizeError(err).code).toBe(ErrorCodes.AUTH_UNAUTHORIZED);
    });
  });

  describe('storage errors', () => {
    it('detects QuotaExceededError as STORAGE_QUOTA_EXCEEDED', () => {
      const err = new Error('Storage quota exceeded');
      err.name = 'QuotaExceededError';
      expect(normalizeError(err).code).toBe(ErrorCodes.STORAGE_QUOTA_EXCEEDED);
    });

    it('detects Dexie OpenFailedError as STORAGE_UNAVAILABLE', () => {
      const err = new Error('Failed to open IDBDatabase');
      err.name = 'OpenFailedError';
      expect(normalizeError(err).code).toBe(ErrorCodes.STORAGE_UNAVAILABLE);
    });

    it('detects DatabaseClosedError as STORAGE_UNAVAILABLE', () => {
      const err = new Error('Database has been closed');
      err.name = 'DatabaseClosedError';
      expect(normalizeError(err).code).toBe(ErrorCodes.STORAGE_UNAVAILABLE);
    });
  });

  describe('data errors', () => {
    it('detects "not found" as DATA_NOT_FOUND', () => {
      expect(normalizeError(new Error('Trip not found')).code).toBe(
        ErrorCodes.DATA_NOT_FOUND,
      );
    });

    it('detects 404 as DATA_NOT_FOUND', () => {
      expect(normalizeError(new Error('HTTP 404')).code).toBe(ErrorCodes.DATA_NOT_FOUND);
    });

    it('detects validation message as DATA_VALIDATION_FAILED', () => {
      expect(normalizeError(new Error('validation failed for field email')).code).toBe(
        ErrorCodes.DATA_VALIDATION_FAILED,
      );
    });

    it('detects conflict as DATA_CONFLICT', () => {
      expect(normalizeError(new Error('version mismatch')).code).toBe(
        ErrorCodes.DATA_CONFLICT,
      );
    });
  });

  describe('fallback', () => {
    it('classifies unknown Error subclasses as UNKNOWN_ERROR', () => {
      expect(normalizeError(new Error('something weird')).code).toBe(
        ErrorCodes.UNKNOWN_ERROR,
      );
    });

    it('classifies plain string errors as UNKNOWN_ERROR', () => {
      expect(normalizeError('oops').code).toBe(ErrorCodes.UNKNOWN_ERROR);
    });

    it('classifies non-Error / non-string as UNKNOWN_ERROR', () => {
      expect(normalizeError({ random: 'object' }).code).toBe(ErrorCodes.UNKNOWN_ERROR);
    });

    it('passes through an existing AppError', () => {
      const original = normalizeError(new Error('boom'));
      const passed = normalizeError(original);
      expect(passed.code).toBe(original.code);
      expect(passed.message).toBe(original.message);
    });
  });

  describe('user messages', () => {
    it('attaches a non-empty userMessage for every code path', () => {
      const samples: unknown[] = [
        new TypeError('Failed to fetch'),
        new Error('JWT expired'),
        Object.assign(new Error('quota'), { name: 'QuotaExceededError' }),
        new Error('Trip not found'),
        new Error('something weird'),
      ];
      for (const s of samples) {
        const result = normalizeError(s);
        expect(result.userMessage.length).toBeGreaterThan(0);
      }
    });
  });
});
