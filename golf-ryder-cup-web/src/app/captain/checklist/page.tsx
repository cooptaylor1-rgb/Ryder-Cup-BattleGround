'use client';

// Note: this route is client-only; we intentionally avoid auto-redirects to show explicit empty states.
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Home, MoreHorizontal, Rocket, Shield, Users } from 'lucide-react';

import { PreFlightChecklist } from '@/components/captain';
import { BottomNav, PageHeader } from '@/components/layout';
import { EmptyStatePremium } from '@/components/ui/EmptyStatePremium';
import { useTripStore, useUIStore } from '@/lib/stores';

/**
 * CAPTAIN PRE-FLIGHT CHECKLIST PAGE
 *
 * Comprehensive validation of trip setup before starting play.
 * Checks players, teams, sessions, courses, and more.
 */

export default function ChecklistPage() {
  const router = useRouter();
  const { currentTrip, players, teams, teamMembers, sessions, courses, teeSets } = useTripStore();
  const { isCaptainMode, showToast } = useUIStore();

  // Note: avoid auto-redirects so we can render explicit empty states.

  // Get matches for validation (would need to aggregate from sessions)
  const matches: never[] = []; // In production, fetch from store

  const handleAllClear = () => {
    showToast('success', 'All systems go! Ready to play.');
  };

  if (!currentTrip) {
    return (
      <div className="min-h-screen pb-nav page-premium-enter texture-grain bg-[var(--canvas)]">
        <main className="container-editorial py-12">
          <EmptyStatePremium
            illustration="golf-ball"
            title="No active trip"
            description="Start or select a trip to run the pre-flight checklist."
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
        title="Pre-Flight Check"
        subtitle="Verify trip setup"
        onBack={() => router.back()}
        icon={<Rocket size={16} className="text-[var(--color-accent)]" />}
      />

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

        <section className="section">
          <h2 className="type-overline mb-[var(--space-4)]">Quick Fixes</h2>

          <div className="space-y-3">
            <Link href="/players" className="card flex items-center gap-4 press-scale p-[var(--space-4)]">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[rgba(0,103,71,0.1)]">
                <Users size={20} className="text-[var(--masters)]" />
              </div>
              <div className="flex-1">
                <p className="type-title-sm">Manage Players</p>
                <p className="type-micro">Add or edit player profiles</p>
              </div>
            </Link>

            <Link href="/captain" className="card flex items-center gap-4 press-scale p-[var(--space-4)]">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[rgba(0,103,71,0.1)]">
                <Shield size={20} className="text-[var(--masters)]" />
              </div>
              <div className="flex-1">
                <p className="type-title-sm">Captain Command</p>
                <p className="type-micro">Access all captain tools</p>
              </div>
            </Link>
          </div>
        </section>
      </main>

      <BottomNav />
    </div>
  );
}
