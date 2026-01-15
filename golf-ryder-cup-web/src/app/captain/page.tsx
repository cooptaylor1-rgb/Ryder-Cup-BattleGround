'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTripStore, useUIStore } from '@/lib/stores';
import { formatPlayerName } from '@/lib/utils';
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
  ChevronLeft,
  Plus,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Trophy,
  Home,
  Target,
  MoreHorizontal,
  CalendarDays,
  Zap,
  FileText,
  Car,
  Phone,
} from 'lucide-react';

/**
 * CAPTAIN COMMAND CENTER
 *
 * The hub for all captain operations. Masters-inspired design with
 * clear information hierarchy and quick access to essential tools.
 *
 * Features:
 * - Trip status overview
 * - Quick actions grid
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
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    id: 'lineup',
    label: 'Create Lineup',
    description: 'Build match pairings',
    icon: Users,
    href: '/lineup/new',
    color: 'var(--masters)',
  },
  {
    id: 'availability',
    label: 'Attendance',
    description: 'Track player arrivals',
    icon: UserCheck,
    href: '/captain/availability',
    color: '#22c55e',
  },
  {
    id: 'checklist',
    label: 'Pre-Flight',
    description: 'Review checklist',
    icon: ClipboardCheck,
    href: '/captain/checklist',
    color: '#3b82f6',
  },
  {
    id: 'draft',
    label: 'Team Draft',
    description: 'Assign players to teams',
    icon: Shuffle,
    href: '/captain/draft',
    color: '#8b5cf6',
  },
  {
    id: 'messages',
    label: 'Messages',
    description: 'Send announcements',
    icon: MessageSquare,
    href: '/captain/messages',
    color: '#f59e0b',
  },
  {
    id: 'invites',
    label: 'Invitations',
    description: 'Manage trip invites',
    icon: QrCode,
    href: '/captain/invites',
    color: '#ec4899',
  },
  {
    id: 'carts',
    label: 'Cart Assignments',
    description: 'Assign golf carts',
    icon: Car,
    href: '/captain/carts',
    color: '#06b6d4',
  },
  {
    id: 'contacts',
    label: 'Contacts',
    description: 'Emergency & venue',
    icon: Phone,
    href: '/captain/contacts',
    color: '#64748b',
  },
];

export default function CaptainPage() {
  const router = useRouter();
  const { currentTrip, sessions, teams, players, teamMembers } = useTripStore();
  const { isCaptainMode } = useUIStore();

  useEffect(() => {
    if (!currentTrip) {
      router.push('/');
      return;
    }
    if (!isCaptainMode) {
      router.push('/more');
    }
  }, [currentTrip, isCaptainMode, router]);

  if (!currentTrip || !isCaptainMode) return null;

  const getTeamPlayers = (teamId: string) => {
    const memberIds = teamMembers
      .filter(tm => tm.teamId === teamId)
      .map(tm => tm.playerId);
    return players.filter(p => memberIds.includes(p.id));
  };

  const teamA = teams.find(t => t.color === 'usa');
  const teamB = teams.find(t => t.color === 'europe');
  const teamAPlayers = teamA ? getTeamPlayers(teamA.id) : [];
  const teamBPlayers = teamB ? getTeamPlayers(teamB.id) : [];
  const unassignedPlayers = players.filter(p => {
    return !teamMembers.some(tm => tm.playerId === p.id);
  });

  const activeSessions = sessions.filter(s => s.status === 'inProgress');
  const upcomingSessions = sessions.filter(s => s.status === 'scheduled');
  const completedSessions = sessions.filter(s => s.status === 'completed');

  // Calculate trip readiness
  const hasPlayers = players.length >= 2;
  const hasTeams = teamAPlayers.length > 0 && teamBPlayers.length > 0;
  const hasSessions = sessions.length > 0;
  const readinessItems = [
    { label: 'Players Added', done: hasPlayers, count: players.length },
    { label: 'Teams Balanced', done: hasTeams, count: `${teamAPlayers.length}v${teamBPlayers.length}` },
    { label: 'Sessions Created', done: hasSessions, count: sessions.length },
  ];
  const readinessPercent = Math.round(
    (readinessItems.filter(r => r.done).length / readinessItems.length) * 100
  );

  return (
    <div className="min-h-screen pb-nav page-enter" style={{ background: 'var(--canvas)' }}>
      {/* Header */}
      <header className="header">
        <div className="container-editorial flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="p-2 -ml-2 press-scale"
              style={{ color: 'var(--ink-secondary)' }}
              aria-label="Back"
            >
              <ChevronLeft size={22} strokeWidth={1.75} />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <Shield size={18} style={{ color: 'var(--masters)' }} />
                <span className="type-overline">Captain Command</span>
              </div>
              <p className="type-caption truncate" style={{ marginTop: '2px' }}>
                {currentTrip.name}
              </p>
            </div>
          </div>
          <Link
            href="/captain/settings"
            className="p-2 press-scale"
            style={{ color: 'var(--ink-secondary)' }}
          >
            <Settings size={20} strokeWidth={1.75} />
          </Link>
        </div>
      </header>

      <main className="container-editorial">
        {/* Trip Readiness */}
        <section className="section">
          <div
            className="card"
            style={{
              padding: 'var(--space-5)',
              background: readinessPercent === 100
                ? 'linear-gradient(135deg, rgba(0, 103, 71, 0.1) 0%, rgba(0, 103, 71, 0.05) 100%)'
                : 'var(--surface)',
            }}
          >
            <div className="flex items-center justify-between" style={{ marginBottom: 'var(--space-4)' }}>
              <div className="flex items-center gap-3">
                {readinessPercent === 100 ? (
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: 'var(--masters)' }}
                  >
                    <Zap size={20} style={{ color: 'white' }} />
                  </div>
                ) : (
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: 'var(--warning)', opacity: 0.9 }}
                  >
                    <AlertTriangle size={20} style={{ color: 'white' }} />
                  </div>
                )}
                <div>
                  <p className="type-title-sm">
                    {readinessPercent === 100 ? 'Ready to Play' : 'Setup Required'}
                  </p>
                  <p className="type-caption">{readinessPercent}% complete</p>
                </div>
              </div>
              <Link
                href="/captain/checklist"
                className="type-meta"
                style={{ color: 'var(--masters)' }}
              >
                Details
              </Link>
            </div>

            {/* Progress bar */}
            <div
              className="w-full h-2 rounded-full overflow-hidden"
              style={{ background: 'var(--rule)' }}
            >
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${readinessPercent}%`,
                  background: readinessPercent === 100 ? 'var(--masters)' : 'var(--warning)',
                }}
              />
            </div>

            {/* Readiness items */}
            <div className="flex gap-4 mt-4">
              {readinessItems.map(item => (
                <div key={item.label} className="flex items-center gap-2">
                  {item.done ? (
                    <CheckCircle2 size={14} style={{ color: 'var(--success)' }} />
                  ) : (
                    <Clock size={14} style={{ color: 'var(--ink-tertiary)' }} />
                  )}
                  <span className="type-micro">
                    {item.label}: <strong>{item.count}</strong>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Quick Actions Grid */}
        <section className="section">
          <h2 className="type-overline" style={{ marginBottom: 'var(--space-4)' }}>
            Quick Actions
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {QUICK_ACTIONS.map(action => (
              <Link
                key={action.id}
                href={action.href}
                className="card press-scale"
                style={{ padding: 'var(--space-4)' }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                  style={{ background: `${action.color}15` }}
                >
                  <action.icon size={20} style={{ color: action.color }} />
                </div>
                <p className="type-title-sm">{action.label}</p>
                <p className="type-micro" style={{ marginTop: '2px' }}>
                  {action.description}
                </p>
              </Link>
            ))}
          </div>
        </section>

        <hr className="divider-lg" />

        {/* Active Sessions */}
        {activeSessions.length > 0 && (
          <section className="section-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="type-overline" style={{ color: 'var(--masters)' }}>
                Live Sessions
              </h2>
              <span className="live-badge">
                <span className="live-dot" />
                {activeSessions.length} Active
              </span>
            </div>
            <div className="space-y-3">
              {activeSessions.map(session => (
                <Link
                  key={session.id}
                  href={`/lineup/${session.id}`}
                  className="match-row"
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: 'var(--masters)', color: 'white' }}
                  >
                    <Zap size={18} />
                  </div>
                  <div className="flex-1">
                    <p className="type-title-sm">{session.name}</p>
                    <p className="type-micro capitalize">{session.sessionType}</p>
                  </div>
                  <ChevronRight size={20} style={{ color: 'var(--ink-tertiary)' }} />
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Upcoming Sessions */}
        <section className="section-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="type-overline">Upcoming Sessions</h2>
            <Link
              href="/lineup/new"
              className="flex items-center gap-1"
              style={{ color: 'var(--masters)', fontWeight: 500, fontSize: 'var(--text-sm)' }}
            >
              <Plus size={16} strokeWidth={2} />
              New
            </Link>
          </div>
          {upcomingSessions.length > 0 ? (
            <div className="space-y-3">
              {upcomingSessions.map(session => (
                <Link
                  key={session.id}
                  href={`/lineup/${session.id}`}
                  className="match-row"
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: 'var(--canvas-sunken)' }}
                  >
                    <Calendar size={18} style={{ color: 'var(--ink-secondary)' }} />
                  </div>
                  <div className="flex-1">
                    <p className="type-title-sm">{session.name}</p>
                    <p className="type-micro capitalize">
                      {session.sessionType} • {session.scheduledDate ? new Date(session.scheduledDate).toLocaleDateString() : 'No date'}
                    </p>
                  </div>
                  <span
                    className="type-caption px-2 py-1 rounded-full"
                    style={{
                      background: session.isLocked ? 'var(--masters)' : 'var(--canvas-sunken)',
                      color: session.isLocked ? 'white' : 'var(--ink-tertiary)',
                      fontSize: '10px',
                      fontWeight: 600,
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
              className="card text-center"
              style={{ padding: 'var(--space-8)' }}
            >
              <Calendar size={32} style={{ color: 'var(--ink-tertiary)', margin: '0 auto var(--space-3)' }} />
              <p className="type-title-sm" style={{ marginBottom: 'var(--space-2)' }}>No Sessions Yet</p>
              <p className="type-caption" style={{ marginBottom: 'var(--space-4)' }}>
                Create your first session to start building lineups
              </p>
              <Link
                href="/lineup/new"
                className="btn btn-primary inline-flex items-center gap-2"
              >
                <Plus size={16} />
                Create Session
              </Link>
            </div>
          )}
        </section>

        {/* Team Overview */}
        <hr className="divider" />
        <section className="section-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="type-overline">Team Overview</h2>
            <Link
              href="/players"
              className="type-meta"
              style={{ color: 'var(--masters)' }}
            >
              Manage
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {/* Team A */}
            <div
              className="card team-bg-usa"
              style={{ padding: 'var(--space-4)' }}
            >
              <div className="flex items-center gap-2 mb-3">
                <span className="team-dot team-dot-usa" />
                <span className="type-overline" style={{ color: 'var(--team-usa)' }}>
                  {teamA?.name || 'Team USA'}
                </span>
              </div>
              <p className="type-headline-sm">{teamAPlayers.length}</p>
              <p className="type-micro">players</p>
            </div>

            {/* Team B */}
            <div
              className="card team-bg-europe"
              style={{ padding: 'var(--space-4)' }}
            >
              <div className="flex items-center gap-2 mb-3">
                <span className="team-dot team-dot-europe" />
                <span className="type-overline" style={{ color: 'var(--team-europe)' }}>
                  {teamB?.name || 'Team Europe'}
                </span>
              </div>
              <p className="type-headline-sm">{teamBPlayers.length}</p>
              <p className="type-micro">players</p>
            </div>
          </div>

          {unassignedPlayers.length > 0 && (
            <div
              className="card mt-4"
              style={{
                padding: 'var(--space-4)',
                background: 'var(--warning)',
                opacity: 0.9,
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AlertTriangle size={20} style={{ color: 'white' }} />
                  <div>
                    <p className="type-title-sm" style={{ color: 'white' }}>
                      {unassignedPlayers.length} Unassigned
                    </p>
                    <p className="type-micro" style={{ color: 'rgba(255,255,255,0.8)' }}>
                      Players need team assignment
                    </p>
                  </div>
                </div>
                <Link
                  href="/captain/draft"
                  className="btn btn-sm"
                  style={{ background: 'white', color: 'var(--warning)' }}
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
            <hr className="divider" />
            <section className="section-sm">
              <h2 className="type-overline" style={{ marginBottom: 'var(--space-4)' }}>
                Completed Sessions
              </h2>
              <div className="space-y-3">
                {completedSessions.slice(0, 3).map(session => (
                  <Link
                    key={session.id}
                    href={`/lineup/${session.id}`}
                    className="match-row"
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ background: 'rgba(34, 197, 94, 0.1)' }}
                    >
                      <Trophy size={18} style={{ color: 'var(--success)' }} />
                    </div>
                    <div className="flex-1">
                      <p className="type-title-sm">{session.name}</p>
                      <p className="type-micro capitalize">{session.sessionType}</p>
                    </div>
                    <CheckCircle2 size={18} style={{ color: 'var(--success)' }} />
                  </Link>
                ))}
              </div>
            </section>
          </>
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="bottom-nav">
        <Link href="/" className="nav-item">
          <Home size={22} strokeWidth={1.75} />
          <span>Home</span>
        </Link>
        <Link href="/schedule" className="nav-item">
          <CalendarDays size={22} strokeWidth={1.75} />
          <span>Schedule</span>
        </Link>
        <Link href="/score" className="nav-item">
          <Target size={22} strokeWidth={1.75} />
          <span>Score</span>
        </Link>
        <Link href="/matchups" className="nav-item">
          <Users size={22} strokeWidth={1.75} />
          <span>Matches</span>
        </Link>
        <Link href="/standings" className="nav-item">
          <Trophy size={22} strokeWidth={1.75} />
          <span>Standings</span>
        </Link>
        <Link href="/more" className="nav-item">
          <MoreHorizontal size={22} strokeWidth={1.75} />
          <span>More</span>
        </Link>
      </nav>
    </div>
  );
}
