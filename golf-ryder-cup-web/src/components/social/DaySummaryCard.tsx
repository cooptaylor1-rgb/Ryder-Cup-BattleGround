/**
 * Day Summary Card Component
 *
 * Generates a shareable summary image for each day of the trip.
 * Features:
 * - Overall team score
 * - Match results
 * - Best performers
 * - Auto-generated highlights
 * - Share to social/messages
 *
 * Uses canvas API to generate shareable images.
 */

'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Share2,
    Download,
    X,
    Copy,
    Check,
} from 'lucide-react';
import { createLogger } from '@/lib/utils/logger';
import { EmptyStatePremium, LoadingEmpty } from '@/components/ui';
import { useTripStore } from '@/lib/stores';
import { db } from '@/lib/db';
import { calculateTeamStandings } from '@/lib/services/tournamentEngine';
import { calculateMatchState } from '@/lib/services/scoringEngine';
import type { MatchState } from '@/lib/types/computed';
import { format } from 'date-fns';

const logger = createLogger('DaySummary');

interface DaySummary {
    date: string;
    dayNumber: number;
    sessions: SessionSummary[];
    teamAPoints: number;
    teamBPoints: number;
    teamAName: string;
    teamBName: string;
    overallScore: {
        teamA: number;
        teamB: number;
    };
    highlights: string[];
    mvp?: {
        name: string;
        wins: number;
    };
}

interface SessionSummary {
    name: string;
    matches: MatchSummary[];
}

interface MatchSummary {
    matchNumber: number;
    teamAPlayers: string;
    teamBPlayers: string;
    result: string;
    winner: 'teamA' | 'teamB' | 'halved';
}

// Hook to generate day summary
export function useDaySummary(date?: string) {
    const { currentTrip, teams, players, sessions } = useTripStore();
    const [summary, setSummary] = useState<DaySummary | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const teamA = teams.find(t => t.color === 'usa');
    const teamB = teams.find(t => t.color === 'europe');

    const generateSummary = useCallback(async () => {
        if (!currentTrip) {
            setSummary(null);
            return null;
        }

        setIsLoading(true);

        try {
            // Get sessions for the specified date (or today)
            const targetDate = date || format(new Date(), 'yyyy-MM-dd');

            const daySessions = sessions.filter(s => {
                const sessionDate = s.scheduledDate?.split('T')[0];
                return sessionDate === targetDate;
            });

            if (daySessions.length === 0) {
                setSummary(null);
                return null;
            }

            // Get matches for these sessions
            const sessionIds = daySessions.map(s => s.id);
            const matches = await db.matches
                .where('sessionId')
                .anyOf(sessionIds)
                .toArray();

            // Get hole results for all matches
            const matchIds = matches.map(m => m.id);
            const holeResults = await db.holeResults
                .where('matchId')
                .anyOf(matchIds)
                .toArray();

            // Calculate match states
            const matchStates = new Map<string, MatchState>();
            for (const match of matches) {
                const results = holeResults.filter(r => r.matchId === match.id);
                matchStates.set(match.id, calculateMatchState(match, results));
            }

            // Calculate day points
            let dayTeamAPoints = 0;
            let dayTeamBPoints = 0;

            // Build session summaries
            const sessionSummaries: SessionSummary[] = daySessions.map(session => {
                const sessionMatches = matches.filter(m => m.sessionId === session.id);

                const matchSummaries: MatchSummary[] = sessionMatches.map(match => {
                    const state = matchStates.get(match.id);
                    const teamAPlayers = match.teamAPlayerIds
                        .map(id => players.find(p => p.id === id))
                        .filter(Boolean)
                        .map(p => p!.lastName)
                        .join('/');
                    const teamBPlayers = match.teamBPlayerIds
                        .map(id => players.find(p => p.id === id))
                        .filter(Boolean)
                        .map(p => p!.lastName)
                        .join('/');

                    let winner: 'teamA' | 'teamB' | 'halved' = 'halved';
                    let result = 'Halved';

                    if (match.status === 'completed' && state) {
                        if (state.winningTeam === 'teamA') {
                            winner = 'teamA';
                            result = state.displayScore;
                            dayTeamAPoints += 1;
                        } else if (state.winningTeam === 'teamB') {
                            winner = 'teamB';
                            result = state.displayScore;
                            dayTeamBPoints += 1;
                        } else {
                            dayTeamAPoints += 0.5;
                            dayTeamBPoints += 0.5;
                        }
                    } else if (match.status === 'inProgress') {
                        result = state?.displayScore || 'In Progress';
                    }

                    return {
                        matchNumber: match.matchOrder,
                        teamAPlayers,
                        teamBPlayers,
                        result,
                        winner,
                    };
                });

                return {
                    name: session.name,
                    matches: matchSummaries,
                };
            });

            // Get overall standings
            const standings = await calculateTeamStandings(currentTrip.id);

            // Find MVP (most wins today)
            const playerWins = new Map<string, number>();
            matches.forEach(match => {
                const state = matchStates.get(match.id);
                if (match.status === 'completed' && state?.winningTeam) {
                    const winnerIds = state.winningTeam === 'teamA'
                        ? match.teamAPlayerIds
                        : match.teamBPlayerIds;
                    winnerIds.forEach(id => {
                        playerWins.set(id, (playerWins.get(id) || 0) + 1);
                    });
                }
            });

            let mvp: { name: string; wins: number } | undefined = undefined;
            let maxWins = 0;
            playerWins.forEach((wins, playerId) => {
                if (wins > maxWins) {
                    maxWins = wins;
                    const player = players.find(p => p.id === playerId);
                    if (player) {
                        mvp = {
                            name: `${player.firstName} ${player.lastName}`,
                            wins,
                        };
                    }
                }
            });

            // Generate highlights
            const highlights: string[] = [];

            if (dayTeamAPoints > dayTeamBPoints) {
                highlights.push(`${teamA?.name || 'USA'} dominated the day ${dayTeamAPoints}-${dayTeamBPoints}`);
            } else if (dayTeamBPoints > dayTeamAPoints) {
                highlights.push(`${teamB?.name || 'Europe'} surged ahead ${dayTeamBPoints}-${dayTeamAPoints}`);
            } else {
                highlights.push(`Teams split the day ${dayTeamAPoints}-${dayTeamBPoints}`);
            }

            if (mvp && maxWins >= 2) {
                const mvpInfo = mvp as { name: string; wins: number };
                highlights.push(`${mvpInfo.name} led the way with ${mvpInfo.wins} wins`);
            }

            // Find any blowout wins (4&3 or better)
            const blowouts = sessionSummaries.flatMap(s => s.matches)
                .filter(m => {
                    const margin = parseInt(m.result.split('&')[0]);
                    return !isNaN(margin) && margin >= 4;
                });
            if (blowouts.length > 0) {
                highlights.push(`${blowouts.length} dominant win${blowouts.length > 1 ? 's' : ''} today`);
            }

            // Calculate day number
            const tripStart = new Date(currentTrip.startDate);
            const targetDateObj = new Date(targetDate);
            const dayNumber = Math.floor((targetDateObj.getTime() - tripStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;

            const daySummary: DaySummary = {
                date: targetDate,
                dayNumber,
                sessions: sessionSummaries,
                teamAPoints: dayTeamAPoints,
                teamBPoints: dayTeamBPoints,
                teamAName: teamA?.name || 'USA',
                teamBName: teamB?.name || 'Europe',
                overallScore: {
                    teamA: standings.teamAPoints,
                    teamB: standings.teamBPoints,
                },
                highlights,
                mvp,
            };

            setSummary(daySummary);
            return daySummary;
        } catch (error) {
            logger.error('Failed to generate summary:', error);
            setSummary(null);
            return null;
        } finally {
            setIsLoading(false);
        }
    }, [currentTrip, date, sessions, players, teamA, teamB]);

    useEffect(() => {
        generateSummary();
    }, [generateSummary]);

    return { summary, isLoading, refresh: generateSummary };
}

// Summary Card Component
interface DaySummaryCardProps {
    summary: DaySummary;
    tripName: string;
}

export function DaySummaryCard({ summary, tripName }: DaySummaryCardProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    const generateImage = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Set canvas size (Instagram story friendly: 1080x1920, scaled down)
        const width = 540;
        const height = 960;
        canvas.width = width;
        canvas.height = height;

        // Background gradient
        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, '#006644'); // Masters green
        gradient.addColorStop(1, '#004D33');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);

        // Add subtle pattern
        ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
        for (let i = 0; i < height; i += 40) {
            ctx.fillRect(0, i, width, 1);
        }

        // Header
        ctx.fillStyle = 'white';
        ctx.font = 'bold 24px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText(tripName.toUpperCase(), width / 2, 60);

        ctx.font = '16px system-ui';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.fillText(`Day ${summary.dayNumber} Results`, width / 2, 90);

        // Main Score
        ctx.fillStyle = 'white';
        ctx.font = 'bold 72px system-ui';
        ctx.fillText(
            `${summary.overallScore.teamA} - ${summary.overallScore.teamB}`,
            width / 2,
            180
        );

        // Team names
        ctx.font = '18px system-ui';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.textAlign = 'left';
        ctx.fillText(summary.teamAName, 60, 220);
        ctx.textAlign = 'right';
        ctx.fillText(summary.teamBName, width - 60, 220);
        ctx.textAlign = 'center';

        // Day Score
        ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.fillRect(40, 250, width - 80, 60);
        ctx.fillStyle = 'white';
        ctx.font = '16px system-ui';
        ctx.fillText(`Today: ${summary.teamAPoints} - ${summary.teamBPoints}`, width / 2, 290);

        // Match Results
        let y = 350;
        summary.sessions.forEach(session => {
            ctx.fillStyle = 'rgba(212, 175, 55, 0.9)'; // Gold
            ctx.font = 'bold 14px system-ui';
            ctx.fillText(session.name.toUpperCase(), width / 2, y);
            y += 30;

            session.matches.forEach(match => {
                ctx.fillStyle = 'white';
                ctx.font = '14px system-ui';

                // Winner highlight
                const teamAColor = match.winner === 'teamA' ? 'rgba(255, 255, 255, 1)' : 'rgba(255, 255, 255, 0.6)';
                const teamBColor = match.winner === 'teamB' ? 'rgba(255, 255, 255, 1)' : 'rgba(255, 255, 255, 0.6)';

                ctx.textAlign = 'left';
                ctx.fillStyle = teamAColor;
                ctx.fillText(match.teamAPlayers, 50, y);

                ctx.textAlign = 'center';
                ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
                ctx.fillText('vs', width / 2, y);

                ctx.textAlign = 'right';
                ctx.fillStyle = teamBColor;
                ctx.fillText(match.teamBPlayers, width - 50, y);

                y += 20;

                // Result
                ctx.textAlign = 'center';
                ctx.fillStyle = match.winner === 'halved'
                    ? 'rgba(255, 255, 255, 0.7)'
                    : 'rgba(212, 175, 55, 0.9)';
                ctx.font = 'bold 12px system-ui';
                ctx.fillText(match.result, width / 2, y);

                y += 35;
            });

            y += 20;
        });

        // Highlights
        if (summary.highlights.length > 0) {
            y = Math.max(y, 700);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.fillRect(40, y - 20, width - 80, summary.highlights.length * 30 + 40);

            ctx.fillStyle = 'rgba(212, 175, 55, 0.9)';
            ctx.font = 'bold 12px system-ui';
            ctx.fillText('HIGHLIGHTS', width / 2, y);
            y += 25;

            ctx.fillStyle = 'white';
            ctx.font = '14px system-ui';
            summary.highlights.forEach(highlight => {
                ctx.fillText(highlight, width / 2, y);
                y += 25;
            });
        }

        // Footer/branding
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.font = '12px system-ui';
        ctx.fillText('Golf Ryder Cup Tracker', width / 2, height - 40);

        // Convert to image URL
        const url = canvas.toDataURL('image/png');
        setImageUrl(url);
    }, [summary, tripName]);

    // Generate image when summary changes
    useEffect(() => {
        generateImage();
    }, [generateImage]);

    // Share functionality
    const handleShare = async () => {
        if (!imageUrl) return;

        try {
            // Convert data URL to blob
            const response = await fetch(imageUrl);
            const blob = await response.blob();
            const file = new File([blob], `day-${summary.dayNumber}-results.png`, { type: 'image/png' });

            if (navigator.share && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    files: [file],
                    title: `Day ${summary.dayNumber} Results`,
                    text: `${summary.teamAName} ${summary.overallScore.teamA} - ${summary.overallScore.teamB} ${summary.teamBName}`,
                });
            } else {
                // Fallback: copy to clipboard or download
                handleDownload();
            }
        } catch (error) {
            logger.error('Share failed:', error);
        }
    };

    const handleDownload = () => {
        if (!imageUrl) return;

        const link = document.createElement('a');
        link.href = imageUrl;
        link.download = `day-${summary.dayNumber}-results.png`;
        link.click();
    };

    const handleCopyText = async () => {
        const text = `${tripName} - Day ${summary.dayNumber}\n\n` +
            `${summary.teamAName} ${summary.overallScore.teamA} - ${summary.overallScore.teamB} ${summary.teamBName}\n\n` +
            `Today: ${summary.teamAPoints} - ${summary.teamBPoints}\n\n` +
            summary.highlights.join('\n');

        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="rounded-2xl overflow-hidden border border-[var(--rule)] bg-[var(--surface-raised)]">
            {/* Preview */}
            <div className="relative aspect-[9/16] max-h-[500px] bg-linear-to-b from-[#006644] to-[#004D33]">
                <canvas ref={canvasRef} className="w-full h-full object-contain" />
            </div>

            {/* Actions */}
            <div className="p-4 flex gap-2">
                <button
                    onClick={handleShare}
                    className="flex-1 py-3 rounded-xl font-semibold text-white flex items-center justify-center gap-2 bg-[var(--masters)] hover:bg-[color:var(--masters)]/90 transition-colors"
                >
                    <Share2 size={18} />
                    Share
                </button>
                <button
                    onClick={handleDownload}
                    className="py-3 px-4 rounded-xl border border-[var(--rule)] bg-[var(--surface)] text-[var(--ink-primary)] hover:bg-[color:var(--surface)]/80 transition-colors"
                >
                    <Download size={18} />
                </button>
                <button
                    onClick={handleCopyText}
                    className="py-3 px-4 rounded-xl border border-[var(--rule)] bg-[var(--surface)] text-[var(--ink-primary)] hover:bg-[color:var(--surface)]/80 transition-colors"
                >
                    {copied ? <Check size={18} className="text-[var(--success)]" /> : <Copy size={18} />}
                </button>
            </div>
        </div>
    );
}

// Full Summary Page/Modal
interface DaySummaryModalProps {
    isOpen: boolean;
    onClose: () => void;
    date?: string;
}

export function DaySummaryModal({ isOpen, onClose, date }: DaySummaryModalProps) {
    const { currentTrip } = useTripStore();
    const { summary, isLoading } = useDaySummary(date);

    // Modal closed → render nothing.
    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <>
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/60 z-50"
                    onClick={onClose}
                />
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="fixed inset-4 md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[400px] md:max-h-[90vh] z-50 overflow-auto rounded-2xl border border-[var(--rule)] bg-[var(--surface-raised)] text-[var(--ink-primary)]"
                    role="dialog"
                    aria-modal="true"
                    aria-label="Day Summary"
                >
                    {/* Header */}
                    <div className="sticky top-0 bg-[color:var(--surface-raised)]/95 backdrop-blur-sm p-4 flex items-center justify-between border-b border-[var(--rule)]">
                        <h2 className="font-semibold">Day Summary</h2>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-full hover:bg-[var(--surface)]"
                            aria-label="Close"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-4">
                        {!currentTrip ? (
                            <EmptyStatePremium
                                illustration="trophy"
                                title="No active trip"
                                description="Start or select a trip to generate a day summary."
                                variant="compact"
                            />
                        ) : isLoading ? (
                            <LoadingEmpty message="Generating summary…" />
                        ) : summary ? (
                            <DaySummaryCard summary={summary} tripName={currentTrip.name} />
                        ) : (
                            <EmptyStatePremium
                                illustration="calendar"
                                title="No matches found"
                                description="There are no scored matches for this day yet."
                                variant="compact"
                            />
                        )}
                    </div>
                </motion.div>
            </>
        </AnimatePresence>
    );
}
