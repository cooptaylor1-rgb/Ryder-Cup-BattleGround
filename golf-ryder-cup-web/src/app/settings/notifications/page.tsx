'use client';

/**
 * NOTIFICATION SETTINGS PAGE
 *
 * Configure push notification preferences for:
 * - Tee time reminders
 * - Score updates
 * - Match completions
 * - Lineup announcements
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    Bell,
    BellOff,
    Clock,
    Zap,
    Trophy,
    ClipboardList,
    Check,
    AlertCircle,
} from 'lucide-react';
import {
    requestNotificationPermission,
    getPreferences,
    savePreferences,
    scheduleAllTeeTimeReminders,
    getPendingNotificationCount,
    type NotificationPreferences,
} from '@/lib/services/notificationService';
import { useTripStore } from '@/lib/stores';
import { BottomNav, PageHeader } from '@/components/layout';

export default function NotificationSettingsPage() {
    const router = useRouter();
    const { currentTrip } = useTripStore();
    const [preferences, setPreferences] = useState<NotificationPreferences>(getPreferences());
    const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>(() => {
        if (typeof window !== 'undefined' && 'Notification' in window) {
            return Notification.permission;
        }
        return 'default';
    });
    const [isRequesting, setIsRequesting] = useState(false);
    const [pendingCount, setPendingCount] = useState(() => getPendingNotificationCount());
    const [savedMessage, setSavedMessage] = useState<string | null>(null);

    const handleEnableNotifications = async () => {
        setIsRequesting(true);
        const granted = await requestNotificationPermission();
        setPermissionStatus(granted ? 'granted' : 'denied');
        if (granted) {
            setPreferences({ ...preferences, enabled: true });
            savePreferences({ ...preferences, enabled: true });
            showSaved('Notifications enabled');

            // Schedule tee time reminders if we have a trip
            if (currentTrip) {
                const count = await scheduleAllTeeTimeReminders(currentTrip.id);
                if (count > 0) {
                    setPendingCount(count);
                    showSaved(`${count} reminders scheduled`);
                }
            }
        }
        setIsRequesting(false);
    };

    const handleToggle = (key: keyof NotificationPreferences) => {
        const newPrefs = { ...preferences, [key]: !preferences[key] };
        setPreferences(newPrefs);
        savePreferences(newPrefs);
        showSaved('Settings saved');
    };

    const handleLeadTimeChange = (minutes: number, enabled: boolean) => {
        let newLeadTimes = [...preferences.teeTimeLeadMinutes];
        if (enabled && !newLeadTimes.includes(minutes)) {
            newLeadTimes.push(minutes);
            newLeadTimes.sort((a, b) => b - a);
        } else if (!enabled) {
            newLeadTimes = newLeadTimes.filter((m) => m !== minutes);
        }
        const newPrefs = { ...preferences, teeTimeLeadMinutes: newLeadTimes };
        setPreferences(newPrefs);
        savePreferences(newPrefs);
        showSaved('Settings saved');
    };

    const showSaved = (message: string) => {
        setSavedMessage(message);
        setTimeout(() => setSavedMessage(null), 2000);
    };

    const isNotificationsSupported = typeof window !== 'undefined' && 'Notification' in window;

    return (
        <div
            className="min-h-screen pb-nav page-premium-enter texture-grain"
            style={{ background: 'var(--canvas)' }}
        >
            <PageHeader
                title="Notifications"
                icon={<Bell className="w-4 h-4 text-white" />}
                onBack={() => router.push('/settings')}
            />

            {/* Content */}
            <main className="container-editorial py-6 space-y-6 pb-8">
                {/* Saved Message */}
                {savedMessage && (
                    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-(--masters) text-white text-sm font-medium flex items-center gap-2 shadow-lg animate-fadeIn">
                        <Check className="w-4 h-4" />
                        {savedMessage}
                    </div>
                )}

                {/* Permission Status */}
                {!isNotificationsSupported ? (
                    <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20">
                        <div className="flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                            <div>
                                <h3 className="font-semibold text-amber-500">Not Supported</h3>
                                <p className="text-sm text-(--ink-muted) mt-1">
                                    Notifications are not supported in this browser. Try using Chrome, Safari, or Firefox.
                                </p>
                            </div>
                        </div>
                    </div>
                ) : permissionStatus === 'denied' ? (
                    <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20">
                        <div className="flex items-start gap-3">
                            <BellOff className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                            <div>
                                <h3 className="font-semibold text-red-500">Notifications Blocked</h3>
                                <p className="text-sm text-(--ink-muted) mt-1">
                                    Notifications are blocked for this site. Please enable them in your browser settings.
                                </p>
                            </div>
                        </div>
                    </div>
                ) : permissionStatus === 'granted' && preferences.enabled ? (
                    <div className="p-4 rounded-2xl bg-green-500/10 border border-green-500/20">
                        <div className="flex items-start gap-3">
                            <Bell className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                            <div className="flex-1">
                                <h3 className="font-semibold text-green-500">Notifications Enabled</h3>
                                <p className="text-sm text-(--ink-muted) mt-1">
                                    {pendingCount > 0
                                        ? `${pendingCount} reminder${pendingCount !== 1 ? 's' : ''} scheduled`
                                        : 'You\'ll receive alerts based on your preferences below.'}
                                </p>
                            </div>
                            <button
                                onClick={() => handleToggle('enabled')}
                                className="text-sm text-(--ink-muted) hover:text-red-500"
                            >
                                Disable
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="p-4 rounded-2xl bg-(--surface) border border-(--rule)">
                        <div className="flex items-start gap-3">
                            <Bell className="w-5 h-5 text-(--ink-muted) shrink-0 mt-0.5" />
                            <div className="flex-1">
                                <h3 className="font-semibold" style={{ color: 'var(--ink)' }}>
                                    Enable Notifications
                                </h3>
                                <p className="text-sm text-(--ink-muted) mt-1">
                                    Get tee time reminders, score updates, and more.
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={handleEnableNotifications}
                            disabled={isRequesting}
                            className="mt-4 w-full py-3 rounded-xl bg-(--masters) text-white font-semibold hover:bg-(--masters-dark) transition-colors disabled:opacity-50"
                        >
                            {isRequesting ? 'Requesting...' : 'Enable Notifications'}
                        </button>
                    </div>
                )}

                {/* Notification Types */}
                {preferences.enabled && permissionStatus === 'granted' && (
                    <>
                        <section>
                            <h2 className="text-sm font-semibold text-(--ink-muted) uppercase tracking-wide mb-3">
                                Notification Types
                            </h2>
                            <div className="space-y-2">
                                {/* Tee Time Reminders */}
                                <div className="p-4 rounded-2xl bg-(--surface) border border-(--rule)">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div
                                                className="w-10 h-10 rounded-xl flex items-center justify-center"
                                                style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)' }}
                                            >
                                                <Clock className="w-5 h-5 text-green-500" />
                                            </div>
                                            <div>
                                                <h3 className="font-medium" style={{ color: 'var(--ink)' }}>
                                                    Tee Time Reminders
                                                </h3>
                                                <p className="text-sm text-(--ink-muted)">
                                                    Get notified before your tee time
                                                </p>
                                            </div>
                                        </div>
                                        <ToggleSwitch
                                            checked={preferences.teeTimeReminders}
                                            onChange={() => handleToggle('teeTimeReminders')}
                                        />
                                    </div>

                                    {preferences.teeTimeReminders && (
                                        <div className="mt-4 pl-13 space-y-2">
                                            <p className="text-sm text-(--ink-muted) mb-2">Remind me:</p>
                                            <div className="flex flex-wrap gap-2">
                                                {[60, 45, 30, 15, 10].map((minutes) => (
                                                    <button
                                                        key={minutes}
                                                        onClick={() =>
                                                            handleLeadTimeChange(
                                                                minutes,
                                                                !preferences.teeTimeLeadMinutes.includes(minutes)
                                                            )
                                                        }
                                                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${preferences.teeTimeLeadMinutes.includes(minutes)
                                                            ? 'bg-(--masters) text-white'
                                                            : 'bg-(--ink-secondary) text-(--ink-muted) hover:bg-(--rule)'
                                                            }`}
                                                    >
                                                        {minutes} min
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Score Updates */}
                                <SettingToggle
                                    icon={Zap}
                                    iconColor="#f59e0b"
                                    title="Score Updates"
                                    description="When another player posts a score"
                                    checked={preferences.scoreUpdates}
                                    onChange={() => handleToggle('scoreUpdates')}
                                />

                                {/* Match Complete */}
                                <SettingToggle
                                    icon={Trophy}
                                    iconColor="#eab308"
                                    title="Match Complete"
                                    description="When a match finishes"
                                    checked={preferences.matchComplete}
                                    onChange={() => handleToggle('matchComplete')}
                                />

                                {/* Lineup Published */}
                                <SettingToggle
                                    icon={ClipboardList}
                                    iconColor="#8b5cf6"
                                    title="Lineup Published"
                                    description="When new pairings are announced"
                                    checked={preferences.lineupPublished}
                                    onChange={() => handleToggle('lineupPublished')}
                                />
                            </div>
                        </section>
                    </>
                )}
            </main>

            <BottomNav />
        </div>
    );
}

// ============================================
// SUB-COMPONENTS
// ============================================

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: () => void }) {
    return (
        <button
            role="switch"
            aria-checked={checked}
            onClick={onChange}
            className={`relative w-12 h-7 rounded-full transition-colors ${checked ? 'bg-(--masters)' : 'bg-(--ink-secondary)'
                }`}
        >
            <span
                className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${checked ? 'translate-x-5' : ''
                    }`}
            />
        </button>
    );
}

function SettingToggle({
    icon: Icon,
    iconColor,
    title,
    description,
    checked,
    onChange,
}: {
    icon: React.ComponentType<{ className?: string }>;
    iconColor: string;
    title: string;
    description: string;
    checked: boolean;
    onChange: () => void;
}) {
    // Map iconColor to Tailwind text classes
    const getIconColorClass = (color: string) => {
        switch (color) {
            case '#FFD54F': return 'text-[#FFD54F]';
            case '#4CAF50': return 'text-[#4CAF50]';
            case '#EF5350': return 'text-[#EF5350]';
            case '#64B5F6': return 'text-[#64B5F6]';
            default: return 'text-[#FFD54F]';
        }
    };

    return (
        <div className="p-4 rounded-2xl bg-(--surface) border border-(--rule)">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center"
                        style={{ backgroundColor: `${iconColor}15` }}
                    >
                        <Icon className={`w-5 h-5 ${getIconColorClass(iconColor)}`} />
                    </div>
                    <div>
                        <h3 className="font-medium" style={{ color: 'var(--ink)' }}>
                            {title}
                        </h3>
                        <p className="text-sm text-(--ink-muted)">{description}</p>
                    </div>
                </div>
                <ToggleSwitch checked={checked} onChange={onChange} />
            </div>
        </div>
    );
}

// (BottomNav used instead of a local NavItem)
