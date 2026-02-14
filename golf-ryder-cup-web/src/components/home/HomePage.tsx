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
  Share2,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { shareTrip } from '@/lib/utils/share';
import { useState, useCallback, useEffect, useMemo } from 'react';
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
  const [pendingJoinCode, setPendingJoinCode] = useState<string | undefined>();
  const [, setShowWhatsNew] = useState(false);

  // Check for a pending join code from /join deep link
  useEffect(() => {
    const code = sessionStorage.getItem('pendingJoinCode');
    if (code) {
      sessionStorage.removeItem('pendingJoinCode');
      setPendingJoinCode(code);
      setShowJoinTrip(true);
    }
  }, []);

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

  const handleInviteFriends = useCallback(async () => {
    if (!activeTrip) return;
    // Derive a 6-char code from the trip ID (deterministic, shareable)
    const code = activeTrip.id.replace(/-/g, '').slice(0, 6).toUpperCase();
    const result = await shareTrip(activeTrip.name, code);
    if (result.shared && result.method === 'clipboard') {
      // User will see the system share sheet for 'native', only show toast for clipboard
      // No-op: the clipboard copy is its own confirmation
    }
  }, [activeTrip]);

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

  const scoreNarrative = useMemo(() => {
    if (!standings) return undefined;

    const diff = Math.abs(standings.teamAPoints - standings.teamBPoints);
    if (diff === 0) return 'All square';

    const leader =
      standings.teamAPoints > standings.teamBPoints ? teamAName || 'USA' : teamBName || 'Europe';

    return `${leader} leads by ${diff} point${diff !== 1 ? 's' : ''}`;
  }, [standings, teamAName, teamBName]);

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
            <section className="pt-[var(--space-8)]">
              <p className="type-overline tracking-[0.18em] text-[var(--ink-tertiary)]">
                {formatDate(new Date()).toUpperCase()}
              </p>
              <h1 className="type-display mt-[var(--space-2)] text-[var(--ink)]">
                {activeTrip.name}
              </h1>
              {activeTrip.location && (
                <p className="type-body-sm mt-[var(--space-1)] text-[var(--ink-secondary)] flex items-center gap-[var(--space-2)]">
                  <MapPin size={14} strokeWidth={1.5} />
                  {activeTrip.location}
                </p>
              )}
            </section>

            {/* SCORE HERO — Monumental, breathing */}
            {standings ? (
              <section className="pt-[var(--space-10)] pb-[var(--space-8)]">
                <button
                  onClick={() => handleSelectTrip(activeTrip.id)}
                  className="w-full bg-transparent border-none cursor-pointer p-0 press-scale"
                >
                  {/* Live badge */}
                  {liveMatchesCount > 0 && (
                    <div className="live-indicator mb-[var(--space-6)] flex justify-center">
                      Live
                    </div>
                  )}

                  {/* Score blocks */}
                  <div className="flex items-center justify-center gap-[var(--space-6)]">
                    {/* Team A */}
                    <div className="text-center flex-1">
                      <span className="team-dot team-dot-lg team-dot-usa inline-block mb-[var(--space-3)]" />
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
                      <p className="type-overline mt-[var(--space-3)] text-[var(--team-usa)]">
                        {teamAName || 'USA'}
                      </p>
                    </div>

                    {/* Divider */}
                    <div className="font-serif text-2xl text-[var(--ink-faint)] pt-[var(--space-4)]">
                      –
                    </div>

                    {/* Team B */}
                    <div className="text-center flex-1">
                      <span className="team-dot team-dot-lg team-dot-europe inline-block mb-[var(--space-3)]" />
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
                      <p className="type-overline mt-[var(--space-3)] text-[var(--team-europe)]">
                        {teamBName || 'EUR'}
                      </p>
                    </div>
                  </div>

                  {/* Score narrative */}
                  {scoreNarrative ? (
                    <p className="type-body-sm text-center mt-[var(--space-6)] text-[var(--ink-secondary)] italic">
                      {scoreNarrative}
                    </p>
                  ) : null}

                  {/* View standings CTA */}
                  <div className="flex items-center justify-center gap-[var(--space-2)] mt-[var(--space-8)] text-[var(--masters)] font-medium text-sm">
                    <span>View full standings</span>
                    <ChevronRight size={16} strokeWidth={2} />
                  </div>
                </button>
              </section>
            ) : (
              /* Active trip without standings yet */
              <section className="pt-[var(--space-8)] pb-[var(--space-6)]">
                <button
                  onClick={() => handleSelectTrip(activeTrip.id)}
                  className="w-full bg-transparent border-none cursor-pointer p-0 text-left"
                >
                  <div className="live-indicator mb-[var(--space-4)]">Active</div>
                  <div className="flex items-center gap-[var(--space-2)] mt-[var(--space-4)] text-[var(--masters)] font-medium">
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
                <section className="py-[var(--space-6)]">
                  <p className="type-overline tracking-[0.15em] text-[var(--ink-tertiary)] mb-[var(--space-4)]">
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
                <section className="py-[var(--space-6)]">
                  <div className="flex items-center justify-between mb-[var(--space-4)]">
                    <div className="flex items-center gap-[var(--space-2)]">
                      <div className="live-indicator">Live Now</div>
                      <span className="type-caption text-[var(--ink-tertiary)]">
                        {liveMatchesCount} match{liveMatchesCount !== 1 ? 'es' : ''}
                      </span>
                    </div>
                    <Link
                      href="/live"
                      className="type-caption flex items-center gap-[var(--space-1)] text-[var(--masters)] no-underline"
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
                <section className="py-[var(--space-6)]">
                  <p className="type-overline tracking-[0.15em] text-[var(--maroon)] mb-[var(--space-4)]">
                    <Shield size={12} className="inline mr-[var(--space-1)] align-middle" />
                    CAPTAIN SETUP
                  </p>
                  <div className="card-captain">
                    <p className="type-title-sm mb-[var(--space-4)]">
                      Get Your Trip Ready
                    </p>
                    <div className="flex flex-col gap-[var(--space-2)]">
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
                <section className="py-[var(--space-6)]">
                  <div className="flex items-center justify-between mb-[var(--space-4)]">
                    <p className="type-overline tracking-[0.15em] text-[var(--maroon)]">
                      <Shield size={12} className="inline mr-[var(--space-1)] align-middle" />
                      CAPTAIN TOOLS
                    </p>
                    <Link
                      href="/captain"
                      className="type-caption flex items-center gap-[var(--space-1)] text-[var(--maroon)] no-underline"
                    >
                      All Tools <ChevronRight size={14} />
                    </Link>
                  </div>
                  <div className="grid grid-cols-3 gap-[var(--space-3)]">
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
                <hr className="divider-subtle" />
              </>
            )}
          </>
        )}

        {/* ── TOURNAMENT ARCHIVE ── */}
        <section className={`${activeTrip ? 'pt-[var(--space-6)]' : 'pt-[var(--space-10)]'} pb-[var(--space-10)]`}>
          <div className="flex items-center justify-between mb-[var(--space-6)]">
            <h2 className="type-overline tracking-[0.15em]">
              {hasTrips ? (activeTrip ? 'Past Tournaments' : 'Tournaments') : 'Get Started'}
            </h2>
            {hasTrips && (
              <button
                onClick={() => setShowQuickStart(true)}
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
      className={`flex items-center gap-[var(--space-3)] p-[var(--space-3)] rounded-[var(--radius-md)] no-underline text-[var(--ink)] transition-[background] duration-fast ease-out ${
        done
          ? 'bg-[var(--masters-subtle)] border border-[rgba(0,102,68,0.2)]'
          : 'bg-[var(--canvas-sunken)] border border-[var(--rule)]'
      }`}
    >
      <div
        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
          done
            ? 'bg-[var(--masters)] text-white'
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
