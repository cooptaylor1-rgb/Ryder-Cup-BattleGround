/**
 * Utils Test Suite
 *
 * Tests for core utility functions in lib/utils/index.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
    cn,
    formatScore,
    formatMatchScore,
    formatPlayerName,
    formatHandicapIndex,
    formatDate,
    formatTime,
    getTeamColorClass,
    getWinnerStyles,
    debounce,
    throttle,
    getInitials,
    pluralize,
    safeArrayAccess,
    groupBy,
} from '@/lib/utils';

// ============================================
// cn (className merger)
// ============================================

describe('cn - className merger', () => {
    it('merges multiple class strings', () => {
        expect(cn('foo', 'bar')).toBe('foo bar');
    });

    it('handles conditional classes', () => {
        expect(cn('base', true && 'included', false && 'excluded')).toBe('base included');
    });

    it('deduplicates Tailwind classes', () => {
        expect(cn('p-4', 'p-8')).toBe('p-8');
    });

    it('handles arrays of classes', () => {
        expect(cn(['foo', 'bar'], 'baz')).toBe('foo bar baz');
    });

    it('handles undefined and null', () => {
        expect(cn('foo', undefined, null, 'bar')).toBe('foo bar');
    });

    it('merges conflicting Tailwind utilities', () => {
        expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500');
        expect(cn('bg-white', 'bg-black')).toBe('bg-black');
    });
});

// ============================================
// formatScore
// ============================================

describe('formatScore', () => {
    it('formats zero as E', () => {
        expect(formatScore(0)).toBe('E');
    });

    it('formats positive scores without plus by default', () => {
        expect(formatScore(3)).toBe('3');
        expect(formatScore(10)).toBe('10');
    });

    it('formats positive scores with plus when requested', () => {
        expect(formatScore(3, true)).toBe('+3');
        expect(formatScore(10, true)).toBe('+10');
    });

    it('formats negative scores with minus', () => {
        expect(formatScore(-2)).toBe('-2');
        expect(formatScore(-5)).toBe('-5');
    });

    it('does not double-up plus signs', () => {
        expect(formatScore(0, true)).toBe('E');
    });
});

// ============================================
// formatMatchScore
// ============================================

describe('formatMatchScore', () => {
    it('returns AS for tied matches', () => {
        expect(formatMatchScore(0, 10)).toBe('AS');
        expect(formatMatchScore(0, 0)).toBe('AS');
    });

    it('formats leading scores correctly', () => {
        expect(formatMatchScore(2, 10)).toBe('2 UP');
        expect(formatMatchScore(3, 8)).toBe('3 UP');
    });

    it('formats trailing scores correctly', () => {
        expect(formatMatchScore(-2, 10)).toBe('2 DN');
        expect(formatMatchScore(-4, 6)).toBe('4 DN');
    });

    it('formats closed-out matches', () => {
        expect(formatMatchScore(5, 3)).toBe('5&3');
        expect(formatMatchScore(3, 2)).toBe('3&2');
        expect(formatMatchScore(-4, 2)).toBe('4&2');
    });

    it('handles edge case when margin equals remaining', () => {
        expect(formatMatchScore(3, 3)).toBe('3 UP');
    });
});

// ============================================
// formatPlayerName
// ============================================

describe('formatPlayerName', () => {
    it('formats full name by default', () => {
        expect(formatPlayerName('John', 'Doe')).toBe('John Doe');
    });

    it('formats short name with initial', () => {
        expect(formatPlayerName('John', 'Doe', 'short')).toBe('J. Doe');
    });

    it('formats initials only', () => {
        expect(formatPlayerName('John', 'Doe', 'initials')).toBe('JD');
    });

    it('handles single-letter names', () => {
        expect(formatPlayerName('J', 'D', 'short')).toBe('J. D');
        expect(formatPlayerName('J', 'D', 'initials')).toBe('JD');
    });
});

// ============================================
// formatHandicapIndex
// ============================================

describe('formatHandicapIndex', () => {
    it('formats positive handicap with one decimal', () => {
        expect(formatHandicapIndex(10.4)).toBe('10.4');
        expect(formatHandicapIndex(5)).toBe('5.0');
        expect(formatHandicapIndex(0)).toBe('0.0');
    });

    it('formats plus handicap (negative number) with + sign', () => {
        expect(formatHandicapIndex(-2.1)).toBe('+2.1');
        expect(formatHandicapIndex(-0.5)).toBe('+0.5');
    });

    it('rounds to one decimal', () => {
        expect(formatHandicapIndex(10.456)).toBe('10.5');
        expect(formatHandicapIndex(-2.149)).toBe('+2.1');
    });
});

// ============================================
// formatDate
// ============================================

describe('formatDate', () => {
    const testDate = new Date('2024-06-15T10:30:00');

    it('formats short date by default', () => {
        const result = formatDate(testDate, 'short');
        expect(result).toMatch(/Jun\s+15/);
    });

    it('formats full date', () => {
        const result = formatDate(testDate, 'full');
        expect(result).toContain('June');
        expect(result).toContain('15');
        expect(result).toContain('2024');
    });

    it('formats day only', () => {
        const result = formatDate(testDate, 'day');
        expect(result).toMatch(/Sat/);
    });

    it('accepts string date input', () => {
        const result = formatDate('2024-06-15T10:30:00', 'short');
        expect(result).toMatch(/Jun\s+15/);
    });
});

// ============================================
// formatTime
// ============================================

describe('formatTime', () => {
    it('formats time with hours and minutes', () => {
        const date = new Date('2024-06-15T14:30:00');
        const result = formatTime(date);
        expect(result).toMatch(/2:30\s*PM/i);
    });

    it('formats morning time', () => {
        const date = new Date('2024-06-15T09:15:00');
        const result = formatTime(date);
        expect(result).toMatch(/9:15\s*AM/i);
    });

    it('accepts string date input', () => {
        const result = formatTime('2024-06-15T14:30:00');
        expect(result).toMatch(/2:30\s*PM/i);
    });
});

// ============================================
// getTeamColorClass
// ============================================

describe('getTeamColorClass', () => {
    it('returns background class by default', () => {
        expect(getTeamColorClass('usa')).toBe('bg-team-usa');
        expect(getTeamColorClass('europe')).toBe('bg-team-europe');
    });

    it('returns text color class', () => {
        expect(getTeamColorClass('usa', 'text')).toBe('text-team-usa');
        expect(getTeamColorClass('europe', 'text')).toBe('text-team-europe');
    });

    it('returns border class', () => {
        expect(getTeamColorClass('usa', 'border')).toBe('border-team-usa');
        expect(getTeamColorClass('europe', 'border')).toBe('border-team-europe');
    });

    it('maps teamA to usa colors', () => {
        expect(getTeamColorClass('teamA')).toBe('bg-team-usa');
        expect(getTeamColorClass('teamA', 'text')).toBe('text-team-usa');
    });

    it('maps teamB to europe colors', () => {
        expect(getTeamColorClass('teamB')).toBe('bg-team-europe');
        expect(getTeamColorClass('teamB', 'text')).toBe('text-team-europe');
    });
});

// ============================================
// getWinnerStyles
// ============================================

describe('getWinnerStyles', () => {
    it('returns USA styles for teamA winner', () => {
        expect(getWinnerStyles('teamA')).toBe('bg-team-usa text-white');
    });

    it('returns Europe styles for teamB winner', () => {
        expect(getWinnerStyles('teamB')).toBe('bg-team-europe text-white');
    });

    it('returns neutral styles for halved', () => {
        const result = getWinnerStyles('halved');
        expect(result).toContain('bg-[color:var(--ink-tertiary)]');
        expect(result).toContain('text-[var(--ink-secondary)]');
    });

    it('returns subtle styles for no winner', () => {
        const result = getWinnerStyles('none');
        expect(result).toContain('bg-[color:var(--ink-tertiary)]');
        expect(result).toContain('text-[var(--ink-tertiary)]');
    });
});

// ============================================
// debounce
// ============================================

describe('debounce', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('delays function execution', () => {
        const fn = vi.fn();
        const debounced = debounce(fn, 100);

        debounced();
        expect(fn).not.toHaveBeenCalled();

        vi.advanceTimersByTime(100);
        expect(fn).toHaveBeenCalledTimes(1);
    });

    it('resets timer on subsequent calls', () => {
        const fn = vi.fn();
        const debounced = debounce(fn, 100);

        debounced();
        vi.advanceTimersByTime(50);
        debounced();
        vi.advanceTimersByTime(50);
        expect(fn).not.toHaveBeenCalled();

        vi.advanceTimersByTime(50);
        expect(fn).toHaveBeenCalledTimes(1);
    });

    it('passes arguments to the function', () => {
        const fn = vi.fn();
        const debounced = debounce(fn, 100);

        debounced('arg1', 'arg2');
        vi.advanceTimersByTime(100);

        expect(fn).toHaveBeenCalledWith('arg1', 'arg2');
    });
});

// ============================================
// throttle
// ============================================

describe('throttle', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('executes immediately on first call', () => {
        const fn = vi.fn();
        const throttled = throttle(fn, 100);

        throttled();
        expect(fn).toHaveBeenCalledTimes(1);
    });

    it('prevents execution during throttle period', () => {
        const fn = vi.fn();
        const throttled = throttle(fn, 100);

        throttled();
        throttled();
        throttled();
        expect(fn).toHaveBeenCalledTimes(1);
    });

    it('allows execution after throttle period', () => {
        const fn = vi.fn();
        const throttled = throttle(fn, 100);

        throttled();
        vi.advanceTimersByTime(100);
        throttled();

        expect(fn).toHaveBeenCalledTimes(2);
    });

    it('passes arguments to the function', () => {
        const fn = vi.fn();
        const throttled = throttle(fn, 100);

        throttled('arg1', 'arg2');
        expect(fn).toHaveBeenCalledWith('arg1', 'arg2');
    });
});

// ============================================
// getInitials
// ============================================

describe('getInitials', () => {
    it('extracts initials from full name', () => {
        expect(getInitials('John Doe')).toBe('JD');
    });

    it('handles single name', () => {
        expect(getInitials('John')).toBe('J');
    });

    it('handles three-part name', () => {
        expect(getInitials('John Michael Doe')).toBe('JM');
    });

    it('respects maxLength parameter', () => {
        expect(getInitials('John Michael Doe', 3)).toBe('JMD');
        expect(getInitials('John Doe', 1)).toBe('J');
    });

    it('uppercases initials', () => {
        expect(getInitials('john doe')).toBe('JD');
    });
});

// ============================================
// pluralize
// ============================================

describe('pluralize', () => {
    it('uses singular for count of 1', () => {
        expect(pluralize(1, 'match')).toBe('1 match');
        expect(pluralize(1, 'player')).toBe('1 player');
    });

    it('uses default plural for other counts', () => {
        // Note: simple pluralize just adds 's', use custom plural for 'es' words
        expect(pluralize(0, 'match', 'matches')).toBe('0 matches');
        expect(pluralize(5, 'player')).toBe('5 players');
    });

    it('uses custom plural when provided', () => {
        expect(pluralize(2, 'child', 'children')).toBe('2 children');
        expect(pluralize(0, 'person', 'people')).toBe('0 people');
    });
});

// ============================================
// safeArrayAccess
// ============================================

describe('safeArrayAccess', () => {
    const arr = ['a', 'b', 'c'];

    it('returns element at valid index', () => {
        expect(safeArrayAccess(arr, 0, 'default')).toBe('a');
        expect(safeArrayAccess(arr, 1, 'default')).toBe('b');
        expect(safeArrayAccess(arr, 2, 'default')).toBe('c');
    });

    it('returns default for negative index', () => {
        expect(safeArrayAccess(arr, -1, 'default')).toBe('default');
    });

    it('returns default for out of bounds index', () => {
        expect(safeArrayAccess(arr, 3, 'default')).toBe('default');
        expect(safeArrayAccess(arr, 100, 'default')).toBe('default');
    });

    it('returns default for empty array', () => {
        expect(safeArrayAccess([], 0, 'default')).toBe('default');
    });
});

// ============================================
// groupBy
// ============================================

describe('groupBy', () => {
    it('groups array by key', () => {
        const players = [
            { name: 'John', team: 'usa' },
            { name: 'Jane', team: 'europe' },
            { name: 'Bob', team: 'usa' },
        ];

        const grouped = groupBy(players, 'team');

        expect(grouped.usa).toHaveLength(2);
        expect(grouped.europe).toHaveLength(1);
        expect(grouped.usa[0].name).toBe('John');
    });

    it('handles empty array', () => {
        const grouped = groupBy([], 'key');
        expect(grouped).toEqual({});
    });

    it('creates single group when all same key', () => {
        const items = [
            { id: 1, type: 'a' },
            { id: 2, type: 'a' },
        ];

        const grouped = groupBy(items, 'type');
        expect(Object.keys(grouped)).toHaveLength(1);
        expect(grouped.a).toHaveLength(2);
    });

    it('handles numeric keys', () => {
        const items = [
            { name: 'A', score: 100 },
            { name: 'B', score: 100 },
            { name: 'C', score: 200 },
        ];

        const grouped = groupBy(items, 'score');
        expect(grouped['100']).toHaveLength(2);
        expect(grouped['200']).toHaveLength(1);
    });
});
