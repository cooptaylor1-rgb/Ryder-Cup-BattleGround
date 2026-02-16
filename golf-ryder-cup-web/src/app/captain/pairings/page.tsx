'use client';

import { useRouter } from 'next/navigation';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { useTripStore, useUIStore } from '@/lib/stores';
import type { Match } from '@/lib/types/models';
import { EmptyStatePremium } from '@/components/ui/EmptyStatePremium';
import { BottomNav, PageHeader } from '@/components/layout';
import { PrintablePairings } from '@/components/captain/PrintablePairings';
import { Printer, Home, MoreHorizontal } from 'lucide-react';

/**
 * Captain Pairings Page
 *
 * Print-optimized view of match pairings. Loads all sessions
 * and their matches from Dexie DB and renders the PrintablePairings
 * component for captain use.
 */
export default function CaptainPairingsPage() {
  const router = useRouter();
  const { currentTrip, sessions, teams, players } = useTripStore();
  const { isCaptainMode } = useUIStore();

  // Load all matches for the current trip's sessions
  const sessionIds = sessions.map((s) => s.id);
  const matches = useLiveQuery(
    async (): Promise<Match[]> => {
      if (sessionIds.length === 0) return [];
      return db.matches.where('sessionId').anyOf(sessionIds).toArray();
    },
    [sessionIds.join(',')],
    [] as Match[]
  );

  if (!currentTrip) {
    return (
      <div className="min-h-screen pb-nav page-premium-enter texture-grain bg-[var(--canvas)]">
        <main className="container-editorial py-12">
          <EmptyStatePremium
            illustration="golf-ball"
            title="No active trip"
            description="Start or select a trip to view pairings."
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
            description="Turn on Captain Mode to view and print pairings."
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
        title="Print Pairings"
        subtitle="Match pairings sheet"
        icon={<Printer size={16} className="text-[var(--canvas)]" />}
        iconContainerStyle={{
          background: 'linear-gradient(135deg, var(--maroon) 0%, var(--maroon-dark) 100%)',
          boxShadow: '0 0 0 3px rgba(114, 47, 55, 0.12)',
        }}
        onBack={() => router.back()}
      />

      <main className="container-editorial section">
        <PrintablePairings
          sessions={sessions}
          matches={matches}
          players={players}
          teams={teams}
          tripName={currentTrip.name}
        />
      </main>

      <BottomNav />
    </div>
  );
}
