/**
 * LiveMatchMonitor Component — Phase 2: Captain Empowerment
 *
 * Real-time monitoring dashboard for all active matches:
 * - Live score updates
 * - Match status indicators
 * - Hole-by-hole progress
 * - Quick action buttons
 * - Alert highlighting
 *
 * Central command view for captains during play.
 */

'use client';

import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Edit3,
  Users,
  Zap,
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useHaptic } from '@/lib/hooks';

// ============================================
// TYPES
// ============================================

export interface LiveMatchData {
  id: string;
  matchNumber: number;
  status: 'pending' | 'in_progress' | 'completed' | 'needs_attention';

  // Teams
  teamANames: string[];
  teamBNames: string[];
  teamAPlayerIds: string[];
  teamBPlayerIds: string[];

  // Score
  currentScore: number; // Positive = Team A ahead
  displayScore: string;
  holesPlayed: number;
  holesRemaining: number;

  // Status flags
  isClosedOut: boolean;
  isDormie: boolean;
  isTight: boolean; // Within 1

  // Timing
  startTime?: string;
  lastUpdate?: string;
  estimatedFinish?: string;

  // Alerts
  hasAlert?: boolean;
  alertMessage?: string;
  alertType?: 'warning' | 'error' | 'info';
}

export interface SessionOverview {
  id: string;
  name: string;
  type: 'foursomes' | 'fourball' | 'singles';
  teamAPoints: number;
  teamBPoints: number;
  teamAName: string;
  teamBName: string;
  matches: LiveMatchData[];
  lastUpdate: string;
}

interface LiveMatchMonitorProps {
  session: SessionOverview;
  teamAColor?: string;
  teamBColor?: string;
  onMatchClick?: (matchId: string) => void;
  onEditScore?: (matchId: string) => void;
  onViewDetails?: (matchId: string) => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  className?: string;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function getMatchStatusConfig(match: LiveMatchData) {
  if (match.status === 'needs_attention') {
    return {
      icon: AlertTriangle,
      color: 'var(--error)',
      label: 'Needs Attention',
      pulse: true,
    };
  }
  if (match.isClosedOut || match.status === 'completed') {
    return {
      icon: CheckCircle2,
      color: 'var(--success)',
      label: 'Complete',
      pulse: false,
    };
  }
  if (match.isDormie) {
    return {
      icon: Zap,
      color: 'var(--warning)',
      label: 'Dormie',
      pulse: true,
    };
  }
  if (match.status === 'in_progress') {
    return {
      icon: Activity,
      color: 'var(--masters)',
      label: `Hole ${match.holesPlayed + 1}`,
      pulse: false,
    };
  }
  return {
    icon: Clock,
    color: 'var(--ink-tertiary)',
    label: 'Pending',
    pulse: false,
  };
}

function getScoreTrend(score: number): 'up' | 'down' | 'even' {
  if (score > 0) return 'up';
  if (score < 0) return 'down';
  return 'even';
}

function formatTimeAgo(isoString: string | undefined): string {
  if (!isoString) return '';
  const now = new Date();
  const then = new Date(isoString);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  return `${diffHours}h ago`;
}

// ============================================
// LIVE MATCH CARD
// ============================================

interface LiveMatchCardProps {
  match: LiveMatchData;
  teamAColor: string;
  teamBColor: string;
  teamAName: string;
  teamBName: string;
  onClick?: () => void;
  onEdit?: () => void;
}

function LiveMatchCard({
  match,
  teamAColor,
  teamBColor,
  teamAName,
  teamBName,
  onClick,
  onEdit,
}: LiveMatchCardProps) {
  const haptic = useHaptic();
  const statusConfig = getMatchStatusConfig(match);
  const trend = getScoreTrend(match.currentScore);

  const handleClick = () => {
    haptic.tap();
    onClick?.();
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    haptic.tap();
    onEdit?.();
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      onClick={handleClick}
      className={cn(
        'relative cursor-pointer rounded-xl border border-[var(--rule)] bg-[var(--surface)] p-4 transition-all',
        match.hasAlert && 'ring-2 ring-offset-2 ring-offset-[var(--canvas)]'
      )}
      style={{
        ['--tw-ring-color' as string]: match.alertType === 'error' ? 'var(--error)' : 'var(--warning)',
      }}
    >
      {/* Status Indicator */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-lg font-bold',
              statusConfig.pulse && 'animate-pulse'
            )}
            style={{ background: `${statusConfig.color}20`, color: statusConfig.color }}
          >
            {match.matchNumber}
          </div>
          <div
            className="flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-medium"
            style={{ background: `${statusConfig.color}15`, color: statusConfig.color }}
          >
            <statusConfig.icon size={12} />
            {statusConfig.label}
          </div>
        </div>

        {/* Edit Button */}
        <button
          onClick={handleEdit}
          className="rounded-lg p-1.5 text-[var(--ink-tertiary)] transition-colors hover:bg-[var(--surface-secondary)]"
        >
          <Edit3 size={14} />
        </button>
      </div>

      {/* Teams and Score */}
      <div className="flex items-center gap-3">
        {/* Team A */}
        <div className="flex-1">
          <div className="mb-1 flex items-center gap-2">
            <div className="h-2 w-2 rounded-full" style={{ background: teamAColor }} />
            <span className="text-xs font-medium uppercase" style={{ color: teamAColor }}>
              {teamAName}
            </span>
          </div>
          <div className="space-y-0.5">
            {match.teamANames.map((name, i) => (
              <p key={i} className="truncate text-sm font-medium text-[var(--ink)]">
                {name}
              </p>
            ))}
          </div>
        </div>

        {/* Score */}
        <div className="flex flex-col items-center px-4">
          <motion.div
            key={match.displayScore}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex items-center gap-1"
          >
            {trend === 'up' && <TrendingUp size={14} style={{ color: teamAColor }} />}
            {trend === 'down' && <TrendingDown size={14} style={{ color: teamBColor }} />}
            {trend === 'even' && (
              <Minus size={14} className="text-[var(--ink-tertiary)]" />
            )}
            <span
              className="text-2xl font-bold"
              style={{
                color:
                  match.currentScore > 0
                    ? teamAColor
                    : match.currentScore < 0
                      ? teamBColor
                      : 'var(--ink-tertiary)',
              }}
            >
              {match.displayScore}
            </span>
          </motion.div>
          <span className="text-[10px] text-[var(--ink-tertiary)]">thru {match.holesPlayed}</span>
        </div>

        {/* Team B */}
        <div className="flex-1 text-right">
          <div className="mb-1 flex items-center justify-end gap-2">
            <span className="text-xs font-medium uppercase" style={{ color: teamBColor }}>
              {teamBName}
            </span>
            <div className="h-2 w-2 rounded-full" style={{ background: teamBColor }} />
          </div>
          <div className="space-y-0.5">
            {match.teamBNames.map((name, i) => (
              <p key={i} className="truncate text-sm font-medium text-[var(--ink)]">
                {name}
              </p>
            ))}
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mt-3 border-t border-[var(--rule)] pt-3">
        <div className="mb-1 flex items-center justify-between text-[10px] text-[var(--ink-tertiary)]">
          <span>Progress</span>
          <span>{match.holesPlayed}/18</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-[var(--rule)]">
          <motion.div
            className="h-full rounded-full bg-[var(--masters)]"
            initial={{ width: 0 }}
            animate={{ width: `${(match.holesPlayed / 18) * 100}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>

      {/* Alert Banner */}
      {match.hasAlert && match.alertMessage && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className={cn(
            'mt-3 flex items-center gap-2 rounded-lg px-3 py-2 text-xs',
            match.alertType === 'error' && 'bg-[var(--error)]/10 text-[var(--error)]',
            match.alertType !== 'error' && 'bg-[var(--warning)]/10 text-[var(--warning)]'
          )}
        >
          <AlertTriangle size={12} />
          {match.alertMessage}
        </motion.div>
      )}

      {/* Last Update */}
      {match.lastUpdate && (
        <p className="mt-2 text-right text-[10px] text-[var(--ink-tertiary)]">
          Updated {formatTimeAgo(match.lastUpdate)}
        </p>
      )}
    </motion.div>
  );
}

// ============================================
// POINTS SUMMARY BAR
// ============================================

interface PointsSummaryBarProps {
  teamAPoints: number;
  teamBPoints: number;
  teamAColor: string;
  teamBColor: string;
  teamAName: string;
  teamBName: string;
}

function PointsSummaryBar({
  teamAPoints,
  teamBPoints,
  teamAColor,
  teamBColor,
  teamAName,
  teamBName,
}: PointsSummaryBarProps) {
  const total = teamAPoints + teamBPoints || 1;
  const teamAPercent = (teamAPoints / total) * 100;
  const teamBPercent = (teamBPoints / total) * 100;

  return (
    <div className="rounded-xl bg-[var(--surface)] p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full" style={{ background: teamAColor }} />
          <span className="text-sm font-semibold" style={{ color: teamAColor }}>
            {teamAName}
          </span>
          <span className="text-xl font-bold" style={{ color: teamAColor }}>
            {teamAPoints}
          </span>
        </div>
        <span className="text-sm font-medium text-[var(--ink-tertiary)]">vs</span>
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold" style={{ color: teamBColor }}>
            {teamBPoints}
          </span>
          <span className="text-sm font-semibold" style={{ color: teamBColor }}>
            {teamBName}
          </span>
          <div className="h-3 w-3 rounded-full" style={{ background: teamBColor }} />
        </div>
      </div>

      {/* Points Bar */}
      <div className="flex h-3 overflow-hidden rounded-full bg-[var(--rule)]">
        <motion.div
          className="h-full"
          style={{ background: teamAColor }}
          initial={{ width: 0 }}
          animate={{ width: `${teamAPercent}%` }}
          transition={{ duration: 0.5 }}
        />
        <motion.div
          className="h-full"
          style={{ background: teamBColor }}
          initial={{ width: 0 }}
          animate={{ width: `${teamBPercent}%` }}
          transition={{ duration: 0.5, delay: 0.1 }}
        />
      </div>
    </div>
  );
}

// ============================================
// LIVE MATCH MONITOR MAIN COMPONENT
// ============================================

export function LiveMatchMonitor({
  session,
  teamAColor = '#0047AB',
  teamBColor = '#8B0000',
  onMatchClick,
  onEditScore,
  onViewDetails,
  onRefresh,
  isRefreshing = false,
  className,
}: LiveMatchMonitorProps) {
  const haptic = useHaptic();

  // Group matches by status
  const { activeMatches, completedMatches, pendingMatches, alertMatches } = useMemo(() => {
    const active: LiveMatchData[] = [];
    const completed: LiveMatchData[] = [];
    const pending: LiveMatchData[] = [];
    const alert: LiveMatchData[] = [];

    for (const match of session.matches) {
      if (match.hasAlert) {
        alert.push(match);
      }
      if (match.status === 'completed' || match.isClosedOut) {
        completed.push(match);
      } else if (match.status === 'in_progress') {
        active.push(match);
      } else {
        pending.push(match);
      }
    }

    return {
      activeMatches: active,
      completedMatches: completed,
      pendingMatches: pending,
      alertMatches: alert,
    };
  }, [session.matches]);

  const handleRefresh = () => {
    haptic.tap();
    onRefresh?.();
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold text-[var(--ink)]">
            <Activity size={20} className="text-[var(--masters)]" />
            Live Matches
          </h2>
          <p className="text-sm text-[var(--ink-tertiary)]">
            {session.name} • Updated {formatTimeAgo(session.lastUpdate)}
          </p>
        </div>

        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className={cn(
            'rounded-lg bg-[var(--surface)] p-2 text-[var(--ink-secondary)] transition-colors hover:bg-[var(--surface-secondary)]',
            isRefreshing && 'animate-spin'
          )}
        >
          <RefreshCw size={18} />
        </button>
      </div>

      {/* Points Summary */}
      <PointsSummaryBar
        teamAPoints={session.teamAPoints}
        teamBPoints={session.teamBPoints}
        teamAColor={teamAColor}
        teamBColor={teamBColor}
        teamAName={session.teamAName}
        teamBName={session.teamBName}
      />

      {/* Alerts Section */}
      {alertMatches.length > 0 && (
        <div>
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-red-500">
            <AlertTriangle size={14} />
            Needs Attention ({alertMatches.length})
          </h3>
          <div className="space-y-3">
            {alertMatches.map((match) => (
              <LiveMatchCard
                key={match.id}
                match={match}
                teamAColor={teamAColor}
                teamBColor={teamBColor}
                teamAName={session.teamAName}
                teamBName={session.teamBName}
                onClick={() => onMatchClick?.(match.id)}
                onEdit={() => onEditScore?.(match.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Active Matches */}
      {activeMatches.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-[var(--ink-secondary)]">
            In Progress ({activeMatches.length})
          </h3>
          <div className="space-y-3">
            <AnimatePresence>
              {activeMatches.map((match) => (
                <LiveMatchCard
                  key={match.id}
                  match={match}
                  teamAColor={teamAColor}
                  teamBColor={teamBColor}
                  teamAName={session.teamAName}
                  teamBName={session.teamBName}
                  onClick={() => onMatchClick?.(match.id)}
                  onEdit={() => onEditScore?.(match.id)}
                />
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Completed Matches */}
      {completedMatches.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-[var(--ink-secondary)]">
            Completed ({completedMatches.length})
          </h3>
          <div className="space-y-3">
            {completedMatches.map((match) => (
              <LiveMatchCard
                key={match.id}
                match={match}
                teamAColor={teamAColor}
                teamBColor={teamBColor}
                teamAName={session.teamAName}
                teamBName={session.teamBName}
                onClick={() => onViewDetails?.(match.id)}
                onEdit={() => onEditScore?.(match.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Pending Matches */}
      {pendingMatches.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-[var(--ink-tertiary)]">
            Not Started ({pendingMatches.length})
          </h3>
          <div className="space-y-3 opacity-60">
            {pendingMatches.map((match) => (
              <LiveMatchCard
                key={match.id}
                match={match}
                teamAColor={teamAColor}
                teamBColor={teamBColor}
                teamAName={session.teamAName}
                teamBName={session.teamBName}
                onClick={() => onMatchClick?.(match.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {session.matches.length === 0 && (
        <div className="py-12 text-center text-[var(--ink-tertiary)]">
          <Users size={48} className="mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium">No matches yet</p>
          <p className="text-sm">Create a lineup to get started</p>
        </div>
      )}
    </div>
  );
}

export default LiveMatchMonitor;
