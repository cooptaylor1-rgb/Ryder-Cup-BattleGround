/**
 * Onboarding Flow Component
 *
 * Beautiful first-run experience that introduces users to the app.
 * Showcases key features with premium illustrations.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import {
    RyderCupTrophyIllustration,
    TrophyIllustration,
    GolfersIllustration,
    ScorecardIllustration,
    CelebrationIllustration,
} from './illustrations';
import { ChevronRight, ChevronLeft, X } from 'lucide-react';

// ============================================
// TYPES
// ============================================

interface OnboardingStep {
    illustration: React.ReactNode;
    title: string;
    subtitle: string;
    features?: string[];
}

interface OnboardingProps {
    onComplete: () => void;
    onSkip?: () => void;
    className?: string;
}

// ============================================
// ONBOARDING STEPS
// ============================================

const steps: OnboardingStep[] = [
    {
        illustration: <RyderCupTrophyIllustration size="xl" animated />,
        title: "Welcome to Ryder Cup Tracker",
        subtitle: "The best way to track your golf buddies trip. Compete, score, and crown champions.",
    },
    {
        illustration: <GolfersIllustration size="xl" animated />,
        title: "USA vs Europe Format",
        subtitle: "Split into two teams and compete in classic Ryder Cup style matches.",
        features: [
            "Create custom team rosters",
            "Track handicaps automatically",
            "Head-to-head matchups",
        ],
    },
    {
        illustration: <ScorecardIllustration size="xl" animated />,
        title: "Score Hole by Hole",
        subtitle: "Simple, beautiful scoring that updates standings in real-time.",
        features: [
            "Match play & stroke play",
            "Four-ball & foursomes",
            "Singles matches",
        ],
    },
    {
        illustration: <TrophyIllustration size="xl" animated />,
        title: "Track Every Stat",
        subtitle: "See who's clutch, who's consistent, and who takes home the glory.",
        features: [
            "Live leaderboards",
            "Individual player stats",
            "Trip awards & history",
        ],
    },
    {
        illustration: <CelebrationIllustration size="xl" animated />,
        title: "Ready to Play?",
        subtitle: "Create your first trip and let the competition begin!",
    },
];

// ============================================
// MAIN COMPONENT
// ============================================

export function Onboarding({ onComplete, onSkip, className }: OnboardingProps) {
    const [currentStep, setCurrentStep] = useState(0);
    const [isExiting, setIsExiting] = useState(false);

    const isFirstStep = currentStep === 0;
    const isLastStep = currentStep === steps.length - 1;
    const step = steps[currentStep];

    const handleNext = useCallback(() => {
        if (isLastStep) {
            setIsExiting(true);
            setTimeout(onComplete, 300);
        } else {
            setCurrentStep((prev) => prev + 1);
        }
    }, [isLastStep, onComplete]);

    const handlePrev = useCallback(() => {
        if (!isFirstStep) {
            setCurrentStep((prev) => prev - 1);
        }
    }, [isFirstStep]);

    const handleSkip = useCallback(() => {
        setIsExiting(true);
        setTimeout(() => {
            onSkip?.();
            onComplete();
        }, 300);
    }, [onComplete, onSkip]);

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowRight' || e.key === 'Enter') {
                handleNext();
            } else if (e.key === 'ArrowLeft') {
                handlePrev();
            } else if (e.key === 'Escape') {
                handleSkip();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleNext, handlePrev, handleSkip]);

    return (
        <div
            className={cn(
                'onboarding-overlay',
                isExiting && 'animate-fade-out',
                className
            )}
            role="dialog"
            aria-label="Welcome to Ryder Cup Tracker"
            aria-modal="true"
        >
            {/* Skip button */}
            {!isLastStep && (
                <button
                    onClick={handleSkip}
                    className="absolute top-4 right-4 p-2 text-ink-tertiary hover:text-ink-secondary transition-colors z-10"
                    aria-label="Skip onboarding"
                >
                    <X className="w-6 h-6" />
                </button>
            )}

            {/* Main content */}
            <div className="onboarding-content">
                {/* Illustration */}
                <div
                    className="onboarding-illustration"
                    key={currentStep} // Force re-render for animation
                >
                    {step.illustration}
                </div>

                {/* Text */}
                <h1 className="onboarding-title">{step.title}</h1>
                <p className="onboarding-subtitle">{step.subtitle}</p>

                {/* Feature list */}
                {step.features && (
                    <ul className="mt-6 space-y-2 text-left max-w-xs">
                        {step.features.map((feature, index) => (
                            <li
                                key={index}
                                className="flex items-center gap-3 text-sm text-ink-secondary animate-stagger-item"
                                style={{ animationDelay: `${index * 100}ms` }}
                            >
                                <span className="w-5 h-5 rounded-full bg-masters/10 text-masters flex items-center justify-center text-xs font-bold">
                                    ✓
                                </span>
                                {feature}
                            </li>
                        ))}
                    </ul>
                )}

                {/* Step indicators */}
                <div className="onboarding-dots" role="tablist" aria-label="Onboarding progress">
                    {steps.map((_, index) => (
                        <button
                            key={index}
                            className={cn('onboarding-dot', index === currentStep && 'active')}
                            onClick={() => setCurrentStep(index)}
                            role="tab"
                            aria-selected={index === currentStep}
                            aria-label={`Step ${index + 1} of ${steps.length}`}
                        />
                    ))}
                </div>
            </div>

            {/* Actions */}
            <div className="onboarding-actions">
                <div className="flex gap-3">
                    {/* Back button */}
                    {!isFirstStep && (
                        <button
                            onClick={handlePrev}
                            className="flex-shrink-0 p-4 rounded-xl transition-all press-scale-sm"
                            style={{
                                background: 'var(--canvas-raised)',
                                color: 'var(--ink-secondary)',
                                border: '1px solid var(--stroke-light)'
                            }}
                            aria-label="Previous step"
                        >
                            <ChevronLeft className="w-6 h-6" />
                        </button>
                    )}

                    {/* Next/Complete button */}
                    <button
                        onClick={handleNext}
                        className="onboarding-button flex items-center justify-center gap-2 press-scale"
                    >
                        {isLastStep ? "Let's Go!" : 'Continue'}
                        {!isLastStep && <ChevronRight className="w-5 h-5" />}
                    </button>
                </div>

                {/* Skip text link */}
                {!isLastStep && (
                    <button onClick={handleSkip} className="onboarding-skip">
                        Skip for now
                    </button>
                )}
            </div>
        </div>
    );
}

// ============================================
// WELCOME BACK COMPONENT
// For returning users
// ============================================

interface WelcomeBackProps {
    userName?: string;
    lastTripName?: string;
    onContinue: () => void;
    onNewTrip: () => void;
}

export function WelcomeBack({
    userName,
    lastTripName,
    onContinue,
    onNewTrip,
}: WelcomeBackProps) {
    return (
        <div className="onboarding-overlay">
            <div className="onboarding-content">
                <div className="onboarding-illustration">
                    <RyderCupTrophyIllustration size="xl" animated />
                </div>

                <h1 className="onboarding-title">
                    {userName ? `Welcome back, ${userName}!` : 'Welcome back!'}
                </h1>
                <p className="onboarding-subtitle">
                    {lastTripName
                        ? `Ready to continue "${lastTripName}"?`
                        : 'Ready to hit the links?'}
                </p>
            </div>

            <div className="onboarding-actions">
                {lastTripName ? (
                    <>
                        <button onClick={onContinue} className="onboarding-button press-scale">
                            Continue Trip
                        </button>
                        <button onClick={onNewTrip} className="onboarding-skip">
                            Start a new trip instead
                        </button>
                    </>
                ) : (
                    <button onClick={onNewTrip} className="onboarding-button press-scale">
                        Create New Trip
                    </button>
                )}
            </div>
        </div>
    );
}

// ============================================
// FEATURE SPOTLIGHT
// Highlight new features to existing users
// ============================================

interface FeatureSpotlightProps {
    title: string;
    description: string;
    illustration?: React.ReactNode;
    onDismiss: () => void;
}

export function FeatureSpotlight({
    title,
    description,
    illustration,
    onDismiss,
}: FeatureSpotlightProps) {
    return (
        <div className="fixed inset-x-4 bottom-24 z-50 animate-slide-up">
            <div className="onboarding-card relative">
                <button
                    onClick={onDismiss}
                    className="absolute top-3 right-3 p-1 text-ink-tertiary hover:text-ink-secondary"
                    aria-label="Dismiss"
                >
                    <X className="w-4 h-4" />
                </button>

                {illustration && (
                    <div className="onboarding-card-icon">{illustration}</div>
                )}

                <h3 className="onboarding-card-title">{title}</h3>
                <p className="onboarding-card-text">{description}</p>

                <button
                    onClick={onDismiss}
                    className="mt-4 text-sm font-medium text-masters hover:underline"
                >
                    Got it
                </button>
            </div>
        </div>
    );
}

export default Onboarding;
