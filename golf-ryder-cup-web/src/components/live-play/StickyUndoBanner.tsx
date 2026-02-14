/**
 * Sticky Undo Banner
 *
 * A premium, non-intrusive undo banner that appears after scoring.
 * Provides a 5-second window to undo the last action with clear visual
 * countdown and smooth animations.
 *
 * Features:
 * - Auto-dismisses after countdown (configurable duration)
 * - Shows what was recorded (hole, result)
 * - Visual countdown progress bar
 * - Haptic feedback on undo
 * - Swipe to dismiss
 * - Respects reduced motion preferences
 * - Accessible with proper ARIA labels
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { Undo2, X, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useHaptic } from '@/lib/hooks/useHaptic';
import { scoringLogger } from '@/lib/utils/logger';

// ============================================
// TYPES
// ============================================

export interface UndoAction {
    id: string;
    type: 'score' | 'bet' | 'photo' | 'general';
    description: string;
    metadata?: {
        holeNumber?: number;
        result?: 'teamA' | 'teamB' | 'halved';
        teamAName?: string;
        teamBName?: string;
        teamAScore?: number;
        teamBScore?: number;
    };
    timestamp: number;
    onUndo: () => void | Promise<void>;
}

interface StickyUndoBannerProps {
    /** The action that can be undone */
    action: UndoAction | null;
    /** Duration in ms before auto-dismiss (default: 5000) */
    duration?: number;
    /** Position from bottom (accounts for bottom nav) */
    bottomOffset?: number;
    /** Callback when banner is dismissed (not undone) */
    onDismiss?: () => void;
    /** Custom styling class */
    className?: string;
}

// ============================================
// COMPONENT
// ============================================

export function StickyUndoBanner({
    action,
    duration = 5000,
    bottomOffset = 80,
    onDismiss,
    className,
}: StickyUndoBannerProps) {
    const { trigger } = useHaptic();
    const [isUndoing, setIsUndoing] = useState(false);
    const [progress, setProgress] = useState(100);

    // Swipe to dismiss
    const x = useMotionValue(0);
    const opacity = useTransform(x, [-100, 0, 100], [0, 1, 0]);

    // Countdown timer
    useEffect(() => {
        if (!action) {
            setProgress(100);
            return;
        }

        const startTime = Date.now();
        const endTime = startTime + duration;

        const updateProgress = () => {
            const now = Date.now();
            const remaining = Math.max(0, endTime - now);
            const newProgress = (remaining / duration) * 100;
            setProgress(newProgress);

            if (remaining > 0) {
                requestAnimationFrame(updateProgress);
            }
        };

        const animationFrame = requestAnimationFrame(updateProgress);

        // Auto-dismiss timer
        const dismissTimer = setTimeout(() => {
            onDismiss?.();
        }, duration);

        return () => {
            cancelAnimationFrame(animationFrame);
            clearTimeout(dismissTimer);
        };
    }, [action, duration, onDismiss]);

    // Handle undo action
    const handleUndo = useCallback(async () => {
        if (!action || isUndoing) return;

        setIsUndoing(true);
        trigger('success');

        try {
            await action.onUndo();
        } catch (error) {
            scoringLogger.error('Undo failed:', error);
            trigger('error');
        } finally {
            setIsUndoing(false);
            onDismiss?.();
        }
    }, [action, isUndoing, onDismiss, trigger]);

    // Handle manual dismiss
    const handleDismiss = useCallback(() => {
        trigger('light');
        onDismiss?.();
    }, [onDismiss, trigger]);

    // Handle swipe dismiss
    const handleDragEnd = useCallback(
        (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
            if (Math.abs(info.offset.x) > 100 || Math.abs(info.velocity.x) > 500) {
                handleDismiss();
            }
        },
        [handleDismiss]
    );

    // Format the result display
    const formatResult = (metadata?: UndoAction['metadata']) => {
        if (!metadata) return '';

        const { holeNumber, result, teamAName = 'Team A', teamBName = 'Team B' } = metadata;
        const holeText = holeNumber ? `Hole ${holeNumber}: ` : '';

        switch (result) {
            case 'teamA':
                return `${holeText}${teamAName} wins`;
            case 'teamB':
                return `${holeText}${teamBName} wins`;
            case 'halved':
                return `${holeText}Halved`;
            default:
                return holeText;
        }
    };

    // Get result color
    const getResultColor = (result?: string) => {
        switch (result) {
            case 'teamA':
                return 'var(--team-usa, #B91C1C)';
            case 'teamB':
                return 'var(--team-europe, #1E40AF)';
            case 'halved':
                return 'var(--ink-secondary, #A09080)';
            default:
                return 'var(--masters, #006747)';
        }
    };

    if (!action) return null;

    const resultColor = getResultColor(action.metadata?.result);

    return (
        <AnimatePresence mode="wait">
            <motion.div
                key={action.id}
                initial={{ opacity: 0, y: 50, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.95 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                style={{ x, opacity, bottom: `${bottomOffset}px` }}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.2}
                onDragEnd={handleDragEnd}
                className={cn(
                    'fixed left-4 right-4 z-50',
                    'max-w-md mx-auto',
                    'lg:left-auto lg:right-6 lg:mx-0',
                    className,
                )}
                role="alert"
                aria-live="polite"
            >
                <div
                    className={cn(
                        'relative overflow-hidden',
                        'flex items-center gap-3',
                        'px-4 py-3 rounded-2xl',
                        'border border-[color:var(--rule)]/40',
                        'bg-[var(--surface-elevated)] backdrop-blur-md',
                        'shadow-[var(--shadow-card-lg)] text-[var(--ink)]',
                    )}
                >
                    {/* Progress bar (countdown) */}
                    <motion.div
                        className="absolute bottom-0 left-0 h-1 rounded-full"
                        style={{
                            background: resultColor,
                            width: `${progress}%`,
                        }}
                        transition={{ duration: 0.1 }}
                    />

                    {/* Result indicator */}
                    <div
                        className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center"
                        style={{
                            background: `color-mix(in srgb, ${resultColor} 18%, transparent)`,
                        }}
                    >
                        <Check
                            className="w-5 h-5"
                            style={{ color: resultColor }}
                        />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[var(--ink)] truncate">
                            {action.description || 'Score recorded'}
                        </p>
                        {action.metadata && (
                            <p className="text-xs text-[var(--ink-tertiary)] truncate">
                                {formatResult(action.metadata)}
                            </p>
                        )}
                    </div>

                    {/* Undo button */}
                    <motion.button
                        onClick={handleUndo}
                        disabled={isUndoing}
                        whileTap={{ scale: 0.9 }}
                        className={cn(
                            'flex items-center gap-1.5 px-3 py-1.5 rounded-full',
                            'text-sm font-medium text-[var(--ink)]',
                            'transition-colors duration-150',
                            'bg-[var(--surface-secondary)] hover:bg-[color:var(--surface-secondary)]/80',
                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus-ring)]',
                            'focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--surface-elevated)]',
                            isUndoing && 'opacity-50 cursor-not-allowed',
                        )}
                        aria-label="Undo last action"
                    >
                        <Undo2 className={cn('w-4 h-4 text-[var(--ink-secondary)]', isUndoing && 'animate-spin')} />
                        <span>Undo</span>
                    </motion.button>

                    {/* Dismiss button */}
                    <button
                        onClick={handleDismiss}
                        className={cn(
                            'p-1.5 rounded-full text-[var(--ink-tertiary)]',
                            'transition-colors duration-150',
                            'hover:text-[var(--ink-secondary)] hover:bg-[color:var(--surface)]/60',
                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus-ring)]',
                            'focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--surface-elevated)]',
                        )}
                        aria-label="Dismiss"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Swipe hint (shows briefly) */}
                <motion.p
                    initial={{ opacity: 0.8 }}
                    animate={{ opacity: 0 }}
                    transition={{ duration: 2, delay: 1 }}
                    className="text-[10px] text-center text-[var(--ink-tertiary)] opacity-60 mt-1"
                >
                    Swipe to dismiss
                </motion.p>
            </motion.div>
        </AnimatePresence>
    );
}

// ============================================
// HOOK FOR MANAGING UNDO STATE
// ============================================

export interface UseUndoBannerOptions {
    duration?: number;
}

export function useUndoBanner(options: UseUndoBannerOptions = {}) {
    const [currentAction, setCurrentAction] = useState<UndoAction | null>(null);

    const showUndo = useCallback((action: Omit<UndoAction, 'id' | 'timestamp'>) => {
        setCurrentAction({
            ...action,
            id: crypto.randomUUID(),
            timestamp: Date.now(),
        });
    }, []);

    const hideUndo = useCallback(() => {
        setCurrentAction(null);
    }, []);

    return {
        currentAction,
        showUndo,
        hideUndo,
        UndoBanner: (
            <StickyUndoBanner
                action={currentAction}
                duration={options.duration}
                onDismiss={hideUndo}
            />
        ),
    };
}

export default StickyUndoBanner;
