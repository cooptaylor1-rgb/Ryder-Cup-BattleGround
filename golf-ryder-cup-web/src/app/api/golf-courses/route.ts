/**
 * Golf Course API Proxy
 *
 * Server-side proxy for Golf Course API requests.
 * Keeps API key secure on the server and handles CORS.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createLogger } from '@/lib/utils/logger';

const API_BASE_URL = 'https://api.golfcourseapi.com/v1';
const logger = createLogger('api:golf-courses');

// Cache duration: 1 hour for course data (rarely changes)
const CACHE_MAX_AGE = 3600;
const CACHE_STALE_WHILE_REVALIDATE = 86400; // 24 hours

function getApiKey(): string | null {
    // Server-side env vars (no NEXT_PUBLIC_ prefix needed)
    return process.env.GOLF_COURSE_API_KEY || process.env.NEXT_PUBLIC_GOLF_COURSE_API_KEY || null;
}

export async function GET(request: NextRequest) {
    const apiKey = getApiKey();

    if (!apiKey) {
        return NextResponse.json(
            { error: 'Golf Course API not configured', configured: false },
            { status: 503 }
        );
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const query = searchParams.get('q');
    const courseId = searchParams.get('id');

    try {
        let endpoint = '';

        if (action === 'search' && query) {
            endpoint = `/courses?search=${encodeURIComponent(query)}`;
        } else if (action === 'get' && courseId) {
            endpoint = `/courses/${courseId}`;
        } else if (action === 'check') {
            // Health check - just verify API key works
            return NextResponse.json({ configured: true });
        } else {
            return NextResponse.json(
                { error: 'Invalid action. Use action=search&q=query or action=get&id=courseId' },
                { status: 400 }
            );
        }

        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            headers: {
                'Authorization': `Key ${apiKey}`,
                'Accept': 'application/json',
            },
        });

        if (!response.ok) {
            if (response.status === 401) {
                return NextResponse.json(
                    { error: 'Invalid Golf Course API key', configured: false },
                    { status: 401 }
                );
            }
            if (response.status === 429) {
                return NextResponse.json(
                    { error: 'Rate limit exceeded. Please try again later.' },
                    { status: 429 }
                );
            }
            return NextResponse.json(
                { error: `API error: ${response.status}` },
                { status: response.status }
            );
        }

        const data = await response.json();

        // Add cache headers for successful responses
        const res = NextResponse.json(data);
        res.headers.set(
            'Cache-Control',
            `public, max-age=${CACHE_MAX_AGE}, stale-while-revalidate=${CACHE_STALE_WHILE_REVALIDATE}`
        );
        return res;
    } catch (error) {
        logger.error('Golf Course API error', { error });
        return NextResponse.json(
            { error: 'Failed to fetch from Golf Course API' },
            { status: 500 }
        );
    }
}
