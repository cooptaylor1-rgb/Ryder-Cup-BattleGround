'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { useTripStore } from '@/lib/stores';
import {
  ChevronRight,
  MapPin,
  Calendar,
  Plus,
  Home,
  Target,
  Users,
  Trophy,
  MoreHorizontal,
  Cloud,
  MessageCircle,
  Camera,
  Award,
  Flame,
  Tv,
  Zap,
  TrendingUp,
  Sparkles,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { useEffect, useState, useCallback } from 'react';
import { calculateTeamStandings } from '@/lib/services/tournamentEngine';
import type { TeamStandings } from '@/lib/types/computed';
import {
  NoTournamentsEmpty,
  LiveMatchBanner,
  WhatsNew,
  QuickStartWizard,
  FeatureCard,
} from '@/components/ui';
import { BottomNav, type NavBadges } from '@/components/layout';
import { WeatherWidget } from '@/components/course';

/**
 * HOME PAGE — The Ultimate Golf Trip Dashboard
 *
 * Design Philosophy:
 * - Tournament names in warm serif
 * - Scores are monumental, owning the screen
 * - Quick access to all features
 * - Live activity and social features at your fingertips
 */
export default function HomePage() {
  const router = useRouter();
  const { loadTrip, currentTrip } = useTripStore();
  const [standings, setStandings] = useState<TeamStandings | null>(null);
  const [showQuickStart, setShowQuickStart] = useState(false);
  const [showWhatsNew, setShowWhatsNew] = useState(false);
  const [dismissedFeatureCard, setDismissedFeatureCard] = useState(false);

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
  }) || currentTrip;

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

  const handleQuickStartComplete = useCallback(async (tripData: {
    name: string;
    location: string;
    startDate: string;
    endDate: string;
    teamAName: string;
    teamBName: string;
  }) => {
    // Create the trip using db
    const tripId = crypto.randomUUID();
    const now = new Date().toISOString();

    // Store team names in the notes field for now (can be extracted later)
    const teamNotes = tripData.teamAName !== 'USA' || tripData.teamBName !== 'Europe'
      ? `Teams: ${tripData.teamAName} vs ${tripData.teamBName}`
      : undefined;

    await db.trips.add({
      id: tripId,
      name: tripData.name,
      location: tripData.location || undefined,
      startDate: tripData.startDate,
      endDate: tripData.endDate,
      notes: teamNotes,
      isCaptainModeEnabled: false,
      createdAt: now,
      updatedAt: now,
    });
    setShowQuickStart(false);
    await loadTrip(tripId);
    router.push('/players');
  }, [loadTrip, router]);

  const hasTrips = trips && trips.length > 0;
  const pastTrips = trips?.filter(t => t.id !== activeTrip?.id) || [];

  // Mock data for demo - replace with real data
  const liveMatchesCount = 3;
  const recentPhotosCount = 12;
  const unreadMessages = 5;

  // Navigation badges
  const navBadges: NavBadges = {
    score: liveMatchesCount > 0 ? liveMatchesCount : undefined,
  };

  return (
    <div className="min-h-screen pb-nav page-enter" style={{ background: 'var(--canvas)' }}>
      {/* Quick Start Wizard Modal */}
      {showQuickStart && (
        <QuickStartWizard
          onComplete={handleQuickStartComplete}
          onCancel={() => setShowQuickStart(false)}
        />
      )}

      {/* What's New Modal (auto-shows for returning users) */}
      <WhatsNew onDismiss={() => setShowWhatsNew(false)} />

      {/* Minimal Header */}
      <header className="header">
        <div className="container-editorial flex items-center justify-between">
          <span className="type-overline">Ryder Cup Tracker</span>
          {hasTrips && (
            <button
              onClick={() => setShowWhatsNew(true)}
              className="p-2 -mr-2 rounded-lg transition-colors"
              style={{ color: 'var(--masters)' }}
              aria-label="What's new"
            >
              <Sparkles className="w-5 h-5" />
            </button>
          )}
        </div>
      </header>

      <main className="container-editorial">
        {/* LIVE MATCH BANNER — Top priority when matches are happening */}
        {activeTrip && liveMatchesCount > 0 && (
          <section className="section-sm">
            <LiveMatchBanner
              matchCount={liveMatchesCount}
              currentHole={7}
              closestMatch={{
                teamA: 'Smith & Jones',
                teamB: 'Brown & Wilson',
                score: '2 UP',
              }}
            />
          </section>
        )}

        {/* Feature Discovery Card (for new users or after updates) */}
        {hasTrips && !dismissedFeatureCard && !activeTrip && (
          <section className="section-sm">
            <FeatureCard
              icon={<Tv className="w-5 h-5" />}
              title="Try Live Jumbotron"
              description="Watch live scoring on a big screen - perfect for the clubhouse!"
              action={{
                label: 'Learn more',
                onClick: () => router.push('/live'),
              }}
              onDismiss={() => setDismissedFeatureCard(true)}
            />
          </section>
        )}

        {/* LEAD — Active Tournament with Live Score */}
        {activeTrip && standings ? (
          <>
            <section className="section">
              <button
                onClick={() => handleSelectTrip(activeTrip.id)}
                className="w-full text-left press-scale card-interactive"
                style={{ background: 'transparent', border: 'none', borderRadius: 'var(--radius-xl)', padding: 'var(--space-4)', margin: 'calc(-1 * var(--space-4))' }}
              >
                {/* Live Badge */}
                <div className="live-indicator" style={{ marginBottom: 'var(--space-4)' }}>
                  Live
                </div>

                {/* Tournament Name — Warm Serif */}
                <h1 className="type-display" style={{ marginBottom: 'var(--space-8)' }}>
                  {activeTrip.name}
                </h1>

                {/* Score Hero — Team Identity Blocks */}
                <div className="score-vs">
                  {/* Team USA Block */}
                  <div
                    className={`score-vs-team score-vs-usa ${standings.teamAPoints >= standings.teamBPoints ? 'leading' : ''}`}
                  >
                    <span
                      className={`team-dot team-dot-lg team-dot-usa ${standings.leader !== null ? 'team-dot-pulse' : ''}`}
                      style={{ display: 'inline-block', marginBottom: 'var(--space-3)' }}
                    />
                    <p
                      className="score-monumental"
                      style={{
                        color: standings.teamAPoints >= standings.teamBPoints
                          ? 'var(--team-usa)'
                          : 'var(--ink-tertiary)'
                      }}
                    >
                      {standings.teamAPoints}
                    </p>
                    <p
                      className="type-overline"
                      style={{
                        marginTop: 'var(--space-3)',
                        color: 'var(--team-usa)'
                      }}
                    >
                      USA
                    </p>
                  </div>

                  {/* Separator */}
                  <div className="score-vs-divider">–</div>

                  {/* Team Europe Block */}
                  <div
                    className={`score-vs-team score-vs-europe ${standings.teamBPoints > standings.teamAPoints ? 'leading' : ''}`}
                  >
                    <span
                      className={`team-dot team-dot-lg team-dot-europe ${standings.leader !== null ? 'team-dot-pulse' : ''}`}
                      style={{ display: 'inline-block', marginBottom: 'var(--space-3)' }}
                    />
                    <p
                      className="score-monumental"
                      style={{
                        color: standings.teamBPoints > standings.teamAPoints
                          ? 'var(--team-europe)'
                          : 'var(--ink-tertiary)'
                      }}
                    >
                      {standings.teamBPoints}
                    </p>
                    <p
                      className="type-overline"
                      style={{
                        marginTop: 'var(--space-3)',
                        color: 'var(--team-europe)'
                      }}
                    >
                      EUR
                    </p>
                  </div>
                </div>

                {/* Context — Location & Date */}
                <div
                  className="flex items-center justify-center gap-6 type-caption"
                  style={{ marginTop: 'var(--space-6)' }}
                >
                  {activeTrip.location && (
                    <span className="flex items-center gap-2">
                      <MapPin size={14} strokeWidth={1.5} />
                      {activeTrip.location}
                    </span>
                  )}
                  <span className="flex items-center gap-2">
                    <Calendar size={14} strokeWidth={1.5} />
                    {formatDate(activeTrip.startDate, 'short')}
                  </span>
                </div>

                {/* Call to Action */}
                <div
                  className="flex items-center justify-center gap-2"
                  style={{
                    marginTop: 'var(--space-10)',
                    color: 'var(--masters)',
                    fontWeight: 500
                  }}
                >
                  <span>View standings</span>
                  <ChevronRight size={18} strokeWidth={2} />
                </div>
              </button>
            </section>

            {/* Quick Actions Grid */}
            <section className="section-sm">
              <h2 className="type-overline" style={{ marginBottom: 'var(--space-4)' }}>
                Quick Actions
              </h2>
              <div className="grid grid-cols-4 gap-3">
                <QuickActionButton
                  icon={<Tv size={20} />}
                  label="Live"
                  href="/live"
                  badge={liveMatchesCount > 0 ? String(liveMatchesCount) : undefined}
                  color="var(--error)"
                />
                <QuickActionButton
                  icon={<MessageCircle size={20} />}
                  label="Chat"
                  href="/social"
                  badge={unreadMessages > 0 ? String(unreadMessages) : undefined}
                  color="var(--team-usa)"
                />
                <QuickActionButton
                  icon={<Camera size={20} />}
                  label="Photos"
                  href="/social/photos"
                  badge={recentPhotosCount > 0 ? String(recentPhotosCount) : undefined}
                  color="var(--team-europe)"
                />
                <QuickActionButton
                  icon={<Award size={20} />}
                  label="Awards"
                  href="/achievements"
                  color="var(--warning)"
                />
              </div>
            </section>

            {/* Weather & Course Info */}
            <section className="section-sm">
              <h2 className="type-overline" style={{ marginBottom: 'var(--space-4)' }}>
                Course Conditions
              </h2>
              <WeatherWidget
                latitude={36.5725}
                longitude={-121.9486}
                courseName={activeTrip.location || 'Golf Course'}
                compact
              />
            </section>

            {/* Momentum & Stats */}
            <section className="section-sm">
              <h2 className="type-overline" style={{ marginBottom: 'var(--space-4)' }}>
                Momentum
              </h2>
              <div className="grid grid-cols-2 gap-3">
                <MomentumCard
                  team="USA"
                  streak={2}
                  trend="up"
                  color="var(--team-usa)"
                />
                <MomentumCard
                  team="EUR"
                  streak={0}
                  trend="neutral"
                  color="var(--team-europe)"
                />
              </div>
            </section>

            {/* Side Bets Quick View */}
            <section className="section-sm">
              <div className="flex items-center justify-between" style={{ marginBottom: 'var(--space-4)' }}>
                <h2 className="type-overline">Side Bets</h2>
                <Link
                  href="/bets"
                  className="flex items-center gap-1 type-caption"
                  style={{ color: 'var(--masters)' }}
                >
                  View All <ChevronRight size={14} />
                </Link>
              </div>
              <div className="space-y-2">
                <SideBetRow type="Skins" status="$45 in pot" icon={<Zap size={16} />} />
                <SideBetRow type="Closest to Pin" status="Hole 7 - Open" icon={<Target size={16} />} />
                <SideBetRow type="Long Drive" status="Hole 12 - Open" icon={<TrendingUp size={16} />} />
              </div>
            </section>

            <hr className="divider-lg" />
          </>
        ) : activeTrip ? (
          /* Active trip loading */
          <section className="section">
            <button
              onClick={() => handleSelectTrip(activeTrip.id)}
              className="w-full text-left"
            >
              <div className="live-indicator" style={{ marginBottom: 'var(--space-4)' }}>
                Active
              </div>
              <h1 className="type-display" style={{ marginBottom: 'var(--space-6)' }}>
                {activeTrip.name}
              </h1>
              <div className="flex items-center gap-6 type-caption">
                {activeTrip.location && (
                  <span className="flex items-center gap-2">
                    <MapPin size={14} strokeWidth={1.5} />
                    {activeTrip.location}
                  </span>
                )}
                <span className="flex items-center gap-2">
                  <Calendar size={14} strokeWidth={1.5} />
                  {formatDate(activeTrip.startDate, 'short')}
                </span>
              </div>
              <div
                className="flex items-center gap-2"
                style={{
                  marginTop: 'var(--space-6)',
                  color: 'var(--masters)',
                  fontWeight: 500
                }}
              >
                <span>Continue</span>
                <ChevronRight size={18} strokeWidth={2} />
              </div>
            </button>
          </section>
        ) : null}

        {/* ARCHIVE — Tournament List */}
        <section className={activeTrip ? 'section-sm' : 'section'}>
          <div
            className="flex items-center justify-between"
            style={{ marginBottom: 'var(--space-6)' }}
          >
            <h2 className="type-overline">
              {hasTrips ? 'Tournaments' : 'Get Started'}
            </h2>
            {hasTrips && (
              <button
                onClick={() => setShowQuickStart(true)}
                className="flex items-center gap-1"
                style={{
                  color: 'var(--masters)',
                  fontWeight: 500,
                  fontSize: 'var(--text-sm)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                <Plus size={16} strokeWidth={2} />
                New
              </button>
            )}
          </div>

          {pastTrips.length > 0 ? (
            <div className="stagger-fast">
              {pastTrips.map((trip, index) => (
                <button
                  key={trip.id}
                  onClick={() => handleSelectTrip(trip.id)}
                  className="match-row row-interactive w-full text-left stagger-item"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex-1 min-w-0">
                    <p className="type-title-sm" style={{ marginBottom: 'var(--space-1)' }}>
                      {trip.name}
                    </p>
                    <div className="flex items-center gap-4 type-caption">
                      {trip.location && (
                        <span className="flex items-center gap-1 truncate">
                          <MapPin size={12} strokeWidth={1.5} />
                          <span className="truncate">{trip.location}</span>
                        </span>
                      )}
                      <span>{formatDate(trip.startDate, 'short')}</span>
                    </div>
                  </div>
                  <ChevronRight
                    size={20}
                    strokeWidth={1.5}
                    className="row-chevron"
                    style={{ color: 'var(--ink-tertiary)' }}
                  />
                </button>
              ))}
            </div>
          ) : !activeTrip ? (
            /* Premium Empty State with Quick Start option */
            <NoTournamentsEmpty onCreateTrip={() => setShowQuickStart(true)} />
          ) : null}
        </section>
      </main>

      {/* Bottom Navigation with Badges */}
      <BottomNav badges={navBadges} />
    </div>
  );
}

/* Quick Action Button Component */
interface QuickActionButtonProps {
  icon: React.ReactNode;
  label: string;
  href: string;
  badge?: string;
  color?: string;
}

function QuickActionButton({ icon, label, href, badge, color }: QuickActionButtonProps) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center gap-2 p-3 rounded-xl transition-all press-scale"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--rule)',
      }}
    >
      <div className="relative">
        <div style={{ color: color || 'var(--ink-secondary)' }}>{icon}</div>
        {badge && (
          <span
            className="absolute -top-1 -right-2 px-1.5 py-0.5 text-xs font-bold rounded-full"
            style={{
              background: 'var(--error)',
              color: 'white',
              fontSize: '10px',
              minWidth: '16px',
              textAlign: 'center',
            }}
          >
            {badge}
          </span>
        )}
      </div>
      <span className="type-micro">{label}</span>
    </Link>
  );
}

/* Momentum Card Component */
interface MomentumCardProps {
  team: string;
  streak: number;
  trend: 'up' | 'down' | 'neutral';
  color: string;
}

function MomentumCard({ team, streak, trend, color }: MomentumCardProps) {
  return (
    <div
      className="p-4 rounded-xl"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--rule)',
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="type-overline" style={{ color }}>{team}</span>
        {trend === 'up' && <Flame size={16} style={{ color: 'var(--error)' }} />}
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold" style={{ color }}>
          {streak}
        </span>
        <span className="type-caption">
          {streak === 1 ? 'win streak' : streak > 1 ? 'win streak' : 'no streak'}
        </span>
      </div>
    </div>
  );
}

/* Side Bet Row Component */
interface SideBetRowProps {
  type: string;
  status: string;
  icon: React.ReactNode;
}

function SideBetRow({ type, status, icon }: SideBetRowProps) {
  return (
    <div
      className="flex items-center gap-3 p-3 rounded-lg"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--rule)',
      }}
    >
      <div style={{ color: 'var(--masters)' }}>{icon}</div>
      <div className="flex-1">
        <p className="type-title-sm">{type}</p>
        <p className="type-caption">{status}</p>
      </div>
      <ChevronRight size={16} style={{ color: 'var(--ink-tertiary)' }} />
    </div>
  );
}
