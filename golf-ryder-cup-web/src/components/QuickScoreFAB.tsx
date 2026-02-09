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
 * - Tap opens quick score modal, long press goes to full scorecard
 */

import { useEffect, useState, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useTripStore } from '@/lib/stores';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { calculateMatchState } from '@/lib/services/scoringEngine';
import { ChevronRight, Zap } from 'lucide-react';
import { QuickScoreModal } from './QuickScoreModal';
import type { Match } from '@/lib/types/models';

export function QuickScoreFAB() {
    const pathname = usePathname();
    const router = useRouter();
    const { currentTrip } = useTripStore();
    const [isVisible, setIsVisible] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const longPressTimer = useRef<NodeJS.Timeout | null>(null);
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

    const handleTouchStart = () => {
        longPressTimer.current = setTimeout(() => {
            // Long press: go to full scorecard
            router.push(`/score/${activeMatch.match.id}`);
        }, 500);
    };

    const handleTouchEnd = () => {
        if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
        }
    };

    const handleClick = () => {
        // Short tap: open quick score modal
        setShowModal(true);
    };

    return (
        <>
            <button
                onClick={handleClick}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
                onMouseDown={handleTouchStart}
                onMouseUp={handleTouchEnd}
                onMouseLeave={handleTouchEnd}
                className="fixed bottom-28 right-4 z-40 flex min-h-[56px] items-center gap-3 rounded-2xl bg-[var(--masters)] px-5 py-4 text-white shadow-[0_6px_24px_rgba(0,103,71,0.5)] animate-in slide-in-from-bottom-4 fade-in duration-300 transition-transform active:scale-95"
                aria-label="Quick score - tap to enter score, hold for full scorecard"
            >
                {/* Pulse indicator */}
                <div className="relative">
                    <span className="absolute inset-0 animate-ping rounded-full bg-[rgba(255,255,255,0.4)] opacity-75" />
                    <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-[rgba(255,255,255,0.2)]">
                        <Zap size={20} />
                    </div>
                </div>

                {/* Match info */}
                <div className="text-left">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">{activeMatch.displayScore}</span>
                        <span className="rounded bg-[rgba(255,255,255,0.2)] px-1.5 py-0.5 text-xs">
                            LIVE
                        </span>
                    </div>
                    <span className="text-xs opacity-80">
                        Hole {activeMatch.currentHole} • Tap to score
                    </span>
                </div>

                <ChevronRight size={18} className="opacity-60" />
            </button>

            {/* Quick Score Modal */}
            <QuickScoreModal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                matchId={activeMatch.match.id}
            />
        </>
    );
}
