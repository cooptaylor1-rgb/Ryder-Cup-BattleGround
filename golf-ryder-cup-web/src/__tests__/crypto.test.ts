/**
 * Tests for PIN crypto utilities
 *
 * Verifies PIN hashing, verification, and forced reset behavior.
 */

import { describe, it, expect } from 'vitest';
import { hashPin, verifyPin, isHashedPin } from '@/lib/utils/crypto';

describe('PIN Crypto Utilities', () => {
    describe('hashPin', () => {
        it('produces a PBKDF2-formatted hash string', async () => {
            const hash = await hashPin('1234');
            expect(hash).toMatch(/^pbkdf2\$\d+\$/);
            expect(hash.split('$')).toHaveLength(4);
        });

        it('produces different hashes for the same PIN (random salt)', async () => {
            const hash1 = await hashPin('5678');
            const hash2 = await hashPin('5678');
            expect(hash1).not.toBe(hash2); // Different salts
        });
    });

    describe('verifyPin', () => {
        it('verifies correct PIN against PBKDF2 hash', async () => {
            const hash = await hashPin('9999');
            const result = await verifyPin('9999', hash);
            expect(result).toBe(true);
        });

        it('rejects incorrect PIN', async () => {
            const hash = await hashPin('1234');
            const result = await verifyPin('5678', hash);
            expect(result).toBe(false);
        });

        it('rejects empty stored value', async () => {
            const result = await verifyPin('1234', '');
            expect(result).toBe(false);
        });

        it('rejects plain-text PINs (forced reset behavior)', async () => {
            const result = await verifyPin('1234', '1234');
            expect(result).toBe(false);
        });

        it('rejects plain-text PINs that do not match', async () => {
            const result = await verifyPin('1234', '5678');
            expect(result).toBe(false);
        });
    });

    describe('isHashedPin', () => {
        it('recognizes PBKDF2 format', async () => {
            const hash = await hashPin('1234');
            expect(isHashedPin(hash)).toBe(true);
        });

        it('recognizes legacy SHA-256 hex format', () => {
            const sha256hex = 'a'.repeat(64);
            expect(isHashedPin(sha256hex)).toBe(true);
        });

        it('rejects plain-text PINs', () => {
            expect(isHashedPin('1234')).toBe(false);
        });

        it('rejects empty string', () => {
            expect(isHashedPin('')).toBe(false);
        });
    });
});
