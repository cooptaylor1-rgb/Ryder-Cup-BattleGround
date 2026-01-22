'use client';

/**
 * Spectator Mode Page (Production Quality)
 *
 * Read-only tournament scoreboard for non-players:
 * - Large, TV-friendly layout
 * - Live match updates
 * - No edit controls
 * - Auto-refresh with real-time data
 * - Responsive for iPad/TV/Desktop
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
    Trophy,
    Clock,
    RefreshCw,
    Tv,
    ArrowLeft,
    Wifi,
    WifiOff,
    Flag,
    Target,
} from 'lucide-react';
import { colors } from '@/lib/design-system/tokens';
import { db } from '@/lib/db';
import { buildSpectatorView } from '@/lib/services/spectatorService';
import { tripLogger } from '@/lib/utils/logger';
import type { SpectatorView, SpectatorMatch } from '@/lib/types/captain';

// ============================================
// MAIN COMPONENT
// ============================================

export default function SpectatorPage() {
    const params = useParams();
    const router = useRouter();
    const tripId = params.tripId as string;

    const [spectatorView, setSpectatorView] = useState<SpectatorView | null>(null);
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [isOnline, setIsOnline] = useState(true);
    const [_fullscreen, setFullscreen] = useState(false);

    // ============================================
    // LOAD DATA
    // ============================================

    const loadData = useCallback(async () => {
        try {
            const trip = await db.trips.get(tripId);
            if (!trip) {
                setLoading(false);
                return;
            }

            const teams = await db.teams.where('tripId').equals(tripId).toArray();
            const sessions = await db.sessions.where('tripId').equals(tripId).toArray();
            const sessionIds = sessions.map((s) => s.id);
            const matches = await db.matches.where('sessionId').anyOf(sessionIds).toArray();
            const matchIds = matches.map((m) => m.id);
            const holeResults = await db.holeResults.where('matchId').anyOf(matchIds).toArray();

            // Get all players
            const teamIds = teams.map((t) => t.id);
            const teamMembers = await db.teamMembers.where('teamId').anyOf(teamIds).toArray();
            const playerIds = [...new Set(teamMembers.map((tm) => tm.playerId))];
            const playersData = await db.players.bulkGet(playerIds);
            const players = playersData.filter((p): p is NonNullable<typeof p> => p !== undefined);

            const view = buildSpectatorView(
                trip,
                teams,
                sessions,
                matches,
                holeResults,
                players,
                trip.settings?.pointsToWin ?? 14.5
            );

            setSpectatorView(view);
            setLastUpdated(new Date());
        } catch (error) {
            tripLogger.error('Spectator view load failed:', error);
        } finally {
            setLoading(false);
        }
    }, [tripId]);

    // ============================================
    // AUTO-REFRESH
    // ============================================

    useEffect(() => {
        loadData();

        // Auto-refresh every 15 seconds
        const interval = setInterval(loadData, 15000);

        // Track online status
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            clearInterval(interval);
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [loadData]);

    // ============================================
    // FULLSCREEN TOGGLE
    // ============================================

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
            setFullscreen(true);
        } else {
            document.exitFullscreen();
            setFullscreen(false);
        }
    };

    // ============================================
    // RENDER
    // ============================================

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#004225] border-t-transparent mx-auto mb-4" />
                    <p className="text-[#A0A0A0]">Loading scoreboard...</p>
                </div>
            </div>
        );
    }

    if (!spectatorView) {
        return (
            <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-4">
                <div className="text-center">
                    <Trophy className="w-16 h-16 text-[#505050] mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-white mb-2">Tournament Not Found</h2>
                    <p className="text-[#A0A0A0] mb-6">This tournament doesn&apos;t exist or has been removed.</p>
                    <button
                        onClick={() => router.push('/')}
                        className="px-6 py-3 bg-[#004225] text-white rounded-xl"
                    >
                        Go Home
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0A0A0A]">
            {/* Header Bar */}
            <header className="sticky top-0 z-50 bg-[#141414] border-b border-[#2A2A2A]">
                <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => router.back()}
                            className="p-2 hover:bg-[#282828] rounded-lg transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5 text-[#A0A0A0]" />
                        </button>
                        <div>
                            <h1 className="text-lg font-bold text-white">{spectatorView.tripName}</h1>
                            <p className="text-xs text-[#707070] flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full ${spectatorView.currentStatus === 'live' ? 'bg-green-500 animate-pulse' : spectatorView.currentStatus === 'completed' ? 'bg-[#707070]' : 'bg-[#FFD54F]'}`} />
                                {spectatorView.currentStatus === 'live' ? 'LIVE' : spectatorView.currentStatus === 'completed' ? 'FINAL' : 'UPCOMING'}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Connection Status */}
                        <div className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${isOnline ? 'text-green-400' : 'text-red-400'}`}>
                            {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                        </div>

                        {/* Refresh Button */}
                        <button
                            onClick={loadData}
                            className="p-2 hover:bg-[#282828] rounded-lg transition-colors"
                            title="Refresh"
                        >
                            <RefreshCw className="w-4 h-4 text-[#A0A0A0]" />
                        </button>

                        {/* Fullscreen Button */}
                        <button
                            onClick={toggleFullscreen}
                            className="p-2 hover:bg-[#282828] rounded-lg transition-colors"
                            title="Fullscreen"
                        >
                            <Tv className="w-4 h-4 text-[#A0A0A0]" />
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Scoreboard */}
            <main className="max-w-7xl mx-auto p-4 lg:p-8">
                {/* Team Scores */}
                <div className="grid grid-cols-2 gap-4 lg:gap-8 mb-8">
                    {/* Team A */}
                    <TeamScoreCard
                        teamName={spectatorView.teamA.name}
                        points={spectatorView.teamA.points}
                        color={colors.team.usa.primary}
                        isLeading={spectatorView.teamA.points > spectatorView.teamB.points}
                        pointsToWin={spectatorView.pointsToWin}
                    />

                    {/* Team B */}
                    <TeamScoreCard
                        teamName={spectatorView.teamB.name}
                        points={spectatorView.teamB.points}
                        color={colors.team.europe.primary}
                        isLeading={spectatorView.teamB.points > spectatorView.teamA.points}
                        pointsToWin={spectatorView.pointsToWin}
                    />
                </div>

                {/* Magic Number */}
                {spectatorView.magicNumber && (
                    <MagicNumberBanner
                        team={spectatorView.magicNumber.team === 'A' ? spectatorView.teamA.name : spectatorView.teamB.name}
                        points={spectatorView.magicNumber.points}
                        teamColor={spectatorView.magicNumber.team === 'A' ? colors.team.usa.primary : colors.team.europe.primary}
                    />
                )}

                {/* Live Matches */}
                {spectatorView.liveMatches.length > 0 && (
                    <section className="mb-8">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                            <h2 className="text-lg font-semibold text-white">Live Matches</h2>
                        </div>
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {spectatorView.liveMatches.map((match) => (
                                <LiveMatchCard key={match.id} match={match} />
                            ))}
                        </div>
                    </section>
                )}

                {/* Recent Results */}
                {spectatorView.recentResults.length > 0 && (
                    <section>
                        <div className="flex items-center gap-2 mb-4">
                            <Flag className="w-4 h-4 text-[#A0A0A0]" />
                            <h2 className="text-lg font-semibold text-white">Recent Results</h2>
                        </div>
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {spectatorView.recentResults.map((match) => (
                                <CompletedMatchCard key={match.id} match={match} />
                            ))}
                        </div>
                    </section>
                )}

                {/* No Matches Yet */}
                {spectatorView.liveMatches.length === 0 && spectatorView.recentResults.length === 0 && (
                    <div className="text-center py-16">
                        <Clock className="w-16 h-16 text-[#505050] mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-white mb-2">Tournament Hasn&apos;t Started</h3>
                        <p className="text-[#A0A0A0]">Check back when matches begin!</p>
                    </div>
                )}
            </main>

            {/* Footer with Last Updated */}
            <footer className="fixed bottom-0 left-0 right-0 bg-[#141414] border-t border-[#2A2A2A] py-2 px-4">
                <div className="max-w-7xl mx-auto flex items-center justify-between text-xs text-[#707070]">
                    <span>Spectator Mode • Read Only</span>
                    <span>
                        Last updated: {lastUpdated?.toLocaleTimeString() || 'Never'}
                    </span>
                </div>
            </footer>
        </div>
    );
}

// ============================================
// SUB-COMPONENTS
// ============================================

function TeamScoreCard({
    teamName,
    points,
    color,
    isLeading,
    pointsToWin,
}: {
    teamName: string;
    points: number;
    color: string;
    isLeading: boolean;
    pointsToWin: number;
}) {
    const percentage = Math.min(100, (points / pointsToWin) * 100);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-2xl bg-[#141414] border border-[#2A2A2A] p-6 lg:p-8"
        >
            {/* Leading indicator */}
            {isLeading && (
                <div className="absolute top-4 right-4">
                    <Trophy className="w-6 h-6 text-[#FFD54F]" />
                </div>
            )}

            {/* Team name */}
            <h3
                className="text-lg lg:text-xl font-semibold mb-4"
                style={{ color }}
            >
                {teamName}
            </h3>

            {/* Score */}
            <div className="text-5xl lg:text-7xl font-bold text-white mb-4">
                {points}
            </div>

            {/* Progress bar */}
            <div className="h-2 bg-[#2A2A2A] rounded-full overflow-hidden">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                    className="h-full rounded-full"
                    style={{ backgroundColor: color }}
                />
            </div>
            <p className="text-xs text-[#707070] mt-2">
                {pointsToWin - points > 0 ? `${pointsToWin - points} to win` : 'Winner!'}
            </p>
        </motion.div>
    );
}

function MagicNumberBanner({
    team,
    points,
    teamColor,
}: {
    team: string;
    points: number;
    teamColor: string;
}) {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-8 p-4 rounded-xl border-2 text-center"
            style={{
                borderColor: teamColor,
                backgroundColor: `${teamColor}15`,
            }}
        >
            <div className="flex items-center justify-center gap-3">
                <Target className="w-5 h-5" style={{ color: teamColor }} />
                <span className="text-white">
                    <strong style={{ color: teamColor }}>{team}</strong> needs{' '}
                    <strong className="text-[#FFD54F]">{points}</strong> points to clinch
                </span>
            </div>
        </motion.div>
    );
}

function LiveMatchCard({ match }: { match: SpectatorMatch }) {
    // Parse numeric score from string for color logic
    const scoreNum = match.currentScore === 'AS' ? 0 :
        match.currentScore.includes('UP') ? parseInt(match.currentScore) || 0 : 0;
    const scoreColor =
        scoreNum > 0
            ? colors.team.usa.light
            : scoreNum < 0
                ? colors.team.europe.light
                : colors.text.secondary;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-[#141414] rounded-xl border border-[#2A2A2A] p-4 relative overflow-hidden"
        >
            {/* Live badge */}
            <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-0.5 bg-green-500/20 text-green-400 rounded text-xs font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                LIVE
            </div>

            {/* Match info */}
            <div className="mb-3">
                <p className="text-xs text-[#707070] mb-1">{match.sessionName}</p>
                <p className="text-sm text-[#A0A0A0]">Thru {match.thruHole}</p>
            </div>

            {/* Players */}
            <div className="space-y-2 mb-3">
                <div className="flex items-center justify-between">
                    <span className="text-white font-medium truncate flex-1">{match.teamAPlayers}</span>
                    <span
                        className="w-8 text-center font-mono"
                        style={{ color: scoreNum > 0 ? colors.team.usa.light : colors.text.secondary }}
                    >
                        {scoreNum > 0 ? '●' : ''}
                    </span>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-white font-medium truncate flex-1">{match.teamBPlayers}</span>
                    <span
                        className="w-8 text-center font-mono"
                        style={{ color: scoreNum < 0 ? colors.team.europe.light : colors.text.secondary }}
                    >
                        {scoreNum < 0 ? '●' : ''}
                    </span>
                </div>
            </div>

            {/* Match status */}
            <div className="text-center pt-2 border-t border-[#2A2A2A]">
                <span className="text-lg font-bold" style={{ color: scoreColor }}>
                    {match.currentScore}
                </span>
            </div>
        </motion.div>
    );
}

function CompletedMatchCard({ match }: { match: SpectatorMatch }) {
    // result is a string like "4&3", "2&1", "1 UP", "Halved"
    const result = match.result || '';
    const isHalved = result.toLowerCase() === 'halved' || result === '';
    // Team A wins if status is complete and currentScore shows team A ahead
    const scoreNum = match.currentScore === 'AS' ? 0 :
        match.currentScore.includes('UP') ? parseInt(match.currentScore) || 0 : 0;
    const isTeamAWin = match.status === 'completed' && scoreNum > 0;
    const isTeamBWin = match.status === 'completed' && scoreNum < 0;

    return (
        <div className="bg-[#141414] rounded-xl border border-[#2A2A2A] p-4 opacity-80">
            {/* Match info */}
            <div className="mb-3">
                <p className="text-xs text-[#707070] mb-1">{match.sessionName}</p>
            </div>

            {/* Players */}
            <div className="space-y-2 mb-3">
                <div className="flex items-center justify-between">
                    <span
                        className={`font-medium truncate flex-1 ${isTeamAWin ? 'text-white' : 'text-[#707070]'}`}
                    >
                        {match.teamAPlayers}
                    </span>
                    {isTeamAWin && <Trophy className="w-4 h-4 text-[#FFD54F]" />}
                </div>
                <div className="flex items-center justify-between">
                    <span
                        className={`font-medium truncate flex-1 ${isTeamBWin ? 'text-white' : 'text-[#707070]'}`}
                    >
                        {match.teamBPlayers}
                    </span>
                    {isTeamBWin && <Trophy className="w-4 h-4 text-[#FFD54F]" />}
                </div>
            </div>

            {/* Result */}
            <div className="text-center pt-2 border-t border-[#2A2A2A]">
                <span className="text-sm font-medium text-[#A0A0A0]">
                    {isHalved ? 'Halved' : result || 'Final'}
                </span>
            </div>
        </div>
    );
}
