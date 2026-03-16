'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
    AmbientMotion,
    BallMotion,
    CardMotion,
    FinalCallout,
    ONBOARDING_SPRING,
    ONBOARDING_WORLD_WIDTH,
    PathMotion,
    SceneCameraMotion,
} from './OnboardingMotionPrimitives';

interface OnboardingMotionProps {
    currentStep: number;
    className?: string;
    forceReducedMotion?: boolean;
}

function TerrainContours({
    currentStep,
    reducedMotion,
}: {
    currentStep: number;
    reducedMotion: boolean;
}) {
    const transition = reducedMotion ? { duration: 0 } : ONBOARDING_SPRING;

    return (
        <>
            <motion.path
                d={`M0 224C142 202 282 196 430 198C602 202 772 176 916 142C1042 112 1180 110 1320 134V360H0Z`}
                fill="url(#onboarding-terrain-back)"
                initial={false}
                animate={{
                    x: currentStep * -8,
                    y: currentStep >= 3 ? -8 : 0,
                    opacity: 0.28,
                }}
                transition={transition}
            />
            <motion.path
                d={`M0 268C138 252 282 252 426 238C584 224 738 210 892 202C1056 192 1178 204 1320 226V360H0Z`}
                fill="url(#onboarding-terrain-mid)"
                initial={false}
                animate={{
                    x: currentStep * 5,
                    y: currentStep === 4 ? 6 : 0,
                    opacity: 0.3,
                }}
                transition={transition}
            />
            <motion.path
                d={`M0 312C150 298 292 294 436 284C620 270 790 260 920 254C1064 248 1180 254 1320 270V360H0Z`}
                fill="url(#onboarding-terrain-front)"
                initial={false}
                animate={{
                    x: currentStep * 3,
                    y: currentStep === 4 ? 8 : 0,
                    opacity: 0.26,
                }}
                transition={transition}
            />
        </>
    );
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
                <linearGradient id="onboarding-sky-wash" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="rgba(255,255,255,0.92)" />
                    <stop offset="52%" stopColor="rgba(247,241,228,0.82)" />
                    <stop offset="100%" stopColor="rgba(239,231,214,0.88)" />
                </linearGradient>
                <linearGradient id="onboarding-path-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="var(--masters)" />
                    <stop offset="58%" stopColor="var(--masters-deep)" />
                    <stop offset="100%" stopColor="var(--gold-dark)" />
                </linearGradient>
                <linearGradient id="onboarding-terrain-back" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="rgba(0,102,68,0.2)" />
                    <stop offset="100%" stopColor="rgba(0,77,51,0.06)" />
                </linearGradient>
                <linearGradient id="onboarding-terrain-mid" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="rgba(201,162,39,0.12)" />
                    <stop offset="100%" stopColor="rgba(0,77,51,0.1)" />
                </linearGradient>
                <linearGradient id="onboarding-terrain-front" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="rgba(26,24,21,0.12)" />
                    <stop offset="100%" stopColor="rgba(26,24,21,0.03)" />
                </linearGradient>
                <radialGradient id="onboarding-sun-glow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="var(--gold)" stopOpacity="0.22" />
                    <stop offset="100%" stopColor="var(--gold)" stopOpacity="0" />
                </radialGradient>
                <radialGradient id="onboarding-end-glow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="rgba(201,162,39,0.24)" />
                    <stop offset="100%" stopColor="rgba(201,162,39,0)" />
                </radialGradient>
            </defs>

            <rect x="0" y="0" width="680" height="360" fill="url(#onboarding-sky-wash)" />

            <motion.ellipse
                cx="216"
                cy="52"
                rx="164"
                ry="82"
                fill="url(#onboarding-sun-glow)"
                initial={false}
                animate={{
                    x: step * 10,
                    opacity: step === 4 ? 0.18 : 0.1,
                    scale: step >= 3 ? 1.04 : 1,
                }}
                transition={transition}
            />

            <SceneCameraMotion currentStep={step} reducedMotion={reducedMotion} depth={0.56}>
                <TerrainContours currentStep={step} reducedMotion={reducedMotion} />
            </SceneCameraMotion>

            <SceneCameraMotion currentStep={step} reducedMotion={reducedMotion}>
                <rect
                    x="0"
                    y="0"
                    width={ONBOARDING_WORLD_WIDTH}
                    height="360"
                    fill="none"
                    pointerEvents="none"
                />
                <AmbientMotion currentStep={step} reducedMotion={reducedMotion} />
                <PathMotion currentStep={step} reducedMotion={reducedMotion} />
                <CardMotion currentStep={step} reducedMotion={reducedMotion} />

                <motion.g
                    initial={false}
                    animate={{
                        x: 1090,
                        y: 288,
                        opacity: step === 4 ? 1 : 0.08,
                        scale: step === 4 ? 1 : 0.82,
                    }}
                    transition={transition}
                >
                    <path
                        d="M0 0C18 -9 42 -9 66 0"
                        fill="none"
                        stroke="var(--masters)"
                        strokeWidth="3"
                        strokeLinecap="round"
                        opacity="0.4"
                    />
                    <path
                        d="M32 -42V0M18 0H46"
                        fill="none"
                        stroke="var(--gold-dark)"
                        strokeWidth="4"
                        strokeLinecap="round"
                    />
                </motion.g>

                <BallMotion currentStep={step} reducedMotion={reducedMotion} />
                <FinalCallout currentStep={step} reducedMotion={reducedMotion} />
            </SceneCameraMotion>

            <motion.rect
                x="0"
                y="0"
                width="680"
                height="360"
                fill="rgba(26,24,21,0.04)"
                initial={false}
                animate={{ opacity: step >= 3 ? 0.06 : 0.03 }}
                transition={transition}
                style={{ mixBlendMode: 'multiply' }}
            />
        </svg>
    );
}

export default OnboardingMotion;
