'use client';

/**
 * Golf Superlatives
 *
 * Fun prompts for team bonding - "Most likely to..." style questions.
 * Creates memorable moments and helps players learn about each other.
 */

import { useState, useMemo, useId } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Trophy,
    Star,
    Sparkles,
    ChevronRight,
    ChevronLeft,
    MessageCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { makeSeededRng, seededShuffle } from '@/lib/utils/seededRandom';

// ============================================
// TYPES
// ============================================

export interface Superlative {
    id: string;
    prompt: string;
    emoji: string;
    category: 'game' | 'personality' | 'social' | 'funny';
}

export interface SuperlativeAnswer {
    superlativeId: string;
    answer: string;
}

interface GolfSuperlativesProps {
    onComplete: (answers: SuperlativeAnswer[]) => void;
    onSkip?: () => void;
    maxQuestions?: number;
    className?: string;
}

// ============================================
// SUPERLATIVE OPTIONS
// ============================================

const ALL_SUPERLATIVES: Superlative[] = [
    // Game-related
    { id: 'clutch', prompt: 'Most likely to drain a 30-footer to win the match', emoji: '🎯', category: 'game' },
    { id: 'bunker-artist', prompt: 'Best sand player on the trip', emoji: '🏖️', category: 'game' },
    { id: 'grip-rip', prompt: 'Most likely to grip it and rip it off the tee', emoji: '💥', category: 'game' },
    { id: 'plumb-bob', prompt: 'Takes the longest to read a putt', emoji: '⏱️', category: 'game' },
    { id: 'early-bird', prompt: 'First one ready at the first tee', emoji: '🌅', category: 'game' },
    { id: 'scratch-day', prompt: 'Most likely to shoot under handicap', emoji: '📉', category: 'game' },

    // Personality
    { id: 'calm', prompt: 'Calmest player under pressure', emoji: '🧘', category: 'personality' },
    { id: 'hype', prompt: 'Best at hyping up teammates', emoji: '🔥', category: 'personality' },
    { id: 'gracious', prompt: 'Most gracious after a loss', emoji: '🤝', category: 'personality' },
    { id: 'strategist', prompt: 'Best course management skills', emoji: '🧠', category: 'personality' },

    // Social
    { id: 'storyteller', prompt: 'Best golf stories at the 19th hole', emoji: '📖', category: 'social' },
    { id: 'snack-king', prompt: 'Always has the best snacks in their bag', emoji: '🍫', category: 'social' },
    { id: 'music', prompt: 'Best playlist for the golf cart', emoji: '🎵', category: 'social' },
    { id: 'photographer', prompt: 'Takes the best trip photos', emoji: '📸', category: 'social' },

    // Funny
    { id: 'excuse', prompt: 'Best excuse for a bad shot', emoji: '🤷', category: 'funny' },
    { id: 'mulligan', prompt: 'Most likely to "forget" they took a mulligan', emoji: '🙈', category: 'funny' },
    { id: 'oob', prompt: 'Most likely to find someone else\'s ball', emoji: '⚪', category: 'funny' },
    { id: 'cart-path', prompt: 'Most likely to take the cart where it shouldn\'t go', emoji: '🏎️', category: 'funny' },
    { id: 'club-throw', prompt: 'Most likely to throw a club (in celebration!)', emoji: '🎉', category: 'funny' },
    { id: 'beer-cart', prompt: 'First to spot the beverage cart', emoji: '🍺', category: 'funny' },
];

// ============================================
// COMPONENT
// ============================================

export function GolfSuperlatives({
    onComplete,
    onSkip,
    maxQuestions = 5,
    className,
}: GolfSuperlativesProps) {
    const seed = useId();

    // Select questions deterministically (pure) while still “random-looking”.
    const questions = useMemo(() => {
        const rng = makeSeededRng(seed);
        return seededShuffle(ALL_SUPERLATIVES, rng).slice(0, maxQuestions);
    }, [maxQuestions, seed]);

    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState<SuperlativeAnswer[]>([]);
    const [currentAnswer, setCurrentAnswer] = useState('');

    const currentQuestion = questions[currentIndex];
    const progress = ((currentIndex + 1) / questions.length) * 100;
    const isLastQuestion = currentIndex === questions.length - 1;

    const handleSubmitAnswer = () => {
        if (!currentAnswer.trim()) return;

        const newAnswers = [
            ...answers,
            { superlativeId: currentQuestion.id, answer: currentAnswer.trim() },
        ];
        setAnswers(newAnswers);
        setCurrentAnswer('');

        if (isLastQuestion) {
            onComplete(newAnswers);
        } else {
            setCurrentIndex(prev => prev + 1);
        }
    };

    const handleBack = () => {
        if (currentIndex > 0) {
            // Restore previous answer
            const prevAnswer = answers.find(a => a.superlativeId === questions[currentIndex - 1].id);
            if (prevAnswer) {
                setCurrentAnswer(prevAnswer.answer);
                setAnswers(answers.filter(a => a.superlativeId !== questions[currentIndex - 1].id));
            }
            setCurrentIndex(prev => prev - 1);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmitAnswer();
        }
    };

    return (
        <div className={cn('space-y-6', className)}>
            {/* Header */}
            <div className="text-center">
                <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', bounce: 0.5 }}
                    className="w-16 h-16 rounded-2xl bg-linear-to-br from-amber-400 to-yellow-500 mx-auto mb-4 flex items-center justify-center shadow-lg shadow-amber-500/30"
                >
                    <Trophy className="w-8 h-8 text-white" />
                </motion.div>
                <h2 className="text-xl font-bold text-[var(--ink-primary)]">
                    Golf Superlatives 🏆
                </h2>
                <p className="text-sm text-[var(--ink-tertiary)] mt-1">
                    Fun questions for team bonding
                </p>
            </div>

            {/* Progress */}
            <div className="relative">
                <div className="h-2 bg-[var(--surface-secondary)] rounded-full overflow-hidden">
                    <motion.div
                        className="h-full bg-linear-to-r from-amber-400 to-yellow-500 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ type: 'spring', damping: 20 }}
                    />
                </div>
                <div className="flex justify-between mt-1.5 text-xs text-[var(--ink-tertiary)]">
                    <span>{currentIndex + 1} of {questions.length}</span>
                    <span className="flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        Fun stuff!
                    </span>
                </div>
            </div>

            {/* Question Card */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={currentIndex}
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -50 }}
                    transition={{ type: 'spring', damping: 25 }}
                    className="card overflow-hidden"
                >
                    {/* Question */}
                    <div className="p-6 text-center border-b border-[var(--rule)]">
                        <motion.span
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.2, type: 'spring', bounce: 0.5 }}
                            className="text-5xl mb-4 block"
                        >
                            {currentQuestion.emoji}
                        </motion.span>
                        <h3 className="text-lg font-semibold text-[var(--ink-primary)] leading-relaxed">
                            {currentQuestion.prompt}
                        </h3>
                        <div className="mt-2 inline-flex items-center gap-1 px-2 py-1 rounded-full bg-[var(--surface-secondary)] text-xs text-[var(--ink-tertiary)]">
                            <Star className="w-3 h-3" />
                            {currentQuestion.category}
                        </div>
                    </div>

                    {/* Answer Input */}
                    <div className="p-4">
                        <div className="relative">
                            <input
                                type="text"
                                value={currentAnswer}
                                onChange={(e) => setCurrentAnswer(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Who comes to mind? (or describe yourself!)"
                                className={cn(
                                    'w-full py-4 px-4 rounded-xl border text-center text-lg',
                                    'bg-[var(--surface)]',
                                    'border-[var(--rule)]',
                                    'text-[var(--ink-primary)]',
                                    'placeholder:text-[color:var(--ink-tertiary)]/70',
                                    'focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400',
                                    'transition-all'
                                )}
                                autoFocus
                            />
                        </div>
                        <p className="text-xs text-[color:var(--ink-tertiary)]/80 text-center mt-2">
                            Press Enter or tap the button below
                        </p>
                    </div>
                </motion.div>
            </AnimatePresence>

            {/* Actions */}
            <div className="flex items-center justify-between">
                <button
                    onClick={handleBack}
                    disabled={currentIndex === 0}
                    className={cn(
                        'flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                        currentIndex === 0
                            ? 'text-[color:var(--ink-tertiary)]/40 cursor-not-allowed'
                            : 'text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] hover:bg-[var(--surface-secondary)]'
                    )}
                >
                    <ChevronLeft className="w-4 h-4" />
                    Back
                </button>

                {onSkip && (
                    <button
                        onClick={onSkip}
                        className="text-sm text-[var(--ink-tertiary)] hover:text-[var(--ink-secondary)] transition-colors"
                    >
                        Skip these
                    </button>
                )}

                <motion.button
                    whileHover={{ scale: currentAnswer.trim() ? 1.02 : 1 }}
                    whileTap={{ scale: currentAnswer.trim() ? 0.98 : 1 }}
                    onClick={handleSubmitAnswer}
                    disabled={!currentAnswer.trim()}
                    className={cn(
                        'flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all',
                        currentAnswer.trim()
                            ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30'
                            : 'bg-[var(--surface-secondary)] text-[color:var(--ink-tertiary)]/70'
                    )}
                >
                    {isLastQuestion ? 'Finish' : 'Next'}
                    <ChevronRight className="w-4 h-4" />
                </motion.button>
            </div>

            {/* Fun Tip */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="flex items-center justify-center gap-2 text-xs text-[color:var(--ink-tertiary)]/80"
            >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>Your answers help build team chemistry! 💚</span>
            </motion.div>
        </div>
    );
}

// ============================================
// SUPERLATIVES DISPLAY (For viewing results)
// ============================================

interface SuperlativesDisplayProps {
    answers: SuperlativeAnswer[];
    playerName?: string;
    className?: string;
}

export function SuperlativesDisplay({
    answers,
    playerName,
    className,
}: SuperlativesDisplayProps) {
    const getSuperlative = (id: string) =>
        ALL_SUPERLATIVES.find(s => s.id === id);

    return (
        <div className={cn('space-y-3', className)}>
            <h4 className="font-semibold text-[var(--ink-primary)] flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-500" />
                {playerName ? `${playerName}'s Superlatives` : 'Superlatives'}
            </h4>
            <div className="space-y-2">
                {answers.flatMap((answer) => {
                    const superlative = getSuperlative(answer.superlativeId);
                    if (!superlative) return [];

                    return [
                        <div
                            key={answer.superlativeId}
                            className="flex items-start gap-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/10"
                        >
                            <span className="text-2xl">{superlative.emoji}</span>
                            <div>
                                <div className="text-sm font-medium text-amber-900 dark:text-amber-200">
                                    {superlative.prompt}
                                </div>
                                <div className="text-sm text-amber-700 dark:text-amber-300 mt-0.5">
                                    &ldquo;{answer.answer}&rdquo;
                                </div>
                            </div>
                        </div>,
                    ];
                })}
            </div>
        </div>
    );
}

export default GolfSuperlatives;
