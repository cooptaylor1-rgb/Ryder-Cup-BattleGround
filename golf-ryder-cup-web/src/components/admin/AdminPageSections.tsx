'use client';

import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import {
    AlertTriangle,
    Calendar,
    CheckCircle,
    ChevronLeft,
    Database,
    HardDrive,
    Lock,
    MapPin,
    RefreshCcw,
    Trash2,
    Users,
    XCircle,
    Zap,
} from 'lucide-react';
import { PageHeader } from '@/components/layout';
import { Button } from '@/components/ui/Button';
import type { Trip } from '@/lib/types/models';
import type { AdminDatabaseStats, AdminSyncMetrics, OrphanStats } from './adminData';

interface AdminLockedStateProps {
    onBack: () => void;
}

interface AdminOverviewSectionsProps {
    dbStats: AdminDatabaseStats;
    syncMetrics: AdminSyncMetrics;
    oldestPendingMinutes: number;
    orphanStats: OrphanStats | null;
    isCleaningOrphans: boolean;
    allTrips: Trip[];
    currentTripId: string | null;
    deletingTripId: string | null;
    onScanForOrphans: () => void;
    onCleanOrphans: () => void;
    onDeleteTrip: (trip: Trip) => void;
}

export function AdminLockedState({ onBack }: AdminLockedStateProps) {
    return (
        <div className="min-h-screen page-premium-enter texture-grain bg-[var(--canvas)]">
            <PageHeader
                title="Admin"
                subtitle="Admin Mode Required"
                icon={<Lock size={16} style={{ color: 'var(--color-accent)' }} />}
                onBack={onBack}
            />

            <main className="container-editorial flex items-center justify-center py-12">
                <div className="text-center" style={{ maxWidth: 520 }}>
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--surface-elevated)]">
                        <Lock size={32} className="text-[var(--ink-tertiary)]" />
                    </div>
                    <h2 className="mb-2 type-title-lg">Admin Mode Required</h2>
                    <p className="mb-6 type-body text-[var(--ink-secondary)]">
                        Enable Admin Mode from the More menu to access these features.
                    </p>
                    <Link
                        href="/more"
                        className="btn-premium px-[var(--space-5)] py-[var(--space-3)]"
                    >
                        Go to More
                    </Link>
                </div>
            </main>
        </div>
    );
}

export function AdminOverviewSections({
    dbStats,
    syncMetrics,
    oldestPendingMinutes,
    orphanStats,
    isCleaningOrphans,
    allTrips,
    currentTripId,
    deletingTripId,
    onScanForOrphans,
    onCleanOrphans,
    onDeleteTrip,
}: AdminOverviewSectionsProps) {
    const hasOrphans =
        (orphanStats?.orphanedMatches ?? 0) > 0 ||
        (orphanStats?.orphanedHoleResults ?? 0) > 0 ||
        (orphanStats?.orphanedTeamMembers ?? 0) > 0;

    return (
        <>
            <AdminWarningBanner />
            <AdminDatabaseStatsSection dbStats={dbStats} />
            <AdminSyncMetricsSection
                syncMetrics={syncMetrics}
                oldestPendingMinutes={oldestPendingMinutes}
            />
            <AdminCleanupSection
                orphanStats={orphanStats}
                isCleaningOrphans={isCleaningOrphans}
                hasOrphans={hasOrphans}
                onScanForOrphans={onScanForOrphans}
                onCleanOrphans={onCleanOrphans}
            />
            <AdminTripManagementSection
                trips={allTrips}
                currentTripId={currentTripId}
                deletingTripId={deletingTripId}
                onDeleteTrip={onDeleteTrip}
            />
            <AdminQuickActionsSection />
        </>
    );
}

function AdminWarningBanner() {
    return (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="section-sm">
            <div className="flex items-start gap-[var(--space-3)] rounded-[var(--radius-lg)] border border-[color:var(--error)]/20 bg-[color:var(--error)]/10 p-[var(--space-4)]">
                <AlertTriangle size={20} className="mt-[2px] shrink-0 text-[var(--error)]" />
                <div>
                    <p className="type-body font-semibold text-[var(--error)]">Admin Mode Active</p>
                    <p className="mt-[4px] type-caption text-[var(--ink-secondary)]">
                        Actions here can permanently delete data. Use with caution.
                    </p>
                </div>
            </div>
        </motion.div>
    );
}

function AdminDatabaseStatsSection({ dbStats }: { dbStats: AdminDatabaseStats }) {
    return (
        <section className="section">
            <h2 className="mb-3 type-overline">Database Statistics</h2>
            <div className="card p-[var(--space-4)]">
                <div className="grid grid-cols-3 gap-[var(--space-4)]">
                    {[
                        { label: 'Trips', value: dbStats.trips, accent: 'text-[var(--masters)]' },
                        { label: 'Players', value: dbStats.players, accent: 'text-[var(--masters)]' },
                        { label: 'Matches', value: dbStats.matches, accent: 'text-[var(--masters)]' },
                        { label: 'Sessions', value: dbStats.sessions, accent: 'text-[var(--ink-secondary)]' },
                        { label: 'Hole Results', value: dbStats.holeResults, accent: 'text-[var(--ink-secondary)]' },
                        { label: 'Teams', value: dbStats.teams, accent: 'text-[var(--ink-secondary)]' },
                    ].map((item) => (
                        <div key={item.label} className="text-center">
                            <div className={`type-display-sm ${item.accent}`}>{item.value}</div>
                            <div className="type-caption">{item.label}</div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

function AdminSyncMetricsSection({
    syncMetrics,
    oldestPendingMinutes,
}: {
    syncMetrics: AdminSyncMetrics;
    oldestPendingMinutes: number;
}) {
    return (
        <section className="section">
            <h2 className="mb-3 type-overline">Sync Reliability</h2>
            <div className="card p-[var(--space-4)]">
                <div className="grid grid-cols-3 gap-[var(--space-4)]">
                    <MetricCell label="Queue Depth" value={syncMetrics.total} accent="text-[var(--masters)]" />
                    <MetricCell
                        label="Failed Items"
                        value={syncMetrics.failed}
                        accent={syncMetrics.failed > 0 ? 'text-[var(--error)]' : 'text-[var(--ink-secondary)]'}
                    />
                    <MetricCell label="Pending Items" value={syncMetrics.pending} accent="text-[var(--ink-secondary)]" />
                    <MetricCell
                        label="Oldest Pending (min)"
                        value={oldestPendingMinutes}
                        accent="text-[var(--ink-secondary)]"
                    />
                    <MetricCell
                        label="Avg Retry Count"
                        value={syncMetrics.averageRetry}
                        accent="text-[var(--ink-secondary)]"
                    />
                    <MetricCell
                        label="Last Attempt"
                        value={
                            syncMetrics.lastAttempt
                                ? new Date(syncMetrics.lastAttempt).toLocaleTimeString([], {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                  })
                                : '—'
                        }
                        accent="text-[var(--ink-secondary)]"
                    />
                </div>
            </div>
        </section>
    );
}

function MetricCell({
    label,
    value,
    accent,
}: {
    label: string;
    value: string | number;
    accent: string;
}) {
    return (
        <div className="text-center">
            <div className={`type-display-sm ${accent}`}>{value}</div>
            <div className="type-caption">{label}</div>
        </div>
    );
}

function AdminCleanupSection({
    orphanStats,
    isCleaningOrphans,
    hasOrphans,
    onScanForOrphans,
    onCleanOrphans,
}: {
    orphanStats: OrphanStats | null;
    isCleaningOrphans: boolean;
    hasOrphans: boolean;
    onScanForOrphans: () => void;
    onCleanOrphans: () => void;
}) {
    return (
        <section className="section">
            <h2 className="mb-3 type-overline">Data Cleanup</h2>
            <div className="card p-[var(--space-4)]">
                <div className="flex flex-col gap-[var(--space-3)]">
                    <button onClick={onScanForOrphans} className="match-row w-full justify-start">
                        <Database size={18} className="text-[var(--masters)]" />
                        <div className="flex-1 text-left">
                            <p className="font-medium">Scan for Orphaned Data</p>
                            <p className="type-meta">Find records without parent references</p>
                        </div>
                    </button>

                    {orphanStats ? (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="rounded-[var(--radius-md)] bg-[var(--surface-elevated)] p-[var(--space-3)]"
                        >
                            <div className="flex flex-col gap-[var(--space-2)]">
                                <CleanupStatRow
                                    label="Orphaned Matches:"
                                    value={orphanStats.orphanedMatches}
                                />
                                <CleanupStatRow
                                    label="Orphaned Hole Results:"
                                    value={orphanStats.orphanedHoleResults}
                                />
                                <CleanupStatRow
                                    label="Orphaned Team Members:"
                                    value={orphanStats.orphanedTeamMembers}
                                />

                                {hasOrphans ? (
                                    <button
                                        onClick={onCleanOrphans}
                                        disabled={isCleaningOrphans}
                                        className={`btn-premium mt-2 bg-[var(--error)] px-[var(--space-3)] py-[var(--space-2)] text-[var(--canvas)] ${isCleaningOrphans ? 'opacity-60' : ''}`}
                                    >
                                        <Zap size={14} />
                                        {isCleaningOrphans ? 'Cleaning...' : 'Clean Orphaned Data'}
                                    </button>
                                ) : null}
                            </div>
                        </motion.div>
                    ) : null}
                </div>
            </div>
        </section>
    );
}

function CleanupStatRow({ label, value }: { label: string; value: number }) {
    return (
        <div className="flex justify-between">
            <span className="type-caption">{label}</span>
            <span className={value > 0 ? 'text-[var(--error)]' : ''}>{value}</span>
        </div>
    );
}

function AdminTripManagementSection({
    trips,
    currentTripId,
    deletingTripId,
    onDeleteTrip,
}: {
    trips: Trip[];
    currentTripId: string | null;
    deletingTripId: string | null;
    onDeleteTrip: (trip: Trip) => void;
}) {
    return (
        <section className="section">
            <h2 className="mb-3 type-overline">All Trips ({trips.length})</h2>
            <div className="flex flex-col gap-[var(--space-3)]">
                <AnimatePresence mode="popLayout">
                    {trips.map((trip) => (
                        <motion.div
                            key={trip.id}
                            layout
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95, height: 0 }}
                            className={`card p-[var(--space-4)] ${currentTripId === trip.id ? 'border-2 border-[var(--masters)]' : ''}`}
                        >
                            <div className="flex items-start gap-[var(--space-3)]">
                                <div className="flex-1">
                                    <div className="mb-[4px] flex items-center gap-[var(--space-2)]">
                                        <h3 className="type-title-sm">{trip.name}</h3>
                                        {currentTripId === trip.id ? (
                                            <span className="rounded-[4px] bg-[var(--masters)] px-[6px] py-[2px] text-[10px] font-semibold text-[var(--canvas)]">
                                                ACTIVE
                                            </span>
                                        ) : null}
                                    </div>
                                    <div className="mt-[var(--space-2)] flex flex-wrap gap-[var(--space-3)]">
                                        {trip.location ? (
                                            <div className="flex items-center gap-1">
                                                <MapPin size={12} className="text-[var(--ink-tertiary)]" />
                                                <span className="type-caption">{trip.location}</span>
                                            </div>
                                        ) : null}
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
                                    <p className="mt-2 type-meta text-[var(--ink-tertiary)]">
                                        ID: {trip.id.slice(0, 8)}...
                                    </p>
                                </div>
                                <button
                                    onClick={() => onDeleteTrip(trip)}
                                    disabled={deletingTripId === trip.id}
                                    className={`press-scale cursor-pointer rounded-[var(--radius-md)] border-none bg-[color:var(--error)]/10 p-[var(--space-2)] ${deletingTripId === trip.id ? 'opacity-50' : ''}`}
                                >
                                    {deletingTripId === trip.id ? (
                                        <RefreshCcw size={18} className="animate-spin text-[var(--error)]" />
                                    ) : (
                                        <Trash2 size={18} className="text-[var(--error)]" />
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>

                {trips.length === 0 ? (
                    <div className="card p-[var(--space-6)] text-center">
                        <HardDrive size={32} className="mx-auto mb-3 text-[var(--ink-tertiary)]" />
                        <p className="type-body text-[var(--ink-secondary)]">No trips found</p>
                    </div>
                ) : null}
            </div>
        </section>
    );
}

function AdminQuickActionsSection() {
    return (
        <section className="section">
            <h2 className="mb-3 type-overline">Quick Actions</h2>
            <div className="card p-[var(--space-4)]">
                <Link href="/trip/new" className="match-row no-underline">
                    <Users size={18} className="text-[var(--masters)]" />
                    <div className="flex-1">
                        <p className="font-medium">Create New Trip</p>
                        <p className="type-meta">Start a new golf trip</p>
                    </div>
                    <ChevronLeft size={18} className="rotate-180 text-[var(--ink-tertiary)]" />
                </Link>
                <Link href="/settings/backup" className="match-row no-underline">
                    <Database size={18} className="text-[var(--ink-secondary)]" />
                    <div className="flex-1">
                        <p className="font-medium">Backup & Export</p>
                        <p className="type-meta">Save your data</p>
                    </div>
                    <ChevronLeft size={18} className="rotate-180 text-[var(--ink-tertiary)]" />
                </Link>
            </div>
        </section>
    );
}
