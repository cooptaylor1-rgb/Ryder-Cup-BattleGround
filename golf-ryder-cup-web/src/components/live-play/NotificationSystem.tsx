/**
 * Live Notification System
 *
 * A comprehensive notification system for real-time golf events.
 * Handles match updates, social activity, weather alerts, and more.
 *
 * Features:
 * - Push notification support (when available)
 * - In-app notification stack
 * - Sound/vibration options
 * - Priority-based queuing
 * - Auto-dismiss with configurable duration
 * - Action buttons for quick responses
 * - Notification grouping by type
 * - Respects user preferences
 */

'use client';

import { useState, useEffect, useCallback, createContext, useContext, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X,
    Bell,
    Trophy,
    MessageCircle,
    CloudRain,
    Flame,
    DollarSign,
    Camera,
    ChevronRight,
    Volume2,
    VolumeX,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useHaptic } from '@/lib/hooks/useHaptic';

// ============================================
// TYPES
// ============================================

export type NotificationType =
    | 'match_update'      // Score changed, match completed
    | 'match_complete'    // A match has finished
    | 'social'            // Trash talk, comments
    | 'weather'           // Weather alerts
    | 'side_bet'          // Side bet reminders/results
    | 'photo'             // New photo shared
    | 'achievement'       // Unlocked achievement
    | 'system';           // General system notifications

export type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface LiveNotification {
    id: string;
    type: NotificationType;
    title: string;
    message: string;
    priority: NotificationPriority;
    timestamp: number;
    read: boolean;
    dismissed: boolean;
    metadata?: {
        matchId?: string;
        playerId?: string;
        holeNumber?: number;
        team?: 'teamA' | 'teamB';
        imageUrl?: string;
        actionUrl?: string;
        [key: string]: unknown;
    };
    action?: {
        label: string;
        onClick: () => void;
    };
}

interface NotificationContextValue {
    notifications: LiveNotification[];
    unreadCount: number;
    addNotification: (notification: Omit<LiveNotification, 'id' | 'timestamp' | 'read' | 'dismissed'>) => void;
    dismissNotification: (id: string) => void;
    markAsRead: (id: string) => void;
    clearAll: () => void;
    soundEnabled: boolean;
    setSoundEnabled: (enabled: boolean) => void;
}

// ============================================
// VISUAL TOKENS
// ============================================

type NotificationToneClasses = {
    container: string;
    icon: string;
    title: string;
    message: string;
    action: string;
    dismiss: string;
    dismissIcon: string;
};

const NOTIFICATION_TONE_CLASSES: Record<NotificationPriority, NotificationToneClasses> = {
    urgent: {
        container: 'border border-[color:var(--error)]/45 bg-[color:var(--error)]/92 text-white',
        icon: 'bg-[color:var(--canvas)]/20 text-white',
        title: 'text-white',
        message: 'text-white/80',
        action: 'text-white/90 hover:text-white',
        dismiss: 'text-white/70 hover:text-white hover:bg-[color:var(--canvas)]/20',
        dismissIcon: 'text-white/70',
    },
    high: {
        container: 'border border-[color:var(--warning)]/40 bg-[color:var(--warning)]/92 text-white',
        icon: 'bg-[color:var(--canvas)]/20 text-white',
        title: 'text-white',
        message: 'text-white/85',
        action: 'text-white/90 hover:text-white',
        dismiss: 'text-white/70 hover:text-white hover:bg-[color:var(--canvas)]/20',
        dismissIcon: 'text-white/70',
    },
    medium: {
        container: 'border border-[color:var(--success)]/40 bg-[color:var(--success)]/92 text-white',
        icon: 'bg-[color:var(--canvas)]/20 text-white',
        title: 'text-white',
        message: 'text-white/85',
        action: 'text-white/90 hover:text-white',
        dismiss: 'text-white/70 hover:text-white hover:bg-[color:var(--canvas)]/20',
        dismissIcon: 'text-white/70',
    },
    low: {
        container: 'border border-[color:var(--rule)] bg-[var(--surface-raised)] text-[var(--ink-primary)]',
        icon: 'bg-[color:var(--surface)] text-[var(--ink-secondary)]',
        title: 'text-[var(--ink-primary)]',
        message: 'text-[var(--ink-secondary)]',
        action: 'text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]',
        dismiss: 'text-[var(--ink-tertiary)] hover:text-[var(--ink-secondary)] hover:bg-[color:var(--surface)]/70',
        dismissIcon: 'text-[var(--ink-tertiary)]',
    },
};

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

// ============================================
// PROVIDER
// ============================================

interface NotificationProviderProps {
    children: ReactNode;
    maxNotifications?: number;
    defaultSoundEnabled?: boolean;
}

export function NotificationProvider({
    children,
    maxNotifications = 50,
    defaultSoundEnabled = true,
}: NotificationProviderProps) {
    const [notifications, setNotifications] = useState<LiveNotification[]>([]);
    const [soundEnabled, setSoundEnabled] = useState(defaultSoundEnabled);
    const { trigger } = useHaptic();

    // Play notification sound
    const playSound = useCallback((priority: NotificationPriority) => {
        if (!soundEnabled) return;

        // Use Web Audio API for notification sounds
        try {
            const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            // Different tones for different priorities
            switch (priority) {
                case 'urgent':
                    oscillator.frequency.value = 880;
                    gainNode.gain.value = 0.3;
                    break;
                case 'high':
                    oscillator.frequency.value = 660;
                    gainNode.gain.value = 0.2;
                    break;
                case 'medium':
                    oscillator.frequency.value = 520;
                    gainNode.gain.value = 0.15;
                    break;
                default:
                    oscillator.frequency.value = 440;
                    gainNode.gain.value = 0.1;
            }

            oscillator.type = 'sine';
            oscillator.start();

            // Fade out
            gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.3);
            oscillator.stop(audioContext.currentTime + 0.3);
        } catch {
            // Audio not supported
        }
    }, [soundEnabled]);

    // Add notification
    const addNotification = useCallback((
        notification: Omit<LiveNotification, 'id' | 'timestamp' | 'read' | 'dismissed'>
    ) => {
        const newNotification: LiveNotification = {
            ...notification,
            id: crypto.randomUUID(),
            timestamp: Date.now(),
            read: false,
            dismissed: false,
        };

        setNotifications(prev => {
            const updated = [newNotification, ...prev];
            // Trim to max
            return updated.slice(0, maxNotifications);
        });

        // Haptic feedback based on priority
        switch (notification.priority) {
            case 'urgent':
                trigger('error');
                break;
            case 'high':
                trigger('warning');
                break;
            case 'medium':
                trigger('medium');
                break;
            default:
                trigger('light');
        }

        // Sound
        playSound(notification.priority);

        // Try native notification if supported and permitted
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(notification.title, {
                body: notification.message,
                icon: '/icons/icon-192x192.png',
                tag: newNotification.id,
                silent: !soundEnabled,
            });
        }
    }, [maxNotifications, trigger, playSound, soundEnabled]);

    // Dismiss notification
    const dismissNotification = useCallback((id: string) => {
        setNotifications(prev =>
            prev.map(n => n.id === id ? { ...n, dismissed: true } : n)
        );
    }, []);

    // Mark as read
    const markAsRead = useCallback((id: string) => {
        setNotifications(prev =>
            prev.map(n => n.id === id ? { ...n, read: true } : n)
        );
    }, []);

    // Clear all
    const clearAll = useCallback(() => {
        setNotifications([]);
    }, []);

    // Request notification permission on mount
    useEffect(() => {
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }, []);

    const unreadCount = notifications.filter(n => !n.read && !n.dismissed).length;

    return (
        <NotificationContext.Provider
            value={{
                notifications,
                unreadCount,
                addNotification,
                dismissNotification,
                markAsRead,
                clearAll,
                soundEnabled,
                setSoundEnabled,
            }}
        >
            {children}
        </NotificationContext.Provider>
    );
}

// ============================================
// NOTIFICATION TOAST COMPONENT
// ============================================

interface NotificationToastProps {
    notification: LiveNotification;
    onDismiss: () => void;
    onAction?: () => void;
    autoHideDuration?: number;
}

export function NotificationToast({
    notification,
    onDismiss,
    onAction: _onAction,
    autoHideDuration = 5000,
}: NotificationToastProps) {
    const { trigger } = useHaptic();
    const tone = NOTIFICATION_TONE_CLASSES[notification.priority] ?? NOTIFICATION_TONE_CLASSES.low;

    // Auto-dismiss
    useEffect(() => {
        if (notification.priority !== 'urgent') {
            const timer = setTimeout(onDismiss, autoHideDuration);
            return () => clearTimeout(timer);
        }
    }, [notification.priority, autoHideDuration, onDismiss]);

    const getIcon = () => {
        switch (notification.type) {
            case 'match_update':
            case 'match_complete':
                return <Trophy className="w-5 h-5" />;
            case 'social':
                return <MessageCircle className="w-5 h-5" />;
            case 'weather':
                return <CloudRain className="w-5 h-5" />;
            case 'side_bet':
                return <DollarSign className="w-5 h-5" />;
            case 'photo':
                return <Camera className="w-5 h-5" />;
            case 'achievement':
                return <Flame className="w-5 h-5" />;
            default:
                return <Bell className="w-5 h-5" />;
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={cn(
                'max-w-sm w-full p-4 rounded-2xl backdrop-blur-md border shadow-[var(--shadow-card-lg)]',
                'flex items-start gap-3 transition-colors',
                tone.container,
            )}
        >
            {/* Icon */}
            <div className={cn('shrink-0 p-2 rounded-xl transition-colors', tone.icon)}>
                {getIcon()}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <h4 className={cn('font-semibold text-sm', tone.title)}>
                    {notification.title}
                </h4>
                <p className={cn('mt-0.5 text-xs line-clamp-2', tone.message)}>
                    {notification.message}
                </p>

                {/* Action button */}
                {notification.action && (
                    <button
                        onClick={() => {
                            trigger('selection');
                            notification.action?.onClick();
                            onDismiss();
                        }}
                        className={cn(
                            'mt-2 flex items-center gap-1 text-xs font-medium transition-colors',
                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus-ring)]',
                            'focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--focus-ring-offset)]',
                            tone.action,
                        )}
                    >
                        {notification.action.label}
                        <ChevronRight className="w-3 h-3" />
                    </button>
                )}
            </div>

            {/* Dismiss button */}
            <button
                onClick={() => {
                    trigger('light');
                    onDismiss();
                }}
                className={cn(
                    'shrink-0 p-1 rounded-full transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus-ring)]',
                    'focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--focus-ring-offset)]',
                    tone.dismiss,
                )}
                aria-label="Dismiss"
            >
                <X className={cn('w-4 h-4 transition-colors', tone.dismissIcon)} />
            </button>
        </motion.div>
    );
}

// ============================================
// NOTIFICATION STACK COMPONENT
// ============================================

interface NotificationStackProps {
    maxVisible?: number;
    position?: 'top-right' | 'top-center' | 'bottom-right' | 'bottom-center';
}

export function NotificationStack({
    maxVisible = 3,
    position = 'top-right',
}: NotificationStackProps) {
    const { notifications, dismissNotification, markAsRead } = useNotifications();

    const visibleNotifications = notifications
        .filter(n => !n.dismissed)
        .slice(0, maxVisible);

    const positionClasses = {
        'top-right': 'top-4 right-4',
        'top-center': 'top-4 left-1/2 -translate-x-1/2',
        'bottom-right': 'bottom-24 right-4',
        'bottom-center': 'bottom-24 left-1/2 -translate-x-1/2',
    } as const;

    return (
        <div className={cn('fixed z-50 space-y-2', positionClasses[position])}>
            <AnimatePresence mode="popLayout">
                {visibleNotifications.map(notification => (
                    <NotificationToast
                        key={notification.id}
                        notification={notification}
                        onDismiss={() => {
                            markAsRead(notification.id);
                            dismissNotification(notification.id);
                        }}
                    />
                ))}
            </AnimatePresence>
        </div>
    );
}

// ============================================
// NOTIFICATION BELL COMPONENT
// ============================================

interface NotificationBellProps {
    className?: string;
    onClick?: () => void;
}

export function NotificationBell({ className, onClick }: NotificationBellProps) {
    const { unreadCount, soundEnabled, setSoundEnabled } = useNotifications();
    const { trigger } = useHaptic();

    return (
        <div className={cn('flex items-center gap-2', className)}>
            {/* Sound toggle */}
            <button
                onClick={() => {
                    trigger('selection');
                    setSoundEnabled(!soundEnabled);
                }}
                className={cn(
                    'p-2 rounded-full transition-colors',
                    'hover:bg-[color:var(--canvas-raised)]/15',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus-ring)]',
                    'focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--focus-ring-offset)]',
                )}
                aria-label={soundEnabled ? 'Mute notifications' : 'Unmute notifications'}
            >
                {soundEnabled ? (
                    <Volume2 className="w-5 h-5 text-[var(--ink-secondary)]" />
                ) : (
                    <VolumeX className="w-5 h-5 text-[var(--ink-tertiary)]" />
                )}
            </button>

            {/* Bell with badge */}
            <button
                onClick={() => {
                    trigger('medium');
                    onClick?.();
                }}
                className={cn(
                    'relative p-2 rounded-full transition-colors',
                    'hover:bg-[color:var(--canvas-raised)]/15',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus-ring)]',
                    'focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--focus-ring-offset)]',
                )}
                aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
            >
                <Bell className="w-5 h-5 text-[var(--ink-secondary)]" />
                {unreadCount > 0 && (
                    <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-[var(--error)] text-white text-[10px] font-bold shadow-[var(--shadow-card-sm)]"
                    >
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </motion.span>
                )}
            </button>
        </div>
    );
}

// ============================================
// DEFAULT EXPORT
// ============================================

export const NotificationSystem = {
    Provider: NotificationProvider,
    Stack: NotificationStack,
    Toast: NotificationToast,
    Bell: NotificationBell,
    useNotifications,
};

export default NotificationSystem;
