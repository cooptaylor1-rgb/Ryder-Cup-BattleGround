/**
 * Utility functions for styling and common operations
 */

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind classes with clsx
 * Handles conditional classes and deduplication
 */
export function cn(...inputs: ClassValue[]): string {
    return twMerge(clsx(inputs));
}

/**
 * Format a score for display
 * @param score - Score to format
 * @param showPlus - Whether to show + for positive scores
 */
export function formatScore(score: number, showPlus = false): string {
    if (score === 0) return 'E';
    if (score > 0) return showPlus ? `+${score}` : String(score);
    return String(score);
}

/**
 * Format match score for display
 * @param score - Score differential (positive = Team A leads)
 * @param holesRemaining - Holes left to play
 */
export function formatMatchScore(
    score: number,
    holesRemaining: number
): string {
    if (score === 0) return 'AS';

    const absScore = Math.abs(score);
    const isClosedOut = absScore > holesRemaining;

    if (isClosedOut) {
        return `${absScore}&${holesRemaining}`;
    }

    return `${absScore} ${score > 0 ? 'UP' : 'DN'}`;
}

/**
 * Format player name for display
 * @param firstName - Player's first name
 * @param lastName - Player's last name
 * @param format - Display format
 */
export function formatPlayerName(
    firstName: string,
    lastName: string,
    format: 'full' | 'short' | 'initials' = 'full'
): string {
    switch (format) {
        case 'short':
            return `${firstName.charAt(0)}. ${lastName}`;
        case 'initials':
            return `${firstName.charAt(0)}${lastName.charAt(0)}`;
        default:
            return `${firstName} ${lastName}`;
    }
}

/**
 * Format a handicap index for display.
 *
 * @param handicapIndex - The handicap index
 * @returns Formatted string (e.g., "10.4" or "+2.1" for plus handicap)
 */
export function formatHandicapIndex(handicapIndex: number): string {
    if (handicapIndex < 0) {
        return `+${Math.abs(handicapIndex).toFixed(1)}`;
    }
    return handicapIndex.toFixed(1);
}

/**
 * Format date for display
 * @param date - Date to format
 * @param format - Display format
 */
export function formatDate(
    date: Date | string,
    format: 'full' | 'short' | 'day' = 'short'
): string {
    const d = typeof date === 'string' ? new Date(date) : date;

    switch (format) {
        case 'full':
            return d.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
            });
        case 'day':
            return d.toLocaleDateString('en-US', {
                weekday: 'short',
            });
        default:
            return d.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
            });
    }
}

/**
 * Format time for display
 * @param date - Date to format
 */
export function formatTime(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
    });
}

/**
 * Get team color class
 * @param team - Team identifier
 * @param variant - Color variant
 */
export function getTeamColorClass(
    team: 'usa' | 'europe' | 'teamA' | 'teamB',
    variant: 'bg' | 'text' | 'border' = 'bg'
): string {
    const color = team === 'usa' || team === 'teamA' ? 'team-usa' : 'team-europe';
    return `${variant}-${color}`;
}

/**
 * Get hole winner indicator styles
 * @param winner - Who won the hole
 */
export function getWinnerStyles(
    winner: 'teamA' | 'teamB' | 'halved' | 'none'
): string {
    switch (winner) {
        case 'teamA':
            return 'bg-team-usa text-[var(--canvas)]';
        case 'teamB':
            return 'bg-team-europe text-[var(--canvas)]';
        case 'halved':
            return 'bg-[color:var(--ink-tertiary)]/12 text-[var(--ink-secondary)]';
        default:
            return 'bg-[color:var(--ink-tertiary)]/8 text-[var(--ink-tertiary)]';
    }
}

/**
 * Debounce function
 * @param fn - Function to debounce
 * @param delay - Delay in milliseconds
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
    fn: T,
    delay: number
): (...args: Parameters<T>) => void {
    let timeoutId: ReturnType<typeof setTimeout>;

    return (...args: Parameters<T>) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fn(...args), delay);
    };
}

/**
 * Throttle function
 * @param fn - Function to throttle
 * @param limit - Time limit in milliseconds
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
    fn: T,
    limit: number
): (...args: Parameters<T>) => void {
    let inThrottle = false;

    return (...args: Parameters<T>) => {
        if (!inThrottle) {
            fn(...args);
            inThrottle = true;
            setTimeout(() => {
                inThrottle = false;
            }, limit);
        }
    };
}

/**
 * Generate initials from name
 * @param name - Full name
 * @param maxLength - Maximum initials length
 */
export function getInitials(name: string, maxLength = 2): string {
    return name
        .split(' ')
        .map(part => part.charAt(0).toUpperCase())
        .slice(0, maxLength)
        .join('');
}

/**
 * Pluralize a word
 * @param count - Count
 * @param singular - Singular form
 * @param plural - Plural form (defaults to singular + 's')
 */
export function pluralize(
    count: number,
    singular: string,
    plural?: string
): string {
    if (count === 1) return `${count} ${singular}`;
    return `${count} ${plural || `${singular}s`}`;
}

/**
 * Safe array access
 * @param arr - Array to access
 * @param index - Index to access
 * @param defaultValue - Default value if out of bounds
 */
export function safeArrayAccess<T>(
    arr: T[],
    index: number,
    defaultValue: T
): T {
    if (index < 0 || index >= arr.length) return defaultValue;
    return arr[index];
}

/**
 * Group array by key
 * @param arr - Array to group
 * @param key - Key to group by
 */
export function groupBy<T>(arr: T[], key: keyof T): Record<string, T[]> {
    return arr.reduce((acc, item) => {
        const groupKey = String(item[key]);
        if (!acc[groupKey]) {
            acc[groupKey] = [];
        }
        acc[groupKey].push(item);
        return acc;
    }, {} as Record<string, T[]>);
}

// Re-export countdown utilities
export * from './countdown';

// Re-export error handling utilities
export * from './errorHandling';

// Re-export fetch utilities
export * from './fetchWithTimeout';

// Re-export safe storage utilities
export * from './safeStorage';

// Re-export sanitization utilities
export * from './sanitize';

// Re-export environment validation utilities
export * from './validateEnv';
