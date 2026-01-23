/**
 * Communication Hub Service
 *
 * Enhanced messaging system for captains:
 * - Message templates
 * - Team-specific messaging
 * - Read tracking
 * - Scheduled messages
 */

import type {
    MessageTemplate,
    CaptainMessage,
    ReadReceipt,
    MessageStats,
    MessageTargetType,
} from '@/lib/types/captain';
import type { UUID, Player } from '@/lib/types/models';

/**
 * Pre-built message templates
 */
export const MESSAGE_TEMPLATES: MessageTemplate[] = [
    {
        id: 'lineup-posted',
        name: 'Lineups Posted',
        title: '📋 Lineups Are Posted!',
        message: 'Check the app to see {{sessionName}} pairings. Good luck everyone!',
        category: 'lineup',
        icon: 'ClipboardList',
        variables: ['sessionName'],
    },
    {
        id: 'tee-times-set',
        name: 'Tee Times Set',
        title: '⛳ Tee Times Announced',
        message: '{{sessionName}} tee times are set. First group off at {{firstTeeTime}}. Don\'t be late!',
        category: 'schedule',
        icon: 'Clock',
        variables: ['sessionName', 'firstTeeTime'],
    },
    {
        id: 'session-starting',
        name: 'Session Starting',
        title: '🏌️ Time to Tee It Up!',
        message: '{{sessionName}} is starting soon. Please head to your assigned tee.',
        category: 'reminder',
        icon: 'Flag',
        variables: ['sessionName'],
    },
    {
        id: 'results-posted',
        name: 'Results Posted',
        title: '🏆 Session Results',
        message: '{{sessionName}} is complete! {{winningTeam}} takes the session {{score}}. Check standings for details.',
        category: 'results',
        icon: 'Trophy',
        variables: ['sessionName', 'winningTeam', 'score'],
    },
    {
        id: 'weather-update',
        name: 'Weather Update',
        title: '🌤️ Weather Update',
        message: 'Weather check: {{conditions}}. {{recommendation}}',
        category: 'general',
        icon: 'Cloud',
        variables: ['conditions', 'recommendation'],
    },
    {
        id: 'dinner-plans',
        name: 'Dinner Plans',
        title: '🍽️ Dinner Tonight',
        message: 'Dinner at {{venue}} at {{time}}. {{notes}}',
        category: 'general',
        icon: 'UtensilsCrossed',
        variables: ['venue', 'time', 'notes'],
    },
    {
        id: 'morning-reminder',
        name: 'Morning Reminder',
        title: '☀️ Good Morning!',
        message: 'Today\'s schedule: {{schedule}}. First tee time at {{firstTeeTime}}. Let\'s have a great day!',
        category: 'reminder',
        icon: 'Sun',
        variables: ['schedule', 'firstTeeTime'],
    },
    {
        id: 'cart-reminder',
        name: 'Cart Reminder',
        title: '🛒 Cart Path Only',
        message: 'Heads up: {{courseName}} is cart path only today. Plan accordingly!',
        category: 'general',
        icon: 'AlertTriangle',
        variables: ['courseName'],
    },
    {
        id: 'sunscreen-reminder',
        name: 'Sunscreen Reminder',
        title: '☀️ Don\'t Forget Sunscreen!',
        message: 'UV index is high today. Protect yourself out there!',
        category: 'reminder',
        icon: 'Sun',
        variables: [],
    },
    {
        id: 'custom',
        name: 'Custom Message',
        title: '',
        message: '',
        category: 'general',
        icon: 'MessageCircle',
        variables: [],
    },
];

/**
 * Fill template with variables
 */
export function fillTemplate(
    template: MessageTemplate,
    variables: Record<string, string>
): { title: string; message: string } {
    let title = template.title;
    let message = template.message;

    for (const [key, value] of Object.entries(variables)) {
        const pattern = new RegExp(`{{${key}}}`, 'g');
        title = title.replace(pattern, value);
        message = message.replace(pattern, value);
    }

    return { title, message };
}

/**
 * Create a new captain message
 */
export function createCaptainMessage(
    tripId: UUID,
    title: string,
    message: string,
    targetType: MessageTargetType,
    createdBy: UUID,
    options?: {
        targetPlayerIds?: UUID[];
        priority?: 'normal' | 'urgent';
    }
): CaptainMessage {
    return {
        id: crypto.randomUUID(),
        tripId,
        title,
        message,
        targetType,
        targetPlayerIds: options?.targetPlayerIds,
        priority: options?.priority || 'normal',
        sentAt: new Date().toISOString(),
        readBy: [],
        createdBy,
    };
}

/**
 * Get target players for a message
 */
export function getTargetPlayers(
    targetType: MessageTargetType,
    allPlayers: Player[],
    teamAPlayerIds: UUID[],
    teamBPlayerIds: UUID[],
    specificPlayerIds?: UUID[]
): Player[] {
    switch (targetType) {
        case 'all':
            return allPlayers;
        case 'team_a':
            return allPlayers.filter(p => teamAPlayerIds.includes(p.id));
        case 'team_b':
            return allPlayers.filter(p => teamBPlayerIds.includes(p.id));
        case 'specific':
            return allPlayers.filter(p => specificPlayerIds?.includes(p.id));
        case 'captains':
            // Would need captain info - return empty for now
            return [];
        default:
            return allPlayers;
    }
}

/**
 * Record message read
 */
export function recordRead(
    messageId: UUID,
    playerId: UUID,
    existingReads: ReadReceipt[]
): ReadReceipt[] {
    // Check if already read
    if (existingReads.some(r => r.messageId === messageId && r.playerId === playerId)) {
        return existingReads;
    }

    return [
        ...existingReads,
        {
            messageId,
            playerId,
            readAt: new Date().toISOString(),
        },
    ];
}

/**
 * Calculate message statistics
 */
export function calculateMessageStats(
    message: CaptainMessage,
    targetPlayerIds: UUID[]
): MessageStats {
    const totalSent = targetPlayerIds.length;
    const totalRead = message.readBy.length;
    const readRate = totalSent > 0 ? Math.round((totalRead / totalSent) * 100) : 0;
    const unreadPlayerIds = targetPlayerIds.filter(id => !message.readBy.includes(id));

    return {
        totalSent,
        totalRead,
        readRate,
        unreadPlayerIds,
    };
}

/**
 * Get unread messages for a player
 */
export function getUnreadMessages(
    messages: CaptainMessage[],
    playerId: UUID,
    teamAPlayerIds: UUID[],
    teamBPlayerIds: UUID[]
): CaptainMessage[] {
    return messages.filter(msg => {
        // Check if player is a target
        let isTarget = false;

        switch (msg.targetType) {
            case 'all':
                isTarget = true;
                break;
            case 'team_a':
                isTarget = teamAPlayerIds.includes(playerId);
                break;
            case 'team_b':
                isTarget = teamBPlayerIds.includes(playerId);
                break;
            case 'specific':
                isTarget = msg.targetPlayerIds?.includes(playerId) || false;
                break;
        }

        // Check if unread
        return isTarget && !msg.readBy.includes(playerId);
    });
}

/**
 * Format message for display
 */
export function formatMessagePreview(message: CaptainMessage, maxLength: number = 80): string {
    if (message.message.length <= maxLength) {
        return message.message;
    }
    return message.message.slice(0, maxLength - 3) + '...';
}

/**
 * Get message icon based on template
 */
export function getMessageIcon(templateId?: string): string {
    const template = MESSAGE_TEMPLATES.find(t => t.id === templateId);
    return template?.icon || 'MessageCircle';
}

/**
 * Sort messages by date (newest first)
 */
export function sortMessagesByDate(messages: CaptainMessage[]): CaptainMessage[] {
    return [...messages].sort((a, b) =>
        new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime()
    );
}

/**
 * Group messages by date
 */
export function groupMessagesByDate(
    messages: CaptainMessage[]
): { date: string; messages: CaptainMessage[] }[] {
    const sorted = sortMessagesByDate(messages);
    const groups: Map<string, CaptainMessage[]> = new Map();

    for (const msg of sorted) {
        const date = new Date(msg.sentAt).toLocaleDateString();
        const existing = groups.get(date) || [];
        groups.set(date, [...existing, msg]);
    }

    return Array.from(groups.entries()).map(([date, msgs]) => ({
        date,
        messages: msgs,
    }));
}

/**
 * Generate auto-announcement for lineup publish
 */
export function generateLineupAnnouncement(
    sessionName: string,
    matchCount: number,
    firstTeeTime?: string
): { title: string; message: string } {
    const template = MESSAGE_TEMPLATES.find(t => t.id === 'lineup-posted')!;
    const message = fillTemplate(template, { sessionName });

    if (firstTeeTime) {
        message.message += ` First group tees off at ${firstTeeTime}.`;
    }

    return message;
}

/**
 * Generate auto-announcement for results
 */
export function generateResultsAnnouncement(
    sessionName: string,
    teamAName: string,
    teamBName: string,
    teamAPoints: number,
    teamBPoints: number
): { title: string; message: string } {
    const winningTeam = teamAPoints > teamBPoints ? teamAName
        : teamBPoints > teamAPoints ? teamBName
            : 'Both teams';

    const score = teamAPoints === teamBPoints
        ? `tied ${teamAPoints}-${teamBPoints}`
        : `${Math.max(teamAPoints, teamBPoints)}-${Math.min(teamAPoints, teamBPoints)}`;

    const template = MESSAGE_TEMPLATES.find(t => t.id === 'results-posted')!;
    return fillTemplate(template, {
        sessionName,
        winningTeam,
        score,
    });
}

/**
 * Check if any players haven't viewed lineup
 */
export function getLineupNotViewedPlayers(
    messages: CaptainMessage[],
    allPlayerIds: UUID[]
): UUID[] {
    const lineupMessages = messages.filter(m =>
        m.title.toLowerCase().includes('lineup') && m.targetType === 'all'
    );

    if (lineupMessages.length === 0) return [];

    const latestLineupMessage = lineupMessages.reduce((latest, msg) =>
        new Date(msg.sentAt) > new Date(latest.sentAt) ? msg : latest
    );

    return allPlayerIds.filter(id => !latestLineupMessage.readBy.includes(id));
}
