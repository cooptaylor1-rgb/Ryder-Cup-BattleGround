'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTripStore, useUIStore } from '@/lib/stores';
import {
  ChevronLeft,
  Settings,
  Users,
  Home,
  Target,
  Trophy,
  MoreHorizontal,
  CalendarDays,
  Edit3,
  Calendar,
  MapPin,
  Shield,
  Bell,
  Lock,
  Save,
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

  useEffect(() => {
    if (!currentTrip) {
      router.push('/');
      return;
    }
    if (!isCaptainMode) {
      router.push('/more');
    }
  }, [currentTrip, isCaptainMode, router]);

  useEffect(() => {
    if (currentTrip) {
      setTripName(currentTrip.name);
      setStartDate(currentTrip.startDate);
      setEndDate(currentTrip.endDate);
      setLocation(currentTrip.location || '');
    }
  }, [currentTrip]);

  const handleSave = async () => {
    if (!currentTrip) return;

    await updateTrip(currentTrip.id, {
      name: tripName,
      startDate,
      endDate,
      location,
    });

    showToast('success', 'Trip settings saved');
  };

  if (!currentTrip || !isCaptainMode) {
    return null;
  }

  return (
    <div className="min-h-screen pb-nav page-premium-enter texture-grain" style={{ background: 'var(--canvas)' }}>
      {/* Premium Header */}
      <header className="header-premium">
        <div className="container-editorial flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="p-2 -ml-2 press-scale"
              style={{ color: 'var(--ink-secondary)', background: 'transparent', border: 'none', cursor: 'pointer' }}
              aria-label="Back"
            >
              <ChevronLeft size={22} strokeWidth={1.75} />
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: 'var(--radius-md)',
                  background: 'linear-gradient(135deg, var(--masters) 0%, var(--masters-deep) 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: 'var(--shadow-glow-green)',
                }}
              >
                <Settings size={16} style={{ color: 'var(--color-accent)' }} />
              </div>
              <div>
                <span className="type-overline" style={{ letterSpacing: '0.1em' }}>Trip Settings</span>
                <p className="type-caption truncate" style={{ marginTop: '2px' }}>
                  Configure trip details
                </p>
              </div>
            </div>
          </div>
          <button
            onClick={handleSave}
            className="btn-premium"
            style={{ padding: 'var(--space-2) var(--space-3)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}
          >
            <Save size={16} />
            Save
          </button>
        </div>
      </header>

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

      {/* Bottom Navigation */}
      <nav className="nav-premium bottom-nav">
        <Link href="/" className="nav-item">
          <Home size={22} strokeWidth={1.75} />
          <span>Home</span>
        </Link>
        <Link href="/schedule" className="nav-item">
          <CalendarDays size={22} strokeWidth={1.75} />
          <span>Schedule</span>
        </Link>
        <Link href="/score" className="nav-item">
          <Target size={22} strokeWidth={1.75} />
          <span>Score</span>
        </Link>
        <Link href="/matchups" className="nav-item">
          <Users size={22} strokeWidth={1.75} />
          <span>Matches</span>
        </Link>
        <Link href="/standings" className="nav-item">
          <Trophy size={22} strokeWidth={1.75} />
          <span>Standings</span>
        </Link>
        <Link href="/more" className="nav-item">
          <MoreHorizontal size={22} strokeWidth={1.75} />
          <span>More</span>
        </Link>
      </nav>
    </div>
  );
}
