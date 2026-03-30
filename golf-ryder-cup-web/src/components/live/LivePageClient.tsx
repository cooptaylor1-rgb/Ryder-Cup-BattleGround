'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLiveQuery } from 'dexie-react-hooks';
import { Tv } from 'lucide-react';
import { PageHeader } from '@/components/layout';
import { useRealtimeScoring } from '@/lib/hooks/useRealtimeScoring';
import { db } from '@/lib/db';
import { uiLogger } from '@/lib/utils/logger';
import { useScoringStore, useTripStore } from '@/lib/stores';
import { useShallow } from 'zustand/shallow';
import type { MatchState } from '@/lib/types/computed';
import type { Player } from '@/lib/types/models';
import type { ScoreUpdate } from '@/lib/services/realtimeSyncService';
import { LiveNoTripState, LivePageSections } from './LivePageSections';

export default function LivePageClient() {
    const router = useRouter();
    const { currentTrip, players, getActiveSession } = useTripStore(useShallow(s => ({ currentTrip: s.currentTrip, players: s.players, getActiveSession: s.getActiveSession })));
    const { matchStates, loadSessionMatches, refreshMatchState } = useScoringStore();
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [soundEnabled, setSoundEnabled] = useState(true);
    const [lastUpdate, setLastUpdate] = useState(new Date());
    const [flashMatchId, setFlashMatchId] = useState<string | null>(null);
    const flashTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const activeSession = getActiveSession();

    const matches = useLiveQuery(
        async () => {
            if (!activeSession) return [];
            return db.matches.where('sessionId').equals(activeSession.id).sortBy('matchOrder');
        },
        [activeSession?.id],
        []
    );

    useEffect(() => {
        if (activeSession) {
            loadSessionMatches(activeSession.id);
        }
    }, [activeSession, loadSessionMatches]);

    const handleScoreUpdate = useCallback(
        (update: ScoreUpdate) => {
            uiLogger.log(
                `Live: realtime score update for match ${update.matchId}, hole ${update.holeNumber}`
            );

            refreshMatchState(update.matchId);
            setLastUpdate(new Date());

            if (flashTimeoutRef.current) {
                clearTimeout(flashTimeoutRef.current);
            }
            setFlashMatchId(update.matchId);
            flashTimeoutRef.current = setTimeout(() => setFlashMatchId(null), 2000);

            if (soundEnabled) {
                try {
                    const audio = new Audio('/sounds/score-tick.mp3');
                    audio.volume = 0.3;
                    audio.play().catch(() => {});
                } catch {
                    // Sound not available.
                }
            }
        },
        [refreshMatchState, soundEnabled]
    );

    const { isConnected } = useRealtimeScoring({
        tripId: currentTrip?.id,
        onScoreUpdate: handleScoreUpdate,
        enabled: !!currentTrip,
    });

    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible' && activeSession) {
                loadSessionMatches(activeSession.id);
                setLastUpdate(new Date());
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [activeSession, loadSessionMatches]);

    useEffect(() => {
        return () => {
            if (flashTimeoutRef.current) {
                clearTimeout(flashTimeoutRef.current);
            }
        };
    }, []);

    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(Boolean(document.fullscreenElement));
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    const toggleFullscreen = async () => {
        try {
            if (!document.fullscreenElement) {
                await document.documentElement.requestFullscreen();
                setIsFullscreen(true);
            } else {
                await document.exitFullscreen();
                setIsFullscreen(false);
            }
        } catch (error) {
            uiLogger.warn('Fullscreen toggle failed:', error);
        }
    };

    const getPlayer = (id: string): Player | undefined => players.find((player) => player.id === id);

    const getMatchState = (matchId: string): MatchState | undefined => matchStates.get(matchId);

    if (!currentTrip) {
        return (
            <LiveNoTripState
                onGoHome={() => router.push('/')}
                onGoMore={() => router.push('/more')}
            />
        );
    }

    return (
        <div className="min-h-screen page-premium-enter texture-grain bg-[var(--canvas)]">
            <PageHeader
                title="Live Scores"
                subtitle={currentTrip.name}
                icon={<Tv size={16} className="text-[var(--color-accent)]" />}
                onBack={() => router.back()}
            />

            <LivePageSections
                activeSession={activeSession ? { id: activeSession.id, name: activeSession.name } : null}
                matches={matches}
                isLoadingMatches={matches === undefined}
                isConnected={isConnected}
                lastUpdate={lastUpdate}
                soundEnabled={soundEnabled}
                isFullscreen={isFullscreen}
                flashMatchId={flashMatchId}
                getMatchState={getMatchState}
                getPlayer={getPlayer}
                onToggleSound={() => setSoundEnabled((current) => !current)}
                onToggleFullscreen={() => void toggleFullscreen()}
                onRefresh={() => {
                    if (activeSession) {
                        loadSessionMatches(activeSession.id);
                    }
                    setLastUpdate(new Date());
                }}
                onGoToSchedule={() => router.push('/schedule')}
                onGoToMatchups={() => router.push('/matchups')}
            />
        </div>
    );
}
