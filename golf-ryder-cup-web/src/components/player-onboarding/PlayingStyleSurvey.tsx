'use client';

/**
 * Playing Style Survey
 *
 * Quick, fun survey to capture a player's golf tendencies.
 * Used for better pairing suggestions and team strategy.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Target,
    Zap,
    Shield,
    Wind,
    Crosshair,
    TrendingUp,
    ChevronRight,
    ChevronLeft,
    Check,
    Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================
// TYPES
// ============================================

export interface PlayingStyle {
    driverDistance: 'short' | 'medium' | 'long' | 'bomber';
    accuracy: 'wild' | 'average' | 'consistent' | 'sniper';
    shortGame: 'struggle' | 'average' | 'solid' | 'wizard';
    putting: 'yips' | 'average' | 'confident' | 'automatic';
    pressure: 'nervous' | 'steady' | 'clutch' | 'iceman';
    matchPlayStyle: 'aggressive' | 'steady' | 'conservative';
}

interface PlayingStyleSurveyProps {
    onComplete: (style: PlayingStyle) => void;
    onSkip?: () => void;
    initialStyle?: Partial<PlayingStyle>;
    className?: string;
}

interface Question {
    id: keyof PlayingStyle;
    question: string;
    subtitle: string;
    icon: React.ReactNode;
    options: {
        value: string;
        label: string;
        emoji: string;
        description: string;
    }[];
}

// ============================================
// QUESTIONS DATA
// ============================================

const questions: Question[] = [
    {
        id: 'driverDistance',
        question: 'Off the tee, you typically...',
        subtitle: 'Be honest—we won\'t judge!',
        icon: <Wind className="w-6 h-6" />,
        options: [
            { value: 'short', label: 'Short', emoji: '🐢', description: 'Under 200 yards' },
            { value: 'medium', label: 'Medium', emoji: '🚗', description: '200-240 yards' },
            { value: 'long', label: 'Long', emoji: '🚀', description: '240-280 yards' },
            { value: 'bomber', label: 'Bomber', emoji: '💣', description: '280+ yards' },
        ],
    },
    {
        id: 'accuracy',
        question: 'Your fairway accuracy is...',
        subtitle: 'How often do you find short grass?',
        icon: <Target className="w-6 h-6" />,
        options: [
            { value: 'wild', label: 'Wild', emoji: '🎲', description: 'Trees are my friends' },
            { value: 'average', label: 'Average', emoji: '😐', description: 'Hit some, miss some' },
            { value: 'consistent', label: 'Consistent', emoji: '🎯', description: 'Usually in play' },
            { value: 'sniper', label: 'Sniper', emoji: '🔫', description: 'Fairways are boring' },
        ],
    },
    {
        id: 'shortGame',
        question: 'Around the green, you\'re...',
        subtitle: 'Chipping, pitching, bunkers, oh my!',
        icon: <Crosshair className="w-6 h-6" />,
        options: [
            { value: 'struggle', label: 'Struggling', emoji: '😰', description: 'Pray and chip' },
            { value: 'average', label: 'Average', emoji: '🤷', description: 'Get it on eventually' },
            { value: 'solid', label: 'Solid', emoji: '💪', description: 'Up and down often' },
            { value: 'wizard', label: 'Wizard', emoji: '🧙', description: 'Make magic happen' },
        ],
    },
    {
        id: 'putting',
        question: 'On the greens, you...',
        subtitle: 'The flat stick tells all',
        icon: <TrendingUp className="w-6 h-6" />,
        options: [
            { value: 'yips', label: 'Struggle', emoji: '😬', description: '3-putts happen often' },
            { value: 'average', label: 'Average', emoji: '😑', description: 'Usually 2-putt' },
            { value: 'confident', label: 'Confident', emoji: '😎', description: 'Make my share' },
            { value: 'automatic', label: 'Automatic', emoji: '🎱', description: 'Fear inside 10 feet' },
        ],
    },
    {
        id: 'pressure',
        question: 'When the match is on the line...',
        subtitle: 'Clutch factor revealed',
        icon: <Zap className="w-6 h-6" />,
        options: [
            { value: 'nervous', label: 'Nervous', emoji: '😅', description: 'Heart races, hands shake' },
            { value: 'steady', label: 'Steady', emoji: '😌', description: 'Stay focused' },
            { value: 'clutch', label: 'Clutch', emoji: '🔥', description: 'Rise to the occasion' },
            { value: 'iceman', label: 'Iceman', emoji: '🧊', description: 'Blood runs cold' },
        ],
    },
    {
        id: 'matchPlayStyle',
        question: 'Your match play strategy is...',
        subtitle: 'How do you approach head-to-head?',
        icon: <Shield className="w-6 h-6" />,
        options: [
            { value: 'aggressive', label: 'Aggressive', emoji: '⚔️', description: 'Attack flags, take risks' },
            { value: 'steady', label: 'Steady', emoji: '🏔️', description: 'Make pars, wait for mistakes' },
            { value: 'conservative', label: 'Conservative', emoji: '🛡️', description: 'Play safe, avoid trouble' },
        ],
    },
];

// ============================================
// COMPONENT
// ============================================

export function PlayingStyleSurvey({
    onComplete,
    onSkip,
    initialStyle,
    className,
}: PlayingStyleSurveyProps) {
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [answers, setAnswers] = useState<Partial<PlayingStyle>>(initialStyle || {});

    const question = questions[currentQuestion];
    const progress = ((currentQuestion + 1) / questions.length) * 100;
    const isLastQuestion = currentQuestion === questions.length - 1;
    const currentAnswer = answers[question.id];

    const handleSelect = (value: string) => {
        const newAnswers = { ...answers, [question.id]: value };
        setAnswers(newAnswers);

        // Auto-advance after selection (with delay for animation)
        setTimeout(() => {
            if (isLastQuestion) {
                onComplete(newAnswers as PlayingStyle);
            } else {
                setCurrentQuestion(prev => prev + 1);
            }
        }, 300);
    };

    const handleBack = () => {
        if (currentQuestion > 0) {
            setCurrentQuestion(prev => prev - 1);
        }
    };

    return (
        <div className={cn('space-y-6', className)}>
            {/* Header */}
            <div className="text-center">
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', bounce: 0.5 }}
                    className="w-14 h-14 rounded-2xl bg-linear-to-br from-purple-500 to-indigo-600 mx-auto mb-4 flex items-center justify-center shadow-lg shadow-purple-500/30"
                >
                    <Sparkles className="w-7 h-7 text-[var(--canvas)]" />
                </motion.div>
                <h2 className="text-lg font-bold text-[var(--ink-primary)]">
                    Know Your Game
                </h2>
                <p className="text-sm text-[var(--ink-tertiary)]">
                    Quick survey for better matchups
                </p>
            </div>

            {/* Progress Bar */}
            <div className="relative">
                <div className="h-2 bg-[color:var(--ink-tertiary)]/10 rounded-full overflow-hidden">
                    <motion.div
                        className="h-full bg-linear-to-r from-purple-500 to-indigo-500 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ type: 'spring', damping: 20 }}
                    />
                </div>
                <div className="flex justify-between mt-1.5 text-xs text-[var(--ink-tertiary)]">
                    <span>{currentQuestion + 1} of {questions.length}</span>
                    <span>{Math.round(progress)}% complete</span>
                </div>
            </div>

            {/* Question Card */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={currentQuestion}
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -50 }}
                    transition={{ type: 'spring', damping: 20 }}
                    className="card overflow-hidden"
                >
                    {/* Question Header */}
                    <div className="p-5 border-b border-[var(--rule)]">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400">
                                {question.icon}
                            </div>
                            <div className="flex-1">
                                <h3 className="font-semibold text-[var(--ink-primary)]">
                                    {question.question}
                                </h3>
                                <p className="text-sm text-[var(--ink-tertiary)]">
                                    {question.subtitle}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Options */}
                    <div className="p-4 space-y-2">
                        {question.options.map((option, idx) => (
                            <motion.button
                                key={option.value}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                onClick={() => handleSelect(option.value)}
                                className={cn(
                                    'w-full p-4 rounded-xl border-2 text-left transition-all',
                                    'flex items-center gap-4',
                                    'hover:border-purple-300 hover:bg-purple-50 dark:hover:bg-purple-900/10',
                                    currentAnswer === option.value
                                        ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                                        : 'border-[var(--rule)]'
                                )}
                            >
                                <span className="text-3xl">{option.emoji}</span>
                                <div className="flex-1">
                                    <div className="font-medium text-[var(--ink-primary)]">
                                        {option.label}
                                    </div>
                                    <div className="text-sm text-[var(--ink-tertiary)]">
                                        {option.description}
                                    </div>
                                </div>
                                {currentAnswer === option.value && (
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        className="w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center"
                                    >
                                        <Check className="w-4 h-4 text-[var(--canvas)]" />
                                    </motion.div>
                                )}
                            </motion.button>
                        ))}
                    </div>
                </motion.div>
            </AnimatePresence>

            {/* Navigation */}
            <div className="flex items-center justify-between">
                <button
                    onClick={handleBack}
                    disabled={currentQuestion === 0}
                    className={cn(
                        'flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                        currentQuestion === 0
                            ? 'text-[var(--ink-tertiary)]/40 cursor-not-allowed'
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
                        Skip survey
                    </button>
                )}

                {isLastQuestion && currentAnswer && (
                    <motion.button
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        onClick={() => onComplete(answers as PlayingStyle)}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-500 text-[var(--canvas)] font-medium hover:bg-purple-600 transition-colors"
                    >
                        Done
                        <ChevronRight className="w-4 h-4" />
                    </motion.button>
                )}
            </div>
        </div>
    );
}

export default PlayingStyleSurvey;
