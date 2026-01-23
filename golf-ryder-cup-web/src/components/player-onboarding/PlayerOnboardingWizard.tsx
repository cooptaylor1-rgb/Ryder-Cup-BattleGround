'use client';

/**
 * Player Onboarding Wizard
 *
 * Complete onboarding flow for invited players joining a trip.
 * Combines all onboarding components into a smooth, step-by-step experience.
 */

import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ChevronLeft,
    ChevronRight,
    User,
    Hash,
    Camera,
    Calendar,
    DollarSign,
    Plane,
    Sparkles,
    Check,
    Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Import all onboarding components
import { TripWelcomeCard, type TripPreview } from './TripWelcomeCard';
import { QuickProfileMode, type QuickProfileData } from './QuickProfileMode';
import { GHINLookup, type GHINResult } from './GHINLookup';
import { PlayingStyleSurvey, type PlayingStyle } from './PlayingStyleSurvey';
import { AvailabilityCalendar, type TripSession, type AvailabilityStatus } from './AvailabilityCalendar';
import { ProfilePhotoUpload } from './ProfilePhotoUpload';
import { GolfSuperlatives, type SuperlativeAnswer } from './GolfSuperlatives';
import { SideBetOptIn, type SideBet, type SideBetPreference } from './SideBetOptIn';
import { TravelLodgingInfo, type TravelInfo } from './TravelLodgingInfo';
import { ProfileCompletionReward, type CompletionData } from './ProfileCompletionReward';

// ============================================
// TYPES
// ============================================

export type OnboardingStep =
    | 'welcome'
    | 'quick-or-full'
    | 'basic-info'
    | 'golf-info'
    | 'photo'
    | 'availability'
    | 'style-survey'
    | 'superlatives'
    | 'side-bets'
    | 'travel'
    | 'complete';

export interface PlayerOnboardingData {
    // Basic Info
    firstName: string;
    lastName: string;
    nickname?: string;
    email: string;
    phone?: string;
    photo?: string;

    // Golf Info
    handicapIndex: number | null;
    ghinNumber?: string;
    ghinVerified: boolean;
    homeCourse?: string;
    preferredTees?: string;

    // Style & Fun
    playingStyle?: PlayingStyle;
    superlatives?: SuperlativeAnswer[];

    // Trip-Specific
    availability?: AvailabilityStatus[];
    sideBetPreferences?: SideBetPreference[];
    travelInfo?: TravelInfo;
}

export interface PlayerOnboardingWizardProps {
    tripPreview: TripPreview;
    sessions: TripSession[];
    sideBets?: SideBet[];
    teammates?: string[];
    invitedBy?: string;
    onComplete: (data: PlayerOnboardingData) => void;
    onSkip?: () => void;
    initialData?: Partial<PlayerOnboardingData>;
    className?: string;
}

// ============================================
// STEP CONFIG
// ============================================

const FULL_STEPS: OnboardingStep[] = [
    'welcome',
    'quick-or-full',
    'basic-info',
    'golf-info',
    'photo',
    'availability',
    'style-survey',
    'superlatives',
    'side-bets',
    'travel',
    'complete',
];

const QUICK_STEPS: OnboardingStep[] = [
    'welcome',
    'quick-or-full',
    'complete',
];

interface StepConfig {
    id: OnboardingStep;
    label: string;
    icon: React.ReactNode;
    optional?: boolean;
}

const STEP_CONFIG: Record<OnboardingStep, StepConfig> = {
    'welcome': { id: 'welcome', label: 'Welcome', icon: <Sparkles className="w-4 h-4" /> },
    'quick-or-full': { id: 'quick-or-full', label: 'Setup Mode', icon: <Zap className="w-4 h-4" /> },
    'basic-info': { id: 'basic-info', label: 'About You', icon: <User className="w-4 h-4" /> },
    'golf-info': { id: 'golf-info', label: 'Golf Info', icon: <Hash className="w-4 h-4" /> },
    'photo': { id: 'photo', label: 'Photo', icon: <Camera className="w-4 h-4" />, optional: true },
    'availability': { id: 'availability', label: 'Availability', icon: <Calendar className="w-4 h-4" /> },
    'style-survey': { id: 'style-survey', label: 'Play Style', icon: <Sparkles className="w-4 h-4" />, optional: true },
    'superlatives': { id: 'superlatives', label: 'Fun Stuff', icon: <Sparkles className="w-4 h-4" />, optional: true },
    'side-bets': { id: 'side-bets', label: 'Side Bets', icon: <DollarSign className="w-4 h-4" />, optional: true },
    'travel': { id: 'travel', label: 'Travel', icon: <Plane className="w-4 h-4" />, optional: true },
    'complete': { id: 'complete', label: 'Done!', icon: <Check className="w-4 h-4" /> },
};

// ============================================
// DEFAULT DATA
// ============================================

const DEFAULT_DATA: PlayerOnboardingData = {
    firstName: '',
    lastName: '',
    email: '',
    handicapIndex: null,
    ghinVerified: false,
};

// ============================================
// COMPONENT
// ============================================

export function PlayerOnboardingWizard({
    tripPreview,
    sessions,
    sideBets,
    teammates,
    invitedBy,
    onComplete,
    _onSkip,
    initialData,
    className,
}: PlayerOnboardingWizardProps) {
    const [mode, setMode] = useState<'quick' | 'full' | null>(null);
    const [currentStep, setCurrentStep] = useState<OnboardingStep>('welcome');
    const [data, setData] = useState<PlayerOnboardingData>({
        ...DEFAULT_DATA,
        ...initialData,
    });

    // Determine active steps based on mode
    const activeSteps = useMemo(() => {
        if (mode === 'quick') return QUICK_STEPS;
        return FULL_STEPS;
    }, [mode]);

    const currentStepIndex = activeSteps.indexOf(currentStep);
    const progress = ((currentStepIndex + 1) / activeSteps.length) * 100;

    // Update data helper
    const updateData = useCallback(<K extends keyof PlayerOnboardingData>(
        key: K,
        value: PlayerOnboardingData[K]
    ) => {
        setData(prev => ({ ...prev, [key]: value }));
    }, []);

    // Navigation
    const _goToStep = (step: OnboardingStep) => {
        setCurrentStep(step);
    };

    const nextStep = () => {
        const idx = activeSteps.indexOf(currentStep);
        if (idx < activeSteps.length - 1) {
            setCurrentStep(activeSteps[idx + 1]);
        }
    };

    const prevStep = () => {
        const idx = activeSteps.indexOf(currentStep);
        if (idx > 0) {
            setCurrentStep(activeSteps[idx - 1]);
        }
    };

    const skipStep = () => {
        nextStep();
    };

    // Handle mode selection
    const handleModeSelect = (selectedMode: 'quick' | 'full') => {
        setMode(selectedMode);
        if (selectedMode === 'quick') {
            // Quick mode will show QuickProfileMode component
            setCurrentStep('quick-or-full');
        } else {
            setCurrentStep('basic-info');
        }
    };

    // Handle quick profile complete
    const handleQuickComplete = (quickData: QuickProfileData) => {
        setData(prev => ({
            ...prev,
            firstName: quickData.firstName,
            lastName: quickData.lastName,
            handicapIndex: quickData.handicapIndex,
            email: quickData.email,
            phone: quickData.phone,
        }));
        setCurrentStep('complete');
    };

    // Handle GHIN lookup result
    const handleGHINResult = (result: GHINResult) => {
        setData(prev => ({
            ...prev,
            handicapIndex: result.handicapIndex,
            ghinNumber: result.ghinNumber,
            ghinVerified: true,
            firstName: prev.firstName || result.firstName,
            lastName: prev.lastName || result.lastName,
        }));
    };

    // Handle final completion
    const handleComplete = () => {
        onComplete(data);
    };

    // Build completion data
    const completionData: CompletionData = {
        playerName: data.firstName || 'Player',
        tripName: tripPreview.name,
        teamName: tripPreview.yourTeam === 'A' ? tripPreview.teamAName : tripPreview.teamBName,
        teamColor: tripPreview.yourTeam === 'A' ? tripPreview.teamAColor : tripPreview.teamBColor,
        teammates,
        stats: {
            profileComplete: !!(data.firstName && data.lastName && data.email),
            availabilitySet: (data.availability?.length || 0) > 0,
            photoUploaded: !!data.photo,
            ghinVerified: data.ghinVerified,
        },
    };

    // Can go back?
    const canGoBack = currentStepIndex > 0 && currentStep !== 'welcome' && currentStep !== 'complete';
    const stepConfig = STEP_CONFIG[currentStep];

    return (
        <div className={cn('min-h-screen flex flex-col bg-gradient-to-b from-surface-50 to-surface-100 dark:from-surface-900 dark:to-surface-950', className)}>
            {/* Header (hidden on welcome and complete) */}
            {currentStep !== 'welcome' && currentStep !== 'complete' && (
                <header className="sticky top-0 z-10 bg-white/80 dark:bg-surface-900/80 backdrop-blur-md border-b border-surface-200 dark:border-surface-800">
                    <div className="px-4 py-3 flex items-center gap-3">
                        {canGoBack && (
                            <button
                                onClick={prevStep}
                                className="p-2 -ml-2 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
                            >
                                <ChevronLeft className="w-5 h-5 text-surface-600 dark:text-surface-400" />
                            </button>
                        )}
                        <div className="flex-1">
                            <h1 className="text-lg font-semibold text-surface-900 dark:text-white">
                                {stepConfig.label}
                            </h1>
                            <p className="text-xs text-surface-500">
                                Step {currentStepIndex + 1} of {activeSteps.length}
                            </p>
                        </div>
                        {stepConfig.optional && (
                            <button
                                onClick={skipStep}
                                className="text-sm text-surface-500 hover:text-surface-700 dark:text-surface-400 dark:hover:text-surface-200"
                            >
                                Skip
                            </button>
                        )}
                    </div>

                    {/* Progress Bar */}
                    <div className="h-1 bg-surface-100 dark:bg-surface-800">
                        <motion.div
                            className="h-full bg-masters"
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            transition={{ type: 'spring', damping: 20 }}
                        />
                    </div>
                </header>
            )}

            {/* Main Content */}
            <main className="flex-1 overflow-auto">
                <AnimatePresence mode="wait">
                    {/* Welcome Step */}
                    {currentStep === 'welcome' && (
                        <motion.div
                            key="welcome"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="p-4 pt-8"
                        >
                            <TripWelcomeCard
                                trip={tripPreview}
                                invitedBy={invitedBy}
                                onContinue={() => setCurrentStep('quick-or-full')}
                            />
                        </motion.div>
                    )}

                    {/* Quick or Full Mode Selection */}
                    {currentStep === 'quick-or-full' && !mode && (
                        <motion.div
                            key="mode-select"
                            initial={{ opacity: 0, x: 50 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -50 }}
                            className="p-6 space-y-6"
                        >
                            <div className="text-center">
                                <h2 className="text-xl font-bold text-surface-900 dark:text-white">
                                    How would you like to set up?
                                </h2>
                                <p className="text-surface-500 mt-1">
                                    Choose your preferred onboarding experience
                                </p>
                            </div>

                            <div className="space-y-4">
                                {/* Quick Mode */}
                                <button
                                    onClick={() => handleModeSelect('quick')}
                                    className="w-full p-5 rounded-2xl bg-white dark:bg-surface-800 border-2 border-surface-200 dark:border-surface-700 hover:border-amber-400 transition-all text-left"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                                            <Zap className="w-7 h-7 text-white" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="font-semibold text-surface-900 dark:text-white text-lg">
                                                Quick Setup
                                            </div>
                                            <div className="text-surface-500 text-sm">
                                                Just the essentials • 30 seconds
                                            </div>
                                        </div>
                                        <ChevronRight className="w-5 h-5 text-surface-400" />
                                    </div>
                                </button>

                                {/* Full Mode */}
                                <button
                                    onClick={() => handleModeSelect('full')}
                                    className="w-full p-5 rounded-2xl bg-white dark:bg-surface-800 border-2 border-surface-200 dark:border-surface-700 hover:border-masters transition-all text-left"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-masters to-emerald-600 flex items-center justify-center">
                                            <Sparkles className="w-7 h-7 text-white" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="font-semibold text-surface-900 dark:text-white text-lg">
                                                Full Experience
                                            </div>
                                            <div className="text-surface-500 text-sm">
                                                Complete profile + fun extras • 2-3 min
                                            </div>
                                        </div>
                                        <ChevronRight className="w-5 h-5 text-surface-400" />
                                    </div>
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {/* Quick Profile Mode */}
                    {currentStep === 'quick-or-full' && mode === 'quick' && (
                        <motion.div
                            key="quick-profile"
                            initial={{ opacity: 0, x: 50 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -50 }}
                            className="p-6"
                        >
                            <QuickProfileMode
                                onComplete={handleQuickComplete}
                                onSwitchToFull={() => handleModeSelect('full')}
                                initialData={{
                                    firstName: data.firstName,
                                    lastName: data.lastName,
                                    email: data.email,
                                    handicapIndex: data.handicapIndex,
                                    phone: data.phone,
                                }}
                            />
                        </motion.div>
                    )}

                    {/* Basic Info Step */}
                    {currentStep === 'basic-info' && (
                        <motion.div
                            key="basic-info"
                            initial={{ opacity: 0, x: 50 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -50 }}
                            className="p-6 space-y-6"
                        >
                            <div className="text-center mb-6">
                                <div className="w-16 h-16 rounded-2xl bg-masters/10 mx-auto mb-4 flex items-center justify-center">
                                    <User className="w-8 h-8 text-masters" />
                                </div>
                                <h2 className="text-xl font-bold text-surface-900 dark:text-white">
                                    Let&apos;s get to know you
                                </h2>
                            </div>

                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-sm font-medium text-surface-600 dark:text-surface-400 mb-1">
                                            First Name *
                                        </label>
                                        <input
                                            type="text"
                                            value={data.firstName}
                                            onChange={(e) => updateData('firstName', e.target.value)}
                                            placeholder="John"
                                            className="w-full p-3 rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-surface-600 dark:text-surface-400 mb-1">
                                            Last Name *
                                        </label>
                                        <input
                                            type="text"
                                            value={data.lastName}
                                            onChange={(e) => updateData('lastName', e.target.value)}
                                            placeholder="Smith"
                                            className="w-full p-3 rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-white"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-surface-600 dark:text-surface-400 mb-1">
                                        Nickname (optional)
                                    </label>
                                    <input
                                        type="text"
                                        value={data.nickname || ''}
                                        onChange={(e) => updateData('nickname', e.target.value)}
                                        placeholder="What your buddies call you"
                                        className="w-full p-3 rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-white"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-surface-600 dark:text-surface-400 mb-1">
                                        Email *
                                    </label>
                                    <input
                                        type="email"
                                        value={data.email}
                                        onChange={(e) => updateData('email', e.target.value)}
                                        placeholder="john@example.com"
                                        className="w-full p-3 rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-white"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-surface-600 dark:text-surface-400 mb-1">
                                        Phone (optional)
                                    </label>
                                    <input
                                        type="tel"
                                        value={data.phone || ''}
                                        onChange={(e) => updateData('phone', e.target.value)}
                                        placeholder="(555) 123-4567"
                                        className="w-full p-3 rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-white"
                                    />
                                </div>
                            </div>

                            <button
                                onClick={nextStep}
                                disabled={!data.firstName || !data.lastName || !data.email}
                                className={cn(
                                    'w-full py-4 rounded-xl font-semibold text-lg transition-all flex items-center justify-center gap-2',
                                    data.firstName && data.lastName && data.email
                                        ? 'bg-masters text-white'
                                        : 'bg-surface-200 dark:bg-surface-700 text-surface-400'
                                )}
                            >
                                Continue
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        </motion.div>
                    )}

                    {/* Golf Info Step */}
                    {currentStep === 'golf-info' && (
                        <motion.div
                            key="golf-info"
                            initial={{ opacity: 0, x: 50 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -50 }}
                            className="p-6 space-y-6"
                        >
                            <GHINLookup
                                onResult={handleGHINResult}
                                initialGhin={data.ghinNumber}
                            />

                            {!data.ghinVerified && (
                                <div className="space-y-4">
                                    <div className="relative text-center">
                                        <div className="absolute inset-0 flex items-center">
                                            <div className="w-full border-t border-surface-200 dark:border-surface-700" />
                                        </div>
                                        <span className="relative bg-gradient-to-b from-surface-50 to-surface-100 dark:from-surface-900 dark:to-surface-950 px-4 text-sm text-surface-500">
                                            or enter manually
                                        </span>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-surface-600 dark:text-surface-400 mb-1">
                                            Handicap Index *
                                        </label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={data.handicapIndex ?? ''}
                                            onChange={(e) => updateData('handicapIndex', e.target.value ? parseFloat(e.target.value) : null)}
                                            placeholder="12.5"
                                            className="w-full p-3 rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-white"
                                        />
                                    </div>
                                </div>
                            )}

                            <button
                                onClick={nextStep}
                                disabled={data.handicapIndex === null}
                                className={cn(
                                    'w-full py-4 rounded-xl font-semibold text-lg transition-all flex items-center justify-center gap-2',
                                    data.handicapIndex !== null
                                        ? 'bg-masters text-white'
                                        : 'bg-surface-200 dark:bg-surface-700 text-surface-400'
                                )}
                            >
                                Continue
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        </motion.div>
                    )}

                    {/* Photo Step */}
                    {currentStep === 'photo' && (
                        <motion.div
                            key="photo"
                            initial={{ opacity: 0, x: 50 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -50 }}
                            className="p-6"
                        >
                            <ProfilePhotoUpload
                                currentPhoto={data.photo}
                                onPhotoChange={(photo) => updateData('photo', photo || undefined)}
                                userName={`${data.firstName} ${data.lastName}`}
                            />

                            <button
                                onClick={nextStep}
                                className="w-full mt-8 py-4 rounded-xl bg-masters text-white font-semibold text-lg flex items-center justify-center gap-2"
                            >
                                Continue
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        </motion.div>
                    )}

                    {/* Availability Step */}
                    {currentStep === 'availability' && (
                        <motion.div
                            key="availability"
                            initial={{ opacity: 0, x: 50 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -50 }}
                            className="p-6"
                        >
                            <AvailabilityCalendar
                                tripStartDate={tripPreview.startDate}
                                tripEndDate={tripPreview.endDate || tripPreview.startDate}
                                sessions={sessions}
                                onAvailabilityChange={(availability) => updateData('availability', availability)}
                                initialAvailability={data.availability}
                            />

                            <button
                                onClick={nextStep}
                                className="w-full mt-6 py-4 rounded-xl bg-masters text-white font-semibold text-lg flex items-center justify-center gap-2"
                            >
                                Continue
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        </motion.div>
                    )}

                    {/* Style Survey Step */}
                    {currentStep === 'style-survey' && (
                        <motion.div
                            key="style-survey"
                            initial={{ opacity: 0, x: 50 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -50 }}
                            className="p-6"
                        >
                            <PlayingStyleSurvey
                                onComplete={(style) => {
                                    updateData('playingStyle', style);
                                    nextStep();
                                }}
                                onSkip={skipStep}
                                initialStyle={data.playingStyle}
                            />
                        </motion.div>
                    )}

                    {/* Superlatives Step */}
                    {currentStep === 'superlatives' && (
                        <motion.div
                            key="superlatives"
                            initial={{ opacity: 0, x: 50 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -50 }}
                            className="p-6"
                        >
                            <GolfSuperlatives
                                onComplete={(answers) => {
                                    updateData('superlatives', answers);
                                    nextStep();
                                }}
                                onSkip={skipStep}
                                maxQuestions={4}
                            />
                        </motion.div>
                    )}

                    {/* Side Bets Step */}
                    {currentStep === 'side-bets' && sideBets && (
                        <motion.div
                            key="side-bets"
                            initial={{ opacity: 0, x: 50 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -50 }}
                            className="p-6"
                        >
                            <SideBetOptIn
                                availableBets={sideBets}
                                onPreferencesChange={(prefs) => updateData('sideBetPreferences', prefs)}
                                initialPreferences={data.sideBetPreferences}
                            />

                            <button
                                onClick={nextStep}
                                className="w-full mt-6 py-4 rounded-xl bg-masters text-white font-semibold text-lg flex items-center justify-center gap-2"
                            >
                                Continue
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        </motion.div>
                    )}

                    {/* Travel Step */}
                    {currentStep === 'travel' && (
                        <motion.div
                            key="travel"
                            initial={{ opacity: 0, x: 50 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -50 }}
                            className="p-6"
                        >
                            <TravelLodgingInfo
                                onInfoChange={(info) => updateData('travelInfo', info)}
                                initialInfo={data.travelInfo}
                                tripStartDate={tripPreview.startDate}
                                tripEndDate={tripPreview.endDate}
                                teammates={teammates}
                            />

                            <button
                                onClick={nextStep}
                                className="w-full mt-6 py-4 rounded-xl bg-masters text-white font-semibold text-lg flex items-center justify-center gap-2"
                            >
                                Complete Setup
                                <Check className="w-5 h-5" />
                            </button>
                        </motion.div>
                    )}

                    {/* Complete Step */}
                    {currentStep === 'complete' && (
                        <motion.div
                            key="complete"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                        >
                            <ProfileCompletionReward
                                data={completionData}
                                onContinue={handleComplete}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>
        </div>
    );
}

export default PlayerOnboardingWizard;
