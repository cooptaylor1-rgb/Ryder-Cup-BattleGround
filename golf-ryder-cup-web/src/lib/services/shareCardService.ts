/**
 * Share Card Service (Production Quality)
 *
 * Generates beautiful, shareable image cards for:
 * - Team standings
 * - Session results
 * - Player awards
 * - Match recaps
 *
 * Uses HTML Canvas for cross-platform image generation.
 */

import type { TeamStandings, PlayerLeaderboard } from '../types/computed';
import type { Award } from '../types/awards';
import type { RyderCupSession, Match } from '../types/models';
import { shareLogger } from '@/lib/utils/logger';

// ============================================
// TYPES
// ============================================

export type ShareCardType = 'standings' | 'session' | 'award' | 'leaderboard' | 'match' | 'recap';

export interface ShareCardOptions {
    tripName: string;
    tripLocation?: string;
    tripDates?: string;
    branding?: boolean;
}

export interface StandingsCardData {
    standings: TeamStandings;
    teamAName: string;
    teamBName: string;
}

export interface SessionCardData {
    session: RyderCupSession;
    matches: Match[];
    teamAName: string;
    teamBName: string;
    teamAPoints: number;
    teamBPoints: number;
}

export interface AwardCardData {
    award: Award;
}

export interface LeaderboardCardData {
    players: PlayerLeaderboard[];
    limit?: number;
}

export interface MatchCardData {
    match: Match;
    teamANames: string[];
    teamBNames: string[];
    score: string;
    winner: 'teamA' | 'teamB' | 'halved';
}

// ============================================
// CONSTANTS
// ============================================

const CARD_WIDTH = 1200;
const CARD_HEIGHT = 630; // 1.91:1 aspect ratio (Twitter/FB optimal)

const COLORS = {
    background: '#0A0A0A',
    surface: '#141414',
    border: '#2A2A2A',
    text: '#FFFFFF',
    textSecondary: '#A0A0A0',
    textTertiary: '#707070',
    gold: '#FFD54F',
    green: '#004225',
    greenLight: '#2E7D32',
    usa: '#1565C0',
    usaLight: '#42A5F5',
    europe: '#C62828',
    europeLight: '#EF5350',
};

const FONTS = {
    title: 'bold 72px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    subtitle: '600 36px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    score: 'bold 120px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    body: '400 28px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    small: '400 22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    label: '600 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
};

// ============================================
// CANVAS HELPERS
// ============================================

function createCanvas(width: number = CARD_WIDTH, height: number = CARD_HEIGHT): {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
} {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;
    return { canvas, ctx };
}

function drawRoundedRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
): void {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
}

function drawBackground(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    // Gradient background
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, COLORS.background);
    gradient.addColorStop(1, '#050505');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Subtle pattern overlay
    ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
    for (let i = 0; i < width; i += 40) {
        ctx.fillRect(i, 0, 1, height);
    }
}

function drawBranding(ctx: CanvasRenderingContext2D, width: number, height: number, tripName: string): void {
    // Top bar
    ctx.fillStyle = COLORS.green;
    ctx.fillRect(0, 0, width, 80);

    // Trip name
    ctx.fillStyle = COLORS.text;
    ctx.font = FONTS.subtitle;
    ctx.textAlign = 'left';
    ctx.fillText(tripName, 40, 52);

    // App branding
    ctx.font = FONTS.small;
    ctx.textAlign = 'right';
    ctx.fillStyle = COLORS.gold;
    ctx.fillText('⛳ Ryder Cup Tracker', width - 40, 52);

    // Bottom accent line
    ctx.fillStyle = COLORS.gold;
    ctx.fillRect(0, height - 8, width, 8);
}

// ============================================
// CARD GENERATORS
// ============================================

/**
 * Generate standings share card
 */
export async function generateStandingsCard(
    data: StandingsCardData,
    options: ShareCardOptions
): Promise<Blob> {
    const { canvas, ctx } = createCanvas();

    // Background
    drawBackground(ctx, CARD_WIDTH, CARD_HEIGHT);
    drawBranding(ctx, CARD_WIDTH, CARD_HEIGHT, options.tripName);

    // Title
    ctx.fillStyle = COLORS.text;
    ctx.font = FONTS.title;
    ctx.textAlign = 'center';
    ctx.fillText('STANDINGS', CARD_WIDTH / 2, 170);

    // Team scores container
    const scoreY = 260;
    const scoreWidth = 450;
    const scoreHeight = 280;
    const gap = 60;

    // Team A (USA)
    const teamAX = CARD_WIDTH / 2 - scoreWidth - gap / 2;
    drawRoundedRect(ctx, teamAX, scoreY, scoreWidth, scoreHeight, 20);
    ctx.fillStyle = COLORS.surface;
    ctx.fill();
    ctx.strokeStyle = COLORS.usa;
    ctx.lineWidth = 4;
    ctx.stroke();

    // Team A name
    ctx.fillStyle = COLORS.usaLight;
    ctx.font = FONTS.subtitle;
    ctx.textAlign = 'center';
    ctx.fillText(data.teamAName, teamAX + scoreWidth / 2, scoreY + 60);

    // Team A score
    ctx.fillStyle = COLORS.text;
    ctx.font = FONTS.score;
    ctx.fillText(data.standings.teamAPoints.toString(), teamAX + scoreWidth / 2, scoreY + 200);

    // Team B (Europe)
    const teamBX = CARD_WIDTH / 2 + gap / 2;
    drawRoundedRect(ctx, teamBX, scoreY, scoreWidth, scoreHeight, 20);
    ctx.fillStyle = COLORS.surface;
    ctx.fill();
    ctx.strokeStyle = COLORS.europe;
    ctx.lineWidth = 4;
    ctx.stroke();

    // Team B name
    ctx.fillStyle = COLORS.europeLight;
    ctx.font = FONTS.subtitle;
    ctx.textAlign = 'center';
    ctx.fillText(data.teamBName, teamBX + scoreWidth / 2, scoreY + 60);

    // Team B score
    ctx.fillStyle = COLORS.text;
    ctx.font = FONTS.score;
    ctx.fillText(data.standings.teamBPoints.toString(), teamBX + scoreWidth / 2, scoreY + 200);

    // Match stats
    ctx.fillStyle = COLORS.textSecondary;
    ctx.font = FONTS.body;
    ctx.textAlign = 'center';
    const totalMatches = data.standings.matchesCompleted;
    const remainingMatches = data.standings.remainingMatches;
    ctx.fillText(
        `${totalMatches} matches played${remainingMatches > 0 ? ` • ${remainingMatches} remaining` : ''}`,
        CARD_WIDTH / 2,
        scoreY + scoreHeight + 50
    );

    return new Promise((resolve) => {
        canvas.toBlob((blob) => resolve(blob!), 'image/png', 1.0);
    });
}

/**
 * Generate session results card
 */
export async function generateSessionCard(
    data: SessionCardData,
    options: ShareCardOptions
): Promise<Blob> {
    const { canvas, ctx } = createCanvas();

    // Background
    drawBackground(ctx, CARD_WIDTH, CARD_HEIGHT);
    drawBranding(ctx, CARD_WIDTH, CARD_HEIGHT, options.tripName);

    // Session title
    ctx.fillStyle = COLORS.textSecondary;
    ctx.font = FONTS.body;
    ctx.textAlign = 'center';
    ctx.fillText(data.session.sessionType.toUpperCase(), CARD_WIDTH / 2, 140);

    ctx.fillStyle = COLORS.text;
    ctx.font = FONTS.title;
    ctx.fillText(data.session.name, CARD_WIDTH / 2, 200);

    // Session score
    const scoreY = 280;
    ctx.font = FONTS.score;

    // Team A score
    ctx.fillStyle = COLORS.usaLight;
    ctx.textAlign = 'right';
    ctx.fillText(data.teamAPoints.toString(), CARD_WIDTH / 2 - 50, scoreY);

    // Divider
    ctx.fillStyle = COLORS.textTertiary;
    ctx.font = FONTS.title;
    ctx.textAlign = 'center';
    ctx.fillText('-', CARD_WIDTH / 2, scoreY);

    // Team B score
    ctx.fillStyle = COLORS.europeLight;
    ctx.textAlign = 'left';
    ctx.font = FONTS.score;
    ctx.fillText(data.teamBPoints.toString(), CARD_WIDTH / 2 + 50, scoreY);

    // Team names
    ctx.font = FONTS.subtitle;
    ctx.fillStyle = COLORS.usaLight;
    ctx.textAlign = 'right';
    ctx.fillText(data.teamAName, CARD_WIDTH / 2 - 50, scoreY + 60);

    ctx.fillStyle = COLORS.europeLight;
    ctx.textAlign = 'left';
    ctx.fillText(data.teamBName, CARD_WIDTH / 2 + 50, scoreY + 60);

    // Match results list
    const matchY = 400;
    const matchHeight = 40;
    const maxMatches = Math.min(data.matches.length, 4);

    ctx.font = FONTS.small;
    for (let i = 0; i < maxMatches; i++) {
        const match = data.matches[i];
        const y = matchY + i * matchHeight;

        // Match result indicator
        const winnerColor = match.result === 'teamAWin' ? COLORS.usa :
            match.result === 'teamBWin' ? COLORS.europe : COLORS.textTertiary;
        ctx.fillStyle = winnerColor;
        ctx.beginPath();
        ctx.arc(CARD_WIDTH / 2, y + 15, 8, 0, Math.PI * 2);
        ctx.fill();

        // Match text
        ctx.fillStyle = COLORS.textSecondary;
        ctx.textAlign = 'center';
        const marginText = match.margin ? `${match.margin}&${match.holesRemaining || 0}` : 'HALVED';
        ctx.fillText(`Match ${i + 1}: ${marginText}`, CARD_WIDTH / 2, y + 20);
    }

    if (data.matches.length > maxMatches) {
        ctx.fillStyle = COLORS.textTertiary;
        ctx.fillText(`+ ${data.matches.length - maxMatches} more matches`, CARD_WIDTH / 2, matchY + maxMatches * matchHeight + 20);
    }

    return new Promise((resolve) => {
        canvas.toBlob((blob) => resolve(blob!), 'image/png', 1.0);
    });
}

/**
 * Generate award card
 */
export async function generateAwardCard(
    data: AwardCardData,
    options: ShareCardOptions
): Promise<Blob> {
    const { canvas, ctx } = createCanvas();

    // Background with gold accent
    drawBackground(ctx, CARD_WIDTH, CARD_HEIGHT);

    // Gold accent bar
    ctx.fillStyle = COLORS.gold;
    ctx.fillRect(0, 0, CARD_WIDTH, 80);

    // Trip name
    ctx.fillStyle = COLORS.background;
    ctx.font = FONTS.subtitle;
    ctx.textAlign = 'left';
    ctx.fillText(options.tripName, 40, 52);

    // Award icon (large emoji)
    ctx.font = '120px serif';
    ctx.textAlign = 'center';
    ctx.fillText(data.award.icon, CARD_WIDTH / 2, 220);

    // Award title
    ctx.fillStyle = COLORS.gold;
    ctx.font = FONTS.title;
    ctx.fillText(data.award.title.toUpperCase(), CARD_WIDTH / 2, 310);

    // Award description
    ctx.fillStyle = COLORS.textSecondary;
    ctx.font = FONTS.body;
    ctx.fillText(data.award.description, CARD_WIDTH / 2, 360);

    // Winner
    if (data.award.winner) {
        const winnerY = 440;

        // Winner card
        drawRoundedRect(ctx, CARD_WIDTH / 2 - 300, winnerY, 600, 100, 16);
        const teamColor = data.award.winner.teamColor === 'usa' ? COLORS.usa : COLORS.europe;
        ctx.fillStyle = teamColor;
        ctx.globalAlpha = 0.2;
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.strokeStyle = teamColor;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Crown icon
        ctx.font = '40px serif';
        ctx.fillText('👑', CARD_WIDTH / 2 - 250, winnerY + 60);

        // Winner name
        ctx.fillStyle = COLORS.text;
        ctx.font = FONTS.subtitle;
        ctx.textAlign = 'left';
        ctx.fillText(data.award.winner.playerName, CARD_WIDTH / 2 - 200, winnerY + 55);

        // Winner value
        ctx.fillStyle = COLORS.gold;
        ctx.font = FONTS.subtitle;
        ctx.textAlign = 'right';
        ctx.fillText(String(data.award.winner.value), CARD_WIDTH / 2 + 280, winnerY + 55);
    }

    // Bottom accent
    ctx.fillStyle = COLORS.gold;
    ctx.fillRect(0, CARD_HEIGHT - 8, CARD_WIDTH, 8);

    return new Promise((resolve) => {
        canvas.toBlob((blob) => resolve(blob!), 'image/png', 1.0);
    });
}

/**
 * Generate player leaderboard card
 */
export async function generateLeaderboardCard(
    data: LeaderboardCardData,
    options: ShareCardOptions
): Promise<Blob> {
    const { canvas, ctx } = createCanvas();

    // Background
    drawBackground(ctx, CARD_WIDTH, CARD_HEIGHT);
    drawBranding(ctx, CARD_WIDTH, CARD_HEIGHT, options.tripName);

    // Title
    ctx.fillStyle = COLORS.text;
    ctx.font = FONTS.title;
    ctx.textAlign = 'center';
    ctx.fillText('LEADERBOARD', CARD_WIDTH / 2, 170);

    // Player list
    const limit = data.limit || 5;
    const startY = 230;
    const rowHeight = 70;

    for (let i = 0; i < Math.min(data.players.length, limit); i++) {
        const player = data.players[i];
        const y = startY + i * rowHeight;
        // Detect team color from team name (USA vs Europe)
        const isUSA = player.teamName.toLowerCase().includes('usa') ||
            player.teamName.toLowerCase().includes('america') ||
            player.teamName.toLowerCase().includes('us');
        const teamColor = isUSA ? COLORS.usa : COLORS.europe;

        // Row background
        drawRoundedRect(ctx, 100, y, CARD_WIDTH - 200, 60, 12);
        ctx.fillStyle = COLORS.surface;
        ctx.fill();

        // Position
        ctx.fillStyle = i < 3 ? COLORS.gold : COLORS.textSecondary;
        ctx.font = FONTS.subtitle;
        ctx.textAlign = 'center';
        ctx.fillText(`${i + 1}`, 150, y + 42);

        // Team color indicator
        ctx.fillStyle = teamColor;
        ctx.beginPath();
        ctx.arc(200, y + 30, 10, 0, Math.PI * 2);
        ctx.fill();

        // Player name
        ctx.fillStyle = COLORS.text;
        ctx.font = FONTS.body;
        ctx.textAlign = 'left';
        ctx.fillText(player.playerName, 230, y + 40);

        // Points
        ctx.fillStyle = COLORS.gold;
        ctx.font = FONTS.subtitle;
        ctx.textAlign = 'right';
        ctx.fillText(`${player.points} pts`, CARD_WIDTH - 130, y + 42);
    }

    return new Promise((resolve) => {
        canvas.toBlob((blob) => resolve(blob!), 'image/png', 1.0);
    });
}

// ============================================
// SHARE HELPERS
// ============================================

/**
 * Share a card using Web Share API or fallback to download
 */
export async function shareCard(blob: Blob, filename: string, title: string): Promise<boolean> {
    const file = new File([blob], filename, { type: 'image/png' });

    // Try Web Share API first
    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
            await navigator.share({
                title,
                files: [file],
            });
            return true;
        } catch (err) {
            // User cancelled or share failed
            if ((err as Error).name !== 'AbortError') {
                shareLogger.error('Share failed:', err);
            }
        }
    }

    // Fallback: download the image
    downloadBlob(blob, filename);
    return true;
}

/**
 * Download a blob as a file
 */
export function downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/**
 * Copy card to clipboard (for platforms that support it)
 */
export async function copyCardToClipboard(blob: Blob): Promise<boolean> {
    try {
        await navigator.clipboard.write([
            new ClipboardItem({
                'image/png': blob,
            }),
        ]);
        return true;
    } catch (err) {
        shareLogger.error('Clipboard copy failed:', err);
        return false;
    }
}

// ============================================
// HIGH-LEVEL API
// ============================================

/**
 * Generate and share standings card
 */
export async function shareStandings(
    standings: TeamStandings,
    teamAName: string,
    teamBName: string,
    tripName: string
): Promise<boolean> {
    const blob = await generateStandingsCard(
        { standings, teamAName, teamBName },
        { tripName }
    );
    return shareCard(blob, `${tripName.replace(/\s+/g, '-')}-standings.png`, `${tripName} Standings`);
}

/**
 * Generate and share session results card
 */
export async function shareSession(
    session: RyderCupSession,
    matches: Match[],
    teamAName: string,
    teamBName: string,
    teamAPoints: number,
    teamBPoints: number,
    tripName: string
): Promise<boolean> {
    const blob = await generateSessionCard(
        { session, matches, teamAName, teamBName, teamAPoints, teamBPoints },
        { tripName }
    );
    return shareCard(
        blob,
        `${tripName.replace(/\s+/g, '-')}-${session.name.replace(/\s+/g, '-')}.png`,
        `${tripName} - ${session.name}`
    );
}

/**
 * Generate and share award card
 */
export async function shareAward(award: Award, tripName: string): Promise<boolean> {
    const blob = await generateAwardCard({ award }, { tripName });
    const winnerName = award.winner?.playerName || 'Unknown';
    return shareCard(
        blob,
        `${tripName.replace(/\s+/g, '-')}-${award.type}.png`,
        `${tripName} - ${award.title}: ${winnerName}`
    );
}

/**
 * Generate and share leaderboard card
 */
export async function shareLeaderboard(
    players: PlayerLeaderboard[],
    tripName: string,
    limit: number = 5
): Promise<boolean> {
    const blob = await generateLeaderboardCard({ players, limit }, { tripName });
    return shareCard(blob, `${tripName.replace(/\s+/g, '-')}-leaderboard.png`, `${tripName} Leaderboard`);
}
