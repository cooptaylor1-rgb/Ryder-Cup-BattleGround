/**
 * SuccessConfetti Component — Phase 4: Polish & Delight
 *
 * Celebration confetti for success moments:
 * - Score submission success
 * - Match completion
 * - Achievement unlock
 * - Trip creation
 *
 * Creates memorable celebration moments.
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useHaptic } from '@/lib/hooks';

// ============================================
// TYPES
// ============================================

type ConfettiShape = 'circle' | 'square' | 'star' | 'triangle' | 'golf';

interface ConfettiPiece {
    id: number;
    x: number;
    y: number;
    size: number;
    color: string;
    shape: ConfettiShape;
    rotation: number;
    delay: number;
}

interface SuccessConfettiProps {
    isActive: boolean;
    duration?: number;
    pieceCount?: number;
    colors?: string[];
    shapes?: ConfettiShape[];
    spread?: 'narrow' | 'medium' | 'wide';
    origin?: { x: number; y: number };
    onComplete?: () => void;
}

// ============================================
// CONFETTI COLORS
// ============================================

const DEFAULT_COLORS = [
    '#FFD700', // Gold
    '#006747', // Masters Green
    '#0047AB', // USA Blue
    '#8B0000', // Europe Red
    '#22C55E', // Birdie Green
    '#F59E0B', // Amber
    '#EC4899', // Pink
    '#8B5CF6', // Purple
];

const GOLF_COLORS = ['#006747', '#FFD700', '#0047AB', '#8B0000', '#FFFFFF'];

// ============================================
// SHAPE RENDERER
// ============================================

function ConfettiShapeRenderer({ shape, size, color }: { shape: ConfettiShape; size: number; color: string }) {
    switch (shape) {
        case 'circle':
            return (
                <div
                    style={{
                        width: size,
                        height: size,
                        borderRadius: '50%',
                        background: color,
                    }}
                />
            );
        case 'square':
            return (
                <div
                    style={{
                        width: size,
                        height: size,
                        background: color,
                    }}
                />
            );
        case 'triangle':
            return (
                <div
                    style={{
                        width: 0,
                        height: 0,
                        borderLeft: `${size / 2}px solid transparent`,
                        borderRight: `${size / 2}px solid transparent`,
                        borderBottom: `${size}px solid ${color}`,
                    }}
                />
            );
        case 'star':
            return (
                <div
                    style={{
                        width: size,
                        height: size,
                        background: color,
                        clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)',
                    }}
                />
            );
        case 'golf':
            return (
                <span style={{ fontSize: size * 0.8 }}>⛳</span>
            );
        default:
            return (
                <div
                    style={{
                        width: size,
                        height: size,
                        borderRadius: '50%',
                        background: color,
                    }}
                />
            );
    }
}

// ============================================
// MAIN COMPONENT
// ============================================

export function SuccessConfetti({
    isActive,
    duration = 3000,
    pieceCount = 50,
    colors = DEFAULT_COLORS,
    shapes = ['circle', 'square', 'star'],
    spread = 'wide',
    origin,
    onComplete,
}: SuccessConfettiProps) {
    const haptic = useHaptic();
    const [pieces, setPieces] = useState<ConfettiPiece[]>([]);

    // Generate confetti pieces
    const generatePieces = useCallback(() => {
        const spreadValues = {
            narrow: 0.3,
            medium: 0.6,
            wide: 1,
        };
        const spreadMultiplier = spreadValues[spread];

        return Array.from({ length: pieceCount }, (_, i) => ({
            id: i,
            x: origin ? origin.x : 50 + (Math.random() - 0.5) * 50 * spreadMultiplier,
            y: origin ? origin.y : 30 + Math.random() * 20,
            size: 8 + Math.random() * 10,
            color: colors[Math.floor(Math.random() * colors.length)],
            shape: shapes[Math.floor(Math.random() * shapes.length)],
            rotation: Math.random() * 360,
            delay: Math.random() * 0.3,
        }));
    }, [pieceCount, colors, shapes, spread, origin]);

    useEffect(() => {
        if (isActive) {
            haptic.heavy();
            setPieces(generatePieces());

            const timer = setTimeout(() => {
                setPieces([]);
                onComplete?.();
            }, duration);

            return () => clearTimeout(timer);
        } else {
            setPieces([]);
        }
    }, [isActive, duration, generatePieces, haptic, onComplete]);

    if (pieces.length === 0) return null;

    return (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
            <AnimatePresence>
                {pieces.map((piece) => (
                    <motion.div
                        key={piece.id}
                        initial={{
                            x: `${piece.x}vw`,
                            y: `${piece.y}vh`,
                            scale: 0,
                            rotate: 0,
                            opacity: 1,
                        }}
                        animate={{
                            y: '120vh',
                            scale: 1,
                            rotate: piece.rotation + Math.random() * 720,
                            opacity: [1, 1, 0],
                        }}
                        transition={{
                            duration: 2 + Math.random() * 1.5,
                            delay: piece.delay,
                            ease: [0.25, 0.46, 0.45, 0.94],
                        }}
                        className="absolute"
                    >
                        <ConfettiShapeRenderer
                            shape={piece.shape}
                            size={piece.size}
                            color={piece.color}
                        />
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
}

// ============================================
// CONFETTI CANNON (burst from point)
// ============================================

interface ConfettiCannonProps {
    isActive: boolean;
    origin: { x: number; y: number };
    direction?: 'up' | 'left' | 'right' | 'all';
    pieceCount?: number;
    colors?: string[];
    onComplete?: () => void;
}

export function ConfettiCannon({
    isActive,
    origin,
    direction = 'up',
    pieceCount = 30,
    colors = DEFAULT_COLORS,
    onComplete,
}: ConfettiCannonProps) {
    const haptic = useHaptic();
    const [pieces, setPieces] = useState<ConfettiPiece[]>([]);

    useEffect(() => {
        if (isActive) {
            haptic.medium();

            const newPieces = Array.from({ length: pieceCount }, (_, i) => {
                // Calculate angle based on direction
                let baseAngle = -90; // Up by default
                let angleSpread = 60;

                if (direction === 'left') {
                    baseAngle = 180;
                    angleSpread = 45;
                } else if (direction === 'right') {
                    baseAngle = 0;
                    angleSpread = 45;
                } else if (direction === 'all') {
                    baseAngle = Math.random() * 360;
                    angleSpread = 0;
                }

                const angle = baseAngle + (Math.random() - 0.5) * angleSpread * 2;
                const velocity = 300 + Math.random() * 200;

                return {
                    id: i,
                    x: origin.x,
                    y: origin.y,
                    size: 8 + Math.random() * 8,
                    color: colors[Math.floor(Math.random() * colors.length)],
                    shape: (['circle', 'square', 'star'] as ConfettiShape[])[Math.floor(Math.random() * 3)],
                    rotation: Math.random() * 360,
                    delay: Math.random() * 0.1,
                    // Store angle and velocity for animation
                    angle,
                    velocity,
                } as ConfettiPiece & { angle: number; velocity: number };
            });

            setPieces(newPieces as ConfettiPiece[]);

            const timer = setTimeout(() => {
                setPieces([]);
                onComplete?.();
            }, 2000);

            return () => clearTimeout(timer);
        }
    }, [isActive, origin, direction, pieceCount, colors, haptic, onComplete]);

    return (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
            <AnimatePresence>
                {pieces.map((piece) => {
                    const extendedPiece = piece as ConfettiPiece & { angle?: number; velocity?: number };
                    const angle = extendedPiece.angle ?? -90;
                    const velocity = extendedPiece.velocity ?? 300;
                    const endX = piece.x + Math.cos((angle * Math.PI) / 180) * velocity;
                    const endY = piece.y + Math.sin((angle * Math.PI) / 180) * velocity;

                    return (
                        <motion.div
                            key={piece.id}
                            initial={{
                                x: piece.x,
                                y: piece.y,
                                scale: 0,
                                rotate: 0,
                                opacity: 1,
                            }}
                            animate={{
                                x: [piece.x, endX, endX + (Math.random() - 0.5) * 100],
                                y: [piece.y, endY, endY + 500], // Gravity
                                scale: [0, 1, 0.5],
                                rotate: piece.rotation + 720,
                                opacity: [1, 1, 0],
                            }}
                            transition={{
                                duration: 1.5,
                                delay: piece.delay,
                                ease: [0.25, 0.1, 0.25, 1],
                            }}
                            className="absolute"
                            style={{ left: 0, top: 0 }}
                        >
                            <ConfettiShapeRenderer
                                shape={piece.shape}
                                size={piece.size}
                                color={piece.color}
                            />
                        </motion.div>
                    );
                })}
            </AnimatePresence>
        </div>
    );
}

// ============================================
// GOLF CELEBRATION (themed confetti)
// ============================================

interface GolfCelebrationProps {
    type: 'birdie' | 'eagle' | 'ace' | 'win';
    isActive: boolean;
    onComplete?: () => void;
}

export function GolfCelebration({ type, isActive, onComplete }: GolfCelebrationProps) {
    const config = {
        birdie: {
            pieceCount: 30,
            colors: ['#22C55E', '#15803D', '#FFD700', '#FFFFFF'],
            shapes: ['circle', 'star', 'golf'] as ConfettiShape[],
        },
        eagle: {
            pieceCount: 50,
            colors: ['#3B82F6', '#1D4ED8', '#FFD700', '#FFFFFF'],
            shapes: ['circle', 'star', 'golf'] as ConfettiShape[],
        },
        ace: {
            pieceCount: 100,
            colors: ['#FFD700', '#F59E0B', '#FFFFFF', '#006747'],
            shapes: ['star', 'circle', 'golf'] as ConfettiShape[],
        },
        win: {
            pieceCount: 80,
            colors: GOLF_COLORS,
            shapes: ['star', 'circle', 'square', 'golf'] as ConfettiShape[],
        },
    };

    const { pieceCount, colors, shapes } = config[type];

    return (
        <SuccessConfetti
            isActive={isActive}
            pieceCount={pieceCount}
            colors={colors}
            shapes={shapes}
            duration={type === 'ace' ? 4000 : 3000}
            spread={type === 'ace' ? 'wide' : 'medium'}
            onComplete={onComplete}
        />
    );
}

// ============================================
// USE CONFETTI HOOK
// ============================================

export function useConfetti() {
    const [isActive, setIsActive] = useState(false);
    const [config, setConfig] = useState<Partial<SuccessConfettiProps>>({});

    const trigger = useCallback((options?: Partial<SuccessConfettiProps>) => {
        setConfig(options || {});
        setIsActive(true);
    }, []);

    const stop = useCallback(() => {
        setIsActive(false);
    }, []);

    return {
        isActive,
        config,
        trigger,
        stop,
        ConfettiComponent: () => (
            <SuccessConfetti
                isActive={isActive}
                onComplete={stop}
                {...config}
            />
        ),
    };
}

export default SuccessConfetti;
