'use client';

import { AnimatePresence, motion, type Transition } from 'framer-motion';
import type { ReactNode } from 'react';

export const ONBOARDING_SPRING: Transition = {
    type: 'spring',
    stiffness: 120,
    damping: 20,
};

const INSTANT: Transition = { duration: 0 };

const PATH_D =
    'M58 278C126 248 204 214 280 210C350 206 408 232 468 200C526 170 576 152 620 138';

const PATH_POINTS = [
    { x: 122, y: 274, scale: 0.96, rotate: -8 },
    { x: 340, y: 188, scale: 1, rotate: 0 },
    { x: 366, y: 72, scale: 0.94, rotate: -4 },
    { x: 488, y: 200, scale: 0.95, rotate: 4 },
    { x: 522, y: 280, scale: 1.02, rotate: 8 },
] as const;

const PATH_REVEAL = [0.24, 0.46, 0.68, 0.88, 1] as const;

const PRIMARY_CARD_STATES = [
    { x: 470, y: 128, rotate: -4, scale: 1.02, opacity: 1 },
    { x: 184, y: 176, rotate: -6, scale: 0.92, opacity: 1 },
    { x: 248, y: 174, rotate: -1.5, scale: 1.08, opacity: 1 },
    { x: 192, y: 192, rotate: -2, scale: 0.98, opacity: 0.84 },
    { x: 118, y: 284, rotate: -4, scale: 0.58, opacity: 0.92 },
] as const;

const SECONDARY_CARD_STATES = [
    { x: 548, y: 196, rotate: 4, scale: 0.66, opacity: 0.1 },
    { x: 494, y: 178, rotate: 3, scale: 0.96, opacity: 1 },
    { x: 352, y: 74, rotate: 0, scale: 0.46, opacity: 0.9 },
    { x: 530, y: 174, rotate: 1.5, scale: 0.84, opacity: 1 },
    { x: 584, y: 114, rotate: 2, scale: 0.3, opacity: 0 },
] as const;

const SUPPORT_CARD_STATES = [
    { x: 140, y: 284, scale: 0.8, opacity: 1 },
    { x: 344, y: 188, scale: 1, opacity: 1 },
    { x: 350, y: 60, scale: 0.7, opacity: 1 },
    { x: 404, y: 212, scale: 0.68, opacity: 0.84 },
    { x: 558, y: 134, scale: 0.38, opacity: 0 },
] as const;

interface PrimitiveProps {
    currentStep: number;
    reducedMotion?: boolean;
}

function getTransition(reducedMotion = false): Transition {
    return reducedMotion ? INSTANT : ONBOARDING_SPRING;
}

function getOpacity(step: number, targetStep: number, dim = 0) {
    return step === targetStep ? 1 : dim;
}

function ClubhouseCardContent({ step }: { step: number }) {
    return (
        <>
            <motion.g animate={{ opacity: getOpacity(step, 0, 0) }} transition={ONBOARDING_SPRING}>
                <rect x="-98" y="-56" width="68" height="10" rx="5" fill="var(--masters)" opacity="0.14" />
                <rect x="18" y="-56" width="30" height="10" rx="5" fill="var(--gold)" opacity="0.32" />
                <rect x="56" y="-56" width="26" height="10" rx="5" fill="var(--ink-faint)" opacity="0.72" />
                {[-22, 8, 38, 68].map((y, index) => (
                    <g key={y}>
                        <line x1="-108" y1={y + 8} x2="108" y2={y + 8} stroke="var(--rule)" strokeWidth="1.5" />
                        <circle
                            cx="-92"
                            cy={y}
                            r="5.5"
                            fill={index % 2 === 0 ? 'var(--masters-deep)' : 'var(--gold)'}
                        />
                        <rect x="-74" y={y - 6} width="76" height="11" rx="5.5" fill="var(--ink)" opacity="0.13" />
                        <rect x="12" y={y - 6} width="54" height="11" rx="5.5" fill="var(--ink-secondary)" opacity="0.18" />
                        <rect
                            x="74"
                            y={y - 6}
                            width={index % 2 === 0 ? 28 : 36}
                            height="11"
                            rx="5.5"
                            fill={index % 2 === 0 ? 'var(--masters)' : 'var(--gold)'}
                            opacity="0.3"
                        />
                    </g>
                ))}
            </motion.g>

            <motion.g animate={{ opacity: getOpacity(step, 1, 0) }} transition={ONBOARDING_SPRING}>
                <rect x="-114" y="-82" width="228" height="28" rx="14" fill="var(--masters-deep)" />
                {[-24, 4, 32, 60].map((y, index) => (
                    <g key={y}>
                        <rect x="-92" y={y - 4} width={64 + index * 8} height="9" rx="4.5" fill="var(--ink)" opacity="0.12" />
                        <rect x="10" y={y - 4} width={34 + index * 10} height="9" rx="4.5" fill="var(--ink-secondary)" opacity="0.18" />
                        <circle cx="76" cy={y} r="6.5" fill={index % 2 === 0 ? 'var(--gold)' : 'var(--masters)'} />
                    </g>
                ))}
                <line x1="-100" y1="92" x2="96" y2="92" stroke="var(--rule-strong)" strokeWidth="1.5" />
            </motion.g>

            <motion.g animate={{ opacity: getOpacity(step, 2, 0) }} transition={ONBOARDING_SPRING}>
                <rect x="-114" y="-88" width="228" height="30" rx="15" fill="var(--masters-deep)" />
                <rect x="-16" y="-100" width="18" height="28" rx="9" fill="var(--gold)" />
                <rect x="10" y="-92" width="18" height="20" rx="9" fill="var(--ink-faint)" opacity="0.76" />
                {[
                    { y: -30, label: '7:40' },
                    { y: -2, label: '8:00' },
                    { y: 26, label: '8:20' },
                    { y: 54, label: '8:40' },
                ].map((row, index) => (
                    <g key={row.label}>
                        <line x1="-104" y1={row.y + 14} x2="104" y2={row.y + 14} stroke="var(--rule)" strokeWidth="1.5" />
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
                        <rect x="-28" y={row.y - 9} width="56" height="11" rx="5.5" fill="var(--ink)" opacity="0.12" />
                        <rect x="34" y={row.y - 9} width="50" height="11" rx="5.5" fill="var(--ink-secondary)" opacity="0.16" />
                        <circle cx="92" cy={row.y - 3} r="5.5" fill={index % 2 === 0 ? 'var(--gold)' : 'var(--masters-deep)'} />
                    </g>
                ))}
            </motion.g>

            <motion.g animate={{ opacity: getOpacity(step, 3, 0) }} transition={ONBOARDING_SPRING}>
                {[
                    { x: -96, y: -28, width: 74, opacity: 0.9 },
                    { x: -52, y: 2, width: 112, opacity: 0.72 },
                    { x: -18, y: 34, width: 82, opacity: 0.58 },
                ].map((bar) => (
                    <rect
                        key={`${bar.x}-${bar.y}`}
                        x={bar.x}
                        y={bar.y}
                        width={bar.width}
                        height="16"
                        rx="8"
                        fill="var(--canvas-raised)"
                        opacity={bar.opacity}
                    />
                ))}
            </motion.g>

            <motion.g animate={{ opacity: getOpacity(step, 4, 0) }} transition={ONBOARDING_SPRING}>
                <rect x="-74" y="-40" width="52" height="62" rx="8" fill="var(--canvas-raised)" opacity="0.92" />
                <path d="M-62 -28H-34" stroke="var(--masters)" strokeWidth="2" strokeLinecap="round" opacity="0.28" />
                <path d="M-62 -14H-28" stroke="var(--rule-strong)" strokeWidth="2" strokeLinecap="round" />
                <path d="M-62 0H-36" stroke="var(--rule)" strokeWidth="1.5" strokeLinecap="round" />
            </motion.g>
        </>
    );
}

function SecondaryCardContent({ step }: { step: number }) {
    return (
        <>
            <motion.g animate={{ opacity: getOpacity(step, 1, 0) }} transition={ONBOARDING_SPRING}>
                <rect x="-114" y="-82" width="228" height="28" rx="14" fill="var(--gold)" opacity="0.88" />
                {[-24, 4, 32, 60].map((y, index) => (
                    <g key={y}>
                        <rect x="-92" y={y - 4} width={66 + index * 6} height="9" rx="4.5" fill="var(--ink)" opacity="0.12" />
                        <rect x="12" y={y - 4} width={34 + index * 8} height="9" rx="4.5" fill="var(--ink-secondary)" opacity="0.18" />
                        <circle cx="80" cy={y} r="6.5" fill={index % 2 === 0 ? 'var(--masters-deep)' : 'var(--gold-dark)'} />
                    </g>
                ))}
                <line x1="-100" y1="92" x2="96" y2="92" stroke="var(--rule-strong)" strokeWidth="1.5" />
            </motion.g>

            <motion.g animate={{ opacity: getOpacity(step, 2, 0) }} transition={ONBOARDING_SPRING}>
                <rect x="-38" y="-22" width="30" height="38" rx="12" fill="var(--gold)" />
                <rect x="0" y="-12" width="30" height="28" rx="12" fill="var(--ink-faint)" opacity="0.78" />
                <rect x="-54" y="28" width="108" height="8" rx="4" fill="var(--masters-deep)" opacity="0.2" />
            </motion.g>

            <motion.g animate={{ opacity: getOpacity(step, 3, 0) }} transition={ONBOARDING_SPRING}>
                <path
                    d="M-38 -52H38V-8C38 28 20 56 0 68C-20 56 -38 28 -38 -8Z"
                    fill="none"
                    stroke="var(--gold)"
                    strokeWidth="3"
                    strokeLinejoin="round"
                />
                <path d="M-38 -52H38" stroke="var(--masters-deep)" strokeWidth="4" strokeLinecap="round" />
                <path d="M-14 82H14" stroke="var(--masters-deep)" strokeWidth="7" strokeLinecap="round" />
                <path d="M-8 68V82M8 68V82" stroke="var(--gold)" strokeWidth="4" strokeLinecap="round" />
                <path
                    d="M0 -16L7 0H22L10 9L15 24L0 15L-15 24L-10 9L-22 0H-7Z"
                    fill="var(--canvas-raised)"
                    opacity="0.92"
                />
            </motion.g>
        </>
    );
}

function SupportCardContent({ step }: { step: number }) {
    return (
        <>
            <motion.g animate={{ opacity: getOpacity(step, 0, 0) }} transition={ONBOARDING_SPRING}>
                <circle cx="0" cy="0" r="18" fill="var(--canvas-raised)" opacity="0.92" />
                <circle cx="0" cy="0" r="10" fill="none" stroke="var(--gold)" strokeWidth="2" />
                <path d="M-5 0H5" stroke="var(--masters-deep)" strokeWidth="2" strokeLinecap="round" />
                <path d="M0 -5V5" stroke="var(--masters-deep)" strokeWidth="2" strokeLinecap="round" />
            </motion.g>

            <motion.g animate={{ opacity: getOpacity(step, 1, 0) }} transition={ONBOARDING_SPRING}>
                <circle cx="0" cy="0" r="24" fill="var(--canvas-raised)" opacity="0.88" />
                <circle cx="0" cy="0" r="11" fill="none" stroke="var(--rule-strong)" strokeWidth="1.5" />
                <path d="M-18 0H18" stroke="var(--masters)" strokeWidth="1.75" strokeLinecap="round" opacity="0.32" />
                <circle cx="-9" cy="0" r="5.5" fill="var(--masters-deep)" />
                <circle cx="9" cy="0" r="5.5" fill="var(--gold)" />
            </motion.g>

            <motion.g animate={{ opacity: getOpacity(step, 2, 0) }} transition={ONBOARDING_SPRING}>
                <rect x="-18" y="-30" width="16" height="28" rx="8" fill="var(--gold)" />
                <rect x="2" y="-22" width="16" height="20" rx="8" fill="var(--ink-faint)" opacity="0.8" />
            </motion.g>

            <motion.g animate={{ opacity: getOpacity(step, 3, 0) }} transition={ONBOARDING_SPRING}>
                <circle cx="0" cy="0" r="10" fill="var(--gold)" opacity="0.84" />
                <circle cx="-18" cy="6" r="8" fill="var(--masters-deep)" />
                <circle cx="18" cy="-8" r="8" fill="var(--masters)" opacity="0.72" />
            </motion.g>
        </>
    );
}

function CardShell({
    currentStep,
    state,
    transition,
    reducedMotion,
    children,
}: {
    currentStep: number;
    state: { x: number; y: number; rotate?: number; scale?: number; opacity?: number };
    transition: Transition;
    reducedMotion: boolean;
    children: ReactNode;
}) {
    return (
        <motion.g
            initial={
                reducedMotion
                    ? false
                    : {
                          x: state.x + 18,
                          y: state.y + 14,
                          rotate: (state.rotate ?? 0) - 1,
                          scale: (state.scale ?? 1) * 0.92,
                          opacity: 0,
                      }
            }
            animate={{
                x: state.x,
                y: state.y,
                rotate: state.rotate ?? 0,
                scale: state.scale ?? 1,
                opacity: state.opacity ?? 1,
            }}
            transition={transition}
            style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
        >
            <rect
                x="-126"
                y="-88"
                width="252"
                height="176"
                rx="24"
                fill="var(--canvas-raised)"
                fillOpacity={currentStep === 3 ? 0.78 : 0.9}
                stroke="var(--rule-strong)"
                strokeWidth="1.5"
            />
            <rect
                x="-126"
                y="-88"
                width="252"
                height="176"
                rx="24"
                fill="url(#onboarding-card-wash)"
                opacity={currentStep === 3 ? 0.12 : 0.3}
            />
            {children}
        </motion.g>
    );
}

export function CardStackMotion({ currentStep, reducedMotion = false }: PrimitiveProps) {
    const transition = getTransition(reducedMotion);

    return (
        <>
            <CardShell
                currentStep={currentStep}
                state={PRIMARY_CARD_STATES[currentStep]}
                transition={transition}
                reducedMotion={reducedMotion}
            >
                <ClubhouseCardContent step={currentStep} />
            </CardShell>

            <CardShell
                currentStep={currentStep}
                state={SECONDARY_CARD_STATES[currentStep]}
                transition={transition}
                reducedMotion={reducedMotion}
            >
                <SecondaryCardContent step={currentStep} />
            </CardShell>

            <motion.g
                initial={
                    reducedMotion
                        ? false
                        : {
                              x: SUPPORT_CARD_STATES[currentStep].x,
                              y: SUPPORT_CARD_STATES[currentStep].y + 12,
                              scale: SUPPORT_CARD_STATES[currentStep].scale * 0.88,
                              opacity: 0,
                          }
                }
                animate={{
                    x: SUPPORT_CARD_STATES[currentStep].x,
                    y: SUPPORT_CARD_STATES[currentStep].y,
                    scale: SUPPORT_CARD_STATES[currentStep].scale,
                    opacity: SUPPORT_CARD_STATES[currentStep].opacity,
                }}
                transition={transition}
                style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
            >
                <SupportCardContent step={currentStep} />
            </motion.g>
        </>
    );
}

export function PathMotion({ currentStep, reducedMotion = false }: PrimitiveProps) {
    const transition = getTransition(reducedMotion);

    return (
        <g>
            <path
                d={PATH_D}
                fill="none"
                stroke="var(--masters)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0.16"
            />
            <motion.path
                d={PATH_D}
                fill="none"
                stroke="var(--masters-deep)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={reducedMotion ? false : { pathLength: 0, opacity: 0 }}
                animate={{
                    pathLength: PATH_REVEAL[currentStep],
                    opacity: currentStep >= 3 ? 0.92 : 0.78,
                }}
                transition={transition}
            />

            {PATH_POINTS.map((point, index) => (
                <motion.g
                    key={`${point.x}-${point.y}`}
                    initial={false}
                    animate={{
                        x: point.x,
                        y: point.y,
                        scale: currentStep === index ? 1.1 : 0.9,
                        opacity: currentStep >= index ? 1 : 0.24,
                    }}
                    transition={transition}
                    style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
                >
                    <circle cx="0" cy="0" r="6.5" fill="var(--canvas-raised)" opacity="0.92" />
                    <circle
                        cx="0"
                        cy="0"
                        r="4"
                        fill={index % 2 === 0 ? 'var(--gold)' : 'var(--masters-deep)'}
                    />
                </motion.g>
            ))}
        </g>
    );
}

export function BallMotion({ currentStep, reducedMotion = false }: PrimitiveProps) {
    const transition = getTransition(reducedMotion);
    const point = PATH_POINTS[currentStep];

    return (
        <>
            <motion.g
                initial={reducedMotion ? false : { x: 28, y: 302, scale: 0.8, opacity: 0 }}
                animate={{ x: point.x, y: point.y + 18, scale: point.scale, opacity: 0.16 }}
                transition={transition}
                style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
            >
                <ellipse cx="0" cy="0" rx="22" ry="6" fill="var(--ink)" />
            </motion.g>

            <motion.g
                initial={reducedMotion ? false : { x: 22, y: 300, scale: 0.84, rotate: -10, opacity: 0 }}
                animate={{
                    x: point.x,
                    y: point.y,
                    scale: point.scale,
                    rotate: point.rotate,
                    opacity: 1,
                }}
                transition={transition}
                style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
            >
                <circle cx="0" cy="0" r="16" fill="var(--canvas-raised)" stroke="var(--rule-strong)" strokeWidth="1.5" />
                <g fill="var(--rule-strong)" opacity="0.55">
                    <circle cx="-7" cy="-8" r="1.7" />
                    <circle cx="2" cy="-8" r="1.7" />
                    <circle cx="8" cy="-2" r="1.7" />
                    <circle cx="-4" cy="4" r="1.7" />
                    <circle cx="6" cy="6" r="1.7" />
                </g>
                <circle cx="-5" cy="-10" r="3.2" fill="var(--canvas-raised)" opacity="0.72" />
            </motion.g>
        </>
    );
}

export function FinalCallout({
    currentStep,
    reducedMotion = false,
}: PrimitiveProps) {
    const transition = getTransition(reducedMotion);

    return (
        <AnimatePresence>
            {currentStep === 4 && (
                <motion.g
                    key="cta"
                    initial={reducedMotion ? false : { x: 492, y: 296, opacity: 0, scale: 0.94 }}
                    animate={{ x: 492, y: 296, opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={transition}
                    style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
                >
                    <rect
                        x="0"
                        y="0"
                        width="138"
                        height="34"
                        rx="17"
                        fill="rgba(255,255,255,0.72)"
                        stroke="rgba(255,255,255,0.82)"
                        strokeWidth="1"
                    />
                    <text
                        x="69"
                        y="21"
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
