import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const getSyncQueueStatusMock = vi.hoisted(() => vi.fn());
const getTripSyncStatusMock = vi.hoisted(() => vi.fn());
const getFailedSyncQueueItemsMock = vi.hoisted(() => vi.fn());
const getUnresolvedSyncQueueItemsMock = vi.hoisted(() => vi.fn());
const processSyncQueueMock = vi.hoisted(() => vi.fn());
const retryFailedQueueMock = vi.hoisted(() => vi.fn());
const routerPushMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/services/tripSyncService', () => ({
  getFailedSyncQueueItems: () => getFailedSyncQueueItemsMock(),
  getSyncQueueStatus: () => getSyncQueueStatusMock(),
  getTripSyncStatus: (tripId: string) => getTripSyncStatusMock(tripId),
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
    getFailedSyncQueueItemsMock.mockReturnValue([
      {
        entity: 'match',
        entityId: 'match-1',
        operation: 'update',
        retryCount: 5,
        error: 'row level security',
        createdAt: '2026-04-26T12:00:00.000Z',
        lastAttemptAt: '2026-04-26T12:01:00.000Z',
      },
    ]);
    getUnresolvedSyncQueueItemsMock.mockReturnValue([]);
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
    fireEvent.click(await screen.findByRole('button', { name: 'Retry sync' }));

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

    render(<SyncStatusBadge />);

    expect(await screen.findByLabelText('Sync status: Saved on device (3)')).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeEnabled();
    fireEvent.click(screen.getByRole('button'));
    expect(await screen.findByRole('dialog', { name: 'Cloud sync details' })).toBeInTheDocument();
    expect(screen.getByText('Cloud saving is paused')).toBeInTheDocument();
    expect(screen.getByText('Session add')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Sign in to sync' }));
    expect(routerPushMock).toHaveBeenCalledWith('/login?returnTo=%2Fschedule');
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

  it('opens visible sync details with the latest failed item', async () => {
    render(<SyncStatusBadge />);

    fireEvent.click(await screen.findByRole('button'));

    expect(await screen.findByRole('dialog', { name: 'Cloud sync details' })).toBeInTheDocument();
    expect(screen.getByText('Cloud sync needs attention')).toBeInTheDocument();
    expect(screen.getByText('Match update')).toBeInTheDocument();
    expect(screen.getByText('Cloud permissions blocked this change.')).toBeInTheDocument();
    expect(screen.getByText('5 attempts')).toBeInTheDocument();
  });
});
