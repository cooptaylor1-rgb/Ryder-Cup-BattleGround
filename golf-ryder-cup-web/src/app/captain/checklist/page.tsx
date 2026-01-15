'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTripStore, useUIStore } from '@/lib/stores';
import { PreFlightChecklist } from '@/components/captain';
import {
  ChevronLeft,
  Shield,
  Users,
  Home,
  Target,
  Trophy,
  MoreHorizontal,
  CalendarDays,
  Rocket,
} from 'lucide-react';

/**
 * CAPTAIN PRE-FLIGHT CHECKLIST PAGE
 *
 * Comprehensive validation of trip setup before starting play.
 * Checks players, teams, sessions, courses, and more.
 */

export default function ChecklistPage() {
  const router = useRouter();
  const {
    currentTrip,
    players,
    teams,
    teamMembers,
    sessions,
    courses,
    teeSets,
  } = useTripStore();
  const { isCaptainMode, showToast } = useUIStore();

  // Redirect if not captain
  useEffect(() => {
    if (!currentTrip) {
      router.push('/');
      return;
    }
    if (!isCaptainMode) {
      router.push('/more');
    }
  }, [currentTrip, isCaptainMode, router]);

  // Get matches for validation (would need to aggregate from sessions)
  const matches: never[] = []; // In production, fetch from store

  // Handle all clear
  const handleAllClear = () => {
    showToast('success', 'All systems go! Ready to play.');
  };

  if (!currentTrip || !isCaptainMode) {
    return null;
  }

  return (
    <div className="min-h-screen pb-nav page-enter" style={{ background: 'var(--canvas)' }}>
      {/* Header */}
      <header className="header">
        <div className="container-editorial flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="p-2 -ml-2 press-scale"
              style={{ color: 'var(--ink-secondary)' }}
              aria-label="Back"
            >
              <ChevronLeft size={22} strokeWidth={1.75} />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <Shield size={16} style={{ color: 'var(--masters)' }} />
                <span className="type-overline">Pre-Flight Check</span>
              </div>
              <p className="type-caption truncate" style={{ marginTop: '2px' }}>
                Verify trip setup
              </p>
            </div>
          </div>

          <Rocket size={24} style={{ color: 'var(--masters)' }} />
        </div>
      </header>

      <main className="container-editorial">
        <section className="section">
          <PreFlightChecklist
            tripId={currentTrip.id}
            trip={currentTrip}
            players={players}
            teams={teams}
            teamMembers={teamMembers}
            sessions={sessions}
            matches={matches}
            courses={courses}
            teeSets={teeSets}
            onAllClear={handleAllClear}
          />
        </section>

        {/* Quick Actions */}
        <section className="section">
          <h2 className="type-overline" style={{ marginBottom: 'var(--space-4)' }}>
            Quick Fixes
          </h2>
          <div className="space-y-3">
            <Link
              href="/players"
              className="card flex items-center gap-4 press-scale"
              style={{ padding: 'var(--space-4)' }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: 'rgba(0, 103, 71, 0.1)' }}
              >
                <Users size={20} style={{ color: 'var(--masters)' }} />
              </div>
              <div className="flex-1">
                <p className="type-title-sm">Manage Players</p>
                <p className="type-micro">Add or edit player profiles</p>
              </div>
            </Link>

            <Link
              href="/captain"
              className="card flex items-center gap-4 press-scale"
              style={{ padding: 'var(--space-4)' }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: 'rgba(0, 103, 71, 0.1)' }}
              >
                <Shield size={20} style={{ color: 'var(--masters)' }} />
              </div>
              <div className="flex-1">
                <p className="type-title-sm">Captain Command</p>
                <p className="type-micro">Access all captain tools</p>
              </div>
            </Link>
          </div>
        </section>
      </main>

      {/* Bottom Navigation */}
      <nav className="bottom-nav">
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
