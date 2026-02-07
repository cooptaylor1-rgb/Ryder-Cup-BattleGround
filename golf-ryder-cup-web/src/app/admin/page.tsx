'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '@/lib/db';
import { useTripStore, useUIStore } from '@/lib/stores';
import { useConfirmDialog } from '@/components/ui/ConfirmDialog';
import { BottomNav } from '@/components/layout/BottomNav';
import { createLogger } from '@/lib/utils/logger';
import {
  ChevronLeft,
  Shield,
  Trash2,
  Database,
  RefreshCcw,
  AlertTriangle,
  Calendar,
  MapPin,
  Users,
  CheckCircle,
  XCircle,
  Lock,
  HardDrive,
  Zap,
} from 'lucide-react';
import type { Trip } from '@/lib/types/models';

const adminLogger = createLogger('Admin');

/**
 * ADMIN PAGE
 *
 * Power user features for managing app data:
 * - View and delete any trip
 * - Clear orphaned data
 * - Database statistics
 * - Force sync operations
 */

export default function AdminPage() {
  const router = useRouter();
  const { deleteTrip, currentTrip, clearTrip } = useTripStore();
  const { isAdminMode, showToast } = useUIStore();
  const { showConfirm, ConfirmDialogComponent } = useConfirmDialog();

  const [deletingTripId, setDeletingTripId] = useState<string | null>(null);
  const [isCleaningOrphans, setIsCleaningOrphans] = useState(false);
  const [orphanStats, setOrphanStats] = useState<{
    orphanedMatches: number;
    orphanedHoleResults: number;
    orphanedTeamMembers: number;
  } | null>(null);

  // Load all trips
  const allTrips = useLiveQuery(
    async () => {
      const trips = await db.trips.toArray();
      // Sort by updatedAt descending (most recent first)
      return trips.sort(
        (a, b) =>
          new Date(b.updatedAt || b.createdAt).getTime() -
          new Date(a.updatedAt || a.createdAt).getTime()
      );
    },
    [],
    [] as Trip[]
  );

  // Load database stats
  const dbStats = useLiveQuery(
    async () => {
      const [trips, players, sessions, matches, holeResults, teams] = await Promise.all([
        db.trips.count(),
        db.players.count(),
        db.sessions.count(),
        db.matches.count(),
        db.holeResults.count(),
        db.teams.count(),
      ]);
      return { trips, players, sessions, matches, holeResults, teams };
    },
    [],
    { trips: 0, players: 0, sessions: 0, matches: 0, holeResults: 0, teams: 0 }
  );

  const syncMetrics = useLiveQuery(
    async () => {
      const items = await db.tripSyncQueue.toArray();
      const pending = items.filter(
        (item) => item.status === 'pending' || item.status === 'syncing'
      );
      const failed = items.filter((item) => item.status === 'failed');
      const oldestPending =
        pending.length > 0
          ? Math.min(...pending.map((item) => new Date(item.createdAt).getTime()))
          : null;
      const averageRetry =
        items.length > 0
          ? Math.round(items.reduce((sum, item) => sum + item.retryCount, 0) / items.length)
          : 0;
      const lastAttempt = items
        .map((item) => item.lastAttemptAt)
        .filter(Boolean)
        .map((value) => new Date(value as string).getTime())
        .sort((a, b) => b - a)[0];

      return {
        total: items.length,
        pending: pending.length,
        failed: failed.length,
        oldestPending,
        averageRetry,
        lastAttempt: lastAttempt || null,
      };
    },
    [],
    {
      total: 0,
      pending: 0,
      failed: 0,
      oldestPending: null as number | null,
      averageRetry: 0,
      lastAttempt: null as number | null,
    }
  );

  // Handle trip deletion
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
            // If deleting current trip, clear it first
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
    [showConfirm, deleteTrip, currentTrip, clearTrip, showToast]
  );

  // Scan for orphaned data
  const scanForOrphans = useCallback(async () => {
    try {
      // Find matches without valid sessions
      const allSessions = await db.sessions.toArray();
      const sessionIds = new Set(allSessions.map((s) => s.id));
      const allMatches = await db.matches.toArray();
      const orphanedMatches = allMatches.filter((m) => !sessionIds.has(m.sessionId));

      // Find hole results without valid matches
      const matchIds = new Set(allMatches.map((m) => m.id));
      const allHoleResults = await db.holeResults.toArray();
      const orphanedHoleResults = allHoleResults.filter((hr) => !matchIds.has(hr.matchId));

      // Find team members without valid teams
      const allTeams = await db.teams.toArray();
      const teamIds = new Set(allTeams.map((t) => t.id));
      const allTeamMembers = await db.teamMembers.toArray();
      const orphanedTeamMembers = allTeamMembers.filter((tm) => !teamIds.has(tm.teamId));

      setOrphanStats({
        orphanedMatches: orphanedMatches.length,
        orphanedHoleResults: orphanedHoleResults.length,
        orphanedTeamMembers: orphanedTeamMembers.length,
      });

      const total =
        orphanedMatches.length + orphanedHoleResults.length + orphanedTeamMembers.length;
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

  // Clean orphaned data
  const cleanOrphanedData = useCallback(async () => {
    setIsCleaningOrphans(true);
    try {
      // Find and delete orphaned matches
      const allSessions = await db.sessions.toArray();
      const sessionIds = new Set(allSessions.map((s) => s.id));
      const allMatches = await db.matches.toArray();
      const orphanedMatchIds = allMatches
        .filter((m) => !sessionIds.has(m.sessionId))
        .map((m) => m.id);

      // Find and delete orphaned hole results
      const matchIds = new Set(allMatches.map((m) => m.id));
      const allHoleResults = await db.holeResults.toArray();
      const orphanedHoleResultIds = allHoleResults
        .filter((hr) => !matchIds.has(hr.matchId))
        .map((hr) => hr.id);

      // Find and delete orphaned team members
      const allTeams = await db.teams.toArray();
      const teamIds = new Set(allTeams.map((t) => t.id));
      const allTeamMembers = await db.teamMembers.toArray();
      const orphanedTeamMemberIds = allTeamMembers
        .filter((tm) => !teamIds.has(tm.teamId))
        .map((tm) => tm.id);

      // Perform deletions
      await db.transaction('rw', [db.matches, db.holeResults, db.teamMembers], async () => {
        if (orphanedMatchIds.length > 0) {
          await db.matches.bulkDelete(orphanedMatchIds);
        }
        if (orphanedHoleResultIds.length > 0) {
          await db.holeResults.bulkDelete(orphanedHoleResultIds);
        }
        if (orphanedTeamMemberIds.length > 0) {
          await db.teamMembers.bulkDelete(orphanedTeamMemberIds);
        }
      });

      const total =
        orphanedMatchIds.length + orphanedHoleResultIds.length + orphanedTeamMemberIds.length;
      showToast('success', `Cleaned ${total} orphaned records`);
      adminLogger.info('Cleaned orphaned data', {
        matches: orphanedMatchIds.length,
        holeResults: orphanedHoleResultIds.length,
        teamMembers: orphanedTeamMemberIds.length,
      });
      setOrphanStats(null);
    } catch (error) {
      adminLogger.error('Failed to clean orphans', { error });
      showToast('error', 'Failed to clean orphaned data');
    } finally {
      setIsCleaningOrphans(false);
    }
  }, [showToast]);

  // Redirect if not in admin mode
  if (!isAdminMode) {
    return (
      <div className="min-h-screen pb-nav flex items-center justify-center bg-[var(--canvas)]">
        <div className="text-center p-8">
          <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center bg-[var(--surface-elevated)]">
            <Lock size={32} className="text-[var(--ink-tertiary)]" />
          </div>
          <h2 className="type-title-lg mb-2">Admin Mode Required</h2>
          <p className="type-body mb-6 text-[var(--ink-secondary)]">
            Enable Admin Mode from the More menu to access these features.
          </p>
          <Link
            href="/more"
            className="btn-premium py-[var(--space-3)] px-[var(--space-5)]"
          >
            Go to More
          </Link>
        </div>

        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-nav page-premium-enter texture-grain bg-[var(--canvas)]">
      {ConfirmDialogComponent}

      {/* Header */}
      <header className="header-premium">
        <div className="container-editorial flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="p-2 -ml-2 press-scale text-[var(--ink-secondary)] bg-transparent border-none cursor-pointer"
            >
              <ChevronLeft size={22} strokeWidth={1.75} />
            </button>
            <div className="flex items-center gap-[var(--space-3)]">
              <div
                className="w-8 h-8 rounded-[var(--radius-md)] flex items-center justify-center shadow-[0_2px_8px_rgba(220,38,38,0.3)]"
                style={{
                  background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
                }}
              >
                <Shield size={16} className="text-white" />
              </div>
              <div>
                <span className="type-overline tracking-[0.1em] text-[#dc2626]">
                  Admin Mode
                </span>
                <p className="type-caption truncate mt-[2px]">
                  Data management
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container-editorial">
        {/* Warning Banner */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="section-sm"
        >
          <div className="bg-[rgba(220,38,38,0.1)] border border-[rgba(220,38,38,0.2)] rounded-[var(--radius-lg)] p-[var(--space-4)] flex items-start gap-[var(--space-3)]">
            <AlertTriangle
              size={20}
              className="text-[#dc2626] shrink-0 mt-[2px]"
            />
            <div>
              <p className="type-body font-semibold text-[#dc2626]">
                Admin Mode Active
              </p>
              <p className="type-caption text-[var(--ink-secondary)] mt-[4px]">
                Actions here can permanently delete data. Use with caution.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Database Stats */}
        <section className="section">
          <h2 className="type-overline mb-3">Database Statistics</h2>
          <div className="card p-[var(--space-4)]">
            <div className="grid grid-cols-3 gap-[var(--space-4)]">
              <div className="text-center">
                <div className="type-display-sm text-[var(--masters)]">
                  {dbStats.trips}
                </div>
                <div className="type-caption">Trips</div>
              </div>
              <div className="text-center">
                <div className="type-display-sm text-[var(--masters)]">
                  {dbStats.players}
                </div>
                <div className="type-caption">Players</div>
              </div>
              <div className="text-center">
                <div className="type-display-sm text-[var(--masters)]">
                  {dbStats.matches}
                </div>
                <div className="type-caption">Matches</div>
              </div>
              <div className="text-center">
                <div className="type-display-sm text-[var(--ink-secondary)]">
                  {dbStats.sessions}
                </div>
                <div className="type-caption">Sessions</div>
              </div>
              <div className="text-center">
                <div className="type-display-sm text-[var(--ink-secondary)]">
                  {dbStats.holeResults}
                </div>
                <div className="type-caption">Hole Results</div>
              </div>
              <div className="text-center">
                <div className="type-display-sm text-[var(--ink-secondary)]">
                  {dbStats.teams}
                </div>
                <div className="type-caption">Teams</div>
              </div>
            </div>
          </div>
        </section>

        {/* Sync Reliability */}
        <section className="section">
          <h2 className="type-overline mb-3">Sync Reliability</h2>
          <div className="card p-[var(--space-4)]">
            <div className="grid grid-cols-3 gap-[var(--space-4)]">
              <div className="text-center">
                <div className="type-display-sm text-[var(--masters)]">
                  {syncMetrics.total}
                </div>
                <div className="type-caption">Queue Depth</div>
              </div>
              <div className="text-center">
                <div
                  className={`type-display-sm ${syncMetrics.failed > 0 ? 'text-[#dc2626]' : 'text-[var(--ink-secondary)]'}`}
                >
                  {syncMetrics.failed}
                </div>
                <div className="type-caption">Failed Items</div>
              </div>
              <div className="text-center">
                <div className="type-display-sm text-[var(--ink-secondary)]">
                  {syncMetrics.pending}
                </div>
                <div className="type-caption">Pending Items</div>
              </div>
              <div className="text-center">
                <div className="type-display-sm text-[var(--ink-secondary)]">
                  {syncMetrics.oldestPending
                    ? Math.max(1, Math.round((Date.now() - syncMetrics.oldestPending) / 60000))
                    : 0}
                </div>
                <div className="type-caption">Oldest Pending (min)</div>
              </div>
              <div className="text-center">
                <div className="type-display-sm text-[var(--ink-secondary)]">
                  {syncMetrics.averageRetry}
                </div>
                <div className="type-caption">Avg Retry Count</div>
              </div>
              <div className="text-center">
                <div className="type-display-sm text-[var(--ink-secondary)]">
                  {syncMetrics.lastAttempt
                    ? new Date(syncMetrics.lastAttempt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : '—'}
                </div>
                <div className="type-caption">Last Attempt</div>
              </div>
            </div>
          </div>
        </section>

        {/* Data Cleanup */}
        <section className="section">
          <h2 className="type-overline mb-3">Data Cleanup</h2>
          <div className="card p-[var(--space-4)]">
            <div className="flex flex-col gap-[var(--space-3)]">
              <button
                onClick={scanForOrphans}
                className="match-row w-full justify-start"
              >
                <Database size={18} className="text-[var(--masters)]" />
                <div className="flex-1 text-left">
                  <p className="font-medium">Scan for Orphaned Data</p>
                  <p className="type-meta">Find records without parent references</p>
                </div>
              </button>

              {orphanStats && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="bg-[var(--surface-elevated)] rounded-[var(--radius-md)] p-[var(--space-3)]"
                >
                  <div className="flex flex-col gap-[var(--space-2)]">
                    <div className="flex justify-between">
                      <span className="type-caption">Orphaned Matches:</span>
                      <span className={orphanStats.orphanedMatches > 0 ? 'text-red-600' : ''}>
                        {orphanStats.orphanedMatches}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="type-caption">Orphaned Hole Results:</span>
                      <span className={orphanStats.orphanedHoleResults > 0 ? 'text-red-600' : ''}>
                        {orphanStats.orphanedHoleResults}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="type-caption">Orphaned Team Members:</span>
                      <span className={orphanStats.orphanedTeamMembers > 0 ? 'text-red-600' : ''}>
                        {orphanStats.orphanedTeamMembers}
                      </span>
                    </div>
                    {(orphanStats.orphanedMatches > 0 ||
                      orphanStats.orphanedHoleResults > 0 ||
                      orphanStats.orphanedTeamMembers > 0) && (
                      <button
                        onClick={cleanOrphanedData}
                        disabled={isCleaningOrphans}
                        className={`btn-premium mt-2 bg-[#dc2626] py-[var(--space-2)] px-[var(--space-3)] ${isCleaningOrphans ? 'opacity-60' : ''}`}
                      >
                        <Zap size={14} />
                        {isCleaningOrphans ? 'Cleaning...' : 'Clean Orphaned Data'}
                      </button>
                    )}
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </section>

        {/* Trip Management */}
        <section className="section">
          <h2 className="type-overline mb-3">All Trips ({allTrips.length})</h2>
          <div className="flex flex-col gap-[var(--space-3)]">
            <AnimatePresence mode="popLayout">
              {allTrips.map((trip) => (
                <motion.div
                  key={trip.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95, height: 0 }}
                  className={`card p-[var(--space-4)] ${currentTrip?.id === trip.id ? 'border-2 border-[var(--masters)]' : ''}`}
                >
                  <div className="flex items-start gap-[var(--space-3)]">
                    <div className="flex-1">
                      <div className="flex items-center gap-[var(--space-2)] mb-[4px]">
                        <h3 className="type-title-sm">{trip.name}</h3>
                        {currentTrip?.id === trip.id && (
                          <span className="bg-[var(--masters)] text-white text-[10px] px-[6px] py-[2px] rounded-[4px] font-semibold">
                            ACTIVE
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-[var(--space-3)] mt-[var(--space-2)]">
                        {trip.location && (
                          <div className="flex items-center gap-1">
                            <MapPin size={12} className="text-[var(--ink-tertiary)]" />
                            <span className="type-caption">{trip.location}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <Calendar size={12} className="text-[var(--ink-tertiary)]" />
                          <span className="type-caption">
                            {new Date(trip.startDate).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          {trip.isCaptainModeEnabled ? (
                            <CheckCircle size={12} className="text-[var(--success)]" />
                          ) : (
                            <XCircle size={12} className="text-[var(--ink-tertiary)]" />
                          )}
                          <span className="type-caption">
                            Captain Mode {trip.isCaptainModeEnabled ? 'On' : 'Off'}
                          </span>
                        </div>
                      </div>
                      <p className="type-meta mt-2 text-[var(--ink-tertiary)]">
                        ID: {trip.id.slice(0, 8)}...
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteTrip(trip)}
                      disabled={deletingTripId === trip.id}
                      className={`press-scale bg-[rgba(220,38,38,0.1)] border-none rounded-[var(--radius-md)] p-[var(--space-2)] cursor-pointer ${deletingTripId === trip.id ? 'opacity-50' : ''}`}
                    >
                      {deletingTripId === trip.id ? (
                        <RefreshCcw
                          size={18}
                          className="animate-spin text-[#dc2626]"
                        />
                      ) : (
                        <Trash2 size={18} className="text-[#dc2626]" />
                      )}
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {allTrips.length === 0 && (
              <div className="card p-[var(--space-6)] text-center">
                <HardDrive
                  size={32}
                  className="text-[var(--ink-tertiary)] mx-auto mb-3"
                />
                <p className="type-body text-[var(--ink-secondary)]">
                  No trips found
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Quick Actions */}
        <section className="section">
          <h2 className="type-overline mb-3">Quick Actions</h2>
          <div className="card p-[var(--space-4)]">
            <Link href="/trip/new" className="match-row no-underline">
              <Users size={18} className="text-[var(--masters)]" />
              <div className="flex-1">
                <p className="font-medium">Create New Trip</p>
                <p className="type-meta">Start a new golf trip</p>
              </div>
              <ChevronLeft
                size={18}
                className="text-[var(--ink-tertiary)] rotate-180"
              />
            </Link>
            <Link href="/settings/backup" className="match-row no-underline">
              <Database size={18} className="text-[var(--ink-secondary)]" />
              <div className="flex-1">
                <p className="font-medium">Backup & Export</p>
                <p className="type-meta">Save your data</p>
              </div>
              <ChevronLeft
                size={18}
                className="text-[var(--ink-tertiary)] rotate-180"
              />
            </Link>
          </div>
        </section>
      </main>

      <BottomNav />
    </div>
  );
}
