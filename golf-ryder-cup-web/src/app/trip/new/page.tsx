'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { useToastStore, useTripStore, useAccessStore } from '@/lib/stores';
import { useShallow } from 'zustand/shallow';
import { createTripFromSetupWizard } from '@/lib/services/tripSetupService';
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock3,
  Flag,
  Shield,
  Sparkles,
  Trophy,
  Users,
  Wand2,
} from 'lucide-react';
import {
  EnhancedTripWizard,
  TRIP_WIZARD_STORAGE_KEY,
  type TripSetupData,
} from '@/components/trip-setup/EnhancedTripWizard';
import type { SessionConfig } from '@/components/trip-setup';

type PresetId = 'classic' | 'weekend' | 'single-day' | 'custom';

interface SetupPreset {
  id: PresetId;
  title: string;
  eyebrow: string;
  description: string;
  detail: string;
  sessions: SessionConfig[];
  totalDays: number;
  playersPerTeam: number;
}

const WORLD_CLASS_PRESETS: SetupPreset[] = [
  {
    id: 'classic',
    eyebrow: 'Ryder Standard',
    title: 'Classic three-day cup',
    description: 'The full trip backbone: two days of team sessions, then singles to settle it.',
    detail: '5 sessions • 24 points • Best for full squads',
    totalDays: 3,
    playersPerTeam: 8,
    sessions: [
      { id: 'classic-1', dayOffset: 0, timeSlot: 'AM', sessionType: 'foursomes', matchCount: 4, name: 'Day 1 Foursomes', pointsPerMatch: 1 },
      { id: 'classic-2', dayOffset: 0, timeSlot: 'PM', sessionType: 'fourball', matchCount: 4, name: 'Day 1 Four-Ball', pointsPerMatch: 1 },
      { id: 'classic-3', dayOffset: 1, timeSlot: 'AM', sessionType: 'foursomes', matchCount: 4, name: 'Day 2 Foursomes', pointsPerMatch: 1 },
      { id: 'classic-4', dayOffset: 1, timeSlot: 'PM', sessionType: 'fourball', matchCount: 4, name: 'Day 2 Four-Ball', pointsPerMatch: 1 },
      { id: 'classic-5', dayOffset: 2, timeSlot: 'AM', sessionType: 'singles', matchCount: 8, name: 'Day 3 Singles', pointsPerMatch: 1 },
    ],
  },
  {
    id: 'weekend',
    eyebrow: 'Weekend Cup',
    title: 'Two-day showdown',
    description: 'Enough structure to feel serious, compact enough for a proper buddies trip.',
    detail: '3 sessions • 12 points • Fastest route to ready',
    totalDays: 2,
    playersPerTeam: 6,
    sessions: [
      { id: 'weekend-1', dayOffset: 0, timeSlot: 'AM', sessionType: 'fourball', matchCount: 3, name: 'Day 1 Four-Ball', pointsPerMatch: 1 },
      { id: 'weekend-2', dayOffset: 0, timeSlot: 'PM', sessionType: 'foursomes', matchCount: 3, name: 'Day 1 Foursomes', pointsPerMatch: 1 },
      { id: 'weekend-3', dayOffset: 1, timeSlot: 'AM', sessionType: 'singles', matchCount: 6, name: 'Day 2 Singles', pointsPerMatch: 1 },
    ],
  },
  {
    id: 'single-day',
    eyebrow: 'One-Day Cup',
    title: 'Single-day battle card',
    description: 'A sharp, satisfying format for a quick competition that still feels intentional.',
    detail: '2 sessions • 6 points • Ideal for a compact field',
    totalDays: 1,
    playersPerTeam: 4,
    sessions: [
      { id: 'single-1', dayOffset: 0, timeSlot: 'AM', sessionType: 'fourball', matchCount: 2, name: 'Morning Four-Ball', pointsPerMatch: 1 },
      { id: 'single-2', dayOffset: 0, timeSlot: 'PM', sessionType: 'singles', matchCount: 4, name: 'Afternoon Singles', pointsPerMatch: 1 },
    ],
  },
  {
    id: 'custom',
    eyebrow: 'Custom Build',
    title: 'Start from a blank board',
    description: 'For captains who know the shape already and want to tune every lever themselves.',
    detail: 'Flexible days • Custom sessions • Advanced controls included',
    totalDays: 2,
    playersPerTeam: 8,
    sessions: [],
  },
];

function buildInitialSetupData(preset: SetupPreset): Partial<TripSetupData> {
  const today = new Date();
  const year = today.getFullYear();
  const prettyDate = today.toISOString().split('T')[0] || '';

  return {
    tripName:
      preset.id === 'classic'
        ? `Ryder Cup ${year}`
        : preset.id === 'weekend'
          ? `Weekend Cup ${year}`
          : preset.id === 'single-day'
            ? `One-Day Cup ${year}`
            : '',
    captainName: '',
    startDate: prettyDate,
    totalDays: preset.totalDays,
    playersPerTeam: preset.playersPerTeam,
    sessions: preset.sessions.map((session) => ({ ...session, id: crypto.randomUUID() })),
  };
}

function clearWizardDraft() {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(TRIP_WIZARD_STORAGE_KEY);
  sessionStorage.removeItem(`${TRIP_WIZARD_STORAGE_KEY}-step`);
}

export default function NewTripPage() {
  const router = useRouter();
  const { showToast } = useToastStore(useShallow((s) => ({ showToast: s.showToast })));
  const { loadTrip } = useTripStore(useShallow((s) => ({ loadTrip: s.loadTrip })));
  const { enableCaptainModeForCreator } = useAccessStore(
    useShallow((s) => ({ enableCaptainModeForCreator: s.enableCaptainModeForCreator }))
  );

  const [selectedPreset, setSelectedPreset] = useState<PresetId | null>(null);
  const [wizardSeed, setWizardSeed] = useState(0);
  const [hasSavedDraft, setHasSavedDraft] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setHasSavedDraft(Boolean(sessionStorage.getItem(TRIP_WIZARD_STORAGE_KEY)));
  }, []);

  const activePreset = useMemo(
    () => WORLD_CLASS_PRESETS.find((preset) => preset.id === selectedPreset) || null,
    [selectedPreset]
  );

  const handleStartPreset = (presetId: PresetId) => {
    clearWizardDraft();
    setHasSavedDraft(false);
    setSelectedPreset(presetId);
    setWizardSeed((seed) => seed + 1);
  };

  const handleResumeDraft = () => {
    setSelectedPreset('custom');
    setWizardSeed((seed) => seed + 1);
  };

  const handleComplete = async (data: TripSetupData) => {
    setIsCreating(true);
    try {
      const result = await createTripFromSetupWizard(data);
      enableCaptainModeForCreator();
      await loadTrip(result.trip.id);
      showToast('success', `${result.trip.name} is built and ready for captain setup.`);
      router.push('/captain?setup=created');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not create the trip.';
      showToast('error', message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleCancelWizard = () => {
    setSelectedPreset(null);
    setWizardSeed((seed) => seed + 1);
    setHasSavedDraft(
      Boolean(typeof window !== 'undefined' && sessionStorage.getItem(TRIP_WIZARD_STORAGE_KEY))
    );
  };

  if (selectedPreset) {
    return (
      <div className="min-h-screen page-premium-enter texture-grain bg-[var(--canvas)]">
        <PageHeader
          title="World-Class Trip Setup"
          subtitle={activePreset?.title || 'Custom setup'}
          icon={<Sparkles size={16} className="text-[var(--canvas)]" />}
          iconContainerClassName="bg-[linear-gradient(135deg,var(--masters)_0%,var(--masters-deep)_100%)]"
          onBack={handleCancelWizard}
        />

        <main className="container-editorial py-[var(--space-6)] pb-[var(--space-12)]">
          <section className="grid gap-[var(--space-5)] lg:grid-cols-[minmax(0,1.35fr)_22rem]">
            <div className="overflow-hidden rounded-[2rem] border border-[color:var(--rule)]/75 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(245,239,232,0.99))] shadow-[0_24px_52px_rgba(46,34,18,0.08)]">
              <div className="border-b border-[color:var(--rule)]/70 px-[var(--space-5)] py-[var(--space-5)]">
                <p className="type-overline tracking-[0.18em] text-[var(--masters)]">Captain Onboarding</p>
                <h1 className="mt-[var(--space-2)] font-serif text-[clamp(2rem,6vw,3rem)] italic leading-[1.02] text-[var(--ink)]">
                  Build the trip in one pass.
                </h1>
                <p className="mt-[var(--space-3)] max-w-[38rem] text-sm leading-7 text-[var(--ink-secondary)]">
                  Roster, teams, sessions, courses, scoring, and tee-sheet defaults now live in one
                  setup flow. Finish here, then land directly in the captain board with the trip ready
                  for lineup work.
                </p>
              </div>

              <div className={isCreating ? 'pointer-events-none opacity-70' : ''}>
                <EnhancedTripWizard
                  key={`${selectedPreset}-${wizardSeed}`}
                  initialData={activePreset ? buildInitialSetupData(activePreset) : undefined}
                  onComplete={handleComplete}
                  onCancel={handleCancelWizard}
                />
              </div>
            </div>

            <aside className="space-y-[var(--space-4)]">
              <div className="rounded-[1.8rem] border border-[var(--masters)]/16 bg-[linear-gradient(145deg,rgba(11,94,55,0.95),rgba(5,58,35,0.98))] p-[var(--space-5)] text-[var(--canvas)] shadow-[0_24px_54px_rgba(5,58,35,0.24)]">
                <p className="type-overline tracking-[0.16em] text-[color:var(--canvas)]/72">What happens next</p>
                <h2 className="mt-[var(--space-2)] font-serif text-[1.9rem] italic leading-[1.02] text-[var(--canvas)]">
                  The board is built, not just named.
                </h2>
                <div className="mt-[var(--space-4)] space-y-[var(--space-3)] text-sm leading-6 text-[color:var(--canvas)]/82">
                  <WizardOutcome icon={<Users size={16} />} title="Roster + teams" body="Players are created, balanced, and assigned so the captain board starts clean." />
                  <WizardOutcome icon={<Calendar size={16} />} title="Sessions + tee sheet" body="Sessions are scheduled with match shells and default tee times already on the board." />
                  <WizardOutcome icon={<Flag size={16} />} title="Courses where possible" body="Selected courses are added up front and assigned to the correct day when enough data exists." />
                </div>
              </div>

              <div className="rounded-[1.6rem] border border-[color:var(--rule)]/70 bg-[color:var(--surface)]/82 p-[var(--space-5)] shadow-[0_16px_34px_rgba(41,29,17,0.05)]">
                <p className="type-overline tracking-[0.16em] text-[var(--ink-tertiary)]">Launch standard</p>
                <ul className="mt-[var(--space-4)] space-y-3 text-sm text-[var(--ink-secondary)]">
                  <li className="flex gap-[var(--space-2)]"><CheckCircle2 size={16} className="mt-[2px] text-[var(--masters)]" /> No dead-end steps</li>
                  <li className="flex gap-[var(--space-2)]"><CheckCircle2 size={16} className="mt-[2px] text-[var(--masters)]" /> Saved draft recovery built in</li>
                  <li className="flex gap-[var(--space-2)]"><CheckCircle2 size={16} className="mt-[2px] text-[var(--masters)]" /> Created trips land directly in captain mode</li>
                </ul>
                <Button
                  variant="secondary"
                  fullWidth
                  className="mt-[var(--space-4)]"
                  isLoading={isCreating}
                  loadingText="Building Trip"
                  onClick={() => undefined}
                  disabled
                >
                  {isCreating ? 'Provisioning everything…' : 'Wizard active'}
                </Button>
              </div>
            </aside>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen page-premium-enter texture-grain bg-[var(--canvas)]">
      <PageHeader
        title="New Trip"
        subtitle="World-class captain setup"
        icon={<Shield size={16} className="text-[var(--canvas)]" />}
        iconContainerClassName="bg-[linear-gradient(135deg,var(--maroon)_0%,var(--maroon-dark)_100%)]"
        onBack={() => router.back()}
      />

      <main className="container-editorial py-[var(--space-6)] pb-[var(--space-12)]">
        <section className="overflow-hidden rounded-[2rem] border border-[var(--maroon-subtle)] bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(247,240,241,0.98))] shadow-[0_24px_52px_rgba(46,34,18,0.08)]">
          <div className="grid gap-[var(--space-5)] px-[var(--space-5)] py-[var(--space-5)] lg:grid-cols-[minmax(0,1.2fr)_18rem]">
            <div>
              <p className="type-overline tracking-[0.18em] text-[var(--maroon)]">Captain Launch</p>
              <h1 className="mt-[var(--space-2)] font-serif text-[clamp(2.2rem,7vw,3.4rem)] italic leading-[1.02] text-[var(--ink)]">
                Set up the trip like a real captain would.
              </h1>
              <p className="mt-[var(--space-3)] max-w-[38rem] text-sm leading-7 text-[var(--ink-secondary)]">
                Pick the trip shape, build the roster, set the competitive structure, and hand the
                finished board straight to captain mode. No scattered setup chores. No utility-folder feel.
              </p>

              <div className="mt-[var(--space-5)] flex flex-wrap gap-[var(--space-3)]">
                <LaunchPill icon={<Trophy size={14} />} label="Preset-driven" />
                <LaunchPill icon={<Users size={14} />} label="Roster-first" />
                <LaunchPill icon={<Clock3 size={14} />} label="Saved draft recovery" />
              </div>
            </div>

            <div className="grid gap-[var(--space-3)] sm:grid-cols-3 lg:grid-cols-1">
              <SetupFact label="Time to first board" value="~5 min" />
              <SetupFact label="Routes to finish" value="1" />
              <SetupFact label="Captain handoff" value="Direct" />
            </div>
          </div>
        </section>

        {hasSavedDraft ? (
          <section className="mt-[var(--space-6)] rounded-[1.8rem] border border-[var(--masters)]/14 bg-[linear-gradient(135deg,rgba(10,80,48,0.97),rgba(4,52,30,0.98))] p-[var(--space-5)] text-[var(--canvas)] shadow-[0_24px_54px_rgba(5,58,35,0.24)]">
            <div className="flex flex-col gap-[var(--space-4)] md:flex-row md:items-center md:justify-between">
              <div>
                <p className="type-overline tracking-[0.16em] text-[color:var(--canvas)]/70">Saved draft</p>
                <h2 className="mt-[var(--space-2)] font-serif text-[1.9rem] italic leading-[1.02]">
                  Pick up where setup paused.
                </h2>
                <p className="mt-[var(--space-2)] text-sm leading-7 text-[color:var(--canvas)]/80">
                  The setup wizard kept your draft. Resume it now or start a new build from a cleaner preset.
                </p>
              </div>
              <div className="flex flex-wrap gap-[var(--space-3)]">
                <Button
                  variant="secondary"
                  leftIcon={<ArrowRight size={16} />}
                  className="border-[color:var(--canvas)]/16 bg-[var(--canvas)] text-[var(--masters)] hover:bg-[color:var(--canvas)]/92"
                  onClick={handleResumeDraft}
                >
                  Resume draft
                </Button>
                <Button
                  variant="outline"
                  className="border-[color:var(--canvas)]/22 bg-transparent text-[var(--canvas)] hover:bg-[color:var(--canvas)]/10"
                  onClick={() => handleStartPreset('custom')}
                >
                  Start new instead
                </Button>
              </div>
            </div>
          </section>
        ) : null}

        <section className="pt-[var(--space-6)]">
          <div className="mb-[var(--space-4)]">
            <p className="type-overline tracking-[0.16em] text-[var(--ink-tertiary)]">Choose the backbone</p>
            <h2 className="mt-[var(--space-2)] font-serif text-[2rem] italic text-[var(--ink)]">
              Start from a preset that already thinks like a captain.
            </h2>
          </div>

          <div className="grid gap-[var(--space-4)] lg:grid-cols-2">
            {WORLD_CLASS_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleStartPreset(preset.id)}
                className="group rounded-[1.8rem] border border-[color:var(--rule)]/75 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(244,238,231,0.98))] p-[var(--space-5)] text-left shadow-[0_18px_38px_rgba(41,29,17,0.08)] transition-transform duration-150 hover:scale-[1.01] hover:border-[var(--maroon-subtle)]"
              >
                <p className="type-overline tracking-[0.16em] text-[var(--masters)]">{preset.eyebrow}</p>
                <h3 className="mt-[var(--space-2)] font-serif text-[1.8rem] italic leading-[1.04] text-[var(--ink)]">
                  {preset.title}
                </h3>
                <p className="mt-[var(--space-3)] text-sm leading-7 text-[var(--ink-secondary)]">
                  {preset.description}
                </p>

                <div className="mt-[var(--space-4)] flex flex-wrap gap-[var(--space-2)]">
                  <PresetMeta icon={<Calendar size={14} />} label={`${preset.totalDays} day${preset.totalDays === 1 ? '' : 's'}`} />
                  <PresetMeta icon={<Users size={14} />} label={`${preset.playersPerTeam} per side`} />
                  <PresetMeta icon={<Wand2 size={14} />} label={preset.sessions.length > 0 ? `${preset.sessions.length} sessions` : 'Custom build'} />
                </div>

                <div className="mt-[var(--space-4)] flex items-center justify-between">
                  <span className="text-sm font-semibold text-[var(--ink)]">{preset.detail}</span>
                  <span className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--masters)]">
                    Start <ArrowRight size={14} />
                  </span>
                </div>
              </button>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

function SetupFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.1rem] border border-[var(--rule)] bg-[rgba(255,255,255,0.72)] px-[var(--space-4)] py-[var(--space-4)] shadow-[0_12px_24px_rgba(46,34,18,0.05)]">
      <p className="type-overline text-[var(--ink-tertiary)]">{label}</p>
      <p className="mt-[var(--space-2)] font-serif text-[1.7rem] italic leading-none text-[var(--ink)]">{value}</p>
    </div>
  );
}

function LaunchPill({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-[var(--space-2)] rounded-full border border-[color:var(--maroon)]/14 bg-[color:var(--maroon)]/8 px-[var(--space-3)] py-[var(--space-2)] text-sm font-medium text-[var(--maroon-dark)]">
      {icon}
      {label}
    </span>
  );
}

function PresetMeta({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-[color:var(--rule)]/65 bg-[var(--surface)]/82 px-3 py-1.5 text-xs font-semibold text-[var(--ink-secondary)]">
      {icon}
      {label}
    </span>
  );
}

function WizardOutcome({
  icon,
  title,
  body,
}: {
  icon: ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-[1.2rem] border border-[color:var(--canvas)]/14 bg-[color:var(--canvas)]/8 p-[var(--space-3)]">
      <div className="flex items-center gap-[var(--space-2)] text-[var(--canvas)]">
        {icon}
        <p className="font-semibold">{title}</p>
      </div>
      <p className="mt-[var(--space-2)] text-sm leading-6 text-[color:var(--canvas)]/76">{body}</p>
    </div>
  );
}
