'use client';

import React, { useRef, useState } from 'react';
import { AlertCircle, CheckCircle, Download, Share2, Upload } from 'lucide-react';
import {
    exportTripToFile,
    importTripFromFile,
    shareTripSummary,
} from '@/lib/services/exportImportService';
import { useToastStore } from '@/lib/stores';
import { useShallow } from 'zustand/shallow';

interface TripBackupSectionProps {
    tripId: string;
}

/**
 * Export / import / share controls for a trip. Extracted from the trip
 * settings page so each section keeps its own state and is easier to
 * reason about.
 */
export function TripBackupSection({ tripId }: TripBackupSectionProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { showToast } = useToastStore(useShallow(s => ({ showToast: s.showToast })));

    const [isExporting, setIsExporting] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [isSharing, setIsSharing] = useState(false);
    const [importResult, setImportResult] = useState<{
        success: boolean;
        message: string;
    } | null>(null);

    const handleExport = async () => {
        setIsExporting(true);
        try {
            await exportTripToFile(tripId);
            showToast('success', 'Trip exported');
        } catch {
            showToast('error', 'Export failed');
        } finally {
            setIsExporting(false);
        }
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsImporting(true);
        setImportResult(null);

        try {
            const result = await importTripFromFile(file);
            if (result.success) {
                setImportResult({
                    success: true,
                    message: `Imported "${result.tripName}" with ${result.stats.players} players, ${result.stats.matches} matches`,
                });
                showToast('success', 'Trip imported');
            } else {
                setImportResult({
                    success: false,
                    message: 'Import failed. Check file format.',
                });
                showToast('error', 'Import failed');
            }
        } catch {
            setImportResult({
                success: false,
                message: 'Could not read file',
            });
        } finally {
            setIsImporting(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleShare = async () => {
        setIsSharing(true);
        try {
            await shareTripSummary(tripId);
            showToast('success', 'Summary copied to clipboard');
        } catch {
            showToast('error', 'Could not copy summary');
        } finally {
            setIsSharing(false);
        }
    };

    return (
        <section className="card-elevated overflow-hidden">
            <div className="p-4 border-b border-[var(--rule)]">
                <h2 className="type-h3">Backup & Export</h2>
                <p className="text-sm text-[var(--ink-secondary)] mt-1">
                    Save your trip data or share with others.
                </p>
            </div>

            <div className="p-4 space-y-3">
                <button
                    onClick={handleExport}
                    disabled={isExporting}
                    className="w-full flex items-center gap-3 p-4 rounded-xl transition-colors disabled:opacity-50 bg-[color:var(--surface)]/60 hover:bg-[var(--surface)] border border-[color:var(--rule)]/30"
                >
                    <div className="w-10 h-10 rounded-full bg-[color:var(--info)]/15 flex items-center justify-center">
                        <Download className="w-5 h-5 text-[var(--info)]" />
                    </div>
                    <div className="text-left flex-1">
                        <div className="font-medium text-[var(--ink-primary)]">
                            {isExporting ? 'Exporting…' : 'Export Trip'}
                        </div>
                        <div className="text-sm text-[var(--ink-secondary)]">
                            Download as JSON file for backup
                        </div>
                    </div>
                </button>

                <button
                    onClick={handleImportClick}
                    disabled={isImporting}
                    className="w-full flex items-center gap-3 p-4 rounded-xl transition-colors disabled:opacity-50 bg-[color:var(--surface)]/60 hover:bg-[var(--surface)] border border-[color:var(--rule)]/30"
                >
                    <div className="w-10 h-10 rounded-full bg-[color:var(--success)]/15 flex items-center justify-center">
                        <Upload className="w-5 h-5 text-[var(--success)]" />
                    </div>
                    <div className="text-left flex-1">
                        <div className="font-medium text-[var(--ink-primary)]">
                            {isImporting ? 'Importing…' : 'Import Trip'}
                        </div>
                        <div className="text-sm text-[var(--ink-secondary)]">
                            Restore from a backup file
                        </div>
                    </div>
                </button>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    onChange={handleFileSelect}
                    className="hidden"
                />

                {importResult && (
                    <div
                        className={`flex items-start gap-3 p-3 rounded-xl ${
                            importResult.success
                                ? 'bg-[color:var(--success)]/10 text-[var(--success)]'
                                : 'bg-[color:var(--error)]/10 text-[var(--error)]'
                        }`}
                    >
                        {importResult.success ? (
                            <CheckCircle className="w-5 h-5 mt-0.5" />
                        ) : (
                            <AlertCircle className="w-5 h-5 mt-0.5" />
                        )}
                        <div className="text-sm">{importResult.message}</div>
                    </div>
                )}

                <button
                    onClick={handleShare}
                    disabled={isSharing}
                    className="w-full flex items-center gap-3 p-4 rounded-xl transition-colors disabled:opacity-50 bg-[color:var(--surface)]/60 hover:bg-[var(--surface)] border border-[color:var(--rule)]/30"
                >
                    <div className="w-10 h-10 rounded-full bg-[color:var(--masters)]/12 flex items-center justify-center">
                        <Share2 className="w-5 h-5 text-[var(--masters)]" />
                    </div>
                    <div className="text-left flex-1">
                        <div className="font-medium text-[var(--ink-primary)]">
                            {isSharing ? 'Sharing…' : 'Share Summary'}
                        </div>
                        <div className="text-sm text-[var(--ink-secondary)]">
                            Copy a shareable summary to your clipboard
                        </div>
                    </div>
                </button>
            </div>
        </section>
    );
}
