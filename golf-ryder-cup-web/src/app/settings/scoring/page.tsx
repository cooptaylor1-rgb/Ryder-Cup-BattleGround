'use client';

import React from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Hand,
  Vibrate,
  AlertCircle,
  ChevronRight,
  RotateCcw,
  Smartphone,
  Scan,
  Volume2,
  Gauge,
  BellRing,
  Navigation,
} from 'lucide-react';
import { useUIStore } from '@/lib/stores';
import { BottomNav } from '@/components/layout';
import { cn } from '@/lib/utils';

// Toggle component - defined outside of render
function Toggle({
  checked,
  onChange,
  disabled = false,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={() => !disabled && onChange(!checked)}
      className={cn(
        'relative w-12 h-7 rounded-full transition-colors',
        checked ? 'bg-augusta-green' : 'bg-gray-300',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
      disabled={disabled}
    >
      <span
        className={cn(
          'absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-transform',
          checked ? 'translate-x-6' : 'translate-x-1'
        )}
      />
    </button>
  );
}

// SettingRow component - defined outside of render
function SettingRow({
  icon,
  title,
  description,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  action: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-4 p-4 border-b border-gray-100 last:border-b-0">
      <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-gray-900">{title}</div>
        <div className="text-sm text-gray-500 mt-0.5">{description}</div>
      </div>
      {action}
    </div>
  );
}

export default function ScoringSettingsPage() {
  const { scoringPreferences, updateScoringPreference, resetScoringPreferences } = useUIStore();

  return (
    <div className="min-h-screen pb-nav bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="flex items-center gap-3 px-4 py-3">
          <Link href="/settings" className="p-2 -m-2 text-gray-600 hover:text-gray-900">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-lg font-semibold">Scoring Settings</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 space-y-6">
        {/* One-Handed Mode Section */}
        <section className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <Hand className="w-5 h-5 text-augusta-green" />
              One-Handed Mode
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Score easily while holding your phone in one hand
            </p>
          </div>

          <SettingRow
            icon={<Hand className="w-5 h-5" />}
            title="Enable One-Handed Mode"
            description="Larger buttons stacked vertically"
            action={
              <Toggle
                checked={scoringPreferences.oneHandedMode}
                onChange={(v) => updateScoringPreference('oneHandedMode', v)}
              />
            }
          />

          <div className="p-4 border-b border-gray-100">
            <div className="font-medium text-gray-900 mb-3">Preferred Hand</div>
            <div className="flex gap-3">
              {(['left', 'right'] as const).map((hand) => (
                <button
                  key={hand}
                  onClick={() => updateScoringPreference('preferredHand', hand)}
                  className={cn(
                    'flex-1 py-3 px-4 rounded-lg font-medium transition-colors border-2',
                    scoringPreferences.preferredHand === hand
                      ? 'border-augusta-green bg-augusta-green/5 text-augusta-green'
                      : 'border-gray-200 bg-gray-50 text-gray-600'
                  )}
                >
                  {hand === 'left' ? '🤚 Left' : 'Right 🤚'}
                </button>
              ))}
            </div>
          </div>

          <div className="p-4">
            <div className="font-medium text-gray-900 mb-3">Button Size</div>
            <div className="flex gap-2">
              {(['normal', 'large', 'extra-large'] as const).map((size) => (
                <button
                  key={size}
                  onClick={() => updateScoringPreference('buttonScale', size)}
                  className={cn(
                    'flex-1 py-3 px-3 rounded-lg font-medium transition-colors border-2 text-sm',
                    scoringPreferences.buttonScale === size
                      ? 'border-augusta-green bg-augusta-green/5 text-augusta-green'
                      : 'border-gray-200 bg-gray-50 text-gray-600'
                  )}
                >
                  {size === 'normal' ? 'Normal' : size === 'large' ? 'Large' : 'X-Large'}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Behavior Section */}
        <section className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Behavior</h2>
          </div>

          <SettingRow
            icon={<Vibrate className="w-5 h-5" />}
            title="Haptic Feedback"
            description="Vibrate on score entry"
            action={
              <Toggle
                checked={scoringPreferences.hapticFeedback}
                onChange={(v) => updateScoringPreference('hapticFeedback', v)}
              />
            }
          />

          <SettingRow
            icon={<Volume2 className="w-5 h-5" />}
            title="Sound Effects"
            description="Play a subtle chime on score entry"
            action={
              <Toggle
                checked={scoringPreferences.soundEffects}
                onChange={(v) => updateScoringPreference('soundEffects', v)}
              />
            }
          />

          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center gap-2 mb-3">
              <Gauge className="w-5 h-5 text-gray-600" />
              <div className="font-medium text-gray-900">Haptic Intensity</div>
            </div>
            <div className="flex gap-2">
              {(['low', 'medium', 'high'] as const).map((level) => (
                <button
                  key={level}
                  onClick={() => updateScoringPreference('hapticIntensity', level)}
                  className={cn(
                    'flex-1 py-2.5 rounded-lg font-medium transition-colors border-2 text-sm',
                    scoringPreferences.hapticIntensity === level
                      ? 'border-augusta-green bg-augusta-green/5 text-augusta-green'
                      : 'border-gray-200 bg-gray-50 text-gray-600'
                  )}
                >
                  {level === 'low' ? 'Low' : level === 'medium' ? 'Medium' : 'High'}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Adjust vibration strength for score feedback.
            </p>
          </div>

          <SettingRow
            icon={<Navigation className="w-5 h-5" />}
            title="Navigation Haptics"
            description="Subtle taps for navigation and selection"
            action={
              <Toggle
                checked={scoringPreferences.hapticsNavigation}
                onChange={(v) => updateScoringPreference('hapticsNavigation', v)}
              />
            }
          />

          <SettingRow
            icon={<BellRing className="w-5 h-5" />}
            title="Alert Haptics"
            description="Warnings and undo confirmations"
            action={
              <Toggle
                checked={scoringPreferences.hapticsAlerts}
                onChange={(v) => updateScoringPreference('hapticsAlerts', v)}
              />
            }
          />

          <SettingRow
            icon={<Vibrate className="w-5 h-5" />}
            title="Score Haptics"
            description="Point scored and match win feedback"
            action={
              <Toggle
                checked={scoringPreferences.hapticsScore}
                onChange={(v) => updateScoringPreference('hapticsScore', v)}
              />
            }
          />

          <SettingRow
            icon={<ChevronRight className="w-5 h-5" />}
            title="Auto-Advance"
            description="Move to next hole after scoring"
            action={
              <Toggle
                checked={scoringPreferences.autoAdvance}
                onChange={(v) => updateScoringPreference('autoAdvance', v)}
              />
            }
          />

          <SettingRow
            icon={<AlertCircle className="w-5 h-5" />}
            title="Confirm Match Closeout"
            description="Ask before ending a match"
            action={
              <Toggle
                checked={scoringPreferences.confirmCloseout}
                onChange={(v) => updateScoringPreference('confirmCloseout', v)}
              />
            }
          />

          <SettingRow
            icon={<RotateCcw className="w-5 h-5" />}
            title="Always Show Undo"
            description="Keep undo visible at all times"
            action={
              <Toggle
                checked={scoringPreferences.alwaysShowUndo}
                onChange={(v) => updateScoringPreference('alwaysShowUndo', v)}
              />
            }
          />
        </section>

        {/* Navigation Section */}
        <section className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Navigation</h2>
          </div>

          <SettingRow
            icon={<Smartphone className="w-5 h-5" />}
            title="Swipe Navigation"
            description="Swipe left/right to change holes"
            action={
              <Toggle
                checked={scoringPreferences.swipeNavigation}
                onChange={(v) => updateScoringPreference('swipeNavigation', v)}
              />
            }
          />

          <SettingRow
            icon={<Scan className="w-5 h-5" />}
            title="Quick Score Mode"
            description="Tap team half of screen to score"
            action={
              <Toggle
                checked={scoringPreferences.quickScoreMode}
                onChange={(v) => updateScoringPreference('quickScoreMode', v)}
              />
            }
          />
        </section>

        {/* Reset Button */}
        <button
          onClick={() => {
            resetScoringPreferences();
          }}
          className="w-full py-3 px-4 text-red-600 font-medium bg-white rounded-xl shadow-sm hover:bg-red-50 transition-colors"
        >
          Reset to Defaults
        </button>
      </main>
      <BottomNav />
    </div>
  );
}
