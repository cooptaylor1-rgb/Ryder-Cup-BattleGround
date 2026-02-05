'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useTripStore, useUIStore } from '@/lib/stores';
import { formatPlayerName } from '@/lib/utils';
import { createLogger } from '@/lib/utils/logger';
import { deleteMatchCascade } from '@/lib/services/cascadeDelete';
import {
  LineupBuilder,
  calculateFairnessScore,
  type MatchSlot,
  type SessionConfig,
  type Player as LineupPlayer,
  type FairnessScore,
} from '@/components/captain';
import { useConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyStatePremium } from '@/components/ui';
import { BottomNav } from '@/components/layout';
import {
  ChevronLeft,
  Users,
  Calendar,
  Clock,
  Play,
  Lock,
  Unlock,
  Trophy,
  Home,
  Target,
  MoreHorizontal,
  CalendarDays,
  ChevronRight,
  Edit3,
  Eye,
} from 'lucide-react';
import type { Match } from '@/lib/types';

/**
 * SESSION / LINEUP VIEW & EDIT PAGE
 *
 * Displays a session with its matches and allows editing if not locked.
 * Shows match progress for in-progress sessions.
 */

type ViewMode = 'matches' | 'edit';

export default function SessionPage() {
  const router = useRouter();
  const params = useParams();
  const sessionId = params.sessionId as string;

  const { currentTrip, sessions, teams, players, teamMembers, getSessionMatches, updateSession } =
    useTripStore();
  const { isCaptainMode, showToast } = useUIStore();
  const { showConfirm, ConfirmDialogComponent } = useConfirmDialog();

  const [viewMode, setViewMode] = useState<ViewMode>('matches');
  const [matches, setMatches] = useState<Match[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const session = sessions.find((s) => s.id === sessionId);

  // Load matches
  useEffect(() => {
    async function loadMatches() {
      if (!sessionId) return;
      setIsLoading(true);
      try {
        const loadedMatches = await getSessionMatches(sessionId);
        setMatches(loadedMatches);
      } catch (error) {
        createLogger('lineup').error('Failed to load matches', { sessionId, error });
        showToast('error', 'Failed to load matches');
      } finally {
        setIsLoading(false);
      }
    }
    loadMatches();
  }, [sessionId, getSessionMatches, showToast]);

  // Get team players
  const getTeamPlayers = useCallback(
    (teamId: string) => {
      const memberIds = teamMembers.filter((tm) => tm.teamId === teamId).map((tm) => tm.playerId);
      return players.filter((p) => memberIds.includes(p.id));
    },
    [teamMembers, players]
  );

  const teamA = teams.find((t) => t.color === 'usa');
  const teamB = teams.find((t) => t.color === 'europe');
  const teamAPlayers = teamA ? getTeamPlayers(teamA.id) : [];
  const teamBPlayers = teamB ? getTeamPlayers(teamB.id) : [];

  // Convert to LineupBuilder format
  const lineupTeamA: LineupPlayer[] = teamAPlayers.map((p) => ({
    id: p.id,
    firstName: p.firstName,
    lastName: p.lastName,
    handicapIndex: p.handicapIndex ?? 0,
    team: 'A' as const,
    avatarUrl: p.avatarUrl,
  }));

  const lineupTeamB: LineupPlayer[] = teamBPlayers.map((p) => ({
    id: p.id,
    firstName: p.firstName,
    lastName: p.lastName,
    handicapIndex: p.handicapIndex ?? 0,
    team: 'B' as const,
    avatarUrl: p.avatarUrl,
  }));

  // Session config
  const sessionConfig: SessionConfig | null = session
    ? {
        id: session.id,
        name: session.name,
        type: session.sessionType,
        playersPerTeam: session.sessionType === 'singles' ? 1 : 2,
        matchCount: matches.length || 4,
        pointsPerMatch: session.pointsPerMatch ?? 1,
      }
    : null;

  // Convert existing matches to lineup format
  const initialMatches: MatchSlot[] = useMemo(() => {
    return matches.map((match) => ({
      id: match.id,
      teamAPlayers: match.teamAPlayerIds
        .map((id) => {
          const player = players.find((p) => p.id === id);
          return player
            ? {
                id: player.id,
                firstName: player.firstName,
                lastName: player.lastName,
                handicapIndex: player.handicapIndex ?? 0,
                team: 'A' as const,
                avatarUrl: player.avatarUrl,
              }
            : null;
        })
        .filter(Boolean) as LineupPlayer[],
      teamBPlayers: match.teamBPlayerIds
        .map((id) => {
          const player = players.find((p) => p.id === id);
          return player
            ? {
                id: player.id,
                firstName: player.firstName,
                lastName: player.lastName,
                handicapIndex: player.handicapIndex ?? 0,
                team: 'B' as const,
                avatarUrl: player.avatarUrl,
              }
            : null;
        })
        .filter(Boolean) as LineupPlayer[],
    }));
  }, [matches, players]);

  // Handle lock/unlock
  const handleToggleLock = async () => {
    if (!session) return;
    try {
      await updateSession(session.id, { isLocked: !session.isLocked });
      showToast('success', session.isLocked ? 'Session unlocked' : 'Session locked');
    } catch {
      showToast('error', 'Failed to update session');
    }
  };

  // Handle start session
  const handleStartSession = async () => {
    if (!session) return;
    try {
      await updateSession(session.id, { status: 'inProgress' });
      showToast('success', 'Session started! Scoring is now available.');
    } catch {
      showToast('error', 'Failed to start session');
    }
  };

  // Handle delete match
  const handleDeleteMatch = useCallback(
    async (matchId: string): Promise<void> => {
      return new Promise((resolve) => {
        showConfirm({
          title: 'Delete Match',
          message: 'Are you sure you want to delete this match? This action cannot be undone.',
          confirmLabel: 'Delete Match',
          cancelLabel: 'Cancel',
          variant: 'danger',
          onConfirm: async () => {
            try {
              await deleteMatchCascade(matchId);

              // Update local state
              setMatches((prev) => prev.filter((m) => m.id !== matchId));
              showToast('success', 'Match deleted');
              resolve();
            } catch (error) {
              createLogger('lineup').error('Failed to delete match', { matchId, error });
              showToast('error', 'Failed to delete match');
              resolve();
            }
          },
        });
      });
    },
    [showConfirm, showToast]
  );

  // All lineup players for fairness calculation
  const allLineupPlayers = useMemo(
    () => [...lineupTeamA, ...lineupTeamB],
    [lineupTeamA, lineupTeamB]
  );

  // Calculate fairness
  const calculateFairness = useCallback(
    (matchSlots: MatchSlot[]): FairnessScore => {
      const pairings = matchSlots.map((match) => ({
        id: match.id,
        teamAPlayers: match.teamAPlayers,
        teamBPlayers: match.teamBPlayers,
      }));
      return calculateFairnessScore(pairings, allLineupPlayers);
    },
    [allLineupPlayers]
  );

  // Get player names for match display
  const getMatchPlayerNames = (playerIds: string[]) => {
    return playerIds
      .map((id) => {
        const player = players.find((p) => p.id === id);
        return player ? formatPlayerName(player.firstName, player.lastName, 'short') : 'Unknown';
      })
      .join(' & ');
  };

  // Get match score display
  const getMatchScoreDisplay = (match: Match) => {
    if (match.status === 'completed') {
      if (match.result === 'halved') return 'Halved';
      const winner =
        match.result === 'teamAWin' ? teamA?.name || 'Team A' : teamB?.name || 'Team B';
      return `${winner} ${match.margin}&${match.holesRemaining}`;
    }
    if (match.status === 'inProgress') {
      return `Thru ${match.currentHole}`;
    }
    return 'Not Started';
  };

  if (!currentTrip) {
    return (
      <div
        className="min-h-screen pb-nav page-premium-enter texture-grain"
        style={{ background: 'var(--canvas)' }}
      >
        <main className="container-editorial py-12">
          <EmptyStatePremium
            illustration="trophy"
            title="No active trip"
            description="Start or select a trip to view this session."
            action={{ label: 'Back to Home', onClick: () => router.push('/') }}
            variant="large"
          />
        </main>
        <BottomNav />
      </div>
    );
  }

  if (!session) {
    return (
      <div
        className="min-h-screen pb-nav page-premium-enter texture-grain"
        style={{ background: 'var(--canvas)' }}
        role="alert"
      >
        <main className="container-editorial py-12">
          <EmptyStatePremium
            illustration="calendar"
            title="Session not found"
            description="This session may have been deleted or hasn’t synced yet."
            action={{ label: 'Back to Lineups', onClick: () => router.push('/lineup') }}
            variant="large"
          />
        </main>
        <BottomNav />
      </div>
    );
  }

  const isLocked = session.isLocked;
  const canEdit = isCaptainMode && !isLocked && session.status === 'scheduled';
  const canStart = isCaptainMode && session.status === 'scheduled' && matches.length > 0;

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
              <span className="type-overline">{session.name}</span>
              <p className="type-caption truncate capitalize" style={{ marginTop: '2px' }}>
                {session.sessionType} • {session.pointsPerMatch} pt
                {session.pointsPerMatch !== 1 ? 's' : ''} each
              </p>
            </div>
          </div>

          {/* Status badge */}
          <div className="flex items-center gap-2">
            {session.status === 'inProgress' && (
              <span className="live-badge">
                <span className="live-dot" />
                Live
              </span>
            )}
            {session.status === 'completed' && (
              <span
                className="px-2 py-1 rounded-full text-xs font-medium"
                style={{ background: 'rgba(34, 197, 94, 0.1)', color: 'var(--success)' }}
              >
                Complete
              </span>
            )}
            {isCaptainMode && session.status === 'scheduled' && (
              <button
                onClick={handleToggleLock}
                className="p-2 press-scale"
                style={{ color: isLocked ? 'var(--masters)' : 'var(--ink-tertiary)' }}
              >
                {isLocked ? <Lock size={18} /> : <Unlock size={18} />}
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="container-editorial">
        {/* Session Info */}
        <section className="section">
          <div className="card" style={{ padding: 'var(--space-4)' }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {session.scheduledDate && (
                  <div className="flex items-center gap-2">
                    <Calendar size={16} style={{ color: 'var(--ink-tertiary)' }} />
                    <span className="type-meta">
                      {new Date(session.scheduledDate).toLocaleDateString()}
                    </span>
                  </div>
                )}
                {session.timeSlot && (
                  <div className="flex items-center gap-2">
                    <Clock size={16} style={{ color: 'var(--ink-tertiary)' }} />
                    <span className="type-meta">{session.timeSlot}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <span className="type-meta">{matches.length} matches</span>
              </div>
            </div>
          </div>
        </section>

        {/* View Mode Toggle (Captain only) */}
        {isCaptainMode && session.status === 'scheduled' && (
          <section className="section-sm">
            <div className="flex gap-2">
              <button
                onClick={() => setViewMode('matches')}
                className={`flex-1 py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-all ${viewMode === 'matches' ? 'bg-masters text-white' : 'bg-surface border border-rule'}`}
              >
                <Eye size={16} />
                View Matches
              </button>
              <button
                onClick={() => setViewMode('edit')}
                disabled={!canEdit}
                className={`flex-1 py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-all ${viewMode === 'edit' ? 'bg-masters text-white' : 'bg-surface border border-rule'}`}
                style={{ opacity: canEdit ? 1 : 0.5 }}
              >
                <Edit3 size={16} />
                Edit Lineup
              </button>
            </div>
          </section>
        )}

        {/* Start Session Button */}
        {canStart && viewMode === 'matches' && (
          <section className="section-sm">
            <button
              onClick={handleStartSession}
              className="btn btn-primary w-full flex items-center justify-center gap-2"
              style={{ padding: 'var(--space-4)' }}
            >
              <Play size={18} />
              Start Session
            </button>
          </section>
        )}

        {viewMode === 'matches' || !canEdit ? (
          /* MATCHES VIEW */
          <section className="section">
            <h2 className="type-overline" style={{ marginBottom: 'var(--space-4)' }}>
              Matches
            </h2>

            {isLoading ? (
              <div className="text-center py-8">
                <p className="type-meta">Loading matches...</p>
              </div>
            ) : matches.length === 0 ? (
              <div className="card text-center" style={{ padding: 'var(--space-8)' }}>
                <Users
                  size={32}
                  style={{ color: 'var(--ink-tertiary)', margin: '0 auto var(--space-3)' }}
                />
                <p className="type-title-sm" style={{ marginBottom: 'var(--space-2)' }}>
                  No Matches Yet
                </p>
                <p className="type-caption">
                  {canEdit ? 'Switch to Edit mode to build the lineup' : 'Lineup not yet created'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {matches.map((match, idx) => {
                  const teamANames = getMatchPlayerNames(match.teamAPlayerIds);
                  const teamBNames = getMatchPlayerNames(match.teamBPlayerIds);
                  const canScore = match.status === 'inProgress' || session.status === 'inProgress';

                  return (
                    <Link
                      key={match.id}
                      href={canScore ? `/score/${match.id}` : '#'}
                      className={`card block ${canScore ? 'press-scale' : ''}`}
                      style={{ padding: 'var(--space-4)' }}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span
                          className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm"
                          style={{
                            background:
                              match.status === 'completed'
                                ? 'var(--success)'
                                : match.status === 'inProgress'
                                  ? 'var(--masters)'
                                  : 'var(--canvas-sunken)',
                            color: match.status !== 'scheduled' ? 'white' : 'var(--ink-secondary)',
                          }}
                        >
                          {idx + 1}
                        </span>
                        <span
                          className="type-caption font-medium"
                          style={{
                            color:
                              match.status === 'completed'
                                ? 'var(--success)'
                                : match.status === 'inProgress'
                                  ? 'var(--masters)'
                                  : 'var(--ink-tertiary)',
                          }}
                        >
                          {getMatchScoreDisplay(match)}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        {/* Team A */}
                        <div className="team-bg-usa rounded-lg p-3">
                          <p className="type-micro mb-1" style={{ color: 'var(--team-usa)' }}>
                            {teamA?.name || 'Team A'}
                          </p>
                          <p className="type-title-sm">{teamANames || 'TBD'}</p>
                        </div>

                        {/* Team B */}
                        <div className="team-bg-europe rounded-lg p-3">
                          <p className="type-micro mb-1" style={{ color: 'var(--team-europe)' }}>
                            {teamB?.name || 'Team B'}
                          </p>
                          <p className="type-title-sm">{teamBNames || 'TBD'}</p>
                        </div>
                      </div>

                      {canScore && (
                        <div
                          className="flex items-center justify-center gap-2 mt-3 pt-3 border-t"
                          style={{ borderColor: 'var(--rule)' }}
                        >
                          <span className="type-meta" style={{ color: 'var(--masters)' }}>
                            {match.status === 'inProgress' ? 'Continue Scoring' : 'Start Scoring'}
                          </span>
                          <ChevronRight size={16} style={{ color: 'var(--masters)' }} />
                        </div>
                      )}
                    </Link>
                  );
                })}
              </div>
            )}
          </section>
        ) : (
          /* EDIT VIEW - LineupBuilder */
          <section className="section">
            {sessionConfig && (
              <LineupBuilder
                session={sessionConfig}
                teamAPlayers={lineupTeamA}
                teamBPlayers={lineupTeamB}
                initialMatches={initialMatches}
                onSave={() => {
                  showToast('info', 'Lineup saved as draft');
                }}
                onPublish={() => {
                  showToast('success', 'Lineup published!');
                  setViewMode('matches');
                }}
                onDeleteMatch={handleDeleteMatch}
                calculateFairness={calculateFairness}
                isLocked={false}
              />
            )}
          </section>
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

      {/* Confirm Dialog */}
      {ConfirmDialogComponent}
    </div>
  );
}
