'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useLiveQuery } from 'dexie-react-hooks';

import { BottomNav, PageHeader } from '@/components/layout';
import { EmptyStatePremium } from '@/components/ui/EmptyStatePremium';
import { db } from '@/lib/db';
import { useTripStore, useUIStore } from '@/lib/stores';
import { captainLogger } from '@/lib/utils/logger';
import {
  Bell,
  Calendar,
  ChevronLeft,
  Edit3,
  Home,
  Lock,
  MapPin,
  MoreHorizontal,
  Palette,
  Save,
  Settings,
  Shield,
  Users,
} from 'lucide-react';

/**
 * CAPTAIN SETTINGS PAGE
 *
 * Configure trip settings and captain preferences.
 */

export default function CaptainSettingsPage() {
  const router = useRouter();
  const { currentTrip, updateTrip } = useTripStore();
  const { isCaptainMode, showToast } = useUIStore();

  const [tripName, setTripName] = useState(currentTrip?.name || '');
  const [startDate, setStartDate] = useState(currentTrip?.startDate || '');
  const [endDate, setEndDate] = useState(currentTrip?.endDate || '');
  const [location, setLocation] = useState(currentTrip?.location || '');
  const [teamAName, setTeamAName] = useState('');
  const [teamBName, setTeamBName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Fetch teams for this trip
  const teams = useLiveQuery(
    async () => {
      if (!currentTrip) return [];
      return db.teams.where('tripId').equals(currentTrip.id).toArray();
    },
    [currentTrip?.id],
    []
  );

  const teamA = teams.find(t => t.color === 'usa');
  const teamB = teams.find(t => t.color === 'europe');

  // Note: avoid auto-redirects so we can render explicit empty states.

  useEffect(() => {
    if (currentTrip) {
      setTripName(currentTrip.name);
      setStartDate(currentTrip.startDate);
      setEndDate(currentTrip.endDate);
      setLocation(currentTrip.location || '');
    }
  }, [currentTrip]);

  useEffect(() => {
    if (teamA) setTeamAName(teamA.name);
    if (teamB) setTeamBName(teamB.name);
  }, [teamA, teamB]);

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

      // Update team names if changed
      if (teamA && teamAName !== teamA.name) {
        await db.teams.update(teamA.id, { name: teamAName, updatedAt: new Date().toISOString() });
      }
      if (teamB && teamBName !== teamB.name) {
        await db.teams.update(teamB.id, { name: teamBName, updatedAt: new Date().toISOString() });
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
    return (
      <div className="min-h-screen pb-nav page-premium-enter texture-grain bg-[var(--canvas)]">
        <PageHeader
          title="Trip Settings"
          subtitle="Captain controls"
          onBack={() => router.push('/more')}
          icon={<Settings size={16} className="text-[var(--color-accent)]" />}
        />

        <main className="container-editorial py-12">
          <EmptyStatePremium
            illustration="golf-ball"
            title="No active trip"
            description="Start or select a trip to configure Captain Settings."
            action={{
              label: 'Go Home',
              onClick: () => router.push('/'),
              icon: <Home size={16} />,
            }}
            secondaryAction={{
              label: 'Open More',
              onClick: () => router.push('/more'),
            }}
            variant="large"
          />
        </main>
        <BottomNav />
      </div>
    );
  }

  if (!isCaptainMode) {
    return (
      <div className="min-h-screen pb-nav page-premium-enter texture-grain bg-[var(--canvas)]">
        <PageHeader
          title="Trip Settings"
          subtitle="Captain controls"
          onBack={() => router.push('/more')}
          icon={<Settings size={16} className="text-[var(--color-accent)]" />}
        />

        <main className="container-editorial py-12">
          <EmptyStatePremium
            illustration="trophy"
            title="Captain mode required"
            description="Turn on Captain Mode to access Captain Settings."
            action={{
              label: 'Open More',
              onClick: () => router.push('/more'),
              icon: <MoreHorizontal size={16} />,
            }}
            secondaryAction={{
              label: 'Go Home',
              onClick: () => router.push('/'),
            }}
            variant="large"
          />
        </main>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-nav page-premium-enter texture-grain bg-[var(--canvas)]">
      <PageHeader
        title="Trip Settings"
        subtitle="Configure trip details"
        onBack={() => router.back()}
        icon={<Settings size={16} className="text-[var(--color-accent)]" />}
        rightSlot={
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="btn-premium flex items-center gap-[var(--space-2)] px-[var(--space-3)] py-[var(--space-2)] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <Save size={16} />
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        }
      />

      <main className="container-editorial">
        {/* Trip Details */}
        <section className="section">
          <h2 className="type-overline mb-[var(--space-4)]">Trip Details</h2>

          <div className="space-y-4">
            <div>
              <label className="type-meta block mb-[var(--space-2)]">
                <Edit3 size={14} className="inline mr-1.5 align-middle" />
                Trip Name
              </label>
              <input
                type="text"
                value={tripName}
                onChange={(e) => setTripName(e.target.value)}
                className="input"
                placeholder="e.g., Ryder Cup 2024"
              />
            </div>

            <div>
              <label className="type-meta block mb-[var(--space-2)]">
                <MapPin size={14} className="inline mr-1.5 align-middle" />
                Location
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="input"
                placeholder="e.g., Pebble Beach, CA"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="type-meta block mb-[var(--space-2)]">
                  <Calendar size={14} className="inline mr-1.5 align-middle" />
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate.split('T')[0]}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="input"
                />
              </div>
              <div>
                <label className="type-meta block mb-[var(--space-2)]">
                  <Calendar size={14} className="inline mr-1.5 align-middle" />
                  End Date
                </label>
                <input
                  type="date"
                  value={endDate.split('T')[0]}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="input"
                />
              </div>
            </div>
          </div>
        </section>

        <hr className="divider" />

        {/* Team Names */}
        <section className="section">
          <h2 className="type-overline mb-[var(--space-4)]">Team Names</h2>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="type-meta block mb-[var(--space-2)]">
                  <Palette size={14} className="inline mr-1.5 align-middle text-[var(--team-usa)]" />
                  Team A
                </label>
                <input
                  type="text"
                  value={teamAName}
                  onChange={(e) => setTeamAName(e.target.value)}
                  className="input border-[var(--team-usa)] focus:border-[var(--team-usa)]"
                  placeholder="e.g., Team USA"
                />
              </div>
              <div>
                <label className="type-meta block mb-[var(--space-2)]">
                  <Palette size={14} className="inline mr-1.5 align-middle text-[var(--team-europe)]" />
                  Team B
                </label>
                <input
                  type="text"
                  value={teamBName}
                  onChange={(e) => setTeamBName(e.target.value)}
                  className="input border-[var(--team-europe)] focus:border-[var(--team-europe)]"
                  placeholder="e.g., Team Europe"
                />
              </div>
            </div>
            <p className="type-micro text-[var(--ink-tertiary)]">
              Customize your team names. Changes will appear throughout the app.
            </p>
          </div>
        </section>

        <hr className="divider" />

        {/* Captain Tools */}
        <section className="section">
          <h2 className="type-overline mb-[var(--space-4)]">Captain Tools</h2>

          <div className="space-y-3">
            <Link href="/captain/checklist" className="match-row">
              <Shield size={18} className="text-[var(--masters)]" />
              <div className="flex-1">
                <p className="font-medium">Pre-Flight Checklist</p>
                <p className="type-meta">Review trip readiness</p>
              </div>
              <ChevronLeft size={18} className="text-[var(--ink-tertiary)] rotate-180" />
            </Link>

            <Link href="/captain/availability" className="match-row">
              <Users size={18} className="text-[var(--masters)]" />
              <div className="flex-1">
                <p className="font-medium">Player Attendance</p>
                <p className="type-meta">Track arrivals</p>
              </div>
              <ChevronLeft size={18} className="text-[var(--ink-tertiary)] rotate-180" />
            </Link>

            <Link href="/captain/messages" className="match-row">
              <Bell size={18} className="text-[var(--ink-tertiary)]" />
              <div className="flex-1">
                <p className="font-medium">Announcements</p>
                <p className="type-meta">Send messages to players</p>
              </div>
              <ChevronLeft size={18} className="text-[var(--ink-tertiary)] rotate-180" />
            </Link>

            <div className="match-row opacity-60">
              <Lock size={18} className="text-[var(--ink-tertiary)]" />
              <div className="flex-1">
                <p className="font-medium">Lock Trip</p>
                <p className="type-meta">Prevent further changes</p>
              </div>
              <span className="type-micro text-[var(--ink-tertiary)]">Coming Soon</span>
            </div>
          </div>
        </section>
      </main>

      <BottomNav />
    </div>
  );
}
