'use client';

import Link from 'next/link';
import { useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  CaptainModeRequiredState,
  CaptainNoTripState,
} from '@/components/captain/CaptainAccessState';
import { PageHeader } from '@/components/layout';
import { Button } from '@/components/ui/Button';
import { db } from '@/lib/db';
import { useTripStore, useAccessStore, useToastStore } from '@/lib/stores';
import { useShallow } from 'zustand/shallow';
import { captainLogger } from '@/lib/utils/logger';
import { cn } from '@/lib/utils';
import {
  Bell,
  Calendar,
  ChevronRight,
  MapPin,
  Palette,
  Save,
  Settings,
  Shield,
  Users,
} from 'lucide-react';

export default function CaptainSettingsPage() {
  const router = useRouter();
  const { currentTrip, updateTrip } = useTripStore(useShallow(s => ({ currentTrip: s.currentTrip, updateTrip: s.updateTrip })));
  const { isCaptainMode } = useAccessStore(useShallow(s => ({ isCaptainMode: s.isCaptainMode })));
  const { showToast } = useToastStore(useShallow(s => ({ showToast: s.showToast })));

  const [tripName, setTripName] = useState(currentTrip?.name || '');
  const [startDate, setStartDate] = useState(currentTrip?.startDate || '');
  const [endDate, setEndDate] = useState(currentTrip?.endDate || '');
  const [location, setLocation] = useState(currentTrip?.location || '');
  const [teamAName, setTeamAName] = useState('');
  const [teamBName, setTeamBName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const teams = useLiveQuery(
    async () => {
      if (!currentTrip) return [];
      return db.teams.where('tripId').equals(currentTrip.id).toArray();
    },
    [currentTrip?.id],
    []
  );

  const teamA = teams.find((team) => team.color === 'usa');
  const teamB = teams.find((team) => team.color === 'europe');

  useEffect(() => {
    if (currentTrip) {
      setTripName(currentTrip.name);
      setStartDate(currentTrip.startDate);
      setEndDate(currentTrip.endDate);
      setLocation(currentTrip.location || '');
    }
  }, [currentTrip]);

  useEffect(() => {
    setTeamAName(teamA?.name || '');
    setTeamBName(teamB?.name || '');
  }, [teamA, teamB]);

  const normalizedStartDate = normalizeDateValue(startDate);
  const normalizedEndDate = normalizeDateValue(endDate);
  const savedStartDate = normalizeDateValue(currentTrip?.startDate);
  const savedEndDate = normalizeDateValue(currentTrip?.endDate);
  const hasUnsavedChanges = currentTrip
    ? tripName.trim() !== currentTrip.name ||
      normalizedStartDate !== savedStartDate ||
      normalizedEndDate !== savedEndDate ||
      location !== (currentTrip.location || '') ||
      teamAName !== (teamA?.name || '') ||
      teamBName !== (teamB?.name || '')
    : false;
  const isReadyToPublish = Boolean(
    tripName.trim() && normalizedStartDate && normalizedEndDate && teamAName.trim() && teamBName.trim()
  );

  const handleSave = async () => {
    if (!currentTrip || isSaving) return;
    if (!tripName.trim()) {
      showToast('error', 'Trip name is required');
      return;
    }

    setIsSaving(true);

    try {
      await updateTrip(currentTrip.id, {
        name: tripName.trim(),
        startDate,
        endDate,
        location,
      });

      if (teamA && teamAName !== teamA.name) {
        await db.teams.update(teamA.id, {
          name: teamAName,
          updatedAt: new Date().toISOString(),
        });
      }

      if (teamB && teamBName !== teamB.name) {
        await db.teams.update(teamB.id, {
          name: teamBName,
          updatedAt: new Date().toISOString(),
        });
      }

      showToast('success', 'Trip settings saved');
    } catch (error) {
      captainLogger.error('Failed to save settings:', error);
      showToast('error', 'Failed to save settings. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!currentTrip) {
    return <CaptainNoTripState description="Start or select a trip to configure captain settings." />;
  }

  if (!isCaptainMode) {
    return <CaptainModeRequiredState description="Turn on Captain Mode to access captain settings." />;
  }

  return (
    <div className="min-h-screen page-premium-enter texture-grain bg-[var(--canvas)]">
      <PageHeader
        title="Captain Settings"
        subtitle={currentTrip.name}
        onBack={() => router.back()}
        icon={<Settings size={16} className="text-[var(--canvas)]" />}
        iconTone="captain"
        rightSlot={
          <Button
            variant="primary"
            size="sm"
            onClick={handleSave}
            disabled={isSaving || !hasUnsavedChanges}
            leftIcon={<Save size={16} />}
          >
            {isSaving ? 'Saving...' : hasUnsavedChanges ? 'Save Changes' : 'Saved'}
          </Button>
        }
      />

      <main className="container-editorial py-[var(--space-6)] pb-[var(--space-12)]">
        <section className="overflow-hidden rounded-[2rem] border border-[var(--maroon-subtle)] bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(247,240,241,0.98))] shadow-[0_24px_52px_rgba(46,34,18,0.08)]">
          <div className="grid gap-[var(--space-5)] px-[var(--space-5)] py-[var(--space-5)] lg:grid-cols-[minmax(0,1.3fr)_minmax(18rem,0.95fr)]">
            <div>
              <p className="type-overline tracking-[0.18em] text-[var(--maroon)]">Captain Control</p>
              <h1 className="mt-[var(--space-2)] font-serif text-[clamp(2rem,7vw,3.15rem)] italic leading-[1.02] text-[var(--ink)]">
                Set the trip once, let the rest of the board behave.
              </h1>
              <p className="mt-[var(--space-3)] max-w-[35rem] type-body-sm text-[var(--ink-secondary)]">
                The settings room should be quiet: trip identity, dates, location, and team names. If this foundation is sound, the rest of the captain tools inherit order instead of chaos.
              </p>
            </div>

            <div className="grid gap-[var(--space-3)] sm:grid-cols-2 lg:grid-cols-2">
              <SettingsFactCard icon={<Calendar size={18} />} label="Dates" value={normalizedStartDate && normalizedEndDate ? 'Set' : 'Open'} detail="Trip range for schedules and recaps" valueClassName="font-sans text-[1rem] not-italic" tone={normalizedStartDate && normalizedEndDate ? 'green' : 'ink'} />
              <SettingsFactCard icon={<MapPin size={18} />} label="Location" value={location ? 'Set' : 'Open'} detail="Trip home base" valueClassName="font-sans text-[1rem] not-italic" tone={location ? 'green' : 'ink'} />
              <SettingsFactCard icon={<Shield size={18} />} label="Teams" value={`${teamAName || 'A'} / ${teamBName || 'B'}`} detail="Displayed across the app" valueClassName="font-sans text-[1rem] not-italic leading-[1.2]" />
              <SettingsFactCard icon={<Save size={18} />} label="Status" value={hasUnsavedChanges ? 'Draft' : 'Saved'} detail={isReadyToPublish ? 'Ready for the rest of the app' : 'Still missing a few basics'} valueClassName="font-sans text-[1rem] not-italic" tone={!hasUnsavedChanges && isReadyToPublish ? 'green' : 'ink'} />
            </div>
          </div>
        </section>

        <section className="mt-[var(--space-6)] grid gap-[var(--space-4)] xl:grid-cols-[minmax(0,1.15fr)_22rem]">
          <div className="space-y-[var(--space-4)]">
            <SettingsPanel
              title="Trip Details"
              subtitle="Keep the trip identity clean and current."
              icon={<MapPin size={18} />}
            >
              <div className="grid gap-[var(--space-4)]">
                <FormField label="Trip Name">
                  <input
                    type="text"
                    value={tripName}
                    onChange={(event) => setTripName(event.target.value)}
                    className="input"
                    placeholder="Ryder Cup 2026"
                  />
                </FormField>

                <FormField label="Location">
                  <input
                    type="text"
                    value={location}
                    onChange={(event) => setLocation(event.target.value)}
                    className="input"
                    placeholder="Pinehurst, NC"
                  />
                </FormField>

                <div className="grid gap-[var(--space-4)] sm:grid-cols-2">
                  <FormField label="Start Date">
                  <input
                    type="date"
                    value={normalizedStartDate}
                    onChange={(event) => setStartDate(event.target.value)}
                    className="input"
                  />
                </FormField>
                <FormField label="End Date">
                  <input
                    type="date"
                    value={normalizedEndDate}
                    onChange={(event) => setEndDate(event.target.value)}
                    className="input"
                  />
                </FormField>
                </div>
              </div>
            </SettingsPanel>

            <SettingsPanel
              title="Team Names"
              subtitle="These names flow through standings, lineups, and live boards."
              icon={<Palette size={18} />}
            >
              <div className="grid gap-[var(--space-4)] sm:grid-cols-2">
                <FormField label="Team A">
                  <input
                    type="text"
                    value={teamAName}
                    onChange={(event) => setTeamAName(event.target.value)}
                    className="input border-[var(--team-usa)] focus:border-[var(--team-usa)]"
                    placeholder="Team USA"
                  />
                </FormField>
                <FormField label="Team B">
                  <input
                    type="text"
                    value={teamBName}
                    onChange={(event) => setTeamBName(event.target.value)}
                    className="input border-[var(--team-europe)] focus:border-[var(--team-europe)]"
                    placeholder="Team Europe"
                  />
                </FormField>
              </div>
              <p className="mt-[var(--space-3)] text-sm text-[var(--ink-secondary)]">
                Name them well once and the rest of the app feels more intentional immediately.
              </p>
            </SettingsPanel>
          </div>

          <aside className="space-y-[var(--space-4)]">
            <div className="rounded-[1.6rem] border border-[color:var(--rule)]/70 bg-[color:var(--surface)]/82 p-[var(--space-5)] shadow-[0_16px_34px_rgba(41,29,17,0.05)]">
              <p className="type-overline tracking-[0.15em] text-[var(--ink-tertiary)]">Configuration Status</p>
              <div className="mt-[var(--space-4)] space-y-3">
                <StatusRow
                  icon={<Calendar size={16} />}
                  label="Schedule window"
                  value={normalizedStartDate && normalizedEndDate ? 'Ready' : 'Open'}
                />
                <StatusRow
                  icon={<MapPin size={16} />}
                  label="Trip identity"
                  value={tripName.trim() && location ? 'Ready' : 'Open'}
                />
                <StatusRow
                  icon={<Palette size={16} />}
                  label="Team presentation"
                  value={teamAName.trim() && teamBName.trim() ? 'Ready' : 'Open'}
                />
              </div>
              <p className="mt-[var(--space-4)] text-sm leading-6 text-[var(--ink-secondary)]">
                This page should settle the names and timing that the rest of the app repeats. Once those are clean, the other captain rooms inherit the order.
              </p>
            </div>

            <div className="rounded-[1.6rem] border border-[color:var(--rule)]/70 bg-[color:var(--surface)]/82 p-[var(--space-5)] shadow-[0_16px_34px_rgba(41,29,17,0.05)]">
              <p className="type-overline tracking-[0.15em] text-[var(--ink-tertiary)]">Captain Tools</p>
              <div className="mt-[var(--space-4)] space-y-3">
                <CaptainToolLink href="/captain/checklist" icon={<Shield size={18} />} title="Pre-Flight Checklist" body="Review trip readiness." />
                <CaptainToolLink href="/captain/availability" icon={<Users size={18} />} title="Player Attendance" body="Track arrivals." />
                <CaptainToolLink href="/captain/messages" icon={<Bell size={18} />} title="Announcements" body="Broadcast to the trip." />
                <CaptainToolLink href="/captain/manage" icon={<Settings size={18} />} title="Session Management" body="Adjust rounds and scoring structure." />
              </div>
            </div>
          </aside>
        </section>
      </main>
    </div>
  );
}

function SettingsFactCard({
  icon,
  label,
  value,
  detail,
  valueClassName,
  tone = 'ink',
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  detail: string;
  valueClassName?: string;
  tone?: 'ink' | 'green';
}) {
  return (
    <div
      className={cn(
        'rounded-[1.5rem] border p-[var(--space-4)] shadow-[0_16px_34px_rgba(41,29,17,0.05)]',
        tone === 'green'
          ? 'border-[color:var(--success)]/16 bg-[linear-gradient(180deg,rgba(45,122,79,0.10),rgba(255,255,255,0.98))]'
          : 'border-[color:var(--rule)]/70 bg-[color:var(--surface)]/78'
      )}
    >
      <div className="flex items-center gap-[var(--space-2)] text-[var(--ink-tertiary)]">
        {icon}
        <span className="type-overline tracking-[0.14em]">{label}</span>
      </div>
      <p className={cn('mt-[var(--space-3)] font-serif text-[1.95rem] italic leading-none text-[var(--ink)]', valueClassName)}>
        {value}
      </p>
      <p className="mt-[var(--space-2)] text-sm text-[var(--ink-secondary)]">{detail}</p>
    </div>
  );
}

function SettingsPanel({
  title,
  subtitle,
  icon,
  children,
}: {
  title: string;
  subtitle: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[1.8rem] border border-[color:var(--rule)]/75 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(245,239,232,0.99))] p-[var(--space-5)] shadow-[0_20px_46px_rgba(41,29,17,0.08)]">
      <div className="flex items-center gap-[var(--space-3)]">
        <div className="flex h-11 w-11 items-center justify-center rounded-[1rem] bg-[color:var(--maroon)]/10 text-[var(--maroon)]">
          {icon}
        </div>
        <div>
          <p className="type-overline tracking-[0.15em] text-[var(--maroon)]">{title}</p>
          <p className="mt-[var(--space-1)] text-sm text-[var(--ink-secondary)]">{subtitle}</p>
        </div>
      </div>
      <div className="mt-[var(--space-5)]">{children}</div>
    </section>
  );
}

function FormField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-[var(--space-2)] block text-sm font-semibold text-[var(--ink)]">{label}</span>
      {children}
    </label>
  );
}

function CaptainToolLink({
  href,
  icon,
  title,
  body,
}: {
  href: string;
  icon: ReactNode;
  title: string;
  body: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-[var(--space-3)] rounded-[1.25rem] border border-[color:var(--rule)]/70 bg-[color:var(--canvas)]/75 px-[var(--space-4)] py-[var(--space-4)] transition-transform duration-150 hover:scale-[1.01] hover:border-[var(--maroon-subtle)]"
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-[1rem] bg-[color:var(--maroon)]/10 text-[var(--maroon)]">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-[var(--ink)]">{title}</p>
        <p className="text-sm text-[var(--ink-secondary)]">{body}</p>
      </div>
      <ChevronRight size={18} className="text-[var(--ink-tertiary)]" />
    </Link>
  );
}

function StatusRow({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-[var(--space-3)] rounded-[1.25rem] border border-[color:var(--rule)]/70 bg-[color:var(--canvas)]/75 px-[var(--space-4)] py-[var(--space-4)]">
      <div className="flex h-10 w-10 items-center justify-center rounded-[0.95rem] bg-[color:var(--surface)] text-[var(--maroon)]">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-[var(--ink)]">{label}</p>
      </div>
      <span
        className={cn(
          'rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em]',
          value === 'Ready'
            ? 'bg-[color:var(--success)]/12 text-[var(--success)]'
            : 'bg-[color:var(--warning)]/12 text-[var(--warning)]'
        )}
      >
        {value}
      </span>
    </div>
  );
}

function normalizeDateValue(value?: string) {
  return value ? value.split('T')[0] : '';
}
