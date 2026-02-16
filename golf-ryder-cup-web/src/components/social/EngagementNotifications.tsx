/**
 * Engagement Notifications Component
 *
 * Visual notification system for social engagement including:
 * - Comments and reactions
 * - Mentions
 * - Achievement unlocks
 * - Match updates
 *
 * Features:
 * - Toast-style popups
 * - Notification center dropdown
 * - Badge counts
 * - Mark as read
 */

'use client';

import { useState, useEffect, useCallback, createContext, useContext, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import {
  Bell,
  MessageCircle,
  Trophy,
  Award,
  Camera,
  AtSign,
  Heart,
  X,
  Check,
} from 'lucide-react';

// ============================================
// TYPES
// ============================================

export type NotificationType =
  | 'comment'
  | 'reaction'
  | 'mention'
  | 'achievement'
  | 'match_result'
  | 'photo_tagged'
  | 'streak';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  actor?: {
    name: string;
    avatarUrl?: string;
  };
  data?: {
    matchId?: string;
    commentId?: string;
    photoId?: string;
    achievementName?: string;
    achievementIcon?: string;
  };
}

interface NotificationContextValue {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
}

// ============================================
// CONTEXT
// ============================================

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
}

interface NotificationProviderProps {
  children: ReactNode;
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [toastQueue, setToastQueue] = useState<Notification[]>([]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const addNotification = useCallback((
    notification: Omit<Notification, 'id' | 'timestamp' | 'read'>
  ) => {
    const newNotification: Notification = {
      ...notification,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      read: false,
    };
    setNotifications((prev) => [newNotification, ...prev]);
    setToastQueue((prev) => [...prev, newNotification]);
  }, []);

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  // Auto-dismiss toasts
  useEffect(() => {
    if (toastQueue.length === 0) return;

    const timer = setTimeout(() => {
      setToastQueue((prev) => prev.slice(1));
    }, 4000);

    return () => clearTimeout(timer);
  }, [toastQueue]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        addNotification,
        markAsRead,
        markAllAsRead,
        clearAll,
      }}
    >
      {children}
      {/* Toast Container */}
      <div className="fixed top-4 right-4 z-50 space-y-2 pointer-events-none">
        {toastQueue.slice(0, 3).map((notification, index) => (
          <NotificationToast
            key={notification.id}
            notification={notification}
            onDismiss={() => {
              setToastQueue((prev) => prev.filter((n) => n.id !== notification.id));
            }}
            style={{
              animationDelay: `${index * 100}ms`,
            }}
          />
        ))}
      </div>
    </NotificationContext.Provider>
  );
}

// ============================================
// NOTIFICATION TOAST
// ============================================

interface NotificationToastProps {
  notification: Notification;
  onDismiss: () => void;
  style?: React.CSSProperties;
}

function NotificationToast({ notification, onDismiss, style }: NotificationToastProps) {
  const { icon, color } = getNotificationDisplay(notification.type);

  return (
    <div
      className="pointer-events-auto max-w-sm w-full p-4 rounded-xl shadow-lg animate-slide-in-right flex items-start gap-3"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--rule)',
        ...style,
      }}
    >
      <div
        className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
        style={{
          background: `${color}15`,
          color,
        }}
      >
        {icon}
      </div>

      <div className="flex-1 min-w-0">
        <p
          className="font-semibold text-sm"
          style={{ color: 'var(--ink)' }}
        >
          {notification.title}
        </p>
        <p
          className="text-xs mt-0.5 line-clamp-2"
          style={{ color: 'var(--ink-secondary)' }}
        >
          {notification.message}
        </p>
      </div>

      <button
        onClick={onDismiss}
        className="shrink-0 p-1 rounded-lg transition-colors"
        style={{ color: 'var(--ink-tertiary)' }}
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

// ============================================
// NOTIFICATION BELL
// ============================================

interface NotificationBellProps {
  onClick?: () => void;
  className?: string;
}

export function NotificationBell({ onClick, className }: NotificationBellProps) {
  const { unreadCount } = useNotifications();

  return (
    <button
      onClick={onClick}
      className={cn(
        'relative p-2 rounded-lg transition-colors',
        className
      )}
      style={{ color: 'var(--ink-secondary)' }}
      aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
    >
      <Bell className="w-6 h-6" />
      {unreadCount > 0 && (
        <span
          className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full text-[10px] font-bold bg-[var(--error)] text-[var(--canvas)]"
        >
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </button>
  );
}

// ============================================
// NOTIFICATION CENTER
// ============================================

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

export function NotificationCenter({
  isOpen,
  onClose,
  className,
}: NotificationCenterProps) {
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearAll } = useNotifications();

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-[color:var(--ink)]/40"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={cn(
          'fixed top-0 right-0 bottom-0 w-full max-w-sm z-50',
          'animate-slide-in-right',
          className
        )}
        style={{
          background: 'var(--canvas)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between p-4"
          style={{ borderBottom: '1px solid var(--rule)' }}
        >
          <div>
            <h2
              className="font-bold text-lg"
              style={{ color: 'var(--ink)' }}
            >
              Notifications
            </h2>
            {unreadCount > 0 && (
              <p
                className="text-sm"
                style={{ color: 'var(--ink-secondary)' }}
              >
                {unreadCount} unread
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="p-2 rounded-lg transition-colors"
                style={{ color: 'var(--masters)' }}
                title="Mark all as read"
              >
                <Check className="w-5 h-5" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-lg transition-colors"
              style={{ color: 'var(--ink-secondary)' }}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {notifications.length === 0 ? (
            <div className="py-12 text-center">
              <Bell
                className="w-12 h-12 mx-auto mb-4"
                style={{ color: 'var(--ink-tertiary)' }}
              />
              <p style={{ color: 'var(--ink-secondary)' }}>
                No notifications yet
              </p>
            </div>
          ) : (
            notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onRead={() => markAsRead(notification.id)}
              />
            ))
          )}
        </div>

        {/* Footer */}
        {notifications.length > 0 && (
          <div
            className="p-4"
            style={{ borderTop: '1px solid var(--rule)' }}
          >
            <button
              onClick={clearAll}
              className="w-full py-2 rounded-lg text-sm font-medium transition-colors"
              style={{
                background: 'var(--surface)',
                color: 'var(--ink-secondary)',
                border: '1px solid var(--rule)',
              }}
            >
              Clear all notifications
            </button>
          </div>
        )}
      </div>
    </>
  );
}

// ============================================
// NOTIFICATION ITEM
// ============================================

interface NotificationItemProps {
  notification: Notification;
  onRead: () => void;
}

function NotificationItem({ notification, onRead }: NotificationItemProps) {
  const { icon, color } = getNotificationDisplay(notification.type);

  return (
    <button
      onClick={onRead}
      className={cn(
        'w-full p-4 rounded-xl text-left transition-all',
        !notification.read && 'ring-1 ring-masters',
      )}
      style={{
        background: notification.read ? 'var(--surface)' : 'var(--surface-raised)',
        border: '1px solid var(--rule)',
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
          style={{
            background: `${color}15`,
            color,
          }}
        >
          {icon}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p
              className={cn('text-sm', !notification.read && 'font-semibold')}
              style={{ color: 'var(--ink)' }}
            >
              {notification.title}
            </p>
            {!notification.read && (
              <span
                className="w-2 h-2 rounded-full shrink-0 mt-1.5"
                style={{ background: 'var(--masters)' }}
              />
            )}
          </div>
          <p
            className="text-xs mt-0.5 line-clamp-2"
            style={{ color: 'var(--ink-secondary)' }}
          >
            {notification.message}
          </p>
          <p
            className="text-xs mt-1"
            style={{ color: 'var(--ink-tertiary)' }}
          >
            {formatRelativeTime(notification.timestamp)}
          </p>
        </div>
      </div>
    </button>
  );
}

// ============================================
// HELPERS
// ============================================

function getNotificationDisplay(type: NotificationType): {
  icon: React.ReactNode;
  color: string;
} {
  switch (type) {
    case 'comment':
      return {
        icon: <MessageCircle className="w-5 h-5" />,
        color: 'var(--team-europe)',
      };
    case 'reaction':
      return {
        icon: <Heart className="w-5 h-5" />,
        color: 'var(--error)',
      };
    case 'mention':
      return {
        icon: <AtSign className="w-5 h-5" />,
        color: 'var(--warning)',
      };
    case 'achievement':
      return {
        icon: <Award className="w-5 h-5" />,
        color: 'var(--warning)',
      };
    case 'match_result':
      return {
        icon: <Trophy className="w-5 h-5" />,
        color: 'var(--masters)',
      };
    case 'photo_tagged':
      return {
        icon: <Camera className="w-5 h-5" />,
        color: 'var(--team-usa)',
      };
    case 'streak':
      return {
        icon: <Trophy className="w-5 h-5" />,
        color: 'var(--error)',
      };
    default:
      return {
        icon: <Bell className="w-5 h-5" />,
        color: 'var(--ink-secondary)',
      };
  }
}

function formatRelativeTime(timestamp: string): string {
  const now = new Date();
  const date = new Date(timestamp);
  const diff = now.getTime() - date.getTime();

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default NotificationProvider;
