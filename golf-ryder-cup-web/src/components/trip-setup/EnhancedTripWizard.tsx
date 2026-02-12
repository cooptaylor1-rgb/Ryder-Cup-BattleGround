'use client';

import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ChevronRight,
    ChevronLeft,
    Check,
    Sparkles,
    Users,
    MapPin,
    Calendar,
    Trophy,
    Settings,
    Calculator,
    Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Import all trip setup components
import {
    SessionBuilder,
    PlayerCountSelector,
    CourseSelection,
    HandicapRules,
    PointSystem,
    SideBetPresets,
    ScoringFormatOptions,
    TeamColorPicker,
    TeeTimePreferences,
    PlayerRosterImport,
    DEFAULT_HANDICAP_SETTINGS,
    DEFAULT_POINT_CONFIG,
    DEFAULT_SCORING_SETTINGS,
    DEFAULT_TEAM_COLORS,
    DEFAULT_TEE_TIME_SETTINGS,
    type SessionConfig,
    type CourseInfo,
    type HandicapSettings,
    type PointConfig,
    type SessionPointOverride,
    type SideBetConfig,
    type ScoringSettings,
    type TeamColors,
    type TeeTimeSettings,
    type PlayerInfo,
} from '@/components/trip-setup';

type WizardStep =
    | 'basics'
    | 'players'
    | 'sessions'
    | 'courses'
    | 'scoring'
    | 'rules'
    | 'extras'
    | 'review';

interface StepConfig {
    id: WizardStep;
    label: string;
    shortLabel: string;
    icon: React.ReactNode;
    description: string;
}

const WIZARD_STEPS: StepConfig[] = [
    { id: 'basics', label: 'Trip Basics', shortLabel: 'Basics', icon: <Calendar className="w-5 h-5" />, description: 'Name, dates, and teams' },
    { id: 'players', label: 'Player Roster', shortLabel: 'Players', icon: <Users className="w-5 h-5" />, description: 'Add and assign players' },
    { id: 'sessions', label: 'Session Builder', shortLabel: 'Sessions', icon: <Trophy className="w-5 h-5" />, description: 'Configure tournament structure' },
    { id: 'courses', label: 'Courses', shortLabel: 'Courses', icon: <MapPin className="w-5 h-5" />, description: 'Select golf courses' },
    { id: 'scoring', label: 'Scoring System', shortLabel: 'Scoring', icon: <Calculator className="w-5 h-5" />, description: 'Points and format' },
    { id: 'rules', label: 'Handicap Rules', shortLabel: 'Rules', icon: <Settings className="w-5 h-5" />, description: 'Stroke allowances' },
    { id: 'extras', label: 'Extras', shortLabel: 'Extras', icon: <Sparkles className="w-5 h-5" />, description: 'Side bets, colors, tee times' },
    { id: 'review', label: 'Review & Create', shortLabel: 'Review', icon: <Check className="w-5 h-5" />, description: 'Final review' },
];

export interface TripSetupData {
    // Basics
    tripName: string;
    startDate: string;
    endDate: string;
    location: string;

    // Teams
    teamColors: TeamColors;
    playersPerTeam: number;
    players: PlayerInfo[];

    // Sessions
    totalDays: number;
    sessions: SessionConfig[];

    // Courses
    courses: CourseInfo[];

    // Scoring
    pointConfig: PointConfig;
    sessionPointOverrides: SessionPointOverride[];
    scoringSettings: ScoringSettings;

    // Rules
    handicapSettings: HandicapSettings;

    // Extras
    sideBets: SideBetConfig[];
    teeTimeSettings: TeeTimeSettings;
}

const DEFAULT_SETUP_DATA: TripSetupData = {
    tripName: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    location: '',
    teamColors: DEFAULT_TEAM_COLORS,
    playersPerTeam: 8,
    players: [],
    totalDays: 3,
    sessions: [],
    courses: [],
    pointConfig: DEFAULT_POINT_CONFIG,
    sessionPointOverrides: [],
    scoringSettings: DEFAULT_SCORING_SETTINGS,
    handicapSettings: DEFAULT_HANDICAP_SETTINGS,
    sideBets: [],
    teeTimeSettings: DEFAULT_TEE_TIME_SETTINGS,
};

interface EnhancedTripWizardProps {
    onComplete: (data: TripSetupData) => void;
    onCancel: () => void;
    initialData?: Partial<TripSetupData>;
    className?: string;
}

export function EnhancedTripWizard({
    onComplete,
    onCancel,
    initialData,
    className,
}: EnhancedTripWizardProps) {
    const [currentStep, setCurrentStep] = useState<WizardStep>('basics');
    const [data, setData] = useState<TripSetupData>({
        ...DEFAULT_SETUP_DATA,
        ...initialData,
    });
    const [visitedSteps, setVisitedSteps] = useState<Set<WizardStep>>(new Set(['basics']));

    const currentStepIndex = WIZARD_STEPS.findIndex(s => s.id === currentStep);
    const currentStepConfig = WIZARD_STEPS[currentStepIndex];
    const isLastStep = currentStepIndex === WIZARD_STEPS.length - 1;
    const isFirstStep = currentStepIndex === 0;

    const updateData = useCallback(<K extends keyof TripSetupData>(
        key: K,
        value: TripSetupData[K]
    ) => {
        setData(prev => ({ ...prev, [key]: value }));
    }, []);

    const goToStep = useCallback((step: WizardStep) => {
        setCurrentStep(step);
        setVisitedSteps(prev => new Set([...prev, step]));
    }, []);

    const goNext = useCallback(() => {
        const nextIndex = currentStepIndex + 1;
        if (nextIndex < WIZARD_STEPS.length) {
            goToStep(WIZARD_STEPS[nextIndex].id);
        }
    }, [currentStepIndex, goToStep]);

    const goPrev = useCallback(() => {
        const prevIndex = currentStepIndex - 1;
        if (prevIndex >= 0) {
            setCurrentStep(WIZARD_STEPS[prevIndex].id);
        }
    }, [currentStepIndex]);

    const handleComplete = useCallback(() => {
        onComplete(data);
    }, [data, onComplete]);

    // Calculate completion status for each step
    const stepCompletion = useMemo(() => {
        return {
            basics: Boolean(data.tripName.trim()),
            players: data.players.length >= 2,
            sessions: data.sessions.length >= 1,
            courses: data.courses.length >= 1,
            scoring: true, // Always valid with defaults
            rules: true, // Always valid with defaults
            extras: true, // Always valid
            review: true,
        };
    }, [data]);

    const _canProceed = stepCompletion[currentStep];

    return (
        <div className={cn('flex flex-col h-full', className)}>
            {/* Header with progress */}
            <div className="px-4 py-3 border-b border-[var(--rule)]">
                {/* Step indicator */}
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-xl bg-[color:var(--masters)]/10 flex items-center justify-center text-[var(--masters)]">
                            {currentStepConfig.icon}
                        </div>
                        <div>
                            <h2 className="font-semibold">{currentStepConfig.label}</h2>
                            <p className="text-xs text-[var(--ink-tertiary)]">{currentStepConfig.description}</p>
                        </div>
                    </div>
                    <span className="text-sm text-[var(--ink-tertiary)]">
                        {currentStepIndex + 1} of {WIZARD_STEPS.length}
                    </span>
                </div>

                {/* Progress dots */}
                <div className="flex gap-1.5">
                    {WIZARD_STEPS.map((step, index) => (
                        <button
                            key={step.id}
                            onClick={() => visitedSteps.has(step.id) && goToStep(step.id)}
                            disabled={!visitedSteps.has(step.id)}
                            className={cn(
                                'flex-1 h-1.5 rounded-full transition-all',
                                index === currentStepIndex
                                    ? 'bg-[var(--masters)]'
                                    : visitedSteps.has(step.id)
                                        ? stepCompletion[step.id]
                                            ? 'bg-[color:var(--masters)]/40'
                                            : 'bg-[var(--warning)]'
                                        : 'bg-[color:var(--ink-tertiary)]/25'
                            )}
                        />
                    ))}
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentStep}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="p-4"
                    >
                        {currentStep === 'basics' && (
                            <BasicsStep data={data} updateData={updateData} />
                        )}
                        {currentStep === 'players' && (
                            <PlayerRosterImport
                                players={data.players}
                                onPlayersChange={(p) => updateData('players', p)}
                                teamAName={data.teamColors.teamA.name}
                                teamBName={data.teamColors.teamB.name}
                                playersPerTeam={data.playersPerTeam}
                            />
                        )}
                        {currentStep === 'sessions' && (
                            <div className="space-y-6">
                                <PlayerCountSelector
                                    playersPerTeam={data.playersPerTeam}
                                    onPlayersPerTeamChange={(p) => updateData('playersPerTeam', p)}
                                />
                                <SessionBuilder
                                    sessions={data.sessions}
                                    onSessionsChange={(s) => updateData('sessions', s)}
                                    totalDays={data.totalDays}
                                    onTotalDaysChange={(d) => updateData('totalDays', d)}
                                    playersPerTeam={data.playersPerTeam}
                                />
                            </div>
                        )}
                        {currentStep === 'courses' && (
                            <CourseSelection
                                selectedCourses={data.courses}
                                onCoursesChange={(c) => updateData('courses', c)}
                                maxCourses={data.totalDays}
                            />
                        )}
                        {currentStep === 'scoring' && (
                            <div className="space-y-6">
                                <ScoringFormatOptions
                                    settings={data.scoringSettings}
                                    onSettingsChange={(s) => updateData('scoringSettings', s)}
                                />
                                <PointSystem
                                    config={data.pointConfig}
                                    onConfigChange={(c) => updateData('pointConfig', c)}
                                    sessionOverrides={data.sessionPointOverrides}
                                    onSessionOverridesChange={(o) => updateData('sessionPointOverrides', o)}
                                />
                            </div>
                        )}
                        {currentStep === 'rules' && (
                            <HandicapRules
                                settings={data.handicapSettings}
                                onSettingsChange={(s) => updateData('handicapSettings', s)}
                            />
                        )}
                        {currentStep === 'extras' && (
                            <div className="space-y-6">
                                <TeamColorPicker
                                    colors={data.teamColors}
                                    onColorsChange={(c) => updateData('teamColors', c)}
                                />
                                <TeeTimePreferences
                                    settings={data.teeTimeSettings}
                                    onSettingsChange={(s) => updateData('teeTimeSettings', s)}
                                    matchCount={data.sessions.reduce((sum, s) => sum + s.matchCount, 0) || 4}
                                />
                                <SideBetPresets
                                    sideBets={data.sideBets}
                                    onSideBetsChange={(b) => updateData('sideBets', b)}
                                />
                            </div>
                        )}
                        {currentStep === 'review' && (
                            <ReviewStep data={data} />
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Footer with navigation */}
            <div className="p-4 border-t border-[var(--rule)] flex gap-3">
                {isFirstStep ? (
                    <button
                        onClick={onCancel}
                        className="btn-secondary flex-1"
                    >
                        Cancel
                    </button>
                ) : (
                    <button
                        onClick={goPrev}
                        className="btn-secondary flex-1"
                    >
                        <ChevronLeft className="w-4 h-4 mr-1" />
                        Back
                    </button>
                )}

                {isLastStep ? (
                    <button
                        onClick={handleComplete}
                        disabled={!data.tripName.trim()}
                        className="btn-primary flex-1"
                    >
                        <Zap className="w-4 h-4 mr-1" />
                        Create Trip
                    </button>
                ) : (
                    <button
                        onClick={goNext}
                        className="btn-primary flex-1"
                    >
                        Next
                        <ChevronRight className="w-4 h-4 ml-1" />
                    </button>
                )}
            </div>
        </div>
    );
}

// Basics Step Component
function BasicsStep({
    data,
    updateData,
}: {
    data: TripSetupData;
    updateData: <K extends keyof TripSetupData>(key: K, value: TripSetupData[K]) => void;
}) {
    return (
        <div className="space-y-6">
            <div>
                <label className="block text-sm font-medium mb-1.5">Trip Name *</label>
                <input
                    type="text"
                    value={data.tripName}
                    onChange={(e) => updateData('tripName', e.target.value)}
                    placeholder="e.g., Myrtle Beach 2026"
                    className="input w-full text-lg"
                    autoFocus
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium mb-1.5">Start Date</label>
                    <input
                        type="date"
                        value={data.startDate}
                        onChange={(e) => updateData('startDate', e.target.value)}
                        className="input w-full"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1.5">End Date</label>
                    <input
                        type="date"
                        value={data.endDate}
                        onChange={(e) => updateData('endDate', e.target.value)}
                        min={data.startDate}
                        className="input w-full"
                    />
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium mb-1.5">Location</label>
                <input
                    type="text"
                    value={data.location}
                    onChange={(e) => updateData('location', e.target.value)}
                    placeholder="e.g., Myrtle Beach, SC"
                    className="input w-full"
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium mb-1.5">Team 1 Name</label>
                    <input
                        type="text"
                        value={data.teamColors.teamA.name}
                        onChange={(e) => updateData('teamColors', {
                            ...data.teamColors,
                            teamA: { ...data.teamColors.teamA, name: e.target.value }
                        })}
                        placeholder="Team USA"
                        className="input w-full"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1.5">Team 2 Name</label>
                    <input
                        type="text"
                        value={data.teamColors.teamB.name}
                        onChange={(e) => updateData('teamColors', {
                            ...data.teamColors,
                            teamB: { ...data.teamColors.teamB, name: e.target.value }
                        })}
                        placeholder="Team Europe"
                        className="input w-full"
                    />
                </div>
            </div>
        </div>
    );
}

// Review Step Component
function ReviewStep({ data }: { data: TripSetupData }) {
    const totalMatches = data.sessions.reduce((sum, s) => sum + s.matchCount, 0);
    const totalPoints = data.sessions.reduce((sum, s) => sum + s.matchCount * s.pointsPerMatch, 0);

    return (
        <div className="space-y-4">
            <div className="text-center mb-6">
                <h3 className="text-xl font-bold">{data.tripName || 'Untitled Trip'}</h3>
                <p className="text-[var(--ink-tertiary)]">{data.location || 'Location TBD'}</p>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-2 gap-3">
                <div className="card p-4 text-center">
                    <p className="text-3xl font-bold text-[var(--masters)]">{data.players.length}</p>
                    <p className="text-sm text-[var(--ink-tertiary)]">Players</p>
                </div>
                <div className="card p-4 text-center">
                    <p className="text-3xl font-bold text-[var(--masters)]">{data.totalDays}</p>
                    <p className="text-sm text-[var(--ink-tertiary)]">Days</p>
                </div>
                <div className="card p-4 text-center">
                    <p className="text-3xl font-bold text-[var(--masters)]">{data.sessions.length}</p>
                    <p className="text-sm text-[var(--ink-tertiary)]">Sessions</p>
                </div>
                <div className="card p-4 text-center">
                    <p className="text-3xl font-bold text-[var(--masters)]">{totalMatches}</p>
                    <p className="text-sm text-[var(--ink-tertiary)]">Matches</p>
                </div>
            </div>

            {/* Team preview */}
            <div className="flex items-stretch rounded-xl overflow-hidden">
                <div
                    className="flex-1 p-4 text-center"
                    style={{ backgroundColor: data.teamColors.teamA.secondary }}
                >
                    <p className="font-bold" style={{ color: data.teamColors.teamA.primary }}>
                        {data.teamColors.teamA.name}
                    </p>
                    <p className="text-2xl font-bold mt-1" style={{ color: data.teamColors.teamA.primary }}>
                        {data.players.filter(p => p.team === 'A').length}
                    </p>
                    <p className="text-xs text-[var(--ink-tertiary)]">players</p>
                </div>
                <div className="w-px bg-[var(--rule)]" />
                <div
                    className="flex-1 p-4 text-center"
                    style={{ backgroundColor: data.teamColors.teamB.secondary }}
                >
                    <p className="font-bold" style={{ color: data.teamColors.teamB.primary }}>
                        {data.teamColors.teamB.name}
                    </p>
                    <p className="text-2xl font-bold mt-1" style={{ color: data.teamColors.teamB.primary }}>
                        {data.players.filter(p => p.team === 'B').length}
                    </p>
                    <p className="text-xs text-[var(--ink-tertiary)]">players</p>
                </div>
            </div>

            {/* Details list */}
            <div className="card divide-y divide-[var(--rule)]">
                <div className="p-3 flex justify-between">
                    <span className="text-[var(--ink-tertiary)]">Courses</span>
                    <span className="font-medium">{data.courses.length} selected</span>
                </div>
                <div className="p-3 flex justify-between">
                    <span className="text-[var(--ink-tertiary)]">Total Points</span>
                    <span className="font-medium">{totalPoints}</span>
                </div>
                <div className="p-3 flex justify-between">
                    <span className="text-[var(--ink-tertiary)]">Format</span>
                    <span className="font-medium capitalize">{data.scoringSettings.defaultFormat.replace('-', ' ')}</span>
                </div>
                <div className="p-3 flex justify-between">
                    <span className="text-[var(--ink-tertiary)]">Handicap</span>
                    <span className="font-medium">
                        {data.handicapSettings.useNetScoring
                            ? `${data.handicapSettings.allowancePercent}% allowance`
                            : 'Gross scoring'}
                    </span>
                </div>
                <div className="p-3 flex justify-between">
                    <span className="text-[var(--ink-tertiary)]">Side Bets</span>
                    <span className="font-medium">{data.sideBets.length} configured</span>
                </div>
                <div className="p-3 flex justify-between">
                    <span className="text-[var(--ink-tertiary)]">First Tee</span>
                    <span className="font-medium">{data.teeTimeSettings.firstTeeTime}</span>
                </div>
            </div>

            <div className="p-4 rounded-xl bg-[color:var(--masters)]/10 border border-[color:var(--masters)]/25 text-center">
                <Zap className="w-8 h-8 mx-auto text-[var(--masters)] mb-2" />
                <p className="font-medium text-[var(--masters)]">Ready to create your trip!</p>
                <p className="text-sm text-[var(--ink-tertiary)] mt-1">
                    You can always edit these settings later
                </p>
            </div>
        </div>
    );
}

export default EnhancedTripWizard;
