/**
 * Share Card Component
 *
 * Generates beautiful shareable images for match results and standings.
 * Can be downloaded or shared to social media.
 */

'use client';

import { useRef, useState } from 'react';
import { cn, formatPlayerName } from '@/lib/utils';
import { Download, Share2, Check, Trophy } from 'lucide-react';
import type { Player } from '@/lib/types/models';

// ============================================
// MATCH RESULT SHARE CARD
// ============================================

interface MatchResultCardProps {
    matchNumber: number;
    sessionName: string;
    teamAPlayers: Player[];
    teamBPlayers: Player[];
    score: string;
    winnerTeam: 'usa' | 'europe' | 'halved';
    holesPlayed: number;
    tripName: string;
    className?: string;
}

export function MatchResultCard({
    matchNumber,
    sessionName,
    teamAPlayers,
    teamBPlayers,
    score,
    winnerTeam,
    holesPlayed,
    tripName,
    className,
}: MatchResultCardProps) {
    const cardRef = useRef<HTMLDivElement>(null);
    const [isCopying, setIsCopying] = useState(false);

    const handleDownload = async () => {
        if (!cardRef.current) return;

        try {
            // Use html2canvas if available, otherwise fallback to screenshot instructions
            const html2canvas = (await import('html2canvas')).default;
            const canvas = await html2canvas(cardRef.current, {
                scale: 2,
                backgroundColor: null,
            });

            const link = document.createElement('a');
            link.download = `match-${matchNumber}-result.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        } catch {
            alert('Screenshot feature requires html2canvas. Please take a manual screenshot.');
        }
    };

    const handleShare = async () => {
        const text = generateShareText();

        if (navigator.share) {
            try {
                await navigator.share({
                    title: `${tripName} - Match ${matchNumber} Result`,
                    text,
                });
            } catch {
                // User cancelled or error
            }
        } else {
            // Copy to clipboard
            await navigator.clipboard.writeText(text);
            setIsCopying(true);
            setTimeout(() => setIsCopying(false), 2000);
        }
    };

    const generateShareText = () => {
        const usaNames = teamAPlayers.map(p => formatPlayerName(p.firstName, p.lastName, 'short')).join(' & ');
        const eurNames = teamBPlayers.map(p => formatPlayerName(p.firstName, p.lastName, 'short')).join(' & ');

        if (winnerTeam === 'halved') {
            return `🏌️ Match ${matchNumber} HALVED!\n\n🇺🇸 ${usaNames}\n🇪🇺 ${eurNames}\n\n⛳ ${sessionName} at ${tripName}`;
        }

        const winner = winnerTeam === 'usa' ? usaNames : eurNames;
        const loser = winnerTeam === 'usa' ? eurNames : usaNames;
        const flag = winnerTeam === 'usa' ? '🇺🇸' : '🇪🇺';

        return `🏌️ Match ${matchNumber} Result\n\n${flag} ${winner} defeats ${loser}\n📊 ${score}\n\n⛳ ${sessionName} at ${tripName}`;
    };

    return (
        <div className={cn('space-y-4', className)}>
            {/* The actual card for sharing */}
            <div
                ref={cardRef}
                className={cn(
                    'relative p-6 rounded-2xl overflow-hidden',
                    'bg-gradient-to-br',
                    winnerTeam === 'usa'
                        ? 'from-[#1E3A5F] to-[#0D1F35]'
                        : winnerTeam === 'europe'
                            ? 'from-[#722F37] to-[#3D181C]'
                            : 'from-[#C4A747] to-[#8B7432]'
                )}
            >
                {/* Background pattern */}
                <div className="absolute inset-0 opacity-10">
                    <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                        <pattern id="golf-pattern" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
                            <circle cx="10" cy="10" r="1.5" fill="white" />
                        </pattern>
                        <rect width="100" height="100" fill="url(#golf-pattern)" />
                    </svg>
                </div>

                {/* Content */}
                <div className="relative z-10">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <div className="text-white/60 text-sm">{sessionName}</div>
                            <div className="text-white text-lg font-bold">Match {matchNumber}</div>
                        </div>
                        <div className="text-white/60 text-sm">{tripName}</div>
                    </div>

                    {/* Teams and Score */}
                    <div className="flex items-center gap-4">
                        {/* Team USA */}
                        <div className={cn(
                            'flex-1 p-4 rounded-xl',
                            winnerTeam === 'usa' ? 'bg-white/20' : 'bg-white/5'
                        )}>
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-2xl">🇺🇸</span>
                                <span className="text-white font-medium">USA</span>
                                {winnerTeam === 'usa' && (
                                    <Trophy className="w-4 h-4 text-secondary-gold" />
                                )}
                            </div>
                            <div className="text-white space-y-1">
                                {teamAPlayers.map(p => (
                                    <div key={p.id} className="font-semibold">
                                        {formatPlayerName(p.firstName, p.lastName, 'full')}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Score */}
                        <div className="text-center">
                            <div className="text-white text-3xl font-bold">{score}</div>
                            <div className="text-white/60 text-sm">thru {holesPlayed}</div>
                        </div>

                        {/* Team Europe */}
                        <div className={cn(
                            'flex-1 p-4 rounded-xl text-right',
                            winnerTeam === 'europe' ? 'bg-white/20' : 'bg-white/5'
                        )}>
                            <div className="flex items-center justify-end gap-2 mb-2">
                                {winnerTeam === 'europe' && (
                                    <Trophy className="w-4 h-4 text-secondary-gold" />
                                )}
                                <span className="text-white font-medium">EUR</span>
                                <span className="text-2xl">🇪🇺</span>
                            </div>
                            <div className="text-white space-y-1">
                                {teamBPlayers.map(p => (
                                    <div key={p.id} className="font-semibold">
                                        {formatPlayerName(p.firstName, p.lastName, 'full')}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Result */}
                    <div className="mt-6 text-center">
                        <div className="text-white text-xl font-bold">
                            {winnerTeam === 'halved' ? (
                                'MATCH HALVED'
                            ) : (
                                <>
                                    {winnerTeam === 'usa' ? '🇺🇸' : '🇪🇺'} TEAM {winnerTeam.toUpperCase()} WINS
                                </>
                            )}
                        </div>
                    </div>

                    {/* Watermark */}
                    <div className="mt-6 text-center text-white/40 text-xs">
                        Golf Ryder Cup App
                    </div>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
                <button
                    onClick={handleDownload}
                    className={cn(
                        'flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg',
                        'border border-surface-200 dark:border-surface-700',
                        'hover:bg-surface-50 dark:hover:bg-surface-800',
                        'transition-colors'
                    )}
                >
                    <Download className="w-5 h-5" />
                    <span>Save Image</span>
                </button>
                <button
                    onClick={handleShare}
                    className={cn(
                        'flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg',
                        'bg-masters-primary text-white',
                        'hover:bg-masters-primary-dark',
                        'transition-colors'
                    )}
                >
                    {isCopying ? (
                        <>
                            <Check className="w-5 h-5" />
                            <span>Copied!</span>
                        </>
                    ) : (
                        <>
                            <Share2 className="w-5 h-5" />
                            <span>Share</span>
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}

// ============================================
// STANDINGS SHARE CARD
// ============================================

interface StandingsCardProps {
    tripName: string;
    teamAScore: number;
    teamBScore: number;
    matchesRemaining: number;
    sessionName?: string;
    className?: string;
}

export function StandingsShareCard({
    tripName,
    teamAScore,
    teamBScore,
    matchesRemaining,
    sessionName,
    className,
}: StandingsCardProps) {
    const cardRef = useRef<HTMLDivElement>(null);

    const handleShare = async () => {
        const leader = teamAScore > teamBScore ? 'USA' : teamBScore > teamAScore ? 'Europe' : 'Tied';
        const margin = Math.abs(teamAScore - teamBScore);

        let text = `🏆 ${tripName} Standings\n\n`;
        text += `🇺🇸 USA: ${teamAScore}\n`;
        text += `🇪🇺 EUR: ${teamBScore}\n\n`;

        if (leader !== 'Tied') {
            text += `${leader} leads by ${margin} point${margin !== 1 ? 's' : ''}\n`;
        } else {
            text += `All square!\n`;
        }

        if (matchesRemaining > 0) {
            text += `${matchesRemaining} match${matchesRemaining !== 1 ? 'es' : ''} remaining`;
        }

        if (navigator.share) {
            await navigator.share({ title: `${tripName} Standings`, text });
        } else {
            await navigator.clipboard.writeText(text);
        }
    };

    const getLeaderColor = () => {
        if (teamAScore > teamBScore) return 'from-[#1E3A5F] to-[#0D1F35]';
        if (teamBScore > teamAScore) return 'from-[#722F37] to-[#3D181C]';
        return 'from-[#006747] to-[#004D35]';
    };

    return (
        <div className={cn('space-y-4', className)}>
            <div
                ref={cardRef}
                className={cn(
                    'relative p-6 rounded-2xl overflow-hidden',
                    'bg-gradient-to-br',
                    getLeaderColor()
                )}
            >
                <div className="relative z-10">
                    <div className="text-white/60 text-sm mb-1">{sessionName || 'Current Standings'}</div>
                    <div className="text-white text-xl font-bold mb-6">{tripName}</div>

                    <div className="flex items-center justify-center gap-8">
                        <div className="text-center">
                            <div className="text-4xl mb-2">🇺🇸</div>
                            <div className="text-white text-5xl font-bold">{teamAScore}</div>
                            <div className="text-white/60 text-sm mt-1">USA</div>
                        </div>

                        <div className="text-white/40 text-2xl">-</div>

                        <div className="text-center">
                            <div className="text-4xl mb-2">🇪🇺</div>
                            <div className="text-white text-5xl font-bold">{teamBScore}</div>
                            <div className="text-white/60 text-sm mt-1">EUR</div>
                        </div>
                    </div>

                    {matchesRemaining > 0 && (
                        <div className="mt-6 text-center text-white/60">
                            {matchesRemaining} match{matchesRemaining !== 1 ? 'es' : ''} remaining
                        </div>
                    )}

                    <div className="mt-4 text-center text-white/40 text-xs">
                        Golf Ryder Cup App
                    </div>
                </div>
            </div>

            <button
                onClick={handleShare}
                className={cn(
                    'w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg',
                    'bg-masters-primary text-white',
                    'hover:bg-masters-primary-dark',
                    'transition-colors'
                )}
            >
                <Share2 className="w-5 h-5" />
                <span>Share Standings</span>
            </button>
        </div>
    );
}

// ============================================
// BARREL EXPORT
// ============================================

export default MatchResultCard;
