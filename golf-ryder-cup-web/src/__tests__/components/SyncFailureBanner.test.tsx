import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const getSyncQueueStatusMock = vi.fn();
const getFailedSyncQueueItemsMock = vi.fn();
const retryFailedQueueMock = vi.fn();
const processSyncQueueMock = vi.fn();

vi.mock('@/lib/services/tripSyncService', () => ({
  getFailedSyncQueueItems: () => getFailedSyncQueueItemsMock(),
  getSyncQueueStatus: () => getSyncQueueStatusMock(),
  processSyncQueue: () => processSyncQueueMock(),
  retryFailedQueue: () => retryFailedQueueMock(),
}));

import { SyncFailureBanner } from '@/components/SyncFailureBanner';

describe('SyncFailureBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getFailedSyncQueueItemsMock.mockReturnValue([]);
    retryFailedQueueMock.mockResolvedValue(1);
    processSyncQueueMock.mockResolvedValue({
      success: true,
      synced: 1,
      failed: 0,
      queued: 0,
      errors: [],
    });
  });

  it('keeps retry disabled when sync is blocked by auth', async () => {
    getSyncQueueStatusMock.mockReturnValue({
      pending: 0,
      failed: 1,
      total: 1,
      lastError: 'row level security',
      blockedReason: 'auth-required',
    });

    render(<SyncFailureBanner />);

    expect(await screen.findByText('Sign in to resume cloud saving.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign in to sync' })).toBeDisabled();
  });

  it('stays hidden while offline so the offline banner owns that state', () => {
    getSyncQueueStatusMock.mockReturnValue({
      pending: 0,
      failed: 2,
      total: 2,
      lastError: 'offline',
      blockedReason: 'offline',
    });

    render(<SyncFailureBanner />);

    expect(screen.queryByText('Cloud sync needs attention')).not.toBeInTheDocument();
  });

  it('shows failed item details and retries when sync is ready', async () => {
    getSyncQueueStatusMock
      .mockReturnValueOnce({
        pending: 0,
        failed: 1,
        total: 1,
        lastError: '[upsert matches] row level security | code: 42501',
        blockedReason: undefined,
      })
      .mockReturnValue({
        pending: 0,
        failed: 0,
        total: 0,
        blockedReason: undefined,
      });
    getFailedSyncQueueItemsMock.mockReturnValue([
      {
        entity: 'match',
        entityId: 'match-1',
        operation: 'update',
        retryCount: 5,
        error: '[upsert matches] row level security | code: 42501',
        createdAt: '2026-04-26T12:00:00.000Z',
        lastAttemptAt: '2026-04-26T12:01:00.000Z',
      },
    ]);

    render(<SyncFailureBanner />);

    fireEvent.click(await screen.findByRole('button', { name: 'Details' }));
    expect(screen.getByText('Changes are saved on this device')).toBeInTheDocument();
    expect(screen.getByText('Match update')).toBeInTheDocument();
    expect(screen.getByText('Cloud permissions blocked this change.')).toBeInTheDocument();
    expect(screen.getByText(/\[upsert matches\] row level security/)).toBeInTheDocument();
    expect(screen.getByText('5 attempts')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Retry sync' }));

    await waitFor(() => {
      expect(retryFailedQueueMock).toHaveBeenCalledTimes(1);
      expect(processSyncQueueMock).toHaveBeenCalledTimes(1);
    });
  });

  it('confirms changes stay local when retry still leaves failed work', async () => {
    getSyncQueueStatusMock.mockReturnValue({
      pending: 0,
      failed: 2,
      total: 2,
      lastError: 'network timeout',
      blockedReason: undefined,
    });

    render(<SyncFailureBanner />);

    fireEvent.click(await screen.findByRole('button', { name: 'Retry sync' }));

    expect(
      await screen.findByText(
        'Still saved on this device. Try again when the connection is stable.'
      )
    ).toBeInTheDocument();
  });
});
