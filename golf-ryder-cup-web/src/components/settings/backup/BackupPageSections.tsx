'use client';

import {
    Calendar,
    CheckCircle,
    Copy,
    Download,
    ExternalLink,
    FileJson,
    HardDrive,
    RefreshCw,
    Trophy,
    Upload,
    Users,
    XCircle,
} from 'lucide-react';
import { EmptyStatePremium } from '@/components/ui';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import type { TripSummary } from './backupPageData';

export interface ImportPreviewState {
    valid: boolean;
    tripName?: string;
    errors: string[];
    stats?: { players: number; sessions: number; matches: number };
}

export interface ImportResultState {
    success: boolean;
    message: string;
    tripId?: string;
}

interface BackupExportSectionProps {
    trips: TripSummary[];
    selectedTripId: string | null;
    exportSuccess: string | null;
    isExporting: boolean;
    onCreateTrip: () => void;
    onGoHome: () => void;
    onSelectTrip: (tripId: string) => void;
    onExportTrip: (tripId: string) => void;
    onShareTrip: (tripId: string) => void;
}

interface BackupImportSectionProps {
    fileInputRef: React.RefObject<HTMLInputElement | null>;
    importPreview: ImportPreviewState | null;
    importResult: ImportResultState | null;
    isImporting: boolean;
    onFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
    onConfirmImport: () => void;
    onCancelImport: () => void;
    onOpenFilePicker: () => void;
    onOpenImportedTrip: (tripId: string) => void;
}

export function BackupExportSection({
    trips,
    selectedTripId,
    exportSuccess,
    isExporting,
    onCreateTrip,
    onGoHome,
    onSelectTrip,
    onExportTrip,
    onShareTrip,
}: BackupExportSectionProps) {
    return (
        <section className="card p-[var(--space-5)]">
            <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[linear-gradient(135deg,var(--masters)_0%,var(--masters-deep)_100%)] shadow-[var(--shadow-glow-green)]">
                    <Download className="h-5 w-5 text-[var(--color-accent)]" />
                </div>
                <div className="min-w-0">
                    <p className="type-title-sm">Export trip</p>
                    <p className="type-caption">Download trip data as a JSON backup file.</p>
                </div>
            </div>

            {exportSuccess ? (
                <div
                    className="mt-4 flex items-center gap-2 rounded-xl border border-[color:var(--success)]/35 bg-[color:var(--success)]/10 px-4 py-3 text-[var(--ink-primary)]"
                    role="status"
                    aria-live="polite"
                >
                    <CheckCircle className="h-5 w-5 text-[var(--success)]" />
                    <span className="text-sm text-[var(--ink-primary)]">{exportSuccess}</span>
                </div>
            ) : null}

            <div className="mt-5 space-y-2">
                {trips.length === 0 ? (
                    <EmptyStatePremium
                        illustration="trophy"
                        title="No trips yet"
                        description="Create your first tournament to enable backups and sharing."
                        action={{ label: 'Create a Trip', onClick: onCreateTrip }}
                        secondaryAction={{ label: 'Go Home', onClick: onGoHome }}
                        variant="compact"
                    />
                ) : (
                    trips.map((trip) => (
                        <TripCard
                            key={trip.id}
                            trip={trip}
                            isSelected={selectedTripId === trip.id}
                            onSelect={() => onSelectTrip(trip.id)}
                            onExport={() => onExportTrip(trip.id)}
                            onShare={() => onShareTrip(trip.id)}
                            isExporting={isExporting && selectedTripId === trip.id}
                        />
                    ))
                )}
            </div>
        </section>
    );
}

export function BackupImportSection({
    fileInputRef,
    importPreview,
    importResult,
    isImporting,
    onFileSelect,
    onConfirmImport,
    onCancelImport,
    onOpenFilePicker,
    onOpenImportedTrip,
}: BackupImportSectionProps) {
    return (
        <section className="card p-[var(--space-5)]">
            <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[color:var(--info)]/25 bg-[color:var(--info)]/15">
                    <Upload className="h-5 w-5 text-[var(--info)]" />
                </div>
                <div className="min-w-0">
                    <p className="type-title-sm">Import trip</p>
                    <p className="type-caption">Restore from a JSON backup file.</p>
                </div>
            </div>

            <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={onFileSelect}
                className="hidden"
            />

            <div className="mt-5">
                {importPreview ? (
                    importPreview.valid ? (
                        <div className="rounded-xl border border-[color:var(--success)]/25 bg-[color:var(--success)]/10 p-4">
                            <div className="flex items-start gap-3">
                                <FileJson className="mt-0.5 h-5 w-5 text-[var(--success)]" />
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
                                <Button
                                    variant="primary"
                                    onClick={onConfirmImport}
                                    disabled={isImporting}
                                    isLoading={isImporting}
                                    loadingText="Importing…"
                                    leftIcon={!isImporting ? <CheckCircle className="h-4 w-4" /> : undefined}
                                    className="flex-1"
                                >
                                    Confirm import
                                </Button>
                                <Button variant="secondary" onClick={onCancelImport}>
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="rounded-xl border border-[color:var(--error)]/25 bg-[color:var(--error)]/10 p-4">
                            <div className="flex items-start gap-3">
                                <XCircle className="mt-0.5 h-5 w-5 text-[var(--error)]" />
                                <div className="min-w-0">
                                    <p className="font-medium text-[var(--ink)]">Invalid file</p>
                                    <ul className="mt-2 space-y-1">
                                        {importPreview.errors.map((errorText, index) => (
                                            <li key={index} className="text-sm text-[var(--error)]">
                                                • {errorText}
                                            </li>
                                        ))}
                                    </ul>
                                    <button
                                        onClick={onCancelImport}
                                        className="mt-3 text-sm text-[var(--ink-tertiary)] underline"
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
                                ? 'border-[color:var(--success)]/25 bg-[color:var(--success)]/10'
                                : 'border-[color:var(--error)]/25 bg-[color:var(--error)]/10'
                        )}
                    >
                        <div className="flex items-start gap-3">
                            {importResult.success ? (
                                <CheckCircle className="h-5 w-5 text-[var(--success)]" />
                            ) : (
                                <XCircle className="h-5 w-5 text-[var(--error)]" />
                            )}
                            <div>
                                <p className="text-[var(--ink)]">{importResult.message}</p>
                                {importResult.tripId ? (
                                    <button
                                        onClick={() => onOpenImportedTrip(importResult.tripId!)}
                                        className="mt-2 inline-flex items-center gap-1 text-sm text-[var(--masters)]"
                                    >
                                        <ExternalLink className="h-3 w-3" />
                                        Open trip
                                    </button>
                                ) : null}
                            </div>
                        </div>
                    </div>
                ) : (
                    <button
                        onClick={onOpenFilePicker}
                        className="w-full rounded-xl border-2 border-dashed border-[var(--rule)] bg-[var(--surface)] p-[var(--space-6)] transition-colors"
                    >
                        <div className="text-center">
                            <Upload className="mx-auto mb-3 h-10 w-10 text-[var(--ink-tertiary)]" />
                            <p className="font-medium text-[var(--ink)]">Select a JSON file</p>
                            <p className="text-sm text-[var(--ink-tertiary)]">Backup files only</p>
                        </div>
                    </button>
                )}
            </div>
        </section>
    );
}

export function BackupInfoSection() {
    return (
        <section className="card p-[var(--space-5)]">
            <div className="flex items-start gap-3">
                <HardDrive className="mt-0.5 h-5 w-5 text-[var(--ink-tertiary)]" />
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
    );
}

interface TripCardProps {
    trip: TripSummary;
    isSelected: boolean;
    onSelect: () => void;
    onExport: () => void;
    onShare: () => void;
    isExporting: boolean;
}

function TripCard({
    trip,
    isSelected,
    onSelect,
    onExport,
    onShare,
    isExporting,
}: TripCardProps) {
    const formatDate = (date: string) =>
        new Date(date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });

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
                <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-[var(--ink)]">{trip.name}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--ink-tertiary)]">
                        <span className="inline-flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(trip.startDate)}
                        </span>
                        <span className="inline-flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {trip.playerCount} players
                        </span>
                        <span className="inline-flex items-center gap-1">
                            <Trophy className="h-3 w-3" />
                            {trip.matchCount} matches
                        </span>
                    </div>
                </div>

                {isSelected ? (
                    <div className="shrink-0 flex items-center gap-2">
                        <Button
                            variant="secondary"
                            onClick={(event) => {
                                event.stopPropagation();
                                onShare();
                            }}
                            size="icon"
                            title="Copy summary"
                        >
                            <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="primary"
                            onClick={(event) => {
                                event.stopPropagation();
                                onExport();
                            }}
                            disabled={isExporting}
                            isLoading={isExporting}
                            loadingText="Export"
                            leftIcon={!isExporting ? <Download className="h-4 w-4" /> : undefined}
                        >
                            Export
                        </Button>
                    </div>
                ) : null}
            </div>
        </div>
    );
}
