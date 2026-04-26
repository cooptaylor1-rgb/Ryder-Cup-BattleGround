import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const getSyncQueueStatusMock = vi.hoisted(() => vi.fn());
const getTripSyncStatusMock = vi.hoisted(() => vi.fn());
const processSyncQueueMock = vi.hoisted(() => vi.fn());
const retryFailedQueueMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/services/tripSyncService', () => ({
  getSyncQueueStatus: () => getSyncQueueStatusMock(),
  getTripSyncStatus: (tripId: string) => getTripSyncStatusMock(tripId),
  processSyncQueue: () => processSyncQueueMock(),
  retryFailedQueue: () => retryFailedQueueMock(),
}));

vi.mock('@/lib/stores/tripStore', () => ({
  useTripStore: (selector: (state: { currentTrip: { id: string } }) => unknown) =>
    selector({ currentTrip: { id: 'trip-1' } }),
}));

import { SyncStatusBadge } from '@/components/SyncStatusBadge';

describe('SyncStatusBadge', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getTripSyncStatusMock.mockReturnValue('failed');
    getSyncQueueStatusMock.mockReturnValue({
      pending: 0,
      failed: 4,
      total: 4,
      lastError: 'row level security',
      blockedReason: undefined,
    });
    retryFailedQueueMock.mockResolvedValue(4);
    processSyncQueueMock.mockResolvedValue({
      success: true,
      synced: 4,
      failed: 0,
      queued: 0,
      errors: [],
    });
  });

  it('shows failed sync count even when rendered as an icon badge', async () => {
    render(<SyncStatusBadge />);

    expect(await screen.findByLabelText('Sync status: Needs retry (4)')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
  });

  it('retries failed syncs from the compact badge', async () => {
    render(<SyncStatusBadge />);

    fireEvent.click(await screen.findByRole('button'));

    await waitFor(() => {
      expect(retryFailedQueueMock).toHaveBeenCalledTimes(1);
      expect(processSyncQueueMock).toHaveBeenCalledTimes(1);
    });
  });
});
