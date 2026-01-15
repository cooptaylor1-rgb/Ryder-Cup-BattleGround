/**
 * Trash Talk Feed Component
 *
 * Real-time comments and reactions for match banter.
 * Supports text messages, emojis, and match result announcements.
 */

'use client';

import { useState, useRef, useEffect } from 'react';
import { isSupabaseConfigured, insertRecord } from '@/lib/supabase';
import { cn, formatPlayerName } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { Send, Smile, Trophy, MessageCircle, Loader2 } from 'lucide-react';
import type { Player } from '@/lib/types/models';

interface Comment {
    id: string;
    tripId: string;
    matchId?: string;
    playerId: string;
    content: string;
    emoji?: string;
    createdAt: string;
}

interface TrashTalkFeedProps {
    tripId: string;
    matchId?: string;
    comments: Comment[];
    players: Map<string, Player>;
    currentPlayerId?: string;
    onCommentSubmit?: (comment: Omit<Comment, 'id' | 'createdAt'>) => void;
    className?: string;
}

const QUICK_EMOJIS = ['🔥', '💪', '👏', '😂', '🏌️', '⛳', '🎯', '💀'];

export function TrashTalkFeed({
    tripId,
    matchId,
    comments,
    players,
    currentPlayerId,
    onCommentSubmit,
    className,
}: TrashTalkFeedProps) {
    const [message, setMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showEmojis, setShowEmojis] = useState(false);
    const feedRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Auto-scroll to bottom on new messages
    useEffect(() => {
        if (feedRef.current) {
            feedRef.current.scrollTop = feedRef.current.scrollHeight;
        }
    }, [comments.length]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!message.trim() || !currentPlayerId) return;

        setIsSubmitting(true);

        try {
            const comment: Omit<Comment, 'id' | 'createdAt'> = {
                tripId,
                matchId,
                playerId: currentPlayerId,
                content: message.trim(),
            };

            if (isSupabaseConfigured) {
                await insertRecord('comments', {
                    trip_id: tripId,
                    match_id: matchId,
                    player_id: currentPlayerId,
                    content: message.trim(),
                });
            }

            onCommentSubmit?.(comment);
            setMessage('');
        } catch (error) {
            console.error('Failed to post comment:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEmojiClick = (emoji: string) => {
        setMessage((prev) => prev + emoji);
        setShowEmojis(false);
        inputRef.current?.focus();
    };

    const handleQuickReaction = async (emoji: string) => {
        if (!currentPlayerId) return;

        const comment: Omit<Comment, 'id' | 'createdAt'> = {
            tripId,
            matchId,
            playerId: currentPlayerId,
            content: emoji,
            emoji: emoji,
        };

        if (isSupabaseConfigured) {
            await insertRecord('comments', {
                trip_id: tripId,
                match_id: matchId,
                player_id: currentPlayerId,
                content: emoji,
                emoji: emoji,
            });
        }

        onCommentSubmit?.(comment);
    };

    const sortedComments = [...comments].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    return (
        <div className={cn('flex flex-col h-full', className)}>
            {/* Header */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-surface-200 dark:border-surface-700">
                <MessageCircle className="w-5 h-5 text-masters-primary" />
                <span className="font-medium">Trash Talk</span>
                <span className="text-sm text-surface-500">({comments.length})</span>
            </div>

            {/* Messages */}
            <div ref={feedRef} className="flex-1 overflow-y-auto p-4 space-y-4">
                {sortedComments.length === 0 ? (
                    <div className="text-center py-8">
                        <MessageCircle className="w-10 h-10 mx-auto mb-3 text-surface-400" />
                        <p className="text-surface-500">No comments yet</p>
                        <p className="text-sm text-surface-400 mt-1">
                            Start the banter!
                        </p>
                    </div>
                ) : (
                    sortedComments.map((comment) => {
                        const player = players.get(comment.playerId);
                        const isCurrentUser = comment.playerId === currentPlayerId;
                        const isEmojiOnly = comment.emoji && comment.content === comment.emoji;

                        return (
                            <div
                                key={comment.id}
                                className={cn(
                                    'flex gap-2',
                                    isCurrentUser && 'flex-row-reverse'
                                )}
                            >
                                {/* Avatar */}
                                <div
                                    className={cn(
                                        'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0',
                                        'bg-surface-200 dark:bg-surface-700 text-surface-600 dark:text-surface-300'
                                    )}
                                >
                                    {player?.firstName?.charAt(0) || '?'}
                                </div>

                                {/* Message */}
                                <div
                                    className={cn(
                                        'max-w-[75%]',
                                        isCurrentUser && 'text-right'
                                    )}
                                >
                                    <div className="text-xs text-surface-500 mb-1">
                                        {player
                                            ? formatPlayerName(player.firstName, player.lastName, 'short')
                                            : 'Unknown'}
                                        <span className="mx-1">·</span>
                                        {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                                    </div>
                                    <div
                                        className={cn(
                                            'inline-block rounded-2xl',
                                            isEmojiOnly
                                                ? 'text-4xl'
                                                : cn(
                                                    'px-4 py-2',
                                                    isCurrentUser
                                                        ? 'bg-masters-primary text-white'
                                                        : 'bg-surface-100 dark:bg-surface-800'
                                                )
                                        )}
                                    >
                                        {comment.content}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Quick reactions */}
            <div className="flex items-center gap-2 px-4 py-2 border-t border-surface-200 dark:border-surface-700">
                {QUICK_EMOJIS.map((emoji) => (
                    <button
                        key={emoji}
                        onClick={() => handleQuickReaction(emoji)}
                        className="text-xl hover:scale-125 transition-transform"
                        disabled={!currentPlayerId}
                    >
                        {emoji}
                    </button>
                ))}
            </div>

            {/* Input */}
            {currentPlayerId && (
                <form
                    onSubmit={handleSubmit}
                    className="flex items-center gap-2 p-4 border-t border-surface-200 dark:border-surface-700"
                >
                    <div className="relative">
                        <button
                            type="button"
                            onClick={() => setShowEmojis(!showEmojis)}
                            className="p-2 rounded-full hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
                        >
                            <Smile className="w-5 h-5 text-surface-400" />
                        </button>

                        {/* Emoji picker */}
                        {showEmojis && (
                            <div className="absolute bottom-full left-0 mb-2 p-2 bg-surface-card rounded-lg shadow-xl border border-surface-200 dark:border-surface-700 grid grid-cols-8 gap-1">
                                {['😀', '😂', '🤣', '😎', '🔥', '💪', '👏', '🙌',
                                    '🏌️', '⛳', '🎯', '🏆', '💀', '😱', '🤯', '👀',
                                    '💯', '🎉', '🍺', '☀️', '🌧️', '💨', '🐦', '🦅'].map((emoji) => (
                                    <button
                                        key={emoji}
                                        type="button"
                                        onClick={() => handleEmojiClick(emoji)}
                                        className="text-xl p-1 hover:bg-surface-100 dark:hover:bg-surface-800 rounded"
                                    >
                                        {emoji}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <input
                        ref={inputRef}
                        type="text"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Say something..."
                        className={cn(
                            'flex-1 px-4 py-2 rounded-full',
                            'bg-surface-100 dark:bg-surface-800',
                            'border border-surface-200 dark:border-surface-700',
                            'focus:outline-none focus:ring-2 focus:ring-masters-primary'
                        )}
                    />

                    <button
                        type="submit"
                        disabled={!message.trim() || isSubmitting}
                        className={cn(
                            'p-2 rounded-full',
                            'bg-masters-primary text-white',
                            'hover:bg-masters-primary-dark',
                            'disabled:opacity-50 disabled:cursor-not-allowed',
                            'transition-colors'
                        )}
                    >
                        {isSubmitting ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <Send className="w-5 h-5" />
                        )}
                    </button>
                </form>
            )}
        </div>
    );
}

/**
 * Match Result Announcement Card
 */
interface MatchResultAnnouncementProps {
    winnerTeam: 'usa' | 'europe' | 'halved';
    winnerNames: string[];
    loserNames: string[];
    score: string;
    matchNumber: number;
    className?: string;
}

export function MatchResultAnnouncement({
    winnerTeam,
    winnerNames,
    loserNames,
    score,
    matchNumber,
    className,
}: MatchResultAnnouncementProps) {
    return (
        <div
            className={cn(
                'p-4 rounded-xl border-2',
                winnerTeam === 'usa'
                    ? 'bg-team-usa/5 border-team-usa/30'
                    : winnerTeam === 'europe'
                    ? 'bg-team-europe/5 border-team-europe/30'
                    : 'bg-secondary-gold/5 border-secondary-gold/30',
                className
            )}
        >
            <div className="flex items-center gap-3 mb-2">
                <Trophy
                    className={cn(
                        'w-6 h-6',
                        winnerTeam === 'usa'
                            ? 'text-team-usa'
                            : winnerTeam === 'europe'
                            ? 'text-team-europe'
                            : 'text-secondary-gold'
                    )}
                />
                <span className="text-sm text-surface-500">Match {matchNumber} Complete</span>
            </div>

            <div className="text-lg font-bold">
                {winnerTeam === 'halved' ? (
                    <span className="text-secondary-gold">Match Halved!</span>
                ) : (
                    <span className={winnerTeam === 'usa' ? 'text-team-usa' : 'text-team-europe'}>
                        {winnerNames.join(' & ')} wins {score}!
                    </span>
                )}
            </div>

            {winnerTeam !== 'halved' && (
                <div className="text-sm text-surface-500 mt-1">
                    def. {loserNames.join(' & ')}
                </div>
            )}
        </div>
    );
}

export default TrashTalkFeed;
