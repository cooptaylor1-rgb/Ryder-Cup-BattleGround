/**
 * Countdown Utility Functions
 *
 * Provides countdown time formatting for tee times and events.
 * Part of Phase 3 UX improvements.
 */

export interface CountdownResult {
    /** Formatted display string (e.g., "45 min", "2 hr 30 min", "Tomorrow") */
    display: string;
    /** Countdown category for styling */
    urgency: 'imminent' | 'soon' | 'upcoming' | 'later' | 'past';
    /** Total minutes until the event */
    totalMinutes: number;
    /** Whether the event has passed */
    isPast: boolean;
}

/**
 * Parse date inputs.
 *
 * IMPORTANT: A bare YYYY-MM-DD string is interpreted as a *local* date to avoid timezone surprises.
 */
function parseDate(input: Date | string): Date {
    if (input instanceof Date) return input;
    if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
        const [y, m, d] = input.split('-').map(Number);
        return new Date(y, m - 1, d);
    }
    return new Date(input);
}

/**
 * Calculate countdown to a future datetime
 */
export function getCountdown(targetDate: Date | string): CountdownResult {
    const target = parseDate(targetDate);
    const now = new Date();
    const diffMs = target.getTime() - now.getTime();
    const totalMinutes = Math.floor(diffMs / (1000 * 60));
    const totalHours = Math.floor(totalMinutes / 60);
    const totalDays = Math.floor(totalHours / 24);

    // Past event
    if (diffMs < 0) {
        const pastMinutes = Math.abs(totalMinutes);
        const pastHours = Math.floor(pastMinutes / 60);

        if (pastMinutes < 60) {
            return {
                display: `${pastMinutes} min ago`,
                urgency: 'past',
                totalMinutes,
                isPast: true,
            };
        }
        if (pastHours < 24) {
            return {
                display: `${pastHours} hr ago`,
                urgency: 'past',
                totalMinutes,
                isPast: true,
            };
        }
        return {
            display: 'Completed',
            urgency: 'past',
            totalMinutes,
            isPast: true,
        };
    }

    // Very soon (< 30 minutes)
    if (totalMinutes < 30) {
        if (totalMinutes < 1) {
            return {
                display: 'Now!',
                urgency: 'imminent',
                totalMinutes,
                isPast: false,
            };
        }
        return {
            display: `${totalMinutes} min`,
            urgency: 'imminent',
            totalMinutes,
            isPast: false,
        };
    }

    // Soon (30 min - 2 hours)
    if (totalMinutes < 120) {
        const hours = Math.floor(totalMinutes / 60);
        const mins = totalMinutes % 60;
        if (hours > 0 && mins > 0) {
            return {
                display: `${hours} hr ${mins} min`,
                urgency: 'soon',
                totalMinutes,
                isPast: false,
            };
        }
        return {
            display: `${totalMinutes} min`,
            urgency: 'soon',
            totalMinutes,
            isPast: false,
        };
    }

    // Today (2+ hours)
    if (totalDays === 0) {
        return {
            display: `${totalHours} hr`,
            urgency: 'upcoming',
            totalMinutes,
            isPast: false,
        };
    }

    // Tomorrow
    if (totalDays === 1) {
        return {
            display: 'Tomorrow',
            urgency: 'later',
            totalMinutes,
            isPast: false,
        };
    }

    // Future days
    return {
        display: `${totalDays} days`,
        urgency: 'later',
        totalMinutes,
        isPast: false,
    };
}

/**
 * Get a short countdown display for badges
 */
export function getShortCountdown(targetDate: Date | string): string {
    const countdown = getCountdown(targetDate);

    if (countdown.isPast) return '';
    if (countdown.urgency === 'imminent') return countdown.display;
    if (countdown.urgency === 'soon') {
        // Simplify for badge: just show hours
        const hours = Math.ceil(countdown.totalMinutes / 60);
        return `${hours}h`;
    }
    return countdown.display;
}

/**
 * Get urgency color for countdown display
 */
export function getCountdownColor(urgency: CountdownResult['urgency']): string {
    switch (urgency) {
        case 'imminent':
            return 'var(--error)'; // Red - tee off now!
        case 'soon':
            return 'var(--warning)'; // Orange - coming up
        case 'upcoming':
            return 'var(--masters)'; // Green - today
        case 'later':
            return 'var(--ink-tertiary)'; // Gray - future
        case 'past':
            return 'var(--ink-muted)'; // Dimmed
        default:
            return 'var(--ink-secondary)';
    }
}

/**
 * Check if a tee time is today
 */
export function isToday(date: Date | string): boolean {
    const target = parseDate(date);
    const today = new Date();
    return (
        target.getDate() === today.getDate() &&
        target.getMonth() === today.getMonth() &&
        target.getFullYear() === today.getFullYear()
    );
}

/**
 * Format tee time with countdown context
 */
export function formatTeeTime(
    date: Date | string,
    options?: { showCountdown?: boolean }
): { time: string; countdown?: string; urgency?: CountdownResult['urgency'] } {
    const target = parseDate(date);
    const time = target.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
    });

    if (!options?.showCountdown) {
        return { time };
    }

    const countdown = getCountdown(target);
    return {
        time,
        countdown: countdown.display,
        urgency: countdown.urgency,
    };
}
