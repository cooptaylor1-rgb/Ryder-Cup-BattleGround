'use client';

import { AnimatePresence, motion, type Transition } from 'framer-motion';
import type { ReactNode } from 'react';

export const ONBOARDING_SPRING: Transition = {
    type: 'spring',
    stiffness: 120,
    damping: 20,
    mass: 0.9,
};

export const ONBOARDING_WORLD_WIDTH = 1320;

const DETAIL_EASE = [0.22, 1, 0.36, 1] as const;
const INSTANT: Transition = { duration: 0 };
const DETAIL_DURATION = 0.52;
const PATH_D =
    'M84 284C166 246 238 214 324 192C390 174 458 174 530 188C612 204 680 220 760 204C838 188 914 160 986 174C1062 188 1128 224 1194 274';

const CAMERA_FRAMES = [
    { x: 86, y: 8, scale: 1 },
    { x: -94, y: 2, scale: 1.02 },
    { x: -286, y: -6, scale: 1.035 },
    { x: -508, y: -10, scale: 1.05 },
    { x: -734, y: -4, scale: 1.035 },
] as const;

const BALL_FRAMES = [
    { x: 156, y: 244, scale: 0.96, rotate: -14, shadowScale: 1.02 },
    { x: 432, y: 188, scale: 1, rotate: -2, shadowScale: 1 },
    { x: 638, y: 196, scale: 0.98, rotate: 8, shadowScale: 0.96 },
    { x: 862, y: 160, scale: 0.96, rotate: 3, shadowScale: 0.92 },
    { x: 1092, y: 262, scale: 1.02, rotate: 0, shadowScale: 0.84 },
] as const;

const PATH_NODES = [
    { x: 176, y: 238 },
    { x: 430, y: 188 },
    { x: 634, y: 198 },
    { x: 860, y: 160 },
    { x: 1092, y: 266 },
] as const;

const PATH_PROGRESS = [0.18, 0.38, 0.6, 0.82, 1] as const;

const MAIN_CARD_STATES = [
    { x: 268, y: 156, rotate: -2.5, scaleX: 1, scaleY: 1, opacity: 1 },
    { x: 430, y: 160, rotate: -6, scaleX: 0.92, scaleY: 0.96, opacity: 1 },
    { x: 624, y: 154, rotate: -1, scaleX: 1.04, scaleY: 0.98, opacity: 1 },
    { x: 842, y: 156, rotate: 0, scaleX: 1.24, scaleY: 0.76, opacity: 1 },
    { x: 990, y: 258, rotate: -4, scaleX: 0.58, scaleY: 0.62, opacity: 0.82 },
] as const;

const SECONDARY_CARD_STATES = [
    { x: 300, y: 182, rotate: 6, scaleX: 0.84, scaleY: 0.88, opacity: 0.08 },
    { x: 534, y: 170, rotate: 3.5, scaleX: 0.88, scaleY: 0.92, opacity: 1 },
    { x: 614, y: 130, rotate: -2.5, scaleX: 0.92, scaleY: 0.94, opacity: 0.76 },
    { x: 906, y: 182, rotate: 7, scaleX: 0.68, scaleY: 0.72, opacity: 0.62 },
    { x: 1036, y: 250, rotate: 3, scaleX: 0.46, scaleY: 0.5, opacity: 0.2 },
] as const;

const TERTIARY_CARD_STATES = [
    { x: 232, y: 194, rotate: -8, scaleX: 0.74, scaleY: 0.78, opacity: 0 },
    { x: 594, y: 184, rotate: 8, scaleX: 0.8, scaleY: 0.84, opacity: 0.96 },
    { x: 666, y: 120, rotate: 4, scaleX: 0.64, scaleY: 0.68, opacity: 0.64 },
    { x: 954, y: 166, rotate: -5, scaleX: 0.52, scaleY: 0.56, opacity: 0.36 },
    { x: 1058, y: 240, rotate: 0, scaleX: 0.34, scaleY: 0.38, opacity: 0 },
] as const;

interface PrimitiveProps {
    currentStep: number;
    reducedMotion?: boolean;
}

interface SceneCameraMotionProps extends PrimitiveProps {
    children: ReactNode;
    depth?: number;
}

function getSpringTransition(reducedMotion = false): Transition {
    return reducedMotion ? INSTANT : ONBOARDING_SPRING;
}

function getDetailTransition(reducedMotion = false, delay = 0): Transition {
    return reducedMotion
        ? { duration: 0 }
        : {
              duration: DETAIL_DURATION,
              ease: DETAIL_EASE,
              delay,
          };
}

function PhaseGroup({
    active,
    reducedMotion = false,
    delay = 0,
    yHidden = 10,
    children,
}: {
    active: boolean;
    reducedMotion?: boolean;
    delay?: number;
    yHidden?: number;
    children: ReactNode;
}) {
    return (
        <motion.g
            initial={false}
            animate={{
                opacity: active ? 1 : 0,
                y: active ? 0 : yHidden,
            }}
            transition={getDetailTransition(reducedMotion, delay)}
        >
            {children}
        </motion.g>
    );
}

function AmbientDot({
    x,
    y,
    delay,
    reducedMotion,
}: {
    x: number;
    y: number;
    delay: number;
    reducedMotion: boolean;
}) {
    return (
        <motion.circle
            cx={x}
            cy={y}
            r="3.5"
            fill="var(--ink)"
            opacity={0.1}
            animate={
                reducedMotion
                    ? { opacity: 0.08 }
                    : { y: [0, -3, 0], opacity: [0.06, 0.14, 0.06] }
            }
            transition={
                reducedMotion
                    ? getSpringTransition(true)
                    : { duration: 4.2, ease: 'easeInOut', delay, repeat: Infinity }
            }
        />
    );
}

function ScoreLine({
    x,
    y,
    width,
    fill = 'var(--ink)',
    opacity = 0.12,
    delay = 0,
    reducedMotion,
}: {
    x: number;
    y: number;
    width: number;
    fill?: string;
    opacity?: number;
    delay?: number;
    reducedMotion: boolean;
}) {
    return (
        <motion.rect
            x={x}
            y={y}
            width={width}
            height="11"
            rx="5.5"
            fill={fill}
            initial={false}
            animate={{
                opacity,
                x,
                y,
            }}
            transition={getDetailTransition(reducedMotion, delay)}
        />
    );
}

function MainCardContent({ step, reducedMotion }: { step: number; reducedMotion: boolean }) {
    return (
        <>
            <PhaseGroup active={step === 0} reducedMotion={reducedMotion}>
                <rect x="-112" y="-80" width="224" height="28" rx="14" fill="var(--masters-deep)" />
                <rect x="-90" y="-36" width="74" height="10" rx="5" fill="var(--masters)" opacity="0.16" />
                <rect x="44" y="-36" width="34" height="10" rx="5" fill="var(--gold)" opacity="0.34" />
                {[-10, 20, 50, 80].map((y, index) => (
                    <motion.g
                        key={y}
                        initial={false}
                        animate={{ opacity: 1, y: 0 }}
                        transition={getDetailTransition(reducedMotion, 0.08 + index * 0.08)}
                    >
                        <line x1="-100" y1={y + 8} x2="100" y2={y + 8} stroke="var(--rule)" strokeWidth="1.5" />
                        <circle cx="-86" cy={y} r="5.5" fill={index % 2 === 0 ? 'var(--masters-deep)' : 'var(--gold)'} />
                        <ScoreLine x={-68} y={y - 6} width={68} reducedMotion={reducedMotion} />
                        <ScoreLine x={12} y={y - 6} width={54} fill="var(--ink-secondary)" opacity={0.16} reducedMotion={reducedMotion} />
                        <ScoreLine
                            x={76}
                            y={y - 6}
                            width={index % 2 === 0 ? 24 : 34}
                            fill={index % 2 === 0 ? 'var(--masters)' : 'var(--gold)'}
                            opacity={0.28}
                            reducedMotion={reducedMotion}
                        />
                    </motion.g>
                ))}
            </PhaseGroup>

            <PhaseGroup active={step === 1} reducedMotion={reducedMotion}>
                <rect x="-110" y="-80" width="220" height="28" rx="14" fill="var(--masters-deep)" />
                <circle cx="0" cy="-12" r="20" fill="rgba(255,255,255,0.88)" />
                <text
                    x="0"
                    y="-6"
                    textAnchor="middle"
                    fill="var(--ink)"
                    fontSize="16"
                    letterSpacing="1.2"
                    style={{ fontFamily: 'var(--font-sans)', fontWeight: 700 }}
                >
                    VS
                </text>
                {[
                    { x: -72, color: 'var(--masters-deep)' },
                    { x: 28, color: 'var(--gold-dark)' },
                ].map((column) => (
                    <g key={column.x}>
                        <rect x={column.x} y="10" width="42" height="58" rx="18" fill={column.color} opacity="0.92" />
                        <rect x={column.x + 4} y="-12" width="34" height="14" rx="7" fill="var(--canvas-raised)" opacity="0.9" />
                    </g>
                ))}
                <path d="M-92 86C-44 80 38 80 92 86" fill="none" stroke="var(--masters)" strokeWidth="3" strokeLinecap="round" opacity="0.38" />
            </PhaseGroup>

            <PhaseGroup active={step === 2} reducedMotion={reducedMotion}>
                <rect x="-112" y="-82" width="224" height="28" rx="14" fill="var(--masters-deep)" />
                <rect x="-18" y="-96" width="16" height="26" rx="8" fill="var(--gold)" />
                <rect x="8" y="-92" width="16" height="20" rx="8" fill="var(--ink)" opacity="0.16" />
                {[
                    { label: '7:40', y: -26 },
                    { label: '8:00', y: 2 },
                    { label: '8:20', y: 30 },
                    { label: '8:40', y: 58 },
                ].map((row, index) => (
                    <motion.g
                        key={row.label}
                        initial={false}
                        animate={{ opacity: 1, y: 0 }}
                        transition={getDetailTransition(reducedMotion, 0.1 + index * 0.06)}
                    >
                        <line x1="-102" y1={row.y + 14} x2="102" y2={row.y + 14} stroke="var(--rule)" strokeWidth="1.5" />
                        <text
                            x="-98"
                            y={row.y}
                            fill="var(--ink-secondary)"
                            fontSize="12"
                            letterSpacing="1.4"
                            style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}
                        >
                            {row.label}
                        </text>
                        <ScoreLine x={-28} y={row.y - 9} width={58} reducedMotion={reducedMotion} />
                        <ScoreLine x={38} y={row.y - 9} width={48} fill="var(--ink-secondary)" opacity={0.16} reducedMotion={reducedMotion} />
                        <circle cx="94" cy={row.y - 3} r="5.5" fill={index % 2 === 0 ? 'var(--gold)' : 'var(--masters-deep)'} />
                    </motion.g>
                ))}
            </PhaseGroup>

            <PhaseGroup active={step === 3} reducedMotion={reducedMotion} yHidden={6}>
                <path d="M-94 18C-44 -2 14 -8 58 6C84 14 94 26 98 42" fill="none" stroke="var(--gold)" strokeWidth="3" strokeLinecap="round" opacity="0.32" />
                <path d="M-96 28H66" stroke="var(--rule-strong)" strokeWidth="2" strokeLinecap="round" />
                {[-76, -24, 28, 80].map((x, index) => (
                    <motion.g
                        key={x}
                        initial={false}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={getDetailTransition(reducedMotion, 0.1 + index * 0.08)}
                        style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
                    >
                        <circle cx={x} cy="28" r="8.5" fill="var(--canvas-raised)" opacity="0.92" />
                        <circle cx={x} cy="28" r="4.5" fill={index % 2 === 0 ? 'var(--masters-deep)' : 'var(--gold)'} />
                    </motion.g>
                ))}
                <g transform="translate(90 -12)">
                    <path
                        d="M-28 -44H28V-8C28 18 14 40 0 50C-14 40 -28 18 -28 -8Z"
                        fill="none"
                        stroke="var(--gold)"
                        strokeWidth="3"
                        strokeLinejoin="round"
                    />
                    <path d="M-28 -44H28" stroke="var(--masters-deep)" strokeWidth="4" strokeLinecap="round" />
                    <path d="M0 -10L6 2H18L9 9L13 22L0 14L-13 22L-9 9L-18 2H-6Z" fill="var(--canvas-raised)" opacity="0.92" />
                </g>
            </PhaseGroup>

            <PhaseGroup active={step === 4} reducedMotion={reducedMotion} yHidden={4}>
                <rect x="-70" y="-32" width="60" height="56" rx="10" fill="var(--canvas-raised)" opacity="0.92" />
                <path d="M-58 -18H-28" stroke="var(--masters)" strokeWidth="2" strokeLinecap="round" opacity="0.32" />
                <path d="M-58 -4H-24" stroke="var(--rule-strong)" strokeWidth="2" strokeLinecap="round" />
                <path d="M-58 10H-32" stroke="var(--rule)" strokeWidth="1.5" strokeLinecap="round" />
                <circle cx="18" cy="0" r="10" fill="var(--gold)" opacity="0.24" />
            </PhaseGroup>
        </>
    );
}

function SlipCardContent({
    step,
    reducedMotion,
    tone,
}: {
    step: number;
    reducedMotion: boolean;
    tone: 'masters' | 'gold';
}) {
    const accent = tone === 'masters' ? 'var(--masters-deep)' : 'var(--gold-dark)';

    return (
        <>
            <PhaseGroup active={step === 1} reducedMotion={reducedMotion}>
                <rect x="-104" y="-72" width="208" height="24" rx="12" fill={accent} opacity="0.92" />
                {[-24, 4, 32, 60].map((y, index) => (
                    <motion.g
                        key={y}
                        initial={false}
                        animate={{ opacity: 1, y: 0 }}
                        transition={getDetailTransition(reducedMotion, 0.08 + index * 0.07)}
                    >
                        <ScoreLine x={-82} y={y - 4} width={60 + index * 8} reducedMotion={reducedMotion} />
                        <ScoreLine x={10} y={y - 4} width={34 + index * 10} fill="var(--ink-secondary)" opacity={0.18} reducedMotion={reducedMotion} />
                        <circle cx="78" cy={y} r="6" fill={index % 2 === 0 ? 'var(--gold)' : 'var(--masters-deep)'} />
                    </motion.g>
                ))}
            </PhaseGroup>

            <PhaseGroup active={step === 2} reducedMotion={reducedMotion}>
                <rect x="-34" y="-18" width="26" height="34" rx="11" fill="var(--gold)" />
                <rect x="4" y="-10" width="26" height="26" rx="11" fill="var(--ink)" opacity="0.14" />
                <rect x="-48" y="28" width="96" height="8" rx="4" fill="var(--masters-deep)" opacity="0.2" />
            </PhaseGroup>

            <PhaseGroup active={step === 3} reducedMotion={reducedMotion}>
                <path d="M-54 0H54" stroke="var(--rule-strong)" strokeWidth="2" strokeLinecap="round" />
                <circle cx="-28" cy="0" r="8" fill="var(--gold)" opacity="0.88" />
                <circle cx="0" cy="-6" r="8" fill="var(--masters-deep)" opacity="0.92" />
                <circle cx="28" cy="6" r="8" fill="var(--masters)" opacity="0.62" />
            </PhaseGroup>
        </>
    );
}

function SupportChipContent({ step, reducedMotion }: { step: number; reducedMotion: boolean }) {
    return (
        <>
            <PhaseGroup active={step === 1} reducedMotion={reducedMotion}>
                <circle cx="0" cy="0" r="22" fill="var(--canvas-raised)" opacity="0.92" />
                <circle cx="0" cy="0" r="11" fill="none" stroke="var(--rule-strong)" strokeWidth="1.5" />
                <path d="M-18 0H18" stroke="var(--masters)" strokeWidth="1.75" strokeLinecap="round" opacity="0.32" />
                <circle cx="-9" cy="0" r="5.5" fill="var(--masters-deep)" />
                <circle cx="9" cy="0" r="5.5" fill="var(--gold)" />
            </PhaseGroup>

            <PhaseGroup active={step === 2} reducedMotion={reducedMotion}>
                <rect x="-16" y="-30" width="16" height="28" rx="8" fill="var(--gold)" />
                <rect x="4" y="-22" width="16" height="20" rx="8" fill="var(--ink)" opacity="0.18" />
            </PhaseGroup>

            <PhaseGroup active={step === 3} reducedMotion={reducedMotion}>
                <circle cx="0" cy="0" r="10" fill="var(--gold)" opacity="0.84" />
                <circle cx="-18" cy="6" r="8" fill="var(--masters-deep)" />
                <circle cx="18" cy="-8" r="8" fill="var(--masters)" opacity="0.72" />
            </PhaseGroup>
        </>
    );
}

function CardShell({
    state,
    reducedMotion,
    currentStep,
    children,
}: {
    state: {
        x: number;
        y: number;
        rotate: number;
        scaleX: number;
        scaleY: number;
        opacity: number;
    };
    reducedMotion: boolean;
    currentStep: number;
    children: ReactNode;
}) {
    return (
        <motion.g
            initial={
                reducedMotion
                    ? false
                    : {
                          x: state.x + 24,
                          y: state.y + 16,
                          rotate: state.rotate - 1.5,
                          scaleX: state.scaleX * 0.94,
                          scaleY: state.scaleY * 0.94,
                          opacity: 0,
                      }
            }
            animate={state}
            transition={getSpringTransition(reducedMotion)}
            style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
        >
            <motion.ellipse
                cx="0"
                cy="98"
                rx="120"
                ry="14"
                fill="var(--ink)"
                initial={false}
                animate={{ opacity: currentStep >= 3 ? 0.08 : 0.12, scaleX: currentStep >= 3 ? 1.08 : 1 }}
                transition={getDetailTransition(reducedMotion)}
            />
            <rect
                x="-124"
                y="-86"
                width="248"
                height="172"
                rx="24"
                fill="var(--canvas-raised)"
                fillOpacity={currentStep >= 3 ? 0.86 : 0.92}
                stroke="var(--rule-strong)"
                strokeWidth="1.5"
            />
            <rect
                x="-124"
                y="-86"
                width="248"
                height="172"
                rx="24"
                fill="url(#onboarding-card-wash)"
                opacity={currentStep === 3 ? 0.18 : 0.3}
            />
            <rect
                x="-124"
                y="-86"
                width="248"
                height="172"
                rx="24"
                fill="none"
                stroke="rgba(255,255,255,0.42)"
                strokeWidth="1"
            />
            {children}
        </motion.g>
    );
}

export function SceneCameraMotion({
    currentStep,
    reducedMotion = false,
    depth = 1,
    children,
}: SceneCameraMotionProps) {
    const frame = CAMERA_FRAMES[currentStep];
    const scale = 1 + (frame.scale - 1) * depth;

    return (
        <motion.g
            initial={false}
            animate={{
                x: frame.x * depth,
                y: frame.y * (0.85 + depth * 0.15),
                scale,
            }}
            transition={getSpringTransition(reducedMotion)}
            style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
        >
            {children}
        </motion.g>
    );
}

export function AmbientMotion({ currentStep, reducedMotion = false }: PrimitiveProps) {
    const flagActive = currentStep === 4;

    return (
        <>
            <motion.circle
                cx="142"
                cy="70"
                r="88"
                fill="url(#onboarding-sun-glow)"
                initial={false}
                animate={{
                    x: currentStep * 10,
                    y: currentStep >= 3 ? -6 : 0,
                    opacity: currentStep >= 4 ? 0.42 : 0.28,
                    scale: currentStep >= 3 ? 1.08 : 1,
                }}
                transition={getSpringTransition(reducedMotion)}
            />
            <motion.circle
                cx="1112"
                cy="88"
                r="104"
                fill="url(#onboarding-end-glow)"
                initial={false}
                animate={{
                    opacity: currentStep === 4 ? 0.54 : 0.12,
                    scale: currentStep === 4 ? 1.08 : 0.92,
                }}
                transition={getSpringTransition(reducedMotion)}
            />

            <motion.g
                initial={false}
                animate={{
                    x: currentStep >= 1 ? -14 : 0,
                    y: currentStep >= 1 ? 6 : 0,
                    opacity: currentStep === 0 ? 0.94 : 0.28,
                }}
                transition={getSpringTransition(reducedMotion)}
            >
                <path
                    d="M70 260H136V230L114 204L94 218L82 206L70 216Z"
                    fill="var(--ink)"
                    opacity="0.11"
                />
                <path d="M110 196L114 182L118 196" fill="none" stroke="var(--gold)" strokeWidth="2" strokeLinecap="round" />
                <path d="M114 182V204" fill="none" stroke="var(--ink-secondary)" strokeWidth="1.5" strokeLinecap="round" />
                <rect x="84" y="224" width="44" height="16" rx="4" fill="var(--canvas-raised)" opacity="0.72" />
                <line x1="92" y1="232" x2="120" y2="232" stroke="var(--rule-strong)" strokeWidth="2" />
            </motion.g>

            <motion.g
                initial={false}
                animate={{
                    x: 1120,
                    y: 252,
                    opacity: flagActive ? 1 : 0.16,
                    scale: flagActive ? 1 : 0.88,
                }}
                transition={getSpringTransition(reducedMotion)}
            >
                <path d="M0 -78V0" stroke="var(--ink-secondary)" strokeWidth="2.5" strokeLinecap="round" />
                <motion.path
                    d="M0 -72C14 -66 30 -66 46 -74V-38C30 -32 14 -32 0 -38Z"
                    fill="var(--masters-deep)"
                    animate={
                        flagActive && !reducedMotion
                            ? { rotate: [0, -1.6, 0.8, 0], x: [0, 2, -1, 0] }
                            : { rotate: 0, x: 0 }
                    }
                    transition={
                        flagActive && !reducedMotion
                            ? { duration: 3.4, ease: 'easeInOut', repeat: Infinity }
                            : getSpringTransition(reducedMotion)
                    }
                    style={{ transformBox: 'fill-box', transformOrigin: 'left center' }}
                />
                <circle cx="0" cy="8" r="10" fill="var(--canvas-raised)" stroke="var(--rule-strong)" strokeWidth="1.5" />
                <circle cx="0" cy="8" r="4" fill="var(--masters-deep)" />
            </motion.g>

            <AmbientDot x={356} y={96} delay={0} reducedMotion={reducedMotion} />
            <AmbientDot x={520} y={128} delay={0.7} reducedMotion={reducedMotion} />
            <AmbientDot x={742} y={106} delay={1.3} reducedMotion={reducedMotion} />
            <AmbientDot x={970} y={138} delay={1.9} reducedMotion={reducedMotion} />
        </>
    );
}

export function CardMotion({ currentStep, reducedMotion = false }: PrimitiveProps) {
    return (
        <>
            <CardShell
                state={SECONDARY_CARD_STATES[currentStep]}
                reducedMotion={reducedMotion}
                currentStep={currentStep}
            >
                <SlipCardContent step={currentStep} reducedMotion={reducedMotion} tone="masters" />
            </CardShell>

            <CardShell
                state={TERTIARY_CARD_STATES[currentStep]}
                reducedMotion={reducedMotion}
                currentStep={currentStep}
            >
                <SlipCardContent step={currentStep} reducedMotion={reducedMotion} tone="gold" />
            </CardShell>

            <CardShell
                state={MAIN_CARD_STATES[currentStep]}
                reducedMotion={reducedMotion}
                currentStep={currentStep}
            >
                <MainCardContent step={currentStep} reducedMotion={reducedMotion} />
            </CardShell>

            <motion.g
                initial={
                    reducedMotion
                        ? false
                        : {
                              x: 262,
                              y: 214,
                              scale: 0.82,
                              opacity: 0,
                          }
                }
                animate={{
                    x: TERTIARY_CARD_STATES[currentStep].x,
                    y: TERTIARY_CARD_STATES[currentStep].y,
                    scale: TERTIARY_CARD_STATES[currentStep].scaleX,
                    opacity: currentStep === 0 ? 0 : TERTIARY_CARD_STATES[currentStep].opacity,
                }}
                transition={getSpringTransition(reducedMotion)}
                style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
            >
                <SupportChipContent step={currentStep} reducedMotion={reducedMotion} />
            </motion.g>
        </>
    );
}

export function PathMotion({ currentStep, reducedMotion = false }: PrimitiveProps) {
    const activeProgress = PATH_PROGRESS[currentStep];

    return (
        <g>
            <path
                d={PATH_D}
                fill="none"
                stroke="var(--masters)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0.14"
            />
            <motion.path
                d={PATH_D}
                fill="none"
                stroke="url(#onboarding-path-gradient)"
                strokeWidth="2.75"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={reducedMotion ? false : { pathLength: 0, opacity: 0 }}
                animate={{
                    pathLength: activeProgress,
                    opacity: currentStep >= 3 ? 0.96 : 0.86,
                }}
                transition={getSpringTransition(reducedMotion)}
            />

            {PATH_NODES.map((node, index) => {
                const isActive = currentStep === index;
                const isVisible = currentStep >= index;

                return (
                    <motion.g
                        key={`${node.x}-${node.y}`}
                        initial={false}
                        animate={{
                            x: node.x,
                            y: node.y,
                            scale: isActive ? 1.14 : 0.92,
                            opacity: isVisible ? 1 : 0.22,
                        }}
                        transition={getSpringTransition(reducedMotion)}
                        style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
                    >
                        <circle cx="0" cy="0" r="7" fill="var(--canvas-raised)" opacity="0.94" />
                        <circle
                            cx="0"
                            cy="0"
                            r="4.2"
                            fill={index % 2 === 0 ? 'var(--gold)' : 'var(--masters-deep)'}
                        />
                        <motion.circle
                            cx="0"
                            cy="0"
                            r="7"
                            fill="none"
                            stroke={index % 2 === 0 ? 'var(--gold)' : 'var(--masters)'}
                            strokeWidth="1.5"
                            animate={
                                isActive && !reducedMotion
                                    ? { scale: [1, 1.8], opacity: [0.3, 0] }
                                    : { scale: 1, opacity: 0 }
                            }
                            transition={
                                isActive && !reducedMotion
                                    ? { duration: 2.2, ease: 'easeOut', repeat: Infinity }
                                    : getDetailTransition(reducedMotion)
                            }
                            style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
                        />
                    </motion.g>
                );
            })}
        </g>
    );
}

export function BallMotion({ currentStep, reducedMotion = false }: PrimitiveProps) {
    const frame = BALL_FRAMES[currentStep];

    return (
        <>
            <motion.g
                initial={reducedMotion ? false : { x: 94, y: 290, scale: 0.8, opacity: 0 }}
                animate={{
                    x: frame.x,
                    y: frame.y + 18,
                    scale: frame.shadowScale,
                    opacity: currentStep === 4 ? 0.12 : 0.16,
                }}
                transition={getSpringTransition(reducedMotion)}
                style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
            >
                <ellipse cx="0" cy="0" rx="22" ry="6" fill="var(--ink)" />
            </motion.g>

            <motion.g
                initial={reducedMotion ? false : { x: 88, y: 286, scale: 0.84, rotate: -16, opacity: 0 }}
                animate={{
                    x: frame.x,
                    y: frame.y,
                    scale: frame.scale,
                    rotate: frame.rotate,
                    opacity: 1,
                }}
                transition={getSpringTransition(reducedMotion)}
                style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
            >
                <circle cx="0" cy="0" r="16" fill="var(--canvas-raised)" stroke="var(--rule-strong)" strokeWidth="1.5" />
                <g fill="var(--rule-strong)" opacity="0.56">
                    <circle cx="-7" cy="-8" r="1.7" />
                    <circle cx="2" cy="-8" r="1.7" />
                    <circle cx="8" cy="-2" r="1.7" />
                    <circle cx="-4" cy="4" r="1.7" />
                    <circle cx="6" cy="6" r="1.7" />
                </g>
                <circle cx="-5" cy="-10" r="3.2" fill="var(--canvas-raised)" opacity="0.74" />
            </motion.g>
        </>
    );
}

export function FinalCallout({ currentStep, reducedMotion = false }: PrimitiveProps) {
    return (
        <AnimatePresence>
            {currentStep === 4 && (
                <motion.g
                    key="cta"
                    initial={reducedMotion ? false : { x: 1032, y: 302, opacity: 0, scale: 0.94 }}
                    animate={{ x: 1032, y: 302, opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={getSpringTransition(reducedMotion)}
                    style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
                >
                    <rect
                        x="0"
                        y="0"
                        width="150"
                        height="38"
                        rx="19"
                        fill="rgba(255,255,255,0.82)"
                        stroke="rgba(255,255,255,0.92)"
                        strokeWidth="1"
                    />
                    <text
                        x="75"
                        y="23"
                        textAnchor="middle"
                        fill="var(--masters-deep)"
                        fontSize="11"
                        letterSpacing="2"
                        style={{ fontFamily: 'var(--font-sans)', fontWeight: 700, textTransform: 'uppercase' }}
                    >
                        Create the trip
                    </text>
                </motion.g>
            )}
        </AnimatePresence>
    );
}
