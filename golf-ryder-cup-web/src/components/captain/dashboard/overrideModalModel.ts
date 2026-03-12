import type { AuditEntry, EditedScores, MatchScore, OverrideReason } from './overrideModalTypes';

export const OVERRIDE_REASONS: { value: OverrideReason; label: string; description: string }[] = [
    { value: 'scoring_error', label: 'Scoring Error', description: 'Wrong score entered' },
    { value: 'wrong_player', label: 'Wrong Player', description: 'Score assigned to wrong player' },
    { value: 'wrong_hole', label: 'Wrong Hole', description: 'Score entered on wrong hole' },
    { value: 'dispute_resolution', label: 'Dispute Resolution', description: 'Settling a scoring dispute' },
    { value: 'late_entry', label: 'Late Entry', description: 'Score entered after round completion' },
    { value: 'system_error', label: 'System Error', description: 'Technical issue caused error' },
    {
        value: 'handicap_adjustment',
        label: 'Handicap Adjustment',
        description: 'Stroke allocation correction',
    },
    { value: 'other', label: 'Other', description: 'Other reason (please specify)' },
];

export function formatTimestamp(isoString: string): string {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    });
}

export function getActionColor(action: AuditEntry['action']): string {
    switch (action) {
        case 'created':
            return 'var(--success)';
        case 'modified':
            return 'var(--info)';
        case 'override':
            return 'var(--warning)';
        case 'reverted':
            return 'var(--error)';
        default:
            return 'var(--ink-tertiary)';
    }
}

export function getOriginalHoleScore(
    matchScore: MatchScore,
    selectedHole: number | null
): MatchScore['holeScores'][number] | null {
    if (selectedHole === null) {
        return null;
    }

    return matchScore.holeScores.find((hole) => hole.hole === selectedHole) ?? null;
}

export function computeNewMatchScore(
    holeScores: MatchScore['holeScores'],
    editedScores: EditedScores
): number {
    let score = 0;

    for (const hole of holeScores) {
        const edited = editedScores[hole.hole];
        const teamA = edited?.teamA ?? hole.teamAScore;
        const teamB = edited?.teamB ?? hole.teamBScore;

        if (teamA !== undefined && teamB !== undefined) {
            if (teamA < teamB) {
                score += 1;
            } else if (teamB < teamA) {
                score -= 1;
            }
        }
    }

    return score;
}
