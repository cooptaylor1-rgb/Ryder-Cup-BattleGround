'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import {
  Hand,
  Vibrate,
  AlertCircle,
  RotateCcw,
  Volume2,
  Gauge,
  BellRing,
  Navigation,
  Target,
} from 'lucide-react';
import { useUIStore } from '@/lib/stores';
import { BottomNav, PageHeader } from '@/components/layout';
import { cn } from '@/lib/utils';

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
      type="button"
      onClick={() => !disabled && onChange(!checked)}
      className={cn(
        'relative w-12 h-7 rounded-full transition-colors',
        checked ? 'bg-masters' : 'bg-surface-200',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
      disabled={disabled}
      aria-pressed={checked}
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
    <div className="flex items-center gap-[var(--space-4)] p-[var(--space-4)] border-t border-[var(--rule)]">
      <div className="w-10 h-10 rounded-[var(--radius-md)] bg-surface-200 flex items-center justify-center text-[var(--ink-secondary)] shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="type-body-sm font-[650]">{title}</p>
        <p className="type-caption mt-[2px]">{description}</p>
      </div>
      <div className="shrink-0">{action}</div>
    </div>
  );
}

export default function ScoringSettingsPage() {
  const router = useRouter();
  const { scoringPreferences, updateScoringPreference, resetScoringPreferences } = useUIStore();

  return (
    <div className="min-h-screen pb-nav page-premium-enter texture-grain bg-[var(--canvas)]">
      <PageHeader
        title="Scoring"
        subtitle="Rules & preferences"
        onBack={() => router.push('/settings')}
        icon={<Target size={16} className="text-[var(--color-accent)]" />}
        rightSlot={
          <button
            type="button"
            onClick={() => {
              resetScoringPreferences();
            }}
            className={cn(
              'press-scale inline-flex items-center gap-[var(--space-2)] px-[10px] py-[8px] rounded-[var(--radius-md)] border border-[var(--rule)] bg-[var(--surface)] text-[var(--ink)]'
            )}
          >
            <RotateCcw size={16} className="text-[var(--ink-secondary)]" />
            <span className="type-caption font-[650]">Reset</span>
          </button>
        }
      />

      <main className="container-editorial">
        <section className="section">
          <div className="card overflow-hidden">
            <div className="p-[var(--space-5)]">
              <div className="flex items-center gap-[var(--space-3)]">
                <div className="w-10 h-10 rounded-[var(--radius-md)] bg-[linear-gradient(135deg,var(--masters)_0%,var(--masters-deep)_100%)] flex items-center justify-center shadow-[var(--shadow-glow-green)] shrink-0">
                  <Hand size={18} className="text-[var(--color-accent)]" />
                </div>
                <div>
                  <p className="type-title-sm">One-Handed Mode</p>
                  <p className="type-caption">Score easily while holding your phone in one hand.</p>
                </div>
              </div>
            </div>

            <SettingRow
              icon={<Hand size={18} />}
              title="Enable One-Handed Mode"
              description="Larger buttons stacked vertically"
              action={
                <Toggle
                  checked={scoringPreferences.oneHandedMode}
                  onChange={(v) => updateScoringPreference('oneHandedMode', v)}
                />
              }
            />

            <div className="p-[var(--space-4)] border-t border-[var(--rule)]">
              <p className="type-body-sm font-[650] mb-[10px]">Preferred Hand</p>
              <div className="flex gap-[var(--space-3)]">
                {(['left', 'right'] as const).map((hand) => (
                  <button
                    key={hand}
                    type="button"
                    onClick={() => updateScoringPreference('preferredHand', hand)}
                    className={cn(
                      'press-scale flex-1 px-3 py-[10px] inline-flex justify-center items-center',
                      scoringPreferences.preferredHand === hand ? 'btn-premium' : 'btn-ghost'
                    )}
                  >
                    <span className="type-body-sm font-[650]">{hand === 'left' ? 'Left' : 'Right'}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="p-[var(--space-4)] border-t border-[var(--rule)]">
              <p className="type-body-sm font-[650] mb-[10px]">Button Size</p>
              <div className="flex gap-[var(--space-2)]">
                {(['normal', 'large', 'extra-large'] as const).map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => updateScoringPreference('buttonScale', size)}
                    className={cn(
                      'press-scale flex-1 px-[10px] py-[10px]',
                      scoringPreferences.buttonScale === size ? 'btn-premium' : 'btn-ghost'
                    )}
                  >
                    <span className="type-body-sm font-[650]">
                      {size === 'normal' ? 'Normal' : size === 'large' ? 'Large' : 'X-Large'}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="section">
          <div className="card overflow-hidden">
            <div className="p-[var(--space-5)]">
              <p className="type-title-sm">Behavior</p>
              <p className="type-caption">Feedback and assistive scoring options.</p>
            </div>

            <SettingRow
              icon={<Vibrate size={18} />}
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
              icon={<Volume2 size={18} />}
              title="Sound Effects"
              description="Play a subtle chime on score entry"
              action={
                <Toggle
                  checked={scoringPreferences.soundEffects}
                  onChange={(v) => updateScoringPreference('soundEffects', v)}
                />
              }
            />

            <div className="p-[var(--space-4)] border-t border-[var(--rule)]">
              <div className="flex items-center gap-[var(--space-2)]">
                <Gauge size={18} className="text-[var(--ink-secondary)]" />
                <p className="type-body-sm font-[650]">Haptic Intensity</p>
              </div>

              <div className="mt-3 flex gap-[var(--space-2)]">
                {(['low', 'medium', 'high'] as const).map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => updateScoringPreference('hapticIntensity', level)}
                    className={cn(
                      'press-scale flex-1 px-[10px] py-[10px]',
                      scoringPreferences.hapticIntensity === level ? 'btn-premium' : 'btn-ghost'
                    )}
                  >
                    <span className="type-body-sm font-[650]">
                      {level === 'low' ? 'Low' : level === 'medium' ? 'Medium' : 'High'}
                    </span>
                  </button>
                ))}
              </div>
              <p className="type-caption mt-2">Adjust vibration strength for score feedback.</p>
            </div>

            <SettingRow
              icon={<Navigation size={18} />}
              title="Auto-advance"
              description="Move to the next hole after you enter a score"
              action={
                <Toggle
                  checked={scoringPreferences.autoAdvance}
                  onChange={(v) => updateScoringPreference('autoAdvance', v)}
                />
              }
            />

            <SettingRow
              icon={<AlertCircle size={18} />}
              title="Confirm closeout"
              description="Confirm before recording a match-ending score"
              action={
                <Toggle
                  checked={scoringPreferences.confirmCloseout}
                  onChange={(v) => updateScoringPreference('confirmCloseout', v)}
                />
              }
            />

            <SettingRow
              icon={<RotateCcw size={18} />}
              title="Always show Undo"
              description="Keep the undo action visible even when there’s nothing to undo"
              action={
                <Toggle
                  checked={scoringPreferences.alwaysShowUndo}
                  onChange={(v) => updateScoringPreference('alwaysShowUndo', v)}
                />
              }
            />

            <SettingRow
              icon={<Navigation size={18} />}
              title="Swipe navigation"
              description="Swipe between holes while scoring"
              action={
                <Toggle
                  checked={scoringPreferences.swipeNavigation}
                  onChange={(v) => updateScoringPreference('swipeNavigation', v)}
                />
              }
            />

            <SettingRow
              icon={<Hand size={18} />}
              title="Quick score mode"
              description="Tap anywhere on a team side to score faster"
              action={
                <Toggle
                  checked={scoringPreferences.quickScoreMode}
                  onChange={(v) => updateScoringPreference('quickScoreMode', v)}
                />
              }
            />

            <SettingRow
              icon={<Vibrate size={18} />}
              title="Haptics (scoring)"
              description="Taps for score entry and key actions"
              action={
                <Toggle
                  checked={scoringPreferences.hapticsScore}
                  onChange={(v) => updateScoringPreference('hapticsScore', v)}
                />
              }
            />

            <SettingRow
              icon={<Navigation size={18} />}
              title="Haptics (navigation)"
              description="Subtle taps for navigation and selection"
              action={
                <Toggle
                  checked={scoringPreferences.hapticsNavigation}
                  onChange={(v) => updateScoringPreference('hapticsNavigation', v)}
                />
              }
            />

            <SettingRow
              icon={<BellRing size={18} />}
              title="Haptics (alerts)"
              description="Stronger feedback for warnings and alerts"
              action={
                <Toggle
                  checked={scoringPreferences.hapticsAlerts}
                  onChange={(v) => updateScoringPreference('hapticsAlerts', v)}
                />
              }
            />

            {scoringPreferences.oneHandedMode && (
              <div className="p-[var(--space-4)] border-t border-[var(--rule)]">
                <div className="flex gap-[var(--space-3)] p-[var(--space-4)] rounded-[var(--radius-lg)] border border-[rgba(245,158,11,0.25)] bg-[rgba(245,158,11,0.08)]">
                  <AlertCircle size={18} className="text-[#f59e0b] shrink-0 mt-[2px]" />
                  <div>
                    <p className="type-body-sm font-[650] text-[#f59e0b]">Tip</p>
                    <p className="type-caption mt-[2px]">
                      One-handed mode works best when your preferred hand is set correctly.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>

      <BottomNav />
    </div>
  );
}
