'use client';

/**
 * Trip Backup & Restore Page (Production Quality)
 *
 * Dedicated page for trip data management:
 * - Export current trip to JSON
 * - Import trips from files
 * - View export history
 * - Validate before import
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
    Download,
    Upload,
    FileJson,
    CheckCircle,
    XCircle,
    HardDrive,
    Users,
    Trophy,
    Calendar,
    RefreshCw,
    Copy,
    ExternalLink,
} from 'lucide-react';
import { useTripStore } from '@/lib/stores';
import { tripLogger } from '@/lib/utils/logger';
import { cn } from '@/lib/utils';
import { db } from '@/lib/db';
import { BottomNav, PageHeader } from '@/components/layout';
import { EmptyStatePremium, ErrorEmpty, PageLoadingSkeleton } from '@/components/ui';
import {
    exportTripToFile,
    importTripFromFile,
    validateExport,
    shareTripSummary,
} from '@/lib/services/exportImportService';

// ============================================
// TYPES
// ============================================

interface TripSummary {
    id: string;
    name: string;
    startDate: string;
    playerCount: number;
    sessionCount: number;
    matchCount: number;
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function BackupRestorePage() {
    const router = useRouter();
    const { currentTrip } = useTripStore();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [trips, setTrips] = useState<TripSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [selectedTripId, setSelectedTripId] = useState<string | null>(null);

    // Export state
    const [isExporting, setIsExporting] = useState(false);
    const [exportSuccess, setExportSuccess] = useState<string | null>(null);

    // Import state
    const [isImporting, setIsImporting] = useState(false);
    const [importPreview, setImportPreview] = useState<{
        valid: boolean;
        tripName?: string;
        errors: string[];
        stats?: { players: number; sessions: number; matches: number };
    } | null>(null);
    const [pendingFile, setPendingFile] = useState<File | null>(null);
    const [importResult, setImportResult] = useState<{
        success: boolean;
        message: string;
        tripId?: string;
    } | null>(null);

    // ============================================
    // LOAD TRIPS
    // ============================================

    const loadTrips = useCallback(async () => {
        setLoading(true);
        setLoadError(null);

        try {
            const allTrips = await db.trips.toArray();
            const summaries: TripSummary[] = [];

            for (const trip of allTrips) {
                const sessions = await db.sessions.where('tripId').equals(trip.id).count();
                const sessionIds = (await db.sessions.where('tripId').equals(trip.id).toArray()).map(
                    (s) => s.id
                );
                const matches =
                    sessionIds.length > 0
                        ? await db.matches.where('sessionId').anyOf(sessionIds).count()
                        : 0;
                const teams = await db.teams.where('tripId').equals(trip.id).toArray();
                const teamIds = teams.map((t) => t.id);
                const playerCount =
                    teamIds.length > 0
                        ? await db.teamMembers.where('teamId').anyOf(teamIds).count()
                        : 0;

                summaries.push({
                    id: trip.id,
                    name: trip.name,
                    startDate: trip.startDate,
                    playerCount,
                    sessionCount: sessions,
                    matchCount: matches,
                });
            }

            // Sort by date descending
            summaries.sort(
                (a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
            );
            setTrips(summaries);

            // Auto-select current trip
            if (currentTrip) {
                setSelectedTripId(currentTrip.id);
            } else if (summaries.length > 0) {
                setSelectedTripId(summaries[0].id);
            } else {
                setSelectedTripId(null);
            }
        } catch (error) {
            tripLogger.error('Failed to load trips for backup/restore:', error);
            setLoadError("We couldn't load trips right now.");
        } finally {
            setLoading(false);
        }
    }, [currentTrip]);

    useEffect(() => {
        void loadTrips();
    }, [loadTrips]);

    // ============================================
    // EXPORT HANDLERS
    // ============================================

    const handleExport = async (tripId: string) => {
        setIsExporting(true);
        setExportSuccess(null);

        try {
            await exportTripToFile(tripId);
            const trip = trips.find((t) => t.id === tripId);
            setExportSuccess(`${trip?.name || 'Trip'} exported successfully!`);

            // Clear success message after 3 seconds
            setTimeout(() => setExportSuccess(null), 3000);
        } catch (error) {
            tripLogger.error('Export failed:', error);
        } finally {
            setIsExporting(false);
        }
    };

    const handleShareSummary = async (tripId: string) => {
        try {
            await shareTripSummary(tripId);
        } catch (error) {
            tripLogger.error('Share failed:', error);
        }
    };

    // ============================================
    // IMPORT HANDLERS
    // ============================================

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setImportPreview(null);
        setImportResult(null);
        setPendingFile(file);

        try {
            const text = await file.text();
            const data = JSON.parse(text);
            const validation = validateExport(data);

            if (validation.valid) {
                setImportPreview({
                    valid: true,
                    tripName: data.trip?.name,
                    errors: [],
                    stats: {
                        players: data.players?.length || 0,
                        sessions: data.sessions?.length || 0,
                        matches: data.matches?.length || 0,
                    },
                });
            } else {
                setImportPreview({
                    valid: false,
                    errors: validation.errors,
                });
            }
        } catch {
            setImportPreview({
                valid: false,
                errors: ['Invalid JSON file format'],
            });
        }

        // Reset file input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleConfirmImport = async () => {
        if (!pendingFile || !importPreview?.valid) return;

        setIsImporting(true);

        try {
            const result = await importTripFromFile(pendingFile);
            if (result.success) {
                setImportResult({
                    success: true,
                    message: `Successfully imported "${result.tripName}"`,
                    tripId: result.tripId,
                });

                // Refresh trips list (avoid a full page reload so we can keep the UI responsive)
                await loadTrips();
                if (result.tripId) {
                    setSelectedTripId(result.tripId);
                }
            } else {
                setImportResult({
                    success: false,
                    message: 'Import failed. Please check the file and try again.',
                });
            }
        } catch {
            setImportResult({
                success: false,
                message: 'An error occurred during import.',
            });
        } finally {
            setIsImporting(false);
            setPendingFile(null);
            setImportPreview(null);
        }
    };

    const handleCancelImport = () => {
        setPendingFile(null);
        setImportPreview(null);
        setImportResult(null);
    };

    // ============================================
    // RENDER
    // ============================================

    if (loading) {
        return <PageLoadingSkeleton title="Backup & Restore" variant="list" />;
    }

    if (loadError) {
        return (
            <div className="min-h-screen pb-nav page-premium-enter texture-grain bg-[var(--canvas)]">
                <PageHeader
                    title="Backup & Restore"
                    subtitle="Trip data management"
                    icon={<HardDrive size={16} className="text-[var(--color-accent)]" />}
                    onBack={() => router.push('/settings')}
                />

                <main className="container-editorial py-6">
                    <ErrorEmpty message={loadError} onRetry={loadTrips} />
                </main>

                <BottomNav />
            </div>
        );
    }

    return (
        <div className="min-h-screen pb-nav page-premium-enter texture-grain bg-[var(--canvas)]">
            <PageHeader
                title="Backup & Restore"
                subtitle="Export and import trip data"
                icon={<HardDrive size={16} className="text-[var(--color-accent)]" />}
                onBack={() => router.push('/settings')}
            />

            <main className="container-editorial pb-8">
                <div className="space-y-6">
                    {/* Export */}
                    <section className="card p-[var(--space-5)]">
                        <div className="flex items-start gap-3">
                            <div className="w-10 h-10 shrink-0 rounded-xl flex items-center justify-center bg-[linear-gradient(135deg,var(--masters)_0%,var(--masters-deep)_100%)] shadow-[var(--shadow-glow-green)]">
                                <Download className="w-5 h-5 text-[var(--color-accent)]" />
                            </div>
                            <div className="min-w-0">
                                <p className="type-title-sm">Export trip</p>
                                <p className="type-caption">Download trip data as a JSON backup file.</p>
                            </div>
                        </div>

                        {exportSuccess ? (
                            <div
                                className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-500/35 bg-emerald-500/10 px-4 py-3 text-[var(--ink)]"
                                role="status"
                                aria-live="polite"
                            >
                                <CheckCircle className="w-5 h-5 text-emerald-500" />
                                <span className="text-sm text-[var(--ink)]">{exportSuccess}</span>
                            </div>
                        ) : null}

                        <div className="mt-5 space-y-2">
                            {trips.length === 0 ? (
                                <EmptyStatePremium
                                    illustration="trophy"
                                    title="No trips yet"
                                    description="Create your first tournament to enable backups and sharing."
                                    action={{ label: 'Create a Trip', onClick: () => router.push('/trip/new') }}
                                    secondaryAction={{ label: 'Go Home', onClick: () => router.push('/') }}
                                    variant="compact"
                                />
                            ) : (
                                trips.map((trip) => (
                                    <TripCard
                                        key={trip.id}
                                        trip={trip}
                                        isSelected={selectedTripId === trip.id}
                                        onSelect={() => setSelectedTripId(trip.id)}
                                        onExport={() => handleExport(trip.id)}
                                        onShare={() => handleShareSummary(trip.id)}
                                        isExporting={isExporting && selectedTripId === trip.id}
                                    />
                                ))
                            )}
                        </div>
                    </section>

                    {/* Import */}
                    <section className="card p-[var(--space-5)]">
                        <div className="flex items-start gap-3">
                            <div className="w-10 h-10 shrink-0 rounded-xl flex items-center justify-center border border-blue-400/25 bg-blue-400/15">
                                <Upload className="w-5 h-5 text-blue-400" />
                            </div>
                            <div className="min-w-0">
                                <p className="type-title-sm">Import trip</p>
                                <p className="type-caption">Restore from a JSON backup file.</p>
                            </div>
                        </div>

                        {/* Hidden file input */}
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".json"
                            onChange={handleFileSelect}
                            className="hidden"
                        />

                        <div className="mt-5">
                            {importPreview ? (
                                importPreview.valid ? (
                                    <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-4">
                                        <div className="flex items-start gap-3">
                                            <FileJson className="w-5 h-5 mt-0.5 text-emerald-500" />
                                            <div className="min-w-0">
                                                <p className="font-medium text-[var(--ink)]">{importPreview.tripName}</p>
                                                <p className="text-sm text-[var(--ink-tertiary)]">Ready to import</p>
                                            </div>
                                        </div>

                                        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                                            {(
                                                [
                                                    { label: 'Players', value: importPreview.stats?.players ?? 0 },
                                                    { label: 'Sessions', value: importPreview.stats?.sessions ?? 0 },
                                                    { label: 'Matches', value: importPreview.stats?.matches ?? 0 },
                                                ] as const
                                            ).map((item) => (
                                                <div
                                                    key={item.label}
                                                    className="rounded-lg border border-[var(--rule)] bg-[var(--surface)] px-2 py-2"
                                                >
                                                    <p className="text-lg font-semibold text-[var(--ink)]">{item.value}</p>
                                                    <p className="text-xs text-[var(--ink-tertiary)]">{item.label}</p>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="mt-4 flex gap-2">
                                            <button
                                                onClick={handleConfirmImport}
                                                disabled={isImporting}
                                                className="flex-1 btn-primary inline-flex items-center justify-center gap-2"
                                            >
                                                {isImporting ? (
                                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    <CheckCircle className="w-4 h-4" />
                                                )}
                                                {isImporting ? 'Importing…' : 'Confirm import'}
                                            </button>
                                            <button onClick={handleCancelImport} className="btn-secondary">
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="rounded-xl border border-red-500/25 bg-red-500/10 p-4">
                                        <div className="flex items-start gap-3">
                                            <XCircle className="w-5 h-5 mt-0.5 text-red-500" />
                                            <div className="min-w-0">
                                                <p className="font-medium text-[var(--ink)]">Invalid file</p>
                                                <ul className="mt-2 space-y-1">
                                                    {importPreview.errors.map((errorText, i) => (
                                                        <li key={i} className="text-sm text-red-500">
                                                            • {errorText}
                                                        </li>
                                                    ))}
                                                </ul>
                                                <button
                                                    onClick={handleCancelImport}
                                                    className="mt-3 text-sm underline text-[var(--ink-tertiary)]"
                                                >
                                                    Try another file
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )
                            ) : importResult ? (
                                <div
                                    className={cn(
                                        'rounded-xl border p-4',
                                        importResult.success
                                            ? 'border-emerald-500/25 bg-emerald-500/10'
                                            : 'border-red-500/25 bg-red-500/10'
                                    )}
                                >
                                    <div className="flex items-start gap-3">
                                        {importResult.success ? (
                                            <CheckCircle className="w-5 h-5 text-emerald-500" />
                                        ) : (
                                            <XCircle className="w-5 h-5 text-red-500" />
                                        )}
                                        <div>
                                            <p className="text-[var(--ink)]">{importResult.message}</p>
                                            {importResult.tripId ? (
                                                <button
                                                    onClick={() => router.push(`/trip/${importResult.tripId}/settings`)}
                                                    className="mt-2 text-sm inline-flex items-center gap-1 text-[var(--masters)]"
                                                >
                                                    <ExternalLink className="w-3 h-3" />
                                                    Open trip
                                                </button>
                                            ) : null}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="w-full rounded-xl border-2 border-dashed border-[var(--rule)] bg-[var(--surface)] p-[var(--space-6)] transition-colors"
                                >
                                    <div className="text-center">
                                        <Upload className="w-10 h-10 mx-auto mb-3 text-[var(--ink-tertiary)]" />
                                        <p className="font-medium text-[var(--ink)]">Select a JSON file</p>
                                        <p className="text-sm text-[var(--ink-tertiary)]">Backup files only</p>
                                    </div>
                                </button>
                            )}
                        </div>
                    </section>

                    {/* Info */}
                    <section className="card p-[var(--space-5)]">
                        <div className="flex items-start gap-3">
                            <HardDrive className="w-5 h-5 mt-0.5 text-[var(--ink-tertiary)]" />
                            <div className="text-sm text-[var(--ink-secondary)]">
                                <p className="font-medium text-[var(--ink)]">About backups</p>
                                <ul className="mt-2 space-y-1 text-[var(--ink-tertiary)]">
                                    <li>• Exports include players, teams, sessions, matches, and scores</li>
                                    <li>• Imported trips create new copies with fresh IDs</li>
                                    <li>• Store backups securely — they contain your tournament data</li>
                                </ul>
                            </div>
                        </div>
                    </section>
                </div>
            </main>

            <BottomNav />
        </div>
    );
}

// ============================================
// SUB-COMPONENTS
// ============================================

function TripCard({
    trip,
    isSelected,
    onSelect,
    onExport,
    onShare,
    isExporting,
}: {
    trip: TripSummary;
    isSelected: boolean;
    onSelect: () => void;
    onExport: () => void;
    onShare: () => void;
    isExporting: boolean;
}) {
    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    };

    return (
        <div
            className={cn(
                'cursor-pointer rounded-xl border p-[var(--space-4)] transition-colors',
                isSelected
                    ? 'border-[var(--masters)] bg-[var(--masters-subtle)]'
                    : 'border-[var(--rule)] bg-[var(--surface)]'
            )}
            onClick={onSelect}
        >
            <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                    <p className="font-medium truncate text-[var(--ink)]">{trip.name}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--ink-tertiary)]">
                        <span className="inline-flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDate(trip.startDate)}
                        </span>
                        <span className="inline-flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {trip.playerCount} players
                        </span>
                        <span className="inline-flex items-center gap-1">
                            <Trophy className="w-3 h-3" />
                            {trip.matchCount} matches
                        </span>
                    </div>
                </div>

                {isSelected ? (
                    <div className="flex items-center gap-2 shrink-0">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onShare();
                            }}
                            className="btn-secondary p-[var(--space-2)]"
                            title="Copy summary"
                        >
                            <Copy className="w-4 h-4" />
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onExport();
                            }}
                            disabled={isExporting}
                            className="btn-primary inline-flex items-center gap-2"
                        >
                            {isExporting ? (
                                <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                                <Download className="w-4 h-4" />
                            )}
                            Export
                        </button>
                    </div>
                ) : null}
            </div>
        </div>
    );
}
