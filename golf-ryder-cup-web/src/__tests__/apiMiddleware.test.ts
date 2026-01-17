/**
 * API Middleware Test Suite
 *
 * Tests for API protection utilities including rate limiting,
 * CORS headers, and request validation.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock environment variables before imports
vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '');
vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', '');

// Import after mocking
import {
    checkRateLimit,
    applyRateLimit,
    addRateLimitHeaders,
    getCorsHeaders,
    handleCorsPrelight,
    validateBodySize,
    requireJson,
} from '@/lib/utils/apiMiddleware';

// Helper to create mock NextRequest
function createMockRequest(
    url: string = 'http://localhost:3000/api/test',
    options: {
        method?: string;
        headers?: Record<string, string>;
        body?: unknown;
        ip?: string;
    } = {}
): NextRequest {
    const { method = 'GET', headers = {}, ip = '127.0.0.1' } = options;

    const headersObj = new Headers(headers);
    if (ip && !headersObj.has('x-forwarded-for')) {
        headersObj.set('x-forwarded-for', ip);
    }

    const req = new NextRequest(url, {
        method,
        headers: headersObj,
    });

    return req;
}

// ============================================
// RATE LIMITING TESTS
// ============================================

describe('Rate Limiting', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe('checkRateLimit', () => {
        it('allows requests under the limit', () => {
            const req = createMockRequest('http://localhost:3000/api/test', {
                ip: '192.168.1.1',
            });

            const result = checkRateLimit(req, { maxRequests: 5, windowMs: 60000 });

            expect(result.allowed).toBe(true);
            expect(result.remaining).toBe(4);
        });

        it('blocks requests over the limit', () => {
            const req = createMockRequest('http://localhost:3000/api/test', {
                ip: '192.168.1.2',
            });

            // Make 5 requests (the limit)
            for (let i = 0; i < 5; i++) {
                checkRateLimit(req, { maxRequests: 5, windowMs: 60000 });
            }

            // 6th request should be blocked
            const result = checkRateLimit(req, { maxRequests: 5, windowMs: 60000 });
            expect(result.allowed).toBe(false);
            expect(result.remaining).toBe(0);
        });

        it('resets after window expires', () => {
            const req = createMockRequest('http://localhost:3000/api/test', {
                ip: '192.168.1.3',
            });

            // Max out the limit
            for (let i = 0; i < 5; i++) {
                checkRateLimit(req, { maxRequests: 5, windowMs: 60000 });
            }

            // Should be blocked
            let result = checkRateLimit(req, { maxRequests: 5, windowMs: 60000 });
            expect(result.allowed).toBe(false);

            // Advance time past window
            vi.advanceTimersByTime(61000);

            // Should be allowed again
            result = checkRateLimit(req, { maxRequests: 5, windowMs: 60000 });
            expect(result.allowed).toBe(true);
            expect(result.remaining).toBe(4);
        });

        it('tracks different endpoints separately', () => {
            const req1 = createMockRequest('http://localhost:3000/api/endpoint1', {
                ip: '192.168.1.4',
            });
            const req2 = createMockRequest('http://localhost:3000/api/endpoint2', {
                ip: '192.168.1.4',
            });

            // Max out endpoint1
            for (let i = 0; i < 3; i++) {
                checkRateLimit(req1, { maxRequests: 3, windowMs: 60000 });
            }

            // endpoint1 blocked
            const result1 = checkRateLimit(req1, { maxRequests: 3, windowMs: 60000 });
            expect(result1.allowed).toBe(false);

            // endpoint2 should still be allowed
            const result2 = checkRateLimit(req2, { maxRequests: 3, windowMs: 60000 });
            expect(result2.allowed).toBe(true);
        });
    });

    describe('applyRateLimit', () => {
        it('returns null when under limit', () => {
            const req = createMockRequest('http://localhost:3000/api/test', {
                ip: '192.168.1.5',
            });

            const response = applyRateLimit(req, { maxRequests: 10, windowMs: 60000 });
            expect(response).toBeNull();
        });

        it('returns 429 response when over limit', () => {
            const req = createMockRequest('http://localhost:3000/api/test', {
                ip: '192.168.1.6',
            });

            // Exhaust the limit
            for (let i = 0; i < 3; i++) {
                applyRateLimit(req, { maxRequests: 3, windowMs: 60000 });
            }

            const response = applyRateLimit(req, { maxRequests: 3, windowMs: 60000 });

            expect(response).not.toBeNull();
            expect(response!.status).toBe(429);
        });

        it('includes proper headers in 429 response', async () => {
            const req = createMockRequest('http://localhost:3000/api/test', {
                ip: '192.168.1.7',
            });

            // Exhaust the limit
            for (let i = 0; i < 2; i++) {
                applyRateLimit(req, { maxRequests: 2, windowMs: 60000 });
            }

            const response = applyRateLimit(req, { maxRequests: 2, windowMs: 60000 });

            expect(response!.headers.get('Retry-After')).toBeTruthy();
            expect(response!.headers.get('X-RateLimit-Limit')).toBe('2');
            expect(response!.headers.get('X-RateLimit-Remaining')).toBe('0');
            expect(response!.headers.get('X-RateLimit-Reset')).toBeTruthy();
        });
    });

    describe('addRateLimitHeaders', () => {
        it('adds rate limit headers to response', () => {
            const req = createMockRequest('http://localhost:3000/api/test', {
                ip: '192.168.1.8',
            });

            // Dynamic import to avoid issues with Response constructor
            const { NextResponse } = require('next/server');
            const response = NextResponse.json({ data: 'test' });

            const enhanced = addRateLimitHeaders(response, req, { maxRequests: 100 });

            expect(enhanced.headers.get('X-RateLimit-Limit')).toBe('100');
            expect(enhanced.headers.get('X-RateLimit-Remaining')).toBeTruthy();
            expect(enhanced.headers.get('X-RateLimit-Reset')).toBeTruthy();
        });
    });
});

// ============================================
// CORS TESTS
// ============================================

describe('CORS Handling', () => {
    describe('getCorsHeaders', () => {
        it('creates CORS headers with default origin', () => {
            const req = createMockRequest('http://localhost:3000/api/test');
            const headers = getCorsHeaders(req);

            expect(headers['Access-Control-Allow-Origin']).toBeTruthy();
            expect(headers['Access-Control-Allow-Methods']).toBeTruthy();
            expect(headers['Access-Control-Allow-Headers']).toBeTruthy();
        });

        it('includes proper methods', () => {
            const req = createMockRequest('http://localhost:3000/api/test');
            const headers = getCorsHeaders(req);

            expect(headers['Access-Control-Allow-Methods']).toContain('GET');
            expect(headers['Access-Control-Allow-Methods']).toContain('POST');
        });
    });

    describe('handleCorsPrelight', () => {
        it('returns 204 response', () => {
            const req = createMockRequest('http://localhost:3000/api/test', {
                method: 'OPTIONS',
            });

            const response = handleCorsPrelight(req);

            expect(response.status).toBe(204);
        });

        it('includes CORS headers in response', () => {
            const req = createMockRequest('http://localhost:3000/api/test', {
                method: 'OPTIONS',
            });

            const response = handleCorsPrelight(req);

            expect(response.headers.get('Access-Control-Allow-Origin')).toBeTruthy();
            expect(response.headers.get('Access-Control-Allow-Methods')).toBeTruthy();
        });
    });
});

// ============================================
// REQUEST VALIDATION TESTS
// ============================================

describe('Request Validation', () => {
    describe('validateBodySize', () => {
        it('returns error response for body exceeding max size', async () => {
            // Default max is 10MB, let's use a small custom max
            const response = validateBodySize(2000, 1000);

            expect(response).not.toBeNull();
            expect(response!.status).toBe(413);
        });

        it('returns null for body under max size', () => {
            const response = validateBodySize(500, 1000);

            expect(response).toBeNull();
        });

        it('returns null for zero-size body', () => {
            const response = validateBodySize(0, 1000);

            expect(response).toBeNull();
        });
    });

    describe('requireJson', () => {
        it('returns error for non-JSON content type', () => {
            const req = createMockRequest('http://localhost:3000/api/test', {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain' },
            });

            const response = requireJson(req);

            expect(response).not.toBeNull();
            expect(response!.status).toBe(415);
        });

        it('returns null for JSON content type', () => {
            const req = createMockRequest('http://localhost:3000/api/test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            });

            const response = requireJson(req);
            expect(response).toBeNull();
        });

        it('returns null for JSON content type with charset', () => {
            const req = createMockRequest('http://localhost:3000/api/test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json; charset=utf-8' },
            });

            const response = requireJson(req);
            expect(response).toBeNull();
        });
    });
});
