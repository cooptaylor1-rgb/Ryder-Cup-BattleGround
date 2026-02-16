/**
 * Format Rules Reference
 *
 * Quick reference card for match play format rules.
 * Essential for clarifying rules during pre-round briefing.
 *
 * Features:
 * - Format-specific rules (singles, foursomes, fourball)
 * - Handicap allowance calculations
 * - Local rules reference
 * - Quick FAQ for common situations
 * - Shareable rules summary
 */

'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    BookOpen,
    HelpCircle,
    ChevronDown,
    ChevronRight,
    Share2,
    Check,
    Target,
    Users,
    Repeat,
    AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================
// TYPES
// ============================================

export type MatchFormat = 'singles' | 'foursomes' | 'fourball';

export interface FormatRule {
    id: string;
    title: string;
    description: string;
    details?: string[];
}

export interface FAQ {
    id: string;
    question: string;
    answer: string;
    format?: MatchFormat | 'all';
}

export interface LocalRule {
    id: string;
    title: string;
    description: string;
    inEffect: boolean;
}

interface FormatRulesReferenceProps {
    activeFormat?: MatchFormat;
    handicapAllowance?: number;
    localRules?: LocalRule[];
    onShare?: (content: string) => void;
    className?: string;
}

// ============================================
// FORMAT RULES DATA
// ============================================

const FORMAT_RULES: Record<MatchFormat, FormatRule[]> = {
    singles: [
        {
            id: 's1',
            title: 'Individual Match Play',
            description: 'One player vs. one player in match play format.',
            details: [
                'Win, lose, or halve each hole',
                'Match decided when one player leads by more holes than remain',
                'All square (AS) if tied after 18 holes',
            ],
        },
        {
            id: 's2',
            title: 'Handicap Strokes',
            description: 'Players receive strokes on specific holes based on handicap difference.',
            details: [
                'Lower handicap plays at scratch (0)',
                'Higher handicap receives difference on stroke index holes',
                'Strokes given on holes rated by difficulty (SI 1 hardest)',
            ],
        },
        {
            id: 's3',
            title: 'Scoring',
            description: 'Match status shown as holes up or down.',
            details: [
                '1 UP = Leading by 1 hole',
                '2&1 = Won by 2 holes with 1 to play',
                'Match complete when result is mathematically certain',
            ],
        },
    ],
    foursomes: [
        {
            id: 'f1',
            title: 'Alternate Shot Format',
            description: 'Partners share one ball and take alternate shots.',
            details: [
                'One ball per team',
                'Players alternate shots until ball is holed',
                'Partners alternate who tees off on each hole',
            ],
        },
        {
            id: 'f2',
            title: 'Tee Order',
            description: 'Partners decide who tees off on odd vs even holes.',
            details: [
                'Player A tees off on holes 1, 3, 5, 7, 9, 11, 13, 15, 17',
                'Player B tees off on holes 2, 4, 6, 8, 10, 12, 14, 16, 18',
                'Order is fixed at the start and cannot change',
            ],
        },
        {
            id: 'f3',
            title: 'Handicap Calculation',
            description: 'Team handicap is calculated from both players.',
            details: [
                'Add both players\' handicaps',
                'Divide by 2 for team handicap',
                'Round to nearest whole number',
                'Strokes given on stroke index holes',
            ],
        },
        {
            id: 'f4',
            title: 'Playing Wrong Ball',
            description: 'Penalty for playing partner\'s shot out of turn.',
            details: [
                'Loss of hole in match play',
                'Play continues with correct order after mistake',
                'No penalty for striking ball twice in swing',
            ],
        },
    ],
    fourball: [
        {
            id: 'fb1',
            title: 'Better Ball Format',
            description: 'Each player plays their own ball, best score counts.',
            details: [
                'Two balls per team',
                'Each player completes the hole with their own ball',
                'Lower score of the two partners counts for the team',
            ],
        },
        {
            id: 'fb2',
            title: 'Picking Up',
            description: 'Players can pick up if partner has already holed out.',
            details: [
                'Partner who is out of the hole can pick up',
                'No penalty for picking up',
                'Speeds up play considerably',
            ],
        },
        {
            id: 'fb3',
            title: 'Handicap Strokes',
            description: 'Each player receives their own handicap strokes.',
            details: [
                'Net scores compared hole by hole',
                'Standard allowance is 90% of full handicap',
                'Strokes given on stroke index holes',
            ],
        },
        {
            id: 'fb4',
            title: 'Order of Play',
            description: 'Flexible order of play within teams.',
            details: [
                'Either partner may play first from tee',
                'Ball furthest from hole plays first (ready golf OK)',
                'Partners do not need to alternate',
            ],
        },
    ],
};

const FAQS: FAQ[] = [
    {
        id: 'faq1',
        question: 'What happens if my ball hits my opponent\'s ball on the green?',
        answer: 'In match play, there is no penalty. Both balls are played as they lie. If moved, replace opponent\'s ball.',
        format: 'all',
    },
    {
        id: 'faq2',
        question: 'Can I concede a putt to my opponent?',
        answer: 'Yes! You can concede any stroke, hole, or the match at any time. Concessions cannot be declined or withdrawn.',
        format: 'all',
    },
    {
        id: 'faq3',
        question: 'What if we finish all square (tied)?',
        answer: 'Match ends in a halve (½ point each) unless extra holes are required by competition format.',
        format: 'all',
    },
    {
        id: 'faq4',
        question: 'In foursomes, what if we play out of order?',
        answer: 'Loss of hole. The stroke made out of turn is cancelled. Be careful to maintain your tee order!',
        format: 'foursomes',
    },
    {
        id: 'faq5',
        question: 'In fourball, can my partner help me line up my putt?',
        answer: 'Yes, but they must be off the green or putting line extension when you make the stroke.',
        format: 'fourball',
    },
    {
        id: 'faq6',
        question: 'Who putts first on the green?',
        answer: 'Ball furthest from hole plays first. In match play, out of turn is allowed if opponent agrees.',
        format: 'all',
    },
];

const DEFAULT_LOCAL_RULES: LocalRule[] = [
    { id: 'lr1', title: 'Lift, Clean, and Place', description: 'Through the green, ball may be lifted and placed within 6 inches.', inEffect: false },
    { id: 'lr2', title: 'Out of Bounds', description: 'White stakes mark OB. Stroke and distance relief applies.', inEffect: true },
    { id: 'lr3', title: 'Drop Zones', description: 'Drop zones available on par 3s for lost/OB balls.', inEffect: false },
    { id: 'lr4', title: 'Cart Path Relief', description: 'Free relief from cart paths, nearest point no closer to hole.', inEffect: true },
    { id: 'lr5', title: 'Ground Under Repair', description: 'Areas marked GUR - free relief required.', inEffect: true },
];

// ============================================
// FORMAT RULES REFERENCE COMPONENT
// ============================================

export function FormatRulesReference({
    activeFormat = 'fourball',
    handicapAllowance = 90,
    localRules = DEFAULT_LOCAL_RULES,
    onShare,
    className,
}: FormatRulesReferenceProps) {
    const [selectedFormat, setSelectedFormat] = useState<MatchFormat>(activeFormat);
    const [expandedRules, setExpandedRules] = useState<Set<string>>(new Set());
    const [expandedFaqs, setExpandedFaqs] = useState<Set<string>>(new Set());
    const [copied, setCopied] = useState(false);
    const [showLocalRules, setShowLocalRules] = useState(false);

    const rules = FORMAT_RULES[selectedFormat];
    const relevantFaqs = FAQS.filter(faq => faq.format === 'all' || faq.format === selectedFormat);
    const activeLocalRules = localRules.filter(lr => lr.inEffect);

    const toggleRule = (ruleId: string) => {
        setExpandedRules(prev => {
            const next = new Set(prev);
            if (next.has(ruleId)) {
                next.delete(ruleId);
            } else {
                next.add(ruleId);
            }
            return next;
        });
    };

    const toggleFaq = (faqId: string) => {
        setExpandedFaqs(prev => {
            const next = new Set(prev);
            if (next.has(faqId)) {
                next.delete(faqId);
            } else {
                next.add(faqId);
            }
            return next;
        });
    };

    const handleShare = async () => {
        const content = `
📋 ${selectedFormat.toUpperCase()} FORMAT RULES

${rules.map(r => `• ${r.title}: ${r.description}`).join('\n')}

📍 LOCAL RULES IN EFFECT:
${activeLocalRules.map(lr => `• ${lr.title}`).join('\n')}

🎯 Handicap Allowance: ${handicapAllowance}%
    `.trim();

        if (navigator.share) {
            try {
                await navigator.share({
                    title: `${selectedFormat} Rules`,
                    text: content,
                });
            } catch {
                // User cancelled
            }
        } else {
            await navigator.clipboard.writeText(content);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }

        onShare?.(content);
    };

    const getFormatIcon = (format: MatchFormat) => {
        switch (format) {
            case 'singles':
                return <Target className="w-5 h-5" />;
            case 'foursomes':
                return <Repeat className="w-5 h-5" />;
            case 'fourball':
                return <Users className="w-5 h-5" />;
        }
    };

    const getFormatLabel = (format: MatchFormat) => {
        switch (format) {
            case 'singles':
                return 'Singles';
            case 'foursomes':
                return 'Foursomes (Alternate Shot)';
            case 'fourball':
                return 'Fourball (Better Ball)';
        }
    };

    return (
        <div className={cn('flex flex-col', className)}>
            {/* Header */}
            <div className="p-4 border-b" style={{ borderColor: 'rgba(128, 120, 104, 0.2)' }}>
                <div className="flex items-center justify-between mb-3">
                    <div>
                        <h2 className="text-lg font-semibold" style={{ color: 'var(--ink)' }}>
                            Format Rules
                        </h2>
                        <p className="text-sm" style={{ color: 'var(--ink-muted)' }}>
                            Quick reference for match play
                        </p>
                    </div>
                    <button
                        onClick={handleShare}
                        className="p-2 rounded-lg hover:bg-[color:var(--ink)]/5 transition-colors"
                    >
                        {copied ? (
                            <Check className="w-5 h-5 text-green-500" />
                        ) : (
                            <Share2 className="w-5 h-5" style={{ color: 'var(--ink-muted)' }} />
                        )}
                    </button>
                </div>

                {/* Format Tabs */}
                <div className="flex gap-2">
                    {(['singles', 'foursomes', 'fourball'] as const).map(format => (
                        <button
                            key={format}
                            onClick={() => setSelectedFormat(format)}
                            className={cn(
                                'flex-1 flex flex-col items-center gap-1 p-3 rounded-lg transition-colors'
                            )}
                            style={{
                                background: selectedFormat === format ? 'var(--masters-muted)' : 'var(--surface)',
                                color: selectedFormat === format ? 'var(--masters)' : 'var(--ink)',
                                border: '1px solid rgba(128, 120, 104, 0.2)',
                            }}
                        >
                            {getFormatIcon(format)}
                            <span className="text-xs font-medium capitalize">{format}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
                {/* Format Title */}
                <div className="p-4 border-b" style={{ borderColor: 'rgba(128, 120, 104, 0.2)', background: 'var(--surface)' }}>
                    <div className="flex items-center gap-3">
                        {getFormatIcon(selectedFormat)}
                        <div>
                            <p className="font-semibold" style={{ color: 'var(--ink)' }}>
                                {getFormatLabel(selectedFormat)}
                            </p>
                            <p className="text-sm" style={{ color: 'var(--ink-muted)' }}>
                                Handicap Allowance: {handicapAllowance}%
                            </p>
                        </div>
                    </div>
                </div>

                {/* Rules */}
                <div className="p-4">
                    <p className="text-sm font-medium uppercase tracking-wide mb-3" style={{ color: 'var(--ink-muted)' }}>
                        Key Rules
                    </p>
                    <div className="space-y-2">
                        {rules.map(rule => (
                            <div
                                key={rule.id}
                                className="rounded-lg overflow-hidden"
                                style={{ background: 'var(--surface)', border: '1px solid rgba(128, 120, 104, 0.2)' }}
                            >
                                <button
                                    onClick={() => toggleRule(rule.id)}
                                    className="w-full flex items-start gap-3 p-4 text-left"
                                >
                                    <BookOpen className="w-5 h-5 mt-0.5 shrink-0" style={{ color: 'var(--masters)' }} />
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium" style={{ color: 'var(--ink)' }}>
                                            {rule.title}
                                        </p>
                                        <p className="text-sm" style={{ color: 'var(--ink-muted)' }}>
                                            {rule.description}
                                        </p>
                                    </div>
                                    <ChevronDown
                                        className={cn('w-5 h-5 shrink-0 transition-transform', expandedRules.has(rule.id) && 'rotate-180')}
                                        style={{ color: 'var(--ink-muted)' }}
                                    />
                                </button>
                                <AnimatePresence>
                                    {expandedRules.has(rule.id) && rule.details && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="overflow-hidden"
                                        >
                                            <div className="px-4 pb-4 pl-12">
                                                <ul className="space-y-1">
                                                    {rule.details.map((detail, idx) => (
                                                        <li key={idx} className="flex items-start gap-2 text-sm" style={{ color: 'var(--ink)' }}>
                                                            <ChevronRight className="w-4 h-4 mt-0.5 shrink-0" style={{ color: 'var(--masters)' }} />
                                                            {detail}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        ))}
                    </div>
                </div>

                {/* FAQs */}
                <div className="p-4 border-t" style={{ borderColor: 'rgba(128, 120, 104, 0.2)' }}>
                    <p className="text-sm font-medium uppercase tracking-wide mb-3" style={{ color: 'var(--ink-muted)' }}>
                        Common Questions
                    </p>
                    <div className="space-y-2">
                        {relevantFaqs.map(faq => (
                            <div
                                key={faq.id}
                                className="rounded-lg overflow-hidden"
                                style={{ background: 'var(--surface)', border: '1px solid rgba(128, 120, 104, 0.2)' }}
                            >
                                <button
                                    onClick={() => toggleFaq(faq.id)}
                                    className="w-full flex items-center gap-3 p-4 text-left"
                                >
                                    <HelpCircle className="w-5 h-5 shrink-0" style={{ color: 'var(--ink-muted)' }} />
                                    <p className="flex-1 font-medium text-sm" style={{ color: 'var(--ink)' }}>
                                        {faq.question}
                                    </p>
                                    <ChevronDown
                                        className={cn('w-5 h-5 shrink-0 transition-transform', expandedFaqs.has(faq.id) && 'rotate-180')}
                                        style={{ color: 'var(--ink-muted)' }}
                                    />
                                </button>
                                <AnimatePresence>
                                    {expandedFaqs.has(faq.id) && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="overflow-hidden"
                                        >
                                            <div className="px-4 pb-4 pl-12">
                                                <p className="text-sm" style={{ color: 'var(--ink)' }}>
                                                    {faq.answer}
                                                </p>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Local Rules */}
                <div className="p-4 border-t" style={{ borderColor: 'rgba(128, 120, 104, 0.2)' }}>
                    <button
                        onClick={() => setShowLocalRules(!showLocalRules)}
                        className="w-full flex items-center justify-between mb-3"
                    >
                        <div className="flex items-center gap-2">
                            <AlertCircle className="w-5 h-5" style={{ color: 'var(--masters)' }} />
                            <span className="text-sm font-medium uppercase tracking-wide" style={{ color: 'var(--ink-muted)' }}>
                                Local Rules ({activeLocalRules.length} in effect)
                            </span>
                        </div>
                        <ChevronDown
                            className={cn('w-5 h-5 transition-transform', showLocalRules && 'rotate-180')}
                            style={{ color: 'var(--ink-muted)' }}
                        />
                    </button>
                    <AnimatePresence>
                        {showLocalRules && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                            >
                                <div className="space-y-2">
                                    {localRules.map(rule => (
                                        <div
                                            key={rule.id}
                                            className={cn(
                                                'p-3 rounded-lg',
                                                rule.inEffect ? 'bg-green-500/10' : ''
                                            )}
                                            style={{ background: rule.inEffect ? undefined : 'var(--surface)' }}
                                        >
                                            <div className="flex items-center gap-2 mb-1">
                                                <div
                                                    className={cn(
                                                        'w-2 h-2 rounded-full',
                                                        rule.inEffect ? 'bg-green-500' : 'bg-gray-400'
                                                    )}
                                                />
                                                <span
                                                    className="font-medium text-sm"
                                                    style={{ color: rule.inEffect ? 'var(--masters)' : 'var(--ink-muted)' }}
                                                >
                                                    {rule.title}
                                                </span>
                                                <span className="text-xs" style={{ color: rule.inEffect ? 'var(--masters)' : 'var(--ink-muted)' }}>
                                                    {rule.inEffect ? '(In Effect)' : '(Not Active)'}
                                                </span>
                                            </div>
                                            <p className="text-sm pl-4" style={{ color: 'var(--ink-muted)' }}>
                                                {rule.description}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}

export default FormatRulesReference;
