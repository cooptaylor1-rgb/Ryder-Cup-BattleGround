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
import { Bell, BellOff, Clock, Zap, Trophy, ClipboardList, Check, AlertCircle } from 'lucide-react';
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

function surfaceCardStyle() {
  return {
    background: 'var(--surface)',
    border: '1px solid var(--rule)',
    borderRadius: 'var(--radius-lg)',
  } as const;
}

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

  const showSaved = (message: string) => {
    setSavedMessage(message);
    setTimeout(() => setSavedMessage(null), 2000);
  };

  const isNotificationsSupported = typeof window !== 'undefined' && 'Notification' in window;

  const handleEnableNotifications = async () => {
    setIsRequesting(true);
    const granted = await requestNotificationPermission();
    setPermissionStatus(granted ? 'granted' : 'denied');

    if (granted) {
      const enabledPrefs = { ...preferences, enabled: true };
      setPreferences(enabledPrefs);
      savePreferences(enabledPrefs);
      showSaved('Notifications enabled');

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

  return (
    <div
      className="min-h-screen pb-nav page-premium-enter texture-grain"
      style={{ background: 'var(--canvas)' }}
    >
      <PageHeader
        title="Notifications"
        subtitle={currentTrip?.name ? currentTrip.name : 'Preferences'}
        icon={<Bell size={16} style={{ color: 'var(--color-accent)' }} />}
        onBack={() => router.push('/settings')}
      />

      <main className="container-editorial py-6 space-y-6 pb-8">
        {savedMessage ? (
          <div
            className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full text-white text-sm font-medium flex items-center gap-2 shadow-lg"
            style={{ background: 'var(--masters)' }}
            role="status"
            aria-live="polite"
          >
            <Check className="w-4 h-4" />
            {savedMessage}
          </div>
        ) : null}

        {/* Permission Status */}
        {!isNotificationsSupported ? (
          <InfoCard
            icon={AlertCircle}
            iconColor="var(--warning)"
            title="Not supported"
            description="Notifications are not supported in this browser. Try using Chrome, Safari, or Firefox."
          />
        ) : permissionStatus === 'denied' ? (
          <InfoCard
            icon={BellOff}
            iconColor="var(--error)"
            title="Notifications blocked"
            description="Notifications are blocked for this site. Please enable them in your browser settings."
          />
        ) : permissionStatus === 'granted' && preferences.enabled ? (
          <div style={{ ...surfaceCardStyle(), borderColor: 'rgba(34,197,94,0.35)' }} className="p-4">
            <div className="flex items-start gap-3">
              <Bell className="w-5 h-5 shrink-0 mt-0.5" style={{ color: 'rgb(34,197,94)' }} />
              <div className="flex-1">
                <h3 className="font-semibold" style={{ color: 'rgb(34,197,94)' }}>
                  Notifications enabled
                </h3>
                <p className="text-sm mt-1" style={{ color: 'var(--ink-tertiary)' }}>
                  {pendingCount > 0
                    ? `${pendingCount} reminder${pendingCount !== 1 ? 's' : ''} scheduled`
                    : "You'll receive alerts based on your preferences below."}
                </p>
              </div>
              <button
                onClick={() => handleToggle('enabled')}
                className="text-sm"
                style={{ color: 'var(--ink-tertiary)' }}
              >
                Disable
              </button>
            </div>
          </div>
        ) : (
          <div style={surfaceCardStyle()} className="p-4">
            <div className="flex items-start gap-3">
              <Bell className="w-5 h-5 shrink-0 mt-0.5" style={{ color: 'var(--ink-tertiary)' }} />
              <div className="flex-1">
                <h3 className="font-semibold" style={{ color: 'var(--ink)' }}>
                  Enable notifications
                </h3>
                <p className="text-sm mt-1" style={{ color: 'var(--ink-tertiary)' }}>
                  Get tee time reminders, score updates, and more.
                </p>
              </div>
            </div>
            <button
              onClick={handleEnableNotifications}
              disabled={isRequesting}
              className="mt-4 w-full py-3 rounded-xl text-white font-semibold transition-colors disabled:opacity-50"
              style={{ background: 'var(--masters)' }}
            >
              {isRequesting ? 'Requesting…' : 'Enable Notifications'}
            </button>
          </div>
        )}

        {/* Notification Types */}
        {preferences.enabled && permissionStatus === 'granted' ? (
          <section>
            <h2
              className="text-sm font-semibold uppercase tracking-wide mb-3"
              style={{ color: 'var(--ink-tertiary)' }}
            >
              Notification types
            </h2>
            <div className="space-y-2">
              <div style={surfaceCardStyle()} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ background: 'rgba(34,197,94,0.12)' }}
                    >
                      <Clock className="w-5 h-5" style={{ color: 'rgb(34,197,94)' }} />
                    </div>
                    <div>
                      <h3 className="font-medium" style={{ color: 'var(--ink)' }}>
                        Tee time reminders
                      </h3>
                      <p className="text-sm" style={{ color: 'var(--ink-tertiary)' }}>
                        Get notified before your tee time
                      </p>
                    </div>
                  </div>
                  <ToggleSwitch checked={preferences.teeTimeReminders} onChange={() => handleToggle('teeTimeReminders')} />
                </div>

                {preferences.teeTimeReminders ? (
                  <div className="mt-4" style={{ paddingLeft: '52px' }}>
                    <p className="text-sm mb-2" style={{ color: 'var(--ink-tertiary)' }}>
                      Remind me:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {[60, 45, 30, 15, 10].map((minutes) => {
                        const active = preferences.teeTimeLeadMinutes.includes(minutes);
                        return (
                          <button
                            key={minutes}
                            onClick={() =>
                              handleLeadTimeChange(minutes, !preferences.teeTimeLeadMinutes.includes(minutes))
                            }
                            className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                            style={
                              active
                                ? { background: 'var(--masters)', color: 'white' }
                                : {
                                    background: 'var(--surface-card)',
                                    border: '1px solid var(--rule)',
                                    color: 'var(--ink-tertiary)',
                                  }
                            }
                          >
                            {minutes} min
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </div>

              <SettingToggle
                icon={Zap}
                iconColor="#f59e0b"
                title="Score updates"
                description="When another player posts a score"
                checked={preferences.scoreUpdates}
                onChange={() => handleToggle('scoreUpdates')}
              />

              <SettingToggle
                icon={Trophy}
                iconColor="#eab308"
                title="Match complete"
                description="When a match finishes"
                checked={preferences.matchComplete}
                onChange={() => handleToggle('matchComplete')}
              />

              <SettingToggle
                icon={ClipboardList}
                iconColor="#8b5cf6"
                title="Lineup published"
                description="When new pairings are announced"
                checked={preferences.lineupPublished}
                onChange={() => handleToggle('lineupPublished')}
              />
            </div>
          </section>
        ) : null}
      </main>

      <BottomNav />
    </div>
  );
}

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className="relative w-12 h-7 rounded-full transition-colors"
      style={{ background: checked ? 'var(--masters)' : 'var(--surface-card)', border: '1px solid var(--rule)' }}
    >
      <span
        className="absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow-sm transition-transform"
        style={{ transform: checked ? 'translateX(20px)' : 'translateX(0px)' }}
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
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  iconColor: string;
  title: string;
  description: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <div className="p-4" style={surfaceCardStyle()}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: `${iconColor}15` }}
          >
            <Icon className="w-5 h-5" style={{ color: iconColor }} />
          </div>
          <div>
            <h3 className="font-medium" style={{ color: 'var(--ink)' }}>
              {title}
            </h3>
            <p className="text-sm" style={{ color: 'var(--ink-tertiary)' }}>
              {description}
            </p>
          </div>
        </div>
        <ToggleSwitch checked={checked} onChange={onChange} />
      </div>
    </div>
  );
}

function InfoCard({
  icon: Icon,
  iconColor,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  iconColor: string;
  title: string;
  description: string;
}) {
  return (
    <div className="p-4" style={surfaceCardStyle()}>
      <div className="flex items-start gap-3">
        <Icon className="w-5 h-5 shrink-0 mt-0.5" style={{ color: iconColor }} />
        <div>
          <h3 className="font-semibold" style={{ color: iconColor }}>
            {title}
          </h3>
          <p className="text-sm mt-1" style={{ color: 'var(--ink-tertiary)' }}>
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}
