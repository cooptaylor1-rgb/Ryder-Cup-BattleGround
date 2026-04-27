'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
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
import { Button } from '@/components/ui/Button';

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

type WizardMode = 'quick' | 'full';

interface StepConfig {
  id: WizardStep;
  label: string;
  shortLabel: string;
  icon: React.ReactNode;
  description: string;
}

const ALL_WIZARD_STEPS: StepConfig[] = [
  {
    id: 'basics',
    label: 'Trip Basics',
    shortLabel: 'Basics',
    icon: <Calendar className="w-5 h-5" />,
    description: 'Name, dates, and teams',
  },
  {
    id: 'sessions',
    label: 'Session Builder',
    shortLabel: 'Sessions',
    icon: <Trophy className="w-5 h-5" />,
    description: 'Configure tournament structure',
  },
  {
    id: 'courses',
    label: 'Courses',
    shortLabel: 'Courses',
    icon: <MapPin className="w-5 h-5" />,
    description: 'Select golf courses',
  },
  {
    id: 'scoring',
    label: 'Scoring System',
    shortLabel: 'Scoring',
    icon: <Calculator className="w-5 h-5" />,
    description: 'Points and format',
  },
  {
    id: 'rules',
    label: 'Handicap Rules',
    shortLabel: 'Rules',
    icon: <Settings className="w-5 h-5" />,
    description: 'Stroke allowances',
  },
  {
    id: 'extras',
    label: 'Extras',
    shortLabel: 'Extras',
    icon: <Sparkles className="w-5 h-5" />,
    description: 'Side bets, colors, tee times',
  },
  // Players comes after the trip's shape is decided so captains finish all
  // the decisions (formats, tee times, courses, scoring rules) before they
  // start worrying about who's on the list. Otherwise captains end up
  // bouncing back to Players to reshuffle after each session change.
  {
    id: 'players',
    label: 'Player Roster',
    shortLabel: 'Players',
    icon: <Users className="w-5 h-5" />,
    description: 'Add and assign players',
  },
  {
    id: 'review',
    label: 'Review & Create',
    shortLabel: 'Review',
    icon: <Check className="w-5 h-5" />,
    description: 'Final review',
  },
];

/**
 * Steps that are always required. Courses, Scoring, Rules, and Extras have
 * sane defaults, so in Quick Setup they're skipped; captains can customize
 * them later from trip settings.
 */
const QUICK_STEPS: WizardStep[] = ['basics', 'sessions', 'players', 'review'];

function getStepsForMode(mode: WizardMode): StepConfig[] {
  if (mode === 'full') return ALL_WIZARD_STEPS;
  return ALL_WIZARD_STEPS.filter((step) => QUICK_STEPS.includes(step.id));
}

export interface TripSetupData {
  // Basics
  tripName: string;
  captainName: string;
  startDate: string;
  endDate: string;
  location: string;

  /**
   * If true, the trip is a casual practice round instead of a cup-style
   * team competition. The team-vs-team scoreboard is hidden on the home
   * and standings pages; sessions, matches, and scoring still work.
   */
  isPracticeRound: boolean;

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

export const TRIP_WIZARD_STORAGE_KEY = 'trip-wizard-draft';

const DEFAULT_SETUP_DATA: TripSetupData = {
  tripName: '',
  captainName: '',
  startDate: new Date().toISOString().split('T')[0],
  endDate: '',
  location: '',
  isPracticeRound: false,
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
  /**
   * Initial wizard mode. 'quick' shows only Basics / Players / Sessions /
   * Review — optional steps (Courses, Scoring, Handicap Rules, Extras)
   * are skipped and the trip uses defaults, which captains can tune later
   * from trip settings. Defaults to 'quick'.
   */
  initialMode?: WizardMode;
}

export function EnhancedTripWizard({
  onComplete,
  onCancel,
  initialData,
  className,
  initialMode = 'quick',
}: EnhancedTripWizardProps) {
  const [mode, setMode] = useState<WizardMode>(() => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem(TRIP_WIZARD_STORAGE_KEY + '-mode');
      if (saved === 'quick' || saved === 'full') return saved;
    }
    return initialMode;
  });
  const wizardSteps = useMemo(() => getStepsForMode(mode), [mode]);

  const [currentStep, setCurrentStep] = useState<WizardStep>(() => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem(TRIP_WIZARD_STORAGE_KEY + '-step');
      if (saved && ALL_WIZARD_STEPS.some((s) => s.id === saved)) {
        return saved as WizardStep;
      }
    }
    return 'basics';
  });
  const [data, setData] = useState<TripSetupData>(() => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem(TRIP_WIZARD_STORAGE_KEY);
      if (saved) {
        try {
          return { ...DEFAULT_SETUP_DATA, ...JSON.parse(saved) };
        } catch {
          // Corrupted data — ignore
        }
      }
    }
    return { ...DEFAULT_SETUP_DATA, ...initialData };
  });
  const [visitedSteps, setVisitedSteps] = useState<Set<WizardStep>>(new Set(['basics']));

  // Auto-save wizard state for draft recovery
  useEffect(() => {
    sessionStorage.setItem(TRIP_WIZARD_STORAGE_KEY, JSON.stringify(data));
    sessionStorage.setItem(TRIP_WIZARD_STORAGE_KEY + '-step', currentStep);
    sessionStorage.setItem(TRIP_WIZARD_STORAGE_KEY + '-mode', mode);
  }, [data, currentStep, mode]);

  // If the user switches modes mid-flow to a smaller set of steps while
  // parked on a step that no longer exists, land them on the nearest
  // remaining step so the wizard doesn't render a blank page.
  useEffect(() => {
    if (!wizardSteps.some((s) => s.id === currentStep)) {
      setCurrentStep(wizardSteps[0].id);
    }
  }, [wizardSteps, currentStep]);

  useEffect(() => {
    if (!data.startDate) return;

    const safeTotalDays = Math.max(data.totalDays || 1, 1);
    const startDate = new Date(`${data.startDate}T00:00:00`);
    if (Number.isNaN(startDate.getTime())) return;

    const computedEndDate = new Date(startDate);
    computedEndDate.setDate(startDate.getDate() + safeTotalDays - 1);
    const nextEndDate = computedEndDate.toISOString().split('T')[0] || data.startDate;

    if (!data.endDate || data.endDate < data.startDate || data.endDate !== nextEndDate) {
      setData((prev) => ({
        ...prev,
        endDate: nextEndDate,
      }));
    }
  }, [data.endDate, data.startDate, data.totalDays]);

  const currentStepIndex = wizardSteps.findIndex((s) => s.id === currentStep);
  const currentStepConfig = wizardSteps[currentStepIndex] ?? wizardSteps[0];
  const isLastStep = currentStepIndex === wizardSteps.length - 1;
  const isFirstStep = currentStepIndex === 0;

  const updateData = useCallback(
    <K extends keyof TripSetupData>(key: K, value: TripSetupData[K]) => {
      setData((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const goToStep = useCallback((step: WizardStep) => {
    setCurrentStep(step);
    setVisitedSteps((prev) => new Set([...prev, step]));
  }, []);

  const goNext = useCallback(() => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < wizardSteps.length) {
      goToStep(wizardSteps[nextIndex].id);
    }
  }, [currentStepIndex, goToStep, wizardSteps]);

  const goPrev = useCallback(() => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(wizardSteps[prevIndex].id);
    }
  }, [currentStepIndex, wizardSteps]);

  const handleComplete = useCallback(() => {
    sessionStorage.removeItem(TRIP_WIZARD_STORAGE_KEY);
    sessionStorage.removeItem(TRIP_WIZARD_STORAGE_KEY + '-step');
    sessionStorage.removeItem(TRIP_WIZARD_STORAGE_KEY + '-mode');
    onComplete(data);
  }, [data, onComplete]);

  const handleCancel = useCallback(() => {
    sessionStorage.removeItem(TRIP_WIZARD_STORAGE_KEY);
    sessionStorage.removeItem(TRIP_WIZARD_STORAGE_KEY + '-step');
    sessionStorage.removeItem(TRIP_WIZARD_STORAGE_KEY + '-mode');
    onCancel();
  }, [onCancel]);

  // Calculate completion status for each step
  const stepCompletion = useMemo(() => {
    const hasValidBasics = Boolean(
      data.tripName.trim() &&
      data.startDate &&
      (data.isPracticeRound ||
        (data.teamColors.teamA.name.trim() && data.teamColors.teamB.name.trim()))
    );

    return {
      basics: hasValidBasics,
      players: data.players.length >= 4,
      sessions:
        data.sessions.length >= 1 && data.sessions.every((session) => session.matchCount > 0),
      courses: true,
      scoring: true, // Always valid with defaults
      rules: true, // Always valid with defaults
      extras: true, // Always valid
      review: true,
    };
  }, [data]);

  const canProceed = stepCompletion[currentStep];
  const nextDisabledMessage = !canProceed
    ? currentStep === 'basics'
      ? 'Add the trip name and both team names to keep going.'
      : currentStep === 'players'
        ? 'Add at least four players so the trip has a real field.'
        : currentStep === 'sessions'
          ? 'Create at least one session before reviewing the trip.'
          : 'Complete the required fields before continuing.'
    : null;

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
            {currentStepIndex + 1} of {wizardSteps.length}
          </span>
        </div>

        {/* Progress dots */}
        <div className="flex gap-1.5">
          {wizardSteps.map((step, index) => (
            <button
              type="button"
              key={step.id}
              onClick={() => visitedSteps.has(step.id) && goToStep(step.id)}
              disabled={!visitedSteps.has(step.id)}
              aria-label={`${step.label}${index === currentStepIndex ? ', current step' : ''}`}
              className="group flex min-h-8 flex-1 items-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)] disabled:cursor-not-allowed"
            >
              <span
                className={cn(
                  'block h-1.5 w-full rounded-full transition-all group-hover:h-2',
                  index === currentStepIndex
                    ? 'bg-[var(--masters)]'
                    : visitedSteps.has(step.id)
                      ? stepCompletion[step.id]
                        ? 'bg-[color:var(--masters)]/40'
                        : 'bg-[var(--warning)]'
                      : 'bg-[color:var(--ink-tertiary)]/25'
                )}
              />
            </button>
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
              <BasicsStep data={data} updateData={updateData} mode={mode} onModeChange={setMode} />
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
            {currentStep === 'review' && <ReviewStep data={data} />}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer with navigation */}
      <div className="p-4 border-t border-[var(--rule)] flex gap-3">
        {nextDisabledMessage && !isLastStep && (
          <p className="absolute sr-only">{nextDisabledMessage}</p>
        )}
        {isFirstStep ? (
          <Button variant="secondary" onClick={handleCancel} className="flex-1">
            Cancel
          </Button>
        ) : (
          <Button
            variant="secondary"
            onClick={goPrev}
            leftIcon={<ChevronLeft className="w-4 h-4" />}
            className="flex-1"
          >
            Back
          </Button>
        )}

        {isLastStep ? (
          <Button
            variant="primary"
            onClick={handleComplete}
            disabled={!stepCompletion.basics || !stepCompletion.players || !stepCompletion.sessions}
            leftIcon={<Zap className="w-4 h-4" />}
            className="flex-1"
          >
            Create Trip
          </Button>
        ) : (
          <Button
            variant="primary"
            onClick={goNext}
            disabled={!canProceed}
            rightIcon={<ChevronRight className="w-4 h-4" />}
            className="flex-1"
          >
            Next
          </Button>
        )}
      </div>
      {nextDisabledMessage && !isLastStep ? (
        <div className="px-4 pb-4">
          <p className="rounded-xl bg-[var(--surface-secondary)] px-3 py-2 text-sm text-[var(--ink-secondary)]">
            {nextDisabledMessage}
          </p>
        </div>
      ) : null}
    </div>
  );
}

// Basics Step Component
function BasicsStep({
  data,
  updateData,
  mode,
  onModeChange,
}: {
  data: TripSetupData;
  updateData: <K extends keyof TripSetupData>(key: K, value: TripSetupData[K]) => void;
  mode: WizardMode;
  onModeChange: (mode: WizardMode) => void;
}) {
  return (
    <div className="space-y-6">
      {/* Setup depth — Quick (4 steps) vs Full (8 steps) */}
      <div className="rounded-xl border border-[var(--rule)] bg-[var(--surface-elevated)] p-3">
        <div className="flex items-center justify-between gap-3 mb-2">
          <div>
            <p className="text-sm font-semibold">Setup</p>
            <p className="mt-0.5 text-xs text-[var(--ink-tertiary)]">
              {mode === 'quick'
                ? '4 steps — good defaults; customize later.'
                : '8 steps — fine-tune scoring, rules, courses, and extras now.'}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onModeChange('quick')}
            aria-pressed={mode === 'quick'}
            className={cn(
              'min-h-11 rounded-lg border px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)] active:scale-[0.98]',
              mode === 'quick'
                ? 'border-[var(--masters)] bg-[var(--masters-soft)] font-semibold'
                : 'border-[var(--rule)] bg-[var(--canvas)] hover:border-[var(--masters)]/40'
            )}
          >
            Quick Setup
          </button>
          <button
            type="button"
            onClick={() => onModeChange('full')}
            aria-pressed={mode === 'full'}
            className={cn(
              'min-h-11 rounded-lg border px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)] active:scale-[0.98]',
              mode === 'full'
                ? 'border-[var(--masters)] bg-[var(--masters-soft)] font-semibold'
                : 'border-[var(--rule)] bg-[var(--canvas)] hover:border-[var(--masters)]/40'
            )}
          >
            Full Setup
          </button>
        </div>
      </div>

      {/* Trip format — Ryder Cup vs Practice Round */}
      <div>
        <label className="block text-sm font-medium mb-2">Trip Format</label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => updateData('isPracticeRound', false)}
            aria-pressed={!data.isPracticeRound}
            className={`min-h-24 rounded-xl border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)] active:scale-[0.99] ${
              !data.isPracticeRound
                ? 'border-[var(--masters)] bg-[var(--masters-soft)]'
                : 'border-[var(--rule)] bg-[var(--surface-elevated)] hover:border-[var(--masters)]/40'
            }`}
          >
            <div className="text-sm font-semibold">Ryder Cup</div>
            <div className="mt-1 text-xs text-[var(--ink-tertiary)]">
              Two teams, points, leaderboard
            </div>
          </button>
          <button
            type="button"
            onClick={() => updateData('isPracticeRound', true)}
            aria-pressed={data.isPracticeRound}
            className={`min-h-24 rounded-xl border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)] active:scale-[0.99] ${
              data.isPracticeRound
                ? 'border-[var(--masters)] bg-[var(--masters-soft)]'
                : 'border-[var(--rule)] bg-[var(--surface-elevated)] hover:border-[var(--masters)]/40'
            }`}
          >
            <div className="text-sm font-semibold">Practice Round</div>
            <div className="mt-1 text-xs text-[var(--ink-tertiary)]">
              Casual pairings, no cup score
            </div>
          </button>
        </div>
      </div>

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

      <div>
        <label className="block text-sm font-medium mb-1.5">Captain Name</label>
        <input
          type="text"
          value={data.captainName}
          onChange={(e) => updateData('captainName', e.target.value)}
          placeholder="Who is running the trip?"
          className="input w-full"
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

      {!data.isPracticeRound && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Team 1 Name</label>
            <input
              type="text"
              value={data.teamColors.teamA.name}
              onChange={(e) =>
                updateData('teamColors', {
                  ...data.teamColors,
                  teamA: { ...data.teamColors.teamA, name: e.target.value },
                })
              }
              placeholder="Team USA"
              className="input w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Team 2 Name</label>
            <input
              type="text"
              value={data.teamColors.teamB.name}
              onChange={(e) =>
                updateData('teamColors', {
                  ...data.teamColors,
                  teamB: { ...data.teamColors.teamB, name: e.target.value },
                })
              }
              placeholder="Team Europe"
              className="input w-full"
            />
          </div>
        </div>
      )}
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
            {data.players.filter((p) => p.team === 'A').length}
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
            {data.players.filter((p) => p.team === 'B').length}
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
          <span className="font-medium capitalize">
            {data.scoringSettings.defaultFormat.replace('-', ' ')}
          </span>
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
          Scoring rules, handicap settings, and courses can be adjusted per-session from Trip
          Settings after creation.
        </p>
      </div>
    </div>
  );
}

export default EnhancedTripWizard;
