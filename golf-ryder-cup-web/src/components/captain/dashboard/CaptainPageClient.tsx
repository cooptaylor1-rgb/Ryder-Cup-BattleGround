'use client';

import Link from 'next/link';
import { LinkButton } from '@/components/ui/LinkButton';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { PageHeader } from '@/components/layout';
import { Button } from '@/components/ui/Button';
import { CaptainToggle } from '@/components/ui/CaptainToggle';
import { EmptyStatePremium } from '@/components/ui/EmptyStatePremium';
import { useTripStore, useAccessStore, useToastStore } from '@/lib/stores';
import { useShallow } from 'zustand/shallow';
import { useTeamsWithPlayers } from '@/lib/hooks/useTeamsWithPlayers';
import {
  AlertTriangle,
  Car,
  ClipboardCheck,
  DollarSign,
  Home,
  MessageSquare,
  Phone,
  Plus,
  Printer,
  QrCode,
  Settings,
  Shield,
  Shuffle,
  Sliders,
  UserCheck,
  Users,
} from 'lucide-react';
import {
  CaptainFactCard,
  type CaptainCommandAction,
  CaptainSectionHeading,
  CommandActionCard,
  GateFactCard,
  ReadinessPill,
  SessionGroupCard,
  TeamOverviewCard,
} from '@/components/captain/dashboard/CaptainPageSections';

const gameDayActions: CaptainCommandAction[] = [
  {
    id: 'attendance',
    label: 'Attendance',
    description: "Track who’s actually on property before the pairings shift under you.",
    href: '/captain/availability',
    icon: UserCheck,
    tone: 'maroon',
  },
  {
    id: 'lineup',
    label: 'Create Lineup',
    description: 'Build or publish the next session without leaving the command room.',
    href: '/lineup/new',
    icon: Users,
    tone: 'maroon',
  },
  {
    id: 'manage',
    label: 'Quick Swap',
    description: 'Adjust sessions, player handicaps, and match allowances in one place.',
    href: '/captain/manage',
    icon: Sliders,
    tone: 'maroon',
  },
  {
    id: 'audit',
    label: 'Audit Log',
    description: 'Review scoring changes when the day starts getting messy.',
    href: '/captain/audit',
    icon: Shield,
    tone: 'maroon',
  },
];

const setupActions: CaptainCommandAction[] = [
  {
    id: 'checklist',
    label: 'Pre-Flight',
    description: 'Run the readiness check before the first tee shot exposes a missing piece.',
    href: '/captain/checklist',
    icon: ClipboardCheck,
    tone: 'ink',
  },
  {
    id: 'draft',
    label: 'Team Draft',
    description: 'Sort the roster into sides when the trip still needs its shape.',
    href: '/players?panel=draft',
    icon: Shuffle,
    tone: 'ink',
  },
  {
    id: 'messages',
    label: 'Messages',
    description: 'Send a real announcement instead of a text thread that gets buried.',
    href: '/captain/messages',
    icon: MessageSquare,
    tone: 'ink',
  },
  {
    id: 'invites',
    label: 'Invitations',
    description: 'Manage share codes and make sure late arrivals can still get in.',
    href: '/captain/invites',
    icon: QrCode,
    tone: 'ink',
  },
  {
    id: 'bets',
    label: 'Side Bets',
    description: 'Keep the optional games from drifting into untracked folklore.',
    href: '/captain/bets',
    icon: DollarSign,
    tone: 'ink',
  },
  {
    id: 'carts',
    label: 'Cart Assignments',
    description: 'Pair the right people before the lot turns into first-tee chaos.',
    href: '/captain/carts',
    icon: Car,
    tone: 'ink',
  },
  {
    id: 'contacts',
    label: 'Contacts',
    description: 'Keep the important numbers somewhere better than one captain’s phone.',
    href: '/captain/contacts',
    icon: Phone,
    tone: 'ink',
  },
  {
    id: 'pairings',
    label: 'Print Pairings',
    description: 'Generate the paper backup when the course wants something tangible.',
    href: '/captain/pairings',
    icon: Printer,
    tone: 'ink',
  },
];

export default function CaptainPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentTrip, sessions, players } = useTripStore(
    useShallow((s) => ({
      currentTrip: s.currentTrip,
      sessions: s.sessions,
      players: s.players,
    }))
  );
  const { isCaptainMode, enableCaptainMode } = useAccessStore(useShallow(s => ({ isCaptainMode: s.isCaptainMode, enableCaptainMode: s.enableCaptainMode })));
  const { showToast } = useToastStore(useShallow(s => ({ showToast: s.showToast })));
  const [captainPin, setCaptainPin] = useState('');

  // Matches with no course assigned are a silent blocker for
  // handicap scoring. We count them here so the dashboard can
  // surface a nudge banner. Hoisted above the early returns below
  // so React's hook count stays constant regardless of trip /
  // captain-mode state — the previous placement fired this hook
  // ONLY after both gates passed, which meant toggling captain
  // mode on increased the hook count mid-lifetime and tripped
  // "rendered more hooks than during the previous render" the
  // moment the captain authenticated.
  const sessionIds = sessions.map((s) => s.id);
  const tripMatches = useLiveQuery(
    async () => {
      if (sessionIds.length === 0) return [];
      return db.matches.where('sessionId').anyOf(sessionIds).toArray();
    },
    [sessionIds.join(',')],
    []
  );
  const matchesMissingCourse = (tripMatches ?? []).filter((m) => !m.courseId).length;

  const handleEnableCaptain = async () => {
    try {
      await enableCaptainMode(captainPin);
      setCaptainPin('');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Incorrect PIN';
      showToast('error', message);
    }
  };

  if (!currentTrip) {
    return (
      <div className="min-h-screen page-premium-enter texture-grain bg-[var(--canvas)]">
        <PageHeader
          title="Captain Command"
          subtitle="No active trip"
          icon={<Shield size={16} className="text-[var(--canvas)]" />}
          iconTone="captain"
          backFallback="/"
        />
        <main className="container-editorial py-12">
          <EmptyStatePremium
            illustration="golf-ball"
            title="No active trip"
            description="Start or select a trip to access captain tools."
            action={{
              label: 'Go Home',
              onClick: () => router.push('/'),
              icon: <Home size={16} />,
            }}
            variant="large"
          />
        </main>
      </div>
    );
  }

  if (!isCaptainMode) {
    return (
      <div className="min-h-screen page-premium-enter texture-grain bg-[var(--canvas)]">
        <PageHeader
          title="Captain Command"
          subtitle={currentTrip.name}
          icon={<Shield size={16} className="text-[var(--canvas)]" />}
          iconTone="captain"
          backFallback="/"
        />

        <main className="container-editorial py-[var(--space-6)] pb-[var(--space-12)]">
          <section className="overflow-hidden rounded-[2rem] border border-[var(--maroon-subtle)] bg-[linear-gradient(180deg,rgba(255,255,255,0.88),rgba(247,240,241,0.96))] shadow-[0_22px_48px_rgba(46,34,18,0.08)]">
            <div className="border-b border-[color:var(--rule)]/80 px-[var(--space-5)] py-[var(--space-5)]">
              <p className="type-overline tracking-[0.18em] text-[var(--maroon)]">
                Captain Gate
              </p>
              <h1 className="mt-[var(--space-2)] font-serif text-[clamp(2rem,7vw,3rem)] italic leading-[1.02] text-[var(--ink)]">
                Open the command room.
              </h1>
              <p className="mt-[var(--space-3)] type-body-sm text-[var(--ink-secondary)]">
                The captain side controls the structure of the trip. Enter the PIN to unlock
                lineups, session management, and the rest of the board.
              </p>
            </div>

            <div className="space-y-[var(--space-5)] px-[var(--space-5)] py-[var(--space-5)]">
              <div className="grid gap-[var(--space-3)] sm:grid-cols-3">
                <GateFactCard
                  label="Trip"
                  value={currentTrip.name}
                  valueClassName="font-sans text-[1rem] not-italic"
                />
                <GateFactCard label="Sessions" value={sessions.length} />
                <GateFactCard label="Players" value={players.length} />
              </div>

              <label className="block space-y-[var(--space-2)]">
                <span className="type-meta font-semibold text-[var(--ink)]">Captain PIN</span>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={captainPin}
                  onChange={(event) => setCaptainPin(event.target.value.replace(/\D/g, ''))}
                  placeholder="4-digit PIN"
                  aria-label="Captain PIN"
                  className="input text-center text-[1.8rem] tracking-[0.45em]"
                />
              </label>

              <Button
                variant="primary"
                onClick={handleEnableCaptain}
                disabled={captainPin.length < 4}
                leftIcon={<Shield size={16} />}
                className="w-full justify-center"
              >
                Enable Captain Mode
              </Button>
            </div>
          </section>
        </main>
      </div>
    );
  }

  const { teamA, teamB, teamAPlayers, teamBPlayers, unassignedPlayers } = useTeamsWithPlayers();

  const activeSessions = sessions.filter((session) => session.status === 'inProgress');
  const upcomingSessions = sessions.filter((session) => session.status === 'scheduled');
  const completedSessions = sessions.filter((session) => session.status === 'completed');

  // Phase-aware section order. Before the trip starts, setup tools are the
  // captain's actual work — surface them first. The moment anything goes
  // live (or the whole trip is in the books) the game-day / audit tools
  // take priority instead. Pure reorder, no tile changes.
  const tripPhase: 'upcoming' | 'live' | 'completed' =
    activeSessions.length > 0
      ? 'live'
      : sessions.length > 0 && upcomingSessions.length === 0
        ? 'completed'
        : 'upcoming';
  const showGameDayFirst = tripPhase !== 'upcoming';

  const readinessItems = [
    { label: 'Roster Built', done: players.length >= 2, count: players.length },
    {
      label: 'Teams Ready',
      done: teamAPlayers.length > 0 && teamBPlayers.length > 0,
      count: `${teamAPlayers.length}v${teamBPlayers.length}`,
    },
    { label: 'Sessions Built', done: sessions.length > 0, count: sessions.length },
    {
      label: 'Assignments Clean',
      done: unassignedPlayers.length === 0,
      count: unassignedPlayers.length,
    },
    {
      label: 'Courses Assigned',
      done: (tripMatches?.length ?? 0) > 0 && matchesMissingCourse === 0,
      count: matchesMissingCourse,
    },
  ];
  const readinessPercent = Math.round(
    (readinessItems.filter((item) => item.done).length / readinessItems.length) * 100
  );
  const readinessTone =
    readinessPercent === 100 ? 'ready' : readinessPercent >= 50 ? 'building' : 'needs';
  const showSetupCreatedBanner = searchParams.get('setup') === 'created';

  return (
    <div className="min-h-screen page-premium-enter texture-grain bg-[var(--canvas)]">
      <PageHeader
        title="Captain Command"
        subtitle={currentTrip.name}
        icon={<Shield size={16} className="text-[var(--canvas)]" />}
        iconTone="captain"
        backFallback="/"
        rightSlot={
          <div className="flex items-center gap-1">
            <CaptainToggle />
            <Link
              href="/captain/settings"
              aria-label="Captain settings"
              className="rounded-full p-2 text-[var(--ink-secondary)] transition-colors hover:bg-[var(--canvas-sunken)]"
            >
              <Settings size={20} strokeWidth={1.75} />
            </Link>
          </div>
        }
      />

      <main className="container-editorial py-[var(--space-6)] pb-[var(--space-12)]">
        {showSetupCreatedBanner ? (
          <section className="mb-[var(--space-6)] overflow-hidden rounded-[1.8rem] border border-[var(--masters)]/16 bg-[linear-gradient(145deg,rgba(11,94,55,0.95),rgba(5,58,35,0.98))] text-[var(--canvas)] shadow-[0_24px_54px_rgba(5,58,35,0.24)]">
            <div className="flex flex-col gap-[var(--space-4)] px-[var(--space-5)] py-[var(--space-5)] lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="type-overline tracking-[0.16em] text-[color:var(--canvas)]/72">
                  Setup complete
                </p>
                <h2 className="mt-[var(--space-2)] font-serif text-[2rem] italic leading-[1.02] text-[var(--canvas)]">
                  The trip is built. Now run the room.
                </h2>
                <p className="mt-[var(--space-3)] max-w-[38rem] text-sm leading-7 text-[color:var(--canvas)]/80">
                  Your roster, teams, sessions, and tee-sheet defaults are already on the board.
                  Publish the first lineup, share the invite, or run the pre-flight before the day starts moving.
                </p>
              </div>

              <div className="flex flex-wrap gap-[var(--space-3)]">
                <Link
                  href="/lineup/new"
                  className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[var(--canvas)] px-[var(--space-4)] py-[var(--space-3)] text-sm font-semibold text-[var(--masters)] transition-transform duration-150 hover:scale-[1.02]"
                >
                  Publish first lineup
                </Link>
                <Link
                  href="/captain/checklist"
                  className="inline-flex min-h-12 items-center justify-center rounded-xl border border-[color:var(--canvas)]/22 bg-transparent px-[var(--space-4)] py-[var(--space-3)] text-sm font-semibold text-[var(--canvas)] transition-transform duration-150 hover:scale-[1.02] hover:bg-[color:var(--canvas)]/10"
                >
                  Run pre-flight
                </Link>
              </div>
            </div>
          </section>
        ) : null}

        {/* Course-assignment nudge. Handicap scoring depends on the
            course + tee being set on each match; without this the
            scoring page fires a warning banner the captain might not
            see until they're already on the course. Surfacing it on
            the dashboard gets it fixed during setup, not the morning
            of. */}
        {matchesMissingCourse > 0 && (
          <section className="mb-[var(--space-6)] rounded-[1.2rem] border border-[color:var(--warning)]/30 bg-[color:var(--warning)]/10 px-[var(--space-5)] py-[var(--space-4)]">
            <div className="flex flex-col gap-[var(--space-3)] sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <AlertTriangle size={20} className="mt-0.5 shrink-0 text-[var(--warning)]" />
                <div>
                  <p className="font-semibold text-[var(--ink-primary)]">
                    {matchesMissingCourse} {matchesMissingCourse === 1 ? 'match needs' : 'matches need'} a course &amp; tee
                  </p>
                  <p className="mt-1 text-sm text-[var(--ink-secondary)]">
                    Assign the course each match is being played on so handicap strokes
                    apply. Scores still record without it, but handicaps won&apos;t adjust.
                  </p>
                </div>
              </div>
              <Link
                href="/captain/manage"
                className="inline-flex items-center justify-center rounded-lg border border-[var(--warning)] bg-[var(--warning)] px-4 py-2 text-sm font-semibold text-[var(--ink)] transition-transform hover:scale-[1.02]"
              >
                Assign courses
              </Link>
            </div>
          </section>
        )}


        <section className="overflow-hidden rounded-[2rem] border border-[var(--maroon-subtle)] bg-[linear-gradient(180deg,rgba(255,255,255,0.86),rgba(247,240,241,0.97))] shadow-[0_22px_48px_rgba(46,34,18,0.08)]">
          <div className="border-b border-[color:var(--rule)]/80 px-[var(--space-5)] py-[var(--space-5)]">
            <div className="flex flex-col gap-[var(--space-5)]">
              <div className="flex flex-col gap-[var(--space-4)] sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="type-overline tracking-[0.18em] text-[var(--maroon)]">
                    Captain&apos;s Room
                  </p>
                  <h1 className="mt-[var(--space-2)] font-serif text-[clamp(2rem,7vw,3rem)] italic leading-[1.02] text-[var(--ink)]">
                    Run the trip from one board.
                  </h1>
                  <p className="mt-[var(--space-3)] type-body-sm text-[var(--ink-secondary)]">
                    This should feel like a real command center, not a utilities folder. Keep the
                    day moving, see what still needs work, and step into the right tool without
                    losing the room.
                  </p>
                </div>

                <ReadinessPill tone={readinessTone}>
                  {readinessPercent === 100 ? 'Ready to Play' : `${readinessPercent}% Ready`}
                </ReadinessPill>
              </div>

              <div className="grid gap-[var(--space-3)] sm:grid-cols-2">
                <LinkButton
                  href="/lineup/new"
                  variant="primary"
                  leftIcon={<Plus size={16} />}
                  className="rounded-[1rem]"
                >
                  Build Next Session
                </LinkButton>
                <Link
                  href="/captain/manage"
                  className="inline-flex items-center justify-center gap-[var(--space-2)] rounded-[1rem] border border-[color:var(--maroon)]/18 bg-[color:var(--maroon)]/10 px-[var(--space-4)] py-[var(--space-3)] font-semibold text-[var(--maroon-dark)] transition-colors hover:bg-[color:var(--maroon)]/14"
                >
                  <Sliders size={16} />
                  Open Manage Board
                </Link>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-[var(--space-3)] px-[var(--space-5)] py-[var(--space-5)] md:grid-cols-4">
            <CaptainFactCard
              label="Readiness"
              value={`${readinessPercent}%`}
              valueClassName="font-sans text-[1rem] not-italic"
            />
            <CaptainFactCard label="Live Sessions" value={activeSessions.length} />
            <CaptainFactCard label="Upcoming" value={upcomingSessions.length} />
            <CaptainFactCard label="Unassigned" value={unassignedPlayers.length} />
          </div>
        </section>

        {showGameDayFirst && (
          <section className="pt-[var(--space-6)]">
            <CaptainSectionHeading
              eyebrow="Today"
              title="Day-of decisions"
              description="These are the tools you reach for when the group is on site and the schedule is no longer theoretical."
            />
            <div className="grid gap-[var(--space-4)] md:grid-cols-2">
              {gameDayActions.map((action) => (
                <CommandActionCard key={action.id} action={action} />
              ))}
            </div>
          </section>
        )}

        <section className="pt-[var(--space-8)]">
          <CaptainSectionHeading
            eyebrow="Setup"
            title="Support tools"
            description="Everything that shapes the trip around the edges: invites, logistics, messaging, and the quieter admin work."
          />
          <div className="grid gap-[var(--space-4)] md:grid-cols-2">
            {setupActions.map((action) => (
              <CommandActionCard key={action.id} action={action} />
            ))}
          </div>
        </section>

        {!showGameDayFirst && (
          <section className="pt-[var(--space-8)]">
            <CaptainSectionHeading
              eyebrow="Today"
              title="Day-of decisions"
              description="These are the tools you reach for when the group is on site and the schedule is no longer theoretical."
            />
            <div className="grid gap-[var(--space-4)] md:grid-cols-2">
              {gameDayActions.map((action) => (
                <CommandActionCard key={action.id} action={action} />
              ))}
            </div>
          </section>
        )}

        <section className="pt-[var(--space-8)]">
          <CaptainSectionHeading
            eyebrow="Sessions"
            title="Session board"
            description="Live rooms should stand apart, upcoming ones should feel staged, and completed sessions should read like settled business."
          />
          <div className="space-y-[var(--space-4)]">
            <SessionGroupCard
              title="Live Now"
              description="Sessions currently in progress."
              tone="live"
              sessions={activeSessions}
              emptyTitle="Nothing live right now"
              emptyDescription="When a session starts, it will move here automatically."
            />
            <SessionGroupCard
              title="On Deck"
              description="Scheduled sessions waiting on publication or the first tee."
              tone="upcoming"
              sessions={upcomingSessions}
              emptyTitle="No sessions on deck"
              emptyDescription="Build the next lineup when the day has a clear shape."
            />
            <SessionGroupCard
              title="Completed"
              description="Finished sessions, useful for review and recap."
              tone="completed"
              sessions={completedSessions.slice(0, 3)}
              emptyTitle="No completed sessions yet"
              emptyDescription="Completed sessions will settle here as the trip moves along."
            />
          </div>
        </section>

        <section className="pt-[var(--space-8)]">
          <CaptainSectionHeading
            eyebrow="Roster"
            title="Team overview"
            description="A quick read on the two sides and any players still floating outside the team structure."
          />
          <div className="grid gap-[var(--space-4)] md:grid-cols-2">
            <TeamOverviewCard
              name={teamA?.name || 'Team USA'}
              count={teamAPlayers.length}
              tone="usa"
              summary="American side"
            />
            <TeamOverviewCard
              name={teamB?.name || 'Team Europe'}
              count={teamBPlayers.length}
              tone="europe"
              summary="European side"
            />
          </div>

          {unassignedPlayers.length > 0 ? (
            <div className="mt-[var(--space-4)] rounded-[1.4rem] border border-[color:var(--maroon)]/16 bg-[color:var(--maroon)]/10 px-[var(--space-5)] py-[var(--space-4)]">
              <div className="flex flex-col gap-[var(--space-3)] sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-[var(--space-3)]">
                  <AlertTriangle size={18} className="mt-[2px] text-[var(--maroon)]" />
                  <div>
                    <p className="type-title-sm text-[var(--maroon-dark)]">
                      {unassignedPlayers.length} player
                      {unassignedPlayers.length === 1 ? '' : 's'} still need a side
                    </p>
                    <p className="mt-[var(--space-1)] type-caption text-[var(--maroon)]">
                      Keep the roster clean before the lineup work starts compounding.
                    </p>
                  </div>
                </div>

                <Link
                  href="/players?panel=draft"
                  className="inline-flex items-center justify-center gap-[var(--space-2)] rounded-[1rem] bg-[var(--maroon)] px-[var(--space-4)] py-[var(--space-3)] font-semibold text-[var(--canvas)] transition-opacity hover:opacity-90"
                >
                  <Shuffle size={16} />
                  Assign Players
                </Link>
              </div>
            </div>
          ) : null}
        </section>
      </main>
    </div>
  );
}
