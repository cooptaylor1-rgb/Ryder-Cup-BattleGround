'use client';

/**
 * Availability Calendar
 *
 * Let players mark which sessions/days they can participate.
 * Visual calendar with session overlay showing golf schedule.
 */

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Calendar,
    Check,
    X,
    HelpCircle,
    Sun,
    Sunset,
    ChevronRight,
    AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================
// TYPES
// ============================================

export interface TripSession {
    id: string;
    name: string;
    date: string;
    time: 'morning' | 'afternoon' | 'full';
    format: string;
}

export interface AvailabilityStatus {
    sessionId: string;
    status: 'available' | 'unavailable' | 'maybe';
    note?: string;
}

interface AvailabilityCalendarProps {
    tripStartDate: string;
    tripEndDate: string;
    sessions: TripSession[];
    onAvailabilityChange: (availability: AvailabilityStatus[]) => void;
    initialAvailability?: AvailabilityStatus[];
    className?: string;
}

// ============================================
// HELPERS
// ============================================

const getDatesBetween = (start: string, end: string): Date[] => {
    const dates: Date[] = [];
    const current = new Date(start);
    const endDate = new Date(end);

    while (current <= endDate) {
        dates.push(new Date(current));
        current.setDate(current.getDate() + 1);
    }

    return dates;
};

const formatDayOfWeek = (date: Date): string => {
    return date.toLocaleDateString('en-US', { weekday: 'short' });
};

const formatDayOfMonth = (date: Date): number => {
    return date.getDate();
};

const _formatMonthYear = (date: Date): string => {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
};

const isSameDay = (d1: Date, d2: Date): boolean => {
    return d1.toDateString() === d2.toDateString();
};

// ============================================
// COMPONENT
// ============================================

export function AvailabilityCalendar({
    tripStartDate,
    tripEndDate,
    sessions,
    onAvailabilityChange,
    initialAvailability = [],
    className,
}: AvailabilityCalendarProps) {
    const [availability, setAvailability] = useState<AvailabilityStatus[]>(
        initialAvailability.length > 0
            ? initialAvailability
            : sessions.map(s => ({ sessionId: s.id, status: 'available' }))
    );
    const [expandedDay, setExpandedDay] = useState<string | null>(null);
    const [noteModal, setNoteModal] = useState<{ sessionId: string; note: string } | null>(null);

    const tripDays = useMemo(() => getDatesBetween(tripStartDate, tripEndDate), [tripStartDate, tripEndDate]);

    const getSessionsForDay = (date: Date): TripSession[] => {
        return sessions.filter(s => isSameDay(new Date(s.date), date));
    };

    const getAvailability = (sessionId: string): AvailabilityStatus => {
        return availability.find(a => a.sessionId === sessionId) || {
            sessionId,
            status: 'available',
        };
    };

    const _toggleStatus = (sessionId: string) => {
        const current = getAvailability(sessionId);
        const statusOrder: AvailabilityStatus['status'][] = ['available', 'unavailable', 'maybe'];
        const currentIndex = statusOrder.indexOf(current.status);
        const nextStatus = statusOrder[(currentIndex + 1) % statusOrder.length];

        const newAvailability = availability.map(a =>
            a.sessionId === sessionId ? { ...a, status: nextStatus } : a
        );

        // Add if not exists
        if (!availability.find(a => a.sessionId === sessionId)) {
            newAvailability.push({ sessionId, status: nextStatus });
        }

        setAvailability(newAvailability);
        onAvailabilityChange(newAvailability);
    };

    const setAllAvailable = () => {
        const newAvailability = sessions.map(s => ({ sessionId: s.id, status: 'available' as const }));
        setAvailability(newAvailability);
        onAvailabilityChange(newAvailability);
    };

    const updateNote = (sessionId: string, note: string) => {
        const newAvailability = availability.map(a =>
            a.sessionId === sessionId ? { ...a, note } : a
        );
        setAvailability(newAvailability);
        onAvailabilityChange(newAvailability);
        setNoteModal(null);
    };

    // Stats
    const stats = useMemo(() => {
        const available = availability.filter(a => a.status === 'available').length;
        const unavailable = availability.filter(a => a.status === 'unavailable').length;
        const maybe = availability.filter(a => a.status === 'maybe').length;
        return { available, unavailable, maybe };
    }, [availability]);

    return (
        <div className={cn('space-y-4', className)}>
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="font-semibold text-[var(--ink-primary)] flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-masters" />
                        Your Availability
                    </h3>
                    <p className="text-sm text-[var(--ink-secondary)] mt-0.5">
                        Mark which sessions you can play
                    </p>
                </div>
                <button
                    onClick={setAllAvailable}
                    className="text-sm text-masters font-medium hover:text-masters/80 transition-colors"
                >
                    Mark all available
                </button>
            </div>

            {/* Stats Summary */}
            <div className="grid grid-cols-3 gap-2">
                <div className="bg-[color:var(--success)]/10 rounded-xl p-3 text-center">
                    <div className="text-xl font-bold text-[var(--success)]">{stats.available}</div>
                    <div className="text-xs text-[color:var(--success)]/80">Available</div>
                </div>
                <div className="bg-[color:var(--warning)]/10 rounded-xl p-3 text-center">
                    <div className="text-xl font-bold text-[var(--warning)]">{stats.maybe}</div>
                    <div className="text-xs text-[color:var(--warning)]/80">Maybe</div>
                </div>
                <div className="bg-[color:var(--error)]/10 rounded-xl p-3 text-center">
                    <div className="text-xl font-bold text-[var(--error)]">{stats.unavailable}</div>
                    <div className="text-xs text-[color:var(--error)]/80">Can&apos;t Play</div>
                </div>
            </div>

            {/* Calendar Days */}
            <div className="rounded-2xl border border-[var(--rule)] overflow-hidden bg-[var(--surface-raised)]">
                {tripDays.map((day, dayIndex) => {
                    const daySessions = getSessionsForDay(day);
                    const isExpanded = expandedDay === day.toISOString();
                    const dayKey = day.toISOString();

                    return (
                        <div
                            key={dayKey}
                            className={cn(
                                'border-b border-[color:var(--rule)]/60 last:border-b-0',
                                isExpanded && 'bg-[var(--surface-secondary)]'
                            )}
                        >
                            {/* Day Header */}
                            <button
                                onClick={() => setExpandedDay(isExpanded ? null : dayKey)}
                                className="w-full p-4 flex items-center justify-between hover:bg-[var(--surface-secondary)] transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-xl bg-masters/10 flex flex-col items-center justify-center">
                                        <span className="text-xs text-masters font-medium">
                                            {formatDayOfWeek(day)}
                                        </span>
                                        <span className="text-lg font-bold text-masters">
                                            {formatDayOfMonth(day)}
                                        </span>
                                    </div>
                                    <div>
                                        <div className="font-medium text-[var(--ink-primary)] text-left">
                                            Day {dayIndex + 1}
                                        </div>
                                        <div className="text-sm text-[var(--ink-secondary)]">
                                            {daySessions.length} session{daySessions.length !== 1 ? 's' : ''}
                                        </div>
                                    </div>
                                </div>

                                {/* Status Pills */}
                                <div className="flex items-center gap-2">
                                    {daySessions.map(session => {
                                        const status = getAvailability(session.id).status;
                                        return (
                                            <div
                                                key={session.id}
                                                className={cn(
                                                    'w-6 h-6 rounded-full flex items-center justify-center',
                                                    status === 'available' && 'bg-[color:var(--success)]',
                                                    status === 'unavailable' && 'bg-[color:var(--error)]',
                                                    status === 'maybe' && 'bg-[color:var(--warning)]'
                                                )}
                                            >
                                                {status === 'available' && <Check className="w-3.5 h-3.5 text-[var(--canvas)]" />}
                                                {status === 'unavailable' && <X className="w-3.5 h-3.5 text-[var(--canvas)]" />}
                                                {status === 'maybe' && <HelpCircle className="w-3.5 h-3.5 text-[var(--canvas)]" />}
                                            </div>
                                        );
                                    })}
                                    <ChevronRight
                                        className={cn(
                                            'w-5 h-5 text-[var(--ink-tertiary)] transition-transform',
                                            isExpanded && 'rotate-90'
                                        )}
                                    />
                                </div>
                            </button>

                            {/* Expanded Sessions */}
                            <AnimatePresence>
                                {isExpanded && daySessions.length > 0 && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.2 }}
                                        className="overflow-hidden"
                                    >
                                        <div className="px-4 pb-4 space-y-2">
                                            {daySessions.map(session => {
                                                const sessionAvailability = getAvailability(session.id);
                                                return (
                                                    <div
                                                        key={session.id}
                                                        className="rounded-xl border border-[var(--rule)] bg-[var(--surface)] p-3"
                                                    >
                                                        <div className="flex items-center justify-between mb-3">
                                                            <div className="flex items-center gap-2">
                                                                {session.time === 'morning' && (
                                                                    <Sun className="w-4 h-4 text-[var(--warning)]" />
                                                                )}
                                                                {session.time === 'afternoon' && (
                                                                    <Sunset className="w-4 h-4 text-[var(--warning)]" />
                                                                )}
                                                                {session.time === 'full' && (
                                                                    <Calendar className="w-4 h-4 text-[var(--info)]" />
                                                                )}
                                                                <span className="font-medium text-[var(--ink-primary)]">
                                                                    {session.name}
                                                                </span>
                                                            </div>
                                                            <span className="text-xs text-[var(--ink-tertiary)] px-2 py-1 bg-[var(--surface-secondary)] rounded-full">
                                                                {session.format}
                                                            </span>
                                                        </div>

                                                        {/* Status Buttons */}
                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={() => {
                                                                    const newAvailability = availability.map(a =>
                                                                        a.sessionId === session.id
                                                                            ? { ...a, status: 'available' as const }
                                                                            : a
                                                                    );
                                                                    setAvailability(newAvailability);
                                                                    onAvailabilityChange(newAvailability);
                                                                }}
                                                                className={cn(
                                                                    'flex-1 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-1',
                                                                    sessionAvailability.status === 'available'
                                                                        ? 'bg-[var(--success)] text-[var(--canvas)] hover:brightness-95'
                                                                        : 'bg-[color:var(--success)]/10 text-[var(--success)] hover:bg-[color:var(--success)]/15'
                                                                )}
                                                            >
                                                                <Check className="w-4 h-4" />
                                                                Yes
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    const newAvailability = availability.map(a =>
                                                                        a.sessionId === session.id
                                                                            ? { ...a, status: 'maybe' as const }
                                                                            : a
                                                                    );
                                                                    setAvailability(newAvailability);
                                                                    onAvailabilityChange(newAvailability);
                                                                }}
                                                                className={cn(
                                                                    'flex-1 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-1',
                                                                    sessionAvailability.status === 'maybe'
                                                                        ? 'bg-[var(--warning)] text-[var(--canvas)] hover:brightness-95'
                                                                        : 'bg-[color:var(--warning)]/10 text-[var(--warning)] hover:bg-[color:var(--warning)]/15'
                                                                )}
                                                            >
                                                                <HelpCircle className="w-4 h-4" />
                                                                Maybe
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    const newAvailability = availability.map(a =>
                                                                        a.sessionId === session.id
                                                                            ? { ...a, status: 'unavailable' as const }
                                                                            : a
                                                                    );
                                                                    setAvailability(newAvailability);
                                                                    onAvailabilityChange(newAvailability);
                                                                }}
                                                                className={cn(
                                                                    'flex-1 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-1',
                                                                    sessionAvailability.status === 'unavailable'
                                                                        ? 'bg-[var(--error)] text-[var(--canvas)] hover:brightness-95'
                                                                        : 'bg-[color:var(--error)]/10 text-[var(--error)] hover:bg-[color:var(--error)]/15'
                                                                )}
                                                            >
                                                                <X className="w-4 h-4" />
                                                                No
                                                            </button>
                                                        </div>

                                                        {/* Optional Note */}
                                                        {sessionAvailability.status !== 'available' && (
                                                            <button
                                                                onClick={() => setNoteModal({
                                                                    sessionId: session.id,
                                                                    note: sessionAvailability.note || '',
                                                                })}
                                                                className="w-full mt-2 py-2 text-xs text-[var(--ink-tertiary)] hover:text-[var(--ink-secondary)] transition-colors flex items-center justify-center gap-1"
                                                            >
                                                                <AlertCircle className="w-3.5 h-3.5" />
                                                                {sessionAvailability.note
                                                                    ? `Note: ${sessionAvailability.note}`
                                                                    : 'Add a note (optional)'}
                                                            </button>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    );
                })}
            </div>

            {/* Note Modal */}
            <AnimatePresence>
                {noteModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-[color:var(--ink)]/50 backdrop-blur-sm p-4"
                        onClick={() => setNoteModal(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-[var(--surface-raised)] rounded-2xl w-full max-w-sm overflow-hidden shadow-xl border border-[var(--rule)]"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="p-4 border-b border-[var(--rule)]">
                                <h3 className="font-semibold text-[var(--ink-primary)]">
                                    Add a Note
                                </h3>
                                <p className="text-sm text-[var(--ink-secondary)]">
                                    Let the captain know why
                                </p>
                            </div>
                            <div className="p-4">
                                <textarea
                                    value={noteModal.note}
                                    onChange={(e) => setNoteModal({ ...noteModal, note: e.target.value })}
                                    placeholder="e.g., Flight arrives at 2pm"
                                    rows={3}
                                    className="w-full p-3 rounded-xl border border-[var(--rule)] bg-[var(--surface-secondary)] text-[var(--ink-primary)] placeholder:text-[var(--ink-tertiary)] focus:outline-none focus:ring-2 focus:ring-[color:var(--masters)]/30 ring-offset-2 ring-offset-[color:var(--canvas)]"
                                    autoFocus
                                />
                            </div>
                            <div className="flex gap-2 p-4 border-t border-[var(--rule)]">
                                <button
                                    onClick={() => setNoteModal(null)}
                                    className="flex-1 py-2.5 rounded-lg border border-[var(--rule)] text-[var(--ink-secondary)] font-medium hover:bg-[var(--surface-secondary)] transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => updateNote(noteModal.sessionId, noteModal.note)}
                                    className="flex-1 py-2.5 rounded-lg bg-[var(--masters)] text-[var(--canvas)] font-medium hover:bg-[color:var(--masters)]/90 transition-colors"
                                >
                                    Save Note
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export default AvailabilityCalendar;
