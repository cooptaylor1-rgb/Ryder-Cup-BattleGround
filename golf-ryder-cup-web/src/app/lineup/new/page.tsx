'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout';
import { SessionBuilder, type SessionConfig } from '@/components/trip-setup';
import { useTripStore, useUIStore } from '@/lib/stores';
import { db } from '@/lib/db';
import type { Match, RyderCupSession } from '@/lib/types/models';

const DEFAULT_SESSIONS: SessionConfig[] = [];

function normalizeSessionType(type: SessionConfig['sessionType']): RyderCupSession['sessionType'] {
    if (type === 'mixed') return 'fourball';
    return type;
}

function normalizeTimeSlot(slot: SessionConfig['timeSlot']): RyderCupSession['timeSlot'] {
    if (slot === 'twilight') return 'PM';
    return slot;
}

export default function NewLineupPage() {
    const router = useRouter();
    const { showToast } = useUIStore();
    const {
        currentTrip,
        sessions: existingSessions,
        getTeamByColor,
        getTeamPlayers,
        addSession,
    } = useTripStore();

    const [sessions, setSessions] = useState<SessionConfig[]>(DEFAULT_SESSIONS);
    const [totalDays, setTotalDays] = useState(1);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (!currentTrip) {
            router.push('/');
            return;
        }

        const start = new Date(currentTrip.startDate);
        const end = new Date(currentTrip.endDate);
        const diff = Math.max(0, Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
        setTotalDays(diff + 1);
    }, [currentTrip, router]);

    const playersPerTeam = useMemo(() => {
        const teamA = getTeamByColor('usa');
        const teamB = getTeamByColor('europe');
        const teamAPlayers = teamA ? getTeamPlayers(teamA.id) : [];
        const teamBPlayers = teamB ? getTeamPlayers(teamB.id) : [];
        const minPlayers = Math.min(teamAPlayers.length || 0, teamBPlayers.length || 0);
        return Math.max(minPlayers || 0, 2);
    }, [getTeamByColor, getTeamPlayers]);

    const handleCreateSessions = async () => {
        if (!currentTrip) return;
        if (sessions.length === 0) {
            showToast('error', 'Add at least one session');
            return;
        }

        setIsSaving(true);

        try {
            const baseSessionNumber = existingSessions.length + 1;
            const now = new Date().toISOString();

            for (let i = 0; i < sessions.length; i += 1) {
                const config = sessions[i];
                const scheduledDate = new Date(currentTrip.startDate);
                scheduledDate.setDate(scheduledDate.getDate() + config.dayOffset);

                const sessionData: Omit<RyderCupSession, 'id' | 'createdAt' | 'updatedAt'> = {
                    tripId: currentTrip.id,
                    name: config.name || `Session ${baseSessionNumber + i}`,
                    sessionNumber: baseSessionNumber + i,
                    sessionType: normalizeSessionType(config.sessionType),
                    scheduledDate: scheduledDate.toISOString(),
                    timeSlot: normalizeTimeSlot(config.timeSlot),
                    pointsPerMatch: config.pointsPerMatch,
                    status: 'scheduled',
                    isLocked: false,
                };

                const createdSession = await addSession(sessionData);

                const matches: Match[] = Array.from({ length: config.matchCount }, (_, index) => ({
                    id: crypto.randomUUID(),
                    sessionId: createdSession.id,
                    matchOrder: index + 1,
                    status: 'scheduled',
                    currentHole: 0,
                    teamAPlayerIds: [],
                    teamBPlayerIds: [],
                    teamAHandicapAllowance: 0,
                    teamBHandicapAllowance: 0,
                    result: 'notFinished',
                    margin: 0,
                    holesRemaining: 18,
                    createdAt: now,
                    updatedAt: now,
                }));

                if (matches.length > 0) {
                    await db.matches.bulkAdd(matches);
                }
            }

            showToast('success', 'Sessions created');
            router.push('/matchups');
        } catch (error) {
            console.error('Failed to create sessions:', error);
            showToast('error', 'Could not create sessions');
        } finally {
            setIsSaving(false);
        }
    };

    if (!currentTrip) return null;

    return (
        <AppShell
            headerTitle="Create Sessions"
            headerSubtitle={currentTrip.name}
            showBack
            headerRight={
                <button
                    onClick={handleCreateSessions}
                    disabled={isSaving}
                    className="px-3 py-1 rounded-lg text-sm font-medium"
                    style={{
                        background: 'var(--masters)',
                        color: 'white',
                        opacity: isSaving ? 0.6 : 1,
                    }}
                >
                    {isSaving ? 'Saving...' : 'Save'}
                </button>
            }
        >
            <div className="p-4 space-y-4">
                <p className="text-sm" style={{ color: 'var(--ink-secondary)' }}>
                    Add sessions and match counts for this trip. You can edit lineups after saving.
                </p>
                <SessionBuilder
                    sessions={sessions}
                    onSessionsChange={setSessions}
                    totalDays={totalDays}
                    onTotalDaysChange={setTotalDays}
                    playersPerTeam={playersPerTeam}
                />
            </div>
        </AppShell>
    );
}
