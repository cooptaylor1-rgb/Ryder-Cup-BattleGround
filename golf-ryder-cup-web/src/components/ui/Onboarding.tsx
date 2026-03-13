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
    ClubhouseScene,
    FirstTeeScene,
    ScheduleScene,
    SidesScene,
    StoryScene,
} from './onboarding/OnboardingFeatureScenes';
import { ChevronRight, ChevronLeft, X } from 'lucide-react';

// ============================================
// TYPES
// ============================================

interface OnboardingStep {
    scene: React.ReactNode;
    eyebrow: string;
    title: string;
    subtitle: string;
    features?: string[];
    sceneDetails: Array<{
        label: string;
        value: string;
    }>;
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
        scene: <ClubhouseScene />,
        eyebrow: 'The Clubhouse',
        title: 'Welcome to Ryder Cup Battleground',
        subtitle: 'A proper home for the golf trip: pairings, tee sheets, live scoring, and the annual story that follows.',
        sceneDetails: [
            { label: 'Field Note', value: 'Private trip ledger' },
            { label: 'Issue', value: 'Match week' },
        ],
    },
    {
        scene: <SidesScene />,
        eyebrow: 'The Sides',
        title: 'Set the sides',
        subtitle: 'Build teams, shape pairings, and let the match board explain the competition at a glance.',
        features: [
            'Name the sides & roster the field',
            'Track handicaps with match context',
            'Arrange pairings session by session',
        ],
        sceneDetails: [
            { label: 'Match Board', value: 'Four-ball to singles' },
            { label: 'Identity', value: 'Two sides, one cup' },
        ],
    },
    {
        scene: <ScheduleScene />,
        eyebrow: 'The Tee Sheet',
        title: 'Lay out the week',
        subtitle: 'Tee times, sessions, and formats arranged with the calm of a proper club-event board.',
        features: [
            'Stage sessions and tee times',
            'Build the rota by format',
            'See the full week at a glance',
        ],
        sceneDetails: [
            { label: 'Saturday Rota', value: 'First wave at 7:40' },
            { label: 'Cadence', value: 'Built hole by hole' },
        ],
    },
    {
        scene: <StoryScene />,
        eyebrow: 'The Story',
        title: 'Let the trip accumulate meaning',
        subtitle: 'Standings, records, and awards gathered into something worth revisiting after the last putt drops.',
        features: [
            'Follow the live standings',
            'Keep player records honest',
            'Archive the rivalry by trip',
        ],
        sceneDetails: [
            { label: 'Archive', value: 'Rivalry year by year' },
            { label: 'Ledger', value: 'Stats, awards, history' },
        ],
    },
    {
        scene: <FirstTeeScene />,
        eyebrow: 'The First Tee',
        title: 'Ready for the opening peg?',
        subtitle: 'Create the trip, name the sides, and send everyone to the first tee.',
        sceneDetails: [
            { label: 'Opening Hole', value: 'Dawn match start' },
            { label: 'Ritual', value: 'Peg it and go' },
        ],
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
    const progressLabel = `${currentStep + 1} of ${steps.length}`;

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
            <div className="onboarding-shell">
                <div className="onboarding-topbar">
                    <div>
                        <p className="onboarding-brand">Ryder Cup Battleground</p>
                        <p className="onboarding-step-meta">Step {progressLabel}</p>
                    </div>

                    {!isLastStep && (
                        <button
                            onClick={handleSkip}
                            className="onboarding-skip-button"
                            aria-label="Skip onboarding"
                        >
                            Skip
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>

                <div className="onboarding-stage">
                    <div className="onboarding-stage-frame">
                        <div className="onboarding-stage-canvas">
                            <div className="onboarding-scene-notes" aria-hidden="true">
                                {step.sceneDetails.map((detail, index) => (
                                    <div
                                        key={`${detail.label}-${detail.value}`}
                                        className={cn(
                                            'onboarding-scene-note',
                                            index > 0 && 'onboarding-scene-note--trailing'
                                        )}
                                    >
                                        <span className="onboarding-scene-label">{detail.label}</span>
                                        <span className="onboarding-scene-value">{detail.value}</span>
                                    </div>
                                ))}
                            </div>

                            <div
                                className="onboarding-illustration"
                                key={currentStep}
                            >
                                {step.scene}
                            </div>
                        </div>
                    </div>

                    <div className="onboarding-copy">
                        <p className="onboarding-overline">{step.eyebrow}</p>
                        <h1 className="onboarding-title">{step.title}</h1>
                        <p className="onboarding-subtitle">{step.subtitle}</p>
                    </div>

                    {step.features && (
                        <div className="onboarding-feature-grid">
                            {step.features.map((feature, index) => (
                                <div
                                    key={feature}
                                    className="onboarding-feature-card animate-stagger-item"
                                    style={{ animationDelay: `${index * 100}ms` }}
                                >
                                    <span className="onboarding-feature-index" aria-hidden="true">
                                        {String(index + 1).padStart(2, '0')}
                                    </span>
                                    <span>{feature}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="onboarding-footer">
                    <div className="onboarding-progress-block">
                        <div className="onboarding-progress-labels">
                            <span>Progress</span>
                            <span>{progressLabel}</span>
                        </div>
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

                    <div className="onboarding-actions">
                        <div className="flex gap-3">
                            {!isFirstStep && (
                                <button
                                    onClick={handlePrev}
                                    className="onboarding-back-button press-scale-sm"
                                    aria-label="Previous step"
                                >
                                    <ChevronLeft className="w-5 h-5" />
                                </button>
                            )}

                            <button
                                onClick={handleNext}
                                className="onboarding-button flex items-center justify-center gap-2 press-scale"
                            >
                                {isLastStep ? "Let's Go!" : 'Continue'}
                                {!isLastStep && <ChevronRight className="w-5 h-5" />}
                            </button>
                        </div>

                        {!isLastStep && (
                            <button onClick={handleSkip} className="onboarding-skip">
                                Skip for now
                            </button>
                        )}
                    </div>
                </div>
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
            <div className="onboarding-shell">
                <div className="onboarding-topbar">
                    <div>
                        <p className="onboarding-brand">Ryder Cup Battleground</p>
                        <p className="onboarding-step-meta">Returning player</p>
                    </div>
                </div>

                <div className="onboarding-stage">
                    <div className="onboarding-stage-frame">
                        <div className="onboarding-stage-canvas">
                            <div className="onboarding-scene-notes" aria-hidden="true">
                                <div className="onboarding-scene-note">
                                    <span className="onboarding-scene-label">Field Note</span>
                                    <span className="onboarding-scene-value">Back at the clubhouse</span>
                                </div>
                                <div className="onboarding-scene-note onboarding-scene-note--trailing">
                                    <span className="onboarding-scene-label">Resume</span>
                                    <span className="onboarding-scene-value">
                                        {lastTripName ? 'Continue the rivalry' : 'Start the next round'}
                                    </span>
                                </div>
                            </div>

                            <div className="onboarding-illustration">
                                <ClubhouseScene />
                            </div>
                        </div>
                    </div>

                    <div className="onboarding-copy">
                        <p className="onboarding-overline">Back at the Clubhouse</p>
                        <h1 className="onboarding-title">
                            {userName ? `Welcome back, ${userName}!` : 'Welcome back!'}
                        </h1>
                        <p className="onboarding-subtitle">
                            {lastTripName
                                ? `Ready to continue "${lastTripName}"?`
                                : 'Ready to hit the links?'}
                        </p>
                    </div>

                    {lastTripName && (
                        <div className="onboarding-feature-grid">
                            <div className="onboarding-feature-card">
                                <span className="onboarding-feature-check" aria-hidden="true">
                                    ✓
                                </span>
                                <span>Returning to {lastTripName}</span>
                            </div>
                        </div>
                    )}
                </div>

                <div className="onboarding-footer">
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
