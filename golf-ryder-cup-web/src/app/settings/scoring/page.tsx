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
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-4)',
        padding: 'var(--space-4)',
        borderTop: '1px solid var(--rule)',
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 'var(--radius-md)',
          background: 'rgba(0,0,0,0.04)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--ink-secondary)',
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p className="type-body-sm" style={{ fontWeight: 650 }}>
          {title}
        </p>
        <p className="type-caption" style={{ marginTop: 2 }}>
          {description}
        </p>
      </div>
      <div style={{ flexShrink: 0 }}>{action}</div>
    </div>
  );
}

export default function ScoringSettingsPage() {
  const router = useRouter();
  const { scoringPreferences, updateScoringPreference, resetScoringPreferences } = useUIStore();

  return (
    <div
      className="min-h-screen pb-nav page-premium-enter texture-grain"
      style={{ background: 'var(--canvas)' }}
    >
      <PageHeader
        title="Scoring"
        subtitle="Rules & preferences"
        onBack={() => router.push('/settings')}
        icon={<Target size={16} style={{ color: 'var(--color-accent)' }} />}
        rightSlot={
          <button
            type="button"
            onClick={() => {
              resetScoringPreferences();
            }}
            className="press-scale"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
              padding: '8px 10px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--rule)',
              background: 'var(--surface)',
              color: 'var(--ink)',
            }}
          >
            <RotateCcw size={16} style={{ color: 'var(--ink-secondary)' }} />
            <span className="type-caption" style={{ fontWeight: 650 }}>
              Reset
            </span>
          </button>
        }
      />

      <main className="container-editorial">
        <section className="section">
          <div className="card" style={{ overflow: 'hidden' }}>
            <div style={{ padding: 'var(--space-5)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 'var(--radius-md)',
                    background: 'linear-gradient(135deg, var(--masters) 0%, var(--masters-deep) 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: 'var(--shadow-glow-green)',
                    flexShrink: 0,
                  }}
                >
                  <Hand size={18} style={{ color: 'var(--color-accent)' }} />
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

            <div style={{ padding: 'var(--space-4)', borderTop: '1px solid var(--rule)' }}>
              <p className="type-body-sm" style={{ fontWeight: 650, marginBottom: 10 }}>
                Preferred Hand
              </p>
              <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                {(['left', 'right'] as const).map((hand) => (
                  <button
                    key={hand}
                    type="button"
                    onClick={() => updateScoringPreference('preferredHand', hand)}
                    className={cn(
                      'press-scale',
                      scoringPreferences.preferredHand === hand ? 'btn-premium' : 'btn-ghost'
                    )}
                    style={{
                      flex: 1,
                      padding: '10px 12px',
                      display: 'inline-flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    <span className="type-body-sm" style={{ fontWeight: 650 }}>
                      {hand === 'left' ? 'Left' : 'Right'}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div style={{ padding: 'var(--space-4)', borderTop: '1px solid var(--rule)' }}>
              <p className="type-body-sm" style={{ fontWeight: 650, marginBottom: 10 }}>
                Button Size
              </p>
              <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                {(['normal', 'large', 'extra-large'] as const).map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => updateScoringPreference('buttonScale', size)}
                    className={cn(
                      'press-scale',
                      scoringPreferences.buttonScale === size ? 'btn-premium' : 'btn-ghost'
                    )}
                    style={{ flex: 1, padding: '10px 10px' }}
                  >
                    <span className="type-body-sm" style={{ fontWeight: 650 }}>
                      {size === 'normal' ? 'Normal' : size === 'large' ? 'Large' : 'X-Large'}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="section">
          <div className="card" style={{ overflow: 'hidden' }}>
            <div style={{ padding: 'var(--space-5)' }}>
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

            <div style={{ padding: 'var(--space-4)', borderTop: '1px solid var(--rule)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <Gauge size={18} style={{ color: 'var(--ink-secondary)' }} />
                <p className="type-body-sm" style={{ fontWeight: 650 }}>
                  Haptic Intensity
                </p>
              </div>

              <div className="mt-3" style={{ display: 'flex', gap: 'var(--space-2)' }}>
                {(['low', 'medium', 'high'] as const).map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => updateScoringPreference('hapticIntensity', level)}
                    className={cn(
                      'press-scale',
                      scoringPreferences.hapticIntensity === level ? 'btn-premium' : 'btn-ghost'
                    )}
                    style={{ flex: 1, padding: '10px 10px' }}
                  >
                    <span className="type-body-sm" style={{ fontWeight: 650 }}>
                      {level === 'low' ? 'Low' : level === 'medium' ? 'Medium' : 'High'}
                    </span>
                  </button>
                ))}
              </div>
              <p className="type-caption" style={{ marginTop: 8 }}>
                Adjust vibration strength for score feedback.
              </p>
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
              <div style={{ padding: 'var(--space-4)', borderTop: '1px solid var(--rule)' }}>
                <div
                  style={{
                    display: 'flex',
                    gap: 'var(--space-3)',
                    padding: 'var(--space-4)',
                    borderRadius: 'var(--radius-lg)',
                    border: '1px solid rgba(245, 158, 11, 0.25)',
                    background: 'rgba(245, 158, 11, 0.08)',
                  }}
                >
                  <AlertCircle size={18} style={{ color: '#f59e0b', flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <p className="type-body-sm" style={{ fontWeight: 650, color: '#f59e0b' }}>
                      Tip
                    </p>
                    <p className="type-caption" style={{ marginTop: 2 }}>
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
