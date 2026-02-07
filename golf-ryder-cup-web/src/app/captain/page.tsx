'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTripStore, useUIStore } from '@/lib/stores';
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
  MoreHorizontal,
  Zap,
  Car,
  Phone,
  Sliders,
  DollarSign,
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
];

export default function CaptainPage() {
  const router = useRouter();
  const { currentTrip, sessions, teams, players, teamMembers } = useTripStore();
  const { isCaptainMode } = useUIStore();

  // P0-7: State for expandable quick actions grid - default to showing all
  const [showAllActions, setShowAllActions] = useState(true);

  // Note: avoid auto-redirects so we can render explicit empty states.

  if (!currentTrip) {
    return (
      <div
        className="min-h-screen pb-nav page-premium-enter texture-grain"
        style={{ background: 'var(--canvas)' }}
      >
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
      <div
        className="min-h-screen pb-nav page-premium-enter texture-grain"
        style={{ background: 'var(--canvas)' }}
      >
        <main className="container-editorial py-12">
          <EmptyStatePremium
            illustration="trophy"
            title="Captain mode required"
            description="Turn on Captain Mode to access the Captain Command Center."
            action={{
              label: 'Open More',
              onClick: () => router.push('/more'),
              icon: <MoreHorizontal size={16} />,
            }}
            secondaryAction={{
              label: 'Go Home',
              onClick: () => router.push('/'),
            }}
            variant="large"
          />
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
    <div
      className="min-h-screen pb-nav page-premium-enter texture-grain"
      style={{ background: 'var(--canvas)' }}
    >
      <PageHeader
        title="Captain Command"
        subtitle={currentTrip.name}
        icon={<Shield size={16} style={{ color: 'white' }} />}
        iconContainerStyle={{
          background: 'linear-gradient(135deg, var(--maroon) 0%, var(--maroon-dark) 100%)',
          boxShadow: '0 0 0 3px rgba(114, 47, 55, 0.12)',
        }}
        onBack={() => router.back()}
        rightSlot={
          <Link
            href="/captain/settings"
            className="p-2 press-scale"
            style={{ color: 'var(--ink-secondary)' }}
          >
            <Settings size={20} strokeWidth={1.75} />
          </Link>
        }
      />

      <main className="container-editorial">
        {/* Trip Readiness */}
        <section style={{ paddingTop: 'var(--space-6)', paddingBottom: 'var(--space-4)' }}>
          <div
            className="card-captain"
            style={{
              background:
                readinessPercent === 100
                  ? 'linear-gradient(135deg, rgba(0, 103, 71, 0.06) 0%, rgba(0, 103, 71, 0.02) 100%)'
                  : 'var(--canvas-raised)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 'var(--space-4)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                {readinessPercent === 100 ? (
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--masters)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Zap size={20} style={{ color: 'white' }} />
                  </div>
                ) : (
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--warning)',
                      opacity: 0.9,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <AlertTriangle size={20} style={{ color: 'white' }} />
                  </div>
                )}
                <div>
                  <p
                    className="type-title-sm"
                    style={{ fontFamily: 'var(--font-sans)' }}
                  >
                    {readinessPercent === 100 ? 'Ready to Play' : 'Setup Required'}
                  </p>
                  <p className="type-caption">{readinessPercent}% complete</p>
                </div>
              </div>
              <Link
                href="/captain/checklist"
                className="type-meta"
                style={{ color: 'var(--maroon)', fontWeight: 600 }}
              >
                Details
              </Link>
            </div>

            {/* Progress bar */}
            <div
              style={{
                width: '100%',
                height: '6px',
                borderRadius: '3px',
                overflow: 'hidden',
                background: 'var(--rule)',
              }}
            >
              <div
                style={{
                  height: '100%',
                  borderRadius: '3px',
                  transition: 'width 500ms ease',
                  width: `${readinessPercent}%`,
                  background: readinessPercent === 100 ? 'var(--masters)' : 'var(--maroon)',
                }}
              />
            </div>

            {/* Readiness items */}
            <div style={{ display: 'flex', gap: 'var(--space-4)', marginTop: 'var(--space-4)' }}>
              {readinessItems.map((item) => (
                <div
                  key={item.label}
                  style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}
                >
                  {item.done ? (
                    <CheckCircle2 size={14} style={{ color: 'var(--success)' }} />
                  ) : (
                    <Clock size={14} style={{ color: 'var(--ink-tertiary)' }} />
                  )}
                  <span
                    className="type-micro"
                    style={{ fontFamily: 'var(--font-sans)' }}
                  >
                    {item.label}: <strong>{item.count}</strong>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Captain Tools Index -- Editorial list layout */}
        <section style={{ paddingBottom: 'var(--space-6)' }}>
          <h2
            className="type-overline"
            style={{
              color: 'var(--maroon)',
              marginBottom: 'var(--space-5)',
              fontFamily: 'var(--font-sans)',
            }}
          >
            Captain Tools
          </h2>

          {/* Priority Actions -- editorial index rows */}
          <div
            style={{
              background: 'var(--canvas-raised)',
              border: '1px solid var(--maroon-subtle)',
              borderLeft: '3px solid var(--maroon)',
              borderRadius: 'var(--radius-lg)',
              overflow: 'hidden',
            }}
          >
            {priorityActions.map((action, index) => (
              <Link
                key={action.id}
                href={action.href}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-4)',
                  padding: 'var(--space-4) var(--space-5)',
                  textDecoration: 'none',
                  color: 'inherit',
                  borderBottom:
                    index < priorityActions.length - 1
                      ? '1px solid var(--rule-faint)'
                      : 'none',
                  transition: 'background 150ms ease',
                }}
              >
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--maroon-subtle)',
                    color: 'var(--maroon)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <action.icon size={18} strokeWidth={1.75} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p
                    style={{
                      fontFamily: 'var(--font-sans)',
                      fontWeight: 600,
                      fontSize: 'var(--text-sm)',
                      color: 'var(--ink-primary)',
                      lineHeight: 1.3,
                    }}
                  >
                    {action.label}
                  </p>
                  <p
                    className="type-micro"
                    style={{
                      color: 'var(--ink-tertiary)',
                      marginTop: '2px',
                      fontFamily: 'var(--font-sans)',
                    }}
                  >
                    {action.description}
                  </p>
                </div>
                <ChevronRight
                  size={16}
                  strokeWidth={1.5}
                  style={{ color: 'var(--ink-tertiary)', flexShrink: 0 }}
                />
              </Link>
            ))}
          </div>

          {/* Expandable Secondary Actions */}
          <div style={{ marginTop: 'var(--space-4)' }}>
            <button
              onClick={() => setShowAllActions(!showAllActions)}
              style={{
                width: '100%',
                padding: 'var(--space-3) var(--space-4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 'var(--space-2)',
                fontFamily: 'var(--font-sans)',
                fontSize: 'var(--text-sm)',
                fontWeight: 500,
                color: 'var(--maroon)',
                background: 'transparent',
                border: '1px solid var(--rule)',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
                transition: 'background 150ms ease',
              }}
            >
              <span>{showAllActions ? 'Show Less' : 'More Tools'}</span>
              <ChevronDown
                size={16}
                style={{
                  transition: 'transform 200ms ease',
                  transform: showAllActions ? 'rotate(180deg)' : 'rotate(0deg)',
                }}
              />
            </button>

            {/* Secondary Actions list */}
            {showAllActions && (
              <div
                style={{
                  marginTop: 'var(--space-3)',
                  background: 'var(--canvas-raised)',
                  border: '1px solid var(--rule)',
                  borderRadius: 'var(--radius-lg)',
                  overflow: 'hidden',
                }}
              >
                {secondaryActions.map((action, index) => (
                  <Link
                    key={action.id}
                    href={action.href}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--space-4)',
                      padding: 'var(--space-4) var(--space-5)',
                      textDecoration: 'none',
                      color: 'inherit',
                      borderBottom:
                        index < secondaryActions.length - 1
                          ? '1px solid var(--rule-faint)'
                          : 'none',
                      transition: 'background 150ms ease',
                    }}
                  >
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: 'var(--radius-md)',
                        background: 'var(--maroon-subtle)',
                        color: 'var(--maroon-light)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <action.icon size={18} strokeWidth={1.75} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p
                        style={{
                          fontFamily: 'var(--font-sans)',
                          fontWeight: 600,
                          fontSize: 'var(--text-sm)',
                          color: 'var(--ink-primary)',
                          lineHeight: 1.3,
                        }}
                      >
                        {action.label}
                      </p>
                      <p
                        className="type-micro"
                        style={{
                          color: 'var(--ink-tertiary)',
                          marginTop: '2px',
                          fontFamily: 'var(--font-sans)',
                        }}
                      >
                        {action.description}
                      </p>
                    </div>
                    <ChevronRight
                      size={16}
                      strokeWidth={1.5}
                      style={{ color: 'var(--ink-tertiary)', flexShrink: 0 }}
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
          <section style={{ paddingTop: 'var(--space-6)', paddingBottom: 'var(--space-4)' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 'var(--space-4)',
              }}
            >
              <h2
                className="type-overline"
                style={{ color: 'var(--masters)', fontFamily: 'var(--font-sans)' }}
              >
                Live Sessions
              </h2>
              <span className="live-badge">
                <span className="live-dot" />
                {activeSessions.length} Active
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {activeSessions.map((session) => (
                <Link key={session.id} href={`/lineup/${session.id}`} className="match-row">
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--masters)',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Zap size={18} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p className="type-title-sm" style={{ fontFamily: 'var(--font-sans)' }}>
                      {session.name}
                    </p>
                    <p className="type-micro" style={{ textTransform: 'capitalize' }}>
                      {session.sessionType}
                    </p>
                  </div>
                  <ChevronRight size={20} style={{ color: 'var(--ink-tertiary)' }} />
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Upcoming Sessions */}
        <section style={{ paddingTop: 'var(--space-4)', paddingBottom: 'var(--space-6)' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 'var(--space-4)',
            }}
          >
            <h2
              className="type-overline"
              style={{ color: 'var(--maroon)', fontFamily: 'var(--font-sans)' }}
            >
              Upcoming Sessions
            </h2>
            <Link
              href="/lineup/new"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                color: 'var(--maroon)',
                fontFamily: 'var(--font-sans)',
                fontWeight: 600,
                fontSize: 'var(--text-sm)',
                textDecoration: 'none',
              }}
            >
              <Plus size={16} strokeWidth={2} />
              New
            </Link>
          </div>
          {upcomingSessions.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {upcomingSessions.map((session) => (
                <Link key={session.id} href={`/lineup/${session.id}`} className="match-row">
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--canvas-sunken)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Calendar size={18} style={{ color: 'var(--ink-secondary)' }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p className="type-title-sm" style={{ fontFamily: 'var(--font-sans)' }}>
                      {session.name}
                    </p>
                    <p className="type-micro" style={{ textTransform: 'capitalize' }}>
                      {session.sessionType} &middot;{' '}
                      {session.scheduledDate
                        ? new Date(session.scheduledDate).toLocaleDateString()
                        : 'No date'}
                    </p>
                  </div>
                  <span
                    style={{
                      padding: '3px 8px',
                      borderRadius: '6px',
                      background: session.isLocked ? 'var(--maroon)' : 'var(--canvas-sunken)',
                      color: session.isLocked ? 'white' : 'var(--ink-tertiary)',
                      fontFamily: 'var(--font-sans)',
                      fontSize: '10px',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}
                  >
                    {session.isLocked ? 'Locked' : 'Draft'}
                  </span>
                  <ChevronRight size={20} style={{ color: 'var(--ink-tertiary)' }} />
                </Link>
              ))}
            </div>
          ) : (
            <div
              className="card-captain"
              style={{ textAlign: 'center', padding: 'var(--space-8)' }}
            >
              <Calendar
                size={32}
                style={{ color: 'var(--ink-tertiary)', margin: '0 auto var(--space-3)' }}
              />
              <p
                className="type-title-sm"
                style={{
                  marginBottom: 'var(--space-2)',
                  fontFamily: 'var(--font-sans)',
                }}
              >
                No Sessions Yet
              </p>
              <p
                className="type-caption"
                style={{
                  marginBottom: 'var(--space-4)',
                  fontFamily: 'var(--font-sans)',
                }}
              >
                Create your first session to start building lineups
              </p>
              <Link
                href="/lineup/new"
                className="btn btn-primary"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 'var(--space-2)',
                  background: 'var(--maroon)',
                }}
              >
                <Plus size={16} />
                Create Session
              </Link>
            </div>
          )}
        </section>

        {/* Team Overview */}
        <hr className="divider-subtle" />
        <section style={{ paddingTop: 'var(--space-6)', paddingBottom: 'var(--space-6)' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 'var(--space-4)',
            }}
          >
            <h2
              className="type-overline"
              style={{ color: 'var(--maroon)', fontFamily: 'var(--font-sans)' }}
            >
              Team Overview
            </h2>
            <Link
              href="/players"
              className="type-meta"
              style={{ color: 'var(--maroon)', fontWeight: 600, textDecoration: 'none' }}
            >
              Manage
            </Link>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
            {/* Team A */}
            <div className="card team-bg-usa" style={{ padding: 'var(--space-4)' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-2)',
                  marginBottom: 'var(--space-3)',
                }}
              >
                <span className="team-dot team-dot-usa" />
                <span
                  className="type-overline"
                  style={{ color: 'var(--team-usa)', fontFamily: 'var(--font-sans)' }}
                >
                  {teamA?.name || 'Team USA'}
                </span>
              </div>
              <p
                className="type-headline-sm"
                style={{ fontFamily: 'var(--font-serif)' }}
              >
                {teamAPlayers.length}
              </p>
              <p className="type-micro" style={{ fontFamily: 'var(--font-sans)' }}>
                players
              </p>
            </div>

            {/* Team B */}
            <div className="card team-bg-europe" style={{ padding: 'var(--space-4)' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-2)',
                  marginBottom: 'var(--space-3)',
                }}
              >
                <span className="team-dot team-dot-europe" />
                <span
                  className="type-overline"
                  style={{ color: 'var(--team-europe)', fontFamily: 'var(--font-sans)' }}
                >
                  {teamB?.name || 'Team Europe'}
                </span>
              </div>
              <p
                className="type-headline-sm"
                style={{ fontFamily: 'var(--font-serif)' }}
              >
                {teamBPlayers.length}
              </p>
              <p className="type-micro" style={{ fontFamily: 'var(--font-sans)' }}>
                players
              </p>
            </div>
          </div>

          {unassignedPlayers.length > 0 && (
            <div
              className="card-captain"
              style={{
                marginTop: 'var(--space-4)',
                background: 'var(--maroon-subtle)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                  <AlertTriangle size={20} style={{ color: 'var(--maroon)' }} />
                  <div>
                    <p
                      className="type-title-sm"
                      style={{ color: 'var(--maroon-dark)', fontFamily: 'var(--font-sans)' }}
                    >
                      {unassignedPlayers.length} Unassigned
                    </p>
                    <p
                      className="type-micro"
                      style={{ color: 'var(--maroon-light)', fontFamily: 'var(--font-sans)' }}
                    >
                      Players need team assignment
                    </p>
                  </div>
                </div>
                <Link
                  href="/captain/draft"
                  className="btn btn-sm"
                  style={{
                    background: 'var(--maroon)',
                    color: 'white',
                    fontFamily: 'var(--font-sans)',
                  }}
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
            <section style={{ paddingTop: 'var(--space-6)', paddingBottom: 'var(--space-6)' }}>
              <h2
                className="type-overline"
                style={{
                  marginBottom: 'var(--space-4)',
                  color: 'var(--ink-secondary)',
                  fontFamily: 'var(--font-sans)',
                }}
              >
                Completed Sessions
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                {completedSessions.slice(0, 3).map((session) => (
                  <Link key={session.id} href={`/lineup/${session.id}`} className="match-row">
                    <div
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: 'var(--radius-md)',
                        background: 'rgba(34, 197, 94, 0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Trophy size={18} style={{ color: 'var(--success)' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <p className="type-title-sm" style={{ fontFamily: 'var(--font-sans)' }}>
                        {session.name}
                      </p>
                      <p className="type-micro" style={{ textTransform: 'capitalize' }}>
                        {session.sessionType}
                      </p>
                    </div>
                    <CheckCircle2 size={18} style={{ color: 'var(--success)' }} />
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
