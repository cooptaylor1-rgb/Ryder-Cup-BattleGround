'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/lib/db';
import { useTripStore, useUIStore } from '@/lib/stores';
import { useHomeData } from '@/lib/hooks/useHomeData';
import { tripLogger } from '@/lib/utils/logger';
import {
  ChevronRight,
  MapPin,
  Calendar,
  Plus,
  Trophy,
  Shield,
  Users,
  ClipboardCheck,
  Tv,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { useState, useCallback } from 'react';
import {
  NoTournamentsEmpty,
  WhatsNew,
  QuickStartWizard,
  YourMatchCard,
  CaptainToggle,
  ContinueScoringBanner,
  PageLoadingSkeleton,
} from '@/components/ui';
import { JoinTripModal } from '@/components/ui/JoinTripModal';
import { BottomNav, PageHeader, type NavBadges } from '@/components/layout';

/**
 * HOME PAGE — The Daily Edition
 *
 * Fried Egg Golf-inspired editorial layout:
 * - TODAY header with trip name in warm serif
 * - Monumental score with breathing room
 * - Your match (if active)
 * - Live matches as clean text list
 * - Past tournaments as an editorial archive
 *
 * No dashboard grids. No widgets. Just what matters now.
 */
export default function HomePage() {
  const router = useRouter();
  const { loadTrip, currentTrip: _currentTrip, players, teams, sessions } = useTripStore();
  const { isCaptainMode } = useUIStore();
  const [showQuickStart, setShowQuickStart] = useState(false);
  const [showJoinTrip, setShowJoinTrip] = useState(false);
  const [, setShowWhatsNew] = useState(false);

  const {
    trips,
    activeTrip,
    standings,
    userMatchData,
    currentUserPlayer,
    liveMatches,
    isLoading,
    teamAName,
    teamBName,
  } = useHomeData();

  const handleSelectTrip = async (tripId: string) => {
    await loadTrip(tripId);
    router.push('/standings');
  };

  const handleEnterScore = useCallback(() => {
    if (userMatchData?.match) {
      router.push(`/score/${userMatchData.match.id}`);
    }
  }, [router, userMatchData]);

  const handleQuickStartComplete = useCallback(
    async (tripData: {
      name: string;
      location: string;
      startDate: string;
      endDate: string;
      teamAName: string;
      teamBName: string;
    }) => {
      try {
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
      } catch (error) {
        tripLogger.error('Failed to create trip:', error);
      }
    },
    [loadTrip, router]
  );

  const hasTrips = trips && trips.length > 0;
  const pastTrips = trips?.filter((t) => t.id !== activeTrip?.id) || [];
  const liveMatchesCount = liveMatches?.length || 0;
  const activeMatchId = liveMatchesCount === 1 ? liveMatches?.[0]?.id : undefined;

  const navBadges: NavBadges = {
    score: liveMatchesCount > 0 ? liveMatchesCount : undefined,
  };

  // Compute score narrative
  const getScoreNarrative = () => {
    if (!standings) return null;
    const diff = Math.abs(standings.teamAPoints - standings.teamBPoints);
    if (diff === 0) return 'All square';
    const leader = standings.teamAPoints > standings.teamBPoints
      ? (teamAName || 'USA')
      : (teamBName || 'Europe');
    return `${leader} leads by ${diff} point${diff !== 1 ? 's' : ''}`;
  };

  const headerSubtitle = activeTrip
    ? (getScoreNarrative() ?? activeTrip.name)
    : hasTrips
      ? 'Select a trip to get started'
      : 'Your daily edition';

  // Loading state
  if (isLoading) {
    return <PageLoadingSkeleton title="Home" showBackButton={false} variant="default" />;
  }

  return (
    <>
      {/* Full-screen overlays — must be outside the page wrapper to escape its stacking context */}
      {showQuickStart && (
        <QuickStartWizard
          onComplete={handleQuickStartComplete}
          onCancel={() => setShowQuickStart(false)}
        />
      )}

      <div className="min-h-screen pb-nav page-premium-enter texture-grain bg-[var(--canvas)]">
      <JoinTripModal
        isOpen={showJoinTrip}
        onClose={() => setShowJoinTrip(false)}
        onSuccess={() => {
          setShowJoinTrip(false);
          router.push('/');
        }}
      />
      <WhatsNew onDismiss={() => setShowWhatsNew(false)} />

      <PageHeader
        title="Ryder Cup Tracker"
        subtitle={headerSubtitle}
        rightSlot={hasTrips ? <CaptainToggle /> : null}
      />

      {/* ── CONTINUE SCORING BANNER ── */}
      {userMatchData?.match?.status === 'inProgress' && (
        <div className="sticky top-0 z-40 bg-[var(--canvas)] py-[var(--space-2)] px-[var(--space-4)]">
          <ContinueScoringBanner
            match={userMatchData.match}
            matchState={userMatchData.matchState || undefined}
            matchDescription={
              userMatchData.session?.sessionType === 'fourball'
                ? 'Four-Ball'
                : userMatchData.session?.sessionType === 'foursomes'
                  ? 'Foursomes'
                  : 'Singles'
            }
          />
        </div>
      )}

      <main className="container-editorial">
        {/* ── ACTIVE TOURNAMENT ── */}
        {activeTrip && (
          <>
            {/* TODAY HEADER */}
            <section style={{ paddingTop: 'var(--space-8)' }}>
              <p className="type-overline" style={{ letterSpacing: '0.18em', color: 'var(--ink-tertiary)' }}>
                {formatDate(new Date()).toUpperCase()}
              </p>
              <h1
                className="type-display"
                style={{ marginTop: 'var(--space-2)', color: 'var(--ink)' }}
              >
                {activeTrip.name}
              </h1>
              {activeTrip.location && (
                <p className="type-body-sm" style={{ marginTop: 'var(--space-1)', color: 'var(--ink-secondary)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  <MapPin size={14} strokeWidth={1.5} />
                  {activeTrip.location}
                </p>
              )}
            </section>

            {/* SCORE HERO — Monumental, breathing */}
            {standings ? (
              <section style={{ paddingTop: 'var(--space-10)', paddingBottom: 'var(--space-8)' }}>
                <button
                  onClick={() => handleSelectTrip(activeTrip.id)}
                  style={{
                    width: '100%',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0,
                  }}
                  className="press-scale"
                >
                  {/* Live badge */}
                  {liveMatchesCount > 0 && (
                    <div className="live-indicator" style={{ marginBottom: 'var(--space-6)', justifyContent: 'center', display: 'flex' }}>
                      Live
                    </div>
                  )}

                  {/* Score blocks */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-6)' }}>
                    {/* Team A */}
                    <div style={{ textAlign: 'center', flex: 1 }}>
                      <span
                        className="team-dot team-dot-lg team-dot-usa"
                        style={{ display: 'inline-block', marginBottom: 'var(--space-3)' }}
                      />
                      <p
                        className="score-monumental"
                        style={{
                          color: standings.teamAPoints >= standings.teamBPoints
                            ? 'var(--team-usa)'
                            : 'var(--ink-tertiary)',
                        }}
                      >
                        {standings.teamAPoints}
                      </p>
                      <p className="type-overline" style={{ marginTop: 'var(--space-3)', color: 'var(--team-usa)' }}>
                        {teamAName || 'USA'}
                      </p>
                    </div>

                    {/* Divider */}
                    <div style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-2xl)', color: 'var(--ink-faint)', paddingTop: 'var(--space-4)' }}>
                      –
                    </div>

                    {/* Team B */}
                    <div style={{ textAlign: 'center', flex: 1 }}>
                      <span
                        className="team-dot team-dot-lg team-dot-europe"
                        style={{ display: 'inline-block', marginBottom: 'var(--space-3)' }}
                      />
                      <p
                        className="score-monumental"
                        style={{
                          color: standings.teamBPoints > standings.teamAPoints
                            ? 'var(--team-europe)'
                            : 'var(--ink-tertiary)',
                        }}
                      >
                        {standings.teamBPoints}
                      </p>
                      <p className="type-overline" style={{ marginTop: 'var(--space-3)', color: 'var(--team-europe)' }}>
                        {teamBName || 'EUR'}
                      </p>
                    </div>
                  </div>

                  {/* Score narrative */}
                  {getScoreNarrative() && (
                    <p className="type-body-sm" style={{
                      textAlign: 'center',
                      marginTop: 'var(--space-6)',
                      color: 'var(--ink-secondary)',
                      fontStyle: 'italic',
                    }}>
                      {getScoreNarrative()}
                    </p>
                  )}

                  {/* View standings CTA */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 'var(--space-2)',
                    marginTop: 'var(--space-8)',
                    color: 'var(--masters)',
                    fontWeight: 500,
                    fontSize: 'var(--text-sm)',
                  }}>
                    <span>View full standings</span>
                    <ChevronRight size={16} strokeWidth={2} />
                  </div>
                </button>
              </section>
            ) : (
              /* Active trip without standings yet */
              <section style={{ paddingTop: 'var(--space-8)', paddingBottom: 'var(--space-6)' }}>
                <button
                  onClick={() => handleSelectTrip(activeTrip.id)}
                  style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left' }}
                >
                  <div className="live-indicator" style={{ marginBottom: 'var(--space-4)' }}>Active</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginTop: 'var(--space-4)', color: 'var(--masters)', fontWeight: 500 }}>
                    <span>Continue</span>
                    <ChevronRight size={16} strokeWidth={2} />
                  </div>
                </button>
              </section>
            )}

            <hr className="divider" />

            {/* YOUR MATCH — If user has an active match */}
            {userMatchData && currentUserPlayer && (
              <>
                <section style={{ paddingTop: 'var(--space-6)', paddingBottom: 'var(--space-6)' }}>
                  <p className="type-overline" style={{ letterSpacing: '0.15em', color: 'var(--ink-tertiary)', marginBottom: 'var(--space-4)' }}>
                    YOUR MATCH
                  </p>
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
                <hr className="divider-subtle" />
              </>
            )}

            {/* LIVE NOW — Clean text list */}
            {liveMatchesCount > 0 && liveMatches && !userMatchData && (
              <>
                <section style={{ paddingTop: 'var(--space-6)', paddingBottom: 'var(--space-6)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                      <div className="live-indicator">Live Now</div>
                      <span className="type-caption" style={{ color: 'var(--ink-tertiary)' }}>
                        {liveMatchesCount} match{liveMatchesCount !== 1 ? 'es' : ''}
                      </span>
                    </div>
                    <Link
                      href="/live"
                      className="type-caption"
                      style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)', color: 'var(--masters)', textDecoration: 'none' }}
                    >
                      Watch <Tv size={14} />
                    </Link>
                  </div>
                </section>
                <hr className="divider-subtle" />
              </>
            )}

            {/* SETUP GUIDE — For captains with incomplete setup */}
            {isCaptainMode && players.length < 4 && sessions.length === 0 && (
              <>
                <section style={{ paddingTop: 'var(--space-6)', paddingBottom: 'var(--space-6)' }}>
                  <p className="type-overline" style={{ letterSpacing: '0.15em', color: 'var(--maroon)', marginBottom: 'var(--space-4)' }}>
                    <Shield size={12} style={{ display: 'inline', marginRight: 'var(--space-1)', verticalAlign: 'middle' }} />
                    CAPTAIN SETUP
                  </p>
                  <div className="card-captain">
                    <p className="type-title-sm" style={{ marginBottom: 'var(--space-4)' }}>
                      Get Your Trip Ready
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                      <SetupStep number={1} label="Add Players" done={players.length >= 4} href="/players" hint={`${players.length} added`} />
                      <SetupStep number={2} label="Assign Teams" done={teams.length >= 2 && players.some(() => teams.some((t) => t.id))} href="/captain/draft" hint="Draft players to teams" />
                      <SetupStep number={3} label="Create First Session" done={sessions.length > 0} href="/lineup/new" hint="Set up matchups" />
                    </div>
                  </div>
                </section>
                <hr className="divider-subtle" />
              </>
            )}

            {/* CAPTAIN QUICK TOOLS */}
            {isCaptainMode && (
              <>
                <section style={{ paddingTop: 'var(--space-6)', paddingBottom: 'var(--space-6)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
                    <p className="type-overline" style={{ letterSpacing: '0.15em', color: 'var(--maroon)' }}>
                      <Shield size={12} style={{ display: 'inline', marginRight: 'var(--space-1)', verticalAlign: 'middle' }} />
                      CAPTAIN TOOLS
                    </p>
                    <Link
                      href="/captain"
                      className="type-caption"
                      style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)', color: 'var(--maroon)', textDecoration: 'none' }}
                    >
                      All Tools <ChevronRight size={14} />
                    </Link>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-3)' }}>
                    <Link href="/lineup/new" className="quick-action-btn press-scale" style={{ textDecoration: 'none', borderColor: 'var(--maroon-subtle)' }}>
                      <Users size={18} style={{ color: 'var(--maroon)' }} />
                      <span className="type-micro" style={{ color: 'var(--ink)' }}>Lineup</span>
                    </Link>
                    <Link href="/captain/checklist" className="quick-action-btn press-scale" style={{ textDecoration: 'none', borderColor: 'var(--maroon-subtle)' }}>
                      <ClipboardCheck size={18} style={{ color: 'var(--maroon)' }} />
                      <span className="type-micro" style={{ color: 'var(--ink)' }}>Pre-Flight</span>
                    </Link>
                    <Link href="/players" className="quick-action-btn press-scale" style={{ textDecoration: 'none', borderColor: 'var(--maroon-subtle)' }}>
                      <Users size={18} style={{ color: 'var(--maroon)' }} />
                      <span className="type-micro" style={{ color: 'var(--ink)' }}>Players</span>
                    </Link>
                  </div>
                </section>
                <hr className="divider-subtle" />
              </>
            )}
          </>
        )}

        {/* ── TOURNAMENT ARCHIVE ── */}
        <section style={{ paddingTop: activeTrip ? 'var(--space-6)' : 'var(--space-10)', paddingBottom: 'var(--space-10)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-6)' }}>
            <h2 className="type-overline" style={{ letterSpacing: '0.15em' }}>
              {hasTrips ? (activeTrip ? 'Past Tournaments' : 'Tournaments') : 'Get Started'}
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
                  minHeight: '44px',
                }}
              >
                <Plus size={14} strokeWidth={2.5} />
                New
              </button>
            )}
          </div>

          {pastTrips.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {pastTrips.map((trip) => (
                <button
                  key={trip.id}
                  onClick={() => handleSelectTrip(trip.id)}
                  className="card-editorial card-interactive"
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-4)',
                    border: '1px solid var(--rule)',
                    cursor: 'pointer',
                    padding: 'var(--space-5)',
                  }}
                >
                  {/* Tournament Icon */}
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: 'var(--radius-lg)',
                    background: 'linear-gradient(135deg, var(--masters) 0%, var(--masters-deep) 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <Trophy size={22} style={{ color: 'var(--gold)' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p className="type-title-sm" style={{ fontWeight: 600 }}>
                      {trip.name}
                    </p>
                    <div className="type-caption" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginTop: 'var(--space-1)' }}>
                      {trip.location && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          <MapPin size={12} strokeWidth={1.5} style={{ color: 'var(--ink-tertiary)', flexShrink: 0 }} />
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{trip.location}</span>
                        </span>
                      )}
                      <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
                        <Calendar size={12} strokeWidth={1.5} style={{ color: 'var(--ink-tertiary)' }} />
                        {formatDate(trip.startDate, 'short')}
                      </span>
                    </div>
                  </div>
                  <ChevronRight size={18} strokeWidth={1.5} style={{ color: 'var(--ink-tertiary)', flexShrink: 0 }} />
                </button>
              ))}
            </div>
          ) : !activeTrip ? (
            <NoTournamentsEmpty
              onCreateTrip={() => setShowQuickStart(true)}
              onJoinTrip={() => setShowJoinTrip(true)}
            />
          ) : null}
        </section>
      </main>

      <BottomNav badges={navBadges} activeMatchId={activeMatchId} />
    </div>
    </>
  );
}

/* ── Setup Step Component ── */
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
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-3)',
        padding: 'var(--space-3)',
        borderRadius: 'var(--radius-md)',
        background: done ? 'var(--masters-subtle)' : 'var(--canvas-sunken)',
        border: `1px solid ${done ? 'rgba(0, 102, 68, 0.2)' : 'var(--rule)'}`,
        textDecoration: 'none',
        color: 'var(--ink)',
        transition: 'background var(--duration-fast) var(--ease-out)',
      }}
    >
      <div style={{
        width: '24px',
        height: '24px',
        borderRadius: 'var(--radius-full)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 'var(--text-xs)',
        fontWeight: 700,
        background: done ? 'var(--masters)' : 'var(--rule)',
        color: done ? 'white' : 'var(--ink-tertiary)',
      }}>
        {done ? '✓' : number}
      </div>
      <div style={{ flex: 1 }}>
        <p className="type-title-sm" style={{ color: done ? 'var(--masters)' : 'var(--ink)' }}>{label}</p>
        {hint && <p className="type-micro" style={{ marginTop: '2px' }}>{hint}</p>}
      </div>
      <ChevronRight size={14} style={{ color: done ? 'var(--masters)' : 'var(--ink-tertiary)' }} />
    </Link>
  );
}
