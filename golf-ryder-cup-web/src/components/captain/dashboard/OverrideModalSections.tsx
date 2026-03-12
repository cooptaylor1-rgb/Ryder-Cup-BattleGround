'use client';

import { useState } from 'react';

import { AnimatePresence, motion } from 'framer-motion';
import {
    AlertTriangle,
    ArrowRight,
    ChevronDown,
    ChevronRight,
    ChevronUp,
    History,
    RefreshCw,
    Save,
    Shield,
    Trophy,
    Undo2,
    X,
} from 'lucide-react';

import { useHaptic } from '@/lib/hooks';
import { cn } from '@/lib/utils';

import {
    formatTimestamp,
    getActionColor,
    OVERRIDE_REASONS,
} from './overrideModalModel';
import type {
    AuditEntry,
    EditedScores,
    MatchScore,
    OverrideReason,
    OverrideStep,
} from './overrideModalTypes';

interface OverrideModalSectionsProps {
    isOpen: boolean;
    matchScore: MatchScore;
    currentUserName: string;
    selectedHole: number | null;
    editedScores: EditedScores;
    reason: OverrideReason | null;
    notes: string;
    isSubmitting: boolean;
    step: OverrideStep;
    originalHoleScore: MatchScore['holeScores'][number] | null;
    newMatchScore: number;
    canSubmit: boolean;
    onClose: () => void;
    onHoleSelect: (hole: number) => void;
    onTeamAScoreChange: (value: number | undefined) => void;
    onTeamBScoreChange: (value: number | undefined) => void;
    onContinue: () => void;
    onBack: () => void;
    onReasonChange: (reason: OverrideReason) => void;
    onNotesChange: (notes: string) => void;
    onSubmit: () => void;
}

interface HoleScoreEditorProps {
    hole: number;
    originalTeamA?: number;
    originalTeamB?: number;
    newTeamA?: number;
    newTeamB?: number;
    onTeamAChange: (value: number | undefined) => void;
    onTeamBChange: (value: number | undefined) => void;
    teamAColor: string;
    teamBColor: string;
    teamAName: string;
    teamBName: string;
}

function HoleScoreEditor({
    hole,
    originalTeamA,
    originalTeamB,
    newTeamA,
    newTeamB,
    onTeamAChange,
    onTeamBChange,
    teamAColor,
    teamBColor,
    teamAName,
    teamBName,
}: HoleScoreEditorProps) {
    const haptic = useHaptic();
    const hasChanges = newTeamA !== originalTeamA || newTeamB !== originalTeamB;

    const handleIncrement = (team: 'A' | 'B') => {
        haptic.tap();
        if (team === 'A') {
            onTeamAChange((newTeamA ?? originalTeamA ?? 0) + 1);
        } else {
            onTeamBChange((newTeamB ?? originalTeamB ?? 0) + 1);
        }
    };

    const handleDecrement = (team: 'A' | 'B') => {
        haptic.tap();
        if (team === 'A') {
            const current = newTeamA ?? originalTeamA ?? 0;
            if (current > 0) {
                onTeamAChange(current - 1);
            }
        } else {
            const current = newTeamB ?? originalTeamB ?? 0;
            if (current > 0) {
                onTeamBChange(current - 1);
            }
        }
    };

    return (
        <div
            className={cn(
                'p-4 rounded-xl transition-all',
                hasChanges && 'ring-2 ring-offset-2'
            )}
            style={{
                background: 'var(--surface)',
                ['--tw-ring-color' as string]: 'var(--warning)',
            }}
        >
            <div className="flex items-center justify-between mb-3">
                <span className="font-semibold" style={{ color: 'var(--ink)' }}>
                    Hole {hole}
                </span>
                {hasChanges && (
                    <span
                        className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{
                            background: 'color-mix(in srgb, var(--warning) 10%, transparent)',
                            color: 'var(--warning)',
                        }}
                    >
                        Modified
                    </span>
                )}
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-2 h-2 rounded-full" style={{ background: teamAColor }} />
                        <span className="text-xs font-medium" style={{ color: teamAColor }}>
                            {teamAName}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => handleDecrement('A')}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-lg font-bold"
                            style={{ background: 'var(--rule)', color: 'var(--ink-secondary)' }}
                        >
                            −
                        </button>
                        <div className="flex-1 text-center">
                            <span className="text-2xl font-bold" style={{ color: 'var(--ink)' }}>
                                {newTeamA ?? originalTeamA ?? '—'}
                            </span>
                            {originalTeamA !== undefined &&
                                newTeamA !== undefined &&
                                newTeamA !== originalTeamA && (
                                    <div className="text-[10px]" style={{ color: 'var(--ink-tertiary)' }}>
                                        was {originalTeamA}
                                    </div>
                                )}
                        </div>
                        <button
                            onClick={() => handleIncrement('A')}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-lg font-bold"
                            style={{ background: 'var(--rule)', color: 'var(--ink-secondary)' }}
                        >
                            +
                        </button>
                    </div>
                </div>

                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-2 h-2 rounded-full" style={{ background: teamBColor }} />
                        <span className="text-xs font-medium" style={{ color: teamBColor }}>
                            {teamBName}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => handleDecrement('B')}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-lg font-bold"
                            style={{ background: 'var(--rule)', color: 'var(--ink-secondary)' }}
                        >
                            −
                        </button>
                        <div className="flex-1 text-center">
                            <span className="text-2xl font-bold" style={{ color: 'var(--ink)' }}>
                                {newTeamB ?? originalTeamB ?? '—'}
                            </span>
                            {originalTeamB !== undefined &&
                                newTeamB !== undefined &&
                                newTeamB !== originalTeamB && (
                                    <div className="text-[10px]" style={{ color: 'var(--ink-tertiary)' }}>
                                        was {originalTeamB}
                                    </div>
                                )}
                        </div>
                        <button
                            onClick={() => handleIncrement('B')}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-lg font-bold"
                            style={{ background: 'var(--rule)', color: 'var(--ink-secondary)' }}
                        >
                            +
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function AuditHistoryPanel({ history }: { history: AuditEntry[] }) {
    const [isExpanded, setIsExpanded] = useState(false);
    const haptic = useHaptic();

    const toggle = () => {
        haptic.tap();
        setIsExpanded(!isExpanded);
    };

    if (history.length === 0) {
        return null;
    }

    return (
        <div className="rounded-xl overflow-hidden" style={{ background: 'var(--surface)' }}>
            <button
                onClick={toggle}
                className="w-full flex items-center justify-between p-3"
            >
                <div className="flex items-center gap-2">
                    <History size={16} style={{ color: 'var(--ink-secondary)' }} />
                    <span className="text-sm font-medium" style={{ color: 'var(--ink-secondary)' }}>
                        Audit History
                    </span>
                    <span
                        className="text-xs px-1.5 py-0.5 rounded-full"
                        style={{ background: 'var(--rule)', color: 'var(--ink-tertiary)' }}
                    >
                        {history.length}
                    </span>
                </div>
                {isExpanded ? (
                    <ChevronUp size={16} style={{ color: 'var(--ink-tertiary)' }} />
                ) : (
                    <ChevronDown size={16} style={{ color: 'var(--ink-tertiary)' }} />
                )}
            </button>

            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: 'auto' }}
                        exit={{ height: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="px-3 pb-3 space-y-2">
                            {history.map((entry) => (
                                <div
                                    key={entry.id}
                                    className="p-2 rounded-lg text-xs"
                                    style={{ background: 'var(--rule)' }}
                                >
                                    <div className="flex items-center justify-between mb-1">
                                        <div className="flex items-center gap-2">
                                            <span
                                                className="px-1.5 py-0.5 rounded uppercase font-semibold"
                                                style={{
                                                    background: `${getActionColor(entry.action)}20`,
                                                    color: getActionColor(entry.action),
                                                }}
                                            >
                                                {entry.action}
                                            </span>
                                            <span style={{ color: 'var(--ink-secondary)' }}>
                                                {entry.userName}
                                            </span>
                                        </div>
                                        <span style={{ color: 'var(--ink-tertiary)' }}>
                                            {formatTimestamp(entry.timestamp)}
                                        </span>
                                    </div>
                                    {entry.previousValue && entry.newValue && (
                                        <div
                                            className="flex items-center gap-2 mt-1"
                                            style={{ color: 'var(--ink-secondary)' }}
                                        >
                                            <span>{entry.previousValue}</span>
                                            <ArrowRight size={10} />
                                            <span>{entry.newValue}</span>
                                        </div>
                                    )}
                                    {entry.notes && (
                                        <p className="mt-1 italic" style={{ color: 'var(--ink-tertiary)' }}>
                                            &quot;{entry.notes}&quot;
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

function ImpactPreview({
    originalMatchScore,
    newMatchScore,
    teamAColor,
    teamBColor,
    teamAName,
}: {
    originalMatchScore: number;
    newMatchScore: number;
    teamAColor: string;
    teamBColor: string;
    teamAName: string;
}) {
    const hasImpact = originalMatchScore !== newMatchScore;

    const formatScore = (score: number) => {
        if (score === 0) {
            return 'AS';
        }
        if (score > 0) {
            return `${score} Up`;
        }
        return `${Math.abs(score)} Down`;
    };

    const getScoreColor = (score: number) => {
        if (score > 0) {
            return teamAColor;
        }
        if (score < 0) {
            return teamBColor;
        }
        return 'var(--ink-tertiary)';
    };

    return (
        <div
            className="p-4 rounded-xl"
            style={{
                background: hasImpact
                    ? 'color-mix(in srgb, var(--warning) 10%, transparent)'
                    : 'var(--surface)',
                border: hasImpact ? '1px solid var(--warning)' : '1px solid var(--rule)',
            }}
        >
            <div className="flex items-center gap-2 mb-3">
                <Trophy size={16} style={{ color: hasImpact ? 'var(--warning)' : 'var(--ink-secondary)' }} />
                <span
                    className="text-sm font-semibold"
                    style={{ color: hasImpact ? 'var(--warning)' : 'var(--ink-secondary)' }}
                >
                    Match Impact
                </span>
            </div>

            <div className="flex items-center justify-center gap-6">
                <div className="text-center">
                    <p className="text-[10px] uppercase mb-1" style={{ color: 'var(--ink-tertiary)' }}>
                        Before
                    </p>
                    <p className="text-lg font-bold" style={{ color: getScoreColor(originalMatchScore) }}>
                        {teamAName} {formatScore(originalMatchScore)}
                    </p>
                </div>

                <ArrowRight size={20} style={{ color: 'var(--ink-tertiary)' }} />

                <div className="text-center">
                    <p className="text-[10px] uppercase mb-1" style={{ color: 'var(--ink-tertiary)' }}>
                        After
                    </p>
                    <p className="text-lg font-bold" style={{ color: getScoreColor(newMatchScore) }}>
                        {teamAName} {formatScore(newMatchScore)}
                    </p>
                </div>
            </div>

            {!hasImpact && (
                <p className="text-center text-xs mt-3" style={{ color: 'var(--ink-tertiary)' }}>
                    No change to match score
                </p>
            )}
        </div>
    );
}

export function OverrideModalSections({
    isOpen,
    matchScore,
    currentUserName,
    selectedHole,
    editedScores,
    reason,
    notes,
    isSubmitting,
    step,
    originalHoleScore,
    newMatchScore,
    canSubmit,
    onClose,
    onHoleSelect,
    onTeamAScoreChange,
    onTeamBScoreChange,
    onContinue,
    onBack,
    onReasonChange,
    onNotesChange,
    onSubmit,
}: OverrideModalSectionsProps) {
    const haptic = useHaptic();

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-[color:var(--ink)]/50 z-50"
                        onClick={onClose}
                    />

                    <motion.div
                        initial={{ opacity: 0, y: 100 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 100 }}
                        className="fixed inset-x-4 bottom-4 top-20 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-120 md:top-1/2 md:-translate-y-1/2 md:h-auto md:max-h-[80vh] z-50 rounded-2xl overflow-hidden flex flex-col"
                        style={{ background: 'var(--bg)' }}
                    >
                        <div
                            className="flex items-center justify-between p-4 border-b"
                            style={{ borderColor: 'var(--rule)' }}
                        >
                            <div className="flex items-center gap-2">
                                <Shield size={20} style={{ color: 'var(--masters)' }} />
                                <div>
                                    <h2 className="text-lg font-bold" style={{ color: 'var(--ink)' }}>
                                        Score Override
                                    </h2>
                                    <p className="text-xs" style={{ color: 'var(--ink-tertiary)' }}>
                                        Match {matchScore.matchNumber}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 rounded-lg transition-colors hover:bg-[color:var(--ink)]/5"
                            >
                                <X size={20} style={{ color: 'var(--ink-secondary)' }} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {step === 'select' && (
                                <>
                                    <p className="text-sm" style={{ color: 'var(--ink-secondary)' }}>
                                        Select the hole to override:
                                    </p>
                                    <div className="grid grid-cols-6 gap-2">
                                        {matchScore.holeScores.map((hole) => (
                                            <button
                                                key={hole.hole}
                                                onClick={() => onHoleSelect(hole.hole)}
                                                className={cn(
                                                    'aspect-square rounded-lg flex flex-col items-center justify-center text-sm font-bold transition-all',
                                                    selectedHole === hole.hole && 'ring-2'
                                                )}
                                                style={{
                                                    background:
                                                        hole.winner === 'teamA'
                                                            ? `${matchScore.teamAColor}20`
                                                            : hole.winner === 'teamB'
                                                              ? `${matchScore.teamBColor}20`
                                                              : 'var(--surface)',
                                                    color:
                                                        hole.winner === 'teamA'
                                                            ? matchScore.teamAColor
                                                            : hole.winner === 'teamB'
                                                              ? matchScore.teamBColor
                                                              : 'var(--ink)',
                                                    ['--tw-ring-color' as string]: 'var(--masters)',
                                                }}
                                            >
                                                {hole.hole}
                                                {(hole.teamAScore !== undefined ||
                                                    hole.teamBScore !== undefined) && (
                                                    <span
                                                        className="text-[8px]"
                                                        style={{ color: 'var(--ink-tertiary)' }}
                                                    >
                                                        {hole.teamAScore ?? '—'}/{hole.teamBScore ?? '—'}
                                                    </span>
                                                )}
                                            </button>
                                        ))}
                                    </div>

                                    <AuditHistoryPanel history={matchScore.auditHistory} />
                                </>
                            )}

                            {step === 'edit' && selectedHole !== null && (
                                <>
                                    <HoleScoreEditor
                                        hole={selectedHole}
                                        originalTeamA={originalHoleScore?.teamAScore}
                                        originalTeamB={originalHoleScore?.teamBScore}
                                        newTeamA={editedScores[selectedHole]?.teamA}
                                        newTeamB={editedScores[selectedHole]?.teamB}
                                        onTeamAChange={onTeamAScoreChange}
                                        onTeamBChange={onTeamBScoreChange}
                                        teamAColor={matchScore.teamAColor}
                                        teamBColor={matchScore.teamBColor}
                                        teamAName={matchScore.teamAName}
                                        teamBName={matchScore.teamBName}
                                    />

                                    <ImpactPreview
                                        originalMatchScore={matchScore.currentMatchScore}
                                        newMatchScore={newMatchScore}
                                        teamAColor={matchScore.teamAColor}
                                        teamBColor={matchScore.teamBColor}
                                        teamAName={matchScore.teamAName}
                                    />
                                </>
                            )}

                            {step === 'confirm' && (
                                <>
                                    <div>
                                        <label
                                            className="text-sm font-medium mb-2 block"
                                            style={{ color: 'var(--ink)' }}
                                        >
                                            Reason for Override{' '}
                                            <span className="text-[var(--error)]">*</span>
                                        </label>
                                        <div className="grid grid-cols-2 gap-2">
                                            {OVERRIDE_REASONS.map((overrideReason) => (
                                                <button
                                                    key={overrideReason.value}
                                                    onClick={() => {
                                                        haptic.tap();
                                                        onReasonChange(overrideReason.value);
                                                    }}
                                                    className={cn(
                                                        'p-3 rounded-lg text-left transition-all',
                                                        reason === overrideReason.value && 'ring-2'
                                                    )}
                                                    style={{
                                                        background:
                                                            reason === overrideReason.value
                                                                ? 'rgba(0, 103, 71, 0.1)'
                                                                : 'var(--surface)',
                                                        ['--tw-ring-color' as string]: 'var(--masters)',
                                                    }}
                                                >
                                                    <span
                                                        className="text-sm font-medium block"
                                                        style={{ color: 'var(--ink)' }}
                                                    >
                                                        {overrideReason.label}
                                                    </span>
                                                    <span
                                                        className="text-[10px]"
                                                        style={{ color: 'var(--ink-tertiary)' }}
                                                    >
                                                        {overrideReason.description}
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <label
                                            className="text-sm font-medium mb-2 block"
                                            style={{ color: 'var(--ink)' }}
                                        >
                                            Notes{' '}
                                            {reason === 'other' && (
                                                <span className="text-[var(--error)]">*</span>
                                            )}
                                        </label>
                                        <textarea
                                            value={notes}
                                            onChange={(event) => onNotesChange(event.target.value)}
                                            placeholder="Add details about this override..."
                                            rows={3}
                                            className="w-full p-3 rounded-lg text-sm resize-none"
                                            style={{
                                                background: 'var(--surface)',
                                                border: '1px solid var(--rule)',
                                                color: 'var(--ink)',
                                            }}
                                        />
                                    </div>

                                    <div className="p-3 rounded-lg flex items-start gap-2 bg-[color:var(--warning)]/10 text-[var(--warning)]">
                                        <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                                        <p className="text-xs">
                                            This override will be recorded in the audit log with your name (
                                            {currentUserName}) and reason. This action may affect match
                                            outcomes.
                                        </p>
                                    </div>
                                </>
                            )}
                        </div>

                        <div
                            className="p-4 border-t flex items-center gap-3"
                            style={{ borderColor: 'var(--rule)' }}
                        >
                            {step !== 'select' && (
                                <button
                                    onClick={onBack}
                                    className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
                                    style={{ background: 'var(--surface)', color: 'var(--ink-secondary)' }}
                                >
                                    <Undo2 size={14} />
                                    Back
                                </button>
                            )}

                            <div className="flex-1" />

                            {step === 'edit' && (
                                <button
                                    onClick={onContinue}
                                    className="px-6 py-2 rounded-lg text-sm font-semibold text-[var(--canvas)] bg-[var(--masters)] flex items-center gap-2"
                                >
                                    Continue
                                    <ChevronRight size={14} />
                                </button>
                            )}

                            {step === 'confirm' && (
                                <button
                                    onClick={onSubmit}
                                    disabled={!canSubmit || isSubmitting}
                                    className={cn(
                                        'px-6 py-2 rounded-lg text-sm font-semibold text-[var(--canvas)] flex items-center gap-2',
                                        (!canSubmit || isSubmitting) && 'opacity-50 cursor-not-allowed'
                                    )}
                                    style={{ background: 'var(--warning)' }}
                                >
                                    {isSubmitting ? (
                                        <>
                                            <motion.div
                                                animate={{ rotate: 360 }}
                                                transition={{ duration: 1, repeat: Infinity }}
                                            >
                                                <RefreshCw size={14} />
                                            </motion.div>
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <Save size={14} />
                                            Confirm Override
                                        </>
                                    )}
                                </button>
                            )}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
