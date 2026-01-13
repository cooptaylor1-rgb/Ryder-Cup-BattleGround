import type { Config } from 'tailwindcss';

/**
 * Golf Ryder Cup App - Tailwind Configuration
 *
 * Design tokens ported from Swift DesignSystem.swift
 * Augusta National inspired palette with dark mode first approach
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
            // COLORS - Augusta National Inspired
            // ============================================
            colors: {
                // Augusta National Palette
                augusta: {
                    green: '#004225',
                    light: '#2E7D32',
                },
                azalea: '#E91E63',
                magnolia: '#FDFBF7',
                patrons: '#2E7D32',
                'sunday-red': '#C62828',

                // Brand Colors
                primary: {
                    DEFAULT: '#004225',
                    light: '#2E7D32',
                    dark: '#00331A',
                },
                secondary: {
                    DEFAULT: '#FFD54F',
                    dark: '#B8860B',
                    light: '#FFE082',
                },
                gold: {
                    DEFAULT: '#FFD700',
                    dark: '#B8860B',
                    light: '#FFE082',
                },
                platinum: '#E5E4E2',
                bronze: '#CD7F32',
                silver: '#C0C0C0',

                // Team Colors
                'team-usa': {
                    DEFAULT: '#1565C0',
                    light: '#42A5F5',
                    dark: '#0D47A1',
                },
                'team-europe': {
                    DEFAULT: '#C62828',
                    light: '#EF5350',
                    dark: '#B71C1C',
                },

                // Semantic Colors
                success: {
                    DEFAULT: '#66BB6A',
                    light: '#81C784',
                    dark: '#4CAF50',
                },
                warning: {
                    DEFAULT: '#FFB74D',
                    light: '#FFCC80',
                    dark: '#F57C00',
                },
                error: {
                    DEFAULT: '#EF5350',
                    light: '#E57373',
                    dark: '#D32F2F',
                },
                info: {
                    DEFAULT: '#64B5F6',
                    light: '#90CAF9',
                    dark: '#1976D2',
                },

                // Golf-Specific Colors
                fairway: '#4CAF50',
                bunker: '#D7CCC8',
                water: '#29B6F6',
                rough: '#8BC34A',
                'putting-green': '#2E7D32',

                // Surface Colors (Dark Mode First) - Layered surfaces
                surface: {
                    DEFAULT: '#141414',
                    base: '#0A0A0A',
                    background: '#0A0A0A',
                    raised: '#141414',
                    variant: '#1E1E1E',
                    overlay: '#1A1A1A',
                    elevated: '#282828',
                    highlight: '#333333',
                    muted: '#333333',
                    border: '#3A3A3A',
                },

                // Text Colors - Semantic text hierarchy
                text: {
                    primary: '#FFFFFF',
                    secondary: '#A0A0A0',
                    tertiary: '#707070',
                    disabled: '#505050',
                    inverse: '#0A0A0A',
                },

                // Legacy text color aliases
                'text-primary': '#FFFFFF',
                'text-secondary': '#A0A0A0',
                'text-tertiary': '#707070',
                'text-on-primary': '#FFFFFF',
                'text-on-secondary': '#000000',
            },

            // ============================================
            // SPACING - 4pt base unit
            // ============================================
            spacing: {
                xxs: '2px',
                xs: '4px',
                sm: '8px',
                md: '12px',
                lg: '16px',
                xl: '24px',
                xxl: '32px',
                xxxl: '48px',
                hero: '64px',
                massive: '96px',
            },

            // ============================================
            // BORDER RADIUS
            // ============================================
            borderRadius: {
                xs: '4px',
                sm: '8px',
                md: '12px',
                lg: '16px',
                xl: '24px',
                xxl: '32px',
                full: '9999px',
            },

            // ============================================
            // TYPOGRAPHY
            // ============================================
            fontSize: {
                // Score Typography (Monospace)
                'score-hero': ['72px', { lineHeight: '1', fontWeight: '700' }],
                'score-large': ['48px', { lineHeight: '1', fontWeight: '700' }],
                'score-medium': ['32px', { lineHeight: '1', fontWeight: '600' }],
                'score-small': ['24px', { lineHeight: '1', fontWeight: '500' }],
                // Standard typography additions
                'title-large': ['34px', { lineHeight: '41px', fontWeight: '700' }],
                'title': ['28px', { lineHeight: '34px', fontWeight: '700' }],
                'title-2': ['22px', { lineHeight: '28px', fontWeight: '700' }],
                'title-3': ['20px', { lineHeight: '25px', fontWeight: '600' }],
                'headline': ['17px', { lineHeight: '22px', fontWeight: '600' }],
                'body': ['17px', { lineHeight: '22px', fontWeight: '400' }],
                'callout': ['16px', { lineHeight: '21px', fontWeight: '400' }],
                'subheadline': ['15px', { lineHeight: '20px', fontWeight: '400' }],
                'footnote': ['13px', { lineHeight: '18px', fontWeight: '400' }],
                'caption': ['12px', { lineHeight: '16px', fontWeight: '400' }],
                'caption-2': ['11px', { lineHeight: '13px', fontWeight: '400' }],
            },

            fontFamily: {
                sans: [
                    'SF Pro',
                    '-apple-system',
                    'BlinkMacSystemFont',
                    'Segoe UI',
                    'Roboto',
                    'Oxygen',
                    'Ubuntu',
                    'sans-serif',
                ],
                mono: [
                    'SF Mono',
                    'ui-monospace',
                    'SFMono-Regular',
                    'Monaco',
                    'Consolas',
                    'Liberation Mono',
                    'Courier New',
                    'monospace',
                ],
            },

            // ============================================
            // ANIMATION
            // ============================================
            transitionDuration: {
                instant: '100ms',
                fast: '200ms',
                normal: '300ms',
                slow: '500ms',
                celebration: '1000ms',
                dramatic: '1500ms',
            },

            animation: {
                'fade-in': 'fadeIn 300ms ease-out',
                'slide-up': 'slideUp 300ms ease-out',
                'slide-down': 'slideDown 300ms ease-out',
                'scale-in': 'scaleIn 200ms ease-out',
                'pulse-slow': 'pulse 3s ease-in-out infinite',
                'bounce-subtle': 'bounceSubtle 2s ease-in-out infinite',
                'shimmer': 'shimmer 2s linear infinite',
                'score-pop': 'scorePop 400ms ease-out',
            },

            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                slideUp: {
                    '0%': { opacity: '0', transform: 'translateY(10px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                slideDown: {
                    '0%': { opacity: '0', transform: 'translateY(-10px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                scaleIn: {
                    '0%': { opacity: '0', transform: 'scale(0.95)' },
                    '100%': { opacity: '1', transform: 'scale(1)' },
                },
                bounceSubtle: {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-5px)' },
                },
                shimmer: {
                    '0%': { backgroundPosition: '-200% 0' },
                    '100%': { backgroundPosition: '200% 0' },
                },
                scorePop: {
                    '0%': { transform: 'scale(1)' },
                    '50%': { transform: 'scale(1.15)' },
                    '100%': { transform: 'scale(1)' },
                },
            },

            // ============================================
            // SHADOWS
            // ============================================
            boxShadow: {
                'card': '0 2px 8px rgba(0, 0, 0, 0.3)',
                'card-hover': '0 4px 16px rgba(0, 0, 0, 0.4)',
                'elevated': '0 8px 24px rgba(0, 0, 0, 0.5)',
                'glow-primary': '0 0 20px rgba(0, 66, 37, 0.4)',
                'glow-gold': '0 0 20px rgba(255, 213, 79, 0.4)',
                'glow-usa': '0 0 20px rgba(21, 101, 192, 0.4)',
                'glow-europe': '0 0 20px rgba(198, 40, 40, 0.4)',
                'inner-glow': 'inset 0 0 20px rgba(255, 255, 255, 0.05)',
            },

            // ============================================
            // BUTTON SIZES
            // ============================================
            minHeight: {
                'btn-sm': '44px',
                'btn-md': '56px',
                'btn-lg': '72px',
                'btn-hero': '88px',
                'btn-massive': '96px',
            },

            minWidth: {
                'btn-sm': '44px',
                'btn-md': '56px',
                'btn-lg': '72px',
                'btn-hero': '88px',
                'btn-massive': '96px',
            },

            // ============================================
            // GRADIENTS (as background images)
            // ============================================
            backgroundImage: {
                'gradient-gold': 'linear-gradient(135deg, #FFD700 0%, #B8860B 100%)',
                'gradient-usa': 'linear-gradient(135deg, #1565C0 0%, #0D47A1 100%)',
                'gradient-europe': 'linear-gradient(135deg, #C62828 0%, #B71C1C 100%)',
                'gradient-augusta': 'linear-gradient(135deg, #004225 0%, #2E7D32 100%)',
                'gradient-surface': 'linear-gradient(180deg, #1E1E1E 0%, #141414 100%)',
                'shimmer-gradient': 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.05) 50%, transparent 100%)',
            },
        },
    },
    plugins: [],
};

export default config;
