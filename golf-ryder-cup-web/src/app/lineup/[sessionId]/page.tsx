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
import { EmptyStatePremium, InlineLoadingSkeleton } from '@/components/ui';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/layout';
import {
  getTeamPlayersForLineup,
  toLineupPlayers,
} from '@/components/captain/lineup/lineupBuilderData';
import {
  Users,
  Play,
  Lock,
  Unlock,
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

  const teamA = teams.find((t) => t.color === 'usa');
  const teamB = teams.find((t) => t.color === 'europe');
  const teamAPlayers = useMemo(
    () => getTeamPlayersForLineup(teamA?.id, teamMembers, players),
    [teamA?.id, teamMembers, players]
  );
  const teamBPlayers = useMemo(
    () => getTeamPlayersForLineup(teamB?.id, teamMembers, players),
    [teamB?.id, teamMembers, players]
  );
  const lineupTeamA = useMemo(() => toLineupPlayers(teamAPlayers, 'A'), [teamAPlayers]);
  const lineupTeamB = useMemo(() => toLineupPlayers(teamBPlayers, 'B'), [teamBPlayers]);

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
      <div className="min-h-screen page-premium-enter texture-grain bg-[var(--canvas)]">
        <main className="container-editorial py-12">
          <EmptyStatePremium
            illustration="trophy"
            title="No active trip"
            description="Start or select a trip to view this session."
            action={{ label: 'Back to Home', onClick: () => router.push('/') }}
            variant="large"
          />
        </main>
      </div>
    );
  }

  if (!session) {
    return (
      <div
        className="min-h-screen page-premium-enter texture-grain bg-[var(--canvas)]"
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
      </div>
    );
  }

  const isLocked = session.isLocked;
  const canEdit = isCaptainMode && !isLocked && session.status === 'scheduled';
  const canStart = isCaptainMode && session.status === 'scheduled' && matches.length > 0;

  return (
    <div className="min-h-screen page-premium-enter texture-grain bg-[var(--canvas)]">
      <PageHeader
        title={session.name}
        subtitle={`${session.sessionType} • ${session.pointsPerMatch} pt${session.pointsPerMatch !== 1 ? 's' : ''} each`}
        icon={<Users size={18} color="var(--canvas)" />}
        onBack={() => router.back()}
        rightSlot={
          <div className="flex items-center gap-2">
            {session.status === 'inProgress' && (
              <span className="live-badge">
                <span className="live-dot" />
                Live
              </span>
            )}
            {session.status === 'completed' && (
              <span className="px-2 py-1 rounded-full text-xs font-medium bg-[color:var(--success)]/10 text-[var(--success)]">
                Complete
              </span>
            )}
            {isCaptainMode && session.status === 'scheduled' && (
              <button
                onClick={handleToggleLock}
                className="p-2 press-scale"
                style={{ color: isLocked ? 'var(--masters)' : 'var(--ink-tertiary)' }}
                aria-label={isLocked ? 'Unlock session' : 'Lock session'}
              >
                {isLocked ? <Lock size={18} /> : <Unlock size={18} />}
              </button>
            )}
          </div>
        }
      />

      <main className="container-editorial">
        <section className="pt-[var(--space-8)]">
          <div className="card-editorial overflow-hidden p-[var(--space-5)] sm:p-[var(--space-6)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="type-overline text-[var(--masters)]">Session room</p>
                <h1 className="mt-[var(--space-2)] font-serif text-[length:var(--text-3xl)] font-normal tracking-[-0.03em] text-[var(--ink)]">
                  {session.name}
                </h1>
                <p className="mt-[var(--space-2)] text-sm text-[var(--ink-secondary)]">
                  {session.sessionType} • {session.pointsPerMatch} point
                  {session.pointsPerMatch === 1 ? '' : 's'} per match
                </p>
              </div>
              <SessionPageStatus status={session.status} />
            </div>

            <div className="mt-[var(--space-6)] grid grid-cols-3 gap-3">
              <SessionInfoFact
                label="Date"
                value={
                  session.scheduledDate
                    ? new Date(session.scheduledDate).toLocaleDateString()
                    : 'Unscheduled'
                }
              />
              <SessionInfoFact label="Time" value={session.timeSlot || 'TBD'} />
              <SessionInfoFact label="Matches" value={matches.length} />
            </div>
          </div>
        </section>

        {/* View Mode Toggle (Captain only) */}
        {isCaptainMode && session.status === 'scheduled' && (
          <section className="section-sm">
            <div className="flex gap-2">
              <button
                onClick={() => setViewMode('matches')}
                className={`flex-1 py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-all ${viewMode === 'matches'
                  ? 'bg-masters text-[var(--canvas)]'
                  : 'bg-[color:var(--surface)]/60 hover:bg-[var(--surface)] border border-[color:var(--rule)]/30 text-[var(--ink-primary)] hover:border-[color:var(--rule)]/60'
                  }`}
              >
                <Eye size={16} />
                View Matches
              </button>
              <button
                onClick={() => setViewMode('edit')}
                disabled={!canEdit}
                className={`flex-1 py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${viewMode === 'edit'
                  ? 'bg-masters text-[var(--canvas)]'
                  : 'bg-[color:var(--surface)]/60 hover:bg-[var(--surface)] border border-[color:var(--rule)]/30 text-[var(--ink-primary)] hover:border-[color:var(--rule)]/60'
                  }`}
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
            <Button
              variant="primary"
              fullWidth
              onClick={handleStartSession}
              leftIcon={<Play size={18} />}
            >
              Start Session
            </Button>
          </section>
        )}

        {viewMode === 'matches' || !canEdit ? (
          /* MATCHES VIEW */
          <section className="section">
            <h2 className="type-overline" style={{ marginBottom: 'var(--space-4)' }}>
              Matches
            </h2>

            {isLoading ? (
              <div className="card" style={{ padding: 'var(--space-6)' }}>
                <p className="type-meta" style={{ marginBottom: 'var(--space-4)' }}>
                  Loading matches…
                </p>
                <InlineLoadingSkeleton lines={4} />
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
                      className={`card-editorial block overflow-hidden p-[var(--space-4)] ${canScore ? 'press-scale' : ''}`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span
                          className="w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-sm"
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
                          className="rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]"
                          style={{
                            background:
                              match.status === 'completed'
                                ? 'rgba(76, 175, 80, 0.12)'
                                : match.status === 'inProgress'
                                  ? 'rgba(0, 102, 68, 0.12)'
                                  : 'rgba(26, 24, 21, 0.08)',
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
                        <div className="rounded-[20px] border border-[color:rgba(20,92,163,0.16)] bg-[linear-gradient(180deg,rgba(20,92,163,0.10)_0%,rgba(255,255,255,0.72)_100%)] p-3">
                          <p className="type-micro mb-1" style={{ color: 'var(--team-usa)' }}>
                            {teamA?.name || 'Team A'}
                          </p>
                          <p className="type-title-sm">{teamANames || 'TBD'}</p>
                        </div>

                        {/* Team B */}
                        <div className="rounded-[20px] border border-[color:rgba(114,47,55,0.16)] bg-[linear-gradient(180deg,rgba(114,47,55,0.10)_0%,rgba(255,255,255,0.72)_100%)] p-3">
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
                teamALabel={teamA?.name || 'USA'}
                teamBLabel={teamB?.name || 'Europe'}
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


      {/* Confirm Dialog */}
      {ConfirmDialogComponent}
    </div>
  );
}

function SessionInfoFact({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-[20px] border border-[color:var(--rule)]/75 bg-[color:var(--canvas)]/72 px-3 py-3 text-center">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-tertiary)]">
        {label}
      </p>
      <p className="mt-1 font-serif text-[length:var(--text-xl)] text-[var(--ink)]">{value}</p>
    </div>
  );
}

function SessionPageStatus({ status }: { status: Match['status'] | 'scheduled' }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] ${
        status === 'inProgress'
          ? 'bg-[color:rgba(0,102,68,0.12)] text-[var(--masters)]'
          : status === 'completed'
            ? 'bg-[color:rgba(76,175,80,0.12)] text-[var(--success)]'
            : 'bg-[color:rgba(26,24,21,0.08)] text-[var(--ink-secondary)]'
      }`}
    >
      {status === 'inProgress' ? 'Live' : status === 'completed' ? 'Complete' : 'Scheduled'}
    </span>
  );
}
