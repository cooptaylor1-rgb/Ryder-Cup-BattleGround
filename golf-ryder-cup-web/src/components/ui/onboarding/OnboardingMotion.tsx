'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
    BallMotion,
    CardStackMotion,
    FinalCallout,
    ONBOARDING_SPRING,
    PathMotion,
} from './OnboardingMotionPrimitives';

interface OnboardingMotionProps {
    currentStep: number;
    className?: string;
    forceReducedMotion?: boolean;
}

export function OnboardingMotion({
    currentStep,
    className,
    forceReducedMotion,
}: OnboardingMotionProps) {
    const prefersReducedMotion = useReducedMotion();
    const reducedMotion = forceReducedMotion ?? prefersReducedMotion ?? false;
    const step = Math.max(0, Math.min(4, currentStep));
    const transition = reducedMotion ? { duration: 0 } : ONBOARDING_SPRING;

    return (
        <svg
            viewBox="0 0 680 360"
            className={cn('onboarding-motion', className)}
            aria-hidden="true"
            preserveAspectRatio="xMidYMid meet"
        >
            <defs>
                <linearGradient id="onboarding-card-wash" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="var(--canvas-raised)" />
                    <stop offset="100%" stopColor="var(--canvas-warm)" />
                </linearGradient>
                <radialGradient id="onboarding-ambient-glow" cx="26%" cy="16%" r="46%">
                    <stop offset="0%" stopColor="var(--gold)" stopOpacity="0.26" />
                    <stop offset="100%" stopColor="var(--gold)" stopOpacity="0" />
                </radialGradient>
            </defs>

            <motion.circle
                cx="172"
                cy="78"
                r="92"
                fill="url(#onboarding-ambient-glow)"
                initial={false}
                animate={{
                    x: step * 6,
                    y: step === 4 ? 8 : 0,
                    opacity: step >= 3 ? 0.82 : 0.66,
                    scale: step === 4 ? 1.08 : 1,
                }}
                transition={transition}
            />

            <motion.path
                d="M0 226C98 210 176 208 270 210C358 212 456 188 590 150C632 138 660 134 680 132V360H0Z"
                fill="var(--masters)"
                initial={false}
                animate={{ x: step * -4, y: step >= 3 ? -6 : 0, opacity: 0.08 }}
                transition={transition}
            />
            <motion.path
                d="M0 266C94 252 176 256 270 242C364 228 474 214 680 204V360H0Z"
                fill="var(--gold)"
                initial={false}
                animate={{ x: step * 3, y: step === 4 ? 4 : 0, opacity: 0.06 }}
                transition={transition}
            />
            <motion.path
                d="M0 300C88 286 174 288 270 278C390 266 488 258 680 246V360H0Z"
                fill="var(--ink)"
                initial={false}
                animate={{ x: step * 2, y: step === 4 ? 6 : 0, opacity: 0.045 }}
                transition={transition}
            />

            <motion.g
                initial={false}
                animate={{
                    x: step >= 1 ? -10 : 0,
                    y: step >= 1 ? 6 : 0,
                    opacity: step === 0 ? 0.92 : 0.32,
                }}
                transition={transition}
            >
                <path
                    d="M62 246H122V218L100 196L82 210L68 196L62 204Z"
                    fill="var(--ink)"
                    opacity="0.11"
                />
                <path d="M92 188L96 176L100 188" fill="none" stroke="var(--gold)" strokeWidth="2" strokeLinecap="round" />
                <path d="M96 176V196" fill="none" stroke="var(--ink-secondary)" strokeWidth="1.5" strokeLinecap="round" />
                <rect x="70" y="212" width="46" height="18" rx="4" fill="var(--canvas-raised)" opacity="0.72" />
                <line x1="80" y1="220" x2="110" y2="220" stroke="var(--rule-strong)" strokeWidth="2" />
            </motion.g>

            <motion.g
                initial={false}
                animate={{
                    x: step >= 2 ? 8 : 0,
                    y: step >= 2 ? 4 : 0,
                    opacity: step < 4 ? 0.7 : 0.24,
                }}
                transition={transition}
            >
                <path d="M598 134V220" stroke="var(--ink-secondary)" strokeWidth="2.5" strokeLinecap="round" />
                <path
                    d="M598 140C610 146 624 145 636 138V170C624 178 610 178 598 172Z"
                    fill="var(--gold)"
                    opacity="0.82"
                />
                <circle cx="598" cy="230" r="10" fill="var(--canvas-raised)" stroke="var(--rule-strong)" strokeWidth="1.5" />
                <circle cx="598" cy="230" r="4" fill="var(--masters-deep)" />
            </motion.g>

            <CardStackMotion currentStep={step} reducedMotion={reducedMotion} />
            <PathMotion currentStep={step} reducedMotion={reducedMotion} />

            <motion.g
                initial={false}
                animate={{
                    x: 516,
                    y: 292,
                    opacity: step === 4 ? 1 : 0.08,
                    scale: step === 4 ? 1 : 0.8,
                }}
                transition={transition}
            >
                <path d="M0 0C18 -8 42 -8 62 0" fill="none" stroke="var(--masters)" strokeWidth="3" strokeLinecap="round" opacity="0.42" />
                <path d="M30 -44V0M18 0H42" fill="none" stroke="var(--gold-dark)" strokeWidth="4" strokeLinecap="round" />
            </motion.g>

            <motion.g
                initial={false}
                animate={{
                    x: 586,
                    y: 252,
                    opacity: step === 4 ? 1 : 0.14,
                    scale: step === 4 ? 1 : 0.86,
                }}
                transition={transition}
            >
                <path d="M0 -72V0" stroke="var(--ink-secondary)" strokeWidth="2.5" strokeLinecap="round" />
                <motion.path
                    d="M0 -66C14 -60 28 -60 42 -68V-34C28 -28 14 -28 0 -34Z"
                    fill="var(--masters-deep)"
                    animate={
                        step === 4 && !reducedMotion
                            ? { rotate: [0, -1.8, 0.8, 0], x: [0, 2, -1, 0] }
                            : { rotate: 0, x: 0 }
                    }
                    transition={
                        step === 4 && !reducedMotion
                            ? { duration: 3.2, repeat: Infinity, ease: 'easeInOut' }
                            : transition
                    }
                    style={{ transformBox: 'fill-box', transformOrigin: 'left center' }}
                />
            </motion.g>

            <BallMotion currentStep={step} reducedMotion={reducedMotion} />
            <FinalCallout currentStep={step} reducedMotion={reducedMotion} />
        </svg>
    );
}

export default OnboardingMotion;
