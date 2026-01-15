'use client';

/**
 * Quick Score FAB (Floating Action Button)
 *
 * Appears when there's an active match in progress,
 * allowing users to quickly jump to scoring from anywhere in the app.
 *
 * Features:
 * - Shows current match status badge
 * - Pulse animation when match is live
 * - Respects reduced motion preferences
 * - Hides automatically on scoring pages
 */

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useTripStore } from '@/lib/stores';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { calculateMatchState } from '@/lib/services/scoringEngine';
import { Target, ChevronRight } from 'lucide-react';
import type { Match, HoleResult } from '@/lib/types/models';

export function QuickScoreFAB() {
    const pathname = usePathname();
    const router = useRouter();
    const { currentTrip } = useTripStore();
    const [isVisible, setIsVisible] = useState(false);
    const [activeMatch, setActiveMatch] = useState<{
        match: Match;
        displayScore: string;
        currentHole: number;
    } | null>(null);

    // Hide on scoring pages, home, and when no trip
    const shouldHide =
        !currentTrip ||
        pathname === '/' ||
        pathname.startsWith('/score') ||
        pathname.startsWith('/profile/create') ||
        pathname.startsWith('/trip/new');

    // Find active matches (in progress)
    const inProgressMatches = useLiveQuery(async () => {
        if (!currentTrip) return [];

        // Get all sessions for current trip
        const sessions = await db.sessions
            .where('tripId')
            .equals(currentTrip.id)
            .toArray();

        if (sessions.length === 0) return [];

        // Get all matches for those sessions
        const sessionIds = sessions.map((s) => s.id);
        const matches = await db.matches
            .where('sessionId')
            .anyOf(sessionIds)
            .filter((m) => m.status === 'inProgress')
            .toArray();

        return matches;
    }, [currentTrip?.id]);

    // Calculate match state for active match
    useEffect(() => {
        async function updateActiveMatch() {
            if (!inProgressMatches || inProgressMatches.length === 0) {
                setActiveMatch(null);
                setIsVisible(false);
                return;
            }

            // Use the first in-progress match
            const match = inProgressMatches[0];

            // Get hole results
            const holeResults = await db.holeResults
                .where('matchId')
                .equals(match.id)
                .toArray();

            const state = calculateMatchState(match, holeResults);

            setActiveMatch({
                match,
                displayScore: state.displayScore,
                currentHole: state.holesPlayed + 1,
            });

            setIsVisible(true);
        }

        updateActiveMatch();
    }, [inProgressMatches]);

    // Don't render if should hide
    if (shouldHide || !isVisible || !activeMatch) {
        return null;
    }

    const handleClick = () => {
        router.push(`/score/${activeMatch.match.id}`);
    };

    return (
        <button
            onClick={handleClick}
            className="fixed bottom-24 right-4 z-40 flex items-center gap-3 px-4 py-3 rounded-2xl shadow-lg animate-in slide-in-from-bottom-4 fade-in duration-300 press-scale"
            style={{
                background: 'var(--masters)',
                color: 'white',
                boxShadow: '0 4px 20px rgba(0, 103, 71, 0.4)',
            }}
            aria-label="Quick score - go to active match"
        >
            {/* Pulse indicator */}
            <div className="relative">
                <span
                    className="absolute inset-0 rounded-full animate-ping opacity-75"
                    style={{ background: 'rgba(255, 255, 255, 0.4)' }}
                />
                <div
                    className="relative w-10 h-10 rounded-full flex items-center justify-center"
                    style={{ background: 'rgba(255, 255, 255, 0.2)' }}
                >
                    <Target size={20} />
                </div>
            </div>

            {/* Match info */}
            <div className="text-left">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{activeMatch.displayScore}</span>
                    <span
                        className="text-xs px-1.5 py-0.5 rounded"
                        style={{ background: 'rgba(255, 255, 255, 0.2)' }}
                    >
                        LIVE
                    </span>
                </div>
                <span className="text-xs opacity-80">
                    Hole {activeMatch.currentHole}
                </span>
            </div>

            <ChevronRight size={18} className="opacity-60" />
        </button>
    );
}
