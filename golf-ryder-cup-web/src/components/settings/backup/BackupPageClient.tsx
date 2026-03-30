'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { HardDrive } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/layout';
import { ErrorEmpty, PageLoadingSkeleton } from '@/components/ui';
import { useTripStore } from '@/lib/stores';
import { useShallow } from 'zustand/shallow';
import {
    exportTripToFile,
    importTripFromFile,
    shareTripSummary,
    validateExport,
} from '@/lib/services/exportImportService';
import { tripLogger } from '@/lib/utils/logger';
import {
    BackupExportSection,
    BackupImportSection,
    BackupInfoSection,
    type ImportPreviewState,
    type ImportResultState,
} from './BackupPageSections';
import { loadTripSummaries } from './backupPageData';

export default function BackupPageClient() {
    const router = useRouter();
    const { currentTrip } = useTripStore(useShallow(s => ({ currentTrip: s.currentTrip })));
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [trips, setTrips] = useState<Awaited<ReturnType<typeof loadTripSummaries>>['trips']>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
    const [isExporting, setIsExporting] = useState(false);
    const [exportSuccess, setExportSuccess] = useState<string | null>(null);
    const [isImporting, setIsImporting] = useState(false);
    const [importPreview, setImportPreview] = useState<ImportPreviewState | null>(null);
    const [pendingFile, setPendingFile] = useState<File | null>(null);
    const [importResult, setImportResult] = useState<ImportResultState | null>(null);

    const loadTrips = useCallback(async () => {
        setLoading(true);
        setLoadError(null);

        try {
            const { trips: summaries, selectedTripId: initialSelectedTripId } =
                await loadTripSummaries(currentTrip?.id);
            setTrips(summaries);
            setSelectedTripId(initialSelectedTripId);
        } catch (error) {
            tripLogger.error('Failed to load trips for backup/restore:', error);
            setLoadError("We couldn't load trips right now.");
        } finally {
            setLoading(false);
        }
    }, [currentTrip?.id]);

    useEffect(() => {
        void loadTrips();
    }, [loadTrips]);

    const handleExport = async (tripId: string) => {
        setIsExporting(true);
        setExportSuccess(null);

        try {
            await exportTripToFile(tripId);
            const trip = trips.find((item) => item.id === tripId);
            setExportSuccess(`${trip?.name || 'Trip'} exported successfully!`);
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

    const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setImportPreview(null);
        setImportResult(null);
        setPendingFile(file);

        try {
            const data = JSON.parse(await file.text());
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

    if (loading) {
        return <PageLoadingSkeleton title="Backup & Restore" variant="list" />;
    }

    if (loadError) {
        return (
            <div className="min-h-screen page-premium-enter texture-grain bg-[var(--canvas)]">
                <PageHeader
                    title="Backup & Restore"
                    subtitle="Trip data management"
                    icon={<HardDrive size={16} className="text-[var(--color-accent)]" />}
                    onBack={() => router.push('/settings')}
                />
                <main className="container-editorial py-6">
                    <ErrorEmpty message={loadError} onRetry={loadTrips} />
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-screen page-premium-enter texture-grain bg-[var(--canvas)]">
            <PageHeader
                title="Backup & Restore"
                subtitle="Export and import trip data"
                icon={<HardDrive size={16} className="text-[var(--color-accent)]" />}
                onBack={() => router.push('/settings')}
            />

            <main className="container-editorial pb-8">
                <div className="space-y-6">
                    <BackupExportSection
                        trips={trips}
                        selectedTripId={selectedTripId}
                        exportSuccess={exportSuccess}
                        isExporting={isExporting}
                        onCreateTrip={() => router.push('/trip/new')}
                        onGoHome={() => router.push('/')}
                        onSelectTrip={setSelectedTripId}
                        onExportTrip={handleExport}
                        onShareTrip={handleShareSummary}
                    />
                    <BackupImportSection
                        fileInputRef={fileInputRef}
                        importPreview={importPreview}
                        importResult={importResult}
                        isImporting={isImporting}
                        onFileSelect={handleFileSelect}
                        onConfirmImport={handleConfirmImport}
                        onCancelImport={handleCancelImport}
                        onOpenFilePicker={() => fileInputRef.current?.click()}
                        onOpenImportedTrip={(tripId) => router.push(`/trip/${tripId}/settings`)}
                    />
                    <BackupInfoSection />
                </div>
            </main>
        </div>
    );
}
