'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLiveQuery } from 'dexie-react-hooks';
import { Target } from 'lucide-react';
import { PageHeader } from '@/components/layout';
import { SyncStatusBadge } from '@/components/SyncStatusBadge';
import { ContinueScoringBanner } from '@/components/ui/ContinueScoringBanner';
import { db } from '@/lib/db';
import { createLogger } from '@/lib/utils/logger';
import { useAuthStore, useScoringStore, useTripStore } from '@/lib/stores';
import { useShallow } from 'zustand/shallow';
import { navigateBackOr } from '@/lib/utils/navigation';
import { assessTripPlayerLink, withTripPlayerIdentity } from '@/lib/utils/tripPlayerIdentity';
import { calculateMatchState } from '@/lib/services/scoringEngine';
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
    const searchParams = useSearchParams();
    const { currentTrip, sessions, players } = useTripStore(useShallow(s => ({ currentTrip: s.currentTrip, sessions: s.sessions, players: s.players })));
    const { selectMatch } = useScoringStore();
    const { currentUser, isAuthenticated, authUserId } = useAuthStore();
    const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

    // Phase 3 — smart routing. When the current user has exactly one
    // in-progress match for *them*, fast-forward straight into scoring.
    // Captains scoring proxy or anyone wanting the picker can append
    // `?picker=1` to defeat the redirect.
    const wantsPicker = searchParams?.get('picker') === '1';
    const autoRoutedRef = useRef(false);

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

    // Single batched query for matches + hole results (eliminates intermediate re-render)
    const matchData = useLiveQuery(
        async () => {
            if (!activeSession) return { matches: [], holeResults: [] };
            const matches = await db.matches
                .where('sessionId')
                .equals(activeSession.id)
                .sortBy('matchNumber');
            const matchIds = matches.map((m) => m.id);
            const holeResults =
                matchIds.length > 0
                    ? await db.holeResults.where('matchId').anyOf(matchIds).toArray()
                    : [];
            return { matches, holeResults };
        },
        [activeSession?.id],
        { matches: [], holeResults: [] }
    );

    const { matches, holeResults } = matchData;

    // Cross-session "your match" lookup for the resume banner. The session
    // picker only shows matches inside the selected session, so a user in
    // an in-progress match from another session would otherwise see only
    // the picker and miss the 1-tap resume path that Home already offers.
    const userMatchRecord = useLiveQuery(
        async () => {
            if (!currentTrip || !currentUserPlayer) return null;
            const allSessions = await db.sessions
                .where('tripId')
                .equals(currentTrip.id)
                .toArray();
            const sessionIds = allSessions.map((s) => s.id);
            if (sessionIds.length === 0) return null;

            const tripMatches = await db.matches
                .where('sessionId')
                .anyOf(sessionIds)
                .toArray();
            const userMatches = tripMatches.filter(
                (m) =>
                    m.teamAPlayerIds.includes(currentUserPlayer.id) ||
                    m.teamBPlayerIds.includes(currentUserPlayer.id)
            );
            const liveMatch =
                userMatches.find((m) => m.status === 'inProgress') ??
                userMatches.find((m) => m.status === 'scheduled');
            if (!liveMatch || liveMatch.status !== 'inProgress') return null;

            const results = await db.holeResults
                .where('matchId')
                .equals(liveMatch.id)
                .toArray();
            return {
                match: liveMatch,
                matchState: calculateMatchState(liveMatch, results),
            };
        },
        [currentTrip?.id, currentUserPlayer?.id],
        null
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

    // Smart auto-route: only fires once, only when there's an in-progress
    // match the *current user is playing in*. Captains proxy-scoring see
    // the picker (their match list typically has multiple in-progress).
    useEffect(() => {
        if (autoRoutedRef.current) return;
        if (wantsPicker) return;
        if (!isAuthenticated) return;
        if (!userMatchRecord) return;

        autoRoutedRef.current = true;
        router.replace(`/score/${userMatchRecord.match.id}`);
    }, [wantsPicker, isAuthenticated, userMatchRecord, router]);

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

            {/* Resume-scoring banner for a user whose in-progress match
                may live in a different session than the one currently
                selected in the picker below. Mirrors Home's behaviour so
                the live path is always one tap from the bottom nav. */}
            {userMatchRecord && (
                <div className="px-[var(--space-4)] pt-[var(--space-4)]">
                    <ContinueScoringBanner
                        match={userMatchRecord.match}
                        matchState={userMatchRecord.matchState ?? undefined}
                    />
                </div>
            )}

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
