'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FirstLaunchWalkthrough } from '@/components/FirstLaunchWalkthrough';
import { useTripStore, useAccessStore, useToastStore } from '@/lib/stores';
import { useShallow } from 'zustand/shallow';
import { useHomeData } from '@/lib/hooks/useHomeData';
import { ensureTripShareCode } from '@/lib/services/tripSyncService';
import { ChevronRight, MapPin, Calendar, Plus, Trophy, Shield, Tv } from 'lucide-react';
import { formatDate, parseDateInLocalZone } from '@/lib/utils';
import { shareTrip } from '@/lib/utils/share';
import { Button } from '@/components/ui/Button';
import { useState, useCallback, useEffect, useMemo } from 'react';
import {
  ContinueScoringBanner,
  NoTournamentsEmpty,
  WhatsNew,
  YourMatchCard,
  CaptainToggle,
  PageLoadingSkeleton,
} from '@/components/ui';
import { JoinTripModal } from '@/components/ui/JoinTripModal';
import { PageHeader } from '@/components/layout';
import { TripDashboardSections } from './TripDashboardSections';
import { HeroMetaPill, HeroMetaStat, HomeSectionHeader } from './HomeSharedComponents';
import { TripCard } from './TripCard';
import { CaptainSetupGuide } from './CaptainSetupGuide';
import { EventDayPreFlightBanner } from './EventDayPreFlightBanner';
import { TeamLogo } from '@/components/team/TeamLogo';

function readPendingJoinCode(): string | undefined {
  if (typeof window === 'undefined') {
    return undefined;
  }

  return sessionStorage.getItem('pendingJoinCode') ?? undefined;
}

function readPendingJoinInviteId(): string | undefined {
  if (typeof window === 'undefined') {
    return undefined;
  }

  return sessionStorage.getItem('pendingJoinInviteId') ?? undefined;
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
  const { loadTrip, players, teams, teamMembers, sessions } = useTripStore(
    useShallow((s) => ({
      loadTrip: s.loadTrip,
      players: s.players,
      teams: s.teams,
      teamMembers: s.teamMembers,
      sessions: s.sessions,
    }))
  );
  const { isCaptainMode } = useAccessStore(useShallow((s) => ({ isCaptainMode: s.isCaptainMode })));
  const { showToast } = useToastStore(useShallow((s) => ({ showToast: s.showToast })));
  const [pendingJoinCode, setPendingJoinCode] = useState<string | undefined>(readPendingJoinCode);
  const [pendingJoinInviteId, setPendingJoinInviteId] = useState<string | undefined>(
    readPendingJoinInviteId
  );
  const [showJoinTrip, setShowJoinTrip] = useState(() => !!readPendingJoinCode());
  const [homeClock] = useState(() => Date.now());

  // Check for a pending join code from /join deep link
  useEffect(() => {
    if (pendingJoinCode) {
      sessionStorage.removeItem('pendingJoinCode');
    }
    if (pendingJoinInviteId) {
      sessionStorage.removeItem('pendingJoinInviteId');
    }
  }, [pendingJoinCode, pendingJoinInviteId]);

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
    teamAIcon,
    teamBIcon,
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
      showToast(
        'info',
        'Unable to publish a trip invite right now. Check cloud sync and try again.'
      );
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
    // Trip start/end are stored as local date-only strings. new Date() on
    // those parses as UTC midnight, which in any negative-UTC zone shifts
    // the comparison back a day — a trip starting "tomorrow" could already
    // read as Upcoming→Live on the wrong calendar day. parseDateInLocalZone
    // anchors to local midnight to match the captain's intent.
    const start = parseDateInLocalZone(activeTrip.startDate).getTime();
    const end = parseDateInLocalZone(activeTrip.endDate).getTime();

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
            setPendingJoinInviteId(undefined);
          }}
          onSuccess={() => {
            setShowJoinTrip(false);
            setPendingJoinCode(undefined);
            setPendingJoinInviteId(undefined);
            router.push('/');
          }}
          initialCode={pendingJoinCode}
          initialInviteId={pendingJoinInviteId}
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
                className="press-scale p-2 rounded-[var(--radius-md)] border border-[color:var(--rule)] bg-[var(--canvas-raised)] text-[var(--masters-deep)] shadow-[0_2px_8px_rgba(26,24,21,0.05)] hover:bg-[var(--masters-subtle)] hover:border-[color:var(--masters)]/25 transition-colors"
              >
                <Plus size={20} strokeWidth={1.75} />
              </Link>
              {hasTrips ? <CaptainToggle /> : null}
            </div>
          }
        />

        <main className="container-editorial">
          {/*
            Top-of-home action stack — ordered for cold-start. When a
            captain unlocks their phone at the 5th tee Thursday and
            opens the app, the first thing they should see is a
            one-tap path back to scoring (no scrolling past the big
            hero card). Pre-flight comes first only on event-day
            morning before the first tee, when scoring hasn't started
            yet — once an active match exists the resume banner takes
            the spot.

            Both surfaces auto-hide when not relevant.
          */}
          <div className="pt-[var(--space-6)] space-y-[var(--space-3)]">
            {userMatchData?.match ? (
              <ContinueScoringBanner
                match={userMatchData.match}
                matchState={userMatchData.matchState ?? undefined}
              />
            ) : null}
            <EventDayPreFlightBanner />
          </div>

          {/* ── ACTIVE TOURNAMENT ── */}
          {activeTrip && (
            <div className="pt-[var(--space-8)] space-y-[var(--space-6)]">
              <section>
                <div className="overflow-hidden rounded-[2rem] border border-[var(--rule)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--canvas)_88%,white)_0%,color-mix(in_srgb,var(--canvas-warm)_94%,white)_100%)] shadow-[0_22px_48px_rgba(46,34,18,0.08)]">
                  <div className="border-b border-[color:var(--rule)]/80 px-[var(--space-5)] py-[var(--space-5)]">
                    <div className="flex items-start justify-between gap-[var(--space-4)]">
                      <div className="min-w-0">
                        {/* Eyebrow's job is orientation, not theme.
                          Plain "YOUR TRIP" beats editorial copy here
                          because users scan for "which section is
                          today's trip?" — not for clever framing. */}
                        <p className="type-overline tracking-[0.18em] text-[var(--ink-tertiary)]">
                          YOUR TRIP
                        </p>
                        <h1 className="type-display mt-[var(--space-2)] text-[var(--ink)]">
                          {activeTrip.name}
                        </h1>
                      </div>

                      <div className="shrink-0 rounded-full border border-[var(--rule)] bg-[rgba(255,255,255,0.8)] px-[var(--space-3)] py-[var(--space-2)] text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--masters-deep)] shadow-[0_4px_10px_rgba(26,24,21,0.06)]">
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
                          <div className="rounded-[1.5rem] border border-[color:var(--team-usa)]/16 bg-[linear-gradient(180deg,rgba(27,59,119,0.08),rgba(255,255,255,0.62))] px-[var(--space-4)] py-[var(--space-5)] text-center shadow-[0_12px_24px_rgba(27,59,119,0.08)]">
                            {teamAIcon ? (
                              <TeamLogo
                                src={teamAIcon}
                                alt={teamAName || 'Team A'}
                                size={160}
                                rounded={false}
                                className="mb-[var(--space-3)]"
                              />
                            ) : (
                              <span className="team-dot team-dot-lg team-dot-usa inline-block mb-[var(--space-3)]" />
                            )}
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

                          <div className="rounded-[1.5rem] border border-[color:var(--team-europe)]/16 bg-[linear-gradient(180deg,rgba(160,42,63,0.08),rgba(255,255,255,0.62))] px-[var(--space-4)] py-[var(--space-5)] text-center shadow-[0_12px_24px_rgba(114,47,55,0.08)]">
                            {teamBIcon ? (
                              <TeamLogo
                                src={teamBIcon}
                                alt={teamBName || 'Team B'}
                                size={160}
                                rounded={false}
                                className="mb-[var(--space-3)]"
                              />
                            ) : (
                              <span className="team-dot team-dot-lg team-dot-europe inline-block mb-[var(--space-3)]" />
                            )}
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

                        <div className="mt-[var(--space-5)] flex flex-wrap items-center justify-between gap-[var(--space-4)] rounded-[1.25rem] border border-[var(--rule)] bg-[rgba(255,255,255,0.7)] px-[var(--space-4)] py-[var(--space-4)] shadow-[0_10px_22px_rgba(26,24,21,0.05)]">
                          <div>
                            <p className="type-overline text-[var(--ink-tertiary)]">
                              State of Play
                            </p>
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

              {/* SETUP GUIDE — Shown to captains until the trip is cup-ready.
                Lives in its own component so it can own collapse state and
                keep this page shorter. Auto-collapses when 3+/5 done. */}
              {isCaptainMode && (
                <CaptainSetupGuide
                  players={players}
                  teams={teams}
                  teamMembers={teamMembers}
                  sessions={sessions}
                  tripMatches={tripMatches}
                  onInviteFriends={handleInviteFriends}
                />
              )}

              {/* NON-CAPTAIN GUIDANCE — Show when not captain and no sessions exist */}
              {!isCaptainMode && sessions.length === 0 && players.length > 0 && (
                <section className="rounded-[1.5rem] border border-[var(--rule)] bg-[var(--canvas-raised)] px-[var(--space-5)] py-[var(--space-5)] shadow-[0_12px_30px_rgba(46,34,18,0.05)]">
                  {/* "Clubhouse Note" read as a message/announcement. This
                    section is actually a status update, so label it as one. */}
                  <HomeSectionHeader
                    eyebrow="Trip Status"
                    title="The trip is set up; the pairings are not."
                  />
                  <div className="mt-[var(--space-4)]">
                    <div
                      className="card-editorial"
                      style={{
                        padding: 'var(--space-5)',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 'var(--space-4)',
                      }}
                    >
                      <Shield
                        size={20}
                        strokeWidth={1.5}
                        className="text-[var(--masters)] shrink-0 mt-0.5"
                      />
                      <div>
                        <p className="type-title-sm" style={{ marginBottom: 'var(--space-1)' }}>
                          Your captain is setting things up
                        </p>
                        <p className="type-caption text-[var(--ink-secondary)]">
                          Sessions and matchups will appear here once your captain creates the
                          lineup. Hang tight!
                        </p>
                      </div>
                    </div>
                  </div>
                </section>
              )}

              {/* Captain Quick Tools was removed from home — the bottom-nav
                Captain tab (when captain mode is on) is now the single
                entry point to /captain, where the full toolkit lives.
                Duplicating 4 buttons here just added visual noise and a
                second way to do the same thing. */}
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
