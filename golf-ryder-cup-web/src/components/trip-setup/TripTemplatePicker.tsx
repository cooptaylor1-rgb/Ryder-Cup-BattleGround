'use client';

/**
 * Trip Template Picker (Production Quality)
 *
 * A beautiful template selection UI for trip creation:
 * - Template cards with visual previews
 * - Detail modal with session breakdown
 * - Recommended templates highlighted
 * - Easy customization starting point
 */

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Calendar,
    Users,
    Star,
    ChevronRight,
    X,
    Check,
    Zap,
    Trophy,
    Target,
} from 'lucide-react';
import { type LegacyTripTemplate, TRIP_TEMPLATES } from '@/lib/types/templates';

type TripTemplate = LegacyTripTemplate;

// Colors
const COLORS = {
    usa: '#1565C0',
    europe: '#C62828',
    gold: '#FFD54F',
    green: '#004225',
    success: '#4CAF50',
    textPrimary: '#FFFFFF',
    textSecondary: '#A0A0A0',
    textTertiary: '#707070',
    surface: '#141414',
    surfaceElevated: '#1E1E1E',
    border: '#3A3A3A',
};

// ============================================
// TYPES
// ============================================

// Extend the base template with UI-specific fields
type _TemplateWithUI = TripTemplate & {
    recommended?: boolean;
    difficulty?: 'casual' | 'standard' | 'competitive';
};

interface TripTemplatePickerProps {
    templates?: TripTemplate[];
    selectedTemplateId?: string;
    onSelect: (template: TripTemplate) => void;
    onCustomize?: (template: TripTemplate) => void;
}

// Helper to get difficulty based on template
function getDifficulty(template: TripTemplate): 'casual' | 'standard' | 'competitive' {
    if (template.days >= 3) return 'competitive';
    if (template.days === 2) return 'standard';
    return 'casual';
}

// Helper to check if template is recommended
function isRecommended(template: TripTemplate): boolean {
    return template.id === 'classic-ryder-cup';
}

// ============================================
// SUB-COMPONENTS
// ============================================

function DifficultyBadge({ difficulty }: { difficulty: 'casual' | 'standard' | 'competitive' }) {
    const colors = {
        casual: { bg: '#4CAF5020', text: '#4CAF50', label: 'Casual' },
        standard: { bg: '#2196F320', text: '#2196F3', label: 'Standard' },
        competitive: { bg: '#FF980020', text: '#FF9800', label: 'Competitive' },
    };
    const { bg, text, label } = colors[difficulty];

    return (
        <span
            style={{
                padding: '4px 8px',
                borderRadius: '4px',
                background: bg,
                color: text,
                fontSize: '0.65rem',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
            }}
        >
            {label}
        </span>
    );
}

function TemplateCard({
    template,
    isSelected,
    onSelect,
    onViewDetails,
}: {
    template: TripTemplate;
    isSelected: boolean;
    onSelect: () => void;
    onViewDetails: () => void;
}) {
    const totalPoints = template.sessions.reduce((acc, s) => acc + s.matchCount, 0);
    const recommended = isRecommended(template);
    const difficulty = getDifficulty(template);

    return (
        <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onSelect}
            style={{
                padding: '20px',
                borderRadius: '16px',
                background: COLORS.surfaceElevated,
                border: `2px solid ${isSelected ? COLORS.green : COLORS.border}`,
                cursor: 'pointer',
                position: 'relative',
                overflow: 'hidden',
            }}
        >
            {/* Recommended Badge */}
            {recommended && (
                <div
                    style={{
                        position: 'absolute',
                        top: '12px',
                        right: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        background: `${COLORS.gold}20`,
                    }}
                >
                    <Star size={12} style={{ color: COLORS.gold }} fill={COLORS.gold} />
                    <span style={{ fontSize: '0.65rem', fontWeight: 600, color: COLORS.gold }}>
                        RECOMMENDED
                    </span>
                </div>
            )}

            {/* Selection Indicator */}
            {isSelected && (
                <div
                    style={{
                        position: 'absolute',
                        top: '12px',
                        left: '12px',
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        background: COLORS.green,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    <Check size={14} className="text-[var(--canvas)]" />
                </div>
            )}

            {/* Content */}
            <div style={{ marginTop: recommended ? '28px' : 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    <span style={{ fontSize: '1.5rem' }}>{template.icon}</span>
                    <h3
                        style={{
                            fontSize: '1.25rem',
                            fontWeight: 700,
                            color: COLORS.textPrimary,
                        }}
                    >
                        {template.name}
                    </h3>
                </div>

                <p
                    style={{
                        fontSize: '0.875rem',
                        color: COLORS.textSecondary,
                        marginBottom: '16px',
                        lineHeight: 1.4,
                    }}
                >
                    {template.description}
                </p>

                {/* Stats Row */}
                <div style={{ display: 'flex', gap: '16px', marginBottom: '16px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Calendar size={14} style={{ color: COLORS.textTertiary }} />
                        <span style={{ fontSize: '0.75rem', color: COLORS.textSecondary }}>
                            {template.days} {template.days === 1 ? 'day' : 'days'}
                        </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Trophy size={14} style={{ color: COLORS.textTertiary }} />
                        <span style={{ fontSize: '0.75rem', color: COLORS.textSecondary }}>
                            {totalPoints} points
                        </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Target size={14} style={{ color: COLORS.textTertiary }} />
                        <span style={{ fontSize: '0.75rem', color: COLORS.textSecondary }}>
                            {template.defaultPointsToWin} to win
                        </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Users size={14} style={{ color: COLORS.textTertiary }} />
                        <span style={{ fontSize: '0.75rem', color: COLORS.textSecondary }}>
                            {template.playersPerTeam}/team
                        </span>
                    </div>
                </div>

                {/* Difficulty & Details */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <DifficultyBadge difficulty={difficulty} />
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onViewDetails();
                        }}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '6px 10px',
                            borderRadius: '8px',
                            background: 'transparent',
                            border: `1px solid ${COLORS.border}`,
                            color: COLORS.textSecondary,
                            fontSize: '0.75rem',
                            cursor: 'pointer',
                        }}
                    >
                        Details
                        <ChevronRight size={14} />
                    </button>
                </div>
            </div>
        </motion.div>
    );
}

function TemplateDetailModal({
    template,
    onClose,
    onSelect,
    onCustomize,
}: {
    template: TripTemplate;
    onClose: () => void;
    onSelect: () => void;
    onCustomize?: () => void;
}) {
    const totalPoints = template.sessions.reduce((acc, s) => acc + s.matchCount, 0);
    const totalMatches = template.sessions.reduce((acc, s) => acc + s.matchCount, 0);
    const recommended = isRecommended(template);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0, 0, 0, 0.8)',
                zIndex: 100,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '16px',
            }}
        >
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                style={{
                    width: '100%',
                    maxWidth: '500px',
                    maxHeight: '85vh',
                    background: COLORS.surface,
                    borderRadius: '20px',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                }}
            >
                {/* Header */}
                <div
                    style={{
                        padding: '20px',
                        borderBottom: `1px solid ${COLORS.border}`,
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'space-between',
                    }}
                >
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                            <span style={{ fontSize: '1.5rem' }}>{template.icon}</span>
                            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: COLORS.textPrimary }}>
                                {template.name}
                            </h2>
                            {recommended && (
                                <Star size={18} style={{ color: COLORS.gold }} fill={COLORS.gold} />
                            )}
                        </div>
                        <p style={{ fontSize: '0.875rem', color: COLORS.textSecondary }}>
                            {template.description}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            background: COLORS.surfaceElevated,
                            border: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                        }}
                    >
                        <X size={18} style={{ color: COLORS.textSecondary }} />
                    </button>
                </div>

                {/* Content */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
                    {/* Quick Stats */}
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(3, 1fr)',
                            gap: '12px',
                            marginBottom: '24px',
                        }}
                    >
                        <div
                            style={{
                                padding: '16px',
                                borderRadius: '12px',
                                background: COLORS.surfaceElevated,
                                textAlign: 'center',
                            }}
                        >
                            <p style={{ fontSize: '1.5rem', fontWeight: 700, color: COLORS.textPrimary }}>
                                {template.days}
                            </p>
                            <p style={{ fontSize: '0.75rem', color: COLORS.textSecondary }}>
                                {template.days === 1 ? 'Day' : 'Days'}
                            </p>
                        </div>
                        <div
                            style={{
                                padding: '16px',
                                borderRadius: '12px',
                                background: COLORS.surfaceElevated,
                                textAlign: 'center',
                            }}
                        >
                            <p style={{ fontSize: '1.5rem', fontWeight: 700, color: COLORS.textPrimary }}>
                                {totalMatches}
                            </p>
                            <p style={{ fontSize: '0.75rem', color: COLORS.textSecondary }}>Matches</p>
                        </div>
                        <div
                            style={{
                                padding: '16px',
                                borderRadius: '12px',
                                background: COLORS.surfaceElevated,
                                textAlign: 'center',
                            }}
                        >
                            <p style={{ fontSize: '1.5rem', fontWeight: 700, color: COLORS.gold }}>
                                {totalPoints}
                            </p>
                            <p style={{ fontSize: '0.75rem', color: COLORS.textSecondary }}>Points</p>
                        </div>
                    </div>

                    {/* Session Breakdown */}
                    <div style={{ marginBottom: '24px' }}>
                        <h3
                            style={{
                                fontSize: '0.875rem',
                                fontWeight: 600,
                                color: COLORS.textSecondary,
                                marginBottom: '12px',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                            }}
                        >
                            Session Schedule
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {template.sessions.map((session, idx) => (
                                <div
                                    key={idx}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: '12px 16px',
                                        borderRadius: '10px',
                                        background: COLORS.surfaceElevated,
                                    }}
                                >
                                    <div>
                                        <p
                                            style={{
                                                fontSize: '0.875rem',
                                                fontWeight: 600,
                                                color: COLORS.textPrimary,
                                            }}
                                        >
                                            {session.name || `Day ${session.dayOffset + 1} ${session.timeSlot}`}
                                        </p>
                                        <p style={{ fontSize: '0.75rem', color: COLORS.textSecondary }}>
                                            {session.sessionType.charAt(0).toUpperCase() + session.sessionType.slice(1)}
                                        </p>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <p
                                            style={{
                                                fontSize: '0.875rem',
                                                fontWeight: 600,
                                                color: COLORS.textPrimary,
                                            }}
                                        >
                                            {session.matchCount} {session.matchCount === 1 ? 'match' : 'matches'}
                                        </p>
                                        <p style={{ fontSize: '0.75rem', color: COLORS.textTertiary }}>
                                            {session.matchCount} pts
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Features */}
                    <div>
                        <h3
                            style={{
                                fontSize: '0.875rem',
                                fontWeight: 600,
                                color: COLORS.textSecondary,
                                marginBottom: '12px',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                            }}
                        >
                            Features
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {template.features.map((feature, idx) => (
                                <div
                                    key={idx}
                                    style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                                >
                                    <Zap size={14} style={{ color: COLORS.green }} />
                                    <span style={{ fontSize: '0.875rem', color: COLORS.textPrimary }}>
                                        {feature}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div
                    style={{
                        padding: '16px 20px',
                        borderTop: `1px solid ${COLORS.border}`,
                        display: 'flex',
                        gap: '12px',
                    }}
                >
                    {onCustomize && (
                        <button
                            onClick={() => {
                                onCustomize();
                                onClose();
                            }}
                            style={{
                                flex: 1,
                                padding: '14px',
                                borderRadius: '12px',
                                background: 'transparent',
                                border: `1px solid ${COLORS.green}`,
                                color: COLORS.green,
                                fontWeight: 600,
                                fontSize: '0.875rem',
                                cursor: 'pointer',
                            }}
                        >
                            Customize
                        </button>
                    )}
                    <button
                        onClick={() => {
                            onSelect();
                            onClose();
                        }}
                        style={{
                            flex: 2,
                            padding: '14px',
                            borderRadius: '12px',
                            background: COLORS.green,
                            border: 'none',
                            color: 'var(--canvas)',
                            fontWeight: 600,
                            fontSize: '0.875rem',
                            cursor: 'pointer',
                        }}
                    >
                        Use This Template
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}

// ============================================
// MAIN COMPONENT
// ============================================

export function TripTemplatePicker({
    templates = TRIP_TEMPLATES,
    selectedTemplateId,
    onSelect,
    onCustomize,
}: TripTemplatePickerProps) {
    const [detailTemplate, setDetailTemplate] = useState<TripTemplate | null>(null);

    const handleSelect = useCallback(
        (template: TripTemplate) => {
            onSelect(template);
        },
        [onSelect]
    );

    return (
        <div>
            {/* Template Grid */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {templates.map((template) => (
                    <TemplateCard
                        key={template.id}
                        template={template}
                        isSelected={selectedTemplateId === template.id}
                        onSelect={() => handleSelect(template)}
                        onViewDetails={() => setDetailTemplate(template)}
                    />
                ))}
            </div>

            {/* Detail Modal */}
            <AnimatePresence>
                {detailTemplate && (
                    <TemplateDetailModal
                        template={detailTemplate}
                        onClose={() => setDetailTemplate(null)}
                        onSelect={() => handleSelect(detailTemplate)}
                        onCustomize={
                            onCustomize ? () => onCustomize(detailTemplate) : undefined
                        }
                    />
                )}
            </AnimatePresence>
        </div>
    );
}

export default TripTemplatePicker;
