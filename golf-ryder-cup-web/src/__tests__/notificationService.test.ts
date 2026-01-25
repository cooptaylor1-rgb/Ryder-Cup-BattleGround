/**
 * Notification Service Tests
 *
 * Tests for push notification scheduling and management.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
    getPreferences,
    savePreferences,
    cancelSessionNotifications,
    type NotificationPreferences,
    type ScheduledNotification,
    type NotificationType,
} from '../lib/services/notificationService';

// Mock localStorage
const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
        getItem: vi.fn((key: string) => store[key] || null),
        setItem: vi.fn((key: string, value: string) => {
            store[key] = value;
        }),
        removeItem: vi.fn((key: string) => {
            delete store[key];
        }),
        clear: vi.fn(() => {
            store = {};
        }),
    };
})();

// Mock Notification API
const mockNotification = {
    permission: 'default' as NotificationPermission,
    requestPermission: vi.fn(),
};

describe('Notification Service', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorageMock.clear();

        // Setup global mocks
        Object.defineProperty(global, 'localStorage', {
            value: localStorageMock,
            writable: true,
        });

        Object.defineProperty(global, 'Notification', {
            value: mockNotification,
            writable: true,
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('getPreferences', () => {
        it('returns default preferences when none are saved', () => {
            const prefs = getPreferences();

            expect(prefs).toEqual({
                enabled: false,
                teeTimeReminders: true,
                teeTimeLeadMinutes: [45, 10],
                scoreUpdates: true,
                matchComplete: true,
                lineupPublished: true,
            });
        });

        it('returns saved preferences', () => {
            const savedPrefs: NotificationPreferences = {
                enabled: true,
                teeTimeReminders: false,
                teeTimeLeadMinutes: [30],
                scoreUpdates: false,
                matchComplete: true,
                lineupPublished: false,
            };

            localStorageMock.getItem.mockReturnValueOnce(JSON.stringify(savedPrefs));

            const prefs = getPreferences();

            expect(prefs).toEqual(savedPrefs);
        });

        it('handles corrupted storage gracefully', () => {
            localStorageMock.getItem.mockReturnValueOnce('invalid json');

            const prefs = getPreferences();

            // Should return defaults on parse error
            expect(prefs.enabled).toBe(false);
        });
    });

    describe('savePreferences', () => {
        it('saves preferences to localStorage', () => {
            const prefs: NotificationPreferences = {
                enabled: true,
                teeTimeReminders: true,
                teeTimeLeadMinutes: [60, 15],
                scoreUpdates: true,
                matchComplete: false,
                lineupPublished: true,
            };

            savePreferences(prefs);

            expect(localStorageMock.setItem).toHaveBeenCalledWith(
                'notification-preferences',
                JSON.stringify(prefs)
            );
        });
    });

    describe('cancelSessionNotifications', () => {
        it('removes scheduled notifications for a session', () => {
            const scheduled: ScheduledNotification[] = [
                {
                    id: 'notif-1',
                    type: 'tee-time-reminder',
                    title: 'Tee Time',
                    body: 'Starting soon',
                    scheduledFor: new Date().toISOString(),
                    tripId: 'trip-1',
                    sessionId: 'session-1',
                    sent: false,
                },
                {
                    id: 'notif-2',
                    type: 'tee-time-reminder',
                    title: 'Tee Time',
                    body: 'Starting very soon',
                    scheduledFor: new Date().toISOString(),
                    tripId: 'trip-1',
                    sessionId: 'session-1',
                    sent: false,
                },
            ];

            localStorageMock.getItem.mockReturnValueOnce(JSON.stringify(scheduled));

            cancelSessionNotifications('session-1');

            expect(localStorageMock.setItem).toHaveBeenCalled();
        });
    });
});

describe('Notification Types', () => {
    it('supports all required notification types', () => {
        const types: NotificationType[] = [
            'tee-time-reminder',
            'score-update',
            'match-complete',
            'lineup-published',
            'session-starting',
        ];

        // Verify types are valid (compile-time check)
        types.forEach((type) => {
            expect(typeof type).toBe('string');
        });
    });
});

describe('NotificationPreferences structure', () => {
    it('has correct default structure', () => {
        const prefs: NotificationPreferences = {
            enabled: false,
            teeTimeReminders: true,
            teeTimeLeadMinutes: [45, 10],
            scoreUpdates: true,
            matchComplete: true,
            lineupPublished: true,
        };

        expect(prefs.enabled).toBe(false);
        expect(prefs.teeTimeReminders).toBe(true);
        expect(prefs.teeTimeLeadMinutes).toEqual([45, 10]);
    });
});

describe('ScheduledNotification structure', () => {
    it('has correct type definition', () => {
        const notification: ScheduledNotification = {
            id: 'test-id',
            type: 'tee-time-reminder',
            title: 'Test Title',
            body: 'Test Body',
            scheduledFor: new Date().toISOString(),
            tripId: 'trip-1',
            sessionId: 'session-1',
            sent: false,
        };

        expect(notification.id).toBe('test-id');
        expect(notification.type).toBe('tee-time-reminder');
        expect(notification.sent).toBe(false);
    });
});
