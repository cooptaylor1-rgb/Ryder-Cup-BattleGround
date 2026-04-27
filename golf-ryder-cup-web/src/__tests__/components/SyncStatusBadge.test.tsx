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
      lastAttemptAt: '2026-04-26T12:01:00.000Z',
      lastFailedEntity: 'match',
      lastFailedOperation: 'update',
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

    expect(await screen.findByLabelText('Sync status: Retry sync (4)')).toBeInTheDocument();
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

  it('labels blocked pending work as saved locally instead of prompting a retry', async () => {
    getTripSyncStatusMock.mockReturnValue('pending');
    getSyncQueueStatusMock.mockReturnValue({
      pending: 3,
      failed: 0,
      total: 3,
      blockedReason: 'auth-required',
    });

    render(<SyncStatusBadge />);

    expect(await screen.findByLabelText('Sync status: Saved on device (3)')).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeDisabled();
    fireEvent.click(screen.getByRole('button'));
    expect(retryFailedQueueMock).not.toHaveBeenCalled();
    expect(processSyncQueueMock).not.toHaveBeenCalled();
  });

  it('uses user-facing failure details for the retry label', async () => {
    render(<SyncStatusBadge />);

    expect(
      await screen.findByRole('button', {
        name: /4 changes did not reach the cloud\. Cloud permissions blocked this change\. Latest: match update\./i,
      })
    ).toBeInTheDocument();
  });
});
