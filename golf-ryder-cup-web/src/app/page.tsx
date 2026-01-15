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

  // Get real live match count from database
  const liveMatches = useLiveQuery(async () => {
    if (!activeTrip) return [];
    const sessions = await db.sessions.where('tripId').equals(activeTrip.id).toArray();
    const sessionIds = sessions.map(s => s.id);
    if (sessionIds.length === 0) return [];
    return db.matches.where('sessionId').anyOf(sessionIds).and(m => m.status === 'inProgress').toArray();
  }, [activeTrip?.id]);

  // Get real banter/social counts
  const banterPosts = useLiveQuery(async () => {
    if (!activeTrip) return [];
    return db.banterPosts.where('tripId').equals(activeTrip.id).toArray();
  }, [activeTrip?.id]);

  // Calculate real counts
  const liveMatchesCount = liveMatches?.length || 0;
  const recentPhotosCount = 0; // Photos not implemented yet
  const unreadMessages = banterPosts?.length || 0;

  // Navigation badges
  const navBadges: NavBadges = {
    score: liveMatchesCount > 0 ? liveMatchesCount : undefined,
  };

  return (
    <div className="pb-nav page-enter" style={{ minHeight: '100vh', background: 'var(--canvas)' }}>
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
        <div className="container-editorial" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span className="type-overline">Ryder Cup Tracker</span>
          {hasTrips && (
            <button
              onClick={() => setShowWhatsNew(true)}
              style={{ padding: 'var(--space-2)', marginRight: 'calc(-1 * var(--space-2))', borderRadius: 'var(--radius-md)', color: 'var(--masters)', background: 'transparent', border: 'none', cursor: 'pointer', transition: 'all 0.2s ease' }}
              aria-label="What's new"
            >
              <Sparkles className="w-5 h-5" />
            </button>
          )}
        </div>
      </header>

      <main className="container-editorial">
        {/* LIVE MATCH BANNER — Top priority when matches are happening */}
        {activeTrip && liveMatchesCount > 0 && liveMatches && liveMatches[0] && (
          <section className="section-sm">
            <LiveMatchBanner
              matchCount={liveMatchesCount}
              currentHole={liveMatches[0].currentHole || undefined}
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
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-3)' }}>
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
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-3)' }}>
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
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
                <h2 className="type-overline">Side Bets</h2>
                <Link
                  href="/bets"
                  className="type-caption"
                  style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)', color: 'var(--masters)' }}
                >
                  View All <ChevronRight size={14} />
                </Link>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
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
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 'var(--space-6)',
            }}
          >
            <h2 className="type-overline">
              {hasTrips ? 'Tournaments' : 'Get Started'}
            </h2>
            {hasTrips && (
              <button
                onClick={() => setShowQuickStart(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-1)',
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
                  className="match-row row-interactive stagger-item"
                  style={{ width: '100%', textAlign: 'left', animationDelay: `${index * 50}ms` }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p className="type-title-sm" style={{ marginBottom: 'var(--space-1)' }}>
                      {trip.name}
                    </p>
                    <div className="type-caption" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
                      {trip.location && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          <MapPin size={12} strokeWidth={1.5} />
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{trip.location}</span>
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
      className="press-scale"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 'var(--space-2)',
        padding: 'var(--space-3)',
        borderRadius: 'var(--radius-xl)',
        background: 'var(--canvas-raised)',
        border: '1px solid var(--rule)',
        transition: 'all 0.2s ease',
        textDecoration: 'none',
      }}
    >
      <div style={{ position: 'relative' }}>
        <div style={{ color: color || 'var(--ink-secondary)' }}>{icon}</div>
        {badge && (
          <span
            style={{
              position: 'absolute',
              top: '-4px',
              right: '-8px',
              padding: '2px 6px',
              fontSize: '10px',
              fontWeight: 700,
              borderRadius: 'var(--radius-full)',
              background: 'var(--error)',
              color: 'white',
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
      className="card"
      style={{ padding: 'var(--space-4)' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
        <span className="type-overline" style={{ color }}>{team}</span>
        {trend === 'up' && <Flame size={16} style={{ color: 'var(--error)' }} />}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-2)' }}>
        <span className="score-large" style={{ color }}>
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
      className="card"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-3)',
        padding: 'var(--space-3)',
      }}
    >
      <div style={{ color: 'var(--masters)' }}>{icon}</div>
      <div style={{ flex: 1 }}>
        <p className="type-title-sm">{type}</p>
        <p className="type-caption">{status}</p>
      </div>
      <ChevronRight size={16} style={{ color: 'var(--ink-tertiary)' }} />
    </div>
  );
}
