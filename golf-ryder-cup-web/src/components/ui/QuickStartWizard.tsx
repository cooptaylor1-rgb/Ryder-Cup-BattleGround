/**
 * Quick Start Wizard Component
 *
 * A guided, step-by-step flow for creating a new golf trip.
 * Reduces friction for first-time users by breaking down the process.
 *
 * Features:
 * - Progressive disclosure
 * - Smart defaults
 * - Inline validation
 * - Encouraging copy
 */

'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  X,
  ChevronRight,
  ChevronLeft,
  MapPin,
  Calendar,
  Users,
  Flag,
  Check,
  Sparkles,
} from 'lucide-react';
import {
  GolfersIllustration,
  TrophyIllustration,
} from './illustrations';

interface QuickStartWizardProps {
  onComplete: (tripData: TripData) => void;
  onCancel: () => void;
  className?: string;
}

interface TripData {
  name: string;
  location: string;
  startDate: string;
  endDate: string;
  teamAName: string;
  teamBName: string;
}

type Step = 'basics' | 'dates' | 'teams' | 'confirm';

const steps: Step[] = ['basics', 'dates', 'teams', 'confirm'];

export function QuickStartWizard({
  onComplete,
  onCancel,
  className,
}: QuickStartWizardProps) {
  const [currentStep, setCurrentStep] = useState<Step>('basics');
  const [isExiting, setIsExiting] = useState(false);
  const [tripData, setTripData] = useState<TripData>({
    name: '',
    location: '',
    startDate: '',
    endDate: '',
    teamAName: 'USA',
    teamBName: 'Europe',
  });

  const currentStepIndex = steps.indexOf(currentStep);
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === steps.length - 1;

  const handleNext = useCallback(() => {
    if (isLastStep) {
      setIsExiting(true);
      setTimeout(() => onComplete(tripData), 300);
    } else {
      setCurrentStep(steps[currentStepIndex + 1]);
    }
  }, [currentStepIndex, isLastStep, onComplete, tripData]);

  const handleBack = useCallback(() => {
    if (!isFirstStep) {
      setCurrentStep(steps[currentStepIndex - 1]);
    }
  }, [currentStepIndex, isFirstStep]);

  const handleCancel = useCallback(() => {
    setIsExiting(true);
    setTimeout(onCancel, 300);
  }, [onCancel]);

  const updateField = <K extends keyof TripData>(field: K, value: TripData[K]) => {
    setTripData((prev) => ({ ...prev, [field]: value }));
  };

  const canProceed = (): boolean => {
    switch (currentStep) {
      case 'basics':
        return tripData.name.trim().length > 0;
      case 'dates':
        return tripData.startDate.length > 0 && tripData.endDate.length > 0;
      case 'teams':
        return tripData.teamAName.trim().length > 0 && tripData.teamBName.trim().length > 0;
      case 'confirm':
        return true;
      default:
        return false;
    }
  };

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex flex-col',
        isExiting ? 'animate-fade-out' : 'animate-fade-in',
        className
      )}
      style={{ background: 'var(--canvas, #0F0D0A)' }}
    >
      {/* Header */}
      <header
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: '1px solid var(--rule, #3A3530)' }}
      >
        <button
          onClick={handleCancel}
          className="p-2 -ml-2 rounded-lg transition-colors"
          style={{ color: 'var(--ink-secondary, #B8B0A0)' }}
        >
          <X className="w-6 h-6" />
        </button>

        {/* Progress */}
        <div className="flex items-center gap-2">
          {steps.map((step, index) => (
            <div
              key={step}
              className={cn(
                'w-8 h-1 rounded-full transition-colors',
              )}
              style={{
                background: index <= currentStepIndex
                  ? 'var(--masters, #006747)'
                  : 'var(--rule, #3A3530)',
              }}
            />
          ))}
        </div>

        <div className="w-10" /> {/* Spacer for centering */}
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-8">
        {currentStep === 'basics' && (
          <StepBasics
            tripData={tripData}
            updateField={updateField}
          />
        )}

        {currentStep === 'dates' && (
          <StepDates
            tripData={tripData}
            updateField={updateField}
          />
        )}

        {currentStep === 'teams' && (
          <StepTeams
            tripData={tripData}
            updateField={updateField}
          />
        )}

        {currentStep === 'confirm' && (
          <StepConfirm tripData={tripData} />
        )}
      </div>

      {/* Footer */}
      <div
        className="px-6 py-4 flex gap-3"
        style={{ borderTop: '1px solid var(--rule, #3A3530)' }}
      >
        {!isFirstStep && (
          <button
            onClick={handleBack}
            className="p-4 rounded-xl transition-colors"
            style={{
              background: 'var(--surface, #1A1814)',
              color: 'var(--ink-secondary, #B8B0A0)',
            }}
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}

        <button
          onClick={handleNext}
          disabled={!canProceed()}
          className={cn(
            'flex-1 py-4 rounded-xl font-semibold transition-all',
            'flex items-center justify-center gap-2',
            !canProceed() && 'opacity-50 cursor-not-allowed'
          )}
          style={{
            background: canProceed() ? 'var(--masters, #006747)' : 'var(--surface, #1A1814)',
            color: canProceed() ? 'white' : 'var(--ink-tertiary, #807868)',
          }}
        >
          {isLastStep ? (
            <>
              <Sparkles className="w-5 h-5" />
              Create Trip
            </>
          ) : (
            <>
              Continue
              <ChevronRight className="w-5 h-5" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}

interface StepProps {
  tripData: TripData;
  updateField: <K extends keyof TripData>(field: K, value: TripData[K]) => void;
}

function StepBasics({ tripData, updateField }: StepProps) {
  return (
    <div className="space-y-8">
      <div className="text-center">
        <div className="w-20 h-20 mx-auto mb-6 rounded-2xl flex items-center justify-center"
          style={{ background: 'rgba(0,103,71,0.15)' }}
        >
          <Flag className="w-10 h-10" style={{ color: 'var(--masters, #006747)' }} />
        </div>
        <h1
          className="text-2xl font-bold mb-2"
          style={{ color: 'var(--ink, #F5F1E8)' }}
        >
          Name Your Tournament
        </h1>
        <p
          className="text-sm max-w-xs mx-auto"
          style={{ color: 'var(--ink-secondary, #B8B0A0)' }}
        >
          Give your trip a memorable name. This is what you&apos;ll see on the leaderboard.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label
            className="block text-xs font-medium uppercase tracking-wide mb-2"
            style={{ color: 'var(--ink-secondary, #B8B0A0)' }}
          >
            Tournament Name
          </label>
          <input
            type="text"
            value={tripData.name}
            onChange={(e) => updateField('name', e.target.value)}
            placeholder="e.g., The Annual Buddies Cup 2024"
            className="w-full px-4 py-3 rounded-xl text-base"
            style={{
              background: 'var(--surface, #1A1814)',
              border: '1px solid var(--rule, #3A3530)',
              color: 'var(--ink, #F5F1E8)',
            }}
          />
        </div>

        <div>
          <label
            className="block text-xs font-medium uppercase tracking-wide mb-2"
            style={{ color: 'var(--ink-secondary, #B8B0A0)' }}
          >
            Location (Optional)
          </label>
          <div className="relative">
            <MapPin
              className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5"
              style={{ color: 'var(--ink-tertiary, #807868)' }}
            />
            <input
              type="text"
              value={tripData.location}
              onChange={(e) => updateField('location', e.target.value)}
              placeholder="e.g., Pebble Beach, CA"
              className="w-full pl-12 pr-4 py-3 rounded-xl text-base"
              style={{
                background: 'var(--surface, #1A1814)',
                border: '1px solid var(--rule, #3A3530)',
                color: 'var(--ink, #F5F1E8)',
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function StepDates({ tripData, updateField }: StepProps) {
  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-8">
      <div className="text-center">
        <div className="w-20 h-20 mx-auto mb-6 rounded-2xl flex items-center justify-center"
          style={{ background: 'rgba(0,103,71,0.15)' }}
        >
          <Calendar className="w-10 h-10" style={{ color: 'var(--masters, #006747)' }} />
        </div>
        <h1
          className="text-2xl font-bold mb-2"
          style={{ color: 'var(--ink, #F5F1E8)' }}
        >
          When&apos;s the Trip?
        </h1>
        <p
          className="text-sm max-w-xs mx-auto"
          style={{ color: 'var(--ink-secondary, #B8B0A0)' }}
        >
          Set the dates for your tournament. You can play multiple rounds across these days.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label
            className="block text-xs font-medium uppercase tracking-wide mb-2"
            style={{ color: 'var(--ink-secondary, #B8B0A0)' }}
          >
            Start Date
          </label>
          <input
            type="date"
            value={tripData.startDate}
            min={today}
            onChange={(e) => updateField('startDate', e.target.value)}
            className="w-full px-4 py-3 rounded-xl text-base"
            style={{
              background: 'var(--surface, #1A1814)',
              border: '1px solid var(--rule, #3A3530)',
              color: 'var(--ink, #F5F1E8)',
              colorScheme: 'dark',
            }}
          />
        </div>

        <div>
          <label
            className="block text-xs font-medium uppercase tracking-wide mb-2"
            style={{ color: 'var(--ink-secondary, #B8B0A0)' }}
          >
            End Date
          </label>
          <input
            type="date"
            value={tripData.endDate}
            min={tripData.startDate || today}
            onChange={(e) => updateField('endDate', e.target.value)}
            className="w-full px-4 py-3 rounded-xl text-base"
            style={{
              background: 'var(--surface, #1A1814)',
              border: '1px solid var(--rule, #3A3530)',
              color: 'var(--ink, #F5F1E8)',
              colorScheme: 'dark',
            }}
          />
        </div>
      </div>
    </div>
  );
}

function StepTeams({ tripData, updateField }: StepProps) {
  const presets = [
    { a: 'USA', b: 'Europe' },
    { a: 'Team A', b: 'Team B' },
    { a: 'Red', b: 'Blue' },
    { a: 'Old Guard', b: 'New Blood' },
  ];

  return (
    <div className="space-y-8">
      <div className="text-center">
        <div className="w-20 h-20 mx-auto mb-6 rounded-2xl flex items-center justify-center"
          style={{ background: 'rgba(0,103,71,0.15)' }}
        >
          <Users className="w-10 h-10" style={{ color: 'var(--masters, #006747)' }} />
        </div>
        <h1
          className="text-2xl font-bold mb-2"
          style={{ color: 'var(--ink, #F5F1E8)' }}
        >
          Name Your Teams
        </h1>
        <p
          className="text-sm max-w-xs mx-auto"
          style={{ color: 'var(--ink-secondary, #B8B0A0)' }}
        >
          Customize your team names or use the classic Ryder Cup format.
        </p>
      </div>

      {/* Illustration */}
      <div className="flex justify-center">
        <GolfersIllustration size="lg" />
      </div>

      {/* Presets */}
      <div className="flex flex-wrap gap-2 justify-center">
        {presets.map((preset) => (
          <button
            key={`${preset.a}-${preset.b}`}
            onClick={() => {
              updateField('teamAName', preset.a);
              updateField('teamBName', preset.b);
            }}
            className={cn(
              'px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
            )}
            style={{
              background: tripData.teamAName === preset.a && tripData.teamBName === preset.b
                ? 'var(--masters, #006747)'
                : 'var(--surface, #1A1814)',
              color: tripData.teamAName === preset.a && tripData.teamBName === preset.b
                ? 'white'
                : 'var(--ink-secondary, #B8B0A0)',
              border: '1px solid var(--rule, #3A3530)',
            }}
          >
            {preset.a} vs {preset.b}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label
            className="block text-xs font-medium uppercase tracking-wide mb-2"
            style={{ color: 'var(--team-usa, #B91C1C)' }}
          >
            Team 1
          </label>
          <input
            type="text"
            value={tripData.teamAName}
            onChange={(e) => updateField('teamAName', e.target.value)}
            placeholder="Team A"
            className="w-full px-4 py-3 rounded-xl text-base text-center"
            style={{
              background: 'var(--surface, #1A1814)',
              border: '2px solid var(--team-usa, #B91C1C)',
              color: 'var(--ink, #F5F1E8)',
            }}
          />
        </div>

        <div>
          <label
            className="block text-xs font-medium uppercase tracking-wide mb-2"
            style={{ color: 'var(--team-europe, #1D4ED8)' }}
          >
            Team 2
          </label>
          <input
            type="text"
            value={tripData.teamBName}
            onChange={(e) => updateField('teamBName', e.target.value)}
            placeholder="Team B"
            className="w-full px-4 py-3 rounded-xl text-base text-center"
            style={{
              background: 'var(--surface, #1A1814)',
              border: '2px solid var(--team-europe, #1D4ED8)',
              color: 'var(--ink, #F5F1E8)',
            }}
          />
        </div>
      </div>
    </div>
  );
}

function StepConfirm({ tripData }: { tripData: TripData }) {
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="space-y-8">
      <div className="text-center">
        <div className="w-20 h-20 mx-auto mb-6 rounded-2xl flex items-center justify-center"
          style={{ background: 'rgba(0,103,71,0.15)' }}
        >
          <Check className="w-10 h-10" style={{ color: 'var(--masters, #006747)' }} />
        </div>
        <h1
          className="text-2xl font-bold mb-2"
          style={{ color: 'var(--ink, #F5F1E8)' }}
        >
          Ready to Go!
        </h1>
        <p
          className="text-sm max-w-xs mx-auto"
          style={{ color: 'var(--ink-secondary, #B8B0A0)' }}
        >
          Here&apos;s a summary of your tournament. You can add players and matches after creating it.
        </p>
      </div>

      {/* Trophy Illustration */}
      <div className="flex justify-center">
        <TrophyIllustration size="lg" />
      </div>

      {/* Summary Card */}
      <div className="card-premium rounded-xl overflow-hidden">
        <div
          className="px-4 py-3"
          style={{
            background: 'var(--canvas-sunken)',
            borderBottom: '1px solid var(--rule)',
          }}
        >
          <h2
            className="font-bold"
            style={{ color: 'var(--ink)' }}
          >
            {tripData.name}
          </h2>
          {tripData.location && (
            <p
              className="text-sm flex items-center gap-1 mt-1"
              style={{ color: 'var(--ink-secondary)' }}
            >
              <MapPin className="w-3 h-3" />
              {tripData.location}
            </p>
          )}
        </div>

        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span
              className="text-sm"
              style={{ color: 'var(--ink-secondary)' }}
            >
              Dates
            </span>
            <span
              className="text-sm font-medium"
              style={{ color: 'var(--ink)' }}
            >
              {formatDate(tripData.startDate)} - {formatDate(tripData.endDate)}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span
              className="text-sm"
              style={{ color: 'var(--ink-secondary)' }}
            >
              Teams
            </span>
            <div className="flex items-center gap-2">
              <span
                className="text-sm font-medium"
                style={{ color: 'var(--team-usa)' }}
              >
                {tripData.teamAName}
              </span>
              <span style={{ color: 'var(--ink-tertiary)' }}>vs</span>
              <span
                className="text-sm font-medium"
                style={{ color: 'var(--team-europe)' }}
              >
                {tripData.teamBName}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default QuickStartWizard;
