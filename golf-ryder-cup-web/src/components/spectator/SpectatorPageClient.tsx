'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { generateScoreboardText } from '@/lib/services/spectatorService';
import { tripLogger } from '@/lib/utils/logger';
import type { SpectatorView } from '@/lib/types/captain';
import {
    SpectatorLoadingState,
    SpectatorPageSections,
    SpectatorUnavailableState,
} from './SpectatorPageSections';
import {
    loadSpectatorViewData,
    SPECTATOR_POLL_INTERVAL_MS,
} from './spectatorPageData';

export default function SpectatorPageClient({ tripId }: { tripId: string }) {
    const router = useRouter();

    const [spectatorView, setSpectatorView] = useState<SpectatorView | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [isOnline, setIsOnline] = useState(() =>
        typeof navigator === 'undefined' ? true : navigator.onLine
    );

    const loadData = useCallback(async () => {
        setLoadError(null);

        try {
            const view = await loadSpectatorViewData(tripId);
            setSpectatorView(view);
            if (view) {
                setLastUpdated(new Date());
            }
        } catch (error) {
            tripLogger.error('Spectator view load failed:', error);
            setLoadError("We couldn't load this scoreboard right now.");
        } finally {
            setLoading(false);
        }
    }, [tripId]);

    useEffect(() => {
        void loadData();

        let interval: ReturnType<typeof setInterval> | null = null;

        const startPolling = () => {
            if (!interval) {
                interval = setInterval(() => {
                    void loadData();
                }, SPECTATOR_POLL_INTERVAL_MS);
            }
        };

        const stopPolling = () => {
            if (interval) {
                clearInterval(interval);
                interval = null;
            }
        };

        const handleVisibility = () => {
            if (document.visibilityState === 'visible') {
                void loadData();
                startPolling();
            } else {
                stopPolling();
            }
        };

        if (document.visibilityState === 'visible') {
            startPolling();
        }

        document.addEventListener('visibilitychange', handleVisibility);

        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            stopPolling();
            document.removeEventListener('visibilitychange', handleVisibility);
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [loadData]);

    const handleToggleFullscreen = () => {
        if (!document.fullscreenElement) {
            void document.documentElement.requestFullscreen();
        } else {
            void document.exitFullscreen();
        }
    };

    const handleShare = useCallback(async () => {
        if (!spectatorView) return;

        const text = generateScoreboardText(spectatorView);
        const shareUrl = window.location.href;

        if (typeof navigator !== 'undefined' && navigator.share) {
            try {
                await navigator.share({
                    title: `${spectatorView.tripName} — Live Scoreboard`,
                    text,
                    url: shareUrl,
                });
            } catch {
                // User cancelled or share failed.
            }
        } else {
            try {
                await navigator.clipboard.writeText(`${text}\n\n${shareUrl}`);
            } catch {
                // Clipboard not available.
            }
        }
    }, [spectatorView]);

    if (loading) {
        return <SpectatorLoadingState />;
    }

    if (!spectatorView) {
        return (
            <SpectatorUnavailableState
                loadError={loadError}
                onRetry={() => void loadData()}
                onGoHome={() => router.push('/')}
            />
        );
    }

    return (
        <SpectatorPageSections
            spectatorView={spectatorView}
            loadError={loadError}
            lastUpdated={lastUpdated}
            isOnline={isOnline}
            onBack={() => router.back()}
            onRefresh={() => void loadData()}
            onShare={() => void handleShare()}
            onToggleFullscreen={handleToggleFullscreen}
        />
    );
}
