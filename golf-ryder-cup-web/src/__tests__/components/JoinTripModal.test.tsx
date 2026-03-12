import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { JoinTripModal } from '@/components/ui/JoinTripModal';

const { mockJoinTripByShareCode, mockLoadTrip, mockStoreTripShareCode } = vi.hoisted(() => ({
  mockJoinTripByShareCode: vi.fn(),
  mockLoadTrip: vi.fn(),
  mockStoreTripShareCode: vi.fn(),
}));

vi.mock('@/lib/supabase', () => ({
  syncService: {
    joinTripByShareCode: mockJoinTripByShareCode,
  },
}));

vi.mock('@/lib/stores/tripStore', () => ({
  useTripStore: () => ({
    loadTrip: mockLoadTrip,
  }),
}));

vi.mock('@/lib/utils/tripShareCodeStore', () => ({
  storeTripShareCode: mockStoreTripShareCode,
}));

describe('JoinTripModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    mockJoinTripByShareCode.mockResolvedValue({
      success: true,
      synced: 1,
      tripId: 'trip-123',
      errors: [],
    });
    mockLoadTrip.mockResolvedValue(undefined);
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
});
