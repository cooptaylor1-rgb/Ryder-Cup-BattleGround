'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FirstLaunchWalkthrough } from '@/components/FirstLaunchWalkthrough';
import { useTripStore, useAccessStore, useToastStore } from '@/lib/stores';
import { useShallow } from 'zustand/shallow';
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
import { Button } from '@/components/ui/Button';
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
import { HeroMetaPill, HeroMetaStat, HomeSectionHeader, SetupStep } from './HomeSharedComponents';
import { TripCard } from './TripCard';

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
  const { loadTrip, players, teams, teamMembers, sessions } = useTripStore(useShallow(s => ({ loadTrip: s.loadTrip, players: s.players, teams: s.teams, teamMembers: s.teamMembers, sessions: s.sessions })));
  const { isCaptainMode } = useAccessStore(useShallow(s => ({ isCaptainMode: s.isCaptainMode })));
  const { showToast } = useToastStore(useShallow(s => ({ showToast: s.showToast })));
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
  };

  const handleOpenStandings = useCallback(async () => {
    // Ensure the trip store's currentTrip matches the trip displayed on the
    // home page before navigating. Without this the standings page can fall
    // back to a stale currentTrip and render a different trip than the one
    // the user just tapped through from.
    if (activeTrip && activeTrip.id) {
      await loadTrip(activeTrip.id);
    }
    router.push('/standings');
  }, [router, activeTrip, loadTrip]);

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
        rightSlot={
          <div className="flex items-center gap-1">
            {/* Persistent "New Trip" action — the most important captain
                action should never be more than one tap from home,
                whether there's an active trip or not. */}
            <Link
              href="/trip/new"
              aria-label="Create a new trip"
              title="Create a new trip"
              className="press-scale p-2 rounded-[var(--radius-md)] text-[var(--ink-secondary)] hover:bg-[var(--canvas-sunken)] transition-colors"
            >
              <Plus size={20} strokeWidth={1.75} />
            </Link>
            {hasTrips ? <CaptainToggle /> : null}
          </div>
        }
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
                  {activeTrip.isPracticeRound ? (
                    <button
                      onClick={handleOpenSchedule}
                      className="w-full border-none bg-transparent p-0 text-left press-scale cursor-pointer"
                    >
                      <div className="rounded-[1.5rem] border border-[var(--rule)] bg-[rgba(255,255,255,0.64)] px-[var(--space-5)] py-[var(--space-6)]">
                        <p className="type-overline text-[var(--ink-tertiary)]">Practice Round</p>
                        <h2 className="mt-[var(--space-2)] font-serif text-[clamp(1.9rem,7vw,2.6rem)] italic leading-[1.05] text-[var(--ink)]">
                          Casual pairings. No cup on the line.
                        </h2>
                        <p className="mt-[var(--space-3)] type-body-sm text-[var(--ink-secondary)]">
                          Use the schedule to set pairings, track scores, and keep things loose.
                        </p>
                        <div className="mt-[var(--space-5)] flex flex-wrap items-center gap-[var(--space-3)] text-sm">
                          <HeroMetaStat label="Live" value={liveMatchesCount} />
                          <HeroMetaStat label="Players" value={players.length} />
                          <div className="ml-auto inline-flex items-center gap-[var(--space-2)] rounded-full border border-[var(--rule)] bg-[var(--canvas)] px-[var(--space-4)] py-[var(--space-2)] text-[var(--masters)] font-medium">
                            <span>Open schedule</span>
                            <ChevronRight size={16} strokeWidth={2} />
                          </div>
                        </div>
                      </div>
                    </button>
                  ) : standings ? (
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

            {/* SETUP GUIDE — Shown to captains until the trip is fully
                cup-ready. Previously it disappeared after the first
                session was created, but captains still need to publish
                lineups and assign courses before the trip can actually
                run. The extended checklist gives a captain one place
                to see "what's left" at any point in setup. */}
            {(() => {
              if (!isCaptainMode) return null;

              const hasPlayers = players.length >= 4;
              const hasTeams = teams.length >= 2 && teamMembers.length >= 4;
              const hasSessions = sessions.length > 0;
              const hasMatches = tripMatches.length > 0;
              const hasCourses = tripMatches.length > 0 && tripMatches.every((m) => Boolean(m.courseId));

              const steps = [hasPlayers, hasTeams, hasSessions, hasMatches, hasCourses];
              const done = steps.filter(Boolean).length;
              const allDone = done === steps.length;

              // Once every step is checked, the guide hides — the trip
              // is ready to run. Any regression (e.g. captain deletes a
              // course) brings it back automatically.
              if (allDone) return null;

              const pct = Math.round((done / steps.length) * 100);

              return (
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
                      <div className="flex items-center gap-[var(--space-3)] mb-[var(--space-4)]">
                        <p className="type-title-sm flex-1">Get Your Trip Ready</p>
                        <span className="type-micro font-semibold text-[var(--masters)]">
                          {done} / {steps.length} · {pct}%
                        </span>
                      </div>
                      <div className="h-1 rounded-full mb-[var(--space-4)] bg-[var(--canvas-sunken)]" style={{ overflow: 'hidden' }}>
                        <div className="h-full rounded-full bg-[var(--masters)] transition-all duration-500" style={{ width: `${pct}%` }} />
                      </div>

                      <div className="flex flex-col gap-[var(--space-2)]">
                        <SetupStep
                          number={1}
                          label="Add Players"
                          done={hasPlayers}
                          href="/players"
                          hint={hasPlayers ? `${players.length} on the roster` : `${players.length} added — need at least 4`}
                        />
                        <SetupStep
                          number={2}
                          label="Assign Teams"
                          done={hasTeams}
                          href="/players?panel=draft"
                          hint={hasTeams ? 'Both sides have players' : 'Draft players to teams'}
                        />
                        <SetupStep
                          number={3}
                          label="Create First Session"
                          done={hasSessions}
                          href="/lineup/new?mode=session"
                          hint={hasSessions ? `${sessions.length} session${sessions.length === 1 ? '' : 's'} scheduled` : 'Set up rounds and formats'}
                        />
                        <SetupStep
                          number={4}
                          label="Publish a Lineup"
                          done={hasMatches}
                          href="/lineup/new"
                          hint={hasMatches ? `${tripMatches.length} match${tripMatches.length === 1 ? '' : 'es'} on the board` : 'Pair players into matches'}
                        />
                        <SetupStep
                          number={5}
                          label="Assign Courses"
                          done={hasCourses}
                          href="/captain/manage"
                          hint={hasCourses
                            ? 'Every match has a course'
                            : hasMatches
                              ? `${tripMatches.filter((m) => !m.courseId).length} match${tripMatches.filter((m) => !m.courseId).length === 1 ? '' : 'es'} still need a course`
                              : 'Needed before matches can be scored with handicaps'}
                        />
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
              );
            })()}

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

        {/* ── TOURNAMENT ARCHIVE ──
            When there's an active trip we keep the home page focused on today
            and move the full archive to /trips, exposing just a compact "All
            trips" link here. When there's no active trip the home page is the
            only place to pick or create one, so the full list stays visible. */}
        {activeTrip ? (
          pastTrips.length > 0 ? (
            <section className="pt-[var(--space-6)] pb-[var(--space-10)]">
              <Link
                href="/trips"
                className="card-editorial card-interactive border border-[var(--rule)] no-underline flex items-center justify-between px-[var(--space-5)] py-[var(--space-4)] rounded-[var(--radius-xl)]"
              >
                <div>
                  <p className="type-overline tracking-[0.15em] text-[var(--ink-tertiary)]">
                    Other Trips
                  </p>
                  <p className="type-title-sm mt-[var(--space-1)] text-[var(--ink)]">
                    {pastTrips.length} {pastTrips.length === 1 ? 'trip' : 'trips'} in the archive
                  </p>
                </div>
                <ChevronRight
                  size={22}
                  strokeWidth={1.5}
                  className="text-[var(--masters)] shrink-0"
                />
              </Link>
            </section>
          ) : null
        ) : (
          <section className="pt-[var(--space-10)] pb-[var(--space-10)]">
            <div className="flex items-center justify-between mb-[var(--space-6)]">
              <h2 className="type-overline tracking-[0.15em]">
                {hasTrips ? 'Tournaments' : 'Get Started'}
              </h2>
              {hasTrips && (
                <Button
                  variant="primary"
                  onClick={() => router.push('/trip/new')}
                  leftIcon={<Plus size={14} strokeWidth={2.5} />}
                  className="press-scale rounded-full text-sm min-h-[44px]"
                >
                  New
                </Button>
              )}
            </div>

            {pastTrips.length > 0 ? (
              <div className="flex flex-col gap-[var(--space-3)]">
                {pastTrips.map((trip) => (
                  <TripCard
                    key={trip.id}
                    trip={trip}
                    onSelect={handleSelectTrip}
                    tag={trip.isPracticeRound ? 'Practice' : undefined}
                  />
                ))}
              </div>
            ) : (
              <NoTournamentsEmpty
                createHref="/trip/new"
                onCreateTrip={() => router.push('/trip/new')}
                onJoinTrip={() => setShowJoinTrip(true)}
              />
            )}
          </section>
        )}
      </main>

      <FirstLaunchWalkthrough />
    </div>
    </>
  );
}
