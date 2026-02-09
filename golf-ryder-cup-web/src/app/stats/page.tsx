'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTripStore } from '@/lib/stores';
import { Award, BarChart3, CalendarDays } from 'lucide-react';
import { PageHeader, BottomNav } from '@/components/layout';
import { EmptyStatePremium } from '@/components/ui';

/**
 * STATS HUB
 *
 * A simple, discoverable landing page for statistics-related features.
 *
 * Why: Phase 1 nav spine moved Stats out of the bottom tabs; this preserves
 * discoverability via Today CTAs + More.
 */
export default function StatsPage() {
  const router = useRouter();
  const { currentTrip } = useTripStore();

  return (
    <div className="min-h-screen pb-nav page-premium-enter texture-grain bg-[var(--canvas)]">
      <PageHeader
        title="Stats"
        subtitle={currentTrip?.name ? currentTrip.name : 'No active trip'}
        icon={<BarChart3 size={16} style={{ color: 'var(--color-accent)' }} />}
        onBack={() => router.back()}
      />

      <main className="container-editorial">
        <section className="section">
          <h1 className="type-display">Stats</h1>
          <p className="type-caption" style={{ marginTop: 'var(--space-2)' }}>
            Player awards, trip tallies, and leaderboard context.
          </p>
        </section>

        <hr className="divider" />

        {!currentTrip ? (
          <section className="section-sm">
            <EmptyStatePremium
              illustration="podium"
              title="No active trip"
              description="Start or join a trip to view stats."
              action={{
                label: 'Back to Home',
                onClick: () => router.push('/'),
              }}
              variant="large"
            />
          </section>
        ) : (
          <section className="section-sm">
            <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(1, 1fr)' }}>
              <Link
                href="/trip-stats"
                className="card press-scale"
                style={{ padding: 'var(--space-5)', textDecoration: 'none' }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ background: 'rgba(var(--masters-rgb), 0.12)', color: 'var(--masters)' }}
                    >
                      <BarChart3 size={18} />
                    </div>
                    <div>
                      <p className="type-title-sm">Trip Stats</p>
                      <p className="type-caption">Beers, mulligans, balls lost, and more</p>
                    </div>
                  </div>
                </div>
              </Link>

              <Link
                href="/achievements"
                className="card press-scale"
                style={{ padding: 'var(--space-5)', textDecoration: 'none' }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ background: 'rgba(212, 175, 55, 0.12)', color: 'var(--warning)' }}
                    >
                      <Award size={18} />
                    </div>
                    <div>
                      <p className="type-title-sm">Achievements</p>
                      <p className="type-caption">Badges & milestones</p>
                    </div>
                  </div>
                </div>
              </Link>

              <Link
                href="/schedule"
                className="card press-scale"
                style={{ padding: 'var(--space-5)', textDecoration: 'none' }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ background: 'rgba(59, 130, 246, 0.12)', color: '#3b82f6' }}
                    >
                      <CalendarDays size={18} />
                    </div>
                    <div>
                      <p className="type-title-sm">Schedule</p>
                      <p className="type-caption">Sessions & tee times</p>
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          </section>
        )}
      </main>
      <BottomNav />
    </div>
  );
}
