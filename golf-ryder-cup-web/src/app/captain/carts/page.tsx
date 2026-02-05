'use client';

// (no React hooks needed here)
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTripStore, useUIStore } from '@/lib/stores';
import { EmptyStatePremium } from '@/components/ui/EmptyStatePremium';
import { BottomNav } from '@/components/layout';
import { CartAssignmentManager, type CartPlayer } from '@/components/captain';
import {
  ChevronLeft,
  Car,
  Users,
  Home,
  Target,
  Trophy,
  MoreHorizontal,
  CalendarDays,
} from 'lucide-react';

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
      <div
        className="min-h-screen pb-nav page-premium-enter texture-grain"
        style={{ background: 'var(--canvas)' }}
      >
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
      <div
        className="min-h-screen pb-nav page-premium-enter texture-grain"
        style={{ background: 'var(--canvas)' }}
      >
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
                  background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 0 16px rgba(6, 182, 212, 0.3)',
                }}
              >
                <Car size={16} style={{ color: 'white' }} />
              </div>
              <div>
                <span className="type-overline" style={{ letterSpacing: '0.1em' }}>Cart Assignments</span>
                <p className="type-caption truncate" style={{ marginTop: '2px' }}>
                  Assign golf carts
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container-editorial">
        <section className="section">
          {cartPlayers.length === 0 ? (
            <div className="card text-center" style={{ padding: 'var(--space-8)' }}>
              <Car size={48} style={{ color: 'var(--ink-tertiary)', margin: '0 auto var(--space-4)' }} />
              <h2 className="type-title-sm" style={{ marginBottom: 'var(--space-2)' }}>
                No Players Added
              </h2>
              <p className="type-caption" style={{ marginBottom: 'var(--space-4)' }}>
                Add players to the trip first before assigning carts.
              </p>
              <Link href="/players" className="btn btn-primary">
                Add Players
              </Link>
            </div>
          ) : (
            <div className="card" style={{ padding: 'var(--space-5)' }}>
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
