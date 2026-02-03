/**
 * Success Celebration Component
 *
 * Premium celebration animations for achievements,
 * completed matches, and tournament victories.
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { CelebrationIllustration } from './illustrations';
import { useHaptic } from '@/lib/hooks';

// ============================================
// CONFETTI PARTICLE
// ============================================

interface ConfettiParticle {
    id: number;
    x: number;
    delay: number;
    duration: number;
    rotation: number;
    color: string;
}

const CONFETTI_COLORS = [
    'var(--usa-primary)',
    'var(--usa-secondary)',
    'var(--europe-primary)',
    'var(--europe-secondary)',
    'var(--gold)',
    'var(--masters)',
];

function generateConfetti(count: number): ConfettiParticle[] {
    // Randomness is OK here (runs on activation), but must not occur during render.
    return Array.from({ length: count }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        delay: Math.random() * 500,
        duration: 2000 + Math.random() * 1000,
        rotation: Math.random() * 360,
        color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
    }));
}

// ============================================
// CONFETTI BURST
// ============================================

interface ConfettiBurstProps {
    active: boolean;
    particleCount?: number;
    onComplete?: () => void;
}

export function ConfettiBurst({
    active,
    particleCount = 50,
    onComplete,
}: ConfettiBurstProps) {
    const [particles, setParticles] = useState<ConfettiParticle[]>([]);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (!active) return;

        // Defer local state updates so we don't synchronously setState in an effect body.
        const kickoff = setTimeout(() => {
            setParticles(generateConfetti(particleCount));
            setIsVisible(true);
        }, 0);

        const timeout = setTimeout(() => {
            setIsVisible(false);
            onComplete?.();
        }, 3500);

        return () => {
            clearTimeout(kickoff);
            clearTimeout(timeout);
        };
    }, [active, particleCount, onComplete]);

    if (!isVisible) return null;

    return (
        <div className="confetti-container" aria-hidden="true">
            {particles.map((particle) => (
                <div
                    key={particle.id}
                    className="confetti-particle"
                    style={{
                        left: `${particle.x}%`,
                        animationDelay: `${particle.delay}ms`,
                        animationDuration: `${particle.duration}ms`,
                        transform: `rotate(${particle.rotation}deg)`,
                        backgroundColor: particle.color,
                    }}
                />
            ))}
        </div>
    );
}

// ============================================
// SUCCESS OVERLAY
// ============================================

interface SuccessOverlayProps {
    show: boolean;
    title: string;
    subtitle?: string;
    onDismiss?: () => void;
    duration?: number;
    variant?: 'default' | 'victory' | 'achievement';
}

export function SuccessOverlay({
    show,
    title,
    subtitle,
    onDismiss,
    duration = 3000,
    variant = 'default',
}: SuccessOverlayProps) {
    const haptic = useHaptic();
    const [isVisible, setIsVisible] = useState(false);
    const [isExiting, setIsExiting] = useState(false);

    useEffect(() => {
        if (!show) return;

        const kickoff = setTimeout(() => {
            setIsVisible(true);
            setIsExiting(false);
            haptic.success();
        }, 0);

        const exitTimeout = setTimeout(() => {
            setIsExiting(true);
        }, duration - 300);

        const hideTimeout = setTimeout(() => {
            setIsVisible(false);
            onDismiss?.();
        }, duration);

        return () => {
            clearTimeout(kickoff);
            clearTimeout(exitTimeout);
            clearTimeout(hideTimeout);
        };
    }, [show, duration, onDismiss, haptic]);

    if (!isVisible) return null;

    return (
        <div
            className={cn(
                'success-overlay',
                isExiting && 'exiting',
                variant
            )}
            onClick={onDismiss}
            role="status"
            aria-live="polite"
        >
            <ConfettiBurst active={show && variant === 'victory'} />

            <div className="success-overlay-content">
                {/* Checkmark animation */}
                <div className="success-checkmark">
                    <svg viewBox="0 0 52 52" className="success-checkmark-svg">
                        <circle
                            className="success-checkmark-circle"
                            cx="26"
                            cy="26"
                            r="24"
                        />
                        <path
                            className="success-checkmark-check"
                            d="M14 27l7 7 16-16"
                        />
                    </svg>
                </div>

                <h2 className="success-overlay-title">{title}</h2>
                {subtitle && (
                    <p className="success-overlay-subtitle">{subtitle}</p>
                )}
            </div>
        </div>
    );
}

// ============================================
// VICTORY CELEBRATION
// For tournament/match wins
// ============================================

interface VictoryCelebrationProps {
    show: boolean;
    winner: 'USA' | 'Europe' | 'Tie';
    score?: { teamA: number; teamB: number };
    onDismiss?: () => void;
}

export function VictoryCelebration({
    show,
    winner,
    score,
    onDismiss,
}: VictoryCelebrationProps) {
    const haptic = useHaptic();
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (!show) return;
        const kickoff = setTimeout(() => {
            setIsVisible(true);
            haptic.scoreWin();
        }, 0);
        return () => clearTimeout(kickoff);
    }, [show, haptic]);

    const handleDismiss = useCallback(() => {
        setIsVisible(false);
        onDismiss?.();
    }, [onDismiss]);

    if (!isVisible) return null;

    const winnerText = winner === 'Tie' ? "It's a tie!" : `${winner} wins!`;
    const teamColor = winner === 'USA' ? 'var(--team-usa)' :
        winner === 'Europe' ? 'var(--team-europe)' :
            'var(--gold)';

    return (
        <div className="victory-celebration" onClick={handleDismiss}>
            <ConfettiBurst active={show} particleCount={80} />

            <div className="victory-celebration-content">
                <CelebrationIllustration size="xl" animated />

                <h1
                    className="victory-celebration-title"
                    style={{ color: teamColor }}
                >
                    {winnerText}
                </h1>

                {score && (
                    <div className="victory-celebration-score">
                        <span
                            className="victory-score-team"
                            style={{ color: 'var(--team-usa)' }}
                        >
                            {score.teamA}
                        </span>
                        <span className="victory-score-separator">-</span>
                        <span
                            className="victory-score-team"
                            style={{ color: 'var(--team-europe)' }}
                        >
                            {score.teamB}
                        </span>
                    </div>
                )}

                <button className="victory-celebration-button">
                    Continue
                </button>
            </div>
        </div>
    );
}

// ============================================
// POINT SCORED ANIMATION
// Quick feedback for scoring
// ============================================

interface PointScoredProps {
    show: boolean;
    team: 'USA' | 'Europe';
    points?: number;
    position?: { x: number; y: number };
}

export function PointScored({
    show,
    team,
    points = 1,
    position,
}: PointScoredProps) {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (!show) return;

        const kickoff = setTimeout(() => {
            setIsVisible(true);
        }, 0);
        const timeout = setTimeout(() => setIsVisible(false), 1000);

        return () => {
            clearTimeout(kickoff);
            clearTimeout(timeout);
        };
    }, [show]);

    if (!isVisible) return null;

    const teamColor = team === 'USA' ? 'var(--team-usa)' : 'var(--team-europe)';
    const pointText = points === 0.5 ? '½' : `+${points}`;

    return (
        <div
            className="point-scored"
            style={{
                color: teamColor,
                left: position?.x,
                top: position?.y,
            }}
            aria-hidden="true"
        >
            {pointText}
        </div>
    );
}

// ============================================
// ACHIEVEMENT BADGE
// For unlocking achievements
// ============================================

interface AchievementBadgeProps {
    show: boolean;
    title: string;
    description?: string;
    icon?: React.ReactNode;
    onDismiss?: () => void;
}

export function AchievementBadge({
    show,
    title,
    description,
    icon,
    onDismiss,
}: AchievementBadgeProps) {
    const haptic = useHaptic();
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (!show) return;

        const kickoff = setTimeout(() => {
            setIsVisible(true);
            haptic.success();
        }, 0);

        const timeout = setTimeout(() => {
            setIsVisible(false);
            onDismiss?.();
        }, 4000);

        return () => {
            clearTimeout(kickoff);
            clearTimeout(timeout);
        };
    }, [show, haptic, onDismiss]);

    if (!isVisible) return null;

    return (
        <div className="achievement-badge" role="status">
            <div className="achievement-badge-icon">
                {icon || (
                    <svg viewBox="0 0 24 24" className="w-6 h-6">
                        <path
                            fill="currentColor"
                            d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
                        />
                    </svg>
                )}
            </div>
            <div className="achievement-badge-content">
                <p className="achievement-badge-title">{title}</p>
                {description && (
                    <p className="achievement-badge-description">{description}</p>
                )}
            </div>
        </div>
    );
}

export default SuccessOverlay;
