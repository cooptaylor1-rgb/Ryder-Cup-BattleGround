/**
 * useHaptic Hook
 *
 * Provides haptic feedback for scoring interactions.
 * Respects user preferences and device capabilities.
 */

'use client';

import { useCallback } from 'react';
import { useUIStore } from '../stores';

type HapticType = 'light' | 'medium' | 'heavy' | 'success' | 'error' | 'warning';

/**
 * Hook to trigger haptic feedback
 *
 * @returns Function to trigger haptic feedback
 */
export function useHaptic() {
    const { scoringPreferences } = useUIStore();

    const trigger = useCallback((type: HapticType = 'light') => {
        if (!scoringPreferences.hapticFeedback) return;

        // Check for Vibration API support
        if (!('vibrate' in navigator)) return;

        // Different patterns for different feedback types
        const patterns: Record<HapticType, number | number[]> = {
            light: 10,
            medium: 25,
            heavy: 50,
            success: [10, 50, 10], // Double tap
            error: [50, 30, 50, 30, 50], // Triple tap
            warning: [30, 50, 30], // Double tap
        };

        try {
            navigator.vibrate(patterns[type]);
        } catch {
            // Ignore errors - haptic is optional
        }
    }, [scoringPreferences.hapticFeedback]);

    return trigger;
}

export default useHaptic;
