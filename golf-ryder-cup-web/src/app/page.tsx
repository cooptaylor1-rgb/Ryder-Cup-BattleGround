'use client';

import { useRouter } from 'next/navigation';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { useTripStore } from '@/lib/stores';
import { ChevronRight, MapPin, Calendar, Plus } from 'lucide-react';
import { formatDate } from '@/lib/utils';

/**
 * HOME PAGE - Masters Tournament Inspired
 *
 * Design Philosophy:
 * - Editorial layout, not a dashboard
 * - Hierarchy above all: What is happening now? What matters most?
 * - Typography carries the design
 * - Calm, confident, quiet
 *
 * IA Note: Developer tools (Load Demo, Clear Data) exist in More > Data.
 * Removed from Home to reduce clutter and prevent accidental data loss.
 */
export default function HomePage() {
  const router = useRouter();
  const { loadTrip } = useTripStore();

  const trips = useLiveQuery(
    () => db.trips.orderBy('startDate').reverse().toArray(),
    []
  );

  const handleSelectTrip = async (tripId: string) => {
    await loadTrip(tripId);
    router.push('/standings');
  };

  const handleCreateTrip = () => router.push('/trip/new');

  const hasTrips = trips && trips.length > 0;
  const activeTrip = trips?.find(t => {
    const now = new Date();
    const start = new Date(t.startDate);
    const end = new Date(t.endDate);
    return now >= start && now <= end;
  });

  return (
    <div className="min-h-screen" style={{ background: 'var(--surface-base)' }}>
      {/* Header - Minimal, confident */}
      <header className="px-5 pt-6 pb-4 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
        <div className="max-w-lg mx-auto">
          <h1
            className="font-display text-2xl"
            style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}
          >
            Ryder Cup Tracker
          </h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-5 py-6 max-w-lg mx-auto pb-24">

        {/* Active Tournament - Hero treatment if exists */}
        {activeTrip && (
          <section className="mb-8">
            <button
              onClick={() => handleSelectTrip(activeTrip.id)}
              className="w-full text-left p-5 rounded-lg transition-colors"
              style={{
                background: 'var(--surface-card)',
                border: '1px solid var(--masters-gold)',
                boxShadow: '0 0 0 1px rgba(201, 162, 39, 0.15)'
              }}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-overline mb-2" style={{ color: 'var(--masters-gold)' }}>
                    Active Tournament
                  </p>
                  <h2
                    className="font-display text-xl"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {activeTrip.name}
                  </h2>
                </div>
                <ChevronRight
                  className="mt-1 opacity-60"
                  style={{ color: 'var(--masters-gold)', width: 20, height: 20 }}
                />
              </div>

              <div className="flex items-center gap-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
                {activeTrip.location && (
                  <span className="flex items-center gap-1.5">
                    <MapPin style={{ width: 14, height: 14 }} />
                    {activeTrip.location}
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <Calendar style={{ width: 14, height: 14 }} />
                  {formatDate(activeTrip.startDate, 'short')}
                </span>
              </div>
            </button>
          </section>
        )}

        {/* Tournaments List */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h3
              className="text-section"
              style={{ color: 'var(--text-secondary)' }}
            >
              {hasTrips ? 'Your Tournaments' : 'Get Started'}
            </h3>
            {hasTrips && (
              <button
                onClick={handleCreateTrip}
                className="flex items-center gap-1.5 text-sm font-medium transition-colors"
                style={{ color: 'var(--masters-green)' }}
              >
                <Plus style={{ width: 16, height: 16 }} />
                New
              </button>
            )}
          </div>

          {hasTrips ? (
            <div className="space-y-2">
              {trips
                .filter(t => t.id !== activeTrip?.id)
                .map((trip) => (
                  <button
                    key={trip.id}
                    onClick={() => handleSelectTrip(trip.id)}
                    className="w-full text-left px-4 py-3.5 rounded-lg flex items-center justify-between group transition-colors"
                    style={{
                      background: 'var(--surface-raised)',
                      border: '1px solid var(--border-subtle)'
                    }}
                  >
                    <div className="min-w-0 flex-1">
                      <p
                        className="font-medium truncate"
                        style={{ color: 'var(--text-primary)', fontSize: '15px' }}
                      >
                        {trip.name}
                      </p>
                      <div className="flex items-center gap-3 mt-1 text-sm" style={{ color: 'var(--text-tertiary)' }}>
                        {trip.location && (
                          <span className="flex items-center gap-1 truncate">
                            <MapPin style={{ width: 12, height: 12, flexShrink: 0 }} />
                            <span className="truncate">{trip.location}</span>
                          </span>
                        )}
                        <span>{formatDate(trip.startDate, 'short')}</span>
                      </div>
                    </div>
                    <ChevronRight
                      className="ml-3 opacity-40 group-hover:opacity-70 transition-opacity"
                      style={{ color: 'var(--text-tertiary)', width: 18, height: 18 }}
                    />
                  </button>
                ))}
            </div>
          ) : (
            /* Empty State - Intentional, not unfinished */
            <div
              className="text-center py-12 px-6 rounded-lg"
              style={{
                background: 'var(--surface-raised)',
                border: '1px solid var(--border-subtle)'
              }}
            >
              <p
                className="font-display text-lg mb-2"
                style={{ color: 'var(--text-primary)' }}
              >
                No tournaments yet
              </p>
              <p
                className="text-sm mb-6"
                style={{ color: 'var(--text-tertiary)' }}
              >
                Create a tournament to track matches and standings
              </p>
              <button
                onClick={handleCreateTrip}
                className="btn btn-primary"
              >
                <Plus style={{ width: 18, height: 18 }} />
                Create Tournament
              </button>
            </div>
          )}
        </section>
      </main>

      {/* Bottom Navigation - Simple, functional */}
      <nav
        className="fixed bottom-0 left-0 right-0 h-16 flex items-center justify-around px-4 safe-bottom"
        style={{
          background: 'var(--surface-base)',
          borderTop: '1px solid var(--border-subtle)'
        }}
      >
        {[
          { label: 'Home', path: '/', active: true },
          { label: 'Score', path: '/score', active: false },
          { label: 'Matches', path: '/matchups', active: false },
          { label: 'Standings', path: '/standings', active: false },
          { label: 'More', path: '/more', active: false },
        ].map((item) => (
          <button
            key={item.label}
            onClick={() => router.push(item.path)}
            className="flex flex-col items-center gap-1 py-2 px-3 min-w-[56px]"
          >
            <div
              className="w-5 h-5 rounded"
              style={{
                background: item.active ? 'var(--masters-green)' : 'var(--surface-elevated)'
              }}
            />
            <span
              className="text-xs font-medium"
              style={{
                color: item.active ? 'var(--masters-green)' : 'var(--text-disabled)'
              }}
            >
              {item.label}
            </span>
          </button>
        ))}
      </nav>
    </div>
  );
}
