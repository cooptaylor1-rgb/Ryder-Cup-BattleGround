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
        icon={<Settings size={16} style={{ color: 'var(--color-accent)' }} />}
        rightSlot={
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="btn-premium"
            style={{
              padding: 'var(--space-2) var(--space-3)',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
              opacity: isSaving ? 0.6 : 1,
              cursor: isSaving ? 'not-allowed' : 'pointer',
            }}
          >
            <Save size={16} />
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        }
      />

      <main className="container-editorial">
        {/* Trip Details */}
        <section className="section">
          <h2 className="type-overline" style={{ marginBottom: 'var(--space-4)' }}>Trip Details</h2>

          <div className="space-y-4">
            <div>
              <label className="type-meta" style={{ display: 'block', marginBottom: 'var(--space-2)' }}>
                <Edit3 size={14} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
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
              <label className="type-meta" style={{ display: 'block', marginBottom: 'var(--space-2)' }}>
                <MapPin size={14} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
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
                <label className="type-meta" style={{ display: 'block', marginBottom: 'var(--space-2)' }}>
                  <Calendar size={14} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
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
                <label className="type-meta" style={{ display: 'block', marginBottom: 'var(--space-2)' }}>
                  <Calendar size={14} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
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
          <h2 className="type-overline" style={{ marginBottom: 'var(--space-4)' }}>Team Names</h2>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="type-meta" style={{ display: 'block', marginBottom: 'var(--space-2)' }}>
                  <Palette size={14} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle', color: 'var(--team-usa)' }} />
                  Team A
                </label>
                <input
                  type="text"
                  value={teamAName}
                  onChange={(e) => setTeamAName(e.target.value)}
                  className="input"
                  placeholder="e.g., Team USA"
                  style={{ borderColor: 'var(--team-usa)' }}
                />
              </div>
              <div>
                <label className="type-meta" style={{ display: 'block', marginBottom: 'var(--space-2)' }}>
                  <Palette size={14} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle', color: 'var(--team-europe)' }} />
                  Team B
                </label>
                <input
                  type="text"
                  value={teamBName}
                  onChange={(e) => setTeamBName(e.target.value)}
                  className="input"
                  placeholder="e.g., Team Europe"
                  style={{ borderColor: 'var(--team-europe)' }}
                />
              </div>
            </div>
            <p className="type-micro" style={{ color: 'var(--ink-tertiary)' }}>
              Customize your team names. Changes will appear throughout the app.
            </p>
          </div>
        </section>

        <hr className="divider" />

        {/* Captain Tools */}
        <section className="section">
          <h2 className="type-overline" style={{ marginBottom: 'var(--space-4)' }}>Captain Tools</h2>

          <div className="space-y-3">
            <Link href="/captain/checklist" className="match-row">
              <Shield size={18} style={{ color: 'var(--masters)' }} />
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: 500 }}>Pre-Flight Checklist</p>
                <p className="type-meta">Review trip readiness</p>
              </div>
              <ChevronLeft size={18} style={{ color: 'var(--ink-tertiary)', transform: 'rotate(180deg)' }} />
            </Link>

            <Link href="/captain/availability" className="match-row">
              <Users size={18} style={{ color: 'var(--masters)' }} />
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: 500 }}>Player Attendance</p>
                <p className="type-meta">Track arrivals</p>
              </div>
              <ChevronLeft size={18} style={{ color: 'var(--ink-tertiary)', transform: 'rotate(180deg)' }} />
            </Link>

            <Link href="/captain/messages" className="match-row">
              <Bell size={18} style={{ color: 'var(--ink-tertiary)' }} />
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: 500 }}>Announcements</p>
                <p className="type-meta">Send messages to players</p>
              </div>
              <ChevronLeft size={18} style={{ color: 'var(--ink-tertiary)', transform: 'rotate(180deg)' }} />
            </Link>

            <div className="match-row" style={{ opacity: 0.6 }}>
              <Lock size={18} style={{ color: 'var(--ink-tertiary)' }} />
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: 500 }}>Lock Trip</p>
                <p className="type-meta">Prevent further changes</p>
              </div>
              <span className="type-micro" style={{ color: 'var(--ink-tertiary)' }}>Coming Soon</span>
            </div>
          </div>
        </section>
      </main>

      <BottomNav />
    </div>
  );
}
