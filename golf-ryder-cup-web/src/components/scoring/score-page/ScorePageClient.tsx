'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLiveQuery } from 'dexie-react-hooks';
import { Target } from 'lucide-react';
import { PageHeader } from '@/components/layout';
import { SyncStatusBadge } from '@/components/SyncStatusBadge';
import { db } from '@/lib/db';
import { createLogger } from '@/lib/utils/logger';
import { useAuthStore, useScoringStore, useTripStore } from '@/lib/stores';
import { useShallow } from 'zustand/shallow';
import { navigateBackOr } from '@/lib/utils/navigation';
import { assessTripPlayerLink, withTripPlayerIdentity } from '@/lib/utils/tripPlayerIdentity';
import {
    buildHoleResultsByMatchId,
    buildScoreSessionStats,
    buildScoringMatchStates,
    findCurrentUserPlayer,
    getDefaultActiveScoringSession,
    getMatchPlayers,
    getQuickContinueMatchId,
    getResolvedActiveScoringSession,
} from './scorePageData';
import { ScoreNoTripState, ScorePageSections, ScoreSignInState } from './ScorePageSections';

const logger = createLogger('score');

export default function ScorePageClient() {
    const router = useRouter();
    const { currentTrip, sessions, players } = useTripStore(useShallow(s => ({ currentTrip: s.currentTrip, sessions: s.sessions, players: s.players })));
    const { selectMatch } = useScoringStore();
    const { currentUser, isAuthenticated, authUserId } = useAuthStore();
    const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

    const currentIdentity = useMemo(
        () => withTripPlayerIdentity(currentUser, authUserId),
        [authUserId, currentUser]
    );

    const currentUserPlayer = useMemo(
        () => findCurrentUserPlayer(players, currentIdentity, isAuthenticated),
        [currentIdentity, isAuthenticated, players]
    );
    const currentUserPlayerLink = useMemo(
        () => assessTripPlayerLink(players, currentIdentity, isAuthenticated),
        [currentIdentity, isAuthenticated, players]
    );

    const defaultActiveSession = useMemo(
        () => getDefaultActiveScoringSession(sessions),
        [sessions]
    );
    const activeSession = useMemo(
        () => getResolvedActiveScoringSession(sessions, selectedSessionId),
        [selectedSessionId, sessions]
    );

    useEffect(() => {
        if (!selectedSessionId && defaultActiveSession) {
            const timeoutId = setTimeout(() => {
                setSelectedSessionId(defaultActiveSession.id);
            }, 0);
            return () => clearTimeout(timeoutId);
        }
    }, [defaultActiveSession, selectedSessionId]);

    const matches = useLiveQuery(
        async () => {
            if (!activeSession) return [];
            return db.matches.where('sessionId').equals(activeSession.id).sortBy('matchNumber');
        },
        [activeSession?.id],
        []
    );

    const holeResults = useLiveQuery(
        async () => {
            if (!matches || matches.length === 0) return [];
            const matchIds = matches.map((match) => match.id);
            return db.holeResults.where('matchId').anyOf(matchIds).toArray();
        },
        [matches],
        []
    );

    const holeResultsByMatchId = useMemo(
        () => buildHoleResultsByMatchId(holeResults),
        [holeResults]
    );
    const matchStates = useMemo(
        () => buildScoringMatchStates(matches, holeResultsByMatchId),
        [holeResultsByMatchId, matches]
    );
    const quickContinueMatchId = useMemo(
        () => getQuickContinueMatchId(matchStates),
        [matchStates]
    );
    const sessionStats = useMemo(
        () => buildScoreSessionStats(matchStates, currentUserPlayer?.id),
        [currentUserPlayer?.id, matchStates]
    );

    const handleMatchSelect = async (matchId: string) => {
        try {
            await selectMatch(matchId);
            router.push(`/score/${matchId}`);
        } catch (error) {
            logger.error('Failed to select match', { matchId, error });
        }
    };

    const isLoading = matches === undefined || holeResults === undefined;

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen page-premium-enter texture-grain bg-[var(--canvas)]">
                <PageHeader
                    title="Score"
                    subtitle="Sign in required"
                    icon={<Target size={16} className="text-[var(--masters)]" />}
                    onBack={() => navigateBackOr(router, '/')}
                />
                <ScoreSignInState onSignIn={() => router.push('/login')} />
            </div>
        );
    }

    if (!currentTrip) {
        return (
            <div className="min-h-screen page-premium-enter texture-grain bg-[var(--canvas)]">
                <PageHeader
                    title="Score"
                    subtitle="No active trip"
                    icon={<Target size={16} className="text-[var(--masters)]" />}
                    onBack={() => navigateBackOr(router, '/')}
                />
                <ScoreNoTripState onBackHome={() => router.push('/')} />
            </div>
        );
    }

    return (
        <div className="min-h-screen page-premium-enter texture-grain bg-[var(--canvas)]">
            <PageHeader
                title="Score"
                subtitle={currentTrip.name}
                icon={<Target size={16} className="text-[var(--masters)]" />}
                onBack={() => navigateBackOr(router, '/')}
                rightSlot={<SyncStatusBadge showText />}
            />

            <ScorePageSections
                activeSession={activeSession}
                currentTripName={currentTrip.name}
                matchStates={matchStates}
                sessionStats={sessionStats}
                quickContinueMatchId={quickContinueMatchId}
                sessions={sessions}
                selectedSessionId={selectedSessionId ?? activeSession?.id ?? null}
                currentUserPlayerId={currentUserPlayer?.id}
                currentUserPlayerLinkStatus={currentUserPlayerLink.status}
                isLoading={isLoading}
                getMatchPlayers={(playerIds) => getMatchPlayers(playerIds, players)}
                onSelectMatch={handleMatchSelect}
                onSelectSession={setSelectedSessionId}
                onGoToMatchups={() => router.push('/matchups')}
                onOpenProfile={() => router.push('/profile')}
            />
        </div>
    );
}
