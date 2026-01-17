/**
 * Countdown Utility Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
    getCountdown,
    getShortCountdown,
    getCountdownColor,
    isToday,
    formatTeeTime,
} from '@/lib/utils/countdown';

describe('Countdown Utilities', () => {
    beforeEach(() => {
        // Use fake timers for predictable date handling
        vi.useFakeTimers();
        // Set "now" to January 17, 2026, 10:00 AM
        vi.setSystemTime(new Date('2026-01-17T10:00:00'));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe('getCountdown', () => {
        it('returns "Now!" for events happening in less than a minute', () => {
            const target = new Date('2026-01-17T10:00:30'); // 30 seconds from now
            const result = getCountdown(target);
            expect(result.display).toBe('Now!');
            expect(result.urgency).toBe('imminent');
            expect(result.isPast).toBe(false);
        });

        it('returns minutes for events less than 30 minutes away', () => {
            const target = new Date('2026-01-17T10:15:00'); // 15 minutes from now
            const result = getCountdown(target);
            expect(result.display).toBe('15 min');
            expect(result.urgency).toBe('imminent');
            expect(result.isPast).toBe(false);
        });

        it('returns urgency "soon" for events 30-120 minutes away', () => {
            const target = new Date('2026-01-17T10:45:00'); // 45 minutes from now
            const result = getCountdown(target);
            expect(result.display).toBe('45 min');
            expect(result.urgency).toBe('soon');
            expect(result.isPast).toBe(false);
        });

        it('returns hours and minutes for events 1-2 hours away', () => {
            const target = new Date('2026-01-17T11:30:00'); // 1.5 hours from now
            const result = getCountdown(target);
            expect(result.display).toBe('1 hr 30 min');
            expect(result.urgency).toBe('soon');
            expect(result.isPast).toBe(false);
        });

        it('returns hours for events 2+ hours away same day', () => {
            const target = new Date('2026-01-17T14:00:00'); // 4 hours from now
            const result = getCountdown(target);
            expect(result.display).toBe('4 hr');
            expect(result.urgency).toBe('upcoming');
            expect(result.isPast).toBe(false);
        });

        it('returns "Tomorrow" for events the next day', () => {
            const target = new Date('2026-01-18T10:00:00'); // Tomorrow
            const result = getCountdown(target);
            expect(result.display).toBe('Tomorrow');
            expect(result.urgency).toBe('later');
            expect(result.isPast).toBe(false);
        });

        it('returns days for events multiple days away', () => {
            const target = new Date('2026-01-20T10:00:00'); // 3 days from now
            const result = getCountdown(target);
            expect(result.display).toBe('3 days');
            expect(result.urgency).toBe('later');
            expect(result.isPast).toBe(false);
        });

        it('handles past events correctly', () => {
            const target = new Date('2026-01-17T09:30:00'); // 30 minutes ago
            const result = getCountdown(target);
            expect(result.display).toBe('30 min ago');
            expect(result.urgency).toBe('past');
            expect(result.isPast).toBe(true);
        });

        it('handles events completed hours ago', () => {
            const target = new Date('2026-01-17T07:00:00'); // 3 hours ago
            const result = getCountdown(target);
            expect(result.display).toBe('3 hr ago');
            expect(result.urgency).toBe('past');
            expect(result.isPast).toBe(true);
        });

        it('handles events completed more than 24 hours ago', () => {
            const target = new Date('2026-01-15T10:00:00'); // 2 days ago
            const result = getCountdown(target);
            expect(result.display).toBe('Completed');
            expect(result.urgency).toBe('past');
            expect(result.isPast).toBe(true);
        });

        it('accepts string dates', () => {
            const result = getCountdown('2026-01-17T10:15:00');
            expect(result.display).toBe('15 min');
            expect(result.urgency).toBe('imminent');
        });
    });

    describe('getShortCountdown', () => {
        it('returns display for imminent events', () => {
            const target = new Date('2026-01-17T10:15:00');
            const result = getShortCountdown(target);
            expect(result).toBe('15 min');
        });

        it('returns hours for events a bit further away', () => {
            const target = new Date('2026-01-17T10:45:00');
            const result = getShortCountdown(target);
            expect(result).toBe('1h'); // Rounds up to 1 hour
        });

        it('returns empty string for past events', () => {
            const target = new Date('2026-01-17T09:00:00');
            const result = getShortCountdown(target);
            expect(result).toBe('');
        });
    });

    describe('getCountdownColor', () => {
        it('returns error color for imminent', () => {
            expect(getCountdownColor('imminent')).toBe('var(--error)');
        });

        it('returns warning color for soon', () => {
            expect(getCountdownColor('soon')).toBe('var(--warning)');
        });

        it('returns masters green for upcoming', () => {
            expect(getCountdownColor('upcoming')).toBe('var(--masters)');
        });

        it('returns tertiary ink for later', () => {
            expect(getCountdownColor('later')).toBe('var(--ink-tertiary)');
        });

        it('returns muted ink for past', () => {
            expect(getCountdownColor('past')).toBe('var(--ink-muted)');
        });
    });

    describe('isToday', () => {
        it('returns true for today', () => {
            expect(isToday(new Date('2026-01-17T15:00:00'))).toBe(true);
        });

        it('returns false for tomorrow', () => {
            expect(isToday(new Date('2026-01-18T10:00:00'))).toBe(false);
        });

        it('returns false for yesterday', () => {
            expect(isToday(new Date('2026-01-16T10:00:00'))).toBe(false);
        });

        it('accepts string dates', () => {
            expect(isToday('2026-01-17')).toBe(true);
        });
    });

    describe('formatTeeTime', () => {
        it('returns just the time without countdown option', () => {
            const result = formatTeeTime(new Date('2026-01-17T14:30:00'));
            expect(result.time).toBe('2:30 PM');
            expect(result.countdown).toBeUndefined();
        });

        it('returns time and countdown with option', () => {
            const result = formatTeeTime(new Date('2026-01-17T14:30:00'), { showCountdown: true });
            expect(result.time).toBe('2:30 PM');
            expect(result.countdown).toBe('4 hr');
            expect(result.urgency).toBe('upcoming');
        });
    });
});
