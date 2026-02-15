'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTripStore, useUIStore } from '@/lib/stores';
import { cn } from '@/lib/utils';
import { EmptyStatePremium } from '@/components/ui/EmptyStatePremium';
import { BottomNav, PageHeader } from '@/components/layout';
import {
  Shield,
  Users,
  Calendar,
  ClipboardCheck,
  UserCheck,
  Shuffle,
  MessageSquare,
  QrCode,
  Settings,
  ChevronRight,
  ChevronDown,
  Plus,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Trophy,
  Home,
  Zap,
  Car,
  Phone,
  Sliders,
  DollarSign,
  Printer,
} from 'lucide-react';

/**
 * CAPTAIN COMMAND CENTER
 *
 * The hub for all captain operations. Editorial design with maroon accent
 * to visually distinguish captain mode from the rest of the app.
 *
 * Features:
 * - Trip status overview
 * - Editorial tool index with clean typography
 * - Session management
 * - Pre-round checklist access
 * - Player availability
 */

interface QuickAction {
  id: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  href: string;
  color: string;
  badge?: number;
  priority?: boolean; // P0-7: Top 4 priority actions shown by default
}

// P0-7: Reorganized with day-of priority actions first
const QUICK_ACTIONS: QuickAction[] = [
  // DAY-OF Priority Actions (always visible) - things captains need when players are arriving
  {
    id: 'attendance',
    label: 'Attendance',
    description: "Track who's here",
    icon: UserCheck,
    href: '/captain/availability',
    color: 'var(--maroon)',
    priority: true,
  },
  {
    id: 'lineup',
    label: 'Create Lineup',
    description: 'Build match pairings',
    icon: Users,
    href: '/lineup/new',
    color: 'var(--maroon)',
    priority: true,
  },
  {
    id: 'manage',
    label: 'Quick Swap',
    description: 'Edit matches & players',
    icon: Sliders,
    href: '/captain/manage',
    color: 'var(--maroon)',
    priority: true,
  },
  {
    id: 'audit',
    label: 'Audit Log',
    description: 'Review scoring changes',
    icon: Shield,
    href: '/captain/audit',
    color: 'var(--maroon)',
    priority: true,
  },
  {
    id: 'checklist',
    label: 'Pre-Flight',
    description: "Verify everything's ready",
    icon: ClipboardCheck,
    href: '/captain/checklist',
    color: 'var(--maroon)',
    priority: true,
  },
  // Setup Actions (typically done before day-of)
  {
    id: 'draft',
    label: 'Team Draft',
    description: 'Assign players to teams',
    icon: Shuffle,
    href: '/captain/draft',
    color: 'var(--maroon-light)',
  },
  {
    id: 'messages',
    label: 'Messages',
    description: 'Send announcements',
    icon: MessageSquare,
    href: '/captain/messages',
    color: 'var(--maroon-light)',
  },
  {
    id: 'bets',
    label: 'Side Bets',
    description: 'Create & manage bets',
    icon: DollarSign,
    href: '/captain/bets',
    color: 'var(--maroon-light)',
  },
  {
    id: 'invites',
    label: 'Invitations',
    description: 'Manage trip invites',
    icon: QrCode,
    href: '/captain/invites',
    color: 'var(--maroon-light)',
  },
  {
    id: 'carts',
    label: 'Cart Assignments',
    description: 'Assign golf carts',
    icon: Car,
    href: '/captain/carts',
    color: 'var(--maroon-light)',
  },
  {
    id: 'contacts',
    label: 'Contacts',
    description: 'Emergency & venue',
    icon: Phone,
    href: '/captain/contacts',
    color: 'var(--maroon-light)',
  },
  {
    id: 'pairings',
    label: 'Print Pairings',
    description: 'Printable match sheet',
    icon: Printer,
    href: '/captain/pairings',
    color: 'var(--maroon-light)',
  },
];

export default function CaptainPage() {
  const router = useRouter();
  const { currentTrip, sessions, teams, players, teamMembers } = useTripStore();
  const { isCaptainMode, enableCaptainMode } = useUIStore();
  const [captainPin, setCaptainPin] = useState('');

  // P0-7: State for expandable quick actions grid - default to showing all
  const [showAllActions, setShowAllActions] = useState(true);

  const handleEnableCaptain = async () => {
    try {
      await enableCaptainMode(captainPin);
      setCaptainPin('');
    } catch {
      // Show error via toast
      useUIStore.getState().showToast('error', 'Incorrect PIN');
    }
  };

  // Note: avoid auto-redirects so we can render explicit empty states.

  if (!currentTrip) {
    return (
      <div className="min-h-screen pb-nav page-premium-enter texture-grain bg-[var(--canvas)]">
        <main className="container-editorial py-12">
          <EmptyStatePremium
            illustration="golf-ball"
            title="No active trip"
            description="Start or select a trip to access Captain tools."
            action={{
              label: 'Go Home',
              onClick: () => router.push('/'),
              icon: <Home size={16} />,
            }}
            variant="large"
          />
        </main>
        <BottomNav />
      </div>
    );
  }

  if (!isCaptainMode) {
    return (
      <div className="min-h-screen pb-nav page-premium-enter texture-grain bg-[var(--canvas)]">
        <PageHeader title="Captain Command" subtitle="Enable captain mode to continue" />
        <main className="container-editorial py-12">
          <div className="card p-[var(--space-6)] text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center bg-[linear-gradient(135deg,var(--maroon)_0%,var(--maroon-dark)_100%)]">
              <Shield size={32} className="text-[var(--canvas)]" />
            </div>
            <h2 className="type-title mb-[var(--space-2)]">Captain Mode</h2>
            <p className="type-body-sm text-[var(--ink-secondary)] mb-[var(--space-6)]">
              Enter your captain PIN to manage lineups, scores, and settings.
            </p>

            {/* Inline PIN entry */}
            <div className="max-w-[200px] mx-auto">
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={captainPin}
                onChange={(e) => setCaptainPin(e.target.value.replace(/\D/g, ''))}
                placeholder="4-digit PIN"
                className="input text-center text-2xl tracking-[0.5em] font-sans"
              />
            </div>

            <button
              onClick={handleEnableCaptain}
              disabled={captainPin.length < 4}
              className="btn-premium press-scale w-full mt-6 max-w-[200px] mx-auto"
            >
              <Shield size={16} /> Enable Captain Mode
            </button>
          </div>
        </main>
        <BottomNav />
      </div>
    );
  }

  const getTeamPlayers = (teamId: string) => {
    const memberIds = teamMembers.filter((tm) => tm.teamId === teamId).map((tm) => tm.playerId);
    return players.filter((p) => memberIds.includes(p.id));
  };

  const teamA = teams.find((t) => t.color === 'usa');
  const teamB = teams.find((t) => t.color === 'europe');
  const teamAPlayers = teamA ? getTeamPlayers(teamA.id) : [];
  const teamBPlayers = teamB ? getTeamPlayers(teamB.id) : [];
  const unassignedPlayers = players.filter((p) => {
    return !teamMembers.some((tm) => tm.playerId === p.id);
  });

  const activeSessions = sessions.filter((s) => s.status === 'inProgress');
  const upcomingSessions = sessions.filter((s) => s.status === 'scheduled');
  const completedSessions = sessions.filter((s) => s.status === 'completed');

  // Calculate trip readiness
  const hasPlayers = players.length >= 2;
  const hasTeams = teamAPlayers.length > 0 && teamBPlayers.length > 0;
  const hasSessions = sessions.length > 0;
  const readinessItems = [
    { label: 'Players Added', done: hasPlayers, count: players.length },
    {
      label: 'Teams Balanced',
      done: hasTeams,
      count: `${teamAPlayers.length}v${teamBPlayers.length}`,
    },
    { label: 'Sessions Created', done: hasSessions, count: sessions.length },
  ];
  const readinessPercent = Math.round(
    (readinessItems.filter((r) => r.done).length / readinessItems.length) * 100
  );

  const priorityActions = QUICK_ACTIONS.filter((a) => a.priority);
  const secondaryActions = QUICK_ACTIONS.filter((a) => !a.priority);

  return (
    <div className="min-h-screen pb-nav page-premium-enter texture-grain bg-[var(--canvas)]">
      <PageHeader
        title="Captain Command"
        subtitle={currentTrip.name}
        icon={<Shield size={16} className="text-[var(--canvas)]" />}
        iconContainerClassName="bg-[linear-gradient(135deg,var(--maroon)_0%,var(--maroon-dark)_100%)] shadow-[0_0_0_3px_rgba(114,47,55,0.12)]"
        onBack={() => router.back()}
        rightSlot={
          <Link
            href="/captain/settings"
            className="p-2 press-scale text-[var(--ink-secondary)]"
          >
            <Settings size={20} strokeWidth={1.75} />
          </Link>
        }
      />

      <main className="container-editorial">
        {/* Trip Readiness */}
        <section className="pt-[var(--space-6)] pb-[var(--space-4)]">
          <div
            className={cn(
              'card-captain',
              readinessPercent === 100
                ? 'bg-[linear-gradient(135deg,rgba(0,103,71,0.06)_0%,rgba(0,103,71,0.02)_100%)]'
                : 'bg-[var(--canvas-raised)]'
            )}
          >
            <div className="flex items-center justify-between mb-[var(--space-4)]">
              <div className="flex items-center gap-[var(--space-3)]">
                {readinessPercent === 100 ? (
                  <div className="w-[40px] h-[40px] rounded-[var(--radius-md)] bg-[var(--masters)] flex items-center justify-center">
                    <Zap size={20} className="text-[var(--canvas)]" />
                  </div>
                ) : (
                  <div className="w-[40px] h-[40px] rounded-[var(--radius-md)] bg-[var(--warning)] opacity-90 flex items-center justify-center">
                    <AlertTriangle size={20} className="text-[var(--canvas)]" />
                  </div>
                )}
                <div>
                  <p className="type-title-sm font-[family-name:var(--font-sans)]">
                    {readinessPercent === 100 ? 'Ready to Play' : 'Setup Required'}
                  </p>
                  <p className="type-caption">{readinessPercent}% complete</p>
                </div>
              </div>
              <Link
                href="/captain/checklist"
                className="type-meta text-[var(--maroon)] font-semibold"
              >
                Details
              </Link>
            </div>

            {/* Progress bar */}
            <div className="w-full h-[6px] rounded-[3px] overflow-hidden bg-[var(--rule)]">
              <div
                className={cn(
                  'h-full rounded-[3px] transition-[width] duration-500 ease-in-out',
                  readinessPercent === 100 ? 'bg-[var(--masters)]' : 'bg-[var(--maroon)]'
                )}
                style={{ width: `${readinessPercent}%` }}
              />
            </div>

            {/* Readiness items */}
            <div className="flex gap-[var(--space-4)] mt-[var(--space-4)]">
              {readinessItems.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center gap-[var(--space-2)]"
                >
                  {item.done ? (
                    <CheckCircle2 size={14} className="text-[var(--success)]" />
                  ) : (
                    <Clock size={14} className="text-[var(--ink-tertiary)]" />
                  )}
                  <span className="type-micro font-[family-name:var(--font-sans)]">
                    {item.label}: <strong>{item.count}</strong>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Captain Tools Index -- Editorial list layout */}
        <section className="pb-[var(--space-6)]">
          <h2 className="type-overline text-[var(--maroon)] mb-[var(--space-5)] font-[family-name:var(--font-sans)]">
            Captain Tools
          </h2>

          {/* Priority Actions -- editorial index rows */}
          <div className="bg-[var(--canvas-raised)] border border-[var(--maroon-subtle)] border-l-[3px] border-l-[var(--maroon)] rounded-[var(--radius-lg)] overflow-hidden">
            {priorityActions.map((action, index) => (
              <Link
                key={action.id}
                href={action.href}
                className={cn(
                  'flex items-center gap-[var(--space-4)] py-[var(--space-4)] px-[var(--space-5)] no-underline text-inherit transition-[background] duration-150',
                  index < priorityActions.length - 1 && 'border-b border-[var(--rule-faint)]'
                )}
              >
                <div className="w-[36px] h-[36px] rounded-[var(--radius-md)] bg-[var(--maroon-subtle)] text-[var(--maroon)] flex items-center justify-center shrink-0">
                  <action.icon size={18} strokeWidth={1.75} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-[family-name:var(--font-sans)] font-semibold text-[length:var(--text-sm)] text-[color:var(--ink-primary)] leading-[1.3]">
                    {action.label}
                  </p>
                  <p className="type-micro text-[var(--ink-tertiary)] mt-[2px] font-[family-name:var(--font-sans)]">
                    {action.description}
                  </p>
                </div>
                <ChevronRight
                  size={16}
                  strokeWidth={1.5}
                  className="text-[var(--ink-tertiary)] shrink-0"
                />
              </Link>
            ))}
          </div>

          {/* Expandable Secondary Actions */}
          <div className="mt-[var(--space-4)]">
            <button
              onClick={() => setShowAllActions(!showAllActions)}
              className="w-full py-[var(--space-3)] px-[var(--space-4)] flex items-center justify-center gap-[var(--space-2)] font-[family-name:var(--font-sans)] text-[length:var(--text-sm)] font-medium text-[color:var(--maroon)] bg-transparent border border-[var(--rule)] rounded-[var(--radius-md)] cursor-pointer transition-[background] duration-150"
            >
              <span>{showAllActions ? 'Show Less' : 'More Tools'}</span>
              <ChevronDown
                size={16}
                className={cn(
                  'transition-transform duration-200',
                  showAllActions ? 'rotate-180' : 'rotate-0'
                )}
              />
            </button>

            {/* Secondary Actions list */}
            {showAllActions && (
              <div className="mt-[var(--space-3)] bg-[var(--canvas-raised)] border border-[var(--rule)] rounded-[var(--radius-lg)] overflow-hidden">
                {secondaryActions.map((action, index) => (
                  <Link
                    key={action.id}
                    href={action.href}
                    className={cn(
                      'flex items-center gap-[var(--space-4)] py-[var(--space-4)] px-[var(--space-5)] no-underline text-inherit transition-[background] duration-150',
                      index < secondaryActions.length - 1 && 'border-b border-[var(--rule-faint)]'
                    )}
                  >
                    <div className="w-[36px] h-[36px] rounded-[var(--radius-md)] bg-[var(--maroon-subtle)] text-[var(--maroon-light)] flex items-center justify-center shrink-0">
                      <action.icon size={18} strokeWidth={1.75} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-[family-name:var(--font-sans)] font-semibold text-[length:var(--text-sm)] text-[color:var(--ink-primary)] leading-[1.3]">
                        {action.label}
                      </p>
                      <p className="type-micro text-[var(--ink-tertiary)] mt-[2px] font-[family-name:var(--font-sans)]">
                        {action.description}
                      </p>
                    </div>
                    <ChevronRight
                      size={16}
                      strokeWidth={1.5}
                      className="text-[var(--ink-tertiary)] shrink-0"
                    />
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>

        <hr className="divider-subtle" />

        {/* Active Sessions */}
        {activeSessions.length > 0 && (
          <section className="pt-[var(--space-6)] pb-[var(--space-4)]">
            <div className="flex items-center justify-between mb-[var(--space-4)]">
              <h2 className="type-overline text-[var(--masters)] font-[family-name:var(--font-sans)]">
                Live Sessions
              </h2>
              <span className="live-badge">
                <span className="live-dot" />
                {activeSessions.length} Active
              </span>
            </div>
            <div className="flex flex-col gap-[var(--space-3)]">
              {activeSessions.map((session) => (
                <Link key={session.id} href={`/lineup/${session.id}`} className="match-row">
                  <div className="w-[40px] h-[40px] rounded-[var(--radius-md)] bg-[var(--masters)] text-[var(--canvas)] flex items-center justify-center">
                    <Zap size={18} />
                  </div>
                  <div className="flex-1">
                    <p className="type-title-sm font-[family-name:var(--font-sans)]">
                      {session.name}
                    </p>
                    <p className="type-micro capitalize">
                      {session.sessionType}
                    </p>
                  </div>
                  <ChevronRight size={20} className="text-[var(--ink-tertiary)]" />
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Upcoming Sessions */}
        <section className="pt-[var(--space-4)] pb-[var(--space-6)]">
          <div className="flex items-center justify-between mb-[var(--space-4)]">
            <h2 className="type-overline text-[var(--maroon)] font-[family-name:var(--font-sans)]">
              Upcoming Sessions
            </h2>
            <Link
              href="/lineup/new"
              className="inline-flex items-center gap-[4px] text-[color:var(--maroon)] font-[family-name:var(--font-sans)] font-semibold text-[length:var(--text-sm)] no-underline"
            >
              <Plus size={16} strokeWidth={2} />
              New
            </Link>
          </div>
          {upcomingSessions.length > 0 ? (
            <div className="flex flex-col gap-[var(--space-3)]">
              {upcomingSessions.map((session) => (
                <Link key={session.id} href={`/lineup/${session.id}`} className="match-row">
                  <div className="w-[40px] h-[40px] rounded-[var(--radius-md)] bg-[var(--canvas-sunken)] flex items-center justify-center">
                    <Calendar size={18} className="text-[var(--ink-secondary)]" />
                  </div>
                  <div className="flex-1">
                    <p className="type-title-sm font-[family-name:var(--font-sans)]">
                      {session.name}
                    </p>
                    <p className="type-micro capitalize">
                      {session.sessionType} &middot;{' '}
                      {session.scheduledDate
                        ? new Date(session.scheduledDate).toLocaleDateString()
                        : 'No date'}
                    </p>
                  </div>
                  <span
                    className={`py-[3px] px-[8px] rounded-[6px] font-[family-name:var(--font-sans)] text-[10px] font-semibold uppercase tracking-[0.05em] ${
                      session.isLocked
                        ? 'bg-[var(--maroon)] text-[var(--canvas)]'
                        : 'bg-[var(--canvas-sunken)] text-[var(--ink-tertiary)]'
                    }`}
                  >
                    {session.isLocked ? 'Locked' : 'Draft'}
                  </span>
                  <ChevronRight size={20} className="text-[var(--ink-tertiary)]" />
                </Link>
              ))}
            </div>
          ) : (
            <div className="card-captain text-center p-[var(--space-8)]">
              <Calendar
                size={32}
                className="text-[var(--ink-tertiary)] mx-auto mb-[var(--space-3)]"
              />
              <p className="type-title-sm mb-[var(--space-2)] font-[family-name:var(--font-sans)]">
                No Sessions Yet
              </p>
              <p className="type-caption mb-[var(--space-4)] font-[family-name:var(--font-sans)]">
                Create your first session to start building lineups
              </p>
              <Link
                href="/lineup/new"
                className="btn btn-primary inline-flex items-center gap-[var(--space-2)] bg-[var(--maroon)]"
              >
                <Plus size={16} />
                Create Session
              </Link>
            </div>
          )}
        </section>

        {/* Team Overview */}
        <hr className="divider-subtle" />
        <section className="pt-[var(--space-6)] pb-[var(--space-6)]">
          <div className="flex items-center justify-between mb-[var(--space-4)]">
            <h2 className="type-overline text-[var(--maroon)] font-[family-name:var(--font-sans)]">
              Team Overview
            </h2>
            <Link
              href="/players"
              className="type-meta text-[var(--maroon)] font-semibold no-underline"
            >
              Manage
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-[var(--space-4)]">
            {/* Team A */}
            <div className="card team-bg-usa p-[var(--space-4)]">
              <div className="flex items-center gap-[var(--space-2)] mb-[var(--space-3)]">
                <span className="team-dot team-dot-usa" />
                <span className="type-overline text-[var(--team-usa)] font-[family-name:var(--font-sans)]">
                  {teamA?.name || 'Team USA'}
                </span>
              </div>
              <p className="type-headline-sm font-[family-name:var(--font-serif)]">
                {teamAPlayers.length}
              </p>
              <p className="type-micro font-[family-name:var(--font-sans)]">
                players
              </p>
            </div>

            {/* Team B */}
            <div className="card team-bg-europe p-[var(--space-4)]">
              <div className="flex items-center gap-[var(--space-2)] mb-[var(--space-3)]">
                <span className="team-dot team-dot-europe" />
                <span className="type-overline text-[var(--team-europe)] font-[family-name:var(--font-sans)]">
                  {teamB?.name || 'Team Europe'}
                </span>
              </div>
              <p className="type-headline-sm font-[family-name:var(--font-serif)]">
                {teamBPlayers.length}
              </p>
              <p className="type-micro font-[family-name:var(--font-sans)]">
                players
              </p>
            </div>
          </div>

          {unassignedPlayers.length > 0 && (
            <div className="card-captain mt-[var(--space-4)] bg-[var(--maroon-subtle)]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-[var(--space-3)]">
                  <AlertTriangle size={20} className="text-[var(--maroon)]" />
                  <div>
                    <p className="type-title-sm text-[var(--maroon-dark)] font-[family-name:var(--font-sans)]">
                      {unassignedPlayers.length} Unassigned
                    </p>
                    <p className="type-micro text-[var(--maroon-light)] font-[family-name:var(--font-sans)]">
                      Players need team assignment
                    </p>
                  </div>
                </div>
                <Link
                  href="/captain/draft"
                  className="btn btn-sm bg-[var(--maroon)] text-[var(--canvas)] font-[family-name:var(--font-sans)]"
                >
                  Assign
                </Link>
              </div>
            </div>
          )}
        </section>

        {/* Completed Sessions */}
        {completedSessions.length > 0 && (
          <>
            <hr className="divider-subtle" />
            <section className="pt-[var(--space-6)] pb-[var(--space-6)]">
              <h2 className="type-overline mb-[var(--space-4)] text-[var(--ink-secondary)] font-[family-name:var(--font-sans)]">
                Completed Sessions
              </h2>
              <div className="flex flex-col gap-[var(--space-3)]">
                {completedSessions.slice(0, 3).map((session) => (
                  <Link key={session.id} href={`/lineup/${session.id}`} className="match-row">
                    <div className="w-[40px] h-[40px] rounded-[var(--radius-md)] bg-[rgba(34,197,94,0.1)] flex items-center justify-center">
                      <Trophy size={18} className="text-[var(--success)]" />
                    </div>
                    <div className="flex-1">
                      <p className="type-title-sm font-[family-name:var(--font-sans)]">
                        {session.name}
                      </p>
                      <p className="type-micro capitalize">
                        {session.sessionType}
                      </p>
                    </div>
                    <CheckCircle2 size={18} className="text-[var(--success)]" />
                  </Link>
                ))}
              </div>
            </section>
          </>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
