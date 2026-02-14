'use client';

/**
 * First-Launch Walkthrough
 *
 * A 4-step coach-mark overlay shown exactly once on first app open.
 * Explains the core flow: Create → Add Players → Sessions → Score.
 * Dismisses permanently after completion or skip.
 */

import { useState, useEffect } from 'react';
import { Plus, Users, Calendar, Target, ChevronRight, X } from 'lucide-react';

const STORAGE_KEY = 'walkthrough-completed';

interface Step {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const STEPS: Step[] = [
  {
    icon: <Plus size={28} />,
    title: 'Create a Trip',
    description:
      'Pick a template (Classic Ryder Cup, Weekend, etc.) and fill in your group details. Takes about 30 seconds.',
  },
  {
    icon: <Users size={28} />,
    title: 'Add Your Buddies',
    description:
      'Add players with their handicaps, then draft them onto teams. Share the invite link so everyone can join.',
  },
  {
    icon: <Calendar size={28} />,
    title: 'Set Up Sessions',
    description:
      'The captain creates match sessions — foursomes, fourball, singles. The app suggests balanced pairings.',
  },
  {
    icon: <Target size={28} />,
    title: 'Score on the Course',
    description:
      'Swipe, tap, or use one-handed mode. Works offline. Standings update in real time. It\'s that simple.',
  },
];

export function FirstLaunchWalkthrough() {
  const [visible, setVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    // Only show once, ever
    try {
      if (!localStorage.getItem(STORAGE_KEY)) {
        // Small delay so the home page renders first
        const timer = setTimeout(() => setVisible(true), 800);
        return () => clearTimeout(timer);
      }
    } catch {
      // localStorage unavailable
    }
  }, []);

  const dismiss = () => {
    setVisible(false);
    try {
      localStorage.setItem(STORAGE_KEY, 'true');
    } catch {
      // Swallow
    }
  };

  const next = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep((s) => s + 1);
    } else {
      dismiss();
    }
  };

  if (!visible) return null;

  const step = STEPS[currentStep];
  const isLast = currentStep === STEPS.length - 1;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm px-6"
      onClick={dismiss}
    >
      <div
        className="w-full max-w-sm rounded-2xl overflow-hidden bg-[var(--canvas)] border border-[var(--rule)] shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Skip */}
        <div className="flex justify-end p-3 pb-0">
          <button
            onClick={dismiss}
            className="p-1.5 rounded-lg text-[var(--ink-tertiary)] hover:bg-[var(--surface)]"
            aria-label="Skip walkthrough"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 pb-2 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center bg-[var(--masters)] text-white">
            {step.icon}
          </div>
          <p className="type-overline text-[var(--masters)] mb-2">
            Step {currentStep + 1} of {STEPS.length}
          </p>
          <h2 className="text-xl font-semibold text-[var(--ink)] mb-2">
            {step.title}
          </h2>
          <p className="text-sm leading-relaxed text-[var(--ink-secondary)]">
            {step.description}
          </p>
        </div>

        {/* Progress dots */}
        <div className="flex justify-center gap-2 py-4">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === currentStep
                  ? 'w-6 bg-[var(--masters)]'
                  : i < currentStep
                    ? 'w-1.5 bg-[var(--masters)] opacity-40'
                    : 'w-1.5 bg-[var(--ink-tertiary)] opacity-20'
              }`}
            />
          ))}
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 flex gap-3">
          {currentStep > 0 && (
            <button
              onClick={() => setCurrentStep((s) => s - 1)}
              className="flex-1 py-3 rounded-xl font-medium text-sm bg-[var(--surface)] border border-[var(--rule)] text-[var(--ink)]"
            >
              Back
            </button>
          )}
          <button
            onClick={next}
            className="flex-[2] py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-1.5 bg-[var(--masters)] text-white"
          >
            {isLast ? "Let's Go" : 'Next'}
            {!isLast && <ChevronRight size={16} />}
          </button>
        </div>
      </div>
    </div>
  );
}
