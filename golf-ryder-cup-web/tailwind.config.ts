import type { Config } from 'tailwindcss';

/**
 * Golf Ryder Cup App - Tailwind Configuration v3.0
 *
 * THE FRIED EGG GOLF INSPIRED DESIGN SYSTEM
 *
 * Design Philosophy:
 * - Editorial warmth over dashboard utility
 * - Warm cream surfaces, characterful typography
 * - Restrained color palette (3 brand + 2 team + 3 semantic)
 * - Generous whitespace, content that breathes
 * - Swiss precision with approachable personality
 */
const config: Config = {
    content: [
        './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
        './src/components/**/*.{js,ts,jsx,tsx,mdx}',
        './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    ],
    darkMode: 'class',
    theme: {
        extend: {
            // ============================================
            // COLORS — Fried Egg Inspired Palette
            // Restrained. Warm. Confident.
            // ============================================
            colors: {
                // Brand Colors
                masters: {
                    DEFAULT: 'var(--masters)',
                    green: 'var(--masters)',
                    hover: 'var(--masters-hover)',
                    deep: 'var(--masters-deep)',
                    subtle: 'var(--masters-subtle)',
                },

                // Legacy/compat aliases (used throughout the codebase)
                // Keep these until we finish migrating all Tailwind classnames.
                'masters-primary': 'var(--masters)',
                'masters-primary-dark': 'var(--masters-deep)',
                gold: {
                    DEFAULT: 'var(--gold)',
                    light: 'var(--gold-light)',
                    dark: 'var(--gold-dark)',
                },
                maroon: {
                    DEFAULT: 'var(--maroon)',
                    light: 'var(--maroon-light)',
                    dark: 'var(--maroon-dark)',
                },

                // Canvas surfaces
                canvas: {
                    DEFAULT: 'var(--canvas)',
                    raised: 'var(--canvas-raised)',
                    sunken: 'var(--canvas-sunken)',
                    warm: 'var(--canvas-warm)',
                },

                // Ink text
                ink: {
                    DEFAULT: 'var(--ink)',
                    secondary: 'var(--ink-secondary)',
                    tertiary: 'var(--ink-tertiary)',
                    faint: 'var(--ink-faint)',
                },

                // Rules
                rule: {
                    DEFAULT: 'var(--rule)',
                    strong: 'var(--rule-strong)',
                    faint: 'var(--rule-faint)',
                },

                // Team Colors
                'team-usa': {
                    DEFAULT: 'var(--team-usa)',
                    light: 'var(--team-usa-light)',
                    deep: 'var(--team-usa-deep)',
                    muted: 'var(--team-usa-muted)',
                },
                'team-europe': {
                    DEFAULT: 'var(--team-europe)',
                    light: 'var(--team-europe-light)',
                    deep: 'var(--team-europe-deep)',
                    muted: 'var(--team-europe-muted)',
                },

                // Semantic Colors
                success: {
                    DEFAULT: 'var(--success)',
                },
                warning: {
                    DEFAULT: 'var(--warning)',
                },
                error: {
                    DEFAULT: 'var(--error)',
                },

                // Legacy aliases for compatibility
                primary: {
                    DEFAULT: 'var(--masters)',
                    light: 'var(--masters-hover)',
                    dark: 'var(--masters-deep)',
                },
                secondary: {
                    DEFAULT: 'var(--gold)',
                    light: 'var(--gold-light)',
                    dark: 'var(--gold-dark)',
                },
                // Surface aliases
                surface: {
                    DEFAULT: 'var(--canvas-raised)',
                    base: 'var(--canvas)',
                    background: 'var(--canvas)',
                    raised: 'var(--canvas-raised)',
                    card: 'var(--canvas-raised)',
                    elevated: 'var(--canvas-raised)',
                    overlay: 'var(--canvas-raised)',
                    highlight: 'var(--canvas-sunken)',
                    muted: 'var(--canvas-sunken)',
                    border: 'var(--rule)',
                },

                // Text aliases
                text: {
                    primary: 'var(--ink)',
                    secondary: 'var(--ink-secondary)',
                    tertiary: 'var(--ink-tertiary)',
                    disabled: 'var(--ink-faint)',
                    inverse: 'var(--canvas)',
                    gold: 'var(--gold)',
                },
                'text-primary': 'var(--ink)',
                'text-secondary': 'var(--ink-secondary)',
                'text-tertiary': 'var(--ink-tertiary)',
                'text-on-primary': '#FFFFFF',
                'text-on-secondary': 'var(--ink)',

                info: {
                    DEFAULT: '#5B8FA8',
                    light: '#7FAFC5',
                    dark: '#466F85',
                },
            },

            // ============================================
            // TYPOGRAPHY — Characterful, not corporate
            // ============================================
            fontFamily: {
                sans: ['var(--font-sans)'],
                serif: ['var(--font-serif)'],
                mono: ['var(--font-mono)'],
                display: ['var(--font-serif)'],
            },

            fontSize: {
                // Score Typography — monumental
                'score-hero': ['clamp(3.5rem, 12vw, 6rem)', { lineHeight: '0.9', fontWeight: '400', letterSpacing: '-0.04em' }],
                'score-large': ['clamp(2.5rem, 8vw, 3.5rem)', { lineHeight: '1', fontWeight: '400', letterSpacing: '-0.03em' }],
                'score-medium': ['clamp(1.5rem, 5vw, 2rem)', { lineHeight: '1', fontWeight: '400', letterSpacing: '-0.02em' }],
                'score-small': ['1.25rem', { lineHeight: '1', fontWeight: '600', letterSpacing: '-0.01em' }],

                // Display — editorial headlines
                'display-xl': ['clamp(2rem, 5vw, 3rem)', { lineHeight: '1.1', fontWeight: '400', letterSpacing: '-0.02em' }],
                'display-lg': ['clamp(1.75rem, 4vw, 2.25rem)', { lineHeight: '1.15', fontWeight: '400', letterSpacing: '-0.015em' }],
                'display-md': ['clamp(1.375rem, 3vw, 1.75rem)', { lineHeight: '1.2', fontWeight: '400' }],
                'display-sm': ['clamp(1.125rem, 2.5vw, 1.375rem)', { lineHeight: '1.25', fontWeight: '400' }],

                // Standard typography
                'title-large': ['2.125rem', { lineHeight: '2.5rem', fontWeight: '600' }],
                'title': ['1.75rem', { lineHeight: '2.125rem', fontWeight: '600' }],
                'title-2': ['1.375rem', { lineHeight: '1.75rem', fontWeight: '600' }],
                'title-3': ['1.25rem', { lineHeight: '1.5625rem', fontWeight: '500' }],
                'headline': ['1.0625rem', { lineHeight: '1.375rem', fontWeight: '600' }],
                'body': ['0.9375rem', { lineHeight: '1.5rem', fontWeight: '400' }],
                'body-lg': ['1.0625rem', { lineHeight: '1.75rem', fontWeight: '400' }],
                'callout': ['1rem', { lineHeight: '1.3125rem', fontWeight: '400' }],
                'subheadline': ['0.9375rem', { lineHeight: '1.25rem', fontWeight: '400' }],
                'footnote': ['0.8125rem', { lineHeight: '1.125rem', fontWeight: '400' }],
                'caption': ['0.75rem', { lineHeight: '1rem', fontWeight: '400' }],
                'caption-2': ['0.6875rem', { lineHeight: '0.8125rem', fontWeight: '400' }],
                'overline': ['0.6875rem', { lineHeight: '1rem', fontWeight: '600', letterSpacing: '0.1em' }],
            },

            // ============================================
            // SPACING — Generous editorial rhythm
            // ============================================
            spacing: {
                xxs: '2px',
                xs: '4px',
                sm: '8px',
                md: '12px',
                lg: '16px',
                xl: '24px',
                '2xl': '32px',
                '3xl': '48px',
                '4xl': '64px',
                '5xl': '80px',
                '6xl': '96px',
            },

            // ============================================
            // BORDER RADIUS — Refined, not bubbly
            // ============================================
            borderRadius: {
                xs: '4px',
                sm: '6px',
                md: '8px',
                lg: '12px',
                xl: '16px',
                '2xl': '20px',
                '3xl': '24px',
                full: '9999px',
            },

            // ============================================
            // SHADOWS — Warm, subtle, three levels
            // ============================================
            boxShadow: {
                'card-sm': 'var(--shadow-sm)',
                'card': 'var(--shadow-md)',
                'card-lg': 'var(--shadow-lg)',
                'elevated': 'var(--shadow-lg)',
                'glow-gold': 'var(--shadow-glow-gold)',
                'glow-green': 'var(--shadow-glow-masters)',
            },

            // ============================================
            // ANIMATION — Restrained, editorial
            // ============================================
            transitionDuration: {
                instant: '100ms',
                fast: '150ms',
                normal: '250ms',
                slow: '400ms',
                slower: '600ms',
            },

            transitionTimingFunction: {
                'masters': 'cubic-bezier(0.4, 0, 0.2, 1)',
                'masters-in': 'cubic-bezier(0.4, 0, 1, 1)',
                'masters-out': 'cubic-bezier(0, 0, 0.2, 1)',
            },

            animation: {
                'fade-in': 'fadeIn 200ms ease-out',
                'fade-in-up': 'fadeInUp 300ms ease-out',
                'slide-up': 'slideUp 300ms ease-out',
                'slide-down': 'slideDown 300ms ease-out',
                'scale-in': 'scaleIn 200ms ease-out',
                'score-pop': 'scorePop 400ms ease-out',
                'shimmer': 'shimmer 1.5s ease-in-out infinite',
            },

            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                fadeInUp: {
                    '0%': { opacity: '0', transform: 'translateY(8px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                scaleIn: {
                    '0%': { opacity: '0', transform: 'scale(0.97)' },
                    '100%': { opacity: '1', transform: 'scale(1)' },
                },
                slideUp: {
                    '0%': { opacity: '0', transform: 'translateY(16px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                slideDown: {
                    '0%': { opacity: '0', transform: 'translateY(-16px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                scorePop: {
                    '0%': { transform: 'scale(1)' },
                    '50%': { transform: 'scale(1.08)' },
                    '100%': { transform: 'scale(1)' },
                },
                shimmer: {
                    '0%': { backgroundPosition: '200% 0' },
                    '100%': { backgroundPosition: '-200% 0' },
                },
            },

            // ============================================
            // GRADIENTS — Subtle warmth
            // ============================================
            backgroundImage: {
                'gradient-gold': 'linear-gradient(135deg, var(--gold) 0%, var(--gold-dark) 100%)',
                'gradient-gold-subtle': 'linear-gradient(135deg, var(--gold-subtle) 0%, transparent 100%)',
                'gradient-green': 'linear-gradient(135deg, var(--masters) 0%, var(--masters-deep) 100%)',
                'gradient-surface': 'linear-gradient(180deg, var(--canvas-raised) 0%, var(--canvas) 100%)',
                'gradient-card': 'linear-gradient(180deg, var(--canvas-raised) 0%, var(--canvas-sunken) 100%)',
                'gradient-usa': 'linear-gradient(135deg, var(--team-usa) 0%, var(--team-usa-deep) 100%)',
                'gradient-europe': 'linear-gradient(135deg, var(--team-europe) 0%, var(--team-europe-deep) 100%)',
            },

            // ============================================
            // BUTTON & TOUCH TARGET SIZES
            // ============================================
            minHeight: {
                'btn-sm': '40px',
                'btn-md': '48px',
                'btn-lg': '56px',
                'btn-xl': '64px',
                'touch': '44px',
            },

            minWidth: {
                'btn-sm': '40px',
                'btn-md': '48px',
                'btn-lg': '56px',
                'btn-xl': '64px',
                'touch': '44px',
            },
        },
    },
    plugins: [],
};

export default config;
