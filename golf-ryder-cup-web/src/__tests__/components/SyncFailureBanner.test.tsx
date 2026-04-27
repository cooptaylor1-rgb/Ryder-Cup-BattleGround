import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const getSyncQueueStatusMock = vi.fn();
const getFailedSyncQueueItemsMock = vi.fn();
const getUnresolvedSyncQueueItemsMock = vi.fn();
const retryFailedQueueMock = vi.fn();
const processSyncQueueMock = vi.fn();
const routerPushMock = vi.fn();

vi.mock('@/lib/services/tripSyncService', () => ({
  getFailedSyncQueueItems: () => getFailedSyncQueueItemsMock(),
  getSyncQueueStatus: () => getSyncQueueStatusMock(),
  getUnresolvedSyncQueueItems: () => getUnresolvedSyncQueueItemsMock(),
  processSyncQueue: () => processSyncQueueMock(),
  retryFailedQueue: () => retryFailedQueueMock(),
  TRIP_SYNC_QUEUE_CHANGED_EVENT: 'trip-sync-queue-changed',
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/schedule',
  useRouter: () => ({
    push: routerPushMock,
    replace: vi.fn(),
    back: vi.fn(),
  }),
  useParams: () => ({}),
  useSearchParams: () => new URLSearchParams(),
}));

import { SyncFailureBanner } from '@/components/SyncFailureBanner';

describe('SyncFailureBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getFailedSyncQueueItemsMock.mockReturnValue([]);
    getUnresolvedSyncQueueItemsMock.mockReturnValue([]);
    retryFailedQueueMock.mockResolvedValue(1);
    processSyncQueueMock.mockResolvedValue({
      success: true,
      synced: 1,
      failed: 0,
      queued: 0,
      errors: [],
    });
  });

  it('routes to sign-in when failed sync is blocked by auth', async () => {
    getSyncQueueStatusMock.mockReturnValue({
      pending: 0,
      failed: 1,
      total: 1,
      lastError: 'row level security',
      blockedReason: 'auth-required',
    });

    render(<SyncFailureBanner />);

    expect(
      await screen.findByText('1 change saved on this device. Sign in to resume cloud saving.')
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Sign in to sync' }));

    expect(routerPushMock).toHaveBeenCalledWith('/login?returnTo=%2Fschedule');
    expect(retryFailedQueueMock).not.toHaveBeenCalled();
    expect(processSyncQueueMock).not.toHaveBeenCalled();
  });

  it('explains pending local work when cloud sync is waiting for sign-in', async () => {
    getSyncQueueStatusMock.mockReturnValue({
      pending: 16,
      failed: 0,
      total: 16,
      blockedReason: 'auth-required',
    });
    getUnresolvedSyncQueueItemsMock.mockReturnValue([
      {
        entity: 'session',
        entityId: 'session-1',
        operation: 'create',
        status: 'pending',
        retryCount: 0,
        createdAt: '2026-04-26T12:00:00.000Z',
      },
    ]);

    render(<SyncFailureBanner />);

    expect(await screen.findByText('Cloud saving is paused')).toBeInTheDocument();
    expect(
      screen.getByText('16 changes saved on this device. Sign in to resume cloud saving.')
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Details' }));
    expect(screen.getByText('Session add')).toBeInTheDocument();
    expect(screen.getByText('Waiting to send to the cloud.')).toBeInTheDocument();
  });

  it('stays hidden while offline so the offline banner owns that state', () => {
    getSyncQueueStatusMock.mockReturnValue({
      pending: 0,
      failed: 2,
      total: 2,
      lastError: 'offline',
      blockedReason: 'offline',
    });
    getUnresolvedSyncQueueItemsMock.mockReturnValue([
      {
        entity: 'match',
        entityId: 'match-1',
        operation: 'update',
        status: 'pending',
        retryCount: 0,
        createdAt: '2026-04-26T12:00:00.000Z',
      },
    ]);

    render(<SyncFailureBanner />);

    expect(screen.queryByText('Cloud saving is paused')).not.toBeInTheDocument();
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
