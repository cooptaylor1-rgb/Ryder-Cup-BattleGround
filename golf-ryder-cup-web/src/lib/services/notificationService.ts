/**
 * Push Notification Service (Production Quality)
 *
 * Handles push notifications for:
 * - Tee time reminders (45 min, 10 min before)
 * - Score updates from other players
 * - Match completion alerts
 * - Trip announcements
 *
 * Uses Web Push API with service worker integration.
 */

import { db } from '../db';
import type { RyderCupSession } from '../types/models';
import { notifyLogger } from '@/lib/utils/logger';

// ============================================
// TYPES
// ============================================

export type NotificationType =
    | 'tee-time-reminder'
    | 'score-update'
    | 'match-complete'
    | 'lineup-published'
    | 'session-starting';

export interface NotificationPreferences {
    enabled: boolean;
    teeTimeReminders: boolean;
    teeTimeLeadMinutes: number[]; // e.g., [45, 10]
    scoreUpdates: boolean;
    matchComplete: boolean;
    lineupPublished: boolean;
}

export interface ScheduledNotification {
    id: string;
    type: NotificationType;
    title: string;
    body: string;
    scheduledFor: string; // ISO date
    tripId: string;
    sessionId?: string;
    matchId?: string;
    sent: boolean;
}

// ============================================
// CONSTANTS
// ============================================

const STORAGE_KEY = 'notification-preferences';
const SCHEDULED_KEY = 'scheduled-notifications';

const DEFAULT_PREFERENCES: NotificationPreferences = {
    enabled: false,
    teeTimeReminders: true,
    teeTimeLeadMinutes: [45, 10],
    scoreUpdates: true,
    matchComplete: true,
    lineupPublished: true,
};

// ============================================
// STATE
// ============================================

let notificationPermission: NotificationPermission = 'default';
let scheduledNotifications: ScheduledNotification[] = [];
let checkInterval: ReturnType<typeof setInterval> | null = null;

// ============================================
// INITIALIZATION
// ============================================

/**
 * Initialize the notification service
 */
export function initNotificationService(): void {
    if (typeof window === 'undefined' || !('Notification' in window)) {
        notifyLogger.log('Not supported in this browser');
        return;
    }

    notificationPermission = Notification.permission;
    loadScheduledNotifications();
    startNotificationChecker();

    notifyLogger.log('Service initialized, permission:', notificationPermission);
}

/**
 * Request notification permission from user
 */
export async function requestNotificationPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
        return false;
    }

    if (Notification.permission === 'granted') {
        notificationPermission = 'granted';
        return true;
    }

    if (Notification.permission === 'denied') {
        notificationPermission = 'denied';
        return false;
    }

    try {
        const permission = await Notification.requestPermission();
        notificationPermission = permission;

        if (permission === 'granted') {
            // Save preference
            const prefs = getPreferences();
            prefs.enabled = true;
            savePreferences(prefs);
            return true;
        }

        return false;
    } catch (error) {
        notifyLogger.error('Permission request failed:', error);
        return false;
    }
}

/**
 * Check if notifications are available and enabled
 */
export function canSendNotifications(): boolean {
    return (
        typeof window !== 'undefined' &&
        'Notification' in window &&
        Notification.permission === 'granted' &&
        getPreferences().enabled
    );
}

// ============================================
// PREFERENCES
// ============================================

/**
 * Get notification preferences
 */
export function getPreferences(): NotificationPreferences {
    if (typeof window === 'undefined') return DEFAULT_PREFERENCES;

    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            return { ...DEFAULT_PREFERENCES, ...JSON.parse(stored) };
        }
    } catch {
        // Ignore parse errors
    }

    return DEFAULT_PREFERENCES;
}

/**
 * Save notification preferences
 */
export function savePreferences(prefs: NotificationPreferences): void {
    if (typeof window === 'undefined') return;

    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    } catch (error) {
        notifyLogger.error('Failed to save preferences:', error);
    }
}

/**
 * Update a single preference
 */
export function updatePreference<K extends keyof NotificationPreferences>(
    key: K,
    value: NotificationPreferences[K]
): void {
    const prefs = getPreferences();
    prefs[key] = value;
    savePreferences(prefs);
}

// ============================================
// SENDING NOTIFICATIONS
// ============================================

/**
 * Send an immediate notification
 */
export async function sendNotification(
    title: string,
    options?: NotificationOptions & { type?: NotificationType }
): Promise<boolean> {
    if (!canSendNotifications()) {
        notifyLogger.log('Cannot send - not enabled or permitted');
        return false;
    }

    try {
        // Check preference for this type
        const prefs = getPreferences();
        const type = options?.type;

        if (type === 'score-update' && !prefs.scoreUpdates) return false;
        if (type === 'match-complete' && !prefs.matchComplete) return false;
        if (type === 'lineup-published' && !prefs.lineupPublished) return false;
        if (type === 'tee-time-reminder' && !prefs.teeTimeReminders) return false;

        // Try service worker notification first (works when app is in background)
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            const registration = await navigator.serviceWorker.ready;
            await registration.showNotification(title, {
                icon: '/icons/icon-192.png',
                badge: '/icons/icon-72.png',
                tag: options?.tag || `notification-${Date.now()}`,
                ...options,
            } as NotificationOptions);
        } else {
            // Fallback to regular notification
            new Notification(title, {
                icon: '/icons/icon-192.png',
                ...options,
            });
        }

        return true;
    } catch (error) {
        notifyLogger.error('Failed to send:', error);
        return false;
    }
}

// ============================================
// SCHEDULED NOTIFICATIONS
// ============================================

function loadScheduledNotifications(): void {
    if (typeof window === 'undefined') return;

    try {
        const stored = localStorage.getItem(SCHEDULED_KEY);
        if (stored) {
            scheduledNotifications = JSON.parse(stored);
        }
    } catch {
        scheduledNotifications = [];
    }
}

function saveScheduledNotifications(): void {
    if (typeof window === 'undefined') return;

    try {
        localStorage.setItem(SCHEDULED_KEY, JSON.stringify(scheduledNotifications));
    } catch (error) {
        notifyLogger.error('Failed to save scheduled:', error);
    }
}

/**
 * Schedule a notification for a future time
 */
export function scheduleNotification(notification: Omit<ScheduledNotification, 'id' | 'sent'>): string {
    const id = `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    scheduledNotifications.push({
        ...notification,
        id,
        sent: false,
    });

    saveScheduledNotifications();
    return id;
}

/**
 * Cancel a scheduled notification
 */
export function cancelScheduledNotification(id: string): void {
    scheduledNotifications = scheduledNotifications.filter((n) => n.id !== id);
    saveScheduledNotifications();
}

/**
 * Cancel all scheduled notifications for a session
 */
export function cancelSessionNotifications(sessionId: string): void {
    scheduledNotifications = scheduledNotifications.filter((n) => n.sessionId !== sessionId);
    saveScheduledNotifications();
}

/**
 * Start the notification checker interval
 */
function startNotificationChecker(): void {
    if (checkInterval) return;

    // Check every minute
    checkInterval = setInterval(() => {
        checkScheduledNotifications();
    }, 60 * 1000);

    // Also check immediately
    checkScheduledNotifications();
}

/**
 * Check and send any due notifications
 */
function checkScheduledNotifications(): void {
    const now = new Date();

    for (const notification of scheduledNotifications) {
        if (notification.sent) continue;

        const scheduledTime = new Date(notification.scheduledFor);
        if (scheduledTime <= now) {
            // Send the notification
            sendNotification(notification.title, {
                body: notification.body,
                type: notification.type,
                tag: notification.id,
            });

            // Mark as sent
            notification.sent = true;
        }
    }

    // Clean up old sent notifications (older than 24 hours)
    const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
    scheduledNotifications = scheduledNotifications.filter(
        (n) => !n.sent || new Date(n.scheduledFor).getTime() > dayAgo
    );

    saveScheduledNotifications();
}

// ============================================
// TEE TIME REMINDERS
// ============================================

/**
 * Schedule tee time reminders for a session
 */
export async function scheduleTeeTimeReminders(
    session: RyderCupSession,
    tripName: string
): Promise<string[]> {
    const prefs = getPreferences();
    if (!prefs.teeTimeReminders || !session.scheduledDate) {
        return [];
    }

    // Cancel any existing reminders for this session
    cancelSessionNotifications(session.id);

    const scheduledIds: string[] = [];

    // Parse tee time
    let teeTime: Date;
    if (session.timeSlot) {
        // If we have a time slot like "AM" or "PM" or "8:00 AM"
        const dateStr = session.scheduledDate.split('T')[0];
        if (session.timeSlot.includes(':')) {
            teeTime = new Date(`${dateStr}T${convertTo24Hour(session.timeSlot)}`);
        } else if (session.timeSlot === 'AM') {
            teeTime = new Date(`${dateStr}T08:00:00`);
        } else if (session.timeSlot === 'PM') {
            teeTime = new Date(`${dateStr}T13:00:00`);
        } else {
            teeTime = new Date(session.scheduledDate);
        }
    } else {
        teeTime = new Date(session.scheduledDate);
    }

    // Schedule reminders for each lead time
    for (const leadMinutes of prefs.teeTimeLeadMinutes) {
        const reminderTime = new Date(teeTime.getTime() - leadMinutes * 60 * 1000);

        // Only schedule if reminder time is in the future
        if (reminderTime > new Date()) {
            const id = scheduleNotification({
                type: 'tee-time-reminder',
                title: `⛳ Tee Time in ${leadMinutes} minutes`,
                body: `${session.name} - ${tripName}`,
                scheduledFor: reminderTime.toISOString(),
                tripId: session.tripId,
                sessionId: session.id,
            });
            scheduledIds.push(id);
        }
    }

    return scheduledIds;
}

/**
 * Schedule reminders for all upcoming sessions in a trip
 */
export async function scheduleAllTeeTimeReminders(tripId: string): Promise<number> {
    const trip = await db.trips.get(tripId);
    if (!trip) return 0;

    const sessions = await db.sessions.where('tripId').equals(tripId).toArray();
    let scheduled = 0;

    for (const session of sessions) {
        if (session.status !== 'completed') {
            const ids = await scheduleTeeTimeReminders(session, trip.name);
            scheduled += ids.length;
        }
    }

    notifyLogger.log(`Scheduled ${scheduled} tee time reminders`);
    return scheduled;
}

// ============================================
// SCORE UPDATE NOTIFICATIONS
// ============================================

/**
 * Send a score update notification
 */
export function notifyScoreUpdate(
    matchDescription: string,
    score: string,
    tripName: string
): void {
    const prefs = getPreferences();
    if (!prefs.scoreUpdates) return;

    sendNotification('🏌️ Score Update', {
        body: `${matchDescription}: ${score}`,
        type: 'score-update',
        tag: `score-${Date.now()}`,
        data: { tripName },
    });
}

/**
 * Send a match complete notification
 */
export function notifyMatchComplete(
    matchDescription: string,
    result: string,
    tripName: string
): void {
    const prefs = getPreferences();
    if (!prefs.matchComplete) return;

    sendNotification('🏆 Match Complete', {
        body: `${matchDescription}: ${result}`,
        type: 'match-complete',
        tag: `match-complete-${Date.now()}`,
        data: { tripName },
    });
}

/**
 * Send a lineup published notification
 */
export function notifyLineupPublished(sessionName: string, tripName: string): void {
    const prefs = getPreferences();
    if (!prefs.lineupPublished) return;

    sendNotification('📋 Lineup Published', {
        body: `${sessionName} pairings are ready - ${tripName}`,
        type: 'lineup-published',
        tag: `lineup-${Date.now()}`,
        data: { tripName },
    });
}

// ============================================
// HELPERS
// ============================================

function convertTo24Hour(time12h: string): string {
    const [time, modifier] = time12h.split(' ');
    // eslint-disable-next-line prefer-const
    let [hours, minutes] = time.split(':').map(Number);

    if (modifier === 'PM' && hours !== 12) {
        hours += 12;
    } else if (modifier === 'AM' && hours === 12) {
        hours = 0;
    }

    return `${hours.toString().padStart(2, '0')}:${(minutes || 0).toString().padStart(2, '0')}:00`;
}

/**
 * Get count of pending scheduled notifications
 */
export function getPendingNotificationCount(): number {
    return scheduledNotifications.filter((n) => !n.sent).length;
}

/**
 * Get all scheduled notifications for a trip
 */
export function getTripNotifications(tripId: string): ScheduledNotification[] {
    return scheduledNotifications.filter((n) => n.tripId === tripId && !n.sent);
}
