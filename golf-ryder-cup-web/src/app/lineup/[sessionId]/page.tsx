'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout';
import { LineupBuilder, type MatchSlot, type Player as LineupPlayer, type SessionConfig as LineupSessionConfig } from '@/components/captain/LineupBuilder';
import { useTripStore, useUIStore } from '@/lib/stores';
import { db } from '@/lib/db';
import type { Match } from '@/lib/types/models';

export default function LineupSessionPage() {
    const params = useParams();
    const router = useRouter();
    const sessionId = params.sessionId as string;

    const { showToast } = useUIStore();
    const {
        currentTrip,
        sessions,
        getTeamByColor,
        getTeamPlayers,
        updateSession,
    } = useTripStore();

    const [matches, setMatches] = useState<Match[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (!currentTrip) {
            router.push('/');
            return;
        }

        const loadMatches = async () => {
            try {
                const data = await db.matches.where('sessionId').equals(sessionId).toArray();
                setMatches(data);
            } catch (error) {
                console.error('Failed to load matches:', error);
                showToast('error', 'Could not load matches');
            } finally {
                setIsLoading(false);
            }
        };

        loadMatches();
    }, [currentTrip, router, sessionId, showToast]);

    const session = useMemo(() => sessions.find((s) => s.id === sessionId) || null, [sessions, sessionId]);

    const teamAPlayers = useMemo(() => {
        const teamA = getTeamByColor('usa');
        const players = teamA ? getTeamPlayers(teamA.id) : [];
        return players.map<LineupPlayer>((player) => ({
            id: player.id,
            firstName: player.firstName,
            lastName: player.lastName,
            handicapIndex: player.handicapIndex ?? 0,
            team: 'A',
            avatarUrl: player.avatarUrl,
        }));
    }, [getTeamByColor, getTeamPlayers]);

    const teamBPlayers = useMemo(() => {
        const teamB = getTeamByColor('europe');
        const players = teamB ? getTeamPlayers(teamB.id) : [];
        return players.map<LineupPlayer>((player) => ({
            id: player.id,
            firstName: player.firstName,
            lastName: player.lastName,
            handicapIndex: player.handicapIndex ?? 0,
            team: 'B',
            avatarUrl: player.avatarUrl,
        }));
    }, [getTeamByColor, getTeamPlayers]);

    const playerMap = useMemo(() => {
        const map = new Map<string, LineupPlayer>();
        [...teamAPlayers, ...teamBPlayers].forEach((player) => map.set(player.id, player));
        return map;
    }, [teamAPlayers, teamBPlayers]);

    const lineupSession: LineupSessionConfig | null = useMemo(() => {
        if (!session) return null;
        const playersPerTeam = session.sessionType === 'singles' ? 1 : 2;
        return {
            id: session.id,
            name: session.name,
            type: session.sessionType,
            playersPerTeam,
            matchCount: matches.length || 1,
            pointsPerMatch: session.pointsPerMatch ?? 1,
        };
    }, [session, matches.length]);

    const initialMatches = useMemo<MatchSlot[]>(() => {
        return matches.map((match) => ({
            id: match.id,
            teamAPlayers: match.teamAPlayerIds.map((id) => playerMap.get(id)).filter(Boolean) as LineupPlayer[],
            teamBPlayers: match.teamBPlayerIds.map((id) => playerMap.get(id)).filter(Boolean) as LineupPlayer[],
            teeTime: undefined,
            courseHoles: undefined,
        }));
    }, [matches, playerMap]);

    const persistMatches = async (updatedMatches: MatchSlot[]) => {
        if (!session) return;

        setIsSaving(true);

        try {
            const now = new Date().toISOString();
            await Promise.all(
                updatedMatches.map((match, index) =>
                    db.matches.update(match.id, {
                        teamAPlayerIds: match.teamAPlayers.map((p) => p.id),
                        teamBPlayerIds: match.teamBPlayers.map((p) => p.id),
                        matchOrder: index + 1,
                        updatedAt: now,
                    })
                )
            );

            showToast('success', 'Lineup saved');
        } catch (error) {
            console.error('Failed to save lineup:', error);
            showToast('error', 'Could not save lineup');
        } finally {
            setIsSaving(false);
        }
    };

    const handlePublish = async (updatedMatches: MatchSlot[]) => {
        await persistMatches(updatedMatches);
        if (session) {
            await updateSession(session.id, { isLocked: true });
            showToast('success', 'Lineup published');
        }
    };

    if (!currentTrip) return null;

    if (!session && !isLoading) {
        return (
            <AppShell headerTitle="Lineup" headerSubtitle="Session not found" showBack>
                <div className="p-4">
                    <p className="text-sm" style={{ color: 'var(--ink-secondary)' }}>
                        This session could not be found. Return to matchups and try again.
                    </p>
                    <button
                        onClick={() => router.push('/matchups')}
                        className="mt-4 px-4 py-2 rounded-lg text-sm font-medium"
                        style={{ background: 'var(--masters)', color: 'white' }}
                    >
                        Back to Matchups
                    </button>
                </div>
            </AppShell>
        );
    }

    return (
        <AppShell
            headerTitle={session?.name || 'Lineup'}
            headerSubtitle={currentTrip.name}
            showBack
            headerRight={
                <span className="text-xs" style={{ color: 'var(--ink-tertiary)' }}>
                    {isSaving ? 'Saving...' : session?.isLocked ? 'Locked' : 'Draft'}
                </span>
            }
        >
            <div className="p-4">
                {lineupSession && (
                    <LineupBuilder
                        session={lineupSession}
                        teamAPlayers={teamAPlayers}
                        teamBPlayers={teamBPlayers}
                        initialMatches={initialMatches}
                        onSave={persistMatches}
                        onPublish={handlePublish}
                        isLocked={session?.isLocked}
                    />
                )}
            </div>
        </AppShell>
    );
}
