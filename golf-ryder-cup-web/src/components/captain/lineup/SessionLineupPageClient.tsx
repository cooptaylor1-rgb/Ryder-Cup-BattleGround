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
import {
    savePracticeLineup,
    type PracticeGroupDraft,
} from '@/lib/services/lineup-builder/practiceLineupPersistence';
import {
    PracticeGroupsEditor,
    type PracticeGroupsTemplate,
} from './PracticeGroupsEditor';
import { SessionLeaderboardCard } from '@/components/scoring/practice-scoring/SessionLeaderboardCard';
import { SessionSkinsCard } from '@/components/scoring/practice-scoring/SessionSkinsCard';
import {
    createSessionSkinsBet,
    findSessionSkinsBet,
} from '@/lib/services/sessionSkinsService';
import { db as dexieDb } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { Button } from '@/components/ui/Button';
import { Coins } from 'lucide-react';
import { createLogger } from '@/lib/utils/logger';
import { useTripStore, useAccessStore, useToastStore } from '@/lib/stores';
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
import { Lock, Settings, Unlock, Users } from 'lucide-react';

const lineupLogger = createLogger('lineup');

export default function SessionLineupPageClient({ sessionId }: { sessionId: string }) {
    const router = useRouter();
    const { currentTrip, sessions, teams, players, teamMembers, getSessionMatches, updateSession } =
        useTripStore(useShallow(s => ({ currentTrip: s.currentTrip, sessions: s.sessions, teams: s.teams, players: s.players, teamMembers: s.teamMembers, getSessionMatches: s.getSessionMatches, updateSession: s.updateSession })));
    const { isCaptainMode } = useAccessStore(useShallow(s => ({ isCaptainMode: s.isCaptainMode })));
    const { showToast } = useToastStore(useShallow(s => ({ showToast: s.showToast })));
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

    // Practice-round branch: captains build groups of 2-4 players with
    // tee times and no team split. Persists via savePracticeLineup,
    // which writes Match rows with mode='practice' so the matches
    // show on the schedule and can host side bets but stay out of cup
    // standings. Uses the full trip roster (teamMembers aren't required
    // for practice — players don't need a Ryder Cup team assignment).
    const isPracticeSession = Boolean(session?.isPracticeSession);

    const practiceInitialGroups = useMemo<PracticeGroupDraft[]>(() => {
        if (!isPracticeSession) return [];
        return matches
            .slice()
            .sort((a, b) => a.matchOrder - b.matchOrder)
            .map((match, index) => ({
                localId: match.id,
                groupNumber: match.matchOrder || index + 1,
                // Practice matches fold everyone into teamAPlayerIds, but
                // fall back to the union in case a legacy cup match got
                // flipped to practice without a re-publish.
                playerIds:
                    match.teamAPlayerIds.length > 0 || match.teamBPlayerIds.length > 0
                        ? [...match.teamAPlayerIds, ...match.teamBPlayerIds]
                        : [],
                teeTime: match.teeTime ?? '',
            }));
    }, [isPracticeSession, matches]);

    const persistPracticeLineup = useCallback(
        async (groups: PracticeGroupDraft[]) => {
            if (!session) throw new Error('Session not loaded');
            const result = await savePracticeLineup(session.id, groups);
            if (!result.success) {
                throw new Error('Practice lineup persistence failed');
            }
            await loadMatches();
        },
        [loadMatches, session]
    );

    // Prior practice sessions on this trip become "Copy pairings from…"
    // options in the editor. Sorted newest first (by scheduledDate,
    // falling back to sessionNumber) so "Copy from last practice round"
    // is the obvious default at the top.
    const practiceTemplatesBase = useLiveQuery(
        async () => {
            if (!currentTrip || !session) return [] as PracticeGroupsTemplate[];
            const candidateSessions = (
                await dexieDb.sessions.where('tripId').equals(currentTrip.id).toArray()
            )
                .filter((s) => s.isPracticeSession && s.id !== session.id)
                .sort((a, b) => {
                    const dateDiff =
                        (b.scheduledDate ?? '').localeCompare(a.scheduledDate ?? '');
                    if (dateDiff !== 0) return dateDiff;
                    return b.sessionNumber - a.sessionNumber;
                });

            const templates: PracticeGroupsTemplate[] = [];
            for (const candidate of candidateSessions) {
                const candidateMatches = await dexieDb.matches
                    .where('sessionId')
                    .equals(candidate.id)
                    .toArray();
                if (candidateMatches.length === 0) continue;
                const groups: PracticeGroupDraft[] = candidateMatches
                    .sort((a, b) => a.matchOrder - b.matchOrder)
                    .map((match, index) => ({
                        localId: `${candidate.id}-${match.id}`,
                        groupNumber: match.matchOrder || index + 1,
                        playerIds:
                            match.teamAPlayerIds.length > 0 || match.teamBPlayerIds.length > 0
                                ? [...match.teamAPlayerIds, ...match.teamBPlayerIds]
                                : [],
                        teeTime: match.teeTime ?? '',
                    }));
                templates.push({
                    sourceId: candidate.id,
                    label: `${candidate.name} — ${groups.length} group${groups.length === 1 ? '' : 's'}`,
                    groups,
                });
            }
            return templates;
        },
        [currentTrip?.id, session?.id],
        [] as PracticeGroupsTemplate[]
    );
    const practiceTemplates = practiceTemplatesBase ?? [];

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
                backFallback="/schedule"
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
                        {isCaptainMode ? (
                            <button
                                onClick={() => router.push(`/captain/manage?sessionId=${session.id}`)}
                                className="press-scale p-2 text-[var(--ink-tertiary)]"
                                aria-label="Edit session details"
                                title="Edit session details"
                            >
                                <Settings size={18} />
                            </button>
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

                {viewMode === 'matches' && session.isPracticeSession && matches.length > 0 ? (
                    <>
                        <SessionLeaderboardCard session={session} matches={matches} />
                        <SessionSkinsCard session={session} matches={matches} />
                        <SessionSkinsCtaOrNull session={session} matches={matches} />
                    </>
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
                ) : isPracticeSession ? (
                    <PracticeGroupsEditor
                        session={session}
                        roster={players}
                        initialGroups={practiceInitialGroups}
                        templates={practiceTemplates}
                        onFirstTeeTimeChange={async (value) => {
                            // Group 1's tee-time input is semantically
                            // "the session's first tee time." Persist
                            // any valid HH:MM (or blank) to the session
                            // row so /schedule and the published
                            // matches inherit the change.
                            try {
                                await updateSession(session.id, {
                                    firstTeeTime: value || undefined,
                                });
                            } catch (error) {
                                lineupLogger.error('Failed to sync firstTeeTime from Group 1', {
                                    sessionId,
                                    error,
                                });
                            }
                        }}
                        onPublish={async (groups) => {
                            try {
                                await persistPracticeLineup(groups);
                                showToast('success', 'Practice groups published');
                                setViewMode('matches');
                            } catch (error) {
                                lineupLogger.error('Failed to publish practice groups', {
                                    sessionId,
                                    error,
                                });
                                showToast('error', 'Failed to publish practice groups');
                            }
                        }}
                        onSaveDraft={async (groups) => {
                            try {
                                await persistPracticeLineup(groups);
                                showToast('info', 'Practice groups saved');
                            } catch (error) {
                                lineupLogger.error('Failed to save practice groups', {
                                    sessionId,
                                    error,
                                });
                                showToast('error', 'Failed to save practice groups');
                            }
                        }}
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

/**
 * "Start session-wide skins" affordance. Renders only when the session
 * is a practice session with published groups and NO session-scoped
 * skins bet already exists. Tucked under the leaderboard so the
 * captain's eye lands on standings first; the CTA disappears the
 * instant the bet is created (SessionSkinsCard's live query surfaces
 * it above).
 */
function SessionSkinsCtaOrNull({
    session,
    matches,
}: {
    session: import('@/lib/types').RyderCupSession;
    matches: import('@/lib/types').Match[];
}) {
    const { currentTrip } = useTripStore(useShallow((s) => ({ currentTrip: s.currentTrip })));
    const { showToast } = useToastStore(useShallow((s) => ({ showToast: s.showToast })));
    const { isCaptainMode } = useAccessStore(useShallow((s) => ({ isCaptainMode: s.isCaptainMode })));

    const existing = useLiveQuery(
        async () => {
            if (!currentTrip) return undefined;
            return findSessionSkinsBet(currentTrip.id, session.id);
        },
        [currentTrip?.id, session.id],
        undefined
    );

    if (!isCaptainMode) return null;
    if (!currentTrip) return null;
    if (existing) return null;

    return (
        <section className="rounded-[1.5rem] border border-dashed border-[color:var(--rule)]/75 bg-[color:var(--canvas)] p-[var(--space-5)]">
            <div className="flex flex-col gap-[var(--space-3)] sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <p className="type-overline tracking-[0.16em] text-[var(--ink-tertiary)]">
                        Session-wide skins
                    </p>
                    <h3 className="mt-[var(--space-1)] type-title-sm text-[var(--ink)]">
                        Pool skins across every group
                    </h3>
                    <p className="mt-[var(--space-1)] type-body-sm text-[var(--ink-secondary)]">
                        Best net per hole wins the skin; ties carry. Standings update live from the
                        strokes entered in each group.
                    </p>
                </div>
                <Button
                    variant="primary"
                    leftIcon={<Coins size={15} />}
                    onClick={async () => {
                        try {
                            await createSessionSkinsBet({
                                session,
                                matches,
                                perHole: 5,
                            });
                            showToast('success', 'Session-wide skins started');
                        } catch {
                            showToast('error', 'Failed to start session skins');
                        }
                    }}
                >
                    Start session skins
                </Button>
            </div>
        </section>
    );
}
