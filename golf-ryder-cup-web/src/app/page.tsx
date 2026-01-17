'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { useTripStore, useAuthStore, useUIStore } from '@/lib/stores';
import {
  ChevronRight,
  MapPin,
  Calendar,
  Plus,
  Target,
  Trophy,
  MessageCircle,
  Camera,
  Award,
  Flame,
  Tv,
  Zap,
  TrendingUp,
  Sparkles,
  Shield,
  Users,
  ClipboardCheck,
  BarChart3,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { calculateTeamStandings } from '@/lib/services/tournamentEngine';
import type { TeamStandings, MatchState } from '@/lib/types/computed';
import type { Match, RyderCupSession } from '@/lib/types/models';
import { calculateMatchState } from '@/lib/services/scoringEngine';
import {
  NoTournamentsEmpty,
  LiveMatchBanner,
  WhatsNew,
  QuickStartWizard,
  FeatureCard,
  YourMatchCard,
  CaptainToggle,
} from '@/components/ui';
import { JoinTripModal } from '@/components/ui/JoinTripModal';
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
  const { loadTrip, currentTrip, players, teams, sessions } = useTripStore();
  const { currentUser, isAuthenticated } = useAuthStore();
  const { isCaptainMode } = useUIStore();
  const [standings, setStandings] = useState<TeamStandings | null>(null);
  const [showQuickStart, setShowQuickStart] = useState(false);
  const [showJoinTrip, setShowJoinTrip] = useState(false);
  const [, setShowWhatsNew] = useState(false);
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

  // Find the current user's player record (P0-1)
  const currentUserPlayer = useMemo(() => {
    if (!isAuthenticated || !currentUser) return null;
    return players.find(
      p =>
        (p.email && currentUser.email && p.email.toLowerCase() === currentUser.email.toLowerCase()) ||
        (p.firstName.toLowerCase() === currentUser.firstName.toLowerCase() &&
          p.lastName.toLowerCase() === currentUser.lastName.toLowerCase())
    );
  }, [currentUser, isAuthenticated, players]);

  // Find the current user's match (scheduled or in progress) (P0-1)
  const userMatchData = useLiveQuery(async (): Promise<{
    match: Match;
    session: RyderCupSession;
    matchState: MatchState | null;
  } | null> => {
    if (!activeTrip || !currentUserPlayer) return null;

    // Get sessions for this trip
    const tripSessions = await db.sessions
      .where('tripId')
      .equals(activeTrip.id)
      .toArray();

    if (tripSessions.length === 0) return null;

    // Find matches where user is playing
    const sessionIds = tripSessions.map(s => s.id);
    const allMatches = await db.matches
      .where('sessionId')
      .anyOf(sessionIds)
      .toArray();

    // Find user's match (prefer inProgress, then scheduled)
    const userMatches = allMatches.filter(
      m => m.teamAPlayerIds.includes(currentUserPlayer.id) ||
        m.teamBPlayerIds.includes(currentUserPlayer.id)
    );

    // Prioritize: inProgress > scheduled
    const userMatch = userMatches.find(m => m.status === 'inProgress') ||
      userMatches.find(m => m.status === 'scheduled');

    if (!userMatch) return null;

    const session = tripSessions.find(s => s.id === userMatch.sessionId);
    if (!session) return null;

    // Get match state if in progress
    let matchState: MatchState | null = null;
    if (userMatch.status === 'inProgress') {
      const holeResults = await db.holeResults
        .where('matchId')
        .equals(userMatch.id)
        .toArray();
      matchState = calculateMatchState(userMatch, holeResults);
    }

    return { match: userMatch, session, matchState };
  }, [activeTrip?.id, currentUserPlayer?.id]);

  // Get team names
  const teamA = teams.find(t => t.color === 'usa');
  const teamB = teams.find(t => t.color === 'europe');
  const teamAName = teamA?.name || 'USA';
  const teamBName = teamB?.name || 'Europe';

  const handleSelectTrip = async (tripId: string) => {
    await loadTrip(tripId);
    router.push('/standings');
  };

  const handleEnterScore = useCallback(() => {
    if (userMatchData?.match) {
      router.push(`/score/${userMatchData.match.id}`);
    }
  }, [router, userMatchData]);

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

    await db.trips.add({
      id: tripId,
      name: tripData.name,
      location: tripData.location || undefined,
      startDate: tripData.startDate,
      endDate: tripData.endDate,
      isCaptainModeEnabled: false,
      createdAt: now,
      updatedAt: now,
    });

    // Create teams with custom names
    const teamAId = crypto.randomUUID();
    const teamBId = crypto.randomUUID();

    await db.teams.bulkAdd([
      {
        id: teamAId,
        tripId,
        name: tripData.teamAName || 'USA',
        color: 'usa' as const,
        mode: 'ryderCup' as const,
        createdAt: now,
      },
      {
        id: teamBId,
        tripId,
        name: tripData.teamBName || 'Europe',
        color: 'europe' as const,
        mode: 'ryderCup' as const,
        createdAt: now,
      },
    ]);

    setShowQuickStart(false);
    await loadTrip(tripId);
    router.push('/players');
  }, [loadTrip, router]);

  const hasTrips = trips && trips.length > 0;
  const pastTrips = trips?.filter(t => t.id !== activeTrip?.id) || [];
  const isLoading = trips === undefined;

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

  // Get real side bets data (P1: Progressive disclosure)
  const sideBets = useLiveQuery(async () => {
    if (!activeTrip) return [];
    return db.sideBets.where('tripId').equals(activeTrip.id).toArray();
  }, [activeTrip?.id]);

  // Calculate real counts
  const liveMatchesCount = liveMatches?.length || 0;
  const recentPhotosCount = 0; // Photos not implemented yet
  const unreadMessages = banterPosts?.length || 0;
  const activeSideBetsCount = sideBets?.filter(b => b.status === 'active').length || 0;

  // Navigation badges
  const navBadges: NavBadges = {
    score: liveMatchesCount > 0 ? liveMatchesCount : undefined,
  };

  // Loading state - show skeleton while trips are loading
  if (isLoading) {
    return (
      <div className="pb-nav page-premium-enter texture-grain" style={{ minHeight: '100vh', background: 'var(--canvas)' }}>
        <header className="header-premium">
          <div className="container-editorial" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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
                  boxShadow: 'var(--shadow-glow-green)'
                }}
              >
                <Trophy size={16} style={{ color: 'var(--color-accent)' }} />
              </div>
              <span className="type-overline" style={{ letterSpacing: '0.15em', color: 'var(--ink)' }}>Ryder Cup Tracker</span>
            </div>
          </div>
        </header>
        <main className="container-editorial" style={{ paddingTop: 'var(--space-6)' }}>
          <div className="space-y-4 animate-pulse">
            <div className="h-32 rounded-2xl bg-muted/50" />
            <div className="h-48 rounded-2xl bg-muted/50" />
            <div className="h-20 rounded-xl bg-muted/50" />
          </div>
        </main>
        <BottomNav badges={navBadges} />
      </div>
    );
  }

  return (
    <div className="pb-nav page-premium-enter texture-grain" style={{ minHeight: '100vh', background: 'var(--canvas)' }}>
      {/* Quick Start Wizard Modal */}
      {showQuickStart && (
        <QuickStartWizard
          onComplete={handleQuickStartComplete}
          onCancel={() => setShowQuickStart(false)}
        />
      )}

      {/* Join Trip Modal */}
      <JoinTripModal
        isOpen={showJoinTrip}
        onClose={() => setShowJoinTrip(false)}
        onSuccess={(tripId) => {
          setShowJoinTrip(false);
          router.push('/');
        }}
      />

      {/* What's New Modal (auto-shows for returning users) */}
      <WhatsNew onDismiss={() => setShowWhatsNew(false)} />

      {/* Premium Header with Captain Toggle (P0-2) */}
      <header className="header-premium">
        <div className="container-editorial" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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
                boxShadow: 'var(--shadow-glow-green)'
              }}
            >
              <Trophy size={16} style={{ color: 'var(--color-accent)' }} />
            </div>
            <span className="type-overline" style={{ letterSpacing: '0.15em', color: 'var(--ink)' }}>Ryder Cup Tracker</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
            {/* Captain Mode Toggle (P0-2) */}
            {hasTrips && <CaptainToggle />}
            {hasTrips && (
              <button
                onClick={() => setShowWhatsNew(true)}
                className="press-scale"
                style={{
                  padding: 'var(--space-2)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--masters)',
                  background: 'rgba(var(--masters-rgb), 0.1)',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                aria-label="What's new"
              >
                <Sparkles className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="container-editorial">
        {/* YOUR MATCH HERO CARD (P0-1) — Top priority for participants */}
        {activeTrip && userMatchData && currentUserPlayer && (
          <section className="section-sm">
            <YourMatchCard
              match={userMatchData.match}
              matchState={userMatchData.matchState || undefined}
              session={userMatchData.session}
              currentUserPlayer={currentUserPlayer}
              allPlayers={players}
              teamAName={teamAName}
              teamBName={teamBName}
              onEnterScore={handleEnterScore}
            />
          </section>
        )}

        {/* LIVE MATCH BANNER — Show when there are live matches (but user not in one) */}
        {activeTrip && liveMatchesCount > 0 && liveMatches && liveMatches[0] && !userMatchData && (
          <section className="section-sm">
            <LiveMatchBanner
              matchCount={liveMatchesCount}
              currentHole={liveMatches[0].currentHole || undefined}
            />
          </section>
        )}

        {/* SETUP GUIDE for Captains - Show when trip needs setup */}
        {activeTrip && isCaptainMode && players.length < 4 && sessions.length === 0 && (
          <section className="section-sm">
            <div
              className="card"
              style={{
                padding: 'var(--space-5)',
                background: 'linear-gradient(135deg, rgba(0, 103, 71, 0.08) 0%, rgba(0, 103, 71, 0.03) 100%)',
                border: '1px solid rgba(0, 103, 71, 0.2)',
              }}
            >
              <div className="flex items-start gap-3 mb-4">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'var(--masters)' }}
                >
                  <ClipboardCheck size={20} style={{ color: 'white' }} />
                </div>
                <div>
                  <p className="type-title-sm">Get Your Trip Ready</p>
                  <p className="type-caption" style={{ marginTop: '2px' }}>
                    Complete these steps to start your golf competition
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <SetupStep
                  number={1}
                  label="Add Players"
                  done={players.length >= 4}
                  href="/players"
                  hint={`${players.length} added`}
                />
                <SetupStep
                  number={2}
                  label="Assign Teams"
                  done={teams.length >= 2 && players.some(p => teams.some(t => t.id))}
                  href="/captain/draft"
                  hint="Draft players to teams"
                />
                <SetupStep
                  number={3}
                  label="Create First Session"
                  done={sessions.length > 0}
                  href="/lineup/new"
                  hint="Set up matchups"
                />
              </div>
            </div>
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
                  icon={<BarChart3 size={20} />}
                  label="Stats"
                  href="/trip-stats"
                  color="var(--masters)"
                />
                <QuickActionButton
                  icon={<Award size={20} />}
                  label="Awards"
                  href="/achievements"
                  color="var(--warning)"
                />
              </div>
            </section>

            {/* Captain Quick Actions - Only shown when in Captain Mode */}
            {isCaptainMode && (
              <section className="section-sm">
                <div className="flex items-center justify-between" style={{ marginBottom: 'var(--space-4)' }}>
                  <div className="flex items-center gap-2">
                    <Shield size={14} style={{ color: 'var(--masters)' }} />
                    <h2 className="type-overline" style={{ color: 'var(--masters)' }}>Captain Tools</h2>
                  </div>
                  <Link
                    href="/captain"
                    className="type-caption"
                    style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)', color: 'var(--masters)' }}
                  >
                    All Tools <ChevronRight size={14} />
                  </Link>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-3)' }}>
                  <Link
                    href="/lineup/new"
                    className="card press-scale"
                    style={{ padding: 'var(--space-3)', textAlign: 'center' }}
                  >
                    <Users size={20} style={{ color: 'var(--masters)', marginBottom: 'var(--space-2)' }} />
                    <p className="type-micro">Create Lineup</p>
                  </Link>
                  <Link
                    href="/captain/checklist"
                    className="card press-scale"
                    style={{ padding: 'var(--space-3)', textAlign: 'center' }}
                  >
                    <ClipboardCheck size={20} style={{ color: '#3b82f6', marginBottom: 'var(--space-2)' }} />
                    <p className="type-micro">Pre-Flight</p>
                  </Link>
                  <Link
                    href="/players"
                    className="card press-scale"
                    style={{ padding: 'var(--space-3)', textAlign: 'center' }}
                  >
                    <Users size={20} style={{ color: '#8b5cf6', marginBottom: 'var(--space-2)' }} />
                    <p className="type-micro">Players</p>
                  </Link>
                </div>
              </section>
            )}

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

            {/* Side Bets Quick View — Progressive Disclosure (P1) */}
            {/* Only show when there are active side bets or captain mode is on */}
            {(activeSideBetsCount > 0 || isCaptainMode) && (
              <section className="section-sm">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
                  <h2 className="type-overline">Side Bets</h2>
                  <Link
                    href="/bets"
                    className="type-caption"
                    style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)', color: 'var(--masters)' }}
                  >
                    {activeSideBetsCount > 0 ? 'View All' : 'Create'} <ChevronRight size={14} />
                  </Link>
                </div>
                {activeSideBetsCount > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                    {sideBets?.filter(b => b.status === 'active').slice(0, 3).map(bet => (
                      <SideBetRow
                        key={bet.id}
                        type={bet.type || 'Custom'}
                        status={bet.status === 'active' ? 'In Progress' : 'Complete'}
                        icon={<Zap size={16} />}
                      />
                    ))}
                  </div>
                ) : (
                  <div
                    className="text-center py-6"
                    style={{ color: 'var(--ink-tertiary)' }}
                  >
                    <Zap size={24} style={{ margin: '0 auto var(--space-2)' }} />
                    <p className="type-caption">No active side bets</p>
                    <p className="type-caption" style={{ marginTop: 'var(--space-1)' }}>
                      Add skins, KP, or custom bets
                    </p>
                  </div>
                )}
              </section>
            )}

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
            <h2 className="type-overline" style={{ letterSpacing: '0.15em' }}>
              {hasTrips ? 'Tournaments' : 'Get Started'}
            </h2>
            {hasTrips && (
              <button
                onClick={() => setShowQuickStart(true)}
                className="btn-premium press-scale"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-2)',
                  padding: 'var(--space-2) var(--space-4)',
                  borderRadius: 'var(--radius-full)',
                  fontSize: 'var(--text-sm)',
                }}
              >
                <Plus size={14} strokeWidth={2.5} />
                New
              </button>
            )}
          </div>

          {pastTrips.length > 0 ? (
            <div className="stagger-fast" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              {pastTrips.map((trip, index) => (
                <button
                  key={trip.id}
                  onClick={() => handleSelectTrip(trip.id)}
                  className="card-premium press-scale stagger-item active:scale-[0.98]"
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    animationDelay: `${index * 50}ms`,
                    padding: 'var(--space-5)',
                    minHeight: '80px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-4)',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    borderRadius: 'var(--radius-xl)',
                  }}
                >
                  {/* Tournament Icon */}
                  <div
                    style={{
                      width: '52px',
                      height: '52px',
                      borderRadius: 'var(--radius-xl)',
                      background: 'linear-gradient(135deg, var(--masters) 0%, var(--masters-deep) 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Trophy size={24} style={{ color: 'var(--color-accent)' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p className="type-title" style={{ marginBottom: 'var(--space-2)', fontWeight: 700, fontSize: '17px' }}>
                      {trip.name}
                    </p>
                    <div className="type-caption" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', fontSize: '14px' }}>
                      {trip.location && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          <MapPin size={14} strokeWidth={1.5} style={{ color: 'var(--masters)', flexShrink: 0 }} />
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{trip.location}</span>
                        </span>
                      )}
                      <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                        <Calendar size={14} strokeWidth={1.5} style={{ color: 'var(--ink-tertiary)' }} />
                        {formatDate(trip.startDate, 'short')}
                      </span>
                    </div>
                  </div>
                  <ChevronRight
                    size={22}
                    strokeWidth={1.5}
                    style={{ color: 'var(--masters)', flexShrink: 0 }}
                  />
                </button>
              ))}
            </div>
          ) : !activeTrip ? (
            /* Premium Empty State with Quick Start option */
            <NoTournamentsEmpty
              onCreateTrip={() => setShowQuickStart(true)}
              onJoinTrip={() => setShowJoinTrip(true)}
            />
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
      className="press-scale quick-action-btn"
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
    <Link
      href="/bets"
      className="card press-scale"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-3)',
        padding: 'var(--space-3)',
        cursor: 'pointer',
        textDecoration: 'none',
      }}
    >
      <div style={{ color: 'var(--masters)' }}>{icon}</div>
      <div style={{ flex: 1 }}>
        <p className="type-title-sm">{type}</p>
        <p className="type-caption">{status}</p>
      </div>
      <ChevronRight size={16} style={{ color: 'var(--ink-tertiary)' }} />
    </Link>
  );
}
/* Setup Step Component for Getting Started Guide */
interface SetupStepProps {
  number: number;
  label: string;
  done: boolean;
  href: string;
  hint?: string;
}

function SetupStep({ number, label, done, href, hint }: SetupStepProps) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 p-3 rounded-lg transition-colors"
      style={{
        background: done ? 'rgba(0, 103, 71, 0.1)' : 'var(--surface)',
        border: `1px solid ${done ? 'rgba(0, 103, 71, 0.3)' : 'var(--rule)'}`,
      }}
    >
      <div
        className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
        style={{
          background: done ? 'var(--masters)' : 'var(--rule)',
          color: done ? 'white' : 'var(--ink-tertiary)',
        }}
      >
        {done ? '✓' : number}
      </div>
      <div className="flex-1">
        <p className="type-title-sm" style={{ color: done ? 'var(--masters)' : 'var(--ink)' }}>
          {label}
        </p>
        {hint && (
          <p className="type-micro" style={{ marginTop: '2px' }}>
            {hint}
          </p>
        )}
      </div>
      <ChevronRight size={16} style={{ color: done ? 'var(--masters)' : 'var(--ink-tertiary)' }} />
    </Link>
  );
}
