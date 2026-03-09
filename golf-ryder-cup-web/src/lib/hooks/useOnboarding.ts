/**
 * Onboarding Hook
 *
 * Manages first-run experience state via localStorage.
 * Tracks whether user has completed onboarding.
 */

'use client';

import { useState, useCallback } from 'react';

const ONBOARDING_KEY = 'golf-ryder-cup-onboarding-complete';
const ONBOARDING_VERSION = '1.0'; // Increment to re-show onboarding after major updates

interface OnboardingState {
    hasCompletedOnboarding: boolean;
    isLoading: boolean;
    showOnboarding: boolean;
    completeOnboarding: () => void;
    resetOnboarding: () => void;
}

function getStoredOnboardingState(): {
    hasCompletedOnboarding: boolean;
    isLoading: boolean;
    showOnboarding: boolean;
} {
    if (typeof window === 'undefined') {
        return {
            hasCompletedOnboarding: true,
            isLoading: true,
            showOnboarding: false,
        };
    }

    try {
        const stored = localStorage.getItem(ONBOARDING_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            const hasCompletedOnboarding = parsed.version === ONBOARDING_VERSION;
            return {
                hasCompletedOnboarding,
                isLoading: false,
                showOnboarding: !hasCompletedOnboarding,
            };
        }

        return {
            hasCompletedOnboarding: false,
            isLoading: false,
            showOnboarding: true,
        };
    } catch {
        return {
            hasCompletedOnboarding: true,
            isLoading: false,
            showOnboarding: false,
        };
    }
}

export function useOnboarding(): OnboardingState {
    const initialState = getStoredOnboardingState();
    const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(initialState.hasCompletedOnboarding);
    const [isLoading] = useState(initialState.isLoading);
    const [showOnboarding, setShowOnboarding] = useState(initialState.showOnboarding);

    const completeOnboarding = useCallback(() => {
        try {
            localStorage.setItem(
                ONBOARDING_KEY,
                JSON.stringify({
                    version: ONBOARDING_VERSION,
                    completedAt: new Date().toISOString(),
                })
            );
        } catch {
            // Silently fail if localStorage is unavailable
        }
        setHasCompletedOnboarding(true);
        setShowOnboarding(false);
    }, []);

    const resetOnboarding = useCallback(() => {
        try {
            localStorage.removeItem(ONBOARDING_KEY);
        } catch {
            // Silently fail
        }
        setHasCompletedOnboarding(false);
        setShowOnboarding(true);
    }, []);

    return {
        hasCompletedOnboarding,
        isLoading,
        showOnboarding,
        completeOnboarding,
        resetOnboarding,
    };
}

export default useOnboarding;
