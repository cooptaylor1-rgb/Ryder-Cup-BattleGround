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

                // Reload to refresh trips list
                window.location.reload();
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
        return <PageLoadingSkeleton />;
    }

    if (loadError) {
        return (
            <div
                className="min-h-screen pb-nav page-premium-enter texture-grain"
                style={{ background: 'var(--canvas)' }}
            >
                <PageHeader
                    title="Backup & Restore"
                    subtitle="Trip data management"
                    icon={<HardDrive className="w-4 h-4 text-white" />}
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
        <div
            className="min-h-screen pb-nav page-premium-enter texture-grain"
            style={{ background: 'var(--canvas)' }}
        >
            <PageHeader
                title="Backup & Restore"
                subtitle="Export and import trip data"
                icon={<HardDrive className="w-4 h-4 text-white" />}
                onBack={() => router.push('/settings')}
            />

            <main className="container-editorial py-6 space-y-6 pb-8">
                {/* Export Section */}
                <section className="bg-[#141414] rounded-2xl border border-[#2A2A2A] overflow-hidden">
                    <div className="p-4 border-b border-[#2A2A2A]">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-[#004225]/20 flex items-center justify-center">
                                <Download className="w-5 h-5 text-[#4CAF50]" />
                            </div>
                            <div>
                                <h2 className="font-semibold text-white">Export Trip</h2>
                                <p className="text-sm text-[#707070]">Download trip data as JSON file</p>
                            </div>
                        </div>
                    </div>

                    {/* Success message */}
                    {exportSuccess && (
                        <div className="mx-4 mt-4 p-3 bg-[#4CAF50]/10 border border-[#4CAF50]/30 rounded-xl flex items-center gap-2">
                            <CheckCircle className="w-5 h-5 text-[#4CAF50]" />
                            <span className="text-[#4CAF50] text-sm">{exportSuccess}</span>
                        </div>
                    )}

                    {/* Trip list */}
                    <div className="p-4 space-y-2">
                        {trips.length === 0 ? (
                            <div className="py-8">
                                <EmptyStatePremium
                                    illustration="trophy"
                                    title="No trips yet"
                                    description="Create your first tournament to enable backups and sharing."
                                    action={{
                                        label: 'Create a Trip',
                                        onClick: () => router.push('/trip/new'),
                                    }}
                                    secondaryAction={{
                                        label: 'Go Home',
                                        onClick: () => router.push('/'),
                                    }}
                                    variant="compact"
                                />
                            </div>
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

                {/* Import Section */}
                <section className="bg-[#141414] rounded-2xl border border-[#2A2A2A] overflow-hidden">
                    <div className="p-4 border-b border-[#2A2A2A]">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-[#64B5F6]/20 flex items-center justify-center">
                                <Upload className="w-5 h-5 text-[#64B5F6]" />
                            </div>
                            <div>
                                <h2 className="font-semibold text-white">Import Trip</h2>
                                <p className="text-sm text-[#707070]">Restore from backup file</p>
                            </div>
                        </div>
                    </div>

                    <div className="p-4">
                        {/* Hidden file input */}
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".json"
                            onChange={handleFileSelect}
                            className="hidden"
                        />

                        {/* Import preview */}
                        {importPreview && (
                            <div className="mb-4">
                                {importPreview.valid ? (
                                    <div className="p-4 bg-[#4CAF50]/10 border border-[#4CAF50]/30 rounded-xl">
                                        <div className="flex items-start gap-3 mb-3">
                                            <FileJson className="w-5 h-5 text-[#4CAF50] mt-0.5" />
                                            <div>
                                                <h4 className="font-medium text-white">{importPreview.tripName}</h4>
                                                <p className="text-sm text-[#A0A0A0]">Ready to import</p>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-3 gap-2 text-center mb-4">
                                            <div className="p-2 bg-[#1A1A1A] rounded-lg">
                                                <p className="text-lg font-bold text-white">{importPreview.stats?.players}</p>
                                                <p className="text-xs text-[#707070]">Players</p>
                                            </div>
                                            <div className="p-2 bg-[#1A1A1A] rounded-lg">
                                                <p className="text-lg font-bold text-white">{importPreview.stats?.sessions}</p>
                                                <p className="text-xs text-[#707070]">Sessions</p>
                                            </div>
                                            <div className="p-2 bg-[#1A1A1A] rounded-lg">
                                                <p className="text-lg font-bold text-white">{importPreview.stats?.matches}</p>
                                                <p className="text-xs text-[#707070]">Matches</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={handleConfirmImport}
                                                disabled={isImporting}
                                                className="flex-1 py-2 bg-[#4CAF50] text-white rounded-lg font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                                            >
                                                {isImporting ? (
                                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    <CheckCircle className="w-4 h-4" />
                                                )}
                                                {isImporting ? 'Importing...' : 'Confirm Import'}
                                            </button>
                                            <button
                                                onClick={handleCancelImport}
                                                className="px-4 py-2 bg-[#2A2A2A] text-[#A0A0A0] rounded-lg"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="p-4 bg-[#EF5350]/10 border border-[#EF5350]/30 rounded-xl">
                                        <div className="flex items-start gap-3">
                                            <XCircle className="w-5 h-5 text-[#EF5350] mt-0.5" />
                                            <div>
                                                <h4 className="font-medium text-white">Invalid File</h4>
                                                <ul className="mt-2 space-y-1">
                                                    {importPreview.errors.map((error, i) => (
                                                        <li key={i} className="text-sm text-[#EF5350]">• {error}</li>
                                                    ))}
                                                </ul>
                                                <button
                                                    onClick={handleCancelImport}
                                                    className="mt-3 text-sm text-[#A0A0A0] underline"
                                                >
                                                    Try another file
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Import result */}
                        {importResult && (
                            <div className={`mb-4 p-4 rounded-xl border ${importResult.success
                                ? 'bg-[#4CAF50]/10 border-[#4CAF50]/30'
                                : 'bg-[#EF5350]/10 border-[#EF5350]/30'
                                }`}>
                                <div className="flex items-start gap-3">
                                    {importResult.success ? (
                                        <CheckCircle className="w-5 h-5 text-[#4CAF50]" />
                                    ) : (
                                        <XCircle className="w-5 h-5 text-[#EF5350]" />
                                    )}
                                    <div>
                                        <p className={importResult.success ? 'text-[#4CAF50]' : 'text-[#EF5350]'}>
                                            {importResult.message}
                                        </p>
                                        {importResult.tripId && (
                                            <button
                                                onClick={() => router.push(`/trip/${importResult.tripId}/settings`)}
                                                className="mt-2 text-sm text-[#64B5F6] flex items-center gap-1"
                                            >
                                                <ExternalLink className="w-3 h-3" />
                                                Open Trip
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Drop zone */}
                        {!importPreview && !importResult && (
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="w-full p-8 border-2 border-dashed border-[#3A3A3A] rounded-xl hover:border-[#64B5F6] hover:bg-[#64B5F6]/5 transition-colors"
                            >
                                <div className="text-center">
                                    <Upload className="w-10 h-10 text-[#505050] mx-auto mb-3" />
                                    <p className="text-white font-medium mb-1">Click to select file</p>
                                    <p className="text-sm text-[#707070]">JSON backup files only</p>
                                </div>
                            </button>
                        )}
                    </div>
                </section>

                {/* Info Box */}
                <div className="p-4 bg-[#1A1A1A] rounded-xl border border-[#2A2A2A]">
                    <div className="flex items-start gap-3">
                        <HardDrive className="w-5 h-5 text-[#707070] mt-0.5" />
                        <div className="text-sm text-[#707070]">
                            <p className="mb-2">
                                <strong className="text-[#A0A0A0]">About Backups:</strong>
                            </p>
                            <ul className="space-y-1">
                                <li>• Exports include all trip data: players, teams, sessions, matches, and scores</li>
                                <li>• Imported trips create new copies with fresh IDs</li>
                                <li>• Store backups securely - they contain all your tournament data</li>
                            </ul>
                        </div>
                    </div>
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
            className={`p-4 rounded-xl border transition-colors cursor-pointer ${isSelected
                ? 'border-[#004225] bg-[#004225]/10'
                : 'border-[#2A2A2A] hover:border-[#3A3A3A]'
                }`}
            onClick={onSelect}
        >
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <h3 className="font-medium text-white mb-1">{trip.name}</h3>
                    <div className="flex items-center gap-3 text-xs text-[#707070]">
                        <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDate(trip.startDate)}
                        </span>
                        <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {trip.playerCount} players
                        </span>
                        <span className="flex items-center gap-1">
                            <Trophy className="w-3 h-3" />
                            {trip.matchCount} matches
                        </span>
                    </div>
                </div>

                {isSelected && (
                    <div className="flex items-center gap-2">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onShare();
                            }}
                            className="p-2 hover:bg-[#282828] rounded-lg transition-colors"
                            title="Copy Summary"
                        >
                            <Copy className="w-4 h-4 text-[#A0A0A0]" />
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onExport();
                            }}
                            disabled={isExporting}
                            className="px-3 py-1.5 bg-[#004225] text-white rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-[#2E7D32] transition-colors disabled:opacity-50"
                        >
                            {isExporting ? (
                                <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                                <Download className="w-4 h-4" />
                            )}
                            Export
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
