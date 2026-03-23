'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FirstLaunchWalkthrough } from '@/components/FirstLaunchWalkthrough';
import { useTripStore, useUIStore } from '@/lib/stores';
import { useHomeData } from '@/lib/hooks/useHomeData';
import { ensureTripShareCode } from '@/lib/services/tripSyncService';
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
  Share2,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { shareTrip } from '@/lib/utils/share';
import { useState, useCallback, useEffect, useMemo } from 'react';
import {
  NoTournamentsEmpty,
  WhatsNew,
  YourMatchCard,
  CaptainToggle,
  ContinueScoringBanner,
  PageLoadingSkeleton,
} from '@/components/ui';
import { JoinTripModal } from '@/components/ui/JoinTripModal';
import { PageHeader } from '@/components/layout';
import { TripDashboardSections } from './TripDashboardSections';

function readPendingJoinCode(): string | undefined {
  if (typeof window === 'undefined') {
    return undefined;
  }

  return sessionStorage.getItem('pendingJoinCode') ?? undefined;
}

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
  const { loadTrip, players, teams, teamMembers, sessions } = useTripStore();
  const { isCaptainMode, showToast } = useUIStore();
  const [pendingJoinCode, setPendingJoinCode] = useState<string | undefined>(readPendingJoinCode);
  const [showJoinTrip, setShowJoinTrip] = useState(() => !!readPendingJoinCode());
  const [homeClock] = useState(() => Date.now());

  // Check for a pending join code from /join deep link
  useEffect(() => {
    if (pendingJoinCode) {
      sessionStorage.removeItem('pendingJoinCode');
    }
  }, [pendingJoinCode]);

  const {
    trips,
    activeTrip,
    standings,
    userMatchData,
    currentUserPlayer,
    tripPlayerLink,
    liveMatches,
    tripMatches,
    tripSessions,
    tripAwards,
    sideBets,
    banterPosts,
    isLoading,
    teamAName,
    teamBName,
  } = useHomeData();

  const handleSelectTrip = async (tripId: string) => {
    await loadTrip(tripId);
    router.push('/');
  };

  const handleOpenStandings = useCallback(() => {
    router.push('/standings');
  }, [router]);

  const handleOpenSchedule = useCallback(() => {
    router.push('/schedule?view=all');
  }, [router]);

  const handleEnterScore = useCallback(() => {
    if (userMatchData?.match) {
      router.push(`/score/${userMatchData.match.id}`);
    }
  }, [router, userMatchData]);

  const handleInviteFriends = useCallback(async () => {
    if (!activeTrip) return;
    const shareCode = await ensureTripShareCode(activeTrip.id);
    if (!shareCode) {
      showToast('info', 'Unable to publish a trip invite right now. Check cloud sync and try again.');
      router.push('/captain/invites');
      return;
    }

    const result = await shareTrip(activeTrip.name, shareCode);
    if (result.shared && result.method === 'clipboard') {
      // User will see the system share sheet for 'native', only show toast for clipboard
      // No-op: the clipboard copy is its own confirmation
    }
  }, [activeTrip, router, showToast]);

  const hasTrips = trips && trips.length > 0;
  const pastTrips = trips?.filter((t) => t.id !== activeTrip?.id) || [];
  const liveMatchesCount = liveMatches?.length || 0;

  const scoreNarrative = useMemo(() => {
    if (!standings) return undefined;

    const diff = Math.abs(standings.teamAPoints - standings.teamBPoints);
    if (diff === 0) return 'All square';

    const leader =
      standings.teamAPoints > standings.teamBPoints ? teamAName || 'USA' : teamBName || 'Europe';

    return `${leader} leads by ${diff} point${diff !== 1 ? 's' : ''}`;
  }, [standings, teamAName, teamBName]);

  const tripStateLabel = useMemo(() => {
    if (!activeTrip) return null;

    const now = homeClock;
    const start = new Date(activeTrip.startDate).getTime();
    const end = new Date(activeTrip.endDate).getTime();

    if (now < start) return 'Upcoming';
    if (now > end) return 'Completed';
    if (liveMatchesCount > 0) return 'Live Scoring';
    return 'Trip Live';
  }, [activeTrip, homeClock, liveMatchesCount]);

  const headerSubtitle = activeTrip
    ? (scoreNarrative ?? activeTrip.name)
    : hasTrips
      ? 'Select a trip to get started'
      : 'Your daily edition';

  // Loading state
  if (isLoading) {
    return <PageLoadingSkeleton title="Home" showBackButton={false} variant="default" />;
  }

  return (
    <>
      <div className="min-h-screen page-premium-enter texture-grain bg-[var(--canvas)]">
      <JoinTripModal
        isOpen={showJoinTrip}
        onClose={() => {
          setShowJoinTrip(false);
          setPendingJoinCode(undefined);
        }}
        onSuccess={() => {
          setShowJoinTrip(false);
          setPendingJoinCode(undefined);
          router.push('/');
        }}
        initialCode={pendingJoinCode}
      />
      <WhatsNew />

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
          <div className="pt-[var(--space-8)] space-y-[var(--space-6)]">
            <section>
              <div className="overflow-hidden rounded-[2rem] border border-[var(--rule)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--canvas)_88%,white)_0%,color-mix(in_srgb,var(--canvas-warm)_94%,white)_100%)] shadow-[0_22px_48px_rgba(46,34,18,0.08)]">
                <div className="border-b border-[color:var(--rule)]/80 px-[var(--space-5)] py-[var(--space-5)]">
                  <div className="flex items-start justify-between gap-[var(--space-4)]">
                    <div className="min-w-0">
                      <p className="type-overline tracking-[0.18em] text-[var(--ink-tertiary)]">
                        TODAY&apos;S MATCH BOOK
                      </p>
                      <h1 className="type-display mt-[var(--space-2)] text-[var(--ink)]">
                        {activeTrip.name}
                      </h1>
                    </div>

                    <div className="shrink-0 rounded-full border border-[var(--rule)] bg-[rgba(255,255,255,0.72)] px-[var(--space-3)] py-[var(--space-2)] text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--masters-deep)]">
                      {tripStateLabel}
                    </div>
                  </div>

                  <div className="mt-[var(--space-4)] flex flex-wrap gap-[var(--space-2)]">
                    <HeroMetaPill icon={<Calendar size={13} strokeWidth={1.7} />}>
                      {formatDate(new Date())}
                    </HeroMetaPill>
                    {activeTrip.location && (
                      <HeroMetaPill icon={<MapPin size={13} strokeWidth={1.7} />}>
                        {activeTrip.location}
                      </HeroMetaPill>
                    )}
                    <HeroMetaPill icon={<Trophy size={13} strokeWidth={1.7} />}>
                      {scoreNarrative ?? 'Trip in motion'}
                    </HeroMetaPill>
                  </div>
                </div>

                <div className="px-[var(--space-5)] py-[var(--space-6)]">
                  {standings ? (
                    <button
                      onClick={handleOpenStandings}
                      className="w-full border-none bg-transparent p-0 text-left press-scale cursor-pointer"
                    >
                      <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-[var(--space-4)]">
                        <div className="rounded-[1.5rem] border border-[color:var(--team-usa)]/16 bg-[linear-gradient(180deg,rgba(27,59,119,0.08),rgba(255,255,255,0.62))] px-[var(--space-4)] py-[var(--space-5)] text-center">
                          <span className="team-dot team-dot-lg team-dot-usa inline-block mb-[var(--space-3)]" />
                          <p
                            className="score-monumental"
                            style={{
                              color:
                                standings.teamAPoints >= standings.teamBPoints
                                  ? 'var(--team-usa)'
                                  : 'var(--ink-tertiary)',
                            }}
                          >
                            {standings.teamAPoints}
                          </p>
                          <p className="type-overline mt-[var(--space-3)] text-[var(--team-usa)]">
                            {teamAName || 'USA'}
                          </p>
                        </div>

                        <div className="pb-[var(--space-5)] text-center">
                          <p className="type-overline text-[var(--ink-faint)]">MATCH</p>
                          <div className="mt-[var(--space-2)] font-serif text-[2rem] italic text-[var(--ink-faint)]">
                            –
                          </div>
                        </div>

                        <div className="rounded-[1.5rem] border border-[color:var(--team-europe)]/16 bg-[linear-gradient(180deg,rgba(160,42,63,0.08),rgba(255,255,255,0.62))] px-[var(--space-4)] py-[var(--space-5)] text-center">
                          <span className="team-dot team-dot-lg team-dot-europe inline-block mb-[var(--space-3)]" />
                          <p
                            className="score-monumental"
                            style={{
                              color:
                                standings.teamBPoints > standings.teamAPoints
                                  ? 'var(--team-europe)'
                                  : 'var(--ink-tertiary)',
                            }}
                          >
                            {standings.teamBPoints}
                          </p>
                          <p className="type-overline mt-[var(--space-3)] text-[var(--team-europe)]">
                            {teamBName || 'EUR'}
                          </p>
                        </div>
                      </div>

                      <div className="mt-[var(--space-5)] flex flex-wrap items-center justify-between gap-[var(--space-4)] rounded-[1.25rem] border border-[var(--rule)] bg-[rgba(255,255,255,0.65)] px-[var(--space-4)] py-[var(--space-4)]">
                        <div>
                          <p className="type-overline text-[var(--ink-tertiary)]">State of Play</p>
                          <p className="mt-[var(--space-1)] font-serif text-[1.35rem] italic text-[var(--ink)]">
                            {scoreNarrative ?? 'All square'}
                          </p>
                        </div>

                        <div className="flex items-center gap-[var(--space-3)]">
                          <HeroMetaStat label="Live" value={liveMatchesCount} />
                          <HeroMetaStat label="Players" value={players.length} />
                          <div className="flex items-center gap-[var(--space-2)] text-[var(--masters)] font-medium text-sm">
                            <span>View leaderboard</span>
                            <ChevronRight size={16} strokeWidth={2} />
                          </div>
                        </div>
                      </div>
                    </button>
                  ) : (
                    <button
                      onClick={handleOpenSchedule}
                      className="w-full border-none bg-transparent p-0 text-left press-scale cursor-pointer"
                    >
                      <div className="rounded-[1.5rem] border border-[var(--rule)] bg-[rgba(255,255,255,0.64)] px-[var(--space-5)] py-[var(--space-6)]">
                        <p className="type-overline text-[var(--ink-tertiary)]">Trip Status</p>
                        <h2 className="mt-[var(--space-2)] font-serif text-[clamp(1.9rem,7vw,2.6rem)] italic leading-[1.05] text-[var(--ink)]">
                          {tripStateLabel === 'Upcoming'
                            ? 'Everything is set before the opening tee time.'
                            : tripStateLabel === 'Completed'
                              ? 'The trip is complete. Review the board and the record.'
                              : 'Your trip is live. The first scorecard is still waiting.'}
                        </h2>
                        <p className="mt-[var(--space-3)] type-body-sm text-[var(--ink-secondary)]">
                          Open the schedule, matchups, and trip tools from one home screen.
                        </p>
                        <div className="mt-[var(--space-6)] inline-flex items-center gap-[var(--space-2)] rounded-full border border-[var(--rule)] bg-[var(--canvas)] px-[var(--space-4)] py-[var(--space-2)] text-[var(--masters)] font-medium text-sm">
                          <span>Open schedule</span>
                          <ChevronRight size={16} strokeWidth={2} />
                        </div>
                      </div>
                    </button>
                  )}
                </div>
              </div>
            </section>

            <TripDashboardSections
              trip={activeTrip}
              standings={standings}
              userMatchData={userMatchData}
              currentUserPlayer={currentUserPlayer}
              tripPlayerLink={tripPlayerLink}
              players={players}
              sessions={tripSessions}
              matches={tripMatches}
              sideBets={sideBets}
              banterPosts={banterPosts}
              tripAwards={tripAwards}
              teamAName={teamAName}
              teamBName={teamBName}
              isCaptainMode={isCaptainMode}
            />

            {/* YOUR MATCH — If user has an active match */}
            {userMatchData && currentUserPlayer && (
              <section className="rounded-[1.5rem] border border-[var(--rule)] bg-[var(--canvas-raised)] px-[var(--space-5)] py-[var(--space-5)] shadow-[0_12px_30px_rgba(46,34,18,0.05)]">
                <HomeSectionHeader eyebrow="Your Match" title="Your card is on the clock." />
                <div className="mt-[var(--space-4)]">
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
                </div>
              </section>
            )}

            {/* LIVE NOW — Clean text list */}
            {liveMatchesCount > 0 && liveMatches && !userMatchData && (
              <section className="rounded-[1.5rem] border border-[var(--rule)] bg-[var(--canvas-raised)] px-[var(--space-5)] py-[var(--space-5)] shadow-[0_12px_30px_rgba(46,34,18,0.05)]">
                <HomeSectionHeader
                  eyebrow="Live Now"
                  title={`${liveMatchesCount} match${liveMatchesCount !== 1 ? 'es' : ''} shaping the board.`}
                  action={
                    <Link
                      href="/live"
                      className="type-caption flex items-center gap-[var(--space-1)] text-[var(--masters)] no-underline"
                    >
                      Watch <Tv size={14} />
                    </Link>
                  }
                />
              </section>
            )}

            {/* SETUP GUIDE — For captains until setup is complete */}
            {isCaptainMode && sessions.length === 0 && (
              <section className="rounded-[1.5rem] border border-[color:var(--maroon-subtle)] bg-[linear-gradient(180deg,rgba(91,35,51,0.03),rgba(255,255,255,0.72))] px-[var(--space-5)] py-[var(--space-5)] shadow-[0_12px_30px_rgba(91,35,51,0.08)]">
                <HomeSectionHeader
                  eyebrow={
                    <span className="inline-flex items-center gap-[var(--space-1)] text-[var(--maroon)]">
                      <Shield size={12} className="align-middle" />
                      Captain Setup
                    </span>
                  }
                  title="Build the trip before the first shot is struck."
                />
                <div className="mt-[var(--space-4)]">
                  <div className="card-captain">
                    {(() => {
                      const steps = [players.length >= 4, teams.length >= 2 && teamMembers.length >= 4, sessions.length > 0];
                      const done = steps.filter(Boolean).length;
                      const pct = Math.round((done / steps.length) * 100);
                      return (
                        <>
                          <div className="flex items-center gap-[var(--space-3)] mb-[var(--space-4)]">
                            <p className="type-title-sm flex-1">Get Your Trip Ready</p>
                            <span className="type-micro font-semibold text-[var(--masters)]">{pct}%</span>
                          </div>
                          <div className="h-1 rounded-full mb-[var(--space-4)] bg-[var(--canvas-sunken)]" style={{ overflow: 'hidden' }}>
                            <div className="h-full rounded-full bg-[var(--masters)] transition-all duration-500" style={{ width: `${pct}%` }} />
                          </div>
                        </>
                      );
                    })()}
                    <div className="flex flex-col gap-[var(--space-2)]">
                      <SetupStep number={1} label="Add Players" done={players.length >= 4} href="/players" hint={`${players.length} added — need at least 4`} />
                      <SetupStep number={2} label="Assign Teams" done={teams.length >= 2 && teamMembers.length >= 4} href="/captain/draft" hint="Draft players to teams" />
                      <SetupStep number={3} label="Create First Session" done={sessions.length > 0} href="/lineup/new?mode=session" hint="Set up matchups" />
                    </div>

                    {/* Prominent invite CTA after setup steps */}
                    {players.length >= 2 && (
                      <button
                        onClick={handleInviteFriends}
                        className="mt-[var(--space-4)] w-full flex items-center justify-center gap-[var(--space-2)] py-[var(--space-3)] px-[var(--space-4)] rounded-xl font-medium text-[var(--text-sm)] bg-[var(--surface)] border border-[var(--rule)] text-[var(--ink)] press-scale"
                      >
                        <Share2 size={16} className="text-[var(--masters)]" />
                        Share invite link with your group
                      </button>
                    )}
                  </div>
                </div>
              </section>
            )}

            {/* NON-CAPTAIN GUIDANCE — Show when not captain and no sessions exist */}
            {!isCaptainMode && sessions.length === 0 && players.length > 0 && (
              <section className="rounded-[1.5rem] border border-[var(--rule)] bg-[var(--canvas-raised)] px-[var(--space-5)] py-[var(--space-5)] shadow-[0_12px_30px_rgba(46,34,18,0.05)]">
                <HomeSectionHeader eyebrow="Clubhouse Note" title="The trip is set up; the pairings are not." />
                <div className="mt-[var(--space-4)]">
                  <div className="card-editorial" style={{ padding: 'var(--space-5)', display: 'flex', alignItems: 'flex-start', gap: 'var(--space-4)' }}>
                    <Shield size={20} strokeWidth={1.5} className="text-[var(--masters)] shrink-0 mt-0.5" />
                    <div>
                      <p className="type-title-sm" style={{ marginBottom: 'var(--space-1)' }}>
                        Your captain is setting things up
                      </p>
                      <p className="type-caption text-[var(--ink-secondary)]">
                        Sessions and matchups will appear here once your captain creates the lineup. Hang tight!
                      </p>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* CAPTAIN QUICK TOOLS */}
            {isCaptainMode && (
              <section className="rounded-[1.5rem] border border-[color:var(--maroon-subtle)] bg-[linear-gradient(180deg,rgba(91,35,51,0.03),rgba(255,255,255,0.72))] px-[var(--space-5)] py-[var(--space-5)] shadow-[0_12px_30px_rgba(91,35,51,0.08)]">
                <HomeSectionHeader
                  eyebrow={
                    <span className="inline-flex items-center gap-[var(--space-1)] text-[var(--maroon)]">
                      <Shield size={12} className="align-middle" />
                      Captain Tools
                    </span>
                  }
                  title="Keep the day moving."
                  action={
                    <Link
                      href="/captain"
                      className="type-caption flex items-center gap-[var(--space-1)] text-[var(--maroon)] no-underline"
                    >
                      All Tools <ChevronRight size={14} />
                    </Link>
                  }
                />
                <div className="mt-[var(--space-4)] grid grid-cols-2 gap-[var(--space-3)] sm:grid-cols-4">
                    <Link href="/lineup/new" className="quick-action-btn press-scale no-underline border-[var(--maroon-subtle)]">
                      <Users size={18} className="text-[var(--maroon)]" />
                      <span className="type-micro text-[var(--ink)]">Lineup</span>
                    </Link>
                    <Link href="/captain/checklist" className="quick-action-btn press-scale no-underline border-[var(--maroon-subtle)]">
                      <ClipboardCheck size={18} className="text-[var(--maroon)]" />
                      <span className="type-micro text-[var(--ink)]">Pre-Flight</span>
                    </Link>
                    <Link href="/players" className="quick-action-btn press-scale no-underline border-[var(--maroon-subtle)]">
                      <Users size={18} className="text-[var(--maroon)]" />
                      <span className="type-micro text-[var(--ink)]">Players</span>
                    </Link>
                    <button onClick={handleInviteFriends} className="quick-action-btn press-scale border-[var(--maroon-subtle)]">
                      <Share2 size={18} className="text-[var(--maroon)]" />
                      <span className="type-micro text-[var(--ink)]">Invite</span>
                    </button>
                </div>
              </section>
            )}
          </div>
        )}

        {/* ── TOURNAMENT ARCHIVE ── */}
        <section className={`${activeTrip ? 'pt-[var(--space-6)]' : 'pt-[var(--space-10)]'} pb-[var(--space-10)]`}>
          <div className="flex items-center justify-between mb-[var(--space-6)]">
            <h2 className="type-overline tracking-[0.15em]">
              {hasTrips ? (activeTrip ? 'Other Trips' : 'Tournaments') : 'Get Started'}
            </h2>
            {hasTrips && (
              <button
                onClick={() => router.push('/trip/new')}
                className="btn-premium press-scale flex items-center gap-[var(--space-2)] px-[var(--space-4)] py-[var(--space-2)] rounded-full text-sm min-h-[44px]"
              >
                <Plus size={14} strokeWidth={2.5} />
                New
              </button>
            )}
          </div>

          {pastTrips.length > 0 ? (
            <div className="flex flex-col gap-[var(--space-3)]">
              {pastTrips.map((trip) => (
                <button
                  key={trip.id}
                  onClick={() => handleSelectTrip(trip.id)}
                  className="card-editorial card-interactive w-full text-left flex items-center gap-[var(--space-4)] border border-[var(--rule)] p-[var(--space-5)]"
                >
                  {/* Tournament Icon */}
                  <div className="w-12 h-12 rounded-[var(--radius-lg)] bg-[linear-gradient(135deg,var(--masters)_0%,var(--masters-deep)_100%)] flex items-center justify-center shrink-0">
                    <Trophy size={22} className="text-[var(--gold)]" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="type-title-sm font-semibold">{trip.name}</p>

                    <div className="type-caption flex items-center gap-[var(--space-3)] mt-[var(--space-1)]">
                      {trip.location && (
                        <span className="flex items-center gap-[var(--space-1)] min-w-0">
                          <MapPin
                            size={12}
                            strokeWidth={1.5}
                            className="text-[var(--ink-tertiary)] shrink-0"
                          />
                          <span className="truncate">{trip.location}</span>
                        </span>
                      )}

                      <span className="flex items-center gap-[var(--space-1)]">
                        <Calendar
                          size={12}
                          strokeWidth={1.5}
                          className="text-[var(--ink-tertiary)]"
                        />
                        {formatDate(trip.startDate, 'short')}
                      </span>
                    </div>
                  </div>

                  <ChevronRight
                    size={18}
                    strokeWidth={1.5}
                    className="text-[var(--ink-tertiary)] shrink-0"
                  />
                </button>
              ))}
            </div>
          ) : !activeTrip ? (
            <NoTournamentsEmpty
              createHref="/trip/new"
              onCreateTrip={() => router.push('/trip/new')}
              onJoinTrip={() => setShowJoinTrip(true)}
            />
          ) : null}
        </section>
      </main>

      <FirstLaunchWalkthrough />
    </div>
    </>
  );
}

function HeroMetaPill({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="inline-flex items-center gap-[var(--space-2)] rounded-full border border-[var(--rule)] bg-[rgba(255,255,255,0.72)] px-[var(--space-3)] py-[var(--space-2)] text-[var(--text-xs)] font-medium text-[var(--ink-secondary)]">
      <span className="text-[var(--masters)]">{icon}</span>
      <span>{children}</span>
    </div>
  );
}

function HeroMetaStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-[1rem] border border-[var(--rule)] bg-[var(--canvas)] px-[var(--space-3)] py-[var(--space-2)] text-center">
      <p className="type-micro uppercase tracking-[0.14em] text-[var(--ink-tertiary)]">{label}</p>
      <p className="mt-[2px] font-serif text-[1.2rem] italic text-[var(--ink)]">{value}</p>
    </div>
  );
}

function HomeSectionHeader({
  eyebrow,
  title,
  action,
}: {
  eyebrow: React.ReactNode;
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-[var(--space-4)]">
      <div className="min-w-0">
        <p className="type-overline tracking-[0.15em] text-[var(--ink-tertiary)]">{eyebrow}</p>
        <h2 className="mt-[var(--space-2)] font-serif text-[clamp(1.45rem,5vw,2rem)] italic leading-[1.08] text-[var(--ink)]">
          {title}
        </h2>
      </div>
      {action && <div className="shrink-0 pt-[2px]">{action}</div>}
    </div>
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
      className={`flex items-center gap-[var(--space-3)] p-[var(--space-3)] rounded-[var(--radius-md)] no-underline text-[var(--ink)] transition-[background] duration-fast ease-out ${
        done
          ? 'bg-[var(--masters-subtle)] border border-[rgba(0,102,68,0.2)]'
          : 'bg-[var(--canvas-sunken)] border border-[var(--rule)]'
      }`}
    >
      <div
        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
          done
            ? 'bg-[var(--masters)] text-[var(--canvas)]'
            : 'bg-[var(--rule)] text-[var(--ink-tertiary)]'
        }`}
      >
        {done ? '✓' : number}
      </div>
      <div className="flex-1">
        <p className={`type-title-sm ${done ? 'text-[var(--masters)]' : 'text-[var(--ink)]'}`}>{label}</p>
        {hint && <p className="type-micro mt-[2px]">{hint}</p>}
      </div>
      <ChevronRight size={14} className={done ? 'text-[var(--masters)]' : 'text-[var(--ink-tertiary)]'} />
    </Link>
  );
}
