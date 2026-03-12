export type OverrideReason =
    | 'scoring_error'
    | 'wrong_player'
    | 'wrong_hole'
    | 'dispute_resolution'
    | 'late_entry'
    | 'system_error'
    | 'handicap_adjustment'
    | 'other';

export interface AuditEntry {
    id: string;
    timestamp: string;
    action: 'created' | 'modified' | 'override' | 'reverted';
    userId: string;
    userName: string;
    reason?: OverrideReason;
    notes?: string;
    previousValue?: string;
    newValue?: string;
}

export interface MatchScore {
    matchId: string;
    matchNumber: number;
    teamAPlayers: string[];
    teamBPlayers: string[];
    teamAColor: string;
    teamBColor: string;
    teamAName: string;
    teamBName: string;
    currentMatchScore: number;
    currentHolesPlayed: number;
    holeScores: {
        hole: number;
        teamAScore?: number;
        teamBScore?: number;
        winner?: 'teamA' | 'teamB' | 'halved';
    }[];
    auditHistory: AuditEntry[];
}

export interface OverrideModalProps {
    isOpen: boolean;
    onClose: () => void;
    matchScore: MatchScore;
    currentUserName: string;
    onSubmit: (overrideData: {
        holeNumber: number;
        originalTeamAScore?: number;
        originalTeamBScore?: number;
        newTeamAScore?: number;
        newTeamBScore?: number;
        reason: OverrideReason;
        notes: string;
    }) => Promise<void>;
}

export interface EditedHoleScore {
    teamA?: number;
    teamB?: number;
}

export type EditedScores = Record<number, EditedHoleScore>;

export type OverrideStep = 'select' | 'edit' | 'confirm';
