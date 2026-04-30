import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { JoinTripModal } from '@/components/ui/JoinTripModal';

const {
  mockPullTripByShareCode,
  mockLoadTrip,
  mockStoreTripShareCode,
  mockRouterPush,
  mockGetSyncBlockReason,
} = vi.hoisted(() => ({
  mockPullTripByShareCode: vi.fn(),
  mockLoadTrip: vi.fn(),
  mockStoreTripShareCode: vi.fn(),
  mockRouterPush: vi.fn(),
  mockGetSyncBlockReason: vi.fn<
    () => 'offline' | 'supabase-unconfigured' | 'auth-pending' | 'auth-required' | null
  >(),
}));

vi.mock('@/lib/services/tripSyncService', () => ({
  pullTripByShareCode: mockPullTripByShareCode,
  // The modal now consults this synchronously before attempting the
  // join so an expired Supabase session redirects to login instead of
  // surfacing a misleading "Offline" error.
  getSyncBlockReason: mockGetSyncBlockReason,
}));

vi.mock('@/lib/stores/tripStore', () => ({
  useTripStore: Object.assign(
    () => ({ loadTrip: mockLoadTrip }),
    { getState: () => ({ players: [] }) },
  ),
}));

// The modal now requires an authenticated, onboarding-complete user
// before it will attempt a join; if either is missing it redirects to
// login or profile/complete instead. The test covers the happy path, so
// mock a ready user.
vi.mock('@/lib/stores', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('@/lib/stores');
  return {
    ...actual,
    useAuthStore: () => ({
      currentUser: {
        id: 'user-1',
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        hasCompletedOnboarding: true,
      },
      isAuthenticated: true,
      authUserId: 'user-1',
    }),
  };
});

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockRouterPush, replace: mockRouterPush }),
}));

vi.mock('@/lib/utils/tripShareCodeStore', () => ({
  storeTripShareCode: mockStoreTripShareCode,
}));

vi.mock('@/lib/services/tripPlayerLinkService', () => ({
  ensureCurrentUserTripPlayerLink: vi.fn().mockResolvedValue({ status: 'linked-id' }),
}));

describe('JoinTripModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    mockPullTripByShareCode.mockResolvedValue({
      success: true,
      tripId: 'trip-123',
    });
    mockLoadTrip.mockResolvedValue(undefined);
    mockGetSyncBlockReason.mockReturnValue(null);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('resets success state when reopened and clears the pending auto-close timer', async () => {
    const onClose = vi.fn();
    const onSuccess = vi.fn();

    const { rerender } = render(
      <JoinTripModal
        isOpen
        onClose={onClose}
        onSuccess={onSuccess}
      />
    );

    fireEvent.change(screen.getByLabelText(/share code/i), {
      target: { value: 'ABCD1234' },
    });
    fireEvent.click(screen.getByRole('button', { name: /join trip/i }));

    await waitFor(() => {
      expect(screen.getByText(/successfully joined/i)).toBeInTheDocument();
    });

    rerender(<JoinTripModal isOpen={false} onClose={onClose} onSuccess={onSuccess} />);
    rerender(<JoinTripModal isOpen onClose={onClose} onSuccess={onSuccess} />);

    expect(screen.getByLabelText(/share code/i)).toHaveValue('');
    expect(screen.queryByText(/successfully joined/i)).not.toBeInTheDocument();

    await new Promise((resolve) => setTimeout(resolve, 1600));

    expect(onClose).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('routes through cloud sign-in when the Supabase session is missing', async () => {
    // Repro: locally signed-in user (zustand isAuthenticated=true) whose
    // Supabase session has expired. Without `cloud=1` the login page
    // sees the local profile and immediately bounces back to next=,
    // which loops the user through code → login → code without ever
    // letting them re-enter their password.
    mockGetSyncBlockReason.mockReturnValue('auth-required');

    render(<JoinTripModal isOpen onClose={vi.fn()} onSuccess={vi.fn()} />);

    fireEvent.change(screen.getByLabelText(/share code/i), {
      target: { value: 'ABCD1234' },
    });
    fireEvent.click(screen.getByRole('button', { name: /join trip/i }));

    await waitFor(() => {
      expect(mockRouterPush).toHaveBeenCalledWith(
        '/login?cloud=1&next=%2Fjoin%3Fcode%3DABCD1234'
      );
    });
    expect(mockPullTripByShareCode).not.toHaveBeenCalled();
  });
});
