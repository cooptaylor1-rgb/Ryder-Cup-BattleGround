/**
 * BatchScoreGrid Component — Phase 2: Captain Empowerment
 *
 * Spreadsheet-style bulk score entry interface:
 * - Grid layout for all matches and holes
 * - Keyboard navigation (arrow keys, tab)
 * - Quick number entry
 * - Visual validation
 * - Batch submit with progress
 * - Auto-save drafts
 *
 * Enables rapid score entry for captains during/after rounds.
 */

'use client';

import {
    useState,
    useRef,
    useCallback,
    useEffect,
    useMemo,
    KeyboardEvent,
} from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Grid3X3,
    RefreshCw,
    CheckCircle2,
    AlertTriangle,
    ChevronLeft,
    ChevronRight,
    Keyboard,
    RotateCcw,
    Upload,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useHaptic } from '@/lib/hooks';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('BatchScoreGrid');

// ============================================
// TYPES
// ============================================

export interface BatchMatch {
    id: string;
    matchNumber: number;
    teamAPlayers: string[];
    teamBPlayers: string[];
    teamAColor: string;
    teamBColor: string;
}

export interface BatchScoreEntry {
    matchId: string;
    hole: number;
    teamAScore: number | null;
    teamBScore: number | null;
    isDirty: boolean;
    hasError: boolean;
    errorMessage?: string;
}

interface BatchScoreGridProps {
    matches: BatchMatch[];
    existingScores?: Record<string, Record<number, { teamA: number | null; teamB: number | null }>>;
    totalHoles?: number;
    frontNineOnly?: boolean;
    backNineOnly?: boolean;
    onSave: (scores: BatchScoreEntry[]) => Promise<void>;
    onAutoSave?: (scores: BatchScoreEntry[]) => void;
    className?: string;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function getCellId(matchId: string, hole: number, team: 'A' | 'B'): string {
    return `${matchId}-${hole}-${team}`;
}

function parseCellId(cellId: string): { matchId: string; hole: number; team: 'A' | 'B' } | null {
    const parts = cellId.split('-');
    if (parts.length < 3) return null;
    const team = parts.pop() as 'A' | 'B';
    const hole = parseInt(parts.pop()!, 10);
    const matchId = parts.join('-');
    return { matchId, hole, team };
}

function validateScore(score: number | null): { valid: boolean; message?: string } {
    if (score === null) return { valid: true };
    if (score < 1) return { valid: false, message: 'Score must be at least 1' };
    if (score > 15) return { valid: false, message: 'Score seems too high' };
    return { valid: true };
}

// ============================================
// CELL INPUT COMPONENT
// ============================================

interface CellInputProps {
    cellId: string;
    value: number | null;
    isDirty: boolean;
    hasError: boolean;
    teamColor: string;
    isFocused: boolean;
    onFocus: (cellId: string) => void;
    onChange: (cellId: string, value: number | null) => void;
    onKeyDown: (e: KeyboardEvent<HTMLInputElement>, cellId: string) => void;
}

function CellInput({
    cellId,
    value,
    isDirty,
    hasError,
    teamColor,
    isFocused,
    onFocus,
    onChange,
    onKeyDown,
}: CellInputProps) {
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isFocused && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isFocused]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        if (val === '') {
            onChange(cellId, null);
        } else {
            const num = parseInt(val, 10);
            if (!isNaN(num)) {
                onChange(cellId, num);
            }
        }
    };

    return (
        <input
            ref={inputRef}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={value ?? ''}
            onChange={handleChange}
            onFocus={() => onFocus(cellId)}
            onKeyDown={(e) => onKeyDown(e, cellId)}
            className={cn(
                'w-10 h-8 text-center text-sm font-medium rounded transition-all',
                'focus:outline-none focus:ring-2',
                hasError && 'bg-red-50 dark:bg-red-900/20',
                isDirty && !hasError && 'bg-amber-50 dark:bg-amber-900/20'
            )}
            style={{
                background: hasError ? undefined : isDirty ? undefined : 'var(--surface)',
                border: `1px solid ${isFocused ? teamColor : 'var(--rule)'}`,
                color: 'var(--ink)',
                // Use CSS custom property for ring color
                ['--tw-ring-color' as string]: teamColor,
            }}
        />
    );
}

// ============================================
// MATCH ROW COMPONENT
// ============================================

interface MatchRowProps {
    match: BatchMatch;
    holes: number[];
    scores: Record<number, { teamA: number | null; teamB: number | null }>;
    dirtyScores: Set<string>;
    errorScores: Set<string>;
    focusedCell: string | null;
    onCellFocus: (cellId: string) => void;
    onCellChange: (cellId: string, value: number | null) => void;
    onCellKeyDown: (e: KeyboardEvent<HTMLInputElement>, cellId: string) => void;
}

function MatchRow({
    match,
    holes,
    scores,
    dirtyScores,
    errorScores,
    focusedCell,
    onCellFocus,
    onCellChange,
    onCellKeyDown,
}: MatchRowProps) {
    return (
        <div className="flex items-stretch border-b" style={{ borderColor: 'var(--rule)' }}>
            {/* Match Info */}
            <div className="w-32 flex-shrink-0 p-2 flex flex-col justify-center border-r" style={{ borderColor: 'var(--rule)' }}>
                <div className="flex items-center gap-1.5 mb-1">
                    <div
                        className="w-5 h-5 rounded flex items-center justify-center text-xs font-bold"
                        style={{ background: 'var(--rule)', color: 'var(--ink-secondary)' }}
                    >
                        {match.matchNumber}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-[10px] truncate" style={{ color: match.teamAColor }}>
                            {match.teamAPlayers[0]?.split(' ').pop()}
                        </p>
                        <p className="text-[10px] truncate" style={{ color: match.teamBColor }}>
                            {match.teamBPlayers[0]?.split(' ').pop()}
                        </p>
                    </div>
                </div>
            </div>

            {/* Score Cells */}
            <div className="flex-1 flex">
                {holes.map((hole) => {
                    const holeScore = scores[hole] || { teamA: null, teamB: null };
                    const cellIdA = getCellId(match.id, hole, 'A');
                    const cellIdB = getCellId(match.id, hole, 'B');

                    return (
                        <div
                            key={hole}
                            className="flex flex-col gap-1 p-1 border-r"
                            style={{ borderColor: 'var(--rule)', minWidth: '48px' }}
                        >
                            <CellInput
                                cellId={cellIdA}
                                value={holeScore.teamA}
                                isDirty={dirtyScores.has(cellIdA)}
                                hasError={errorScores.has(cellIdA)}
                                teamColor={match.teamAColor}
                                isFocused={focusedCell === cellIdA}
                                onFocus={onCellFocus}
                                onChange={onCellChange}
                                onKeyDown={onCellKeyDown}
                            />
                            <CellInput
                                cellId={cellIdB}
                                value={holeScore.teamB}
                                isDirty={dirtyScores.has(cellIdB)}
                                hasError={errorScores.has(cellIdB)}
                                teamColor={match.teamBColor}
                                isFocused={focusedCell === cellIdB}
                                onFocus={onCellFocus}
                                onChange={onCellChange}
                                onKeyDown={onCellKeyDown}
                            />
                        </div>
                    );
                })}
            </div>

            {/* Row Total */}
            <div className="w-16 flex-shrink-0 flex flex-col justify-center items-center p-2 border-l" style={{ borderColor: 'var(--rule)' }}>
                {(() => {
                    let teamATotal = 0;
                    let teamBTotal = 0;
                    let holesPlayed = 0;

                    for (const hole of holes) {
                        const s = scores[hole];
                        if (s?.teamA != null && s?.teamB != null) {
                            teamATotal += s.teamA;
                            teamBTotal += s.teamB;
                            holesPlayed++;
                        }
                    }

                    if (holesPlayed === 0) return <span className="text-xs" style={{ color: 'var(--ink-tertiary)' }}>—</span>;

                    const diff = teamBTotal - teamATotal; // Positive means Team A is up (lower is better in golf)
                    return (
                        <div className="text-center">
                            <span
                                className="text-sm font-bold"
                                style={{
                                    color: diff > 0 ? match.teamAColor :
                                        diff < 0 ? match.teamBColor : 'var(--ink-tertiary)'
                                }}
                            >
                                {diff > 0 ? `+${diff}` : diff < 0 ? diff : 'AS'}
                            </span>
                            <span className="block text-[10px]" style={{ color: 'var(--ink-tertiary)' }}>
                                thru {holesPlayed}
                            </span>
                        </div>
                    );
                })()}
            </div>
        </div>
    );
}

// ============================================
// MAIN BATCH SCORE GRID
// ============================================

export function BatchScoreGrid({
    matches,
    existingScores = {},
    totalHoles = 18,
    frontNineOnly = false,
    backNineOnly = false,
    onSave,
    onAutoSave,
    className,
}: BatchScoreGridProps) {
    const haptic = useHaptic();
    const containerRef = useRef<HTMLDivElement>(null);

    // Determine holes to display
    const holes = useMemo(() => {
        if (frontNineOnly) return Array.from({ length: 9 }, (_, i) => i + 1);
        if (backNineOnly) return Array.from({ length: 9 }, (_, i) => i + 10);
        return Array.from({ length: totalHoles }, (_, i) => i + 1);
    }, [totalHoles, frontNineOnly, backNineOnly]);

    // State
    const [scores, setScores] = useState<Record<string, Record<number, { teamA: number | null; teamB: number | null }>>>(() => {
        // Initialize with existing scores
        const initial: Record<string, Record<number, { teamA: number | null; teamB: number | null }>> = {};
        for (const match of matches) {
            initial[match.id] = existingScores[match.id] || {};
            for (const hole of holes) {
                if (!initial[match.id][hole]) {
                    initial[match.id][hole] = { teamA: null, teamB: null };
                }
            }
        }
        return initial;
    });

    const [dirtyScores, setDirtyScores] = useState<Set<string>>(new Set());
    const [errorScores, setErrorScores] = useState<Set<string>>(new Set());
    const [focusedCell, setFocusedCell] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
    const [scrollPosition, setScrollPosition] = useState<'front' | 'back'>('front');

    // Auto-save debounce
    useEffect(() => {
        if (dirtyScores.size === 0 || !onAutoSave) return;

        const timer = setTimeout(() => {
            const entries: BatchScoreEntry[] = [];
            dirtyScores.forEach((cellId) => {
                const parsed = parseCellId(cellId);
                if (!parsed) return;
                const { matchId, hole, team } = parsed;
                const score = scores[matchId]?.[hole]?.[team === 'A' ? 'teamA' : 'teamB'] ?? null;
                entries.push({
                    matchId,
                    hole,
                    teamAScore: team === 'A' ? score : scores[matchId]?.[hole]?.teamA ?? null,
                    teamBScore: team === 'B' ? score : scores[matchId]?.[hole]?.teamB ?? null,
                    isDirty: true,
                    hasError: errorScores.has(cellId),
                });
            });
            onAutoSave(entries);
        }, 2000);

        return () => clearTimeout(timer);
    }, [dirtyScores, scores, errorScores, onAutoSave]);

    // Handle cell focus
    const handleCellFocus = useCallback((cellId: string) => {
        setFocusedCell(cellId);
    }, []);

    // Handle cell change
    const handleCellChange = useCallback((cellId: string, value: number | null) => {
        const parsed = parseCellId(cellId);
        if (!parsed) return;

        const { matchId, hole, team } = parsed;
        const validation = validateScore(value);

        setScores((prev) => ({
            ...prev,
            [matchId]: {
                ...prev[matchId],
                [hole]: {
                    ...prev[matchId]?.[hole],
                    [team === 'A' ? 'teamA' : 'teamB']: value,
                },
            },
        }));

        setDirtyScores((prev) => new Set(prev).add(cellId));

        if (!validation.valid) {
            setErrorScores((prev) => new Set(prev).add(cellId));
        } else {
            setErrorScores((prev) => {
                const next = new Set(prev);
                next.delete(cellId);
                return next;
            });
        }
    }, []);

    // Handle keyboard navigation
    const handleCellKeyDown = useCallback((e: KeyboardEvent<HTMLInputElement>, cellId: string) => {
        const parsed = parseCellId(cellId);
        if (!parsed) return;

        const { matchId, hole, team } = parsed;
        const matchIndex = matches.findIndex((m) => m.id === matchId);
        const holeIndex = holes.indexOf(hole);

        let newMatchId = matchId;
        let newHole = hole;
        let newTeam = team;

        switch (e.key) {
            case 'ArrowRight':
            case 'Tab':
                e.preventDefault();
                if (team === 'A') {
                    newTeam = 'B';
                } else {
                    newTeam = 'A';
                    if (holeIndex < holes.length - 1) {
                        newHole = holes[holeIndex + 1];
                    } else if (matchIndex < matches.length - 1) {
                        newMatchId = matches[matchIndex + 1].id;
                        newHole = holes[0];
                    }
                }
                break;

            case 'ArrowLeft':
                e.preventDefault();
                if (team === 'B') {
                    newTeam = 'A';
                } else {
                    newTeam = 'B';
                    if (holeIndex > 0) {
                        newHole = holes[holeIndex - 1];
                    } else if (matchIndex > 0) {
                        newMatchId = matches[matchIndex - 1].id;
                        newHole = holes[holes.length - 1];
                    }
                }
                break;

            case 'ArrowDown':
                e.preventDefault();
                if (team === 'A') {
                    newTeam = 'B';
                } else if (matchIndex < matches.length - 1) {
                    newMatchId = matches[matchIndex + 1].id;
                    newTeam = 'A';
                }
                break;

            case 'ArrowUp':
                e.preventDefault();
                if (team === 'B') {
                    newTeam = 'A';
                } else if (matchIndex > 0) {
                    newMatchId = matches[matchIndex - 1].id;
                    newTeam = 'B';
                }
                break;

            case 'Enter':
                e.preventDefault();
                // Move to next row (same hole, next match)
                if (matchIndex < matches.length - 1) {
                    newMatchId = matches[matchIndex + 1].id;
                }
                break;

            default:
                return;
        }

        setFocusedCell(getCellId(newMatchId, newHole, newTeam));
    }, [matches, holes]);

    // Handle save
    const handleSave = async () => {
        if (errorScores.size > 0) {
            haptic.error();
            return;
        }

        haptic.impact();
        setIsSaving(true);

        try {
            const entries: BatchScoreEntry[] = [];
            dirtyScores.forEach((cellId) => {
                const parsed = parseCellId(cellId);
                if (!parsed) return;
                const { matchId, hole } = parsed;
                entries.push({
                    matchId,
                    hole,
                    teamAScore: scores[matchId]?.[hole]?.teamA ?? null,
                    teamBScore: scores[matchId]?.[hole]?.teamB ?? null,
                    isDirty: true,
                    hasError: false,
                });
            });

            await onSave(entries);
            setDirtyScores(new Set());
            haptic.success();
        } catch (error) {
            logger.error('Save failed:', error);
            haptic.error();
        } finally {
            setIsSaving(false);
        }
    };

    // Handle reset
    const handleReset = () => {
        haptic.press();
        setScores(() => {
            const initial: Record<string, Record<number, { teamA: number | null; teamB: number | null }>> = {};
            for (const match of matches) {
                initial[match.id] = existingScores[match.id] || {};
                for (const hole of holes) {
                    if (!initial[match.id][hole]) {
                        initial[match.id][hole] = { teamA: null, teamB: null };
                    }
                }
            }
            return initial;
        });
        setDirtyScores(new Set());
        setErrorScores(new Set());
    };

    // Handle scroll navigation
    const handleScrollLeft = () => {
        haptic.tap();
        setScrollPosition('front');
        containerRef.current?.scrollTo({ left: 0, behavior: 'smooth' });
    };

    const handleScrollRight = () => {
        haptic.tap();
        setScrollPosition('back');
        containerRef.current?.scrollTo({ left: containerRef.current.scrollWidth, behavior: 'smooth' });
    };

    const dirtyCount = dirtyScores.size;
    const errorCount = errorScores.size;

    return (
        <div className={cn('space-y-4', className)}>
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Grid3X3 size={20} style={{ color: 'var(--masters)' }} />
                    <h2 className="text-xl font-bold" style={{ color: 'var(--ink)' }}>
                        Batch Score Entry
                    </h2>
                </div>

                <div className="flex items-center gap-2">
                    {/* Keyboard Help Toggle */}
                    <button
                        onClick={() => setShowKeyboardHelp(!showKeyboardHelp)}
                        className="p-2 rounded-lg"
                        style={{ background: 'var(--surface)' }}
                    >
                        <Keyboard size={18} style={{ color: 'var(--ink-secondary)' }} />
                    </button>

                    {/* Reset Button */}
                    <button
                        onClick={handleReset}
                        disabled={dirtyCount === 0}
                        className={cn(
                            'p-2 rounded-lg',
                            dirtyCount === 0 && 'opacity-50'
                        )}
                        style={{ background: 'var(--surface)' }}
                    >
                        <RotateCcw size={18} style={{ color: 'var(--ink-secondary)' }} />
                    </button>
                </div>
            </div>

            {/* Keyboard Help */}
            <AnimatePresence>
                {showKeyboardHelp && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                    >
                        <div
                            className="p-3 rounded-lg text-xs grid grid-cols-2 gap-2"
                            style={{ background: 'var(--surface)' }}
                        >
                            <div className="flex items-center gap-2">
                                <kbd className="px-1.5 py-0.5 rounded" style={{ background: 'var(--rule)' }}>←→</kbd>
                                <span style={{ color: 'var(--ink-secondary)' }}>Move between cells</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <kbd className="px-1.5 py-0.5 rounded" style={{ background: 'var(--rule)' }}>↑↓</kbd>
                                <span style={{ color: 'var(--ink-secondary)' }}>Move between teams/matches</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <kbd className="px-1.5 py-0.5 rounded" style={{ background: 'var(--rule)' }}>Tab</kbd>
                                <span style={{ color: 'var(--ink-secondary)' }}>Next cell</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <kbd className="px-1.5 py-0.5 rounded" style={{ background: 'var(--rule)' }}>Enter</kbd>
                                <span style={{ color: 'var(--ink-secondary)' }}>Next match</span>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Status Bar */}
            <div className="flex items-center justify-between p-3 rounded-lg" style={{ background: 'var(--surface)' }}>
                <div className="flex items-center gap-4">
                    {dirtyCount > 0 && (
                        <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-amber-500" />
                            <span className="text-xs" style={{ color: 'var(--ink-secondary)' }}>
                                {dirtyCount} unsaved
                            </span>
                        </div>
                    )}
                    {errorCount > 0 && (
                        <div className="flex items-center gap-1.5">
                            <AlertTriangle size={12} style={{ color: '#EF4444' }} />
                            <span className="text-xs" style={{ color: '#EF4444' }}>
                                {errorCount} errors
                            </span>
                        </div>
                    )}
                    {dirtyCount === 0 && errorCount === 0 && (
                        <div className="flex items-center gap-1.5">
                            <CheckCircle2 size={12} style={{ color: 'var(--positive)' }} />
                            <span className="text-xs" style={{ color: 'var(--positive)' }}>
                                All saved
                            </span>
                        </div>
                    )}
                </div>

                {/* Scroll Navigation (for mobile) */}
                {!frontNineOnly && !backNineOnly && (
                    <div className="flex items-center gap-1 md:hidden">
                        <button
                            onClick={handleScrollLeft}
                            className={cn(
                                'p-1.5 rounded',
                                scrollPosition === 'front' && 'bg-gray-200 dark:bg-gray-700'
                            )}
                        >
                            <ChevronLeft size={16} style={{ color: 'var(--ink-secondary)' }} />
                        </button>
                        <span className="text-xs" style={{ color: 'var(--ink-tertiary)' }}>
                            {scrollPosition === 'front' ? 'Front 9' : 'Back 9'}
                        </span>
                        <button
                            onClick={handleScrollRight}
                            className={cn(
                                'p-1.5 rounded',
                                scrollPosition === 'back' && 'bg-gray-200 dark:bg-gray-700'
                            )}
                        >
                            <ChevronRight size={16} style={{ color: 'var(--ink-secondary)' }} />
                        </button>
                    </div>
                )}
            </div>

            {/* Grid Container */}
            <div
                ref={containerRef}
                className="border rounded-xl overflow-x-auto"
                style={{ borderColor: 'var(--rule)' }}
            >
                {/* Header Row */}
                <div className="flex border-b sticky top-0 z-10" style={{ borderColor: 'var(--rule)', background: 'var(--bg)' }}>
                    <div className="w-32 flex-shrink-0 p-2 border-r" style={{ borderColor: 'var(--rule)' }}>
                        <span className="text-xs font-semibold" style={{ color: 'var(--ink-secondary)' }}>
                            Match
                        </span>
                    </div>
                    {holes.map((hole) => (
                        <div
                            key={hole}
                            className="flex-shrink-0 p-2 text-center border-r"
                            style={{ borderColor: 'var(--rule)', minWidth: '48px' }}
                        >
                            <span className="text-xs font-bold" style={{ color: 'var(--ink-secondary)' }}>
                                {hole}
                            </span>
                        </div>
                    ))}
                    <div className="w-16 flex-shrink-0 p-2 text-center border-l" style={{ borderColor: 'var(--rule)' }}>
                        <span className="text-xs font-semibold" style={{ color: 'var(--ink-secondary)' }}>
                            Status
                        </span>
                    </div>
                </div>

                {/* Match Rows */}
                {matches.map((match) => (
                    <MatchRow
                        key={match.id}
                        match={match}
                        holes={holes}
                        scores={scores[match.id] || {}}
                        dirtyScores={dirtyScores}
                        errorScores={errorScores}
                        focusedCell={focusedCell}
                        onCellFocus={handleCellFocus}
                        onCellChange={handleCellChange}
                        onCellKeyDown={handleCellKeyDown}
                    />
                ))}
            </div>

            {/* Save Button */}
            <motion.button
                onClick={handleSave}
                disabled={dirtyCount === 0 || errorCount > 0 || isSaving}
                className={cn(
                    'w-full py-3 rounded-xl font-semibold text-white flex items-center justify-center gap-2',
                    (dirtyCount === 0 || errorCount > 0 || isSaving) && 'opacity-50 cursor-not-allowed'
                )}
                style={{ background: 'var(--masters)' }}
                whileTap={{ scale: 0.98 }}
            >
                {isSaving ? (
                    <>
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        >
                            <RefreshCw size={18} />
                        </motion.div>
                        Saving {dirtyCount} scores...
                    </>
                ) : (
                    <>
                        <Upload size={18} />
                        Save {dirtyCount} Scores
                    </>
                )}
            </motion.button>

            {/* Error Warning */}
            {errorCount > 0 && (
                <div
                    className="p-3 rounded-lg flex items-center gap-2 text-sm"
                    style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#EF4444' }}
                >
                    <AlertTriangle size={16} />
                    Please fix {errorCount} error{errorCount !== 1 ? 's' : ''} before saving
                </div>
            )}
        </div>
    );
}

export default BatchScoreGrid;
