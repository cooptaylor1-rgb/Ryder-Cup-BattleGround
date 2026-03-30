'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/layout';
import { useConfirmDialog } from '@/components/ui/ConfirmDialog';
import { calculateFairnessScore, type MatchSlot } from '@/components/captain';
import { deleteMatchCascade } from '@/lib/services/cascadeDelete';
import {
    saveLineup,
    type LineupPlayer as PersistedLineupPlayer,
    type LineupState,
} from '@/lib/services/lineupBuilderService';
import { createLogger } from '@/lib/utils/logger';
import { useTripStore, useUIStore } from '@/lib/stores';
import { useShallow } from 'zustand/shallow';
import { getTeamPlayersForLineup, toLineupPlayers } from './lineupBuilderData';
import {
    buildInitialMatchSlots,
    buildSessionConfig,
    calculateSessionFairness,
    getSessionMatchPlayerNames,
    getSessionMatchScoreDisplay,
    type SessionLineupViewMode,
} from './sessionLineupData';
import {
    SessionLineupEditorSection,
    SessionLineupHeroSection,
    SessionLineupMatchesSection,
    SessionLineupMissingState,
    SessionLineupModeToggle,
    SessionLineupNoTripState,
    SessionStartButton,
} from './SessionLineupPageSections';
import { Lock, Unlock, Users } from 'lucide-react';

const lineupLogger = createLogger('lineup');

export default function SessionLineupPageClient({ sessionId }: { sessionId: string }) {
    const router = useRouter();
    const { currentTrip, sessions, teams, players, teamMembers, getSessionMatches, updateSession } =
        useTripStore(useShallow(s => ({ currentTrip: s.currentTrip, sessions: s.sessions, teams: s.teams, players: s.players, teamMembers: s.teamMembers, getSessionMatches: s.getSessionMatches, updateSession: s.updateSession })));
    const { isCaptainMode, showToast } = useUIStore(useShallow(s => ({ isCaptainMode: s.isCaptainMode, showToast: s.showToast })));
    const { showConfirm, ConfirmDialogComponent } = useConfirmDialog();

    const [viewMode, setViewMode] = useState<SessionLineupViewMode>('matches');
    const [matches, setMatches] = useState<import('@/lib/types').Match[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const session = sessions.find((entry) => entry.id === sessionId);

    const loadMatches = useCallback(async () => {
        if (!sessionId) return;
        setIsLoading(true);
        try {
            const loadedMatches = await getSessionMatches(sessionId);
            setMatches(loadedMatches);
        } catch (error) {
            lineupLogger.error('Failed to load matches', { sessionId, error });
            showToast('error', 'Failed to load matches');
        } finally {
            setIsLoading(false);
        }
    }, [getSessionMatches, sessionId, showToast]);

    useEffect(() => {
        void loadMatches();
    }, [loadMatches]);

    const teamA = teams.find((team) => team.color === 'usa');
    const teamB = teams.find((team) => team.color === 'europe');
    const teamAName = teamA?.name || 'Team A';
    const teamBName = teamB?.name || 'Team B';

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
    const sessionConfig = useMemo(() => buildSessionConfig(session, matches), [matches, session]);
    const initialMatches = useMemo(() => buildInitialMatchSlots(matches, players), [matches, players]);
    const allLineupPlayers = useMemo(() => [...lineupTeamA, ...lineupTeamB], [lineupTeamA, lineupTeamB]);

    const isLocked = session?.isLocked ?? false;
    const canEdit = !!session && isCaptainMode && !isLocked && session.status === 'scheduled';
    const canStart = !!session && isCaptainMode && session.status === 'scheduled' && matches.length > 0;

    const handleToggleLock = async () => {
        if (!session) return;
        try {
            await updateSession(session.id, { isLocked: !session.isLocked });
            showToast('success', session.isLocked ? 'Session unlocked' : 'Session locked');
        } catch {
            showToast('error', 'Failed to update session');
        }
    };

    const handleStartSession = async () => {
        if (!session) return;
        try {
            await updateSession(session.id, { status: 'inProgress' });
            showToast('success', 'Session started! Scoring is now available.');
        } catch {
            showToast('error', 'Failed to start session');
        }
    };

    const handleDeleteMatch = useCallback(
        async (matchId: string): Promise<boolean> =>
            new Promise((resolve) => {
                showConfirm({
                    title: 'Delete Match',
                    message: 'Are you sure you want to delete this match? This action cannot be undone.',
                    confirmLabel: 'Delete Match',
                    cancelLabel: 'Cancel',
                    variant: 'danger',
                    onCancel: () => resolve(false),
                    onConfirm: async () => {
                        try {
                            await deleteMatchCascade(matchId);
                            setMatches((current) => current.filter((match) => match.id !== matchId));
                            showToast('success', 'Match deleted');
                            resolve(true);
                        } catch (error) {
                            lineupLogger.error('Failed to delete match', { matchId, error });
                            showToast('error', 'Failed to delete match');
                            resolve(false);
                        }
                    },
                });
            }),
        [showConfirm, showToast]
    );

    const calculateFairness = useCallback(
        (matchSlots: MatchSlot[]) =>
            calculateSessionFairness(matchSlots, allLineupPlayers, calculateFairnessScore),
        [allLineupPlayers]
    );

    const buildPersistedLineupPlayer = useCallback(
        (
            player: MatchSlot['teamAPlayers'][number],
            teamId: string,
            teamColor: 'usa' | 'europe'
        ): PersistedLineupPlayer => ({
            id: player.id,
            name: `${player.firstName} ${player.lastName}`.trim(),
            firstName: player.firstName,
            lastName: player.lastName,
            handicap: Number.isFinite(player.handicapIndex) ? player.handicapIndex : null,
            teamColor,
            teamId,
        }),
        []
    );

    const buildPersistedLineupState = useCallback(
        (matchSlots: MatchSlot[]): LineupState | null => {
            if (!session || !teamA?.id || !teamB?.id) return null;

            return {
                sessionId: session.id,
                sessionType: session.sessionType,
                playersPerMatch: session.sessionType === 'singles' ? 2 : 4,
                matches: matchSlots.map((match, index) => ({
                    matchNumber: index + 1,
                    teamAPlayers: match.teamAPlayers.map((player) =>
                        buildPersistedLineupPlayer(player, teamA.id, 'usa')
                    ),
                    teamBPlayers: match.teamBPlayers.map((player) =>
                        buildPersistedLineupPlayer(player, teamB.id, 'europe')
                    ),
                    locked: false,
                })),
                availableTeamA: [],
                availableTeamB: [],
            };
        },
        [buildPersistedLineupPlayer, session, teamA?.id, teamB?.id]
    );

    const persistLineup = useCallback(
        async (matchSlots: MatchSlot[]) => {
            if (!currentTrip) {
                throw new Error('No active trip');
            }

            const lineupState = buildPersistedLineupState(matchSlots);
            if (!lineupState) {
                throw new Error('Session teams are not ready for lineup persistence');
            }

            const result = await saveLineup(lineupState, currentTrip.id);
            if (!result.success) {
                throw new Error('Lineup persistence failed');
            }

            await loadMatches();
        },
        [buildPersistedLineupState, currentTrip, loadMatches]
    );

    const getMatchPlayerNames = useCallback(
        (playerIds: string[]) => getSessionMatchPlayerNames(playerIds, players),
        [players]
    );

    const getMatchScoreDisplay = useCallback(
        (match: import('@/lib/types').Match) =>
            getSessionMatchScoreDisplay(match, teamAName, teamBName),
        [teamAName, teamBName]
    );

    const openMatch = useCallback(
        (matchId: string) => {
            router.push(`/score/${matchId}`);
        },
        [router]
    );

    if (!currentTrip) {
        return <SessionLineupNoTripState onBackHome={() => router.push('/')} />;
    }

    if (!session) {
        return <SessionLineupMissingState onBackToLineups={() => router.push('/lineup')} />;
    }

    return (
        <div className="min-h-screen page-premium-enter texture-grain bg-[var(--canvas)]">
            <PageHeader
                title={session.name}
                subtitle={`${session.sessionType} • ${session.pointsPerMatch} pt${session.pointsPerMatch !== 1 ? 's' : ''} each`}
                icon={<Users size={18} color="var(--canvas)" />}
                onBack={() => router.back()}
                rightSlot={
                    <div className="flex items-center gap-2">
                        {session.status === 'inProgress' ? (
                            <span className="live-badge">
                                <span className="live-dot" />
                                Live
                            </span>
                        ) : null}
                        {session.status === 'completed' ? (
                            <span className="rounded-full bg-[color:var(--success)]/10 px-2 py-1 text-xs font-medium text-[var(--success)]">
                                Complete
                            </span>
                        ) : null}
                        {isCaptainMode && session.status === 'scheduled' ? (
                            <button
                                onClick={handleToggleLock}
                                className="press-scale p-2"
                                style={{ color: isLocked ? 'var(--masters)' : 'var(--ink-tertiary)' }}
                                aria-label={isLocked ? 'Unlock session' : 'Lock session'}
                            >
                                {isLocked ? <Lock size={18} /> : <Unlock size={18} />}
                            </button>
                        ) : null}
                    </div>
                }
            />

            <main className="container-editorial">
                <SessionLineupHeroSection session={session} matchesCount={matches.length} />

                {isCaptainMode && session.status === 'scheduled' ? (
                    <SessionLineupModeToggle
                        viewMode={viewMode}
                        canEdit={canEdit}
                        onSelectMatches={() => setViewMode('matches')}
                        onSelectEdit={() => setViewMode('edit')}
                    />
                ) : null}

                {canStart && viewMode === 'matches' ? (
                    <SessionStartButton onStart={handleStartSession} />
                ) : null}

                {viewMode === 'matches' || !canEdit ? (
                    <SessionLineupMatchesSection
                        isLoading={isLoading}
                        matches={matches}
                        canEdit={canEdit}
                        session={session}
                        teamAName={teamAName}
                        teamBName={teamBName}
                        getMatchPlayerNames={getMatchPlayerNames}
                        getMatchScoreDisplay={getMatchScoreDisplay}
                        onOpenMatch={openMatch}
                    />
                ) : (
                    <SessionLineupEditorSection
                        sessionConfig={sessionConfig}
                        lineupTeamA={lineupTeamA}
                        lineupTeamB={lineupTeamB}
                        teamALabel={teamA?.name || 'USA'}
                        teamBLabel={teamB?.name || 'Europe'}
                        initialMatches={initialMatches}
                        calculateFairness={calculateFairness}
                        onDeleteMatch={handleDeleteMatch}
                        onSaveDraft={async (matchSlots) => {
                            try {
                                await persistLineup(matchSlots);
                                showToast('info', 'Lineup saved as draft');
                            } catch (error) {
                                lineupLogger.error('Failed to save lineup draft', { sessionId, error });
                                showToast('error', 'Failed to save lineup');
                            }
                        }}
                        onPublish={async (matchSlots) => {
                            try {
                                await persistLineup(matchSlots);
                                showToast('success', 'Lineup published!');
                                setViewMode('matches');
                            } catch (error) {
                                lineupLogger.error('Failed to publish lineup', { sessionId, error });
                                showToast('error', 'Failed to publish lineup');
                            }
                        }}
                    />
                )}
            </main>

            {ConfirmDialogComponent}
        </div>
    );
}
