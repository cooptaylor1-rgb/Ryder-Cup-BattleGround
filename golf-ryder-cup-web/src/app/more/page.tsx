'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTripStore, useUIStore } from '@/lib/stores';
import { AppShell } from '@/components/layout';
import { seedDemoData, clearDemoData } from '@/lib/db/seed';
import { cn } from '@/lib/utils';
import {
    Users,
    MapPin,
    Settings,
    Shield,
    Moon,
    Sun,
    Vibrate,
    Database,
    Trash2,
    Download,
    Upload,
    Info,
    ChevronRight,
    LogOut,
    Lock,
    Unlock,
} from 'lucide-react';

export default function MorePage() {
    const router = useRouter();
    const { currentTrip, loadTrip, clearTrip } = useTripStore();
    const {
        isDarkMode,
        toggleDarkMode,
        isCaptainMode,
        enableCaptainMode,
        disableCaptainMode,
        scoringPreferences,
        updateScoringPreference,
        showToast,
    } = useUIStore();

    const [showCaptainModal, setShowCaptainModal] = useState(false);
    const [captainPin, setCaptainPin] = useState('');
    const [isSeeding, setIsSeeding] = useState(false);

    const handleEnableCaptainMode = () => {
        if (captainPin.length >= 4) {
            enableCaptainMode(captainPin);
            setShowCaptainModal(false);
            setCaptainPin('');
        }
    };

    const handleSeedData = async () => {
        setIsSeeding(true);
        try {
            const tripId = await seedDemoData();
            await loadTrip(tripId);
            showToast('success', 'Demo data loaded successfully');
        } catch (error) {
            console.error('Failed to seed data:', error);
            showToast('error', 'Failed to load demo data');
        } finally {
            setIsSeeding(false);
        }
    };

    const handleClearData = async () => {
        if (!confirm('This will delete ALL data. Are you sure?')) return;

        try {
            await clearDemoData();
            clearTrip();
            showToast('info', 'All data cleared');
        } catch (error) {
            console.error('Failed to clear data:', error);
            showToast('error', 'Failed to clear data');
        }
    };

    return (
        <AppShell headerTitle="More">
            <div className="p-4 space-y-6">
                {/* Current Trip */}
                {currentTrip && (
                    <section>
                        <h2 className="text-xs uppercase text-surface-500 font-medium mb-2 px-1">
                            Current Trip
                        </h2>
                        <div className="card p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="font-semibold">{currentTrip.name}</h3>
                                    <p className="text-sm text-surface-500">
                                        {new Date(currentTrip.startDate).toLocaleDateString()} - {new Date(currentTrip.endDate).toLocaleDateString()}
                                    </p>
                                </div>
                                <button
                                    onClick={() => {
                                        clearTrip();
                                        router.push('/');
                                    }}
                                    className="p-2 text-surface-400 hover:text-surface-600"
                                >
                                    <LogOut className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    </section>
                )}

                {/* Captain Mode */}
                <section>
                    <h2 className="text-xs uppercase text-surface-500 font-medium mb-2 px-1">
                        Captain Mode
                    </h2>
                    <div className="card divide-y divide-surface-200 dark:divide-surface-700">
                        <button
                            onClick={() => isCaptainMode ? disableCaptainMode() : setShowCaptainModal(true)}
                            className="w-full flex items-center justify-between p-4"
                        >
                            <div className="flex items-center gap-3">
                                {isCaptainMode ? (
                                    <Unlock className="w-5 h-5 text-augusta-green" />
                                ) : (
                                    <Lock className="w-5 h-5 text-surface-400" />
                                )}
                                <div className="text-left">
                                    <p className="font-medium">Captain Mode</p>
                                    <p className="text-sm text-surface-500">
                                        {isCaptainMode ? 'Enabled - can edit lineups' : 'Disabled - view only'}
                                    </p>
                                </div>
                            </div>
                            <div className={cn(
                                'w-12 h-7 rounded-full transition-colors relative',
                                isCaptainMode ? 'bg-augusta-green' : 'bg-surface-300 dark:bg-surface-600'
                            )}>
                                <div className={cn(
                                    'absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-transform',
                                    isCaptainMode ? 'translate-x-6' : 'translate-x-1'
                                )} />
                            </div>
                        </button>
                    </div>
                </section>

                {/* Navigation */}
                <section>
                    <h2 className="text-xs uppercase text-surface-500 font-medium mb-2 px-1">
                        Manage
                    </h2>
                    <div className="card divide-y divide-surface-200 dark:divide-surface-700">
                        <button
                            onClick={() => router.push('/players')}
                            className="w-full flex items-center justify-between p-4"
                        >
                            <div className="flex items-center gap-3">
                                <Users className="w-5 h-5 text-surface-400" />
                                <span className="font-medium">Players</span>
                            </div>
                            <ChevronRight className="w-5 h-5 text-surface-400" />
                        </button>
                        <button
                            onClick={() => router.push('/courses')}
                            className="w-full flex items-center justify-between p-4"
                        >
                            <div className="flex items-center gap-3">
                                <MapPin className="w-5 h-5 text-surface-400" />
                                <span className="font-medium">Courses</span>
                            </div>
                            <ChevronRight className="w-5 h-5 text-surface-400" />
                        </button>
                    </div>
                </section>

                {/* Preferences */}
                <section>
                    <h2 className="text-xs uppercase text-surface-500 font-medium mb-2 px-1">
                        Preferences
                    </h2>
                    <div className="card divide-y divide-surface-200 dark:divide-surface-700">
                        {/* Dark Mode */}
                        <button
                            onClick={toggleDarkMode}
                            className="w-full flex items-center justify-between p-4"
                        >
                            <div className="flex items-center gap-3">
                                {isDarkMode ? (
                                    <Moon className="w-5 h-5 text-surface-400" />
                                ) : (
                                    <Sun className="w-5 h-5 text-surface-400" />
                                )}
                                <span className="font-medium">Dark Mode</span>
                            </div>
                            <div className={cn(
                                'w-12 h-7 rounded-full transition-colors relative',
                                isDarkMode ? 'bg-augusta-green' : 'bg-surface-300 dark:bg-surface-600'
                            )}>
                                <div className={cn(
                                    'absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-transform',
                                    isDarkMode ? 'translate-x-6' : 'translate-x-1'
                                )} />
                            </div>
                        </button>

                        {/* Haptic Feedback */}
                        <button
                            onClick={() => updateScoringPreference('hapticFeedback', !scoringPreferences.hapticFeedback)}
                            className="w-full flex items-center justify-between p-4"
                        >
                            <div className="flex items-center gap-3">
                                <Vibrate className="w-5 h-5 text-surface-400" />
                                <div className="text-left">
                                    <p className="font-medium">Haptic Feedback</p>
                                    <p className="text-sm text-surface-500">Vibrate on score entry</p>
                                </div>
                            </div>
                            <div className={cn(
                                'w-12 h-7 rounded-full transition-colors relative',
                                scoringPreferences.hapticFeedback ? 'bg-augusta-green' : 'bg-surface-300 dark:bg-surface-600'
                            )}>
                                <div className={cn(
                                    'absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-transform',
                                    scoringPreferences.hapticFeedback ? 'translate-x-6' : 'translate-x-1'
                                )} />
                            </div>
                        </button>

                        {/* Auto Advance */}
                        <button
                            onClick={() => updateScoringPreference('autoAdvance', !scoringPreferences.autoAdvance)}
                            className="w-full flex items-center justify-between p-4"
                        >
                            <div className="flex items-center gap-3">
                                <ChevronRight className="w-5 h-5 text-surface-400" />
                                <div className="text-left">
                                    <p className="font-medium">Auto-Advance</p>
                                    <p className="text-sm text-surface-500">Move to next hole after scoring</p>
                                </div>
                            </div>
                            <div className={cn(
                                'w-12 h-7 rounded-full transition-colors relative',
                                scoringPreferences.autoAdvance ? 'bg-augusta-green' : 'bg-surface-300 dark:bg-surface-600'
                            )}>
                                <div className={cn(
                                    'absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-transform',
                                    scoringPreferences.autoAdvance ? 'translate-x-6' : 'translate-x-1'
                                )} />
                            </div>
                        </button>

                        {/* Confirm Closeout */}
                        <button
                            onClick={() => updateScoringPreference('confirmCloseout', !scoringPreferences.confirmCloseout)}
                            className="w-full flex items-center justify-between p-4"
                        >
                            <div className="flex items-center gap-3">
                                <Shield className="w-5 h-5 text-surface-400" />
                                <div className="text-left">
                                    <p className="font-medium">Confirm Match End</p>
                                    <p className="text-sm text-surface-500">Ask before recording closeout</p>
                                </div>
                            </div>
                            <div className={cn(
                                'w-12 h-7 rounded-full transition-colors relative',
                                scoringPreferences.confirmCloseout ? 'bg-augusta-green' : 'bg-surface-300 dark:bg-surface-600'
                            )}>
                                <div className={cn(
                                    'absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-transform',
                                    scoringPreferences.confirmCloseout ? 'translate-x-6' : 'translate-x-1'
                                )} />
                            </div>
                        </button>
                    </div>
                </section>

                {/* Data Management */}
                <section>
                    <h2 className="text-xs uppercase text-surface-500 font-medium mb-2 px-1">
                        Data
                    </h2>
                    <div className="card divide-y divide-surface-200 dark:divide-surface-700">
                        <button
                            onClick={handleSeedData}
                            disabled={isSeeding}
                            className="w-full flex items-center justify-between p-4 disabled:opacity-50"
                        >
                            <div className="flex items-center gap-3">
                                <Database className="w-5 h-5 text-surface-400" />
                                <div className="text-left">
                                    <p className="font-medium">Load Demo Data</p>
                                    <p className="text-sm text-surface-500">Create sample trip with players</p>
                                </div>
                            </div>
                            {isSeeding && (
                                <div className="animate-spin w-5 h-5 border-2 border-augusta-green border-t-transparent rounded-full" />
                            )}
                        </button>
                        <button
                            onClick={handleClearData}
                            className="w-full flex items-center justify-between p-4 text-red-500"
                        >
                            <div className="flex items-center gap-3">
                                <Trash2 className="w-5 h-5" />
                                <div className="text-left">
                                    <p className="font-medium">Clear All Data</p>
                                    <p className="text-sm opacity-70">Delete everything and start fresh</p>
                                </div>
                            </div>
                        </button>
                    </div>
                </section>

                {/* About */}
                <section>
                    <h2 className="text-xs uppercase text-surface-500 font-medium mb-2 px-1">
                        About
                    </h2>
                    <div className="card p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-augusta-green flex items-center justify-center">
                                <span className="text-white font-bold text-lg">RC</span>
                            </div>
                            <div>
                                <h3 className="font-semibold">Golf Ryder Cup App</h3>
                                <p className="text-sm text-surface-500">Version 1.0.0 (Web)</p>
                            </div>
                        </div>
                        <p className="text-sm text-surface-500 mt-3">
                            Offline-first match play scoring for your golf trip Ryder Cup format.
                        </p>
                    </div>
                </section>
            </div>

            {/* Captain Mode Modal */}
            {showCaptainModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="card p-6 w-full max-w-sm">
                        <h3 className="text-lg font-semibold mb-4">Enable Captain Mode</h3>
                        <p className="text-sm text-surface-500 mb-4">
                            Enter a PIN to unlock captain features like editing lineups and managing players.
                        </p>
                        <input
                            type="password"
                            value={captainPin}
                            onChange={(e) => setCaptainPin(e.target.value)}
                            placeholder="Enter 4+ digit PIN"
                            className="w-full p-3 rounded-lg border border-surface-300 dark:border-surface-600 bg-surface-50 dark:bg-surface-800 mb-4"
                            autoFocus
                        />
                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setShowCaptainModal(false);
                                    setCaptainPin('');
                                }}
                                className="flex-1 py-3 rounded-lg border border-surface-300 dark:border-surface-600 font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleEnableCaptainMode}
                                disabled={captainPin.length < 4}
                                className="flex-1 py-3 rounded-lg bg-augusta-green text-white font-medium disabled:opacity-50"
                            >
                                Enable
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AppShell>
    );
}
