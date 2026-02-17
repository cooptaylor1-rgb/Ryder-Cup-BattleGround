/**
 * Attendance Check-In Component
 *
 * Roll call system for tracking player arrivals before a round.
 * Captains need to know who's at the course and who's missing.
 *
 * Features:
 * - Quick tap to mark arrived
 * - Visual status indicators
 * - ETA for players en route
 * - Auto-alert for no-shows
 * - Last seen/check-in time
 * - One-tap call/text missing players
 * - Group by team or tee time
 */

'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    CheckCircle2,
    Circle,
    Clock,
    AlertTriangle,
    Phone,
    MessageSquare,
    RefreshCw,
    Search,
    ChevronDown,
    X,
    UserCheck,
    UserX,
    Car,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================
// TYPES
// ============================================

export type AttendanceStatus = 'checked-in' | 'en-route' | 'not-arrived' | 'no-show';

export interface AttendeePlayer {
    id: string;
    firstName: string;
    lastName: string;
    teamId: 'A' | 'B';
    handicapIndex: number;
    phone?: string;
    email?: string;
    avatarUrl?: string;
    status: AttendanceStatus;
    checkInTime?: string;
    eta?: string; // Estimated arrival time
    lastLocation?: string; // "5 min away", "At parking lot", etc.
    matchId?: string;
    teeTime?: string;
}

export interface AttendanceStats {
    total: number;
    checkedIn: number;
    enRoute: number;
    notArrived: number;
    noShow: number;
}

interface AttendanceCheckInProps {
    players: AttendeePlayer[];
    onUpdateStatus: (playerId: string, status: AttendanceStatus, eta?: string) => void;
    onCall?: (playerId: string) => void;
    onText?: (playerId: string) => void;
    onRefresh?: () => void;
    sessionName?: string;
    firstTeeTime?: string;
    className?: string;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function getStatusConfig(status: AttendanceStatus) {
    switch (status) {
        case 'checked-in':
            return {
                label: 'Checked In',
                className: 'bg-[color:var(--success)]/15 text-[var(--success)] ring-[var(--success)]',
                icon: CheckCircle2,
            };
        case 'en-route':
            return {
                label: 'En Route',
                className: 'bg-[color:var(--warning)]/15 text-[var(--warning)] ring-[var(--warning)]',
                icon: Car,
            };
        case 'not-arrived':
            return {
                label: 'Not Arrived',
                className: 'bg-[color:var(--ink)]/15 text-[var(--ink-secondary)] ring-[var(--ink-secondary)]',
                icon: Circle,
            };
        case 'no-show':
            return {
                label: 'No Show',
                className: 'bg-[color:var(--error)]/15 text-[var(--error)] ring-[var(--error)]',
                icon: AlertTriangle,
            };
    }
}

function getTimeUntil(targetTime: string): string {
    const now = new Date();
    const target = new Date();
    const [hours, minutes] = targetTime.split(':').map(Number);
    target.setHours(hours, minutes, 0, 0);

    const diff = target.getTime() - now.getTime();
    if (diff <= 0) return 'Now';

    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    return `${hrs}h ${mins % 60}m`;
}

// ============================================
// ATTENDANCE CHECK-IN
// ============================================

export function AttendanceCheckIn({
    players,
    onUpdateStatus,
    onCall,
    onText,
    onRefresh,
    sessionName = 'Today\'s Session',
    firstTeeTime,
    className,
}: AttendanceCheckInProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState<AttendanceStatus | 'all'>('all');
    const [sortBy, _setSortBy] = useState<'name' | 'team' | 'teeTime' | 'status'>('status');
    const [selectedPlayer, setSelectedPlayer] = useState<AttendeePlayer | null>(null);
    const [showETAModal, setShowETAModal] = useState(false);

    // Calculate stats
    const stats: AttendanceStats = useMemo(() => {
        return {
            total: players.length,
            checkedIn: players.filter(p => p.status === 'checked-in').length,
            enRoute: players.filter(p => p.status === 'en-route').length,
            notArrived: players.filter(p => p.status === 'not-arrived').length,
            noShow: players.filter(p => p.status === 'no-show').length,
        };
    }, [players]);

    // Filter and sort players
    const filteredPlayers = useMemo(() => {
        let result = [...players];

        // Search filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter(p =>
                `${p.firstName} ${p.lastName}`.toLowerCase().includes(query)
            );
        }

        // Status filter
        if (filterStatus !== 'all') {
            result = result.filter(p => p.status === filterStatus);
        }

        // Sort
        result.sort((a, b) => {
            switch (sortBy) {
                case 'name':
                    return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
                case 'team':
                    return a.teamId.localeCompare(b.teamId);
                case 'teeTime':
                    return (a.teeTime || 'ZZZ').localeCompare(b.teeTime || 'ZZZ');
                case 'status':
                    const statusOrder = { 'no-show': 0, 'not-arrived': 1, 'en-route': 2, 'checked-in': 3 };
                    return statusOrder[a.status] - statusOrder[b.status];
                default:
                    return 0;
            }
        });

        return result;
    }, [players, searchQuery, filterStatus, sortBy]);

    // Group by team
    const groupedByTeam = useMemo(() => {
        const teamA = filteredPlayers.filter(p => p.teamId === 'A');
        const teamB = filteredPlayers.filter(p => p.teamId === 'B');
        return { teamA, teamB };
    }, [filteredPlayers]);

    const handleQuickCheckIn = (player: AttendeePlayer) => {
        if (player.status === 'checked-in') {
            // Toggle back to not arrived
            onUpdateStatus(player.id, 'not-arrived');
        } else {
            onUpdateStatus(player.id, 'checked-in');
        }
    };

    const handleSetETA = (playerId: string, eta: string) => {
        onUpdateStatus(playerId, 'en-route', eta);
        setShowETAModal(false);
        setSelectedPlayer(null);
    };

    const handleMarkNoShow = (playerId: string) => {
        onUpdateStatus(playerId, 'no-show');
    };

    // Progress percentage
    const progressPercent = (stats.checkedIn / stats.total) * 100;

    return (
        <div className={cn('flex flex-col', className)}>
            {/* Header */}
            <div className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-semibold" style={{ color: 'var(--ink)' }}>
                            Attendance Check-In
                        </h2>
                        <p className="text-sm" style={{ color: 'var(--ink-muted)' }}>
                            {sessionName}
                            {firstTeeTime && (
                                <span className="ml-2">
                                    • First tee in <span className="font-medium" style={{ color: 'var(--masters)' }}>{getTimeUntil(firstTeeTime)}</span>
                                </span>
                            )}
                        </p>
                    </div>
                    {onRefresh && (
                        <button
                            onClick={onRefresh}
                            className="p-2 rounded-lg hover:bg-[color:var(--ink)]/6 transition-colors"
                        >
                            <RefreshCw className="w-5 h-5" style={{ color: 'var(--ink-muted)' }} />
                        </button>
                    )}
                </div>

                {/* Progress Bar */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                        <span style={{ color: 'var(--ink-muted)' }}>
                            {stats.checkedIn} of {stats.total} checked in
                        </span>
                        <span className="font-medium" style={{ color: progressPercent === 100 ? '#22c55e' : 'var(--ink)' }}>
                            {progressPercent.toFixed(0)}%
                        </span>
                    </div>
                    <div
                        className="h-2 rounded-full overflow-hidden"
                        style={{ background: 'var(--surface)' }}
                    >
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${progressPercent}%` }}
                            transition={{ duration: 0.5, ease: 'easeOut' }}
                            className="h-full rounded-full"
                            style={{ background: progressPercent === 100 ? '#22c55e' : 'var(--masters)' }}
                        />
                    </div>
                </div>

                {/* Stats Pills */}
                <div className="flex flex-wrap gap-2">
                    {[
                        { status: 'checked-in' as const, count: stats.checkedIn },
                        { status: 'en-route' as const, count: stats.enRoute },
                        { status: 'not-arrived' as const, count: stats.notArrived },
                        { status: 'no-show' as const, count: stats.noShow },
                    ].map(({ status, count }) => {
                        const config = getStatusConfig(status);
                        const isActive = filterStatus === status;
                        return (
                            <button
                                key={status}
                                onClick={() => setFilterStatus(isActive ? 'all' : status)}
                                className={cn(
                                    'px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-1.5 transition-all',
                                    isActive ? 'ring-2' : '',
                                    config.className
                                )}
                            >
                                <config.icon className="w-3.5 h-3.5" />
                                {count}
                            </button>
                        );
                    })}
                </div>

                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--ink-muted)' }} />
                    <input
                        type="text"
                        placeholder="Search players..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm"
                        style={{
                            background: 'var(--surface)',
                            border: '1px solid rgba(128, 120, 104, 0.2)',
                            color: 'var(--ink)',
                        }}
                    />
                </div>
            </div>

            {/* Player List */}
            <div className="flex-1 overflow-y-auto px-4 pb-4">
                {/* Team A */}
                <div className="mb-4">
                    <div className="flex items-center gap-2 mb-2 sticky top-0 py-1 bg-[var(--canvas)]">
                        <span className="w-3 h-3 rounded-full bg-[color:var(--team-usa)]" />
                        <span className="text-sm font-medium" style={{ color: 'var(--ink-muted)' }}>
                            Team A ({groupedByTeam.teamA.filter(p => p.status === 'checked-in').length}/{groupedByTeam.teamA.length})
                        </span>
                    </div>
                    <div className="space-y-2">
                        {groupedByTeam.teamA.map(player => (
                            <PlayerCheckInCard
                                key={player.id}
                                player={player}
                                onQuickCheckIn={() => handleQuickCheckIn(player)}
                                onSetETA={() => {
                                    setSelectedPlayer(player);
                                    setShowETAModal(true);
                                }}
                                onMarkNoShow={() => handleMarkNoShow(player.id)}
                                onCall={onCall ? () => onCall(player.id) : undefined}
                                onText={onText ? () => onText(player.id) : undefined}
                            />
                        ))}
                    </div>
                </div>

                {/* Team B */}
                <div>
                    <div className="flex items-center gap-2 mb-2 sticky top-0 py-1 bg-[var(--canvas)]">
                        <span className="w-3 h-3 rounded-full bg-[color:var(--team-europe)]" />
                        <span className="text-sm font-medium" style={{ color: 'var(--ink-muted)' }}>
                            Team B ({groupedByTeam.teamB.filter(p => p.status === 'checked-in').length}/{groupedByTeam.teamB.length})
                        </span>
                    </div>
                    <div className="space-y-2">
                        {groupedByTeam.teamB.map(player => (
                            <PlayerCheckInCard
                                key={player.id}
                                player={player}
                                onQuickCheckIn={() => handleQuickCheckIn(player)}
                                onSetETA={() => {
                                    setSelectedPlayer(player);
                                    setShowETAModal(true);
                                }}
                                onMarkNoShow={() => handleMarkNoShow(player.id)}
                                onCall={onCall ? () => onCall(player.id) : undefined}
                                onText={onText ? () => onText(player.id) : undefined}
                            />
                        ))}
                    </div>
                </div>
            </div>

            {/* ETA Modal */}
            <AnimatePresence>
                {showETAModal && selectedPlayer && (
                    <ETAModal
                        player={selectedPlayer}
                        onSetETA={(eta) => handleSetETA(selectedPlayer.id, eta)}
                        onClose={() => {
                            setShowETAModal(false);
                            setSelectedPlayer(null);
                        }}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}

// ============================================
// PLAYER CARD
// ============================================

interface PlayerCheckInCardProps {
    player: AttendeePlayer;
    onQuickCheckIn: () => void;
    onSetETA: () => void;
    onMarkNoShow: () => void;
    onCall?: () => void;
    onText?: () => void;
}

function PlayerCheckInCard({
    player,
    onQuickCheckIn,
    onSetETA,
    onMarkNoShow,
    onCall,
    onText,
}: PlayerCheckInCardProps) {
    const [expanded, setExpanded] = useState(false);
    const statusConfig = getStatusConfig(player.status);
    const StatusIcon = statusConfig.icon;

    return (
        <motion.div
            layout
            className="rounded-xl overflow-hidden"
            style={{ background: 'var(--surface)', border: '1px solid rgba(128, 120, 104, 0.2)' }}
        >
            {/* Main Row */}
            <div
                className="p-3 flex items-center gap-3 cursor-pointer"
                onClick={() => setExpanded(!expanded)}
            >
                {/* Quick Check-In Button */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onQuickCheckIn();
                    }}
                    className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center transition-colors",
                        statusConfig.className
                    )}
                >
                    <StatusIcon className="w-5 h-5" />
                </button>

                {/* Player Info */}
                <div className="flex-1 min-w-0">
                    <p className="font-medium truncate" style={{ color: 'var(--ink)' }}>
                        {player.firstName} {player.lastName}
                    </p>
                    <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--ink-muted)' }}>
                        <span className={statusConfig.className.split(' ').filter(c => c.startsWith('text-')).join(' ')}>
                            {statusConfig.label}
                        </span>
                        {player.eta && player.status === 'en-route' && (
                            <span>• ETA {player.eta}</span>
                        )}
                        {player.teeTime && (
                            <span>• Tee {player.teeTime}</span>
                        )}
                    </div>
                </div>

                {/* Expand Indicator */}
                <ChevronDown
                    className={cn('w-5 h-5 transition-transform', expanded && 'rotate-180')}
                    style={{ color: 'var(--ink-muted)' }}
                />
            </div>

            {/* Expanded Actions */}
            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        <div
                            className="px-3 pb-3 pt-1 flex flex-wrap gap-2 border-t"
                            style={{ borderColor: 'rgba(128, 120, 104, 0.1)' }}
                        >
                            {player.status !== 'checked-in' && (
                                <button
                                    onClick={onQuickCheckIn}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors bg-[color:var(--success)]/15 text-[var(--success)]"
                                >
                                    <UserCheck className="w-4 h-4" />
                                    Check In
                                </button>
                            )}

                            {player.status === 'not-arrived' && (
                                <button
                                    onClick={onSetETA}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors bg-[color:var(--warning)]/15 text-[var(--warning)]"
                                >
                                    <Clock className="w-4 h-4" />
                                    Set ETA
                                </button>
                            )}

                            {player.status !== 'no-show' && player.status !== 'checked-in' && (
                                <button
                                    onClick={onMarkNoShow}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors bg-[color:var(--error)]/15 text-[var(--error)]"
                                >
                                    <UserX className="w-4 h-4" />
                                    No Show
                                </button>
                            )}

                            {onCall && player.phone && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onCall();
                                    }}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors hover:bg-[color:var(--ink)]/6"
                                    style={{ background: 'var(--surface-raised)', color: 'var(--ink)' }}
                                >
                                    <Phone className="w-4 h-4" />
                                    Call
                                </button>
                            )}

                            {onText && player.phone && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onText();
                                    }}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors hover:bg-[color:var(--ink)]/6"
                                    style={{ background: 'var(--surface-raised)', color: 'var(--ink)' }}
                                >
                                    <MessageSquare className="w-4 h-4" />
                                    Text
                                </button>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

// ============================================
// ETA MODAL
// ============================================

interface ETAModalProps {
    player: AttendeePlayer;
    onSetETA: (eta: string) => void;
    onClose: () => void;
}

const ETA_OPTIONS = [
    { value: '5 min', label: '5 minutes' },
    { value: '10 min', label: '10 minutes' },
    { value: '15 min', label: '15 minutes' },
    { value: '20 min', label: '20 minutes' },
    { value: '30 min', label: '30 minutes' },
    { value: '45 min', label: '45 minutes' },
    { value: '1 hour', label: '1 hour' },
];

function ETAModal({ player, onSetETA, onClose }: ETAModalProps) {
    const [customETA, setCustomETA] = useState('');

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-[color:var(--ink)]/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="relative w-full max-w-sm rounded-2xl overflow-hidden bg-[var(--canvas)]"
            >
                <div className="p-4 border-b" style={{ borderColor: 'rgba(128, 120, 104, 0.2)' }}>
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="font-semibold" style={{ color: 'var(--ink)' }}>
                                Set Arrival Time
                            </h3>
                            <p className="text-sm" style={{ color: 'var(--ink-muted)' }}>
                                {player.firstName} {player.lastName}
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-lg hover:bg-[color:var(--ink)]/6 transition-colors"
                        >
                            <X className="w-5 h-5" style={{ color: 'var(--ink-muted)' }} />
                        </button>
                    </div>
                </div>

                <div className="p-4 space-y-3">
                    {ETA_OPTIONS.map(option => (
                        <button
                            key={option.value}
                            onClick={() => onSetETA(option.value)}
                            className="w-full p-3 rounded-xl text-left hover:bg-[color:var(--ink)]/3 transition-colors"
                            style={{ background: 'var(--surface)', border: '1px solid rgba(128, 120, 104, 0.2)' }}
                        >
                            <span style={{ color: 'var(--ink)' }}>{option.label}</span>
                        </button>
                    ))}

                    {/* Custom ETA */}
                    <div className="pt-2">
                        <label className="text-sm font-medium" style={{ color: 'var(--ink-muted)' }}>
                            Custom time
                        </label>
                        <div className="flex gap-2 mt-1">
                            <input
                                type="text"
                                placeholder="e.g., 8:45 AM"
                                value={customETA}
                                onChange={(e) => setCustomETA(e.target.value)}
                                className="flex-1 px-3 py-2 rounded-lg text-sm"
                                style={{
                                    background: 'var(--surface)',
                                    border: '1px solid rgba(128, 120, 104, 0.2)',
                                    color: 'var(--ink)',
                                }}
                            />
                            <button
                                onClick={() => customETA && onSetETA(customETA)}
                                disabled={!customETA}
                                className="px-4 py-2 rounded-lg font-medium text-sm disabled:opacity-50 transition-colors"
                                style={{ background: 'var(--masters)', color: '#000' }}
                            >
                                Set
                            </button>
                        </div>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
}

export default AttendanceCheckIn;
