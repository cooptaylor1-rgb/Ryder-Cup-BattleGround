'use client';

// Note: this route is client-only; we intentionally avoid auto-redirects to show explicit empty states.
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTripStore, useUIStore } from '@/lib/stores';
import { EmptyStatePremium } from '@/components/ui/EmptyStatePremium';
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

  // Note: avoid auto-redirects so we can render explicit empty states.

  // Get matches for validation (would need to aggregate from sessions)
  const matches: never[] = []; // In production, fetch from store

  // Handle all clear
  const handleAllClear = () => {
    showToast('success', 'All systems go! Ready to play.');
  };

  if (!currentTrip) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--canvas)' }}>
        <div className="container-editorial section">
          <EmptyStatePremium
            illustration="golf-ball"
            title="No active trip"
            description="Start or select a trip to run the pre-flight checklist."
            action={{
              label: 'Go Home',
              onClick: () => router.push('/'),
              icon: <Home size={16} />,
            }}
          />
        </div>
      </div>
    );
  }

  if (!isCaptainMode) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--canvas)' }}>
        <div className="container-editorial section">
          <EmptyStatePremium
            illustration="trophy"
            title="Captain mode required"
            description="Turn on Captain Mode to access the checklist."
            action={{
              label: 'Open More',
              onClick: () => router.push('/more'),
              icon: <MoreHorizontal size={16} />,
            }}
            secondaryAction={{
              label: 'Go Home',
              onClick: () => router.push('/'),
            }}
          />
        </div>
      </div>
    );
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
                <Rocket size={16} style={{ color: 'var(--color-accent)' }} />
              </div>
              <div>
                <span className="type-overline" style={{ letterSpacing: '0.1em' }}>Pre-Flight Check</span>
                <p className="type-caption truncate" style={{ marginTop: '2px' }}>
                  Verify trip setup
                </p>
              </div>
            </div>
          </div>
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
