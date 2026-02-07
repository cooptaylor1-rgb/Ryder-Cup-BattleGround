/**
 * Tee Time Management Service
 *
 * Generate and manage tee times for sessions:
 * - Staggered starts
 * - Shotgun starts
 * - Wave starts
 * - Custom assignments
 */

import type {
    TeeTimeSlot,
    TeeTimeGeneratorConfig,
    GeneratedTeeSheet,
} from '@/lib/types/captain';
import type { Match, RyderCupSession, UUID } from '@/lib/types/models';

// Re-export types for convenience
export type {
    TeeTimeSlot,
    TeeTimeGeneratorConfig,
    GeneratedTeeSheet,
} from '@/lib/types/captain';

/**
 * Default tee time intervals by session type
 */
const DEFAULT_INTERVALS: Record<string, number> = {
    singles: 8,      // 8 minutes between singles groups
    fourball: 10,    // 10 minutes between fourball groups
    foursomes: 10,   // 10 minutes between foursomes groups
};

/**
 * Generate staggered tee times
 */
function generateStaggeredTeeTimes(
    sessionId: UUID,
    matches: Match[],
    config: TeeTimeGeneratorConfig,
    date: Date
): TeeTimeSlot[] {
    const slots: TeeTimeSlot[] = [];
    const [hours, minutes] = config.firstTeeTime.split(':').map(Number);

    let currentTime = new Date(date);
    currentTime.setHours(hours, minutes, 0, 0);

    const orderedMatches = config.reverseOrder
        ? [...matches].reverse()
        : matches;

    for (const match of orderedMatches) {
        slots.push({
            id: crypto.randomUUID(),
            sessionId,
            matchId: match.id,
            time: currentTime.toISOString(),
            startingHole: 1,
            groupName: `Match ${match.matchOrder}`,
        });

        // Add interval
        currentTime = new Date(currentTime.getTime() + config.intervalMinutes * 60 * 1000);
    }

    return slots;
}

/**
 * Generate shotgun start tee times
 */
function generateShotgunTeeTimes(
    sessionId: UUID,
    matches: Match[],
    config: TeeTimeGeneratorConfig,
    date: Date
): TeeTimeSlot[] {
    const slots: TeeTimeSlot[] = [];
    const [hours, minutes] = config.firstTeeTime.split(':').map(Number);

    const startTime = new Date(date);
    startTime.setHours(hours, minutes, 0, 0);

    // Default shotgun holes if not specified
    const shotgunHoles = config.shotgunHoles || [1, 3, 5, 7, 10, 12, 14, 16];

    matches.forEach((match, index) => {
        const startingHole = shotgunHoles[index % shotgunHoles.length] || 1;

        slots.push({
            id: crypto.randomUUID(),
            sessionId,
            matchId: match.id,
            time: startTime.toISOString(), // All same time for shotgun
            startingHole,
            groupName: `Match ${match.matchOrder} - Hole ${startingHole}`,
        });
    });

    return slots;
}

/**
 * Generate wave start tee times
 */
function generateWaveTeeTimes(
    sessionId: UUID,
    matches: Match[],
    config: TeeTimeGeneratorConfig,
    date: Date
): TeeTimeSlot[] {
    const slots: TeeTimeSlot[] = [];

    if (!config.waveConfig || config.waveConfig.length === 0) {
        // Fall back to staggered
        return generateStaggeredTeeTimes(sessionId, matches, config, date);
    }

    for (const wave of config.waveConfig) {
        const [hours, minutes] = wave.startTime.split(':').map(Number);
        const waveTime = new Date(date);
        waveTime.setHours(hours, minutes, 0, 0);

        const waveMatches = matches.filter(m => wave.matchIds.includes(m.id));

        waveMatches.forEach((match, index) => {
            // Stagger within wave
            const matchTime = new Date(waveTime.getTime() + index * config.intervalMinutes * 60 * 1000);

            slots.push({
                id: crypto.randomUUID(),
                sessionId,
                matchId: match.id,
                time: matchTime.toISOString(),
                startingHole: 1,
                groupName: `${wave.waveName} - Match ${match.matchOrder}`,
            });
        });
    }

    return slots;
}

/**
 * Generate tee sheet for a session
 */
export function generateTeeSheet(
    session: RyderCupSession,
    matches: Match[],
    config: Partial<TeeTimeGeneratorConfig>,
    date?: Date
): GeneratedTeeSheet {
    const sessionMatches = matches
        .filter(m => m.sessionId === session.id)
        .sort((a, b) => a.matchOrder - b.matchOrder);

    const teeDate = date || (session.scheduledDate ? new Date(session.scheduledDate) : new Date());

    const finalConfig: TeeTimeGeneratorConfig = {
        mode: config.mode || 'staggered',
        firstTeeTime: config.firstTeeTime || (session.timeSlot === 'PM' ? '13:00' : '08:00'),
        intervalMinutes: config.intervalMinutes || DEFAULT_INTERVALS[session.sessionType] || 10,
        reverseOrder: config.reverseOrder || false,
        shotgunHoles: config.shotgunHoles,
        waveConfig: config.waveConfig,
    };

    let slots: TeeTimeSlot[];

    switch (finalConfig.mode) {
        case 'shotgun':
            slots = generateShotgunTeeTimes(session.id, sessionMatches, finalConfig, teeDate);
            break;
        case 'wave':
            slots = generateWaveTeeTimes(session.id, sessionMatches, finalConfig, teeDate);
            break;
        case 'staggered':
        default:
            slots = generateStaggeredTeeTimes(session.id, sessionMatches, finalConfig, teeDate);
            break;
    }

    // Calculate summary
    const times = slots.map(s => new Date(s.time).getTime());
    const firstTime = Math.min(...times);
    const lastTime = Math.max(...times);
    const duration = Math.round((lastTime - firstTime) / (60 * 1000));

    return {
        sessionId: session.id,
        slots,
        totalDuration: duration,
        firstTeeTime: formatTime(new Date(firstTime)),
        lastTeeTime: formatTime(new Date(lastTime)),
    };
}

/**
 * Format time as HH:MM AM/PM
 */
function formatTime(date: Date): string {
    return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });
}

/**
 * Format time as HH:MM (24hr)
 */
export function formatTime24(date: Date): string {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
}

/**
 * Parse time string to hours and minutes
 */
export function parseTimeString(time: string): { hours: number; minutes: number } {
    const [hours, minutes] = time.split(':').map(Number);
    return { hours: hours || 0, minutes: minutes || 0 };
}

/**
 * Generate suggested tee times based on match count
 */
export function suggestTeeTimeConfig(
    matchCount: number,
    sessionType: string,
    preferredStart: string = '08:00'
): TeeTimeGeneratorConfig {
    // For large groups (12+ matches), suggest shotgun
    if (matchCount >= 12) {
        return {
            mode: 'shotgun',
            firstTeeTime: preferredStart,
            intervalMinutes: 0,
            shotgunHoles: generateShotgunHoles(matchCount),
        };
    }

    // For medium groups (6-11), consider waves
    if (matchCount >= 6) {
        return {
            mode: 'staggered',
            firstTeeTime: preferredStart,
            intervalMinutes: DEFAULT_INTERVALS[sessionType] || 10,
        };
    }

    // Small groups - simple staggered
    return {
        mode: 'staggered',
        firstTeeTime: preferredStart,
        intervalMinutes: DEFAULT_INTERVALS[sessionType] || 10,
    };
}

/**
 * Generate shotgun starting holes
 */
function generateShotgunHoles(groupCount: number): number[] {
    // Spread groups across 18 holes
    const spacing = Math.floor(18 / groupCount);
    const holes: number[] = [];

    for (let i = 0; i < groupCount; i++) {
        const hole = (i * spacing) + 1;
        holes.push(hole <= 18 ? hole : ((hole - 1) % 18) + 1);
    }

    return holes;
}

/**
 * Calculate estimated finish time
 */
export function calculateFinishTime(
    startTime: string,
    sessionType: string,
    isNineHoles: boolean = false
): string {
    const [hours, minutes] = startTime.split(':').map(Number);
    const start = new Date();
    start.setHours(hours, minutes, 0, 0);

    // Estimated round times (minutes)
    const roundTimes: Record<string, number> = {
        singles: isNineHoles ? 120 : 240,
        fourball: isNineHoles ? 135 : 270,
        foursomes: isNineHoles ? 120 : 240,
    };

    const duration = roundTimes[sessionType] || 240;
    const finish = new Date(start.getTime() + duration * 60 * 1000);

    return formatTime(finish);
}

/**
 * Check for tee time conflicts
 */
export function checkTeeTimeConflicts(
    slots: TeeTimeSlot[],
    minimumInterval: number = 8
): { hasConflicts: boolean; conflicts: string[] } {
    const conflicts: string[] = [];
    const sortedSlots = [...slots].sort((a, b) =>
        new Date(a.time).getTime() - new Date(b.time).getTime()
    );

    for (let i = 0; i < sortedSlots.length - 1; i++) {
        const current = new Date(sortedSlots[i].time);
        const next = new Date(sortedSlots[i + 1].time);
        const gap = (next.getTime() - current.getTime()) / (60 * 1000);

        if (gap < minimumInterval && sortedSlots[i].startingHole === sortedSlots[i + 1].startingHole) {
            conflicts.push(
                `${sortedSlots[i].groupName} and ${sortedSlots[i + 1].groupName} are only ${gap} minutes apart`
            );
        }
    }

    return {
        hasConflicts: conflicts.length > 0,
        conflicts,
    };
}

/**
 * Format tee sheet for display/export
 */
export function formatTeeSheetForDisplay(
    teeSheet: GeneratedTeeSheet,
    matches: Match[],
    getPlayerNames: (ids: string[]) => string
): {
    time: string;
    hole: number;
    teamA: string;
    teamB: string;
    match: string;
}[] {
    return teeSheet.slots.map(slot => {
        const match = matches.find(m => m.id === slot.matchId);

        return {
            time: formatTime(new Date(slot.time)),
            hole: slot.startingHole,
            teamA: match ? getPlayerNames(match.teamAPlayerIds) : '-',
            teamB: match ? getPlayerNames(match.teamBPlayerIds) : '-',
            match: slot.groupName || `Match ${match?.matchOrder || '?'}`,
        };
    });
}

/**
 * Generate printable tee sheet text
 */
export function generatePrintableTeeSheet(
    sessionName: string,
    date: string,
    formatted: ReturnType<typeof formatTeeSheetForDisplay>
): string {
    const lines: string[] = [
        `TEE SHEET: ${sessionName}`,
        `Date: ${date}`,
        '─'.repeat(60),
        '',
        'TIME     | HOLE | TEAM A              | TEAM B',
        '─'.repeat(60),
    ];

    for (const row of formatted) {
        lines.push(
            `${row.time.padEnd(8)} | ${row.hole.toString().padStart(4)} | ${row.teamA.padEnd(19)} | ${row.teamB}`
        );
    }

    lines.push('─'.repeat(60));

    return lines.join('\n');
}
