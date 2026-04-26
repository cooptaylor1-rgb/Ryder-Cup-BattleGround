import { describe, expect, it } from 'vitest';

import { GET, HEAD } from '@/app/api/health/live/route';

describe('GET /api/health/live', () => {
  it('returns a cheap healthy liveness response', async () => {
    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.status).toBe('healthy');
    expect(data.timestamp).toEqual(expect.any(String));
    expect(data.uptime).toEqual(expect.any(Number));
  });

  it('supports HEAD for basic load balancer probes', async () => {
    const response = await HEAD();

    expect(response.status).toBe(200);
    expect(await response.text()).toBe('');
  });
});
