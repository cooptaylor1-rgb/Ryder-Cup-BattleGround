'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import {
    Plus,
    Trash2,
    GripVertical,
    Users,
    Target,
    Handshake,
    Sun,
    Moon,
    Sunrise,
    Copy,
    RotateCcw,
    Sparkles,
    Calendar,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type SessionType = 'fourball' | 'foursomes' | 'singles' | 'mixed';
export type TimeSlot = 'AM' | 'PM' | 'twilight';

export interface SessionConfig {
    id: string;
    dayOffset: number;
    timeSlot: TimeSlot;
    sessionType: SessionType;
    matchCount: number;
    name: string;
    pointsPerMatch: number;
}

interface SessionBuilderProps {
    sessions: SessionConfig[];
    onSessionsChange: (sessions: SessionConfig[]) => void;
    totalDays: number;
    onTotalDaysChange: (days: number) => void;
    playersPerTeam: number;
    className?: string;
}

const SESSION_TYPE_CONFIG: Record<SessionType, {
    label: string;
    icon: React.ReactNode;
    description: string;
    playersPerMatch: number;
    color: string;
}> = {
    fourball: {
        label: 'Four-Ball',
        icon: <Users className="w-4 h-4" />,
        description: 'Best ball of 2 players',
        playersPerMatch: 2,
        color: 'bg-blue-500',
    },
    foursomes: {
        label: 'Foursomes',
        icon: <Handshake className="w-4 h-4" />,
        description: 'Alternate shot',
        playersPerMatch: 2,
        color: 'bg-purple-500',
    },
    singles: {
        label: 'Singles',
        icon: <Target className="w-4 h-4" />,
        description: '1v1 match play',
        playersPerMatch: 1,
        color: 'bg-orange-500',
    },
    mixed: {
        label: 'Mixed',
        icon: <Sparkles className="w-4 h-4" />,
        description: 'Combination format',
        playersPerMatch: 2,
        color: 'bg-green-500',
    },
};

const TIME_SLOT_CONFIG: Record<TimeSlot, {
    label: string;
    icon: React.ReactNode;
    typical: string;
}> = {
    AM: {
        label: 'Morning',
        icon: <Sunrise className="w-4 h-4" />,
        typical: '7:00 - 11:00',
    },
    PM: {
        label: 'Afternoon',
        icon: <Sun className="w-4 h-4" />,
        typical: '12:00 - 16:00',
    },
    twilight: {
        label: 'Twilight',
        icon: <Moon className="w-4 h-4" />,
        typical: '16:00+',
    },
};

const PRESET_TEMPLATES = [
    {
        id: 'ryder',
        name: 'Ryder Style',
        description: 'Classic 3-day format',
        sessions: 6,
    },
    {
        id: 'weekend',
        name: 'Weekend',
        description: '2-day tournament',
        sessions: 4,
    },
    {
        id: 'single-day',
        name: 'Single Day',
        description: 'Quick competition',
        sessions: 2,
    },
];

export function SessionBuilder({
    sessions,
    onSessionsChange,
    totalDays,
    onTotalDaysChange,
    playersPerTeam,
    className,
}: SessionBuilderProps) {
    const [expandedSession, setExpandedSession] = useState<string | null>(null);
    const [showPresets, setShowPresets] = useState(false);

    const generateSessionId = useCallback(() => {
        return `session-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    }, []);

    const addSession = useCallback((dayOffset: number = 0) => {
        const newSession: SessionConfig = {
            id: generateSessionId(),
            dayOffset,
            timeSlot: 'AM',
            sessionType: 'fourball',
            matchCount: Math.min(Math.floor(playersPerTeam / 2), 4),
            name: `Session ${sessions.length + 1}`,
            pointsPerMatch: 1,
        };
        onSessionsChange([...sessions, newSession]);
        setExpandedSession(newSession.id);
    }, [sessions, onSessionsChange, generateSessionId, playersPerTeam]);

    const duplicateSession = useCallback((sessionId: string) => {
        const session = sessions.find(s => s.id === sessionId);
        if (!session) return;

        const newSession: SessionConfig = {
            ...session,
            id: generateSessionId(),
            name: `${session.name} (Copy)`,
        };
        const index = sessions.findIndex(s => s.id === sessionId);
        const newSessions = [...sessions];
        newSessions.splice(index + 1, 0, newSession);
        onSessionsChange(newSessions);
    }, [sessions, onSessionsChange, generateSessionId]);

    const removeSession = useCallback((sessionId: string) => {
        onSessionsChange(sessions.filter(s => s.id !== sessionId));
    }, [sessions, onSessionsChange]);

    const updateSession = useCallback((sessionId: string, updates: Partial<SessionConfig>) => {
        onSessionsChange(sessions.map(s =>
            s.id === sessionId ? { ...s, ...updates } : s
        ));
    }, [sessions, onSessionsChange]);

    const applyPreset = useCallback((presetId: string) => {
        let newSessions: SessionConfig[] = [];
        let newDays = 1;

        switch (presetId) {
            case 'ryder':
                newDays = 3;
                newSessions = [
                    { id: generateSessionId(), dayOffset: 0, timeSlot: 'AM', sessionType: 'foursomes', matchCount: 4, name: 'Day 1 Foursomes', pointsPerMatch: 1 },
                    { id: generateSessionId(), dayOffset: 0, timeSlot: 'PM', sessionType: 'fourball', matchCount: 4, name: 'Day 1 Four-Ball', pointsPerMatch: 1 },
                    { id: generateSessionId(), dayOffset: 1, timeSlot: 'AM', sessionType: 'foursomes', matchCount: 4, name: 'Day 2 Foursomes', pointsPerMatch: 1 },
                    { id: generateSessionId(), dayOffset: 1, timeSlot: 'PM', sessionType: 'fourball', matchCount: 4, name: 'Day 2 Four-Ball', pointsPerMatch: 1 },
                    { id: generateSessionId(), dayOffset: 2, timeSlot: 'AM', sessionType: 'singles', matchCount: 12, name: 'Day 3 Singles', pointsPerMatch: 1 },
                ];
                break;
            case 'weekend':
                newDays = 2;
                newSessions = [
                    { id: generateSessionId(), dayOffset: 0, timeSlot: 'AM', sessionType: 'fourball', matchCount: 4, name: 'Day 1 Four-Ball', pointsPerMatch: 1 },
                    { id: generateSessionId(), dayOffset: 0, timeSlot: 'PM', sessionType: 'foursomes', matchCount: 4, name: 'Day 1 Foursomes', pointsPerMatch: 1 },
                    { id: generateSessionId(), dayOffset: 1, timeSlot: 'AM', sessionType: 'singles', matchCount: 8, name: 'Day 2 Singles', pointsPerMatch: 1 },
                ];
                break;
            case 'single-day':
                newDays = 1;
                newSessions = [
                    { id: generateSessionId(), dayOffset: 0, timeSlot: 'AM', sessionType: 'fourball', matchCount: 4, name: 'Morning Four-Ball', pointsPerMatch: 1 },
                    { id: generateSessionId(), dayOffset: 0, timeSlot: 'PM', sessionType: 'singles', matchCount: 8, name: 'Afternoon Singles', pointsPerMatch: 1 },
                ];
                break;
        }

        onTotalDaysChange(newDays);
        onSessionsChange(newSessions);
        setShowPresets(false);
    }, [onSessionsChange, onTotalDaysChange, generateSessionId]);

    const clearAllSessions = useCallback(() => {
        onSessionsChange([]);
    }, [onSessionsChange]);

    // Calculate stats
    const totalMatches = sessions.reduce((sum, s) => sum + s.matchCount, 0);
    const totalPoints = sessions.reduce((sum, s) => sum + (s.matchCount * s.pointsPerMatch), 0);

    // Group sessions by day
    const sessionsByDay = sessions.reduce((acc, session) => {
        const day = session.dayOffset;
        if (!acc[day]) acc[day] = [];
        acc[day].push(session);
        return acc;
    }, {} as Record<number, SessionConfig[]>);

    return (
        <div className={cn('space-y-4', className)}>
            {/* Header with stats */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="font-semibold text-lg">Session Builder</h3>
                    <p className="text-sm text-surface-500">
                        {sessions.length} sessions • {totalMatches} matches • {totalPoints} points
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setShowPresets(!showPresets)}
                        className="btn-secondary text-sm px-3 py-1.5"
                    >
                        <Sparkles className="w-4 h-4 mr-1" />
                        Presets
                    </button>
                    {sessions.length > 0 && (
                        <button
                            onClick={clearAllSessions}
                            className="btn-secondary text-sm px-3 py-1.5 text-red-600"
                        >
                            <RotateCcw className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>

            {/* Presets dropdown */}
            <AnimatePresence>
                {showPresets && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="grid grid-cols-3 gap-2 p-3 bg-surface-50 dark:bg-surface-800 rounded-xl">
                            {PRESET_TEMPLATES.map(preset => (
                                <button
                                    key={preset.id}
                                    onClick={() => applyPreset(preset.id)}
                                    className="p-3 rounded-lg bg-white dark:bg-surface-700 hover:bg-augusta-green/5 border border-surface-200 dark:border-surface-600 text-left transition-colors"
                                >
                                    <p className="font-medium text-sm">{preset.name}</p>
                                    <p className="text-xs text-surface-500">{preset.description}</p>
                                </button>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Days selector */}
            <div className="flex items-center gap-4 p-3 bg-surface-50 dark:bg-surface-800 rounded-xl">
                <Calendar className="w-5 h-5 text-surface-500" />
                <span className="text-sm font-medium">Tournament Days</span>
                <div className="flex gap-1 ml-auto">
                    {[1, 2, 3, 4, 5].map(day => (
                        <button
                            key={day}
                            onClick={() => onTotalDaysChange(day)}
                            className={cn(
                                'w-9 h-9 rounded-lg text-sm font-medium transition-all',
                                totalDays === day
                                    ? 'bg-augusta-green text-white'
                                    : 'bg-white dark:bg-surface-700 hover:bg-augusta-green/10'
                            )}
                        >
                            {day}
                        </button>
                    ))}
                </div>
            </div>

            {/* Sessions by day */}
            <div className="space-y-6">
                {Array.from({ length: totalDays }).map((_, dayIndex) => (
                    <div key={dayIndex} className="space-y-2">
                        <div className="flex items-center justify-between">
                            <h4 className="font-medium text-surface-600 dark:text-surface-400">
                                Day {dayIndex + 1}
                            </h4>
                            <button
                                onClick={() => addSession(dayIndex)}
                                className="text-sm text-augusta-green hover:text-augusta-green/80 flex items-center gap-1"
                            >
                                <Plus className="w-4 h-4" />
                                Add Session
                            </button>
                        </div>

                        {/* Session cards for this day */}
                        <Reorder.Group
                            axis="y"
                            values={sessionsByDay[dayIndex] || []}
                            onReorder={(newOrder) => {
                                const otherSessions = sessions.filter(s => s.dayOffset !== dayIndex);
                                onSessionsChange([...otherSessions, ...newOrder].sort((a, b) => {
                                    if (a.dayOffset !== b.dayOffset) return a.dayOffset - b.dayOffset;
                                    const timeOrder = { AM: 0, PM: 1, twilight: 2 };
                                    return timeOrder[a.timeSlot] - timeOrder[b.timeSlot];
                                }));
                            }}
                            className="space-y-2"
                        >
                            <AnimatePresence mode="popLayout">
                                {(sessionsByDay[dayIndex] || []).map(session => (
                                    <Reorder.Item
                                        key={session.id}
                                        value={session}
                                        initial={{ opacity: 0, y: -20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        className="touch-none"
                                    >
                                        <SessionCard
                                            session={session}
                                            isExpanded={expandedSession === session.id}
                                            onToggleExpand={() => setExpandedSession(
                                                expandedSession === session.id ? null : session.id
                                            )}
                                            onUpdate={(updates) => updateSession(session.id, updates)}
                                            onDuplicate={() => duplicateSession(session.id)}
                                            onRemove={() => removeSession(session.id)}
                                            playersPerTeam={playersPerTeam}
                                        />
                                    </Reorder.Item>
                                ))}
                            </AnimatePresence>
                        </Reorder.Group>

                        {(!sessionsByDay[dayIndex] || sessionsByDay[dayIndex].length === 0) && (
                            <button
                                onClick={() => addSession(dayIndex)}
                                className="w-full p-6 border-2 border-dashed border-surface-300 dark:border-surface-600 rounded-xl text-surface-500 hover:border-augusta-green hover:text-augusta-green transition-colors"
                            >
                                <Plus className="w-6 h-6 mx-auto mb-2" />
                                <p className="text-sm">Add first session for Day {dayIndex + 1}</p>
                            </button>
                        )}
                    </div>
                ))}
            </div>

            {/* Empty state */}
            {sessions.length === 0 && (
                <div className="text-center py-12">
                    <Calendar className="w-12 h-12 mx-auto text-surface-400 mb-3" />
                    <p className="text-surface-600 dark:text-surface-400">
                        No sessions yet
                    </p>
                    <p className="text-sm text-surface-500 mb-4">
                        Start with a preset or build your own format
                    </p>
                    <button
                        onClick={() => setShowPresets(true)}
                        className="btn-primary"
                    >
                        Choose a Preset
                    </button>
                </div>
            )}
        </div>
    );
}

// Session Card Component
interface SessionCardProps {
    session: SessionConfig;
    isExpanded: boolean;
    onToggleExpand: () => void;
    onUpdate: (updates: Partial<SessionConfig>) => void;
    onDuplicate: () => void;
    onRemove: () => void;
    playersPerTeam: number;
}

function SessionCard({
    session,
    isExpanded,
    onToggleExpand,
    onUpdate,
    onDuplicate,
    onRemove,
    playersPerTeam,
}: SessionCardProps) {
    const typeConfig = SESSION_TYPE_CONFIG[session.sessionType];
    const timeConfig = TIME_SLOT_CONFIG[session.timeSlot];
    const maxMatches = session.sessionType === 'singles' ? playersPerTeam : Math.floor(playersPerTeam / 2);

    return (
        <div className="card overflow-hidden">
            {/* Header - always visible */}
            <button
                onClick={onToggleExpand}
                className="w-full p-3 flex items-center gap-3 text-left hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors"
            >
                <div className="cursor-grab active:cursor-grabbing p-1 -ml-1 text-surface-400 hover:text-surface-600">
                    <GripVertical className="w-4 h-4" />
                </div>

                <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center text-white', typeConfig.color)}>
                    {typeConfig.icon}
                </div>

                <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{session.name}</p>
                    <div className="flex items-center gap-2 text-xs text-surface-500">
                        <span className="flex items-center gap-1">
                            {timeConfig.icon}
                            {timeConfig.label}
                        </span>
                        <span>•</span>
                        <span>{session.matchCount} {session.matchCount === 1 ? 'match' : 'matches'}</span>
                        <span>•</span>
                        <span>{session.matchCount * session.pointsPerMatch} pts</span>
                    </div>
                </div>

                <div className="flex items-center gap-1">
                    <button
                        onClick={(e) => { e.stopPropagation(); onDuplicate(); }}
                        className="p-2 hover:bg-surface-100 dark:hover:bg-surface-700 rounded-lg transition-colors"
                    >
                        <Copy className="w-4 h-4 text-surface-500" />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); onRemove(); }}
                        className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    >
                        <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                </div>
            </button>

            {/* Expanded content */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: 'auto' }}
                        exit={{ height: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="p-4 pt-0 space-y-4 border-t border-surface-200 dark:border-surface-700">
                            {/* Session name */}
                            <div>
                                <label className="text-sm font-medium mb-1.5 block">Session Name</label>
                                <input
                                    type="text"
                                    value={session.name}
                                    onChange={(e) => onUpdate({ name: e.target.value })}
                                    className="input w-full"
                                />
                            </div>

                            {/* Time slot */}
                            <div>
                                <label className="text-sm font-medium mb-1.5 block">Time Slot</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {(Object.keys(TIME_SLOT_CONFIG) as TimeSlot[]).map(slot => {
                                        const config = TIME_SLOT_CONFIG[slot];
                                        return (
                                            <button
                                                key={slot}
                                                onClick={() => onUpdate({ timeSlot: slot })}
                                                className={cn(
                                                    'p-2 rounded-lg border-2 transition-all',
                                                    session.timeSlot === slot
                                                        ? 'border-augusta-green bg-augusta-green/5'
                                                        : 'border-surface-200 dark:border-surface-700'
                                                )}
                                            >
                                                <div className="flex items-center justify-center gap-1 text-sm">
                                                    {config.icon}
                                                    {config.label}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Session type */}
                            <div>
                                <label className="text-sm font-medium mb-1.5 block">Format</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {(Object.keys(SESSION_TYPE_CONFIG) as SessionType[]).map(type => {
                                        const config = SESSION_TYPE_CONFIG[type];
                                        return (
                                            <button
                                                key={type}
                                                onClick={() => onUpdate({
                                                    sessionType: type,
                                                    matchCount: Math.min(
                                                        session.matchCount,
                                                        type === 'singles' ? playersPerTeam : Math.floor(playersPerTeam / 2)
                                                    )
                                                })}
                                                className={cn(
                                                    'p-3 rounded-lg border-2 transition-all text-left',
                                                    session.sessionType === type
                                                        ? 'border-augusta-green bg-augusta-green/5'
                                                        : 'border-surface-200 dark:border-surface-700'
                                                )}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center text-white', config.color)}>
                                                        {config.icon}
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-sm">{config.label}</p>
                                                        <p className="text-xs text-surface-500">{config.description}</p>
                                                    </div>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Match count */}
                            <div>
                                <label className="text-sm font-medium mb-1.5 block">
                                    Number of Matches
                                </label>
                                <div className="flex items-center gap-3">
                                    <input
                                        type="range"
                                        min={1}
                                        max={maxMatches}
                                        value={session.matchCount}
                                        onChange={(e) => onUpdate({ matchCount: parseInt(e.target.value) })}
                                        className="flex-1 accent-augusta-green"
                                    />
                                    <span className="w-8 text-center font-mono text-lg">{session.matchCount}</span>
                                </div>
                                <p className="text-xs text-surface-500 mt-1">
                                    Max {maxMatches} for {typeConfig.label.toLowerCase()} with {playersPerTeam} players per team
                                </p>
                            </div>

                            {/* Points per match */}
                            <div>
                                <label className="text-sm font-medium mb-1.5 block">Points per Match</label>
                                <div className="flex gap-2">
                                    {[0.5, 1, 1.5, 2, 3].map(pts => (
                                        <button
                                            key={pts}
                                            onClick={() => onUpdate({ pointsPerMatch: pts })}
                                            className={cn(
                                                'flex-1 py-2 rounded-lg text-sm font-medium transition-all',
                                                session.pointsPerMatch === pts
                                                    ? 'bg-augusta-green text-white'
                                                    : 'bg-surface-100 dark:bg-surface-700 hover:bg-surface-200'
                                            )}
                                        >
                                            {pts}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export default SessionBuilder;
