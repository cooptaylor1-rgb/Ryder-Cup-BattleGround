/**
 * Design System Tokens
 *
 * Palantir-inspired design tokens for consistent, enterprise-grade UI.
 * All values are CSS-compatible strings for use with Tailwind and CSS-in-JS.
 */

// ============================================
// COLOR TOKENS
// ============================================

export const colors = {
    // Brand
    brand: {
        primary: '#004225',      // Augusta green
        primaryLight: '#2E7D32',
        primaryDark: '#00331A',
        accent: '#FFD54F',       // Gold
        accentDark: '#B8860B',
        accentLight: '#FFE082',
    },

    // Surface - Layered dark mode surfaces (not pure black)
    surface: {
        base: '#0A0A0A',         // Background
        raised: '#141414',       // Cards, panels
        overlay: '#1A1A1A',      // Dropdowns, tooltips
        elevated: '#1E1E1E',     // Floating elements
        highlight: '#282828',    // Hover states
        muted: '#333333',        // Disabled backgrounds
    },

    // Borders
    border: {
        subtle: '#2A2A2A',
        default: '#3A3A3A',
        strong: '#4A4A4A',
        focus: '#004225',
    },

    // Text
    text: {
        primary: '#FFFFFF',
        secondary: '#A0A0A0',
        tertiary: '#707070',
        disabled: '#505050',
        inverse: '#0A0A0A',
        link: '#64B5F6',
    },

    // Teams
    team: {
        usa: {
            primary: '#1565C0',
            light: '#42A5F5',
            dark: '#0D47A1',
        },
        europe: {
            primary: '#C62828',
            light: '#EF5350',
            dark: '#B71C1C',
        },
    },

    // Semantic
    semantic: {
        success: '#4CAF50',
        successLight: '#66BB6A',
        successDark: '#388E3C',
        warning: '#FF9800',
        warningLight: '#FFB74D',
        warningDark: '#F57C00',
        error: '#EF5350',
        errorLight: '#E57373',
        errorDark: '#D32F2F',
        info: '#64B5F6',
        infoLight: '#90CAF9',
        infoDark: '#1976D2',
    },
} as const;

// ============================================
// TYPOGRAPHY TOKENS
// ============================================

export const typography = {
    // Font families
    fontFamily: {
        sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        mono: '"SF Mono", SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace',
    },

    // Font sizes (using a perfect fourth scale: 1.333)
    fontSize: {
        '2xs': '0.625rem',    // 10px
        xs: '0.75rem',        // 12px
        sm: '0.875rem',       // 14px
        base: '1rem',         // 16px
        lg: '1.125rem',       // 18px
        xl: '1.25rem',        // 20px
        '2xl': '1.5rem',      // 24px
        '3xl': '1.875rem',    // 30px
        '4xl': '2.25rem',     // 36px
        '5xl': '3rem',        // 48px
        '6xl': '4rem',        // 64px
    },

    // Font weights
    fontWeight: {
        normal: '400',
        medium: '500',
        semibold: '600',
        bold: '700',
    },

    // Line heights
    lineHeight: {
        none: '1',
        tight: '1.25',
        snug: '1.375',
        normal: '1.5',
        relaxed: '1.625',
        loose: '2',
    },

    // Letter spacing
    letterSpacing: {
        tighter: '-0.05em',
        tight: '-0.025em',
        normal: '0',
        wide: '0.025em',
        wider: '0.05em',
        widest: '0.1em',
    },
} as const;

// ============================================
// SPACING TOKENS (8px base unit)
// ============================================

export const spacing = {
    px: '1px',
    '0': '0',
    '0.5': '0.125rem',  // 2px
    '1': '0.25rem',     // 4px
    '1.5': '0.375rem',  // 6px
    '2': '0.5rem',      // 8px
    '2.5': '0.625rem',  // 10px
    '3': '0.75rem',     // 12px
    '4': '1rem',        // 16px
    '5': '1.25rem',     // 20px
    '6': '1.5rem',      // 24px
    '8': '2rem',        // 32px
    '10': '2.5rem',     // 40px
    '12': '3rem',       // 48px
    '16': '4rem',       // 64px
    '20': '5rem',       // 80px
    '24': '6rem',       // 96px
} as const;

// ============================================
// RADII TOKENS
// ============================================

export const radii = {
    none: '0',
    xs: '0.125rem',     // 2px
    sm: '0.25rem',      // 4px
    md: '0.5rem',       // 8px
    lg: '0.75rem',      // 12px
    xl: '1rem',         // 16px
    '2xl': '1.5rem',    // 24px
    full: '9999px',
} as const;

// ============================================
// SHADOW TOKENS
// ============================================

export const shadows = {
    none: 'none',
    xs: '0 1px 2px rgba(0, 0, 0, 0.5)',
    sm: '0 2px 4px rgba(0, 0, 0, 0.4)',
    md: '0 4px 8px rgba(0, 0, 0, 0.3)',
    lg: '0 8px 16px rgba(0, 0, 0, 0.25)',
    xl: '0 12px 24px rgba(0, 0, 0, 0.2)',
    '2xl': '0 24px 48px rgba(0, 0, 0, 0.15)',
    inner: 'inset 0 2px 4px rgba(0, 0, 0, 0.3)',

    // Glow effects (for interactive states)
    glow: {
        primary: '0 0 16px rgba(0, 66, 37, 0.5)',
        accent: '0 0 16px rgba(255, 213, 79, 0.4)',
        usa: '0 0 16px rgba(21, 101, 192, 0.5)',
        europe: '0 0 16px rgba(198, 40, 40, 0.5)',
        success: '0 0 16px rgba(76, 175, 80, 0.4)',
        error: '0 0 16px rgba(239, 83, 80, 0.4)',
    },

    // Card shadows
    card: {
        default: '0 2px 8px rgba(0, 0, 0, 0.4), 0 0 1px rgba(255, 255, 255, 0.05)',
        hover: '0 4px 16px rgba(0, 0, 0, 0.5), 0 0 1px rgba(255, 255, 255, 0.08)',
        elevated: '0 8px 24px rgba(0, 0, 0, 0.6), 0 0 1px rgba(255, 255, 255, 0.1)',
    },

    // Focus ring
    focus: '0 0 0 2px #0A0A0A, 0 0 0 4px #004225',
} as const;

// ============================================
// MOTION TOKENS
// ============================================

export const motion = {
    // Durations
    duration: {
        instant: '75ms',
        fast: '150ms',
        normal: '200ms',
        slow: '300ms',
        slower: '400ms',
        slowest: '500ms',
    },

    // Easings
    easing: {
        linear: 'linear',
        easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
        easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
        easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
        bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        spring: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
    },
} as const;

// ============================================
// BREAKPOINT TOKENS
// ============================================

export const breakpoints = {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
} as const;

// ============================================
// Z-INDEX TOKENS
// ============================================

export const zIndex = {
    behind: -1,
    base: 0,
    raised: 10,
    dropdown: 20,
    sticky: 30,
    overlay: 40,
    modal: 50,
    toast: 60,
    tooltip: 70,
} as const;

// ============================================
// COMPONENT-SPECIFIC TOKENS
// ============================================

export const components = {
    // Button
    button: {
        height: {
            sm: '32px',
            md: '40px',
            lg: '48px',
            xl: '56px',
        },
        minWidth: {
            sm: '64px',
            md: '80px',
            lg: '96px',
        },
    },

    // Input
    input: {
        height: {
            sm: '32px',
            md: '40px',
            lg: '48px',
        },
    },

    // Card
    card: {
        padding: {
            sm: spacing['3'],
            md: spacing['4'],
            lg: spacing['6'],
        },
    },

    // Header
    header: {
        height: '56px',
    },

    // Navigation
    nav: {
        width: {
            rail: '64px',
            expanded: '240px',
        },
        bottomHeight: '64px',
    },

    // Touch targets (WCAG 2.2)
    touchTarget: {
        min: '44px',
        comfortable: '48px',
        large: '56px',
    },
} as const;

// ============================================
// TYPE HELPERS
// ============================================

export type ColorKey = keyof typeof colors;
export type SpacingKey = keyof typeof spacing;
export type RadiiKey = keyof typeof radii;
export type ShadowKey = keyof typeof shadows;
