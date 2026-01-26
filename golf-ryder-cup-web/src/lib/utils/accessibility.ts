'use client';

/**
 * Accessibility Utilities
 *
 * Tools for building accessible user interfaces.
 */

import { useEffect, useState } from 'react';

// ============================================
// REDUCED MOTION HOOK
// ============================================

/**
 * Hook to detect if user prefers reduced motion
 * Returns true if user has reduced-motion preference enabled
 */
export function usePrefersReducedMotion(): boolean {
    // Initialize with the actual value to avoid setState in useEffect
    const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
        if (typeof window === 'undefined') return true;
        return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    });

    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

        const handleChange = (event: MediaQueryListEvent) => {
            setPrefersReducedMotion(event.matches);
        };

        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, []);

    return prefersReducedMotion;
}

// ============================================
// LIVE REGION UTILS
// ============================================

/**
 * Announce a message to screen readers
 */
export function announceToScreenReader(
    message: string,
    priority: 'polite' | 'assertive' = 'polite'
): void {
    if (typeof document === 'undefined') return;

    const announcement = document.createElement('div');
    announcement.setAttribute('role', 'status');
    announcement.setAttribute('aria-live', priority);
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = message;

    document.body.appendChild(announcement);

    setTimeout(() => {
        document.body.removeChild(announcement);
    }, 1000);
}

// ============================================
// FOCUS MANAGEMENT
// ============================================

/**
 * Trap focus within a container element
 * Useful for modals and dialogs
 */
export function trapFocus(container: HTMLElement): () => void {
    const focusableElements = container.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );

    const firstFocusable = focusableElements[0];
    const lastFocusable = focusableElements[focusableElements.length - 1];

    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key !== 'Tab') return;

        if (e.shiftKey) {
            if (document.activeElement === firstFocusable) {
                e.preventDefault();
                lastFocusable?.focus();
            }
        } else {
            if (document.activeElement === lastFocusable) {
                e.preventDefault();
                firstFocusable?.focus();
            }
        }
    };

    container.addEventListener('keydown', handleKeyDown);
    firstFocusable?.focus();

    return () => {
        container.removeEventListener('keydown', handleKeyDown);
    };
}

// ============================================
// ARIA HELPERS
// ============================================

/**
 * Generate an accessible label for score displays
 */
export function getScoreAriaLabel(
    teamAName: string,
    teamAScore: number,
    teamBName: string,
    teamBScore: number
): string {
    if (teamAScore === teamBScore) {
        return `Match tied at ${teamAScore} to ${teamBScore}`;
    }

    const leader = teamAScore > teamBScore ? teamAName : teamBName;
    const leadScore = Math.max(teamAScore, teamBScore);
    const trailScore = Math.min(teamAScore, teamBScore);

    return `${leader} leads ${leadScore} to ${trailScore}`;
}

/**
 * Generate accessible label for hole status
 */
export function getHoleAriaLabel(
    holeNumber: number,
    status: 'won' | 'lost' | 'halved' | 'pending',
    winnerName?: string
): string {
    switch (status) {
        case 'won':
            return `Hole ${holeNumber}: Won${winnerName ? ` by ${winnerName}` : ''}`;
        case 'lost':
            return `Hole ${holeNumber}: Lost${winnerName ? ` to ${winnerName}` : ''}`;
        case 'halved':
            return `Hole ${holeNumber}: Halved`;
        case 'pending':
            return `Hole ${holeNumber}: In progress`;
    }
}

// ============================================
// CONTRAST HELPERS
// ============================================

/**
 * Check if a color has sufficient contrast with white
 * Returns true if the color is dark enough for white text
 */
export function isDarkColor(hexColor: string): boolean {
    const hex = hexColor.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

    return luminance < 0.5;
}

/**
 * Get accessible text color for a background color
 */
export function getAccessibleTextColor(backgroundColor: string): string {
    return isDarkColor(backgroundColor) ? '#FFFFFF' : '#1C1917';
}
