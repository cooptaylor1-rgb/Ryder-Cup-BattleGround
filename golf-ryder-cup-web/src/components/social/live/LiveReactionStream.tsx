/**
 * LiveReactionStream Component — Phase 3: Social & Engagement
 *
 * Real-time reaction feed showing live engagement:
 * - Floating reaction bubbles
 * - Score reaction bursts
 * - Banter notifications
 * - Achievement celebrations
 *
 * Creates a "stadium atmosphere" for live matches.
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Heart,
    Flame,
    ThumbsUp,
    MessageCircle,
    Trophy,
    Star,
    Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useHaptic } from '@/lib/hooks';

// ============================================
// TYPES
// ============================================

export type LiveReactionType =
    | 'heart'
    | 'fire'
    | 'clap'
    | 'laugh'
    | 'wow'
    | 'birdie'
    | 'eagle'
    | 'ace'
    | 'trash_talk';

export interface LiveReaction {
    id: string;
    type: LiveReactionType;
    playerId?: string;
    playerName?: string;
    team?: 'usa' | 'europe';
    message?: string;
    timestamp: number;
}

interface LiveReactionStreamProps {
    reactions: LiveReaction[];
    onReact?: (type: LiveReactionType) => void;
    position?: 'left' | 'right' | 'center';
    maxVisible?: number;
}

// ============================================
// REACTION CONFIG
// ============================================

const REACTION_CONFIG: Record<LiveReactionType, {
    emoji: string;
    color: string;
    label: string;
    size?: 'sm' | 'md' | 'lg';
}> = {
    heart: { emoji: '❤️', color: '#EF4444', label: 'Heart' },
    fire: { emoji: '🔥', color: '#F97316', label: 'Fire' },
    clap: { emoji: '👏', color: '#22C55E', label: 'Clap' },
    laugh: { emoji: '😂', color: '#FBBF24', label: 'Laugh' },
    wow: { emoji: '😮', color: '#8B5CF6', label: 'Wow' },
    birdie: { emoji: '🐦', color: '#22C55E', label: 'Birdie!', size: 'lg' },
    eagle: { emoji: '🦅', color: '#3B82F6', label: 'Eagle!', size: 'lg' },
    ace: { emoji: '🎯', color: '#FFD700', label: 'ACE!', size: 'lg' },
    trash_talk: { emoji: '🗣️', color: '#6B7280', label: 'Talk' },
};

const TEAM_COLORS = {
    usa: '#0047AB',
    europe: '#8B0000',
};

// ============================================
// FLOATING REACTION
// ============================================

interface FloatingReactionProps {
    reaction: LiveReaction;
    onComplete: () => void;
    position: 'left' | 'right' | 'center';
}

function FloatingReaction({ reaction, onComplete, position }: FloatingReactionProps) {
    const config = REACTION_CONFIG[reaction.type];

    // Random horizontal offset
    const xOffset = position === 'center'
        ? (Math.random() - 0.5) * 100
        : position === 'left'
            ? Math.random() * 50
            : -Math.random() * 50;

    // Size based on config
    const size = config.size === 'lg' ? 48 : config.size === 'md' ? 36 : 28;

    return (
        <motion.div
            initial={{ opacity: 0, y: 0, scale: 0, x: xOffset }}
            animate={{
                opacity: [0, 1, 1, 0],
                y: -200 - Math.random() * 100,
                scale: [0, 1.2, 1, 0.8],
                x: xOffset + (Math.random() - 0.5) * 40,
            }}
            transition={{ duration: 2.5, ease: 'easeOut' }}
            onAnimationComplete={onComplete}
            className="absolute pointer-events-none flex flex-col items-center"
            style={{
                [position]: position === 'center' ? '50%' : 20,
                bottom: 60,
                transform: position === 'center' ? 'translateX(-50%)' : undefined,
            }}
        >
            {/* Emoji */}
            <span style={{ fontSize: size }}>{config.emoji}</span>

            {/* Player name for score reactions */}
            {reaction.playerName && (reaction.type === 'birdie' || reaction.type === 'eagle' || reaction.type === 'ace') && (
                <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-xs font-bold whitespace-nowrap px-2 py-0.5 rounded-full text-white mt-1"
                    style={{
                        background: reaction.team ? TEAM_COLORS[reaction.team] : 'var(--masters)',
                    }}
                >
                    {reaction.playerName}
                </motion.span>
            )}
        </motion.div>
    );
}

// ============================================
// REACTION BURST (for big moments)
// ============================================

interface ReactionBurstProps {
    type: LiveReactionType;
    count: number;
}

function ReactionBurst({ type, count }: ReactionBurstProps) {
    const config = REACTION_CONFIG[type];
    const bursts = Array.from({ length: Math.min(count, 8) }, (_, i) => i);

    return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {bursts.map((i) => (
                <motion.span
                    key={i}
                    initial={{
                        opacity: 1,
                        scale: 0,
                        x: '50%',
                        y: '50%',
                    }}
                    animate={{
                        opacity: 0,
                        scale: 2,
                        x: `${50 + (Math.random() - 0.5) * 100}%`,
                        y: `${50 + (Math.random() - 0.5) * 100}%`,
                    }}
                    transition={{
                        duration: 1,
                        delay: i * 0.05,
                        ease: 'easeOut',
                    }}
                    className="absolute text-4xl"
                >
                    {config.emoji}
                </motion.span>
            ))}
        </div>
    );
}

// ============================================
// TRASH TALK NOTIFICATION
// ============================================

interface TrashTalkNotificationProps {
    reaction: LiveReaction;
    onDismiss: () => void;
}

function TrashTalkNotification({ reaction, onDismiss }: TrashTalkNotificationProps) {
    useEffect(() => {
        const timer = setTimeout(onDismiss, 4000);
        return () => clearTimeout(timer);
    }, [onDismiss]);

    return (
        <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 50 }}
            className="flex items-start gap-2 p-3 rounded-xl max-w-xs"
            style={{
                background: 'var(--surface)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                border: '1px solid var(--rule)',
            }}
        >
            {/* Team indicator */}
            <div
                className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm"
                style={{
                    background: reaction.team ? `${TEAM_COLORS[reaction.team]}20` : 'var(--rule)',
                    color: reaction.team ? TEAM_COLORS[reaction.team] : 'var(--ink)',
                }}
            >
                🗣️
            </div>

            <div className="flex-1 min-w-0">
                <span
                    className="text-xs font-semibold"
                    style={{ color: reaction.team ? TEAM_COLORS[reaction.team] : 'var(--ink)' }}
                >
                    {reaction.playerName || 'Anonymous'}
                </span>
                <p className="text-sm" style={{ color: 'var(--ink)' }}>
                    {reaction.message}
                </p>
            </div>
        </motion.div>
    );
}

// ============================================
// QUICK REACT BAR
// ============================================

interface QuickReactBarProps {
    onReact: (type: LiveReactionType) => void;
}

const QUICK_REACTIONS: LiveReactionType[] = ['heart', 'fire', 'clap', 'laugh', 'wow'];

function QuickReactBar({ onReact }: QuickReactBarProps) {
    const haptic = useHaptic();

    const handleReact = (type: LiveReactionType) => {
        haptic.tap();
        onReact(type);
    };

    return (
        <div className="flex items-center gap-1 p-1.5 rounded-full" style={{ background: 'var(--surface)', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
            {QUICK_REACTIONS.map((type) => (
                <motion.button
                    key={type}
                    whileTap={{ scale: 1.3 }}
                    onClick={() => handleReact(type)}
                    className="w-10 h-10 rounded-full flex items-center justify-center text-xl active:bg-black/5"
                >
                    {REACTION_CONFIG[type].emoji}
                </motion.button>
            ))}
        </div>
    );
}

// ============================================
// MAIN COMPONENT
// ============================================

export function LiveReactionStream({
    reactions,
    onReact,
    position = 'right',
    maxVisible = 10,
}: LiveReactionStreamProps) {
    const [visibleReactions, setVisibleReactions] = useState<LiveReaction[]>([]);
    const [trashTalks, setTrashTalks] = useState<LiveReaction[]>([]);
    const processedIds = useRef<Set<string>>(new Set());

    // Process incoming reactions
    useEffect(() => {
        reactions.forEach((reaction) => {
            if (processedIds.current.has(reaction.id)) return;
            processedIds.current.add(reaction.id);

            if (reaction.type === 'trash_talk') {
                setTrashTalks((prev) => [...prev.slice(-4), reaction]);
            } else {
                setVisibleReactions((prev) => [...prev.slice(-(maxVisible - 1)), reaction]);
            }
        });
    }, [reactions, maxVisible]);

    // Remove completed reaction
    const removeReaction = useCallback((id: string) => {
        setVisibleReactions((prev) => prev.filter((r) => r.id !== id));
    }, []);

    // Remove trash talk
    const removeTrashTalk = useCallback((id: string) => {
        setTrashTalks((prev) => prev.filter((r) => r.id !== id));
    }, []);

    return (
        <div className="fixed inset-0 pointer-events-none z-40">
            {/* Floating Reactions */}
            <AnimatePresence>
                {visibleReactions.map((reaction) => (
                    <FloatingReaction
                        key={reaction.id}
                        reaction={reaction}
                        position={position}
                        onComplete={() => removeReaction(reaction.id)}
                    />
                ))}
            </AnimatePresence>

            {/* Trash Talk Notifications */}
            <div className="absolute top-4 left-4 space-y-2 pointer-events-auto">
                <AnimatePresence>
                    {trashTalks.map((reaction) => (
                        <TrashTalkNotification
                            key={reaction.id}
                            reaction={reaction}
                            onDismiss={() => removeTrashTalk(reaction.id)}
                        />
                    ))}
                </AnimatePresence>
            </div>

            {/* Quick React Bar */}
            {onReact && (
                <div className="absolute bottom-20 left-1/2 -translate-x-1/2 pointer-events-auto">
                    <QuickReactBar onReact={onReact} />
                </div>
            )}
        </div>
    );
}

// ============================================
// SCORE CELEBRATION OVERLAY
// ============================================

interface ScoreCelebrationProps {
    type: 'birdie' | 'eagle' | 'ace';
    playerName: string;
    team?: 'usa' | 'europe';
    holeNumber: number;
    onComplete: () => void;
}

export function ScoreCelebration({
    type,
    playerName,
    team,
    holeNumber,
    onComplete,
}: ScoreCelebrationProps) {
    const haptic = useHaptic();
    const config = REACTION_CONFIG[type];

    useEffect(() => {
        haptic.impact();
        const timer = setTimeout(onComplete, 3000);
        return () => clearTimeout(timer);
    }, [haptic, onComplete]);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
            style={{ background: 'rgba(0, 0, 0, 0.6)' }}
        >
            {/* Burst effect */}
            <ReactionBurst type={type} count={8} />

            {/* Center content */}
            <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', damping: 10 }}
                className="text-center"
            >
                <span className="text-8xl block">{config.emoji}</span>

                <motion.h2
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="text-4xl font-bold text-white mt-4"
                >
                    {config.label}
                </motion.h2>

                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="text-white/80 mt-2"
                >
                    <span
                        className="font-semibold"
                        style={{ color: team ? TEAM_COLORS[team] : 'white' }}
                    >
                        {playerName}
                    </span>
                    {' '}on Hole {holeNumber}
                </motion.p>
            </motion.div>

            {/* Click to dismiss */}
            <div className="absolute inset-0 pointer-events-auto" onClick={onComplete} />
        </motion.div>
    );
}

export default LiveReactionStream;
