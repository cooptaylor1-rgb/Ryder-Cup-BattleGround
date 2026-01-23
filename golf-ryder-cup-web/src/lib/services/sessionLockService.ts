/**
 * Session Locking & Audit Service
 *
 * Manage session locks and track all captain actions:
 * - Auto-lock when scoring starts
 * - Audit trail for changes
 * - Permission enforcement
 */

import type {
    SessionLock,
    LockReason,
    AuditLogFilter,
    AuditLogSummary,
} from '@/lib/types/captain';
import type {
    AuditLogEntry,
    AuditActionType,
    RyderCupSession,
    Match,
    UUID,
} from '@/lib/types/models';

// ============================================
// SESSION LOCKING
// ============================================

/**
 * Check if session should be auto-locked
 */
export function shouldAutoLock(
    session: RyderCupSession,
    matches: Match[]
): { shouldLock: boolean; reason?: LockReason } {
    // Already locked
    if (session.isLocked) {
        return { shouldLock: false };
    }

    const sessionMatches = matches.filter(m => m.sessionId === session.id);

    // Lock if any match has started scoring
    const hasActiveMatch = sessionMatches.some(m => m.status === 'inProgress');
    if (hasActiveMatch) {
        return { shouldLock: true, reason: 'scoring_started' };
    }

    // Lock if any match is completed
    const hasCompletedMatch = sessionMatches.some(m => m.status === 'completed');
    if (hasCompletedMatch) {
        return { shouldLock: true, reason: 'match_completed' };
    }

    return { shouldLock: false };
}

/**
 * Create lock state for session
 */
export function createSessionLock(
    sessionId: UUID,
    isLocked: boolean,
    reason?: LockReason,
    lockedBy?: UUID,
    autoLocked: boolean = false
): SessionLock {
    return {
        sessionId,
        isLocked,
        lockedAt: isLocked ? new Date().toISOString() : undefined,
        lockedBy,
        lockReason: reason,
        autoLocked,
    };
}

/**
 * Check if edit is allowed on locked session
 */
export function isEditAllowed(
    lock: SessionLock,
    action: 'pairing' | 'score' | 'settings'
): { allowed: boolean; reason?: string } {
    if (!lock.isLocked) {
        return { allowed: true };
    }

    // Scoring is always allowed on locked sessions
    if (action === 'score') {
        return { allowed: true };
    }

    // Pairing and settings changes require unlock
    return {
        allowed: false,
        reason: lock.autoLocked
            ? 'Session locked because scoring has started. Unlock to make changes.'
            : 'Session locked by captain. Unlock to make changes.',
    };
}

/**
 * Request unlock (requires confirmation)
 */
export function requestUnlock(
    lock: SessionLock,
    _requestedBy: UUID,
    _reason: string
): { requiresConfirmation: boolean; warning?: string } {
    if (!lock.isLocked) {
        return { requiresConfirmation: false };
    }

    // Auto-locked sessions have stronger warning
    if (lock.autoLocked) {
        return {
            requiresConfirmation: true,
            warning: 'Unlocking while scoring is in progress may cause data inconsistencies. Are you sure?',
        };
    }

    return {
        requiresConfirmation: true,
        warning: 'This session is locked. Do you want to unlock it?',
    };
}

// ============================================
// AUDIT LOGGING
// ============================================

/**
 * Create audit log entry
 */
export function createAuditEntry(
    tripId: UUID,
    actionType: AuditActionType,
    actorName: string,
    summary: string,
    options?: {
        details?: Record<string, unknown>;
        relatedEntityId?: string;
        relatedEntityType?: string;
    }
): AuditLogEntry {
    return {
        id: crypto.randomUUID(),
        tripId,
        actionType,
        timestamp: new Date().toISOString(),
        actorName,
        summary,
        details: options?.details ? JSON.stringify(options.details) : undefined,
        relatedEntityId: options?.relatedEntityId,
        relatedEntityType: options?.relatedEntityType,
    };
}

/**
 * Log pairing change
 */
export function logPairingChange(
    tripId: UUID,
    sessionId: UUID,
    matchId: UUID,
    actorName: string,
    changeType: 'created' | 'edited' | 'deleted',
    details?: {
        oldPlayers?: string[];
        newPlayers?: string[];
    }
): AuditLogEntry {
    const actionType: AuditActionType =
        changeType === 'created' ? 'pairingCreated' :
            changeType === 'deleted' ? 'pairingDeleted' : 'pairingEdited';

    const summary = changeType === 'created'
        ? 'Created new pairing'
        : changeType === 'deleted'
            ? 'Removed pairing'
            : 'Modified pairing';

    return createAuditEntry(tripId, actionType, actorName, summary, {
        details: details as Record<string, unknown>,
        relatedEntityId: matchId,
        relatedEntityType: 'match',
    });
}

/**
 * Log score change
 */
export function logScoreChange(
    tripId: UUID,
    matchId: UUID,
    holeNumber: number,
    actorName: string,
    changeType: 'entered' | 'edited' | 'undone',
    details?: {
        oldWinner?: string;
        newWinner?: string;
    }
): AuditLogEntry {
    const actionType: AuditActionType =
        changeType === 'entered' ? 'scoreEntered' :
            changeType === 'undone' ? 'scoreUndone' : 'scoreEdited';

    const summary = changeType === 'entered'
        ? `Scored hole ${holeNumber}`
        : changeType === 'undone'
            ? `Undid hole ${holeNumber}`
            : `Changed hole ${holeNumber} result`;

    return createAuditEntry(tripId, actionType, actorName, summary, {
        details: { holeNumber, ...details } as Record<string, unknown>,
        relatedEntityId: matchId,
        relatedEntityType: 'match',
    });
}

/**
 * Log lock/unlock action
 */
export function logLockAction(
    tripId: UUID,
    sessionId: UUID,
    actorName: string,
    action: 'locked' | 'unlocked',
    reason?: string
): AuditLogEntry {
    const actionType: AuditActionType =
        action === 'locked' ? 'sessionLocked' : 'sessionUnlocked';

    return createAuditEntry(tripId, actionType, actorName, `Session ${action}`, {
        details: reason ? { reason } : undefined,
        relatedEntityId: sessionId,
        relatedEntityType: 'session',
    });
}

/**
 * Filter audit log entries
 */
export function filterAuditLog(
    entries: AuditLogEntry[],
    filter: AuditLogFilter
): AuditLogEntry[] {
    return entries.filter(entry => {
        if (entry.tripId !== filter.tripId) return false;

        if (filter.startDate && entry.timestamp < filter.startDate) return false;
        if (filter.endDate && entry.timestamp > filter.endDate) return false;

        if (filter.actionTypes && !filter.actionTypes.includes(entry.actionType)) return false;

        if (filter.actorName && !entry.actorName.toLowerCase().includes(filter.actorName.toLowerCase())) {
            return false;
        }

        if (filter.entityId && entry.relatedEntityId !== filter.entityId) return false;

        return true;
    });
}

/**
 * Generate audit log summary
 */
export function generateAuditSummary(entries: AuditLogEntry[]): AuditLogSummary {
    const byType: Record<string, number> = {};
    const byActor: Record<string, number> = {};

    for (const entry of entries) {
        byType[entry.actionType] = (byType[entry.actionType] || 0) + 1;
        byActor[entry.actorName] = (byActor[entry.actorName] || 0) + 1;
    }

    // Get most recent actions
    const sorted = [...entries].sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return {
        totalActions: entries.length,
        byType,
        byActor,
        recentActions: sorted.slice(0, 10).map(e => ({
            timestamp: e.timestamp,
            action: e.actionType,
            actor: e.actorName,
            summary: e.summary,
        })),
    };
}

/**
 * Format audit entry for display
 */
export function formatAuditEntry(entry: AuditLogEntry): {
    time: string;
    icon: string;
    title: string;
    description: string;
    actor: string;
} {
    const time = new Date(entry.timestamp).toLocaleString();

    const icons: Record<AuditActionType, string> = {
        sessionCreated: '📋',
        sessionLocked: '🔒',
        sessionUnlocked: '🔓',
        pairingCreated: '👥',
        pairingEdited: '✏️',
        pairingDeleted: '🗑️',
        lineupPublished: '📢',
        matchStarted: '▶️',
        matchFinalized: '✅',
        scoreEntered: '🎯',
        scoreEdited: '📝',
        scoreUndone: '↩️',
        captainModeEnabled: '🎖️',
        captainModeDisabled: '🎖️',
    };

    return {
        time,
        icon: icons[entry.actionType] || '📄',
        title: formatActionType(entry.actionType),
        description: entry.summary,
        actor: entry.actorName,
    };
}

/**
 * Format action type for display
 */
function formatActionType(actionType: AuditActionType): string {
    const labels: Record<AuditActionType, string> = {
        sessionCreated: 'Session Created',
        sessionLocked: 'Session Locked',
        sessionUnlocked: 'Session Unlocked',
        pairingCreated: 'Pairing Added',
        pairingEdited: 'Pairing Changed',
        pairingDeleted: 'Pairing Removed',
        lineupPublished: 'Lineup Published',
        matchStarted: 'Match Started',
        matchFinalized: 'Match Completed',
        scoreEntered: 'Score Entered',
        scoreEdited: 'Score Changed',
        scoreUndone: 'Score Undone',
        captainModeEnabled: 'Captain Mode On',
        captainModeDisabled: 'Captain Mode Off',
    };

    return labels[actionType] || actionType;
}

/**
 * Export audit log to text
 */
export function exportAuditLog(entries: AuditLogEntry[]): string {
    const lines = [
        'AUDIT LOG',
        '═'.repeat(60),
        '',
    ];

    const sorted = [...entries].sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    for (const entry of sorted) {
        const formatted = formatAuditEntry(entry);
        lines.push(`${formatted.time}`);
        lines.push(`  ${formatted.icon} ${formatted.title}`);
        lines.push(`  ${formatted.description}`);
        lines.push(`  By: ${formatted.actor}`);
        lines.push('');
    }

    return lines.join('\n');
}
