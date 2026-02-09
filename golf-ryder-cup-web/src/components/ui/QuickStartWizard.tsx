/**
 * Quick Start Wizard — Fried Egg Editorial
 *
 * Step-by-step trip creation with editorial warmth:
 * - Serif italic headings, overline labels
 * - Warm cream canvas with rule dividers
 * - Clean progress bar, always-visible Continue button
 */

'use client';

import { useState, useCallback } from 'react';
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
  Search,
  Navigation,
  Layers,
  Trophy,
} from 'lucide-react';
import type { TripTemplate, TemplateConfig } from '@/lib/types/templates';
import { calculateTemplateTotalMatches, calculateTemplateDays } from '@/lib/types/templates';
import { TemplatePicker } from '@/components/ui/TemplatePicker';

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
  courseName: string;
  teamAName: string;
  teamBName: string;
  /** Template config if a template was selected */
  templateConfig?: TemplateConfig;
}

type Step = 'basics' | 'dates' | 'course' | 'teams' | 'confirm';

const steps: Step[] = ['basics', 'dates', 'course', 'teams', 'confirm'];

export function QuickStartWizard({
  onComplete,
  onCancel,
  className,
}: QuickStartWizardProps) {
  const [currentStep, setCurrentStep] = useState<Step>('basics');
  const [isExiting, setIsExiting] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<TripTemplate | null>(null);
  const [tripData, setTripData] = useState<TripData>({
    name: '',
    location: '',
    startDate: '',
    endDate: '',
    courseName: '',
    teamAName: 'USA',
    teamBName: 'Europe',
  });

  /** Called when a template is picked from the TemplatePicker */
  const handleTemplateSelect = useCallback((template: TripTemplate) => {
    setSelectedTemplate(template);
    setTripData((prev) => ({
      ...prev,
      teamAName: template.config.teamAName,
      teamBName: template.config.teamBName,
      templateConfig: template.config,
    }));
  }, []);

  /** Clear the selected template */
  const handleTemplateClear = useCallback(() => {
    setSelectedTemplate(null);
    setTripData((prev) => ({
      ...prev,
      templateConfig: undefined,
    }));
  }, []);

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
      case 'course':
        return true; // Course is optional — can skip
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
        'fixed inset-0 z-[60] flex flex-col',
        isExiting ? 'animate-fade-out' : 'animate-fade-in',
        className
      )}
      style={{ background: 'var(--canvas)' }}
    >
      {/* Header */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 'var(--space-4) var(--space-5)',
          paddingTop: 'calc(var(--space-4) + env(safe-area-inset-top, 0px))',
          borderBottom: '1px solid var(--rule)',
        }}
      >
        <button
          onClick={handleCancel}
          style={{
            padding: 'var(--space-2)',
            marginLeft: 'calc(-1 * var(--space-2))',
            color: 'var(--ink-secondary)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            borderRadius: 'var(--radius-md)',
          }}
        >
          <X className="w-5 h-5" />
        </button>

        {/* Step indicators */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
          {steps.map((step, index) => (
            <div
              key={step}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-1)',
              }}
            >
              <div
                style={{
                  width: index <= currentStepIndex ? '32px' : '20px',
                  height: '3px',
                  borderRadius: '2px',
                  background: index <= currentStepIndex ? 'var(--masters)' : 'var(--rule)',
                  transition: 'all 300ms ease',
                }}
              />
            </div>
          ))}
        </div>

        {/* Step label */}
        <span
          style={{
            fontSize: '0.75rem',
            fontWeight: 500,
            color: 'var(--ink-tertiary)',
            minWidth: '40px',
            textAlign: 'right',
          }}
        >
          {currentStepIndex + 1}/{steps.length}
        </span>
      </header>

      {/* Content */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: 'var(--space-8) var(--space-6)',
        }}
      >
        {currentStep === 'basics' && (
          <StepBasics
            tripData={tripData}
            updateField={updateField}
            selectedTemplate={selectedTemplate}
            onTemplateSelect={handleTemplateSelect}
            onTemplateClear={handleTemplateClear}
          />
        )}
        {currentStep === 'dates' && (
          <StepDates tripData={tripData} updateField={updateField} />
        )}
        {currentStep === 'course' && (
          <StepCourse tripData={tripData} updateField={updateField} />
        )}
        {currentStep === 'teams' && (
          <StepTeams tripData={tripData} updateField={updateField} />
        )}
        {currentStep === 'confirm' && <StepConfirm tripData={tripData} />}
      </div>

      {/* Footer — always visible */}
      <div
        style={{
          padding: 'var(--space-4) var(--space-6)',
          paddingBottom: 'calc(var(--space-4) + env(safe-area-inset-bottom, 0px))',
          borderTop: '1px solid var(--rule)',
          display: 'flex',
          gap: 'var(--space-3)',
          background: 'var(--canvas)',
        }}
      >
        {!isFirstStep && (
          <button
            onClick={handleBack}
            className="press-scale"
            style={{
              padding: 'var(--space-3) var(--space-4)',
              borderRadius: 'var(--radius-lg)',
              background: 'var(--canvas-raised)',
              border: '1px solid var(--rule)',
              color: 'var(--ink-secondary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}

        <button
          onClick={handleNext}
          disabled={!canProceed()}
          className="btn-premium press-scale"
          style={{
            flex: 1,
            padding: 'var(--space-3) var(--space-4)',
            borderRadius: 'var(--radius-lg)',
            fontWeight: 600,
            fontSize: '0.95rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 'var(--space-2)',
            background: canProceed() ? 'var(--masters)' : 'var(--rule)',
            color: canProceed() ? 'white' : 'var(--ink-tertiary)',
            border: 'none',
            cursor: canProceed() ? 'pointer' : 'not-allowed',
            opacity: canProceed() ? 1 : 0.6,
            transition: 'all 200ms ease',
            boxShadow: canProceed() ? '0 4px 14px rgba(0, 77, 51, 0.25)' : 'none',
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

/* ── Shared types ── */

interface StepProps {
  tripData: TripData;
  updateField: <K extends keyof TripData>(field: K, value: TripData[K]) => void;
}

/* ── Input styling helper ── */

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: 'var(--space-3) var(--space-4)',
  borderRadius: 'var(--radius-md)',
  fontSize: '1rem',
  fontFamily: 'var(--font-sans)',
  background: 'var(--canvas-raised)',
  border: '1px solid var(--rule)',
  color: 'var(--ink)',
  outline: 'none',
  transition: 'border-color 200ms ease, box-shadow 200ms ease',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.7rem',
  fontWeight: 600,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: 'var(--ink-secondary)',
  marginBottom: 'var(--space-2)',
};

/* ── Step 1: Basics ── */

interface StepBasicsProps extends StepProps {
  selectedTemplate: TripTemplate | null;
  onTemplateSelect: (template: TripTemplate) => void;
  onTemplateClear: () => void;
}

function StepBasics({
  tripData,
  updateField,
  selectedTemplate,
  onTemplateSelect,
  onTemplateClear,
}: StepBasicsProps) {
  const [showPicker, setShowPicker] = useState(false);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-8)' }}>
      {/* Hero */}
      <div style={{ textAlign: 'center' }}>
        <div
          style={{
            width: '64px',
            height: '64px',
            margin: '0 auto var(--space-5)',
            borderRadius: 'var(--radius-lg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0, 77, 51, 0.08)',
          }}
        >
          <Flag className="w-8 h-8" style={{ color: 'var(--masters)' }} />
        </div>
        <p
          className="type-overline"
          style={{ letterSpacing: '0.15em', color: 'var(--masters)', marginBottom: 'var(--space-2)' }}
        >
          Step 1 of 5
        </p>
        <h1
          style={{
            fontFamily: 'var(--font-serif)',
            fontStyle: 'italic',
            fontSize: 'clamp(1.5rem, 5vw, 2rem)',
            fontWeight: 400,
            color: 'var(--ink)',
            lineHeight: 1.2,
            marginBottom: 'var(--space-2)',
          }}
        >
          Name Your Tournament
        </h1>
        <p style={{ fontSize: '0.9rem', color: 'var(--ink-secondary)', maxWidth: '280px', margin: '0 auto' }}>
          Give your trip a memorable name. This is what you&apos;ll see on the leaderboard.
        </p>
      </div>

      {/* Fields */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
        <div>
          <label style={labelStyle}>Tournament Name</label>
          <input
            type="text"
            value={tripData.name}
            onChange={(e) => updateField('name', e.target.value)}
            placeholder="e.g., The Annual Buddies Cup 2026"
            style={inputStyle}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = 'var(--masters)';
              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0, 77, 51, 0.1)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = 'var(--rule)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          />
        </div>

        <div>
          <label style={labelStyle}>Location (Optional)</label>
          <div style={{ position: 'relative' }}>
            <MapPin
              className="w-5 h-5"
              style={{
                position: 'absolute',
                left: 'var(--space-3)',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--ink-tertiary)',
                pointerEvents: 'none',
              }}
            />
            <input
              type="text"
              value={tripData.location}
              onChange={(e) => updateField('location', e.target.value)}
              placeholder="e.g., Pebble Beach, CA"
              style={{ ...inputStyle, paddingLeft: 'calc(var(--space-3) + 28px)' }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = 'var(--masters)';
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0, 77, 51, 0.1)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'var(--rule)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
          </div>
        </div>
      </div>

      {/* Start from Template section */}
      <div>
        <div
          style={{
            height: '1px',
            background: 'var(--rule)',
            marginBottom: 'var(--space-5)',
          }}
        />
        <p
          style={{
            fontSize: '0.7rem',
            fontWeight: 600,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: 'var(--ink-secondary)',
            marginBottom: 'var(--space-3)',
          }}
        >
          Start from Template
        </p>

        {selectedTemplate ? (
          /* Selected template summary card */
          <div
            style={{
              padding: 'var(--space-4)',
              borderRadius: 'var(--radius-lg)',
              background: 'rgba(0, 77, 51, 0.04)',
              border: '1px solid var(--masters)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                marginBottom: 'var(--space-2)',
              }}
            >
              <h4
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontStyle: 'italic',
                  fontSize: '1rem',
                  fontWeight: 400,
                  color: 'var(--ink)',
                }}
              >
                {selectedTemplate.name}
              </h4>
              <button
                type="button"
                onClick={onTemplateClear}
                style={{
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'transparent',
                  border: '1px solid var(--rule)',
                  color: 'var(--ink-secondary)',
                  fontSize: '0.7rem',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-sans)',
                }}
              >
                Change
              </button>
            </div>
            {selectedTemplate.description && (
              <p
                style={{
                  fontSize: '0.8rem',
                  color: 'var(--ink-secondary)',
                  marginBottom: 'var(--space-2)',
                  lineHeight: 1.4,
                }}
              >
                {selectedTemplate.description}
              </p>
            )}
            <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.75rem',
                  color: 'var(--ink-secondary)',
                }}
              >
                <Layers className="w-3.5 h-3.5" style={{ color: 'var(--ink-tertiary)' }} />
                {selectedTemplate.config.sessions.length} sessions
              </span>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.75rem',
                  color: 'var(--ink-secondary)',
                }}
              >
                <Trophy className="w-3.5 h-3.5" style={{ color: 'var(--ink-tertiary)' }} />
                {calculateTemplateTotalMatches(selectedTemplate.config)} matches
              </span>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.75rem',
                  color: 'var(--ink-secondary)',
                }}
              >
                <Calendar className="w-3.5 h-3.5" style={{ color: 'var(--ink-tertiary)' }} />
                {calculateTemplateDays(selectedTemplate.config)} day{calculateTemplateDays(selectedTemplate.config) !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        ) : showPicker ? (
          /* Expanded template picker */
          <TemplatePicker
            onSelect={(template) => {
              onTemplateSelect(template);
              setShowPicker(false);
            }}
            onCustom={() => setShowPicker(false)}
            selectedId={undefined}
          />
        ) : (
          /* Collapsed: show a button to open the picker */
          <button
            type="button"
            onClick={() => setShowPicker(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 'var(--space-2)',
              width: '100%',
              padding: 'var(--space-3)',
              borderRadius: 'var(--radius-lg)',
              background: 'var(--canvas-raised)',
              border: '1px dashed var(--rule)',
              color: 'var(--ink-secondary)',
              cursor: 'pointer',
              fontSize: '0.85rem',
              fontWeight: 500,
              fontFamily: 'var(--font-sans)',
              transition: 'border-color 200ms ease',
            }}
          >
            <Layers className="w-4 h-4" />
            Choose a Tournament Format
          </button>
        )}
      </div>
    </div>
  );
}

/* ── Step 2: Dates ── */

function StepDates({ tripData, updateField }: StepProps) {
  const today = new Date().toISOString().split('T')[0];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-8)' }}>
      {/* Hero */}
      <div style={{ textAlign: 'center' }}>
        <div
          style={{
            width: '64px',
            height: '64px',
            margin: '0 auto var(--space-5)',
            borderRadius: 'var(--radius-lg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0, 77, 51, 0.08)',
          }}
        >
          <Calendar className="w-8 h-8" style={{ color: 'var(--masters)' }} />
        </div>
        <p
          className="type-overline"
          style={{ letterSpacing: '0.15em', color: 'var(--masters)', marginBottom: 'var(--space-2)' }}
        >
          Step 2 of 5
        </p>
        <h1
          style={{
            fontFamily: 'var(--font-serif)',
            fontStyle: 'italic',
            fontSize: 'clamp(1.5rem, 5vw, 2rem)',
            fontWeight: 400,
            color: 'var(--ink)',
            lineHeight: 1.2,
            marginBottom: 'var(--space-2)',
          }}
        >
          When&apos;s the Trip?
        </h1>
        <p style={{ fontSize: '0.9rem', color: 'var(--ink-secondary)', maxWidth: '280px', margin: '0 auto' }}>
          Set the dates for your tournament. You can play multiple rounds across these days.
        </p>
      </div>

      {/* Fields */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
        <div>
          <label style={labelStyle}>Start Date</label>
          <input
            type="date"
            value={tripData.startDate}
            min={today}
            onChange={(e) => updateField('startDate', e.target.value)}
            style={inputStyle}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = 'var(--masters)';
              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0, 77, 51, 0.1)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = 'var(--rule)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          />
        </div>

        <div>
          <label style={labelStyle}>End Date</label>
          <input
            type="date"
            value={tripData.endDate}
            min={tripData.startDate || today}
            onChange={(e) => updateField('endDate', e.target.value)}
            style={inputStyle}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = 'var(--masters)';
              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0, 77, 51, 0.1)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = 'var(--rule)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          />
        </div>
      </div>
    </div>
  );
}

/* ── Step 3: Teams ── */

function StepTeams({ tripData, updateField }: StepProps) {
  const presets = [
    { a: 'USA', b: 'Europe' },
    { a: 'Team A', b: 'Team B' },
    { a: 'Red', b: 'Blue' },
    { a: 'Old Guard', b: 'New Blood' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-8)' }}>
      {/* Hero */}
      <div style={{ textAlign: 'center' }}>
        <div
          style={{
            width: '64px',
            height: '64px',
            margin: '0 auto var(--space-5)',
            borderRadius: 'var(--radius-lg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0, 77, 51, 0.08)',
          }}
        >
          <Users className="w-8 h-8" style={{ color: 'var(--masters)' }} />
        </div>
        <p
          className="type-overline"
          style={{ letterSpacing: '0.15em', color: 'var(--masters)', marginBottom: 'var(--space-2)' }}
        >
          Step 4 of 5
        </p>
        <h1
          style={{
            fontFamily: 'var(--font-serif)',
            fontStyle: 'italic',
            fontSize: 'clamp(1.5rem, 5vw, 2rem)',
            fontWeight: 400,
            color: 'var(--ink)',
            lineHeight: 1.2,
            marginBottom: 'var(--space-2)',
          }}
        >
          Name Your Teams
        </h1>
        <p style={{ fontSize: '0.9rem', color: 'var(--ink-secondary)', maxWidth: '280px', margin: '0 auto' }}>
          Customize your team names or pick a classic preset.
        </p>
      </div>

      {/* Presets */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)', justifyContent: 'center' }}>
        {presets.map((preset) => {
          const isActive = tripData.teamAName === preset.a && tripData.teamBName === preset.b;
          return (
            <button
              key={`${preset.a}-${preset.b}`}
              onClick={() => {
                updateField('teamAName', preset.a);
                updateField('teamBName', preset.b);
              }}
              className="press-scale"
              style={{
                padding: 'var(--space-2) var(--space-3)',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                background: isActive ? 'var(--masters)' : 'var(--canvas-raised)',
                color: isActive ? 'white' : 'var(--ink-secondary)',
                border: isActive ? '1px solid var(--masters)' : '1px solid var(--rule)',
                transition: 'all 200ms ease',
              }}
            >
              {preset.a} vs {preset.b}
            </button>
          );
        })}
      </div>

      {/* Team inputs */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
        <div>
          <label style={{ ...labelStyle, color: 'var(--team-usa, #B91C1C)' }}>Team 1</label>
          <input
            type="text"
            value={tripData.teamAName}
            onChange={(e) => updateField('teamAName', e.target.value)}
            placeholder="Team A"
            style={{
              ...inputStyle,
              textAlign: 'center',
              borderColor: 'var(--team-usa, #B91C1C)',
              borderWidth: '2px',
            }}
            onFocus={(e) => {
              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(185, 28, 28, 0.1)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.boxShadow = 'none';
            }}
          />
        </div>
        <div>
          <label style={{ ...labelStyle, color: 'var(--team-europe, #1D4ED8)' }}>Team 2</label>
          <input
            type="text"
            value={tripData.teamBName}
            onChange={(e) => updateField('teamBName', e.target.value)}
            placeholder="Team B"
            style={{
              ...inputStyle,
              textAlign: 'center',
              borderColor: 'var(--team-europe, #1D4ED8)',
              borderWidth: '2px',
            }}
            onFocus={(e) => {
              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(29, 78, 216, 0.1)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.boxShadow = 'none';
            }}
          />
        </div>
      </div>
    </div>
  );
}

/* ── Step 3: Course (Optional) ── */

function StepCourse({ tripData, updateField }: StepProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-8)' }}>
      {/* Hero */}
      <div style={{ textAlign: 'center' }}>
        <div
          style={{
            width: '64px',
            height: '64px',
            margin: '0 auto var(--space-5)',
            borderRadius: 'var(--radius-lg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0, 77, 51, 0.08)',
          }}
        >
          <Navigation className="w-8 h-8" style={{ color: 'var(--masters)' }} />
        </div>
        <p
          className="type-overline"
          style={{ letterSpacing: '0.15em', color: 'var(--masters)', marginBottom: 'var(--space-2)' }}
        >
          Step 3 of 5
        </p>
        <h1
          style={{
            fontFamily: 'var(--font-serif)',
            fontStyle: 'italic',
            fontSize: 'clamp(1.5rem, 5vw, 2rem)',
            fontWeight: 400,
            color: 'var(--ink)',
            lineHeight: 1.2,
            marginBottom: 'var(--space-2)',
          }}
        >
          Where Are You Playing?
        </h1>
        <p style={{ fontSize: '0.9rem', color: 'var(--ink-secondary)', maxWidth: '280px', margin: '0 auto' }}>
          Add your primary course now, or skip and add courses later.
        </p>
      </div>

      {/* Course name input */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
        <div>
          <label style={labelStyle}>Course Name</label>
          <div style={{ position: 'relative' }}>
            <Search
              className="w-5 h-5"
              style={{
                position: 'absolute',
                left: 'var(--space-3)',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--ink-tertiary)',
                pointerEvents: 'none',
              }}
            />
            <input
              type="text"
              value={tripData.courseName}
              onChange={(e) => updateField('courseName', e.target.value)}
              placeholder="e.g., Pebble Beach Golf Links"
              style={{ ...inputStyle, paddingLeft: 'calc(var(--space-3) + 28px)' }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = 'var(--masters)';
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0, 77, 51, 0.1)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'var(--rule)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
          </div>
        </div>

        {/* Skip hint */}
        <p
          style={{
            fontSize: '0.8rem',
            color: 'var(--ink-tertiary)',
            textAlign: 'center',
            fontStyle: 'italic',
          }}
        >
          This is optional — you can add or change courses anytime from the Captain tools.
        </p>
      </div>
    </div>
  );
}

/* ── Step 5: Confirm ── */

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-8)' }}>
      {/* Hero */}
      <div style={{ textAlign: 'center' }}>
        <div
          style={{
            width: '64px',
            height: '64px',
            margin: '0 auto var(--space-5)',
            borderRadius: 'var(--radius-lg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0, 77, 51, 0.08)',
          }}
        >
          <Check className="w-8 h-8" style={{ color: 'var(--masters)' }} />
        </div>
        <p
          className="type-overline"
          style={{ letterSpacing: '0.15em', color: 'var(--masters)', marginBottom: 'var(--space-2)' }}
        >
          Ready to Go
        </p>
        <h1
          style={{
            fontFamily: 'var(--font-serif)',
            fontStyle: 'italic',
            fontSize: 'clamp(1.5rem, 5vw, 2rem)',
            fontWeight: 400,
            color: 'var(--ink)',
            lineHeight: 1.2,
            marginBottom: 'var(--space-2)',
          }}
        >
          Looking Good!
        </h1>
        <p style={{ fontSize: '0.9rem', color: 'var(--ink-secondary)', maxWidth: '280px', margin: '0 auto' }}>
          Here&apos;s a summary of your tournament. You can add players and matches after creating it.
        </p>
      </div>

      {/* Summary Card */}
      <div
        style={{
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--rule)',
          overflow: 'hidden',
        }}
      >
        {/* Card header */}
        <div
          style={{
            padding: 'var(--space-4)',
            background: 'var(--canvas-raised)',
            borderBottom: '1px solid var(--rule)',
          }}
        >
          <h2
            style={{
              fontFamily: 'var(--font-serif)',
              fontStyle: 'italic',
              fontSize: '1.25rem',
              fontWeight: 400,
              color: 'var(--ink)',
            }}
          >
            {tripData.name || 'Untitled Tournament'}
          </h2>
          {tripData.location && (
            <p
              style={{
                fontSize: '0.85rem',
                color: 'var(--ink-secondary)',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                marginTop: 'var(--space-1)',
              }}
            >
              <MapPin className="w-3.5 h-3.5" />
              {tripData.location}
            </p>
          )}
        </div>

        {/* Details */}
        <div style={{ padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--ink-secondary)' }}>Dates</span>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--ink)' }}>
              {formatDate(tripData.startDate)} – {formatDate(tripData.endDate)}
            </span>
          </div>

          {tripData.courseName && (
            <>
              <div style={{ height: '1px', background: 'var(--rule)' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--ink-secondary)' }}>Course</span>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--ink)' }}>
                  {tripData.courseName}
                </span>
              </div>
            </>
          )}

          <div style={{ height: '1px', background: 'var(--rule)' }} />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--ink-secondary)' }}>Teams</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--team-usa, #B91C1C)' }}>
                {tripData.teamAName}
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--ink-tertiary)' }}>vs</span>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--team-europe, #1D4ED8)' }}>
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
