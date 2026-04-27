/**
 * Scoring preferences page.
 *
 * Phase 2 home for everything that used to live as a tip card or chip
 * rail on the cockpit: scoring method per format, hand alignment,
 * haptics, sounds, sunlight mode, auto-advance, closeout confirmation.
 *
 * This page is link-deep from the cockpit overflow sheet (⋮ → Scoring
 * preferences) and from the global Settings page.
 */

'use client';

import { useRouter } from 'next/navigation';
import { Hand, Sliders, Sparkles, Sun, Volume2 } from 'lucide-react';
import { useShallow } from 'zustand/shallow';
import { PageHeader } from '@/components/layout';
import { useScoringPrefsStore } from '@/lib/stores';
import { useThemeStore } from '@/lib/stores/themeStore';
import type { ScoringPreferences } from '@/lib/types/scoringPreferences';

export default function ScoringPreferencesPage() {
  const router = useRouter();
  const { scoringPreferences, updateScoringPreference, resetScoringPreferences } =
    useScoringPrefsStore(
      useShallow((s) => ({
        scoringPreferences: s.scoringPreferences,
        updateScoringPreference: s.updateScoringPreference,
        resetScoringPreferences: s.resetScoringPreferences,
      }))
    );
  const { theme, setTheme } = useThemeStore();

  const set = <K extends keyof ScoringPreferences>(key: K, value: ScoringPreferences[K]) =>
    updateScoringPreference(key, value);

  return (
    <div className="min-h-screen bg-[var(--canvas)] page-premium-enter">
      <PageHeader
        title="Scoring preferences"
        subtitle="How you score, hole after hole"
        icon={<Sliders size={16} className="text-[var(--masters)]" />}
        onBack={() => router.back()}
      />

      <main className="container-editorial space-y-5 py-6">
        <Section
          icon={<Hand size={16} />}
          title="Hand &amp; layout"
          description="Where the primary tap targets land for one-handed scoring."
        >
          <ChoiceRow
            label="Preferred hand"
            value={scoringPreferences.preferredHand}
            options={[
              { value: 'right', label: 'Right' },
              { value: 'left', label: 'Left' },
            ]}
            onChange={(v) => set('preferredHand', v as 'left' | 'right')}
          />
          <ToggleRow
            label="One-handed mode"
            description="Locks the layout to thumb-zone targets."
            checked={scoringPreferences.oneHandedMode}
            onChange={(v) => set('oneHandedMode', v)}
          />
          <ChoiceRow
            label="Button size"
            value={scoringPreferences.buttonScale}
            options={[
              { value: 'normal', label: 'Normal' },
              { value: 'large', label: 'Large' },
              { value: 'extra-large', label: 'XL' },
            ]}
            onChange={(v) => set('buttonScale', v as ScoringPreferences['buttonScale'])}
          />
        </Section>

        <Section
          icon={<Sparkles size={16} />}
          title="Score commit"
          description="What happens when you tap a winner."
        >
          <ToggleRow
            label="Auto-advance to next hole"
            description="On after scoring, off when correcting."
            checked={scoringPreferences.autoAdvance}
            onChange={(v) => set('autoAdvance', v)}
          />
          <ToggleRow
            label="Confirm match-ending score"
            description="Asks before recording a closeout."
            checked={scoringPreferences.confirmCloseout}
            onChange={(v) => set('confirmCloseout', v)}
          />
          <ToggleRow
            label="Quick score (two-tap)"
            description="First tap arms; second tap commits."
            checked={scoringPreferences.quickScoreMode}
            onChange={(v) => set('quickScoreMode', v)}
          />
          <ToggleRow
            label="Always show undo"
            description="Keeps undo visible even when no recent action."
            checked={scoringPreferences.alwaysShowUndo}
            onChange={(v) => set('alwaysShowUndo', v)}
          />
        </Section>

        <Section
          icon={<Volume2 size={16} />}
          title="Haptics &amp; sound"
          description="Feedback that confirms a score went through."
        >
          <ToggleRow
            label="Haptic feedback (master)"
            description="Disables all vibrations if off."
            checked={scoringPreferences.hapticFeedback}
            onChange={(v) => set('hapticFeedback', v)}
          />
          <ChoiceRow
            label="Haptic intensity"
            value={scoringPreferences.hapticIntensity}
            options={[
              { value: 'low', label: 'Low' },
              { value: 'medium', label: 'Medium' },
              { value: 'high', label: 'High' },
            ]}
            onChange={(v) =>
              set('hapticIntensity', v as ScoringPreferences['hapticIntensity'])
            }
          />
          <ToggleRow
            label="Score sound effects"
            description="Subtle tick on commit, fanfare on match win."
            checked={scoringPreferences.soundEffects}
            onChange={(v) => set('soundEffects', v)}
          />
        </Section>

        <Section
          icon={<Sun size={16} />}
          title="On the course"
          description="Optimised for direct sunlight and one-handed walking."
        >
          <ChoiceRow
            label="Theme"
            value={theme}
            options={[
              { value: 'outdoor', label: 'Outdoor (high contrast)' },
              { value: 'light', label: 'Editorial' },
              { value: 'dark', label: 'Dark' },
            ]}
            onChange={(v) => setTheme(v as 'light' | 'dark' | 'outdoor')}
          />
          <p className="px-1 text-xs text-[var(--ink-tertiary)]">
            Outdoor mode pumps contrast on text, scores, and team blocks for
            sunlight legibility.
          </p>
        </Section>

        <div className="flex items-center justify-between rounded-2xl border border-[color:var(--rule)] bg-[var(--canvas-raised)] px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-[var(--ink)]">Reset to defaults</p>
            <p className="mt-0.5 text-xs text-[var(--ink-tertiary)]">
              Restores every preference on this screen.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              if (confirm('Reset all scoring preferences to defaults?')) {
                resetScoringPreferences();
              }
            }}
            className="rounded-full border border-[color:var(--rule)] bg-[var(--canvas)] px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ink-secondary)] transition-colors hover:text-[var(--ink)]"
          >
            Reset
          </button>
        </div>
      </main>
    </div>
  );
}

function Section({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  title: React.ReactNode;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-[color:var(--rule)] bg-[var(--canvas-raised)]">
      <header className="flex items-start gap-3 border-b border-[color:var(--rule)] bg-[var(--canvas-sunken)] px-4 py-3">
        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[var(--canvas)] text-[var(--masters)]">
          {icon}
        </span>
        <div>
          <h2 className="font-serif text-base text-[var(--ink)]">{title}</h2>
          <p className="mt-0.5 text-xs text-[var(--ink-tertiary)]">{description}</p>
        </div>
      </header>
      <div className="divide-y divide-[color:var(--rule)]/70">{children}</div>
    </section>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-3 px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-[var(--ink)]">{label}</p>
        {description && (
          <p className="mt-0.5 text-xs text-[var(--ink-tertiary)]">{description}</p>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--canvas-raised)] ${
          checked ? 'bg-[var(--masters)]' : 'bg-[var(--canvas-sunken)]'
        }`}
      >
        <span
          aria-hidden
          className={`inline-block h-5 w-5 rounded-full bg-[var(--canvas)] shadow-card-sm transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </label>
  );
}

function ChoiceRow({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (v: string) => void;
}) {
  return (
    <div className="px-4 py-3">
      <p className="text-sm font-semibold text-[var(--ink)]">{label}</p>
      <div
        role="radiogroup"
        aria-label={label}
        className="mt-2 flex flex-wrap gap-2"
      >
        {options.map((opt) => {
          const active = opt.value === value;
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(opt.value)}
              className={`min-h-10 rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--canvas-raised)] ${
                active
                  ? 'bg-[var(--masters)] text-[var(--canvas)] shadow-card-sm'
                  : 'border border-[color:var(--rule)] bg-[var(--canvas)] text-[var(--ink-secondary)] hover:text-[var(--ink)]'
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
