'use client';

// (no React hooks needed here)
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTripStore, useUIStore } from '@/lib/stores';
import { EmptyStatePremium } from '@/components/ui/EmptyStatePremium';
import { BottomNav } from '@/components/layout';
import { PageHeader } from '@/components/layout/PageHeader';
import { CartAssignmentManager, type CartPlayer } from '@/components/captain';
import { Car, Home, MoreHorizontal } from 'lucide-react';

/**
 * CART ASSIGNMENTS PAGE
 *
 * Assign golf carts to players for each session.
 */

export default function CartsPage() {
  const router = useRouter();
  const { currentTrip, players, teams, teamMembers } = useTripStore();
  const { isCaptainMode, showToast } = useUIStore();

  // Note: we avoid auto-redirects here so we can render a clear empty-state instead.

  if (!currentTrip) {
    return (
      <div className="min-h-screen pb-nav page-premium-enter texture-grain bg-[var(--canvas)]">
        <main className="container-editorial py-12">
          <EmptyStatePremium
            illustration="golf-ball"
            title="No active trip"
            description="Start or select a trip to manage cart assignments."
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
            description="Turn on Captain Mode to access Cart Assignments."
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

  // Convert players to CartPlayer format with required teamId
  const cartPlayers: CartPlayer[] = players.map(p => {
    const membership = teamMembers.find(tm => tm.playerId === p.id);
    const team = membership ? teams.find(t => t.id === membership.teamId) : undefined;
    // Default to team A if no team assigned
    const teamId: 'A' | 'B' = team?.name?.toLowerCase().includes('europe') ||
      team?.name?.toLowerCase().includes('eur') ||
      team?.name === 'B' ? 'B' : 'A';

    return {
      id: p.id,
      firstName: p.firstName,
      lastName: p.lastName,
      teamId,
    };
  });

  // Get team names
  const teamA = teams.find(t => t.name?.toLowerCase().includes('usa') || t.name === 'A');
  const teamB = teams.find(t => t.name?.toLowerCase().includes('europe') || t.name?.toLowerCase().includes('eur') || t.name === 'B');

  return (
    <div className="min-h-screen pb-nav page-premium-enter texture-grain bg-[var(--canvas)]">
      <PageHeader
        title="Cart Assignments"
        subtitle="Assign golf carts"
        icon={<Car size={16} className="text-[var(--canvas)]" />}
        iconContainerClassName="bg-gradient-to-br from-cyan-500 to-cyan-600 shadow-[0_0_16px_rgba(6,182,212,0.3)]"
        onBack={() => router.back()}
      />

      <main className="container-editorial">
        <section className="section">
          {cartPlayers.length === 0 ? (
            <div className="card text-center p-[var(--space-8)]">
              <Car size={48} className="mx-auto mb-[var(--space-4)] text-[var(--ink-tertiary)]" />
              <h2 className="type-title-sm mb-[var(--space-2)]">No Players Added</h2>
              <p className="type-caption mb-[var(--space-4)]">
                Add players to the trip first before assigning carts.
              </p>
              <Link href="/players" className="btn btn-primary">
                Add Players
              </Link>
            </div>
          ) : (
            <div className="card p-[var(--space-5)]">
              <CartAssignmentManager
                players={cartPlayers}
                teamAName={teamA?.name || 'USA'}
                teamBName={teamB?.name || 'Europe'}
                onAssignmentsChange={() => {
                  // Cart assignments saved
                  showToast('success', 'Cart assignments updated');
                }}
              />
            </div>
          )}
        </section>
      </main>

      <BottomNav />
    </div>
  );
}
