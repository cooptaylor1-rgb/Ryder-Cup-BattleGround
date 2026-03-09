/**
 * Score Sync API Route Tests
 *
 * Tests for the /api/sync/scores endpoint that handles
 * offline scoring event synchronization.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const { requireTripAccessMock } = vi.hoisted(() => ({
    requireTripAccessMock: vi.fn<() => Promise<NextResponse | null>>(async () => null),
}));

vi.mock('@/lib/utils/apiMiddleware', async () => {
    const actual = await vi.importActual<typeof import('@/lib/utils/apiMiddleware')>('@/lib/utils/apiMiddleware');
    return {
        ...actual,
        requireTripAccess: requireTripAccessMock,
    };
});

import { POST } from '@/app/api/sync/scores/route';

// Mock Supabase client
vi.mock('@supabase/supabase-js', () => ({
    createClient: vi.fn(() => ({
        from: vi.fn(() => ({
            upsert: vi.fn().mockResolvedValue({ error: null }),
            update: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ error: null }),
            }),
        })),
    })),
}));

// Helper to create mock NextRequest with JSON body
function createMockRequest(body: unknown, extraHeaders?: Record<string, string>): NextRequest {
    return new NextRequest('http://localhost:3000/api/sync/scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...extraHeaders },
        body: JSON.stringify(body),
    });
}

describe('Score Sync API Route', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        requireTripAccessMock.mockResolvedValue(null);
        // Reset environment variables for each test
        vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '');
        vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '');
    });

    afterEach(() => {
        vi.unstubAllEnvs();
    });

    describe('Payload Validation', () => {
        it('rejects missing matchId', async () => {
            const req = createMockRequest({ events: [] });
            const response = await POST(req);
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.error).toContain('matchId');
        });

        it('rejects missing events array', async () => {
            const req = createMockRequest({ matchId: '550e8400-e29b-41d4-a716-446655440000' });
            const response = await POST(req);
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.error).toContain('events');
        });

        it('rejects non-array events', async () => {
            const req = createMockRequest({
                matchId: '550e8400-e29b-41d4-a716-446655440000',
                events: 'not-an-array',
            });
            const response = await POST(req);
            const _data = await response.json();

            expect(response.status).toBe(400);
        });

        it('rejects events missing data payload', async () => {
            const req = createMockRequest({
                matchId: '550e8400-e29b-41d4-a716-446655440000',
                events: [
                    {
                        id: '550e8400-e29b-41d4-a716-446655440001',
                        type: 'SCORE',
                        holeNumber: 1,
                        timestamp: new Date().toISOString(),
                    },
                ],
            });

            const response = await POST(req);
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.error).toContain('data');
        });
    });

    describe('Local-Only Mode (No Supabase)', () => {
        it('acknowledges events when no Supabase configured', async () => {
            const req = createMockRequest({
                matchId: '550e8400-e29b-41d4-a716-446655440000',
                events: [
                    { id: '550e8400-e29b-41d4-a716-446655440001', type: 'SCORE', holeNumber: 1, data: { winner: 'teamA' }, timestamp: new Date().toISOString() },
                    { id: '550e8400-e29b-41d4-a716-446655440002', type: 'SCORE', holeNumber: 2, data: { winner: 'halved' }, timestamp: new Date().toISOString() },
                ],
            });

            const response = await POST(req);
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.success).toBe(true);
            expect(data.mode).toBe('local-only');
            expect(data.synced).toBe(2);
        });

        it('returns correlation id header in local-only mode', async () => {
            const req = createMockRequest(
                {
                    matchId: '550e8400-e29b-41d4-a716-446655440000',
                    events: [],
                },
                { 'x-correlation-id': 'test-correlation-id' }
            );

            const response = await POST(req);
            const data = await response.json();

            expect(response.headers.get('x-correlation-id')).toBe('test-correlation-id');
            expect(data.correlationId).toBe('test-correlation-id');
        });
    });

    describe('With Supabase Configured', () => {
        beforeEach(() => {
            vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co');
            vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-key');
        });

        it('syncs events to database successfully', async () => {
            const req = createMockRequest({
                matchId: '550e8400-e29b-41d4-a716-446655440000',
                tripId: '550e8400-e29b-41d4-a716-446655440010',
                events: [
                    { id: '550e8400-e29b-41d4-a716-446655440001', type: 'SCORE', holeNumber: 1, data: { winner: 'teamA' }, timestamp: new Date().toISOString() },
                ],
            });

            const response = await POST(req);
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.success).toBe(true);
        });

        it('processes multiple events', async () => {
            const req = createMockRequest({
                matchId: '550e8400-e29b-41d4-a716-446655440000',
                tripId: '550e8400-e29b-41d4-a716-446655440010',
                events: [
                    { id: '550e8400-e29b-41d4-a716-446655440001', type: 'SCORE', holeNumber: 1, data: { winner: 'teamA' }, timestamp: new Date().toISOString() },
                    { id: '550e8400-e29b-41d4-a716-446655440002', type: 'SCORE', holeNumber: 2, data: { winner: 'teamB' }, timestamp: new Date().toISOString() },
                    { id: '550e8400-e29b-41d4-a716-446655440003', type: 'UNDO', holeNumber: 2, data: {}, timestamp: new Date().toISOString() },
                ],
            });

            const response = await POST(req);
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.success).toBe(true);
        });

        it('rejects cloud sync without tripId', async () => {
            const req = createMockRequest({
                matchId: '550e8400-e29b-41d4-a716-446655440000',
                events: [],
            });

            const response = await POST(req);
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.error).toBe('Trip context required');
        });

        it('rejects cloud sync when trip access is denied', async () => {
            requireTripAccessMock.mockResolvedValueOnce(
                NextResponse.json(
                    { error: 'Forbidden', message: 'Access denied' },
                    { status: 403 }
                )
            );

            const req = createMockRequest({
                matchId: '550e8400-e29b-41d4-a716-446655440000',
                tripId: '550e8400-e29b-41d4-a716-446655440010',
                events: [],
            });

            const response = await POST(req);

            expect(response.status).toBe(403);
            expect(requireTripAccessMock).toHaveBeenCalledWith(
                expect.any(NextRequest),
                '550e8400-e29b-41d4-a716-446655440010'
            );
        });
    });

    describe('Edge Cases', () => {
        it('handles empty events array', async () => {
            const req = createMockRequest({
                matchId: '550e8400-e29b-41d4-a716-446655440000',
                events: [],
            });

            const response = await POST(req);
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.success).toBe(true);
            expect(data.synced).toBe(0);
        });

        it('returns 400 for malformed JSON', async () => {
            const req = new NextRequest('http://localhost:3000/api/sync/scores', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: '{ invalid json }',
            });

            const response = await POST(req);
            expect(response.status).toBe(400);
            expect(response.headers.get('x-correlation-id')).toBeTruthy();
        });
    });
});
