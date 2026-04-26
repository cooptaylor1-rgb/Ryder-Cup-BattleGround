import { NextResponse } from 'next/server';

const startTime = Date.now();

function liveResponse(): NextResponse {
  return NextResponse.json(
    {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: Math.round((Date.now() - startTime) / 1000),
    },
    {
      status: 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      },
    }
  );
}

/**
 * GET /api/health/live
 *
 * Cheap liveness signal for Railway's deployment network healthcheck.
 * Readiness diagnostics remain on GET /api/health.
 */
export async function GET(): Promise<NextResponse> {
  return liveResponse();
}

export async function HEAD(): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  });
}
