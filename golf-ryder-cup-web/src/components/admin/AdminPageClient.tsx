'use client';

import { useCallback, useEffect, useState } from 'react';
import { Shield } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useLiveQuery } from 'dexie-react-hooks';
import { useConfirmDialog } from '@/components/ui/ConfirmDialog';
import { PageHeader } from '@/components/layout';
import { useTripStore, useAccessStore, useToastStore } from '@/lib/stores';
import { useShallow } from 'zustand/shallow';
import { createLogger } from '@/lib/utils/logger';
import type { Trip } from '@/lib/types/models';
import {
    AdminLockedState,
    AdminOverviewSections,
} from './AdminPageSections';
import {
    cleanAdminOrphans,
    EMPTY_ADMIN_DATABASE_STATS,
    EMPTY_SYNC_METRICS,
    loadAdminDatabaseStats,
    loadAdminSyncMetrics,
    loadAdminTrips,
    scanAdminOrphans,
    type OrphanStats,
} from './adminData';

const adminLogger = createLogger('Admin');

export default function AdminPageClient() {
    const router = useRouter();
    const { deleteTrip, currentTrip, clearTrip } = useTripStore(useShallow(s => ({ deleteTrip: s.deleteTrip, currentTrip: s.currentTrip, clearTrip: s.clearTrip })));
    const { isAdminMode } = useAccessStore(useShallow(s => ({ isAdminMode: s.isAdminMode })));
    const { showToast } = useToastStore(useShallow(s => ({ showToast: s.showToast })));
    const { showConfirm, ConfirmDialogComponent } = useConfirmDialog();

    const [deletingTripId, setDeletingTripId] = useState<string | null>(null);
    const [isCleaningOrphans, setIsCleaningOrphans] = useState(false);
    const [orphanStats, setOrphanStats] = useState<OrphanStats | null>(null);
    const [syncClock, setSyncClock] = useState(() => Date.now());

    const allTrips = useLiveQuery(loadAdminTrips, [], [] as Trip[]);
    const dbStats = useLiveQuery(loadAdminDatabaseStats, [], EMPTY_ADMIN_DATABASE_STATS);
    const syncMetrics = useLiveQuery(loadAdminSyncMetrics, [], EMPTY_SYNC_METRICS);

    useEffect(() => {
        const intervalId = window.setInterval(() => setSyncClock(Date.now()), 60000);
        return () => window.clearInterval(intervalId);
    }, []);

    const oldestPendingMinutes = syncMetrics.oldestPending
        ? Math.max(1, Math.round((syncClock - syncMetrics.oldestPending) / 60000))
        : 0;

    const handleDeleteTrip = useCallback(
        (trip: Trip) => {
            showConfirm({
                title: 'Delete Trip',
                message: `Are you sure you want to delete "${trip.name}"? This will permanently remove all matches, scores, players, and related data. This action cannot be undone.`,
                confirmLabel: 'Delete Trip',
                cancelLabel: 'Cancel',
                variant: 'danger',
                onConfirm: async () => {
                    setDeletingTripId(trip.id);
                    try {
                        if (currentTrip?.id === trip.id) {
                            clearTrip();
                        }
                        await deleteTrip(trip.id);
                        showToast('success', `Trip "${trip.name}" deleted`);
                        adminLogger.info('Trip deleted', { tripId: trip.id, tripName: trip.name });
                    } catch (error) {
                        adminLogger.error('Failed to delete trip', { error, tripId: trip.id });
                        showToast('error', 'Failed to delete trip');
                    } finally {
                        setDeletingTripId(null);
                    }
                },
            });
        },
        [showConfirm, currentTrip?.id, clearTrip, deleteTrip, showToast]
    );

    const handleScanForOrphans = useCallback(async () => {
        try {
            const stats = await scanAdminOrphans();
            setOrphanStats(stats);

            const total =
                stats.orphanedMatches + stats.orphanedHoleResults + stats.orphanedTeamMembers;
            if (total === 0) {
                showToast('success', 'No orphaned data found');
            } else {
                showToast('warning', `Found ${total} orphaned records`);
            }
        } catch (error) {
            adminLogger.error('Failed to scan for orphans', { error });
            showToast('error', 'Failed to scan database');
        }
    }, [showToast]);

    const handleCleanOrphanedData = useCallback(async () => {
        setIsCleaningOrphans(true);
        try {
            const stats = await cleanAdminOrphans();
            const total =
                stats.orphanedMatches + stats.orphanedHoleResults + stats.orphanedTeamMembers;
            showToast('success', `Cleaned ${total} orphaned records`);
            adminLogger.info('Cleaned orphaned data', {
                matches: stats.orphanedMatches,
                holeResults: stats.orphanedHoleResults,
                teamMembers: stats.orphanedTeamMembers,
            });
            setOrphanStats(null);
        } catch (error) {
            adminLogger.error('Failed to clean orphans', { error });
            showToast('error', 'Failed to clean orphaned data');
        } finally {
            setIsCleaningOrphans(false);
        }
    }, [showToast]);

    if (!isAdminMode) {
        return <AdminLockedState onBack={() => router.back()} />;
    }

    return (
        <div className="min-h-screen page-premium-enter texture-grain bg-[var(--canvas)]">
            {ConfirmDialogComponent}

            <PageHeader
                title="Admin Mode"
                subtitle="Data management"
                icon={<Shield size={16} style={{ color: 'var(--canvas)' }} />}
                iconContainerStyle={{
                    background:
                        'linear-gradient(135deg, var(--error) 0%, var(--error-dark, #991b1b) 100%)',
                    boxShadow:
                        '0 2px 8px color-mix(in srgb, var(--error) 30%, transparent)',
                }}
                onBack={() => router.back()}
            />

            <main className="container-editorial">
                <AdminOverviewSections
                    dbStats={dbStats}
                    syncMetrics={syncMetrics}
                    oldestPendingMinutes={oldestPendingMinutes}
                    orphanStats={orphanStats}
                    isCleaningOrphans={isCleaningOrphans}
                    allTrips={allTrips}
                    currentTripId={currentTrip?.id ?? null}
                    deletingTripId={deletingTripId}
                    onScanForOrphans={handleScanForOrphans}
                    onCleanOrphans={handleCleanOrphanedData}
                    onDeleteTrip={handleDeleteTrip}
                />
            </main>
        </div>
    );
}
