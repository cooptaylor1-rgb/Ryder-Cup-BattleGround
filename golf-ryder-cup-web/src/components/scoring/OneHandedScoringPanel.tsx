'use client';

/**
 * One-Handed Scoring Panel (Production Quality)
 *
 * Optimized for single-hand use while playing golf:
 * - Large tap targets (60px+)
 * - Controls at bottom of screen (reachable with thumb)
 * - Optional left/right hand layouts
 * - Swipe gestures for quick scoring
 * - Clear visual feedback
 */

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { Check, Hand, RotateCcw, ChevronLeft, ChevronRight } from 'lucide-react';
import type { HoleWinner } from '@/lib/types/models';

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

interface OneHandedScoringPanelProps {
    holeNumber: number;
    teamAName: string;
    teamBName: string;
    teamAColor: string;
    teamBColor: string;
    existingResult?: HoleWinner;
    onScore: (winner: HoleWinner) => void;
    onPrevHole: () => void;
    onNextHole: () => void;
    onUndo?: () => void;
    canUndo?: boolean;
    disabled?: boolean;
    preferredHand: 'left' | 'right';
    currentScore: number;
    holesPlayed: number;
}

// ============================================
// MAIN COMPONENT
// ============================================

export function OneHandedScoringPanel({
    holeNumber,
    teamAName,
    teamBName,
    teamAColor,
    teamBColor,
    existingResult,
    onScore,
    onPrevHole,
    onNextHole,
    onUndo,
    canUndo = false,
    disabled = false,
    preferredHand,
    currentScore,
    holesPlayed,
}: OneHandedScoringPanelProps) {
    const [activeSwipe, setActiveSwipe] = useState<'teamA' | 'teamB' | null>(null);
    const [confirmingResult, setConfirmingResult] = useState<HoleWinner | null>(null);

    const SWIPE_THRESHOLD = 100;

    const handleDrag = useCallback((event: TouchEvent | MouseEvent | PointerEvent, info: PanInfo) => {
        if (disabled) return;
        const { offset } = info;
        if (Math.abs(offset.x) > 30) {
            setActiveSwipe(offset.x > 0 ? 'teamA' : 'teamB');
        } else {
            setActiveSwipe(null);
        }
    }, [disabled]);

    const handleDragEnd = useCallback((event: TouchEvent | MouseEvent | PointerEvent, info: PanInfo) => {
        if (disabled) return;
        const { offset, velocity } = info;
        const swipedRight = offset.x > SWIPE_THRESHOLD || velocity.x > 500;
        const swipedLeft = offset.x < -SWIPE_THRESHOLD || velocity.x < -500;

        if (swipedRight) setConfirmingResult('teamA');
        else if (swipedLeft) setConfirmingResult('teamB');
        setActiveSwipe(null);
    }, [disabled]);

    const confirmScore = useCallback(() => {
        if (confirmingResult) {
            onScore(confirmingResult);
            setConfirmingResult(null);
        }
    }, [confirmingResult, onScore]);

    const cancelScore = useCallback(() => setConfirmingResult(null), []);

    const handleTapScore = useCallback((winner: HoleWinner) => {
        if (disabled) return;
        setConfirmingResult(winner);
    }, [disabled]);

    const isRightHanded = preferredHand === 'right';
    const scoreColor = currentScore > 0 ? teamAColor : currentScore < 0 ? teamBColor : COLORS.textSecondary;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: '60vh', position: 'relative' }}>
            {/* Confirmation Overlay */}
            <AnimatePresence>
                {confirmingResult && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{
                            position: 'absolute',
                            inset: 0,
                            background: 'rgba(0, 0, 0, 0.8)',
                            zIndex: 50,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '24px',
                        }}
                    >
                        <motion.div
                            initial={{ scale: 0.8 }}
                            animate={{ scale: 1 }}
                            style={{
                                padding: '32px',
                                borderRadius: '16px',
                                background: confirmingResult === 'teamA' ? teamAColor :
                                    confirmingResult === 'teamB' ? teamBColor : COLORS.surfaceElevated,
                                textAlign: 'center',
                            }}
                        >
                            <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#fff', marginBottom: '4px' }}>
                                {confirmingResult === 'halved' ? 'Halved' :
                                    confirmingResult === 'teamA' ? `${teamAName} wins` : `${teamBName} wins`}
                            </p>
                            <p style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.8)' }}>Hole {holeNumber}</p>
                        </motion.div>

                        <div style={{ display: 'flex', gap: '16px' }}>
                            <motion.button
                                whileTap={{ scale: 0.95 }}
                                onClick={cancelScore}
                                style={{
                                    width: 70, height: 70, borderRadius: '50%',
                                    background: COLORS.surfaceElevated, border: 'none',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                                }}
                            >
                                <RotateCcw size={28} style={{ color: COLORS.textSecondary }} />
                            </motion.button>
                            <motion.button
                                whileTap={{ scale: 0.95 }}
                                onClick={confirmScore}
                                style={{
                                    width: 70, height: 70, borderRadius: '50%',
                                    background: COLORS.success, border: 'none',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                                }}
                            >
                                <Check size={32} style={{ color: '#fff' }} />
                            </motion.button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Score Display */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
                <p style={{ fontSize: '0.75rem', color: COLORS.textSecondary, marginBottom: '12px' }}>Match Score</p>
                <motion.p
                    key={currentScore}
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    style={{ fontSize: 64, fontWeight: 700, color: scoreColor, lineHeight: 1 }}
                >
                    {currentScore > 0 ? `+${currentScore}` : currentScore === 0 ? 'AS' : currentScore}
                </motion.p>
                <p style={{ fontSize: '0.75rem', color: COLORS.textTertiary, marginTop: '12px' }}>thru {holesPlayed}</p>

                {/* Swipe Hint */}
                <div style={{ marginTop: '32px', display: 'flex', alignItems: 'center', gap: '16px', color: COLORS.textSecondary, fontSize: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <ChevronRight size={20} style={{ color: teamAColor }} />
                        <span>{teamAName}</span>
                    </div>
                    <div style={{
                        width: 80, height: 4, background: COLORS.border, borderRadius: '9999px',
                        position: 'relative', overflow: 'hidden',
                    }}>
                        <motion.div
                            animate={{ x: activeSwipe === 'teamA' ? 20 : activeSwipe === 'teamB' ? -20 : 0 }}
                            style={{
                                position: 'absolute', left: '50%', top: 0, width: 20, height: 4,
                                marginLeft: -10, borderRadius: '9999px', transition: 'background 0.2s',
                                background: activeSwipe === 'teamA' ? teamAColor : activeSwipe === 'teamB' ? teamBColor : COLORS.textTertiary,
                            }}
                        />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span>{teamBName}</span>
                        <ChevronLeft size={20} style={{ color: teamBColor }} />
                    </div>
                </div>
            </div>

            {/* Bottom Control Panel */}
            <div style={{
                padding: '24px', paddingBottom: '48px',
                background: COLORS.surfaceElevated, borderTopLeftRadius: '24px', borderTopRightRadius: '24px',
                boxShadow: '0 -4px 20px rgba(0,0,0,0.1)',
            }}>
                {/* Hole Navigation */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                    <button
                        onClick={onPrevHole}
                        disabled={holeNumber <= 1}
                        style={{
                            width: 48, height: 48, borderRadius: '12px', border: `1px solid ${COLORS.border}`,
                            background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: holeNumber <= 1 ? 'not-allowed' : 'pointer', opacity: holeNumber <= 1 ? 0.3 : 1,
                        }}
                    >
                        <ChevronLeft size={24} style={{ color: COLORS.textSecondary }} />
                    </button>

                    <div style={{ textAlign: 'center' }}>
                        <p style={{ fontSize: '1.5rem', fontWeight: 700, color: COLORS.textPrimary }}>Hole {holeNumber}</p>
                        {existingResult && existingResult !== 'none' && (
                            <p style={{
                                fontSize: '0.75rem',
                                color: existingResult === 'teamA' ? teamAColor : existingResult === 'teamB' ? teamBColor : COLORS.textSecondary,
                            }}>
                                {existingResult === 'halved' ? 'Halved' : existingResult === 'teamA' ? `${teamAName} won` : `${teamBName} won`}
                            </p>
                        )}
                    </div>

                    <button
                        onClick={onNextHole}
                        disabled={holeNumber >= 18}
                        style={{
                            width: 48, height: 48, borderRadius: '12px', border: `1px solid ${COLORS.border}`,
                            background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: holeNumber >= 18 ? 'not-allowed' : 'pointer', opacity: holeNumber >= 18 ? 0.3 : 1,
                        }}
                    >
                        <ChevronRight size={24} style={{ color: COLORS.textSecondary }} />
                    </button>
                </div>

                {/* Large Score Buttons */}
                <motion.div
                    drag="x"
                    dragConstraints={{ left: 0, right: 0 }}
                    dragElastic={0.3}
                    onDrag={handleDrag}
                    onDragEnd={handleDragEnd}
                    style={{ display: 'grid', gridTemplateColumns: '1fr 80px 1fr', gap: '12px', cursor: 'grab' }}
                >
                    <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleTapScore('teamA')}
                        disabled={disabled}
                        style={{
                            height: 80, borderRadius: '16px', border: 'none',
                            background: activeSwipe === 'teamA' ? teamAColor : `${teamAColor}20`,
                            color: activeSwipe === 'teamA' ? '#fff' : teamAColor,
                            fontWeight: 600, fontSize: 18, cursor: disabled ? 'not-allowed' : 'pointer',
                            transition: 'all 0.2s', display: 'flex', flexDirection: 'column',
                            alignItems: 'center', justifyContent: 'center', gap: 2,
                            opacity: disabled ? 0.5 : 1,
                            boxShadow: existingResult === 'teamA' ? `0 0 0 3px ${teamAColor}` : 'none',
                        }}
                    >
                        <span>{teamAName}</span>
                        <span style={{ fontSize: 12, opacity: 0.8 }}>wins</span>
                    </motion.button>

                    <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleTapScore('halved')}
                        disabled={disabled}
                        style={{
                            height: 80, borderRadius: '16px', border: `2px solid ${COLORS.border}`,
                            background: COLORS.surface, color: COLORS.textPrimary, fontWeight: 600, fontSize: 16,
                            cursor: disabled ? 'not-allowed' : 'pointer', display: 'flex', flexDirection: 'column',
                            alignItems: 'center', justifyContent: 'center', gap: 2, opacity: disabled ? 0.5 : 1,
                            boxShadow: existingResult === 'halved' ? `0 0 0 3px ${COLORS.textSecondary}` : 'none',
                        }}
                    >
                        <span>½</span>
                        <span style={{ fontSize: 11, opacity: 0.7 }}>halve</span>
                    </motion.button>

                    <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleTapScore('teamB')}
                        disabled={disabled}
                        style={{
                            height: 80, borderRadius: '16px', border: 'none',
                            background: activeSwipe === 'teamB' ? teamBColor : `${teamBColor}20`,
                            color: activeSwipe === 'teamB' ? '#fff' : teamBColor,
                            fontWeight: 600, fontSize: 18, cursor: disabled ? 'not-allowed' : 'pointer',
                            transition: 'all 0.2s', display: 'flex', flexDirection: 'column',
                            alignItems: 'center', justifyContent: 'center', gap: 2,
                            opacity: disabled ? 0.5 : 1,
                            boxShadow: existingResult === 'teamB' ? `0 0 0 3px ${teamBColor}` : 'none',
                        }}
                    >
                        <span>{teamBName}</span>
                        <span style={{ fontSize: 12, opacity: 0.8 }}>wins</span>
                    </motion.button>
                </motion.div>

                {/* Undo Button */}
                {canUndo && onUndo && (
                    <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={onUndo}
                        style={{
                            marginTop: '16px', width: '100%', height: 48, borderRadius: '12px',
                            border: `1px solid ${COLORS.green}40`, background: `${COLORS.green}10`,
                            color: COLORS.green, fontWeight: 500, fontSize: 14, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px',
                        }}
                    >
                        <RotateCcw size={16} />
                        Undo Last Score
                    </motion.button>
                )}

                {/* Hand Mode Indicator */}
                <div style={{
                    marginTop: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    gap: '4px', fontSize: '0.75rem', color: COLORS.textTertiary,
                }}>
                    <Hand size={14} />
                    <span>{preferredHand === 'left' ? 'Left' : 'Right'}-handed mode</span>
                </div>
            </div>
        </div>
    );
}

export default OneHandedScoringPanel;
