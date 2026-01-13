'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTripStore, useUIStore } from '@/lib/stores';
import { AppShellNew } from '@/components/layout';
import {
    Card,
    SectionHeader,
    Button,
    Modal,
    ConfirmDialog,
    Input,
} from '@/components/ui';
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

// Reusable Toggle Switch component
interface ToggleSwitchProps {
    enabled: boolean;
    onChange: () => void;
}

function ToggleSwitch({ enabled, onChange }: ToggleSwitchProps) {
    return (
        <button
            role="switch"
            aria-checked={enabled}
            onClick={onChange}
            className={cn(
                'w-12 h-7 rounded-full transition-colors relative shrink-0',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-augusta-green/50',
                enabled ? 'bg-augusta-green' : 'bg-surface-muted',
            )}
        >
            <div className={cn(
                'absolute top-1 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200',
                enabled ? 'translate-x-6' : 'translate-x-1',
            )} />
        </button>
    );
}

// Setting row component
interface SettingRowProps {
    icon: React.ElementType;
    title: string;
    subtitle?: string;
    onClick?: () => void;
    trailing?: React.ReactNode;
    danger?: boolean;
}

function SettingRow({ icon: Icon, title, subtitle, onClick, trailing, danger = false }: SettingRowProps) {
    return (
        <button
            onClick={onClick}
            className={cn(
                'w-full flex items-center justify-between p-4',
                'transition-colors duration-150',
                'hover:bg-surface-highlight active:bg-surface-highlight',
                danger && 'text-red-500',
            )}
        >
            <div className="flex items-center gap-3">
                <Icon className={cn(
                    'h-5 w-5',
                    danger ? 'text-red-500' : 'text-text-tertiary',
                )} />
                <div className="text-left">
                    <p className={cn('font-medium', danger ? 'text-red-500' : 'text-text-primary')}>
                        {title}
                    </p>
                    {subtitle && (
                        <p className={cn(
                            'text-sm',
                            danger ? 'text-red-500/70' : 'text-text-secondary',
                        )}>
                            {subtitle}
                        </p>
                    )}
                </div>
            </div>
            {trailing}
        </button>
    );
}

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
    const [showClearConfirm, setShowClearConfirm] = useState(false);
    const [showExitTripConfirm, setShowExitTripConfirm] = useState(false);

    const handleEnableCaptainMode = () => {
        if (captainPin.length >= 4) {
            enableCaptainMode(captainPin);
            setShowCaptainModal(false);
            setCaptainPin('');
            showToast('success', 'Captain mode enabled');
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
        try {
            await clearDemoData();
            clearTrip();
            setShowClearConfirm(false);
            showToast('info', 'All data cleared');
            router.push('/');
        } catch (error) {
            console.error('Failed to clear data:', error);
            showToast('error', 'Failed to clear data');
        }
    };

    const handleExitTrip = () => {
        clearTrip();
        setShowExitTripConfirm(false);
        router.push('/');
    };

    return (
        <AppShellNew headerTitle="More" headerSubtitle="Settings & Data">
            <div className="p-4 lg:p-6 space-y-6">
                {/* Current Trip */}
                {currentTrip && (
                    <section>
                        <SectionHeader
                            title="Current Trip"
                            size="sm"
                            className="mb-3"
                        />
                        <Card>
                            <div className="flex items-center justify-between">
                                <div className="min-w-0 flex-1">
                                    <h3 className="font-semibold text-text-primary truncate">{currentTrip.name}</h3>
                                    <p className="text-sm text-text-secondary">
                                        {new Date(currentTrip.startDate).toLocaleDateString()} - {new Date(currentTrip.endDate).toLocaleDateString()}
                                    </p>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setShowExitTripConfirm(true)}
                                    className="shrink-0"
                                >
                                    <LogOut className="h-4 w-4 mr-2" />
                                    Exit Trip
                                </Button>
                            </div>
                        </Card>
                    </section>
                )}

                {/* Captain Mode */}
                <section>
                    <SectionHeader
                        title="Captain Mode"
                        size="sm"
                        className="mb-3"
                    />
                    <Card padding="none" className="overflow-hidden">
                        <SettingRow
                            icon={isCaptainMode ? Unlock : Lock}
                            title="Captain Mode"
                            subtitle={isCaptainMode ? 'Enabled - can edit lineups' : 'Disabled - view only'}
                            onClick={() => isCaptainMode ? disableCaptainMode() : setShowCaptainModal(true)}
                            trailing={<ToggleSwitch enabled={isCaptainMode} onChange={() => { }} />}
                        />
                    </Card>
                </section>

                {/* Navigation */}
                <section>
                    <SectionHeader
                        title="Manage"
                        icon={Settings}
                        size="sm"
                        className="mb-3"
                    />
                    <Card padding="none" className="overflow-hidden divide-y divide-surface-border/50">
                        <SettingRow
                            icon={Users}
                            title="Players"
                            onClick={() => router.push('/players')}
                            trailing={<ChevronRight className="h-5 w-5 text-text-tertiary" />}
                        />
                        <SettingRow
                            icon={MapPin}
                            title="Courses"
                            onClick={() => router.push('/courses')}
                            trailing={<ChevronRight className="h-5 w-5 text-text-tertiary" />}
                        />
                    </Card>
                </section>

                {/* Preferences */}
                <section>
                    <SectionHeader
                        title="Preferences"
                        size="sm"
                        className="mb-3"
                    />
                    <Card padding="none" className="overflow-hidden divide-y divide-surface-border/50">
                        {/* Dark Mode */}
                        <SettingRow
                            icon={isDarkMode ? Moon : Sun}
                            title="Dark Mode"
                            onClick={toggleDarkMode}
                            trailing={<ToggleSwitch enabled={isDarkMode} onChange={toggleDarkMode} />}
                        />

                        {/* Haptic Feedback */}
                        <SettingRow
                            icon={Vibrate}
                            title="Haptic Feedback"
                            subtitle="Vibrate on score entry"
                            onClick={() => updateScoringPreference('hapticFeedback', !scoringPreferences.hapticFeedback)}
                            trailing={
                                <ToggleSwitch
                                    enabled={scoringPreferences.hapticFeedback}
                                    onChange={() => updateScoringPreference('hapticFeedback', !scoringPreferences.hapticFeedback)}
                                />
                            }
                        />

                        {/* Auto Advance */}
                        <SettingRow
                            icon={ChevronRight}
                            title="Auto-Advance"
                            subtitle="Move to next hole after scoring"
                            onClick={() => updateScoringPreference('autoAdvance', !scoringPreferences.autoAdvance)}
                            trailing={
                                <ToggleSwitch
                                    enabled={scoringPreferences.autoAdvance}
                                    onChange={() => updateScoringPreference('autoAdvance', !scoringPreferences.autoAdvance)}
                                />
                            }
                        />

                        {/* Confirm Closeout */}
                        <SettingRow
                            icon={Shield}
                            title="Confirm Match End"
                            subtitle="Ask before recording closeout"
                            onClick={() => updateScoringPreference('confirmCloseout', !scoringPreferences.confirmCloseout)}
                            trailing={
                                <ToggleSwitch
                                    enabled={scoringPreferences.confirmCloseout}
                                    onChange={() => updateScoringPreference('confirmCloseout', !scoringPreferences.confirmCloseout)}
                                />
                            }
                        />
                    </Card>
                </section>

                {/* Data Management */}
                <section>
                    <SectionHeader
                        title="Data"
                        icon={Database}
                        size="sm"
                        className="mb-3"
                    />
                    <Card padding="none" className="overflow-hidden divide-y divide-surface-border/50">
                        <SettingRow
                            icon={Database}
                            title="Load Demo Data"
                            subtitle="Create sample trip with players"
                            onClick={handleSeedData}
                            trailing={
                                isSeeding ? (
                                    <div className="animate-spin h-5 w-5 border-2 border-augusta-green border-t-transparent rounded-full" />
                                ) : undefined
                            }
                        />
                        <SettingRow
                            icon={Trash2}
                            title="Clear All Data"
                            subtitle="Delete everything and start fresh"
                            onClick={() => setShowClearConfirm(true)}
                            danger
                        />
                    </Card>
                </section>

                {/* About */}
                <section>
                    <SectionHeader
                        title="About"
                        icon={Info}
                        size="sm"
                        className="mb-3"
                    />
                    <Card>
                        <div className="flex items-center gap-4">
                            <div className="h-14 w-14 rounded-xl bg-augusta-green flex items-center justify-center shrink-0">
                                <span className="text-white font-bold text-xl">RC</span>
                            </div>
                            <div>
                                <h3 className="font-semibold text-text-primary">Golf Ryder Cup App</h3>
                                <p className="text-sm text-text-secondary">Version 1.0.0 (Web)</p>
                            </div>
                        </div>
                        <p className="text-sm text-text-secondary mt-4">
                            Offline-first match play scoring for your golf trip Ryder Cup format.
                        </p>
                    </Card>
                </section>
            </div>

            {/* Captain Mode Modal */}
            <Modal
                isOpen={showCaptainModal}
                onClose={() => {
                    setShowCaptainModal(false);
                    setCaptainPin('');
                }}
                title="Enable Captain Mode"
            >
                <p className="text-sm text-text-secondary mb-4">
                    Enter a PIN to unlock captain features like editing lineups and managing players.
                </p>
                <Input
                    type="password"
                    value={captainPin}
                    onChange={(e) => setCaptainPin(e.target.value)}
                    placeholder="Enter 4+ digit PIN"
                    autoFocus
                />
                <div className="flex gap-3 mt-6">
                    <Button
                        variant="outline"
                        onClick={() => {
                            setShowCaptainModal(false);
                            setCaptainPin('');
                        }}
                        className="flex-1"
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="primary"
                        onClick={handleEnableCaptainMode}
                        disabled={captainPin.length < 4}
                        className="flex-1"
                    >
                        Enable
                    </Button>
                </div>
            </Modal>

            {/* Clear Data Confirmation */}
            <ConfirmDialog
                isOpen={showClearConfirm}
                onClose={() => setShowClearConfirm(false)}
                onConfirm={handleClearData}
                title="Clear All Data?"
                description="This will permanently delete all trips, players, matches, and scores. This action cannot be undone."
                confirmLabel="Clear All Data"
                variant="danger"
                confirmText="DELETE"
            />

            {/* Exit Trip Confirmation */}
            <ConfirmDialog
                isOpen={showExitTripConfirm}
                onClose={() => setShowExitTripConfirm(false)}
                onConfirm={handleExitTrip}
                title="Exit Trip?"
                description="You'll be taken back to the trip selector. Your data will be saved and you can return to this trip anytime."
                confirmLabel="Exit Trip"
                variant="default"
            />
        </AppShellNew>
    );
}
