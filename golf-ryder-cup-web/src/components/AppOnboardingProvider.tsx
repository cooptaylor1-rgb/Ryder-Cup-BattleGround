/**
 * App Onboarding Provider
 *
 * Wraps the app to show first-run onboarding experience.
 * Only shows on first visit, then persists completion to localStorage.
 */

'use client';

import { ReactNode } from 'react';
import { useOnboarding } from '@/lib/hooks';
import { Onboarding } from '@/components/ui';

interface AppOnboardingProviderProps {
    children: ReactNode;
}

export function AppOnboardingProvider({ children }: AppOnboardingProviderProps) {
    const { showOnboarding, isLoading, completeOnboarding } = useOnboarding();

    // Don't render anything while loading to prevent flash
    if (isLoading) {
        return (
            <div
                className="min-h-screen flex items-center justify-center texture-grain bg-[var(--canvas)]"
            >
                <div className="animate-pulse">
                    <div className="w-16 h-16 rounded-full bg-masters/20" />
                </div>
            </div>
        );
    }

    return (
        <>
            {showOnboarding && (
                <Onboarding
                    onComplete={completeOnboarding}
                    onSkip={completeOnboarding}
                />
            )}
            {!showOnboarding && children}
        </>
    );
}

export default AppOnboardingProvider;
