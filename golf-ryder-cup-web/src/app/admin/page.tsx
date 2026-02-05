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
      <div
        className="min-h-screen pb-nav flex items-center justify-center"
        style={{ background: 'var(--canvas)' }}
      >
        <div className="text-center p-8">
          <div
            className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
            style={{ background: 'var(--surface-elevated)' }}
          >
            <Lock size={32} style={{ color: 'var(--ink-tertiary)' }} />
          </div>
          <h2 className="type-title-lg mb-2">Admin Mode Required</h2>
          <p className="type-body mb-6" style={{ color: 'var(--ink-secondary)' }}>
            Enable Admin Mode from the More menu to access these features.
          </p>
          <Link
            href="/more"
            className="btn-premium"
            style={{ padding: 'var(--space-3) var(--space-5)' }}
          >
            Go to More
          </Link>
        </div>

        <BottomNav />
      </div>
    );
  }

  return (
    <div
      className="min-h-screen pb-nav page-premium-enter texture-grain"
      style={{ background: 'var(--canvas)' }}
    >
      {ConfirmDialogComponent}

      {/* Header */}
      <header className="header-premium">
        <div className="container-editorial flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="p-2 -ml-2 press-scale"
              style={{
                color: 'var(--ink-secondary)',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              <ChevronLeft size={22} strokeWidth={1.75} />
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: 'var(--radius-md)',
                  background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 8px rgba(220, 38, 38, 0.3)',
                }}
              >
                <Shield size={16} style={{ color: 'white' }} />
              </div>
              <div>
                <span
                  className="type-overline"
                  style={{ letterSpacing: '0.1em', color: '#dc2626' }}
                >
                  Admin Mode
                </span>
                <p className="type-caption truncate" style={{ marginTop: '2px' }}>
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
          <div
            style={{
              background: 'rgba(220, 38, 38, 0.1)',
              border: '1px solid rgba(220, 38, 38, 0.2)',
              borderRadius: 'var(--radius-lg)',
              padding: 'var(--space-4)',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 'var(--space-3)',
            }}
          >
            <AlertTriangle
              size={20}
              style={{ color: '#dc2626', flexShrink: 0, marginTop: '2px' }}
            />
            <div>
              <p className="type-body" style={{ fontWeight: 600, color: '#dc2626' }}>
                Admin Mode Active
              </p>
              <p
                className="type-caption"
                style={{ color: 'var(--ink-secondary)', marginTop: '4px' }}
              >
                Actions here can permanently delete data. Use with caution.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Database Stats */}
        <section className="section">
          <h2 className="type-overline mb-3">Database Statistics</h2>
          <div className="card" style={{ padding: 'var(--space-4)' }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 'var(--space-4)',
              }}
            >
              <div style={{ textAlign: 'center' }}>
                <div className="type-display-sm" style={{ color: 'var(--masters)' }}>
                  {dbStats.trips}
                </div>
                <div className="type-caption">Trips</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div className="type-display-sm" style={{ color: 'var(--masters)' }}>
                  {dbStats.players}
                </div>
                <div className="type-caption">Players</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div className="type-display-sm" style={{ color: 'var(--masters)' }}>
                  {dbStats.matches}
                </div>
                <div className="type-caption">Matches</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div className="type-display-sm" style={{ color: 'var(--ink-secondary)' }}>
                  {dbStats.sessions}
                </div>
                <div className="type-caption">Sessions</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div className="type-display-sm" style={{ color: 'var(--ink-secondary)' }}>
                  {dbStats.holeResults}
                </div>
                <div className="type-caption">Hole Results</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div className="type-display-sm" style={{ color: 'var(--ink-secondary)' }}>
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
          <div className="card" style={{ padding: 'var(--space-4)' }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 'var(--space-4)',
              }}
            >
              <div style={{ textAlign: 'center' }}>
                <div className="type-display-sm" style={{ color: 'var(--masters)' }}>
                  {syncMetrics.total}
                </div>
                <div className="type-caption">Queue Depth</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div
                  className="type-display-sm"
                  style={{ color: syncMetrics.failed > 0 ? '#dc2626' : 'var(--ink-secondary)' }}
                >
                  {syncMetrics.failed}
                </div>
                <div className="type-caption">Failed Items</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div className="type-display-sm" style={{ color: 'var(--ink-secondary)' }}>
                  {syncMetrics.pending}
                </div>
                <div className="type-caption">Pending Items</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div className="type-display-sm" style={{ color: 'var(--ink-secondary)' }}>
                  {syncMetrics.oldestPending
                    ? Math.max(1, Math.round((Date.now() - syncMetrics.oldestPending) / 60000))
                    : 0}
                </div>
                <div className="type-caption">Oldest Pending (min)</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div className="type-display-sm" style={{ color: 'var(--ink-secondary)' }}>
                  {syncMetrics.averageRetry}
                </div>
                <div className="type-caption">Avg Retry Count</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div className="type-display-sm" style={{ color: 'var(--ink-secondary)' }}>
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
          <div className="card" style={{ padding: 'var(--space-4)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <button
                onClick={scanForOrphans}
                className="match-row"
                style={{ width: '100%', justifyContent: 'flex-start' }}
              >
                <Database size={18} style={{ color: 'var(--masters)' }} />
                <div style={{ flex: 1, textAlign: 'left' }}>
                  <p style={{ fontWeight: 500 }}>Scan for Orphaned Data</p>
                  <p className="type-meta">Find records without parent references</p>
                </div>
              </button>

              {orphanStats && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  style={{
                    background: 'var(--surface-elevated)',
                    borderRadius: 'var(--radius-md)',
                    padding: 'var(--space-3)',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span className="type-caption">Orphaned Matches:</span>
                      <span className={orphanStats.orphanedMatches > 0 ? 'text-red-600' : ''}>
                        {orphanStats.orphanedMatches}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span className="type-caption">Orphaned Hole Results:</span>
                      <span className={orphanStats.orphanedHoleResults > 0 ? 'text-red-600' : ''}>
                        {orphanStats.orphanedHoleResults}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
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
                        className="btn-premium mt-2"
                        style={{
                          background: '#dc2626',
                          padding: 'var(--space-2) var(--space-3)',
                          opacity: isCleaningOrphans ? 0.6 : 1,
                        }}
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <AnimatePresence mode="popLayout">
              {allTrips.map((trip) => (
                <motion.div
                  key={trip.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95, height: 0 }}
                  className="card"
                  style={{
                    padding: 'var(--space-4)',
                    border: currentTrip?.id === trip.id ? '2px solid var(--masters)' : undefined,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)' }}>
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 'var(--space-2)',
                          marginBottom: '4px',
                        }}
                      >
                        <h3 className="type-title-sm">{trip.name}</h3>
                        {currentTrip?.id === trip.id && (
                          <span
                            style={{
                              background: 'var(--masters)',
                              color: 'white',
                              fontSize: '10px',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontWeight: 600,
                            }}
                          >
                            ACTIVE
                          </span>
                        )}
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: 'var(--space-3)',
                          marginTop: 'var(--space-2)',
                        }}
                      >
                        {trip.location && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <MapPin size={12} style={{ color: 'var(--ink-tertiary)' }} />
                            <span className="type-caption">{trip.location}</span>
                          </div>
                        )}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Calendar size={12} style={{ color: 'var(--ink-tertiary)' }} />
                          <span className="type-caption">
                            {new Date(trip.startDate).toLocaleDateString()}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          {trip.isCaptainModeEnabled ? (
                            <CheckCircle size={12} style={{ color: 'var(--success)' }} />
                          ) : (
                            <XCircle size={12} style={{ color: 'var(--ink-tertiary)' }} />
                          )}
                          <span className="type-caption">
                            Captain Mode {trip.isCaptainModeEnabled ? 'On' : 'Off'}
                          </span>
                        </div>
                      </div>
                      <p className="type-meta mt-2" style={{ color: 'var(--ink-tertiary)' }}>
                        ID: {trip.id.slice(0, 8)}...
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteTrip(trip)}
                      disabled={deletingTripId === trip.id}
                      className="press-scale"
                      style={{
                        background: 'rgba(220, 38, 38, 0.1)',
                        border: 'none',
                        borderRadius: 'var(--radius-md)',
                        padding: 'var(--space-2)',
                        cursor: 'pointer',
                        opacity: deletingTripId === trip.id ? 0.5 : 1,
                      }}
                    >
                      {deletingTripId === trip.id ? (
                        <RefreshCcw
                          size={18}
                          style={{ color: '#dc2626' }}
                          className="animate-spin"
                        />
                      ) : (
                        <Trash2 size={18} style={{ color: '#dc2626' }} />
                      )}
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {allTrips.length === 0 && (
              <div
                className="card"
                style={{
                  padding: 'var(--space-6)',
                  textAlign: 'center',
                }}
              >
                <HardDrive
                  size={32}
                  style={{ color: 'var(--ink-tertiary)', margin: '0 auto 12px' }}
                />
                <p className="type-body" style={{ color: 'var(--ink-secondary)' }}>
                  No trips found
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Quick Actions */}
        <section className="section">
          <h2 className="type-overline mb-3">Quick Actions</h2>
          <div className="card" style={{ padding: 'var(--space-4)' }}>
            <Link href="/trip/new" className="match-row" style={{ textDecoration: 'none' }}>
              <Users size={18} style={{ color: 'var(--masters)' }} />
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: 500 }}>Create New Trip</p>
                <p className="type-meta">Start a new golf trip</p>
              </div>
              <ChevronLeft
                size={18}
                style={{ color: 'var(--ink-tertiary)', transform: 'rotate(180deg)' }}
              />
            </Link>
            <Link href="/settings/backup" className="match-row" style={{ textDecoration: 'none' }}>
              <Database size={18} style={{ color: 'var(--ink-secondary)' }} />
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: 500 }}>Backup & Export</p>
                <p className="type-meta">Save your data</p>
              </div>
              <ChevronLeft
                size={18}
                style={{ color: 'var(--ink-tertiary)', transform: 'rotate(180deg)' }}
              />
            </Link>
          </div>
        </section>
      </main>

      <BottomNav />
    </div>
  );
}
