/**
 * Push Notification Settings Component
 *
 * Production-ready notification preferences and permission management.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Bell,
  BellOff,
  AlertCircle,
  Trophy,
  MessageCircle,
  BarChart3,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  isPushSupported,
  getPermission,
  requestPermission,
  subscribeToPush,
  unsubscribeFromPush,
  getPushSubscription,
} from '@/lib/services/pushNotificationService';

interface NotificationSettingsProps {
  vapidPublicKey?: string;
  onSubscriptionChange?: (subscription: PushSubscription | null) => void;
  className?: string;
}

interface NotificationCategory {
  id: string;
  label: string;
  description: string;
  icon: typeof Bell;
  defaultEnabled: boolean;
}

const NOTIFICATION_CATEGORIES: NotificationCategory[] = [
  {
    id: 'scores',
    label: 'Score Updates',
    description: 'When matches finish or standings change',
    icon: Trophy,
    defaultEnabled: true,
  },
  {
    id: 'messages',
    label: 'Group Chat',
    description: 'New messages and mentions',
    icon: MessageCircle,
    defaultEnabled: true,
  },
  {
    id: 'reminders',
    label: 'Tee Time Reminders',
    description: '30 minutes before scheduled rounds',
    icon: Clock,
    defaultEnabled: true,
  },
  {
    id: 'polls',
    label: 'Polls & Votes',
    description: 'New polls and voting reminders',
    icon: BarChart3,
    defaultEnabled: false,
  },
];

export function NotificationSettings({
  vapidPublicKey,
  onSubscriptionChange,
  className,
}: NotificationSettingsProps) {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<'default' | 'granted' | 'denied'>('default');
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isToggling, setIsToggling] = useState(false);
  const [categoryPrefs, setCategoryPrefs] = useState<Record<string, boolean>>(() => {
    // Load from localStorage
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('notification-prefs');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          // Fall through to defaults
        }
      }
    }
    return NOTIFICATION_CATEGORIES.reduce((acc, cat) => {
      acc[cat.id] = cat.defaultEnabled;
      return acc;
    }, {} as Record<string, boolean>);
  });

  // Check support and current state
  useEffect(() => {
    const init = async () => {
      const supported = isPushSupported();
      setIsSupported(supported);

      if (supported) {
        setPermission(getPermission());
        const sub = await getPushSubscription();
        setSubscription(sub);
      }

      setIsLoading(false);
    };

    init();
  }, []);

  // Save preferences to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('notification-prefs', JSON.stringify(categoryPrefs));
    }
  }, [categoryPrefs]);

  const handleEnable = useCallback(async () => {
    setIsToggling(true);
    try {
      const perm = await requestPermission();
      setPermission(perm);

      if (perm === 'granted') {
        const sub = await subscribeToPush(vapidPublicKey);
        setSubscription(sub);
        onSubscriptionChange?.(sub);
      }
    } catch (error) {
      console.error('Failed to enable notifications:', error);
    } finally {
      setIsToggling(false);
    }
  }, [vapidPublicKey, onSubscriptionChange]);

  const handleDisable = useCallback(async () => {
    setIsToggling(true);
    try {
      await unsubscribeFromPush();
      setSubscription(null);
      onSubscriptionChange?.(null);
    } catch (error) {
      console.error('Failed to disable notifications:', error);
    } finally {
      setIsToggling(false);
    }
  }, [onSubscriptionChange]);

  const handleCategoryToggle = useCallback((categoryId: string) => {
    setCategoryPrefs(prev => ({
      ...prev,
      [categoryId]: !prev[categoryId],
    }));
  }, []);

  if (isLoading) {
    return (
      <div className={cn('card-surface rounded-xl p-6', className)}>
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-[var(--surface-tertiary)] rounded w-1/3" />
          <div className="h-20 bg-[var(--surface-tertiary)] rounded" />
        </div>
      </div>
    );
  }

  if (!isSupported) {
    return (
      <div className={cn('card-surface rounded-xl p-6', className)}>
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-[var(--surface-secondary)]">
            <BellOff size={24} className="text-[var(--ink-tertiary)]" />
          </div>
          <div>
            <h3 className="type-body-lg font-semibold text-[var(--ink-primary)]">
              Notifications Not Supported
            </h3>
            <p className="type-body text-[var(--ink-tertiary)] mt-1">
              Your browser doesn&apos;t support push notifications.
              Try using Chrome, Firefox, or Edge on desktop, or install the app on mobile.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (permission === 'denied') {
    return (
      <div className={cn('card-surface rounded-xl p-6', className)}>
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-red-500/10">
            <AlertCircle size={24} className="text-red-500" />
          </div>
          <div>
            <h3 className="type-body-lg font-semibold text-[var(--ink-primary)]">
              Notifications Blocked
            </h3>
            <p className="type-body text-[var(--ink-tertiary)] mt-1">
              You&apos;ve blocked notifications for this site. To enable them:
            </p>
            <ol className="type-caption text-[var(--ink-tertiary)] mt-2 space-y-1 list-decimal list-inside">
              <li>Click the lock/info icon in your browser&apos;s address bar</li>
              <li>Find &quot;Notifications&quot; in the site settings</li>
              <li>Change from &quot;Block&quot; to &quot;Allow&quot;</li>
              <li>Refresh this page</li>
            </ol>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('card-surface rounded-xl overflow-hidden', className)}>
      {/* Header */}
      <div className="p-4 flex items-center justify-between border-b border-[var(--surface-tertiary)]">
        <div className="flex items-center gap-3">
          <div className={cn(
            'p-2 rounded-lg',
            subscription
              ? 'bg-[var(--masters)]/10 text-[var(--masters)]'
              : 'bg-[var(--surface-secondary)] text-[var(--ink-tertiary)]'
          )}>
            {subscription ? <Bell size={20} /> : <BellOff size={20} />}
          </div>
          <div>
            <h3 className="type-body-lg font-semibold text-[var(--ink-primary)]">
              Push Notifications
            </h3>
            <p className="type-caption text-[var(--ink-tertiary)]">
              {subscription ? 'Notifications enabled' : 'Notifications disabled'}
            </p>
          </div>
        </div>

        <button
          onClick={subscription ? handleDisable : handleEnable}
          disabled={isToggling}
          className={cn(
            'px-4 py-2 rounded-lg font-medium transition-colors',
            subscription
              ? 'bg-[var(--surface-secondary)] text-[var(--ink-secondary)] hover:bg-[var(--surface-tertiary)]'
              : 'bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]'
          )}
        >
          {isToggling ? 'Loading...' : subscription ? 'Disable' : 'Enable'}
        </button>
      </div>

      {/* Category Preferences */}
      {subscription && (
        <div className="p-4 space-y-3">
          <p className="type-caption text-[var(--ink-tertiary)]">
            Choose which notifications you want to receive:
          </p>

          {NOTIFICATION_CATEGORIES.map(category => {
            const Icon = category.icon;
            const isEnabled = categoryPrefs[category.id] ?? category.defaultEnabled;

            return (
              <button
                key={category.id}
                onClick={() => handleCategoryToggle(category.id)}
                className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-[var(--surface-secondary)] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    'p-2 rounded-lg',
                    isEnabled
                      ? 'bg-[var(--accent)]/10 text-[var(--accent)]'
                      : 'bg-[var(--surface-secondary)] text-[var(--ink-tertiary)]'
                  )}>
                    <Icon size={18} />
                  </div>
                  <div className="text-left">
                    <p className="type-body font-medium text-[var(--ink-primary)]">
                      {category.label}
                    </p>
                    <p className="type-caption text-[var(--ink-tertiary)]">
                      {category.description}
                    </p>
                  </div>
                </div>

                <div className={cn(
                  'w-10 h-6 rounded-full p-1 transition-colors',
                  isEnabled ? 'bg-[var(--accent)]' : 'bg-[var(--surface-tertiary)]'
                )}>
                  <div className={cn(
                    'w-4 h-4 rounded-full bg-white transition-transform',
                    isEnabled && 'translate-x-4'
                  )} />
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Test Notification */}
      {subscription && (
        <div className="p-4 border-t border-[var(--surface-tertiary)]">
          <button
            onClick={() => {
              if ('Notification' in window && Notification.permission === 'granted') {
                new Notification('Test Notification', {
                  body: 'Notifications are working! 🎉',
                  icon: '/icons/icon-192.png',
                });
              }
            }}
            className="w-full py-2 text-center type-caption text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors"
          >
            Send Test Notification
          </button>
        </div>
      )}
    </div>
  );
}

export default NotificationSettings;
