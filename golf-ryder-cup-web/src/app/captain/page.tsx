'use client';

import { useState, type ComponentType } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/layout';
import { EmptyStatePremium } from '@/components/ui/EmptyStatePremium';
import { Button } from '@/components/ui/Button';
import { useTripStore, useUIStore } from '@/lib/stores';
import { cn } from '@/lib/utils';
import {
  AlertTriangle,
  CalendarDays,
  Car,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Clock3,
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
  Trophy,
  UserCheck,
  Users,
  Zap,
} from 'lucide-react';

interface CommandAction {
  id: string;
  label: string;
  description: string;
  href: string;
  icon: ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  tone: 'maroon' | 'ink';
}

const gameDayActions: CommandAction[] = [
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

const setupActions: CommandAction[] = [
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
    href: '/captain/draft',
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

export default function CaptainPage() {
  const router = useRouter();
  const { currentTrip, sessions, teams, players, teamMembers } = useTripStore();
  const { isCaptainMode, enableCaptainMode } = useUIStore();
  const [captainPin, setCaptainPin] = useState('');

  const handleEnableCaptain = async () => {
    try {
      await enableCaptainMode(captainPin);
      setCaptainPin('');
    } catch {
      useUIStore.getState().showToast('error', 'Incorrect PIN');
    }
  };

  if (!currentTrip) {
    return (
      <div className="min-h-screen page-premium-enter texture-grain bg-[var(--canvas)]">
        <PageHeader
          title="Captain Command"
          subtitle="No active trip"
          icon={<Shield size={16} className="text-[var(--canvas)]" />}
          iconContainerClassName="bg-[linear-gradient(135deg,var(--maroon)_0%,var(--maroon-dark)_100%)]"
          onBack={() => router.back()}
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
          iconContainerClassName="bg-[linear-gradient(135deg,var(--maroon)_0%,var(--maroon-dark)_100%)]"
          onBack={() => router.back()}
        />

        <main className="container-editorial py-[var(--space-6)] pb-[var(--space-12)]">
          <section className="overflow-hidden rounded-[2rem] border border-[var(--maroon-subtle)] bg-[linear-gradient(180deg,rgba(255,255,255,0.88),rgba(247,240,241,0.96))] shadow-[0_22px_48px_rgba(46,34,18,0.08)]">
            <div className="border-b border-[color:var(--rule)]/80 px-[var(--space-5)] py-[var(--space-5)]">
              <p className="type-overline tracking-[0.18em] text-[var(--maroon)]">Captain Gate</p>
              <h1 className="mt-[var(--space-2)] font-serif text-[clamp(2rem,7vw,3rem)] italic leading-[1.02] text-[var(--ink)]">
                Open the command room.
              </h1>
              <p className="mt-[var(--space-3)] type-body-sm text-[var(--ink-secondary)]">
                The captain side controls the structure of the trip. Enter the PIN to unlock lineups,
                session management, and the rest of the board.
              </p>
            </div>

            <div className="space-y-[var(--space-5)] px-[var(--space-5)] py-[var(--space-5)]">
              <div className="grid gap-[var(--space-3)] sm:grid-cols-3">
                <GateFactCard label="Trip" value={currentTrip.name} valueClassName="font-sans text-[1rem] not-italic" />
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

  const getTeamPlayers = (teamId: string) => {
    const memberIds = teamMembers.filter((membership) => membership.teamId === teamId).map((membership) => membership.playerId);
    return players.filter((player) => memberIds.includes(player.id));
  };

  const teamA = teams.find((team) => team.color === 'usa');
  const teamB = teams.find((team) => team.color === 'europe');
  const teamAPlayers = teamA ? getTeamPlayers(teamA.id) : [];
  const teamBPlayers = teamB ? getTeamPlayers(teamB.id) : [];
  const unassignedPlayers = players.filter(
    (player) => !teamMembers.some((membership) => membership.playerId === player.id)
  );

  const activeSessions = sessions.filter((session) => session.status === 'inProgress');
  const upcomingSessions = sessions.filter((session) => session.status === 'scheduled');
  const completedSessions = sessions.filter((session) => session.status === 'completed');

  const readinessItems = [
    { label: 'Roster Built', done: players.length >= 2, count: players.length },
    {
      label: 'Teams Ready',
      done: teamAPlayers.length > 0 && teamBPlayers.length > 0,
      count: `${teamAPlayers.length}v${teamBPlayers.length}`,
    },
    { label: 'Sessions Built', done: sessions.length > 0, count: sessions.length },
    { label: 'Assignments Clean', done: unassignedPlayers.length === 0, count: unassignedPlayers.length },
  ];
  const readinessPercent = Math.round(
    (readinessItems.filter((item) => item.done).length / readinessItems.length) * 100
  );
  const readinessTone = readinessPercent === 100 ? 'ready' : readinessPercent >= 50 ? 'building' : 'needs';

  return (
    <div className="min-h-screen page-premium-enter texture-grain bg-[var(--canvas)]">
      <PageHeader
        title="Captain Command"
        subtitle={currentTrip.name}
        icon={<Shield size={16} className="text-[var(--canvas)]" />}
        iconContainerClassName="bg-[linear-gradient(135deg,var(--maroon)_0%,var(--maroon-dark)_100%)] shadow-[0_0_0_3px_rgba(114,47,55,0.12)]"
        onBack={() => router.back()}
        rightSlot={
          <Link href="/captain/settings" className="rounded-full p-2 text-[var(--ink-secondary)] transition-colors hover:bg-[var(--canvas-sunken)]">
            <Settings size={20} strokeWidth={1.75} />
          </Link>
        }
      />

      <main className="container-editorial py-[var(--space-6)] pb-[var(--space-12)]">
        <section className="overflow-hidden rounded-[2rem] border border-[var(--maroon-subtle)] bg-[linear-gradient(180deg,rgba(255,255,255,0.86),rgba(247,240,241,0.97))] shadow-[0_22px_48px_rgba(46,34,18,0.08)]">
          <div className="border-b border-[color:var(--rule)]/80 px-[var(--space-5)] py-[var(--space-5)]">
            <div className="flex flex-col gap-[var(--space-5)]">
              <div className="flex flex-col gap-[var(--space-4)] sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="type-overline tracking-[0.18em] text-[var(--maroon)]">Captain&apos;s Room</p>
                  <h1 className="mt-[var(--space-2)] font-serif text-[clamp(2rem,7vw,3rem)] italic leading-[1.02] text-[var(--ink)]">
                    Run the trip from one board.
                  </h1>
                  <p className="mt-[var(--space-3)] type-body-sm text-[var(--ink-secondary)]">
                    This should feel like a real command center, not a utilities folder. Keep the
                    day moving, see what still needs work, and step into the right tool without losing the room.
                  </p>
                </div>

                <ReadinessPill tone={readinessTone}>
                  {readinessPercent === 100 ? 'Ready to Play' : `${readinessPercent}% Ready`}
                </ReadinessPill>
              </div>

              <div className="grid gap-[var(--space-3)] sm:grid-cols-2">
                <Link
                  href="/lineup/new"
                  className="btn-premium inline-flex items-center justify-center gap-[var(--space-2)] rounded-[1rem] px-[var(--space-4)] py-[var(--space-3)]"
                >
                  <Plus size={16} />
                  Build Next Session
                </Link>
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
            <CaptainFactCard label="Readiness" value={`${readinessPercent}%`} valueClassName="font-sans text-[1rem] not-italic" />
            <CaptainFactCard label="Live Sessions" value={activeSessions.length} />
            <CaptainFactCard label="Upcoming" value={upcomingSessions.length} />
            <CaptainFactCard label="Unassigned" value={unassignedPlayers.length} />
          </div>
        </section>

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
              icon={<Zap size={16} />}
              tone="live"
              sessions={activeSessions}
              emptyTitle="Nothing live right now"
              emptyDescription="When a session starts, it will move here automatically."
            />
            <SessionGroupCard
              title="On Deck"
              description="Scheduled sessions waiting on publication or the first tee."
              icon={<CalendarDays size={16} />}
              tone="upcoming"
              sessions={upcomingSessions}
              emptyTitle="No sessions on deck"
              emptyDescription="Build the next lineup when the day has a clear shape."
            />
            <SessionGroupCard
              title="Completed"
              description="Finished sessions, useful for review and recap."
              icon={<Trophy size={16} />}
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
                      {unassignedPlayers.length} player{unassignedPlayers.length === 1 ? '' : 's'} still need a side
                    </p>
                    <p className="mt-[var(--space-1)] type-caption text-[var(--maroon)]">
                      Keep the roster clean before the lineup work starts compounding.
                    </p>
                  </div>
                </div>

                <Link
                  href="/captain/draft"
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

function GateFactCard({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string | number;
  valueClassName?: string;
}) {
  return (
    <div className="rounded-[1.1rem] border border-[var(--rule)] bg-[rgba(255,255,255,0.72)] px-[var(--space-4)] py-[var(--space-4)] shadow-[0_12px_24px_rgba(46,34,18,0.05)]">
      <p className="type-overline text-[var(--ink-tertiary)]">{label}</p>
      <p className={cn('mt-[var(--space-2)] font-serif text-[1.5rem] italic leading-none text-[var(--ink)]', valueClassName)}>
        {value}
      </p>
    </div>
  );
}

function CaptainFactCard({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string | number;
  valueClassName?: string;
}) {
  return (
    <div className="rounded-[1.1rem] border border-[var(--rule)] bg-[rgba(255,255,255,0.72)] px-[var(--space-4)] py-[var(--space-4)] shadow-[0_12px_24px_rgba(46,34,18,0.05)]">
      <p className="type-overline text-[var(--ink-tertiary)]">{label}</p>
      <p className={cn('mt-[var(--space-2)] font-serif text-[1.7rem] italic leading-none text-[var(--ink)]', valueClassName)}>
        {value}
      </p>
    </div>
  );
}

function ReadinessPill({
  tone,
  children,
}: {
  tone: 'ready' | 'building' | 'needs';
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-[var(--space-2)] rounded-full border px-[var(--space-3)] py-[var(--space-2)]',
        tone === 'ready' && 'border-[color:var(--success)]/18 bg-[color:var(--success)]/10 text-[var(--success)]',
        tone === 'building' && 'border-[color:var(--warning)]/18 bg-[color:var(--warning)]/10 text-[var(--warning)]',
        tone === 'needs' && 'border-[color:var(--maroon)]/18 bg-[color:var(--maroon)]/10 text-[var(--maroon)]'
      )}
    >
      {tone === 'ready' ? <CheckCircle2 size={14} /> : tone === 'building' ? <Clock3 size={14} /> : <AlertTriangle size={14} />}
      <span className="type-caption font-semibold">{children}</span>
    </div>
  );
}

function CaptainSectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-[var(--space-4)]">
      <p className="type-overline tracking-[0.16em] text-[var(--maroon)]">{eyebrow}</p>
      <h2 className="mt-[var(--space-2)] type-display-sm text-[var(--ink)]">{title}</h2>
      <p className="mt-[var(--space-2)] type-body-sm text-[var(--ink-secondary)]">{description}</p>
    </div>
  );
}

function CommandActionCard({ action }: { action: CommandAction }) {
  const toneClass =
    action.tone === 'maroon'
      ? 'border-[color:var(--maroon)]/16 bg-[linear-gradient(180deg,rgba(114,47,55,0.08),rgba(255,255,255,0.96))]'
      : 'border-[var(--rule)] bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(248,244,237,0.96))]';
  const iconClass =
    action.tone === 'maroon'
      ? 'border-[color:var(--maroon)]/16 bg-[color:var(--maroon)]/10 text-[var(--maroon)]'
      : 'border-[color:var(--gold)]/18 bg-[color:var(--gold)]/10 text-[var(--gold-dark)]';

  return (
    <Link href={action.href} className={cn('card-premium card-interactive p-[var(--space-5)]', toneClass)}>
      <div className="flex items-start justify-between gap-[var(--space-4)]">
        <div className={cn('flex h-11 w-11 items-center justify-center rounded-full border', iconClass)}>
          <action.icon size={20} strokeWidth={1.8} />
        </div>
        <ChevronRight size={18} className="mt-[var(--space-1)] text-[var(--ink-tertiary)]" />
      </div>
      <h3 className="mt-[var(--space-5)] type-title-lg text-[var(--ink)]">{action.label}</h3>
      <p className="mt-[var(--space-2)] type-body-sm text-[var(--ink-secondary)]">{action.description}</p>
    </Link>
  );
}

function SessionGroupCard({
  title,
  description,
  icon,
  tone,
  sessions,
  emptyTitle,
  emptyDescription,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  tone: 'live' | 'upcoming' | 'completed';
  sessions: Array<{
    id: string;
    name: string;
    sessionType: string;
    scheduledDate?: string;
    isLocked?: boolean;
  }>;
  emptyTitle: string;
  emptyDescription: string;
}) {
  const toneClass =
    tone === 'live'
      ? 'border-[color:var(--masters)]/16 bg-[linear-gradient(180deg,rgba(0,102,68,0.08),rgba(255,255,255,0.96))]'
      : tone === 'completed'
        ? 'border-[color:var(--success)]/16 bg-[linear-gradient(180deg,rgba(45,122,79,0.08),rgba(255,255,255,0.96))]'
        : 'border-[var(--rule)] bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(248,244,237,0.96))]';

  return (
    <section className={cn('overflow-hidden rounded-[1.7rem] border shadow-[0_18px_36px_rgba(46,34,18,0.06)]', toneClass)}>
      <div className="border-b border-[color:var(--rule)]/80 px-[var(--space-5)] py-[var(--space-5)]">
        <div className="flex items-start gap-[var(--space-3)]">
          <div className="mt-[2px]">{icon}</div>
          <div>
            <p className="type-title text-[var(--ink)]">{title}</p>
            <p className="mt-[var(--space-1)] type-body-sm text-[var(--ink-secondary)]">{description}</p>
          </div>
        </div>
      </div>

      <div className="px-[var(--space-3)] py-[var(--space-3)]">
        {sessions.length === 0 ? (
          <div className="rounded-[1.2rem] border border-dashed border-[var(--rule)] bg-[rgba(255,255,255,0.6)] px-[var(--space-4)] py-[var(--space-5)] text-center">
            <p className="type-title-sm text-[var(--ink)]">{emptyTitle}</p>
            <p className="mt-[var(--space-2)] type-caption">{emptyDescription}</p>
          </div>
        ) : (
          sessions.map((session, index) => (
            <Link
              key={session.id}
              href={`/lineup/${session.id}`}
              className={cn(
                'flex items-center gap-[var(--space-4)] rounded-[1.2rem] border border-[var(--rule)] bg-[rgba(255,255,255,0.8)] px-[var(--space-4)] py-[var(--space-4)] transition-colors hover:bg-[var(--canvas-raised)]',
                index > 0 ? 'mt-[var(--space-2)]' : undefined
              )}
            >
              <div className="min-w-0 flex-1">
                <p className="type-title-sm truncate text-[var(--ink)]">{session.name}</p>
                <p className="mt-[var(--space-1)] type-caption capitalize">
                  {session.sessionType}
                  {session.scheduledDate
                    ? ` · ${new Date(session.scheduledDate).toLocaleDateString()}`
                    : ''}
                </p>
              </div>

              {session.isLocked ? (
                <div className="inline-flex items-center gap-[var(--space-1)] rounded-full border border-[color:var(--gold)]/18 bg-[color:var(--gold)]/10 px-[var(--space-2)] py-[6px]">
                  <span className="type-micro font-semibold text-[var(--gold-dark)]">Locked</span>
                </div>
              ) : null}

              <ChevronRight size={18} className="text-[var(--ink-tertiary)]" />
            </Link>
          ))
        )}
      </div>
    </section>
  );
}

function TeamOverviewCard({
  name,
  count,
  tone,
  summary,
}: {
  name: string;
  count: number;
  tone: 'usa' | 'europe';
  summary: string;
}) {
  const toneClass =
    tone === 'usa'
      ? 'border-[color:var(--team-usa)]/16 bg-[linear-gradient(180deg,rgba(30,58,95,0.08),rgba(255,255,255,0.96))]'
      : 'border-[color:var(--team-europe)]/16 bg-[linear-gradient(180deg,rgba(114,47,55,0.08),rgba(255,255,255,0.96))]';
  const textClass = tone === 'usa' ? 'text-[var(--team-usa)]' : 'text-[var(--team-europe)]';

  return (
    <div className={cn('rounded-[1.5rem] border p-[var(--space-5)] shadow-[0_16px_32px_rgba(46,34,18,0.06)]', toneClass)}>
      <p className={cn('type-overline tracking-[0.16em]', textClass)}>{summary}</p>
      <h3 className="mt-[var(--space-2)] type-title-lg text-[var(--ink)]">{name}</h3>
      <div className="mt-[var(--space-4)] flex items-end justify-between gap-[var(--space-4)]">
        <div>
          <p className="font-serif text-[2.4rem] italic leading-none text-[var(--ink)]">{count}</p>
          <p className="mt-[var(--space-1)] type-caption">players</p>
        </div>
        <Link href="/players" className={cn('type-caption font-semibold no-underline', textClass)}>
          Manage roster
        </Link>
      </div>
    </div>
  );
}
