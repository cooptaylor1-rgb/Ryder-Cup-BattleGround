'use client';

/**
 * Share Button Component
 *
 * Universal share button that generates and shares visual cards.
 * Supports standings, sessions, awards, and leaderboards.
 */

import { useState } from 'react';
import { Share2, Download, Copy, Check, Loader2 } from 'lucide-react';
import {
    shareStandings,
    shareSession,
    shareAward,
    shareLeaderboard,
    generateStandingsCard,
    generateSessionCard,
    generateAwardCard,
    generateLeaderboardCard,
    copyCardToClipboard,
    downloadBlob,
} from '@/lib/services/shareCardService';
import { shareLogger } from '@/lib/utils/logger';
import type { TeamStandings, PlayerLeaderboard } from '@/lib/types/computed';
import type { Award } from '@/lib/types/awards';
import type { RyderCupSession, Match } from '@/lib/types/models';
import { Button } from './Button';

// ============================================
// TYPES
// ============================================

interface BaseShareButtonProps {
    tripName: string;
    variant?: 'primary' | 'secondary' | 'ghost' | 'outline';
    size?: 'sm' | 'md' | 'lg';
    showLabel?: boolean;
    className?: string;
}

interface StandingsShareProps extends BaseShareButtonProps {
    type: 'standings';
    standings: TeamStandings;
    teamAName: string;
    teamBName: string;
}

interface SessionShareProps extends BaseShareButtonProps {
    type: 'session';
    session: RyderCupSession;
    matches: Match[];
    teamAName: string;
    teamBName: string;
    teamAPoints: number;
    teamBPoints: number;
}

interface AwardShareProps extends BaseShareButtonProps {
    type: 'award';
    award: Award;
}

interface LeaderboardShareProps extends BaseShareButtonProps {
    type: 'leaderboard';
    players: PlayerLeaderboard[];
    limit?: number;
}

export type ShareButtonProps =
    | StandingsShareProps
    | SessionShareProps
    | AwardShareProps
    | LeaderboardShareProps;

// ============================================
// COMPONENT
// ============================================

export function ShareButton(props: ShareButtonProps) {
    const {
        tripName,
        variant = 'outline',
        size = 'sm',
        showLabel = true,
        className = '',
    } = props;

    const [isSharing, setIsSharing] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const [copied, setCopied] = useState(false);

    const handleShare = async () => {
        setIsSharing(true);
        try {
            let success = false;

            switch (props.type) {
                case 'standings':
                    success = await shareStandings(
                        props.standings,
                        props.teamAName,
                        props.teamBName,
                        tripName
                    );
                    break;
                case 'session':
                    success = await shareSession(
                        props.session,
                        props.matches,
                        props.teamAName,
                        props.teamBName,
                        props.teamAPoints,
                        props.teamBPoints,
                        tripName
                    );
                    break;
                case 'award':
                    success = await shareAward(props.award, tripName);
                    break;
                case 'leaderboard':
                    success = await shareLeaderboard(props.players, tripName, props.limit);
                    break;
            }

            if (success) {
                setShowMenu(false);
            }
        } catch (error) {
            shareLogger.error('Share failed:', error);
        } finally {
            setIsSharing(false);
        }
    };

    const handleCopy = async () => {
        setIsSharing(true);
        try {
            let blob: Blob;

            switch (props.type) {
                case 'standings':
                    blob = await generateStandingsCard(
                        { standings: props.standings, teamAName: props.teamAName, teamBName: props.teamBName },
                        { tripName }
                    );
                    break;
                case 'session':
                    blob = await generateSessionCard(
                        {
                            session: props.session,
                            matches: props.matches,
                            teamAName: props.teamAName,
                            teamBName: props.teamBName,
                            teamAPoints: props.teamAPoints,
                            teamBPoints: props.teamBPoints,
                        },
                        { tripName }
                    );
                    break;
                case 'award':
                    blob = await generateAwardCard({ award: props.award }, { tripName });
                    break;
                case 'leaderboard':
                    blob = await generateLeaderboardCard(
                        { players: props.players, limit: props.limit },
                        { tripName }
                    );
                    break;
            }

            const success = await copyCardToClipboard(blob);
            if (success) {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            }
        } catch (error) {
            shareLogger.error('Copy failed:', error);
        } finally {
            setIsSharing(false);
        }
    };

    const handleDownload = async () => {
        setIsSharing(true);
        try {
            let blob: Blob;
            let filename: string;

            switch (props.type) {
                case 'standings':
                    blob = await generateStandingsCard(
                        { standings: props.standings, teamAName: props.teamAName, teamBName: props.teamBName },
                        { tripName }
                    );
                    filename = `${tripName.replace(/\s+/g, '-')}-standings.png`;
                    break;
                case 'session':
                    blob = await generateSessionCard(
                        {
                            session: props.session,
                            matches: props.matches,
                            teamAName: props.teamAName,
                            teamBName: props.teamBName,
                            teamAPoints: props.teamAPoints,
                            teamBPoints: props.teamBPoints,
                        },
                        { tripName }
                    );
                    filename = `${tripName.replace(/\s+/g, '-')}-${props.session.name.replace(/\s+/g, '-')}.png`;
                    break;
                case 'award':
                    blob = await generateAwardCard({ award: props.award }, { tripName });
                    filename = `${tripName.replace(/\s+/g, '-')}-${props.award.type}.png`;
                    break;
                case 'leaderboard':
                    blob = await generateLeaderboardCard(
                        { players: props.players, limit: props.limit },
                        { tripName }
                    );
                    filename = `${tripName.replace(/\s+/g, '-')}-leaderboard.png`;
                    break;
            }

            downloadBlob(blob, filename);
            setShowMenu(false);
        } catch (error) {
            shareLogger.error('Download failed:', error);
        } finally {
            setIsSharing(false);
        }
    };

    // Check if Web Share API with files is supported
    const canShare = typeof navigator !== 'undefined' &&
        'share' in navigator &&
        'canShare' in navigator;

    return (
        <div className="relative">
            <Button
                variant={variant}
                size={size}
                onClick={() => canShare ? handleShare() : setShowMenu(!showMenu)}
                disabled={isSharing}
                className={className}
            >
                {isSharing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                    <Share2 className="w-4 h-4" />
                )}
                {showLabel && <span className="ml-2">Share</span>}
            </Button>

            {/* Fallback menu for browsers without Web Share API */}
            {showMenu && !canShare && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setShowMenu(false)}
                    />

                    {/* Menu */}
                    <div
                        className={
                            'absolute right-0 top-full mt-2 z-50 w-48 py-2 rounded-xl shadow-xl ' +
                            'bg-[var(--surface-raised)] border border-[var(--rule)] '
                        }
                    >
                        <button
                            onClick={handleDownload}
                            disabled={isSharing}
                            className={
                                'w-full px-4 py-2.5 flex items-center gap-3 text-left text-sm ' +
                                'text-[var(--ink-primary)] hover:bg-[var(--surface-secondary)] transition-colors ' +
                                'disabled:opacity-50'
                            }
                        >
                            <Download className="w-4 h-4 text-[var(--ink-tertiary)]" />
                            <span>Download Image</span>
                        </button>

                        <button
                            onClick={handleCopy}
                            disabled={isSharing}
                            className={
                                'w-full px-4 py-2.5 flex items-center gap-3 text-left text-sm ' +
                                'text-[var(--ink-primary)] hover:bg-[var(--surface-secondary)] transition-colors ' +
                                'disabled:opacity-50'
                            }
                        >
                            {copied ? (
                                <>
                                    <Check className="w-4 h-4 text-[var(--success)]" />
                                    <span className="text-[var(--success)]">Copied!</span>
                                </>
                            ) : (
                                <>
                                    <Copy className="w-4 h-4 text-[var(--ink-tertiary)]" />
                                    <span>Copy to Clipboard</span>
                                </>
                            )}
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}

export default ShareButton;
