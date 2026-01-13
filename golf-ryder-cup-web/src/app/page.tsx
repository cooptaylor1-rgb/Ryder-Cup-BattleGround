'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { useTripStore } from '@/lib/stores';
import { ChevronRight, MapPin, Calendar, Plus, Home, Target, Users, Trophy, MoreHorizontal } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { useEffect, useState } from 'react';
import { calculateTeamStandings } from '@/lib/services/tournamentEngine';
import type { TeamStandings } from '@/lib/types/computed';

/**
 * HOME PAGE - Editorial Front Page
 *
 * Structure:
 * 1. Lead - Active tournament with live score
 * 2. Next - What's happening next
 * 3. Archive - Past tournaments (quiet)
 */
export default function HomePage() {
  const router = useRouter();
  const { loadTrip } = useTripStore();
  const [standings, setStandings] = useState<TeamStandings | null>(null);

  const trips = useLiveQuery(
    () => db.trips.orderBy('startDate').reverse().toArray(),
    []
  );

  // Find active trip
  const activeTrip = trips?.find(t => {
    const now = new Date();
    const start = new Date(t.startDate);
    const end = new Date(t.endDate);
    return now >= start && now <= end;
  });

  // Load standings for active trip
  useEffect(() => {
    if (activeTrip) {
      loadTrip(activeTrip.id);
      calculateTeamStandings(activeTrip.id).then(setStandings);
    }
  }, [activeTrip, loadTrip]);

  const handleSelectTrip = async (tripId: string) => {
    await loadTrip(tripId);
    router.push('/standings');
  };

  const hasTrips = trips && trips.length > 0;
  const pastTrips = trips?.filter(t => t.id !== activeTrip?.id) || [];

  return (
    <div className="min-h-screen pb-nav" style={{ background: 'var(--canvas)' }}>
      {/* Minimal Header */}
      <header className="header">
        <div className="container-editorial">
          <span className="type-overline">Ryder Cup Tracker</span>
        </div>
      </header>

      <main className="container-editorial">
        {/* LEAD - Active Tournament */}
        {activeTrip && standings ? (
          <section className="section" style={{ paddingTop: 'var(--space-6)' }}>
            <button
              onClick={() => handleSelectTrip(activeTrip.id)}
              className="w-full text-left"
            >
              <p className="type-overline" style={{ color: 'var(--masters)', marginBottom: 'var(--space-2)' }}>
                Live
              </p>
              <h1 className="type-headline" style={{ marginBottom: 'var(--space-4)' }}>
                {activeTrip.name}
              </h1>

              {/* Score Hero */}
              <div className="flex items-baseline justify-center gap-8" style={{ margin: 'var(--space-8) 0' }}>
                <div className="text-center">
                  <p className="score-hero" style={{ color: standings.teamAPoints >= standings.teamBPoints ? 'var(--team-usa)' : 'var(--ink)' }}>
                    {standings.teamAPoints}
                  </p>
                  <p className="type-meta" style={{ marginTop: 'var(--space-2)' }}>USA</p>
                </div>
                <span className="type-meta" style={{ alignSelf: 'center' }}>–</span>
                <div className="text-center">
                  <p className="score-hero" style={{ color: standings.teamBPoints > standings.teamAPoints ? 'var(--team-europe)' : 'var(--ink)' }}>
                    {standings.teamBPoints}
                  </p>
                  <p className="type-meta" style={{ marginTop: 'var(--space-2)' }}>EUR</p>
                </div>
              </div>

              {/* Context */}
              <div className="flex items-center justify-center gap-4 type-meta">
                {activeTrip.location && (
                  <span className="flex items-center gap-1">
                    <MapPin size={14} />
                    {activeTrip.location}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Calendar size={14} />
                  {formatDate(activeTrip.startDate, 'short')}
                </span>
              </div>

              {/* CTA */}
              <div
                className="flex items-center justify-center gap-2 type-meta"
                style={{ marginTop: 'var(--space-6)', color: 'var(--masters)' }}
              >
                <span>View standings</span>
                <ChevronRight size={16} />
              </div>
            </button>
          </section>
        ) : activeTrip ? (
          /* Active trip but no standings yet */
          <section className="section" style={{ paddingTop: 'var(--space-6)' }}>
            <button
              onClick={() => handleSelectTrip(activeTrip.id)}
              className="w-full text-left"
            >
              <p className="type-overline" style={{ color: 'var(--masters)', marginBottom: 'var(--space-2)' }}>
                Active Tournament
              </p>
              <h1 className="type-headline" style={{ marginBottom: 'var(--space-4)' }}>
                {activeTrip.name}
              </h1>
              <div className="flex items-center gap-4 type-meta">
                {activeTrip.location && (
                  <span className="flex items-center gap-1">
                    <MapPin size={14} />
                    {activeTrip.location}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Calendar size={14} />
                  {formatDate(activeTrip.startDate, 'short')}
                </span>
              </div>
              <div
                className="flex items-center gap-2 type-meta"
                style={{ marginTop: 'var(--space-4)', color: 'var(--masters)' }}
              >
                <span>Continue</span>
                <ChevronRight size={16} />
              </div>
            </button>
          </section>
        ) : null}

        {activeTrip && <hr className="divider" />}

        {/* ARCHIVE - Past Tournaments */}
        <section className="section">
          <div className="flex items-center justify-between" style={{ marginBottom: 'var(--space-4)' }}>
            <h2 className="type-overline">
              {hasTrips ? 'Tournaments' : 'Get Started'}
            </h2>
            {hasTrips && (
              <Link
                href="/trip/new"
                className="flex items-center gap-1 type-meta"
                style={{ color: 'var(--masters)' }}
              >
                <Plus size={14} />
                New
              </Link>
            )}
          </div>

          {pastTrips.length > 0 ? (
            <div>
              {pastTrips.map((trip) => (
                <button
                  key={trip.id}
                  onClick={() => handleSelectTrip(trip.id)}
                  className="match-row w-full text-left"
                >
                  <div className="flex-1 min-w-0">
                    <p style={{ fontWeight: 500, marginBottom: 'var(--space-1)' }}>
                      {trip.name}
                    </p>
                    <div className="flex items-center gap-3 type-meta">
                      {trip.location && (
                        <span className="flex items-center gap-1 truncate">
                          <MapPin size={12} />
                          <span className="truncate">{trip.location}</span>
                        </span>
                      )}
                      <span>{formatDate(trip.startDate, 'short')}</span>
                    </div>
                  </div>
                  <ChevronRight size={18} style={{ color: 'var(--ink-tertiary)', marginLeft: 'var(--space-3)' }} />
                </button>
              ))}
            </div>
          ) : !activeTrip ? (
            /* Empty state */
            <div className="empty-state">
              <p className="empty-state-title">No tournaments yet</p>
              <p className="empty-state-text">
                Create a tournament to start tracking matches
              </p>
              <Link href="/trip/new" className="btn btn-primary">
                <Plus size={18} />
                Create Tournament
              </Link>
            </div>
          ) : null}
        </section>
      </main>

      {/* Bottom Navigation */}
      <nav className="bottom-nav">
        <Link href="/" className="nav-item nav-item-active">
          <Home size={20} />
          <span>Home</span>
        </Link>
        <Link href="/score" className="nav-item">
          <Target size={20} />
          <span>Score</span>
        </Link>
        <Link href="/matchups" className="nav-item">
          <Users size={20} />
          <span>Matches</span>
        </Link>
        <Link href="/standings" className="nav-item">
          <Trophy size={20} />
          <span>Standings</span>
        </Link>
        <Link href="/more" className="nav-item">
          <MoreHorizontal size={20} />
          <span>More</span>
        </Link>
      </nav>
    </div>
  );
}
