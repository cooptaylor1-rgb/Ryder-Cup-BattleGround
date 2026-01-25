/**
 * Health Check API Endpoint
 *
 * Provides comprehensive health status for monitoring and load balancers.
 * Returns system health, memory usage, and service availability.
 *
 * @endpoint GET /api/health
 */

import { NextResponse } from 'next/server';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  uptime: number;
  environment: string;
  checks: {
    memory: MemoryCheck;
    runtime: RuntimeCheck;
  };
}

interface MemoryCheck {
  status: 'healthy' | 'warning' | 'critical';
  heapUsed: number;
  heapTotal: number;
  heapUsedMB: number;
  heapTotalMB: number;
  percentUsed: number;
}

interface RuntimeCheck {
  status: 'healthy';
  nodeVersion: string;
  platform: string;
}

// Track server start time for uptime calculation
const startTime = Date.now();

/**
 * GET /api/health
 *
 * Health check endpoint for monitoring and load balancers.
 * Always returns 200 for basic availability, with detailed status in body.
 */
export async function GET(): Promise<NextResponse<HealthStatus>> {
  const memoryUsage = process.memoryUsage();
  const heapUsedMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
  const heapTotalMB = Math.round(memoryUsage.heapTotal / 1024 / 1024);
  const percentUsed = Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100);

  // Determine memory health
  let memoryStatus: 'healthy' | 'warning' | 'critical' = 'healthy';
  if (percentUsed > 90) {
    memoryStatus = 'critical';
  } else if (percentUsed > 75) {
    memoryStatus = 'warning';
  }

  // Build memory check
  const memoryCheck: MemoryCheck = {
    status: memoryStatus,
    heapUsed: memoryUsage.heapUsed,
    heapTotal: memoryUsage.heapTotal,
    heapUsedMB,
    heapTotalMB,
    percentUsed,
  };

  // Build runtime check
  const runtimeCheck: RuntimeCheck = {
    status: 'healthy',
    nodeVersion: process.version,
    platform: process.platform,
  };

  // Determine overall status
  let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
  if (memoryStatus === 'critical') {
    overallStatus = 'unhealthy';
  } else if (memoryStatus === 'warning') {
    overallStatus = 'degraded';
  }

  const health: HealthStatus = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    uptime: Math.round((Date.now() - startTime) / 1000),
    environment: process.env.NODE_ENV || 'development',
    checks: {
      memory: memoryCheck,
      runtime: runtimeCheck,
    },
  };

  // Return appropriate status code based on health
  const statusCode = overallStatus === 'unhealthy' ? 503 : 200;

  return NextResponse.json(health, {
    status: statusCode,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
  });
}

/**
 * HEAD /api/health
 *
 * Quick availability check for load balancers.
 * Returns 200 if the service is responding.
 */
export async function HEAD(): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  });
}
