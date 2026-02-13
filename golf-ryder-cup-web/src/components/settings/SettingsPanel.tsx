/**
 * Settings Panel Component
 *
 * Comprehensive settings UI for app preferences.
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { logger } from '@/lib/utils/logger';
import { ThemeToggle } from '../ui/ThemeToggle';
import { useTripStore } from '@/lib/stores';
import { syncService, useSyncStatus, isSupabaseConfigured } from '@/lib/supabase';
import {
    Palette,
    Vibrate,
    Hand,
    Cloud,
    CloudOff,
    Download,
    Upload,
    Trash2,
    Info,
    ChevronRight,
    Check,
    RefreshCw,
    HardDrive,
    Smartphone,
} from 'lucide-react';

interface SettingsPanelProps {
    className?: string;
}

interface Preferences {
    hapticFeedback: boolean;
    soundEffects: boolean;
    notifications: boolean;
    scoringHand: 'right' | 'left';
    autoAdvanceHole: boolean;
    showHoleHandicaps: boolean;
    compactMatchCards: boolean;
}

const DEFAULT_PREFERENCES: Preferences = {
    hapticFeedback: true,
    soundEffects: false,
    notifications: true,
    scoringHand: 'right',
    autoAdvanceHole: true,
    showHoleHandicaps: true,
    compactMatchCards: false,
};

export function SettingsPanel({ className }: SettingsPanelProps) {
    const router = useRouter();
    const [preferences, setPreferences] = useState<Preferences>(DEFAULT_PREFERENCES);
    const [storageUsage, setStorageUsage] = useState<{ used: string; total: string } | null>(null);
    const syncStatus = useSyncStatus();

    // Load preferences
    useEffect(() => {
        const stored = localStorage.getItem('golf-preferences');
        if (stored) {
            try {
                setPreferences({ ...DEFAULT_PREFERENCES, ...JSON.parse(stored) });
            } catch {
                // Invalid JSON, use defaults
            }
        }

        // Get storage usage
        if ('storage' in navigator && 'estimate' in navigator.storage) {
            navigator.storage.estimate().then((estimate) => {
                const used = formatBytes(estimate.usage || 0);
                const total = formatBytes(estimate.quota || 0);
                setStorageUsage({ used, total });
            });
        }
    }, []);

    const updatePreference = <K extends keyof Preferences>(key: K, value: Preferences[K]) => {
        const updated = { ...preferences, [key]: value };
        setPreferences(updated);
        localStorage.setItem('golf-preferences', JSON.stringify(updated));

        // Trigger haptic if enabling haptic feedback
        if (key === 'hapticFeedback' && value && 'vibrate' in navigator) {
            navigator.vibrate(50);
        }
    };

    const handleExportData = async () => {
        try {
            const { exportAllData } = await import('@/lib/db');
            const data = await exportAllData();
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `golf-trip-backup-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (error) {
            logger.error('Export failed:', error);
            alert('Failed to export data');
        }
    };

    const handleImportData = async () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (!file) return;

            try {
                const text = await file.text();
                const data = JSON.parse(text);
                const { importData } = await import('@/lib/db');
                await importData(data);
                alert('Data imported successfully!');

                // Refresh in-app state without forcing a hard reload.
                useTripStore.getState().clearTrip();
                router.push('/');
                router.refresh();
            } catch (error) {
                logger.error('Import failed:', error);
                alert('Failed to import data. Make sure the file is a valid backup.');
            }
        };
        input.click();
    };

    const handleClearData = async () => {
        if (!confirm('Are you sure you want to clear all local data? This cannot be undone.')) {
            return;
        }
        if (!confirm('Really? All your trips, scores, and settings will be deleted.')) {
            return;
        }

        try {
            const { clearAllData } = await import('@/lib/db');
            await clearAllData();
            localStorage.clear();
            alert('All data cleared');

            // Reset in-memory stores and return to Home.
            useTripStore.getState().clearTrip();
            router.push('/');
            router.refresh();
        } catch (error) {
            logger.error('Clear failed:', error);
            alert('Failed to clear data');
        }
    };

    return (
        <div className={cn('space-y-6', className)}>
            {/* Appearance */}
            <SettingsSection title="Appearance" icon={<Palette className="w-5 h-5" />}>
                <SettingsRow label="Theme" description="Choose your preferred color scheme">
                    <ThemeToggle variant="segmented" />
                </SettingsRow>

                <SettingsRow label="Compact match cards" description="Show smaller match cards in lists">
                    <Toggle
                        checked={preferences.compactMatchCards}
                        onChange={(v) => updatePreference('compactMatchCards', v)}
                    />
                </SettingsRow>
            </SettingsSection>

            {/* Scoring */}
            <SettingsSection title="Scoring" icon={<Hand className="w-5 h-5" />}>
                <SettingsRow label="Scoring hand" description="Optimize button placement for one-handed use">
                    <div className="flex gap-2">
                        {(['left', 'right'] as const).map((hand) => (
                            <button
                                key={hand}
                                onClick={() => updatePreference('scoringHand', hand)}
                                className={cn(
                                    'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                                    preferences.scoringHand === hand
                                        ? 'bg-masters-primary text-white'
                                        : 'bg-[var(--surface)] text-[var(--ink-secondary)] border border-[var(--rule)]'
                                )}
                            >
                                {hand.charAt(0).toUpperCase() + hand.slice(1)}
                            </button>
                        ))}
                    </div>
                </SettingsRow>

                <SettingsRow label="Auto-advance hole" description="Move to next hole after scoring">
                    <Toggle
                        checked={preferences.autoAdvanceHole}
                        onChange={(v) => updatePreference('autoAdvanceHole', v)}
                    />
                </SettingsRow>

                <SettingsRow label="Show hole handicaps" description="Display stroke holes on scorecard">
                    <Toggle
                        checked={preferences.showHoleHandicaps}
                        onChange={(v) => updatePreference('showHoleHandicaps', v)}
                    />
                </SettingsRow>
            </SettingsSection>

            {/* Feedback */}
            <SettingsSection title="Feedback" icon={<Vibrate className="w-5 h-5" />}>
                <SettingsRow label="Haptic feedback" description="Vibrate on button presses">
                    <Toggle
                        checked={preferences.hapticFeedback}
                        onChange={(v) => updatePreference('hapticFeedback', v)}
                    />
                </SettingsRow>

                <SettingsRow label="Sound effects" description="Play sounds for score updates">
                    <Toggle
                        checked={preferences.soundEffects}
                        onChange={(v) => updatePreference('soundEffects', v)}
                    />
                </SettingsRow>

                <SettingsRow label="Notifications" description="Get alerts for match updates">
                    <Toggle
                        checked={preferences.notifications}
                        onChange={(v) => updatePreference('notifications', v)}
                    />
                </SettingsRow>
            </SettingsSection>

            {/* Sync & Data */}
            <SettingsSection title="Sync & Data" icon={<Cloud className="w-5 h-5" />}>
                <SettingsRow
                    label="Cloud sync"
                    description={isSupabaseConfigured ? 'Connected to cloud' : 'Not configured'}
                >
                    <div className="flex items-center gap-2">
                        {isSupabaseConfigured ? (
                            <>
                                <Check className="w-4 h-4 text-success" />
                                <span className="text-sm text-success">Connected</span>
                            </>
                        ) : (
                            <>
                                <CloudOff className="w-4 h-4 text-[var(--ink-tertiary)]" />
                                <span className="text-sm text-[var(--ink-tertiary)]">Offline only</span>
                            </>
                        )}
                    </div>
                </SettingsRow>

                {syncStatus.pendingChanges > 0 && (
                    <SettingsRow label="Pending changes" description="Changes waiting to sync">
                        <button
                            onClick={() => syncService.syncPendingChanges()}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-masters-primary text-white text-sm"
                        >
                            <RefreshCw className={cn('w-4 h-4', syncStatus.isSyncing && 'animate-spin')} />
                            Sync ({syncStatus.pendingChanges})
                        </button>
                    </SettingsRow>
                )}

                {storageUsage && (
                    <SettingsRow label="Storage used" description={`${storageUsage.used} of ${storageUsage.total}`}>
                        <HardDrive className="w-5 h-5 text-[var(--ink-tertiary)]" />
                    </SettingsRow>
                )}
            </SettingsSection>

            {/* Data Management */}
            <SettingsSection title="Data Management" icon={<HardDrive className="w-5 h-5" />}>
                <button
                    onClick={handleExportData}
                    className="w-full flex items-center gap-3 p-4 rounded-lg bg-[var(--surface)] border border-[var(--rule)] hover:bg-[var(--surface-raised)] transition-colors"
                >
                    <Download className="w-5 h-5 text-masters-primary" />
                    <div className="flex-1 text-left">
                        <div className="font-medium">Export data</div>
                        <div className="text-sm text-[var(--ink-tertiary)]">Download a backup of all your data</div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-[var(--ink-tertiary)]" />
                </button>

                <button
                    onClick={handleImportData}
                    className="w-full flex items-center gap-3 p-4 rounded-lg bg-[var(--surface)] border border-[var(--rule)] hover:bg-[var(--surface-raised)] transition-colors"
                >
                    <Upload className="w-5 h-5 text-masters-primary" />
                    <div className="flex-1 text-left">
                        <div className="font-medium">Import data</div>
                        <div className="text-sm text-[var(--ink-tertiary)]">Restore from a backup file</div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-[var(--ink-tertiary)]" />
                </button>

                <button
                    onClick={handleClearData}
                    className="w-full flex items-center gap-3 p-4 rounded-lg bg-error/5 border border-error/20 hover:bg-error/10 transition-colors"
                >
                    <Trash2 className="w-5 h-5 text-error" />
                    <div className="flex-1 text-left">
                        <div className="font-medium text-error">Clear all data</div>
                        <div className="text-sm text-error/70">Delete everything and start fresh</div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-error/50" />
                </button>
            </SettingsSection>

            {/* About */}
            <SettingsSection title="About" icon={<Info className="w-5 h-5" />}>
                <SettingsRow label="Version" description="Golf Ryder Cup App">
                    <span className="text-sm text-[var(--ink-tertiary)]">1.0.0</span>
                </SettingsRow>
                <SettingsRow label="Platform" description="Progressive Web App">
                    <Smartphone className="w-5 h-5 text-[var(--ink-tertiary)]" />
                </SettingsRow>
            </SettingsSection>
        </div>
    );
}

// ============================================
// SUB-COMPONENTS
// ============================================

interface SettingsSectionProps {
    title: string;
    icon: React.ReactNode;
    children: React.ReactNode;
}

function SettingsSection({ title, icon, children }: SettingsSectionProps) {
    return (
        <div>
            <div className="flex items-center gap-2 mb-3">
                <span className="text-masters-primary">{icon}</span>
                <h3 className="font-medium">{title}</h3>
            </div>
            <div className="space-y-2">{children}</div>
        </div>
    );
}

interface SettingsRowProps {
    label: string;
    description?: string;
    children: React.ReactNode;
}

function SettingsRow({ label, description, children }: SettingsRowProps) {
    return (
        <div className="flex items-center justify-between p-4 rounded-lg bg-[var(--surface)] border border-[var(--rule)]">
            <div>
                <div className="font-medium">{label}</div>
                {description && (
                    <div className="text-sm text-[var(--ink-tertiary)]">{description}</div>
                )}
            </div>
            {children}
        </div>
    );
}

interface ToggleProps {
    checked: boolean;
    onChange: (value: boolean) => void;
}

function Toggle({ checked, onChange }: ToggleProps) {
    return (
        <button
            role="switch"
            aria-checked={checked}
            onClick={() => onChange(!checked)}
            className={cn(
                'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                checked ? 'bg-masters-primary' : 'bg-[color:var(--ink-tertiary)]/25'
            )}
        >
            <span
                className={cn(
                    'inline-block h-4 w-4 transform rounded-full bg-[var(--surface-raised)] border border-[color:var(--rule)]/60 shadow-sm transition-transform',
                    checked ? 'translate-x-6' : 'translate-x-1'
                )}
            />
        </button>
    );
}

// Helper
function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export default SettingsPanel;
