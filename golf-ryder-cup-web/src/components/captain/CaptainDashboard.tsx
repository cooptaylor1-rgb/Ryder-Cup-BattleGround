/**
 * Captain Dashboard Component
 *
 * Unified command center for trip captains/organizers showing:
 * - Trip setup progress
 * - Pending tasks and actions
 * - Quick stats (players, sessions, matches)
 * - At-a-glance tournament status
 *
 * Features:
 * - Task checklist with completion status
 * - Quick action buttons
 * - Session overview cards
 * - Team composition summary
 */

'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import {
  Users,
  Calendar,
  Flag,
  Trophy,
  Settings,
  Plus,
  CheckCircle2,
  Circle,
  AlertCircle,
  ChevronRight,
  Megaphone,
  UserPlus,
  ClipboardList,
  Share2,
} from 'lucide-react';

// ============================================
// TYPES
// ============================================

export interface TripSetupStatus {
  tripCreated: boolean;
  playersAdded: number;
  minimumPlayers: number;
  teamsBalanced: boolean;
  sessionsCreated: number;
  lineupsSet: number;
  totalSessions: number;
}

export interface SessionSummary {
  id: string;
  name: string;
  type: 'foursomes' | 'fourball' | 'singles';
  status: 'needs_lineup' | 'lineup_set' | 'in_progress' | 'completed';
  scheduledDate?: string;
  timeSlot?: 'AM' | 'PM';
  matchCount: number;
  pointsPerMatch: number;
}

export interface TeamSummary {
  id: 'A' | 'B';
  name: string;
  playerCount: number;
  points: number;
  matchesWon: number;
  matchesLost: number;
  matchesHalved: number;
}

interface CaptainDashboardProps {
  tripId: string;
  tripName: string;
  setupStatus: TripSetupStatus;
  sessions: SessionSummary[];
  teams: { teamA: TeamSummary; teamB: TeamSummary };
  onCreateSession?: () => void;
  onAddPlayer?: () => void;
  onSendAnnouncement?: () => void;
  onShareTrip?: () => void;
  className?: string;
}

// ============================================
// CAPTAIN DASHBOARD
// ============================================

export function CaptainDashboard({
  tripId,
  tripName,
  setupStatus,
  sessions,
  teams,
  onCreateSession,
  onAddPlayer,
  onSendAnnouncement,
  onShareTrip,
  className,
}: CaptainDashboardProps) {
  const [showAllTasks, setShowAllTasks] = useState(false);

  const setupTasks = useMemo(() => getSetupTasks(setupStatus), [setupStatus]);
  const completedTasks = setupTasks.filter((t) => t.completed).length;
  const setupProgress = Math.round((completedTasks / setupTasks.length) * 100);

  const pendingSessions = sessions.filter((s) => s.status === 'needs_lineup');
  const activeSessions = sessions.filter((s) => s.status === 'in_progress');

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1
            className="text-2xl font-bold"
            style={{ color: 'var(--ink)' }}
          >
            Captain Dashboard
          </h1>
          <p
            className="text-sm mt-1"
            style={{ color: 'var(--ink-secondary)' }}
          >
            {tripName}
          </p>
        </div>
        <Link
          href={`/trip/${tripId}/settings`}
          className="p-2 rounded-lg transition-colors"
          style={{ background: 'var(--surface)', color: 'var(--ink-secondary)' }}
        >
          <Settings className="w-5 h-5" />
        </Link>
      </div>

      {/* Setup Progress */}
      <SetupProgressCard
        progress={setupProgress}
        tasks={setupTasks}
        showAll={showAllTasks}
        onToggleShowAll={() => setShowAllTasks(!showAllTasks)}
      />

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        <QuickActionButton
          icon={<UserPlus className="w-5 h-5" />}
          label="Add Player"
          onClick={onAddPlayer}
        />
        <QuickActionButton
          icon={<Calendar className="w-5 h-5" />}
          label="Create Session"
          onClick={onCreateSession}
        />
        <QuickActionButton
          icon={<Megaphone className="w-5 h-5" />}
          label="Announcement"
          onClick={onSendAnnouncement}
        />
        <QuickActionButton
          icon={<Share2 className="w-5 h-5" />}
          label="Share Trip"
          onClick={onShareTrip}
        />
      </div>

      {/* Attention Needed */}
      {pendingSessions.length > 0 && (
        <AttentionCard
          title="Lineups Needed"
          description={`${pendingSessions.length} session${pendingSessions.length > 1 ? 's' : ''} waiting for lineup`}
          sessions={pendingSessions}
          tripId={tripId}
        />
      )}

      {/* Live Sessions */}
      {activeSessions.length > 0 && (
        <div
          className="p-4 rounded-2xl"
          style={{
            background: 'linear-gradient(135deg, var(--masters) 0%, #004D35 100%)',
          }}
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-[color:var(--canvas-raised)] animate-pulse" />
            <span className="text-[var(--canvas)] font-medium text-sm">Live Now</span>
          </div>
          <div className="space-y-2">
            {activeSessions.map((session) => (
              <Link
                key={session.id}
                href={`/lineup/${session.id}`}
                className="block p-3 rounded-xl bg-[color:var(--canvas-raised)]/12 backdrop-blur-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[var(--canvas)] font-medium">{session.name}</span>
                  <ChevronRight className="w-4 h-4 text-[color:var(--canvas)]/70" />
                </div>
                <p className="text-[color:var(--canvas)]/70 text-sm mt-0.5">
                  {session.matchCount} matches in progress
                </p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Team Overview */}
      <TeamOverviewCard teams={teams} />

      {/* Sessions Overview */}
      <SessionsOverview
        sessions={sessions}
        tripId={tripId}
        onCreateSession={onCreateSession}
      />

      {/* Quick Stats */}
      <QuickStatsGrid
        setupStatus={setupStatus}
        sessions={sessions}
        teams={teams}
      />
    </div>
  );
}

// ============================================
// SETUP PROGRESS CARD
// ============================================

interface SetupTask {
  id: string;
  label: string;
  completed: boolean;
  priority: 'required' | 'recommended' | 'optional';
  action?: { label: string; href: string };
}

function getSetupTasks(status: TripSetupStatus): SetupTask[] {
  return [
    {
      id: 'trip',
      label: 'Create trip',
      completed: status.tripCreated,
      priority: 'required',
    },
    {
      id: 'players',
      label: `Add players (${status.playersAdded}/${status.minimumPlayers} minimum)`,
      completed: status.playersAdded >= status.minimumPlayers,
      priority: 'required',
      action: { label: 'Add', href: '/players' },
    },
    {
      id: 'teams',
      label: 'Balance teams',
      completed: status.teamsBalanced,
      priority: 'required',
      action: { label: 'Manage', href: '/players' },
    },
    {
      id: 'sessions',
      label: `Create sessions (${status.sessionsCreated} created)`,
      completed: status.sessionsCreated > 0,
      priority: 'required',
      action: { label: 'Create', href: '/matchups' },
    },
    {
      id: 'lineups',
      label: `Set lineups (${status.lineupsSet}/${status.totalSessions})`,
      completed: status.lineupsSet === status.totalSessions && status.totalSessions > 0,
      priority: 'required',
      action: { label: 'Set', href: '/matchups' },
    },
  ];
}

interface SetupProgressCardProps {
  progress: number;
  tasks: SetupTask[];
  showAll: boolean;
  onToggleShowAll: () => void;
}

function SetupProgressCard({ progress, tasks, showAll, onToggleShowAll }: SetupProgressCardProps) {
  const incompleteTasks = tasks.filter((t) => !t.completed);
  const displayTasks = showAll ? tasks : incompleteTasks.slice(0, 3);

  return (
    <div
      className="p-4 rounded-2xl"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--rule)',
      }}
    >
      {/* Progress Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3
            className="font-semibold"
            style={{ color: 'var(--ink)' }}
          >
            Trip Setup
          </h3>
          <p
            className="text-sm"
            style={{ color: 'var(--ink-secondary)' }}
          >
            {progress === 100 ? 'Ready to play!' : `${100 - progress}% remaining`}
          </p>
        </div>
        <div className="relative w-14 h-14">
          <svg className="w-full h-full -rotate-90">
            <circle
              cx="28"
              cy="28"
              r="24"
              fill="none"
              stroke="var(--rule)"
              strokeWidth="4"
            />
            <circle
              cx="28"
              cy="28"
              r="24"
              fill="none"
              stroke="var(--masters)"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={150.8}
              strokeDashoffset={150.8 * (1 - progress / 100)}
              className="transition-all duration-500"
            />
          </svg>
          <span
            className="absolute inset-0 flex items-center justify-center text-sm font-bold"
            style={{ color: 'var(--masters)' }}
          >
            {progress}%
          </span>
        </div>
      </div>

      {/* Task List */}
      <div className="space-y-2">
        {displayTasks.map((task) => (
          <div
            key={task.id}
            className="flex items-center gap-3 py-2"
          >
            {task.completed ? (
              <CheckCircle2 className="w-5 h-5 shrink-0" style={{ color: 'var(--success)' }} />
            ) : (
              <Circle className="w-5 h-5 shrink-0" style={{ color: 'var(--ink-tertiary)' }} />
            )}
            <span
              className={cn('flex-1 text-sm', task.completed && 'line-through')}
              style={{ color: task.completed ? 'var(--ink-tertiary)' : 'var(--ink)' }}
            >
              {task.label}
            </span>
            {!task.completed && task.action && (
              <Link
                href={task.action.href}
                className="text-xs font-medium px-2 py-1 rounded-md"
                style={{ background: 'var(--masters)', color: 'var(--canvas)' }}
              >
                {task.action.label}
              </Link>
            )}
          </div>
        ))}
      </div>

      {/* Toggle */}
      {tasks.length > 3 && (
        <button
          onClick={onToggleShowAll}
          className="w-full mt-3 pt-3 text-sm font-medium"
          style={{ borderTop: '1px solid var(--rule)', color: 'var(--masters)' }}
        >
          {showAll ? 'Show less' : `Show all ${tasks.length} tasks`}
        </button>
      )}
    </div>
  );
}

// ============================================
// QUICK ACTION BUTTON
// ============================================

interface QuickActionButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
}

function QuickActionButton({ icon, label, onClick, disabled }: QuickActionButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex items-center gap-3 p-4 rounded-xl transition-all active:scale-[0.98]"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--rule)',
        color: 'var(--ink)',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center"
        style={{
          background: 'var(--surface-raised)',
          color: 'var(--masters)',
        }}
      >
        {icon}
      </div>
      <span className="font-medium text-sm">{label}</span>
    </button>
  );
}

// ============================================
// ATTENTION CARD
// ============================================

interface AttentionCardProps {
  title: string;
  description: string;
  sessions: SessionSummary[];
  tripId: string;
}

function AttentionCard({ title, description, sessions, tripId: _tripId }: AttentionCardProps) {
  return (
    <div
      className="p-4 rounded-2xl"
      style={{
        background: 'var(--warning)',
        color: 'var(--canvas)',
      }}
    >
      <div className="flex items-start gap-3">
        <AlertCircle className="w-6 h-6 shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="font-bold">{title}</h3>
          <p className="text-sm text-[color:var(--canvas)]/80 mt-0.5">{description}</p>

          <div className="mt-3 space-y-2">
            {sessions.slice(0, 3).map((session) => (
              <Link
                key={session.id}
                href={`/lineup/${session.id}`}
                className="block p-3 rounded-xl bg-[color:var(--canvas-raised)]/18 backdrop-blur-sm"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium">{session.name}</span>
                    <p className="text-sm text-[color:var(--canvas)]/70">
                      {session.type} • {session.matchCount} matches
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-[color:var(--canvas)]/70" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// TEAM OVERVIEW CARD
// ============================================

interface TeamOverviewCardProps {
  teams: { teamA: TeamSummary; teamB: TeamSummary };
}

function TeamOverviewCard({ teams }: TeamOverviewCardProps) {
  const { teamA, teamB } = teams;
  const totalPoints = teamA.points + teamB.points;

  return (
    <div
      className="p-4 rounded-2xl"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--rule)',
      }}
    >
      <h3
        className="font-semibold mb-4"
        style={{ color: 'var(--ink)' }}
      >
        Team Standings
      </h3>

      <div className="space-y-4">
        {/* Team A */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ background: 'var(--team-usa)' }}
              />
              <span className="font-medium" style={{ color: 'var(--ink)' }}>
                {teamA.name}
              </span>
              <span className="text-xs" style={{ color: 'var(--ink-tertiary)' }}>
                ({teamA.playerCount} players)
              </span>
            </div>
            <span
              className="text-xl font-bold"
              style={{ color: 'var(--team-usa)' }}
            >
              {teamA.points}
            </span>
          </div>
          <div
            className="h-2 rounded-full overflow-hidden"
            style={{ background: 'var(--rule)' }}
          >
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: totalPoints > 0 ? `${(teamA.points / totalPoints) * 100}%` : '50%',
                background: 'var(--team-usa)',
              }}
            />
          </div>
        </div>

        {/* Team B */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ background: 'var(--team-europe)' }}
              />
              <span className="font-medium" style={{ color: 'var(--ink)' }}>
                {teamB.name}
              </span>
              <span className="text-xs" style={{ color: 'var(--ink-tertiary)' }}>
                ({teamB.playerCount} players)
              </span>
            </div>
            <span
              className="text-xl font-bold"
              style={{ color: 'var(--team-europe)' }}
            >
              {teamB.points}
            </span>
          </div>
          <div
            className="h-2 rounded-full overflow-hidden"
            style={{ background: 'var(--rule)' }}
          >
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: totalPoints > 0 ? `${(teamB.points / totalPoints) * 100}%` : '50%',
                background: 'var(--team-europe)',
              }}
            />
          </div>
        </div>
      </div>

      {/* Record Summary */}
      <div
        className="mt-4 pt-4 grid grid-cols-2 gap-4 text-center text-xs"
        style={{ borderTop: '1px solid var(--rule)' }}
      >
        <div>
          <p style={{ color: 'var(--ink-secondary)' }}>
            {teamA.matchesWon}W-{teamA.matchesLost}L-{teamA.matchesHalved}H
          </p>
        </div>
        <div>
          <p style={{ color: 'var(--ink-secondary)' }}>
            {teamB.matchesWon}W-{teamB.matchesLost}L-{teamB.matchesHalved}H
          </p>
        </div>
      </div>
    </div>
  );
}

// ============================================
// SESSIONS OVERVIEW
// ============================================

interface SessionsOverviewProps {
  sessions: SessionSummary[];
  tripId: string;
  onCreateSession?: () => void;
}

function SessionsOverview({ sessions, tripId: _tripId, onCreateSession }: SessionsOverviewProps) {
  const statusConfig = {
    needs_lineup: { label: 'Needs Lineup', color: 'var(--warning)', icon: ClipboardList },
    lineup_set: { label: 'Ready', color: 'var(--success)', icon: CheckCircle2 },
    in_progress: { label: 'Live', color: 'var(--error)', icon: Flag },
    completed: { label: 'Complete', color: 'var(--ink-tertiary)', icon: Trophy },
  };

  return (
    <div
      className="p-4 rounded-2xl"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--rule)',
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <h3
          className="font-semibold"
          style={{ color: 'var(--ink)' }}
        >
          Sessions
        </h3>
        {onCreateSession && (
          <button
            onClick={onCreateSession}
            className="flex items-center gap-1 text-sm font-medium"
            style={{ color: 'var(--masters)' }}
          >
            <Plus className="w-4 h-4" />
            Add
          </button>
        )}
      </div>

      {sessions.length === 0 ? (
        <div className="py-8 text-center">
          <Calendar
            className="w-10 h-10 mx-auto mb-3"
            style={{ color: 'var(--ink-tertiary)' }}
          />
          <p style={{ color: 'var(--ink-secondary)' }}>No sessions created yet</p>
          {onCreateSession && (
            <button
              onClick={onCreateSession}
              className="mt-3 px-4 py-2 rounded-lg text-sm font-medium"
              style={{ background: 'var(--masters)', color: 'var(--canvas)' }}
            >
              Create First Session
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {sessions.map((session) => {
            const config = statusConfig[session.status];
            const StatusIcon = config.icon;

            return (
              <Link
                key={session.id}
                href={`/lineup/${session.id}`}
                className="flex items-center gap-3 p-3 rounded-xl transition-colors"
                style={{ background: 'var(--surface-raised)' }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{
                    background: `${config.color}15`,
                    color: config.color,
                  }}
                >
                  <StatusIcon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className="font-medium text-sm truncate"
                    style={{ color: 'var(--ink)' }}
                  >
                    {session.name}
                  </p>
                  <p
                    className="text-xs"
                    style={{ color: 'var(--ink-secondary)' }}
                  >
                    {session.type} • {session.matchCount} matches • {session.pointsPerMatch} pts each
                  </p>
                </div>
                <div
                  className="px-2 py-1 rounded-full text-xs font-medium"
                  style={{
                    background: `${config.color}15`,
                    color: config.color,
                  }}
                >
                  {config.label}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ============================================
// QUICK STATS GRID
// ============================================

interface QuickStatsGridProps {
  setupStatus: TripSetupStatus;
  sessions: SessionSummary[];
  teams: { teamA: TeamSummary; teamB: TeamSummary };
}

function QuickStatsGrid({ setupStatus, sessions, teams }: QuickStatsGridProps) {
  const totalMatches = sessions.reduce((acc, s) => acc + s.matchCount, 0);
  const completedSessions = sessions.filter((s) => s.status === 'completed').length;

  const stats = [
    {
      label: 'Players',
      value: setupStatus.playersAdded,
      icon: Users,
      color: 'var(--team-europe)',
    },
    {
      label: 'Sessions',
      value: `${completedSessions}/${sessions.length}`,
      icon: Calendar,
      color: 'var(--masters)',
    },
    {
      label: 'Matches',
      value: totalMatches,
      icon: Flag,
      color: 'var(--team-usa)',
    },
    {
      label: 'Total Points',
      value: teams.teamA.points + teams.teamB.points,
      icon: Trophy,
      color: 'var(--warning)',
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="p-4 rounded-xl text-center"
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--rule)',
          }}
        >
          <stat.icon
            className="w-6 h-6 mx-auto mb-2"
            style={{ color: stat.color }}
          />
          <p
            className="text-2xl font-bold"
            style={{ color: 'var(--ink)' }}
          >
            {stat.value}
          </p>
          <p
            className="text-xs"
            style={{ color: 'var(--ink-tertiary)' }}
          >
            {stat.label}
          </p>
        </div>
      ))}
    </div>
  );
}

export default CaptainDashboard;
