import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

const {
  applyRateLimitAsyncMock,
  requireAuthMock,
  requireTripAccessMock,
  createClientMock,
} = vi.hoisted(() => ({
  applyRateLimitAsyncMock: vi.fn<() => Promise<NextResponse | null>>(async () => null),
  requireAuthMock: vi.fn<
    () => Promise<{ response: NextResponse | null; userId?: string }>
  >(async () => ({ response: null, userId: '550e8400-e29b-41d4-a716-446655440001' })),
  requireTripAccessMock: vi.fn<() => Promise<NextResponse | null>>(async () => null),
  createClientMock: vi.fn(),
}));

vi.mock('@/lib/utils/apiMiddleware', async () => {
  const actual = await vi.importActual<typeof import('@/lib/utils/apiMiddleware')>(
    '@/lib/utils/apiMiddleware'
  );
  return {
    ...actual,
    applyRateLimitAsync: applyRateLimitAsyncMock,
    requireAuth: requireAuthMock,
    requireTripAccess: requireTripAccessMock,
  };
});

vi.mock('@supabase/supabase-js', () => ({
  createClient: createClientMock,
}));

function createDeleteRequest(
  body: unknown,
  headers?: Record<string, string>
): NextRequest {
  return new NextRequest('http://localhost:3000/api/push/subscribe', {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

function configureSupabaseClient(options?: {
  lookupData?: { user_id?: string | null; trip_id?: string | null } | null;
  lookupError?: { message: string } | null;
  deleteError?: { message: string } | null;
}) {
  const maybeSingleMock = vi
    .fn()
    .mockResolvedValue({ data: options?.lookupData ?? null, error: options?.lookupError ?? null });
  const deleteEqMock = vi
    .fn()
    .mockResolvedValue({ error: options?.deleteError ?? null });

  createClientMock.mockReturnValue({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: maybeSingleMock,
        })),
      })),
      delete: vi.fn(() => ({
        eq: deleteEqMock,
      })),
      upsert: vi.fn().mockResolvedValue({ error: null }),
    })),
  });

  return {
    deleteEqMock,
    maybeSingleMock,
  };
}

async function loadRouteModule() {
  return import('@/app/api/push/subscribe/route');
}

describe('Push Subscribe Route', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.unstubAllEnvs();

    applyRateLimitAsyncMock.mockResolvedValue(null);
    requireTripAccessMock.mockResolvedValue(null);
    requireAuthMock.mockResolvedValue({
      response: null,
      userId: '550e8400-e29b-41d4-a716-446655440001',
    });
    createClientMock.mockReset();
  });

  describe('DELETE /api/push/subscribe', () => {
    it('requires authorization context in cloud mode when no stored subscription is found', async () => {
      vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co');
      vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-role-key');
      configureSupabaseClient();

      const { DELETE } = await loadRouteModule();
      const response = await DELETE(
        createDeleteRequest({ endpoint: 'https://push.example/subscriptions/1' })
      );
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Authorization context required');
    });

    it('blocks deletion when stored trip access is denied', async () => {
      vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co');
      vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-role-key');
      const { deleteEqMock } = configureSupabaseClient({
        lookupData: {
          trip_id: '550e8400-e29b-41d4-a716-446655440010',
        },
      });
      requireTripAccessMock.mockResolvedValueOnce(
        NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      );

      const { DELETE } = await loadRouteModule();
      const response = await DELETE(
        createDeleteRequest({ endpoint: 'https://push.example/subscriptions/2' })
      );

      expect(response.status).toBe(403);
      expect(requireTripAccessMock).toHaveBeenCalledWith(
        expect.any(NextRequest),
        '550e8400-e29b-41d4-a716-446655440010'
      );
      expect(deleteEqMock).not.toHaveBeenCalled();
    });

    it('deletes subscription when request trip context is authorized', async () => {
      vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co');
      vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-role-key');
      const { deleteEqMock } = configureSupabaseClient();

      const { DELETE } = await loadRouteModule();
      const response = await DELETE(
        createDeleteRequest(
          {
            endpoint: 'https://push.example/subscriptions/3',
            tripId: '550e8400-e29b-41d4-a716-446655440020',
          },
          { 'X-Share-Code': 'ABCDEFGH' }
        )
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(requireTripAccessMock).toHaveBeenCalledWith(
        expect.any(NextRequest),
        '550e8400-e29b-41d4-a716-446655440020'
      );
      expect(deleteEqMock).toHaveBeenCalledWith('endpoint', 'https://push.example/subscriptions/3');
    });

    it('rejects deletion when stored user identity does not match the authenticated user', async () => {
      vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co');
      vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-role-key');
      const { deleteEqMock } = configureSupabaseClient({
        lookupData: {
          user_id: '550e8400-e29b-41d4-a716-446655440099',
        },
      });
      requireAuthMock.mockResolvedValueOnce({
        response: null,
        userId: '550e8400-e29b-41d4-a716-446655440001',
      });

      const { DELETE } = await loadRouteModule();
      const response = await DELETE(
        createDeleteRequest({ endpoint: 'https://push.example/subscriptions/4' })
      );
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Forbidden');
      expect(deleteEqMock).not.toHaveBeenCalled();
    });
  });
});
