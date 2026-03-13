import { cn } from '@/lib/utils';

interface SceneProps {
    className?: string;
}

export function ClubhouseScene({ className }: SceneProps) {
    return (
        <svg
            viewBox="0 0 680 360"
            className={cn('onboarding-scene onboarding-scene--clubhouse', className)}
            aria-hidden="true"
        >
            <defs>
                <linearGradient id="clubhouse-sky" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="var(--canvas-raised)" />
                    <stop offset="100%" stopColor="var(--canvas-warm)" />
                </linearGradient>
                <linearGradient id="clubhouse-paper" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="var(--canvas-raised)" />
                    <stop offset="100%" stopColor="var(--canvas-warm)" />
                </linearGradient>
                <linearGradient id="clubhouse-sweep" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="var(--gold)" stopOpacity="0" />
                    <stop offset="50%" stopColor="var(--gold)" stopOpacity="0.22" />
                    <stop offset="100%" stopColor="var(--gold)" stopOpacity="0" />
                </linearGradient>
            </defs>

            <rect width="680" height="360" fill="url(#clubhouse-sky)" />

            <path
                d="M0 238C80 222 157 226 244 214C330 202 386 162 470 154C556 145 611 163 680 150V360H0Z"
                fill="var(--masters)"
                opacity="0.07"
            />
            <path
                d="M0 274C92 260 164 266 240 250C317 234 394 210 492 206C571 203 622 213 680 206V360H0Z"
                fill="var(--gold)"
                opacity="0.06"
            />

            <path
                d="M54 250C146 214 218 188 304 182C386 176 464 190 612 142"
                fill="none"
                stroke="var(--masters-deep)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                data-motion="route-draw"
            />

            <g transform="translate(58 138)" data-motion="rise-soft-a">
                <path
                    d="M0 78H94V44L67 23L48 37L31 21L0 44Z"
                    fill="var(--ink)"
                    opacity="0.12"
                />
                <path
                    d="M44 12L48 0L52 12"
                    fill="none"
                    stroke="var(--gold)"
                    strokeWidth="2"
                    strokeLinecap="round"
                />
                <path
                    d="M48 0V22"
                    fill="none"
                    stroke="var(--ink-secondary)"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                />
                <rect x="11" y="48" width="72" height="30" rx="4" fill="var(--canvas-raised)" opacity="0.7" />
                <line x1="22" y1="58" x2="70" y2="58" stroke="var(--rule-strong)" strokeWidth="2" />
                <line x1="22" y1="66" x2="60" y2="66" stroke="var(--rule)" strokeWidth="1.5" />
            </g>

            <g transform="translate(368 62) rotate(-3 144 102)" data-motion="enter-right">
                <rect
                    x="0"
                    y="0"
                    width="288"
                    height="204"
                    rx="20"
                    fill="url(#clubhouse-paper)"
                    stroke="var(--rule-strong)"
                    strokeWidth="1.5"
                />
                <rect x="24" y="24" width="96" height="14" rx="7" fill="var(--masters)" opacity="0.16" />
                <rect x="174" y="24" width="42" height="10" rx="5" fill="var(--gold)" opacity="0.36" />
                <rect x="224" y="24" width="40" height="10" rx="5" fill="var(--ink-faint)" opacity="0.7" />

                <path d="M28 58H260" stroke="var(--rule-strong)" strokeWidth="1.5" />
                <path d="M28 94H260" stroke="var(--rule)" strokeWidth="1.5" />
                <path d="M28 126H260" stroke="var(--rule)" strokeWidth="1.5" />
                <path d="M28 158H260" stroke="var(--rule)" strokeWidth="1.5" />
                <path d="M28 190H260" stroke="var(--rule)" strokeWidth="1.5" />

                <circle cx="42" cy="75" r="7" fill="var(--masters-deep)" />
                <circle cx="42" cy="107" r="7" fill="var(--gold)" />
                <circle cx="42" cy="139" r="7" fill="var(--masters)" opacity="0.75" />
                <circle cx="42" cy="171" r="7" fill="var(--ink-faint)" />

                <rect x="70" y="69" width="102" height="10" rx="5" fill="var(--ink)" opacity="0.13" />
                <rect x="70" y="101" width="86" height="10" rx="5" fill="var(--ink-secondary)" opacity="0.18" />
                <rect x="70" y="133" width="116" height="10" rx="5" fill="var(--ink-secondary)" opacity="0.18" />
                <rect x="70" y="165" width="92" height="10" rx="5" fill="var(--ink-secondary)" opacity="0.18" />

                <rect x="206" y="69" width="50" height="10" rx="5" fill="var(--gold)" opacity="0.42" />
                <rect x="182" y="101" width="74" height="10" rx="5" fill="var(--masters)" opacity="0.28" />
                <rect x="200" y="133" width="56" height="10" rx="5" fill="var(--gold)" opacity="0.3" />
                <rect x="188" y="165" width="68" height="10" rx="5" fill="var(--masters)" opacity="0.22" />

                <rect
                    x="28"
                    y="12"
                    width="232"
                    height="180"
                    rx="16"
                    fill="url(#clubhouse-sweep)"
                    data-motion="light-sweep"
                />
            </g>

            <g transform="translate(124 286)" data-motion="marker-settle">
                <circle cx="0" cy="0" r="18" fill="var(--canvas-raised)" opacity="0.9" />
                <circle cx="0" cy="0" r="11" fill="none" stroke="var(--gold)" strokeWidth="2" />
                <path d="M-5 0H5" stroke="var(--masters-deep)" strokeWidth="2" strokeLinecap="round" />
                <path d="M0 -5V5" stroke="var(--masters-deep)" strokeWidth="2" strokeLinecap="round" />
            </g>
        </svg>
    );
}

export function SidesScene({ className }: SceneProps) {
    return (
        <svg
            viewBox="0 0 680 360"
            className={cn('onboarding-scene onboarding-scene--sides', className)}
            aria-hidden="true"
        >
            <defs>
                <linearGradient id="sides-paper" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="var(--canvas-raised)" />
                    <stop offset="100%" stopColor="var(--canvas-warm)" />
                </linearGradient>
            </defs>

            <rect width="680" height="360" fill="transparent" />
            <path
                d="M0 252C98 220 173 210 251 224C324 237 388 225 470 202C549 180 613 180 680 172"
                fill="none"
                stroke="var(--masters)"
                strokeWidth="2.5"
                strokeLinecap="round"
                opacity="0.4"
                data-motion="route-draw"
            />

            <path
                d="M0 276C86 261 170 258 254 248C344 238 422 216 510 210C582 204 632 210 680 202V360H0Z"
                fill="var(--ink)"
                opacity="0.04"
            />

            <g transform="translate(92 74) rotate(-3 98 98)" data-motion="enter-left">
                <rect x="0" y="0" width="196" height="204" rx="24" fill="url(#sides-paper)" stroke="var(--rule-strong)" strokeWidth="1.5" />
                <rect x="0" y="0" width="196" height="34" rx="24" fill="var(--masters-deep)" />
                <rect x="20" y="56" width="76" height="12" rx="6" fill="var(--ink)" opacity="0.12" />
                <rect x="20" y="92" width="118" height="10" rx="5" fill="var(--ink-secondary)" opacity="0.18" />
                <rect x="20" y="122" width="132" height="10" rx="5" fill="var(--ink-secondary)" opacity="0.18" />
                <rect x="20" y="152" width="104" height="10" rx="5" fill="var(--ink-secondary)" opacity="0.18" />
                <circle cx="154" cy="60" r="10" fill="var(--gold)" />
                <circle cx="154" cy="96" r="8" fill="var(--masters)" opacity="0.7" />
                <circle cx="154" cy="126" r="8" fill="var(--ink-faint)" />
                <rect x="18" y="182" width="160" height="1.5" fill="var(--rule-strong)" />
            </g>

            <g transform="translate(390 94) rotate(2 98 92)" data-motion="enter-right">
                <rect x="0" y="0" width="202" height="192" rx="24" fill="url(#sides-paper)" stroke="var(--rule-strong)" strokeWidth="1.5" />
                <rect x="0" y="0" width="202" height="34" rx="24" fill="var(--gold)" opacity="0.88" />
                <rect x="24" y="56" width="78" height="12" rx="6" fill="var(--ink)" opacity="0.12" />
                <rect x="24" y="92" width="122" height="10" rx="5" fill="var(--ink-secondary)" opacity="0.18" />
                <rect x="24" y="122" width="112" height="10" rx="5" fill="var(--ink-secondary)" opacity="0.18" />
                <rect x="24" y="152" width="136" height="10" rx="5" fill="var(--ink-secondary)" opacity="0.18" />
                <circle cx="164" cy="60" r="10" fill="var(--masters-deep)" />
                <circle cx="164" cy="96" r="8" fill="var(--gold)" />
                <circle cx="164" cy="126" r="8" fill="var(--masters)" opacity="0.65" />
                <rect x="22" y="170" width="162" height="1.5" fill="var(--rule-strong)" />
            </g>

            <g transform="translate(296 132)">
                <circle cx="44" cy="52" r="32" fill="var(--canvas-raised)" opacity="0.82" />
                <circle cx="44" cy="52" r="18" fill="none" stroke="var(--rule-strong)" strokeWidth="1.5" opacity="0.9" />
                <path d="M16 52H72" stroke="var(--masters)" strokeWidth="1.75" strokeLinecap="round" opacity="0.32" />
                <circle cx="30" cy="52" r="7" fill="var(--masters-deep)" data-motion="marker-sway-left" />
                <circle cx="58" cy="52" r="7" fill="var(--gold)" data-motion="marker-sway-right" />
            </g>

            <path
                d="M164 268C230 252 268 245 340 238C405 233 456 238 530 230"
                fill="none"
                stroke="var(--ink-secondary)"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeDasharray="2 10"
                opacity="0.34"
            />
        </svg>
    );
}

export function ScheduleScene({ className }: SceneProps) {
    return (
        <svg
            viewBox="0 0 680 360"
            className={cn('onboarding-scene onboarding-scene--schedule', className)}
            aria-hidden="true"
        >
            <defs>
                <linearGradient id="schedule-paper" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="var(--canvas-raised)" />
                    <stop offset="100%" stopColor="var(--canvas-warm)" />
                </linearGradient>
                <linearGradient id="schedule-glint" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="var(--gold)" stopOpacity="0" />
                    <stop offset="50%" stopColor="var(--gold)" stopOpacity="0.28" />
                    <stop offset="100%" stopColor="var(--gold)" stopOpacity="0" />
                </linearGradient>
            </defs>

            <rect width="680" height="360" fill="transparent" />

            <g transform="translate(104 54) rotate(-1.5 206 118)" data-motion="rise-soft-a">
                <rect x="0" y="0" width="412" height="236" rx="26" fill="url(#schedule-paper)" stroke="var(--rule-strong)" strokeWidth="1.5" />
                <rect x="0" y="0" width="412" height="42" rx="26" fill="var(--masters-deep)" />
                <rect x="166" y="-14" width="24" height="34" rx="10" fill="var(--gold)" />
                <rect x="196" y="-4" width="24" height="24" rx="10" fill="var(--ink-faint)" opacity="0.76" />

                {[
                    { y: 62, time: '7:40', tone: 'var(--masters-deep)' },
                    { y: 98, time: '8:00', tone: 'var(--gold)' },
                    { y: 134, time: '8:20', tone: 'var(--masters)' },
                    { y: 170, time: '8:40', tone: 'var(--gold)' },
                ].map((row, index) => (
                    <g key={row.time} data-motion={`row-reveal-${index + 1}`}>
                        <line x1="26" y1={row.y + 18} x2="386" y2={row.y + 18} stroke="var(--rule)" strokeWidth="1.5" />
                        <text
                            x="28"
                            y={row.y}
                            fill="var(--ink-secondary)"
                            fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                            fontSize="17"
                            letterSpacing="2"
                        >
                            {row.time}
                        </text>
                        <rect x="120" y={row.y - 12} width="112" height="16" rx="8" fill="var(--ink)" opacity="0.12" />
                        <rect x="246" y={row.y - 12} width="94" height="16" rx="8" fill="var(--ink-secondary)" opacity="0.18" />
                        <circle cx="362" cy={row.y - 4} r="8" fill={row.tone} />
                    </g>
                ))}

                <rect x="18" y="18" width="110" height="10" rx="5" fill="var(--canvas-raised)" opacity="0.7" />
                <rect x="282" y="14" width="100" height="14" rx="7" fill="var(--canvas-raised)" opacity="0.26" />
                <rect x="24" y="18" width="364" height="194" rx="18" fill="url(#schedule-glint)" data-motion="light-sweep" />
            </g>

            <g transform="translate(554 116)" data-motion="marker-settle">
                <path
                    d="M0 124C28 112 58 110 90 118V144H0Z"
                    fill="var(--masters)"
                    opacity="0.08"
                />
                <path
                    d="M44 4V88"
                    stroke="var(--ink-secondary)"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                />
                <path
                    d="M44 8C54 14 64 14 74 8V34C64 40 54 40 44 34Z"
                    fill="var(--gold)"
                    opacity="0.86"
                />
                <circle cx="44" cy="98" r="10" fill="var(--canvas-raised)" stroke="var(--rule-strong)" strokeWidth="1.5" />
                <circle cx="44" cy="98" r="4" fill="var(--masters-deep)" />
            </g>
        </svg>
    );
}

export function StoryScene({ className }: SceneProps) {
    return (
        <svg
            viewBox="0 0 680 360"
            className={cn('onboarding-scene onboarding-scene--story', className)}
            aria-hidden="true"
        >
            <defs>
                <linearGradient id="story-emblem-glow" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="var(--gold)" stopOpacity="0.22" />
                    <stop offset="100%" stopColor="var(--masters)" stopOpacity="0.08" />
                </linearGradient>
            </defs>

            <rect width="680" height="360" fill="transparent" />

            <g data-motion="paper-drift">
                <rect x="84" y="92" width="180" height="38" rx="14" fill="var(--canvas-raised)" opacity="0.78" />
                <rect x="108" y="108" width="128" height="6" rx="3" fill="var(--ink)" opacity="0.12" />
                <rect x="132" y="150" width="214" height="38" rx="14" fill="var(--canvas-raised)" opacity="0.64" />
                <rect x="160" y="166" width="148" height="6" rx="3" fill="var(--ink-secondary)" opacity="0.16" />
                <rect x="110" y="208" width="248" height="38" rx="14" fill="var(--canvas-raised)" opacity="0.52" />
                <rect x="144" y="224" width="172" height="6" rx="3" fill="var(--ink-secondary)" opacity="0.15" />
            </g>

            <path
                d="M92 260C156 222 214 206 292 206C372 206 424 180 508 144C548 128 590 118 626 118"
                fill="none"
                stroke="var(--masters)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                data-motion="route-draw"
            />

            {[
                { cx: 170, cy: 224, color: 'var(--masters-deep)', motion: 'marker-settle' },
                { cx: 290, cy: 208, color: 'var(--gold)', motion: 'marker-sway-left' },
                { cx: 414, cy: 180, color: 'var(--masters)', motion: 'marker-sway-right' },
                { cx: 548, cy: 138, color: 'var(--gold)', motion: 'marker-settle' },
            ].map((marker) => (
                <g key={`${marker.cx}-${marker.cy}`} transform={`translate(${marker.cx} ${marker.cy})`} data-motion={marker.motion}>
                    <circle cx="0" cy="0" r="12" fill="var(--canvas-raised)" opacity="0.92" />
                    <circle cx="0" cy="0" r="6" fill={marker.color} />
                </g>
            ))}

            <g transform="translate(430 72)" data-motion="emblem-reveal">
                <path
                    d="M40 28H132V74C132 112 113 141 86 154C59 141 40 112 40 74Z"
                    fill="url(#story-emblem-glow)"
                    opacity="0.8"
                />
                <path
                    d="M34 18H138V74C138 116 117 149 86 165C55 149 34 116 34 74Z"
                    fill="none"
                    stroke="var(--gold)"
                    strokeWidth="3"
                    strokeLinejoin="round"
                />
                <path
                    d="M34 18H138"
                    stroke="var(--masters-deep)"
                    strokeWidth="4"
                    strokeLinecap="round"
                />
                <path
                    d="M58 182H114"
                    stroke="var(--masters-deep)"
                    strokeWidth="8"
                    strokeLinecap="round"
                />
                <path
                    d="M72 165V182M100 165V182"
                    stroke="var(--gold)"
                    strokeWidth="4"
                    strokeLinecap="round"
                />
                <path
                    d="M86 54L92 68H107L95 76L100 90L86 81L72 90L77 76L65 68H80Z"
                    fill="var(--canvas-raised)"
                    opacity="0.92"
                />
            </g>
        </svg>
    );
}

export function FirstTeeScene({ className }: SceneProps) {
    return (
        <svg
            viewBox="0 0 680 360"
            className={cn('onboarding-scene onboarding-scene--first-tee', className)}
            aria-hidden="true"
        >
            <defs>
                <radialGradient id="first-tee-dawn" cx="26%" cy="18%" r="44%">
                    <stop offset="0%" stopColor="var(--gold)" stopOpacity="0.22" />
                    <stop offset="100%" stopColor="var(--gold)" stopOpacity="0" />
                </radialGradient>
                <linearGradient id="first-tee-sweep" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="var(--canvas-raised)" stopOpacity="0" />
                    <stop offset="50%" stopColor="var(--canvas-raised)" stopOpacity="0.46" />
                    <stop offset="100%" stopColor="var(--canvas-raised)" stopOpacity="0" />
                </linearGradient>
            </defs>

            <rect width="680" height="360" fill="transparent" />
            <circle cx="184" cy="80" r="92" fill="url(#first-tee-dawn)" data-motion="light-breathe" />

            <path
                d="M0 228C92 214 176 210 270 210C352 210 438 196 546 172C600 160 644 154 680 152V360H0Z"
                fill="var(--masters)"
                opacity="0.07"
            />
            <path
                d="M0 272C88 258 168 260 256 246C340 233 456 206 680 206V360H0Z"
                fill="var(--gold)"
                opacity="0.06"
            />

            <g transform="translate(538 118)" data-motion="rise-soft-b">
                <path d="M26 10V102" stroke="var(--ink-secondary)" strokeWidth="2.5" strokeLinecap="round" />
                <path
                    d="M26 16C38 20 52 19 64 12V44C52 50 38 51 26 46Z"
                    fill="var(--masters-deep)"
                    opacity="0.86"
                    data-motion="flag-whisper"
                />
            </g>

            <path
                d="M120 236C210 204 300 196 410 200C476 203 554 190 622 168"
                fill="none"
                stroke="var(--masters-deep)"
                strokeWidth="2"
                strokeLinecap="round"
                opacity="0.48"
                data-motion="route-draw"
            />

            <g transform="translate(112 244)" data-motion="enter-left">
                <path
                    d="M0 20L74 0L74 84L0 84Z"
                    fill="var(--canvas-raised)"
                    opacity="0.82"
                    stroke="var(--rule-strong)"
                    strokeWidth="1.25"
                />
                <path d="M16 28H54" stroke="var(--masters)" strokeWidth="2" strokeLinecap="round" opacity="0.28" />
                <path d="M16 44H58" stroke="var(--rule-strong)" strokeWidth="2" strokeLinecap="round" />
                <path d="M16 58H48" stroke="var(--rule)" strokeWidth="1.5" strokeLinecap="round" />
            </g>

            <g transform="translate(446 170)" data-motion="settle-ball">
                <ellipse cx="26" cy="96" rx="58" ry="13" fill="var(--ink)" opacity="0.08" />
                <path
                    d="M26 42V98M14 98H38"
                    fill="none"
                    stroke="var(--gold-dark)"
                    strokeWidth="4"
                    strokeLinecap="round"
                />
                <circle cx="26" cy="26" r="26" fill="var(--canvas-raised)" stroke="var(--rule-strong)" strokeWidth="1.5" />
                <g fill="var(--rule-strong)" opacity="0.55">
                    <circle cx="16" cy="16" r="2.3" />
                    <circle cx="28" cy="14" r="2.3" />
                    <circle cx="38" cy="22" r="2.3" />
                    <circle cx="20" cy="30" r="2.3" />
                    <circle cx="33" cy="34" r="2.3" />
                </g>
            </g>

            <path
                d="M388 296C422 282 456 282 494 292C532 302 566 303 604 292"
                fill="none"
                stroke="var(--masters)"
                strokeWidth="3"
                strokeLinecap="round"
                opacity="0.42"
                data-motion="grass-sway"
            />

            <rect
                x="80"
                y="40"
                width="520"
                height="160"
                rx="80"
                fill="url(#first-tee-sweep)"
                data-motion="light-sweep"
            />
        </svg>
    );
}
