/**
 * SEO Metadata Utilities
 *
 * Centralized metadata generation for consistent SEO across all routes.
 * Uses Next.js 13+ Metadata API.
 */

import type { Metadata, Viewport } from 'next';

// ============================================
// CONSTANTS
// ============================================

const APP_NAME = 'Golf Ryder Cup';
const APP_DESCRIPTION = 'Track your Ryder Cup style golf trips with real-time scoring, team standings, and match play tracking.';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://golf-ryder-cup.app';

// ============================================
// DYNAMIC OG IMAGE GENERATION
// ============================================

interface OGImageParams {
  type: 'default' | 'match' | 'standings';
  team1?: string;
  team2?: string;
  score1?: string;
  score2?: string;
  status?: string;
  trip?: string;
}

/**
 * Generate dynamic OG image URL
 */
export function generateOGImageUrl(params: OGImageParams): string {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) {
      searchParams.set(key, value);
    }
  });
  return `${APP_URL}/api/og?${searchParams.toString()}`;
}

// ============================================
// BASE METADATA
// ============================================

export const baseMetadata: Metadata = {
    applicationName: APP_NAME,
    authors: [{ name: 'Golf Ryder Cup Team' }],
    creator: 'Golf Ryder Cup',
    publisher: 'Golf Ryder Cup',
    formatDetection: {
        email: false,
        address: false,
        telephone: false,
    },
    metadataBase: new URL(APP_URL),
    openGraph: {
        type: 'website',
        locale: 'en_US',
        siteName: APP_NAME,
        images: [
            {
                url: generateOGImageUrl({ type: 'default' }),
                width: 1200,
                height: 630,
                alt: 'Golf Ryder Cup - The Ultimate Golf Trip Companion',
            },
        ],
    },
    twitter: {
        card: 'summary_large_image',
        images: [generateOGImageUrl({ type: 'default' })],
    },
    robots: {
        index: true,
        follow: true,
    },
};

export const viewport: Viewport = {
    themeColor: [
        { media: '(prefers-color-scheme: light)', color: '#006747' },
        { media: '(prefers-color-scheme: dark)', color: '#1a1a1a' },
    ],
    width: 'device-width',
    initialScale: 1,
    maximumScale: 5,
    userScalable: true,
    viewportFit: 'cover',
};

// ============================================
// METADATA GENERATORS
// ============================================

interface GenerateMetadataOptions {
    title: string;
    description?: string;
    path?: string;
    noIndex?: boolean;
    image?: string;
}

/**
 * Generate page-specific metadata
 */
export function generatePageMetadata({
    title,
    description = APP_DESCRIPTION,
    path = '/',
    noIndex = false,
    image,
}: GenerateMetadataOptions): Metadata {
    const fullTitle = title === APP_NAME ? title : `${title} | ${APP_NAME}`;
    const url = `${APP_URL}${path}`;

    return {
        title: fullTitle,
        description,
        alternates: {
            canonical: url,
        },
        openGraph: {
            title: fullTitle,
            description,
            url,
            images: image ? [{ url: image, width: 1200, height: 630, alt: title }] : undefined,
        },
        twitter: {
            title: fullTitle,
            description,
            images: image ? [image] : undefined,
        },
        robots: noIndex
            ? { index: false, follow: false }
            : { index: true, follow: true },
    };
}

// ============================================
// PRE-DEFINED PAGE METADATA
// ============================================

export const pageMetadata = {
    home: generatePageMetadata({
        title: APP_NAME,
        description: 'Track your Ryder Cup style golf trips with real-time scoring, team standings, and comprehensive match play tracking.',
        path: '/',
    }),

    standings: generatePageMetadata({
        title: 'Standings',
        description: 'View live team standings, point totals, and match results for your Ryder Cup golf trip.',
        path: '/standings',
    }),

    score: generatePageMetadata({
        title: 'Score Entry',
        description: 'Enter match scores with our intuitive scoring interface. Supports match play and stroke play formats.',
        path: '/score',
    }),

    captain: generatePageMetadata({
        title: 'Captain Mode',
        description: 'Manage your golf trip as captain. Create lineups, manage players, and oversee all match activities.',
        path: '/captain',
    }),

    players: generatePageMetadata({
        title: 'Players',
        description: 'View all players in your golf trip, their stats, and team assignments.',
        path: '/players',
    }),

    profile: generatePageMetadata({
        title: 'Profile',
        description: 'Manage your player profile, handicap, and personal settings.',
        path: '/profile',
    }),

    settings: generatePageMetadata({
        title: 'Settings',
        description: 'Configure app settings, scoring preferences, and notification options.',
        path: '/settings',
    }),

    schedule: generatePageMetadata({
        title: 'Schedule',
        description: 'View your golf trip schedule, tee times, and upcoming matches.',
        path: '/schedule',
    }),

    achievements: generatePageMetadata({
        title: 'Achievements',
        description: 'View earned achievements and awards from your golf trips.',
        path: '/achievements',
    }),

    courses: generatePageMetadata({
        title: 'Courses',
        description: 'Browse and manage golf courses for your trip. Add new courses or select from the library.',
        path: '/courses',
    }),

    bets: generatePageMetadata({
        title: 'Side Bets',
        description: 'Track side bets and prop wagers for your golf trip.',
        path: '/bets',
    }),

    live: generatePageMetadata({
        title: 'Live Scoring',
        description: 'Follow live match scoring and real-time updates from the course.',
        path: '/live',
    }),

    social: generatePageMetadata({
        title: 'Social',
        description: 'Share moments, photos, and highlights from your golf trip.',
        path: '/social',
    }),

    matchups: generatePageMetadata({
        title: 'Matchups',
        description: 'View all match pairings and head-to-head results.',
        path: '/matchups',
    }),

    login: generatePageMetadata({
        title: 'Login',
        description: 'Join your golf trip or create a new account.',
        path: '/login',
        noIndex: true,
    }),

    awards: generatePageMetadata({
        title: 'Awards',
        description: 'View trip awards, accolades, and player achievements from your Ryder Cup golf trip.',
        path: '/awards',
    }),

    stats: generatePageMetadata({
        title: 'Statistics',
        description: 'Deep dive into player statistics, performance trends, and historical data from your golf trips.',
        path: '/stats',
    }),

    spectator: generatePageMetadata({
        title: 'Spectator View',
        description: 'Follow along with live match updates and scores as a spectator.',
        path: '/spectator',
    }),

    lineup: generatePageMetadata({
        title: 'Lineup',
        description: 'View and manage team lineups and player pairings for each match session.',
        path: '/lineup',
    }),

    scoring: generatePageMetadata({
        title: 'Scoring',
        description: 'Enter and track hole-by-hole scores with real-time match status updates.',
        path: '/scoring',
    }),
};
