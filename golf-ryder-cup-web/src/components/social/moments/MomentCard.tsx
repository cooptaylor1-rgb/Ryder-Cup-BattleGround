/**
 * MomentCard Component — Phase 3: Social & Engagement
 *
 * Rich social card for trip moments:
 * - Photo with context overlay
 * - Player tags
 * - Reaction bar
 * - Comment preview
 * - Share action
 * - Timeline integration
 *
 * The core unit of the social feed.
 */

'use client';

import { useState } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import {
    MessageCircle,
    Share2,
    Flag,
    Trophy,
    Clock,
    ChevronRight,
    Bookmark,
    BookmarkCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useHaptic } from '@/lib/hooks';

// ============================================
// TYPES
// ============================================

export interface MomentPlayer {
    id: string;
    name: string;
    avatarUrl?: string;
    team?: 'teamA' | 'teamB';
}

export interface MomentReaction {
    emoji: string;
    count: number;
    hasReacted: boolean;
}

export interface MomentComment {
    id: string;
    userId: string;
    userName: string;
    userAvatar?: string;
    text: string;
    timestamp: string;
}

export interface Moment {
    id: string;
    type: 'photo' | 'achievement' | 'match_result' | 'highlight';
    imageUrl?: string;
    title: string;
    description?: string;
    timestamp: string;
    author: MomentPlayer;
    taggedPlayers?: MomentPlayer[];
    holeNumber?: number;
    matchNumber?: number;
    reactions: Record<string, MomentReaction>;
    commentCount: number;
    comments?: MomentComment[];
    isSaved?: boolean;
}

interface MomentCardProps {
    moment: Moment;
    teamAColor?: string;
    teamBColor?: string;
    teamAName?: string;
    teamBName?: string;
    onReact?: (momentId: string, emoji: string) => void;
    onComment?: (momentId: string) => void;
    onShare?: (momentId: string) => void;
    onSave?: (momentId: string) => void;
    onViewComments?: (momentId: string) => void;
    onViewFullImage?: (imageUrl: string) => void;
    className?: string;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function formatTimeAgo(isoString: string): string {
    const now = new Date();
    const then = new Date(isoString);
    const diffMs = now.getTime() - then.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d`;
    return then.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const QUICK_REACTIONS = ['❤️', '🔥', '👏', '⛳', '😂'];

// ============================================
// REACTION BAR
// ============================================

interface ReactionBarProps {
    reactions: Record<string, MomentReaction>;
    onReact: (emoji: string) => void;
}

function ReactionBar({ reactions, onReact }: ReactionBarProps) {
    const haptic = useHaptic();
    const [showPicker, setShowPicker] = useState(false);

    const activeReactions = Object.entries(reactions)
        .filter(([, r]) => r.count > 0)
        .sort((a, b) => b[1].count - a[1].count);

    const handleReact = (emoji: string) => {
        haptic.press();
        onReact(emoji);
        setShowPicker(false);
    };

    return (
        <div className="flex items-center gap-1.5 flex-wrap">
            {/* Active Reactions */}
            {activeReactions.map(([emoji, data]) => (
                <motion.button
                    key={emoji}
                    onClick={() => handleReact(emoji)}
                    whileTap={{ scale: 0.9 }}
                    className={cn(
                        'flex items-center gap-1 px-2 py-1 rounded-full text-sm transition-all',
                        data.hasReacted
                            ? 'bg-blue-100 dark:bg-blue-900/30'
                            : 'bg-gray-100 dark:bg-gray-800'
                    )}
                >
                    <span>{emoji}</span>
                    <span
                        className="font-medium"
                        style={{ color: data.hasReacted ? '#3B82F6' : 'var(--ink-secondary)' }}
                    >
                        {data.count}
                    </span>
                </motion.button>
            ))}

            {/* Add Reaction Button */}
            <div className="relative">
                <button
                    onClick={() => setShowPicker(!showPicker)}
                    className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
                    style={{ background: 'var(--rule)' }}
                >
                    <span className="text-lg">+</span>
                </button>

                <AnimatePresence>
                    {showPicker && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: -10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: -10 }}
                            className="absolute bottom-full left-0 mb-2 p-2 rounded-xl shadow-lg flex gap-1"
                            style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}
                        >
                            {QUICK_REACTIONS.map((emoji) => (
                                <button
                                    key={emoji}
                                    onClick={() => handleReact(emoji)}
                                    className="text-xl p-1 hover:scale-125 transition-transform"
                                >
                                    {emoji}
                                </button>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}

// ============================================
// MAIN MOMENT CARD
// ============================================

export function MomentCard({
    moment,
    teamAColor = '#0047AB',
    teamBColor = '#8B0000',
    teamAName: _teamAName = 'USA',
    teamBName: _teamBName = 'Europe',
    onReact,
    onComment,
    onShare,
    onSave,
    onViewComments,
    onViewFullImage,
    className,
}: MomentCardProps) {
    const haptic = useHaptic();
    const [isImageLoaded, setIsImageLoaded] = useState(false);

    const authorTeamColor = moment.author.team === 'teamA' ? teamAColor : teamBColor;

    const handleReact = (emoji: string) => {
        onReact?.(moment.id, emoji);
    };

    const handleComment = () => {
        haptic.tap();
        onComment?.(moment.id);
    };

    const handleShare = () => {
        haptic.tap();
        onShare?.(moment.id);
    };

    const handleSave = () => {
        haptic.press();
        onSave?.(moment.id);
    };

    const handleImageClick = () => {
        if (moment.imageUrl) {
            haptic.tap();
            onViewFullImage?.(moment.imageUrl);
        }
    };

    // Preview comment
    const previewComment = moment.comments?.[0];

    return (
        <motion.article
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn('rounded-2xl overflow-hidden', className)}
            style={{ background: 'var(--surface)' }}
        >
            {/* Header */}
            <div className="flex items-center gap-3 p-4">
                {/* Author Avatar */}
                <div className="relative">
                    {moment.author.avatarUrl ? (
                        <Image
                            src={moment.author.avatarUrl}
                            alt="User avatar"
                            width={40}
                            height={40}
                            className="w-10 h-10 rounded-full object-cover"
                        />
                    ) : (
                        <div
                            className="w-10 h-10 rounded-full flex items-center justify-center text-[var(--canvas)] font-semibold"
                            style={{ background: authorTeamColor }}
                        >
                            {moment.author.name.charAt(0)}
                        </div>
                    )}
                    {/* Team indicator */}
                    <div
                        className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-[color:var(--canvas)]/90"
                        style={{ background: authorTeamColor }}
                    />
                </div>

                {/* Author Info */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="font-semibold truncate" style={{ color: 'var(--ink)' }}>
                            {moment.author.name}
                        </span>
                        {moment.type === 'achievement' && (
                            <Trophy size={14} style={{ color: '#F59E0B' }} />
                        )}
                    </div>
                    <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--ink-tertiary)' }}>
                        <Clock size={10} />
                        {formatTimeAgo(moment.timestamp)}
                        {moment.holeNumber && (
                            <>
                                <span>•</span>
                                <Flag size={10} />
                                Hole {moment.holeNumber}
                            </>
                        )}
                        {moment.matchNumber && (
                            <>
                                <span>•</span>
                                Match {moment.matchNumber}
                            </>
                        )}
                    </div>
                </div>

                {/* Actions */}
                <button
                    onClick={handleSave}
                    className="p-2 rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                    {moment.isSaved ? (
                        <BookmarkCheck size={18} style={{ color: 'var(--masters)' }} />
                    ) : (
                        <Bookmark size={18} style={{ color: 'var(--ink-tertiary)' }} />
                    )}
                </button>
            </div>

            {/* Image */}
            {moment.imageUrl && (
                <div
                    className="relative aspect-4/3 cursor-pointer overflow-hidden"
                    onClick={handleImageClick}
                >
                    {!isImageLoaded && (
                        <div className="absolute inset-0 bg-gray-200 dark:bg-gray-700 animate-pulse" />
                    )}
                    <motion.img
                        src={moment.imageUrl}
                        alt={moment.title}
                        className="w-full h-full object-cover"
                        onLoad={() => setIsImageLoaded(true)}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: isImageLoaded ? 1 : 0 }}
                    />

                    {/* Tagged Players Overlay */}
                    {moment.taggedPlayers && moment.taggedPlayers.length > 0 && (
                        <div className="absolute bottom-3 left-3 flex items-center gap-1">
                            <div className="flex -space-x-2">
                                {moment.taggedPlayers.slice(0, 3).map((player) => (
                                    <div
                                        key={player.id}
                                        className="w-6 h-6 rounded-full border-2 border-[color:var(--canvas)]/90 bg-gray-300 flex items-center justify-center text-[10px] font-bold relative overflow-hidden"
                                        style={{
                                            background: player.avatarUrl ? undefined :
                                                player.team === 'teamA' ? teamAColor : teamBColor,
                                        }}
                                    >
                                        {player.avatarUrl ? (
                                            <Image
                                                src={player.avatarUrl}
                                                alt="User avatar"
                                                fill
                                                className="rounded-full object-cover"
                                                sizes="24px"
                                            />
                                        ) : (
                                            <span className="text-[var(--canvas)]">{player.name.charAt(0)}</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                            <span className="text-xs text-[var(--canvas)] bg-[color:var(--ink)]/50 px-2 py-0.5 rounded-full">
                                {moment.taggedPlayers.length === 1
                                    ? moment.taggedPlayers[0].name.split(' ')[0]
                                    : `+${moment.taggedPlayers.length}`}
                            </span>
                        </div>
                    )}
                </div>
            )}

            {/* Content */}
            <div className="p-4 space-y-3">
                {/* Title */}
                <h3 className="font-semibold" style={{ color: 'var(--ink)' }}>
                    {moment.title}
                </h3>

                {/* Description */}
                {moment.description && (
                    <p className="text-sm" style={{ color: 'var(--ink-secondary)' }}>
                        {moment.description}
                    </p>
                )}

                {/* Reactions */}
                <ReactionBar reactions={moment.reactions} onReact={handleReact} />

                {/* Actions Row */}
                <div className="flex items-center justify-between pt-2 border-t" style={{ borderColor: 'var(--rule)' }}>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={handleComment}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
                        >
                            <MessageCircle size={16} style={{ color: 'var(--ink-secondary)' }} />
                            <span className="text-sm font-medium" style={{ color: 'var(--ink-secondary)' }}>
                                {moment.commentCount > 0 ? moment.commentCount : 'Comment'}
                            </span>
                        </button>

                        <button
                            onClick={handleShare}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
                        >
                            <Share2 size={16} style={{ color: 'var(--ink-secondary)' }} />
                            <span className="text-sm font-medium" style={{ color: 'var(--ink-secondary)' }}>
                                Share
                            </span>
                        </button>
                    </div>
                </div>

                {/* Comment Preview */}
                {previewComment && (
                    <button
                        onClick={() => onViewComments?.(moment.id)}
                        className="w-full text-left"
                    >
                        <div className="flex items-start gap-2 p-2 rounded-lg" style={{ background: 'var(--rule)' }}>
                            <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center text-[10px] font-bold shrink-0 relative overflow-hidden">
                                {previewComment.userAvatar ? (
                                    <Image
                                        src={previewComment.userAvatar}
                                        alt="User avatar"
                                        fill
                                        className="rounded-full object-cover"
                                        sizes="24px"
                                    />
                                ) : (
                                    previewComment.userName.charAt(0)
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm">
                                    <span className="font-semibold" style={{ color: 'var(--ink)' }}>
                                        {previewComment.userName.split(' ')[0]}
                                    </span>
                                    {' '}
                                    <span style={{ color: 'var(--ink-secondary)' }}>
                                        {previewComment.text}
                                    </span>
                                </p>
                            </div>
                        </div>
                        {moment.commentCount > 1 && (
                            <p className="text-xs mt-1 flex items-center gap-1" style={{ color: 'var(--ink-tertiary)' }}>
                                View all {moment.commentCount} comments
                                <ChevronRight size={12} />
                            </p>
                        )}
                    </button>
                )}
            </div>
        </motion.article>
    );
}

export default MomentCard;
