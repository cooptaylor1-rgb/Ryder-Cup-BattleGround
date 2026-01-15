/**
 * AlertCenter Component — Phase 2: Captain Empowerment
 *
 * Centralized notification hub for captains:
 * - Missing score alerts
 * - Score dispute notifications
 * - Player issues (late, absent, needs ride)
 * - System alerts (sync issues, etc.)
 * - Quick action buttons for resolution
 *
 * Priority-ranked with dismissal and action tracking.
 */

'use client';

import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Bell,
    AlertTriangle,
    AlertCircle,
    Info,
    CheckCircle2,
    X,
    ChevronRight,
    Clock,
    User,
    Users,
    MessageSquare,
    Flag,
    Edit3,
    Eye,
    RefreshCw,
    MapPin,
    Phone,
    Ban,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useHaptic } from '@/lib/hooks';

// ============================================
// TYPES
// ============================================

export type AlertPriority = 'critical' | 'high' | 'medium' | 'low';
export type AlertCategory = 'score' | 'player' | 'match' | 'system';
export type AlertStatus = 'pending' | 'acknowledged' | 'resolved' | 'dismissed';

export interface CaptainAlert {
    id: string;
    category: AlertCategory;
    priority: AlertPriority;
    status: AlertStatus;
    title: string;
    description: string;
    createdAt: string;
    expiresAt?: string;
    acknowledgedAt?: string;
    resolvedAt?: string;

    // Context
    matchId?: string;
    matchNumber?: number;
    playerId?: string;
    playerName?: string;

    // Actions
    primaryAction?: {
        label: string;
        action: string; // Action key
    };
    secondaryAction?: {
        label: string;
        action: string;
    };
}

interface AlertCenterProps {
    alerts: CaptainAlert[];
    onDismiss?: (alertId: string) => void;
    onAcknowledge?: (alertId: string) => void;
    onAction?: (alertId: string, action: string) => void;
    onRefresh?: () => void;
    isLoading?: boolean;
    className?: string;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function getPriorityConfig(priority: AlertPriority) {
    switch (priority) {
        case 'critical':
            return {
                color: '#EF4444',
                bgColor: 'rgba(239, 68, 68, 0.1)',
                icon: AlertTriangle,
                label: 'Critical',
                weight: 4,
            };
        case 'high':
            return {
                color: '#F59E0B',
                bgColor: 'rgba(245, 158, 11, 0.1)',
                icon: AlertCircle,
                label: 'High',
                weight: 3,
            };
        case 'medium':
            return {
                color: '#3B82F6',
                bgColor: 'rgba(59, 130, 246, 0.1)',
                icon: Info,
                label: 'Medium',
                weight: 2,
            };
        case 'low':
            return {
                color: '#6B7280',
                bgColor: 'rgba(107, 114, 128, 0.1)',
                icon: Info,
                label: 'Low',
                weight: 1,
            };
    }
}

function getCategoryConfig(category: AlertCategory) {
    switch (category) {
        case 'score':
            return { icon: Edit3, label: 'Score' };
        case 'player':
            return { icon: User, label: 'Player' };
        case 'match':
            return { icon: Flag, label: 'Match' };
        case 'system':
            return { icon: RefreshCw, label: 'System' };
    }
}

function formatTimeAgo(isoString: string): string {
    const now = new Date();
    const then = new Date(isoString);
    const diffMs = now.getTime() - then.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
}

// ============================================
// ALERT CARD COMPONENT
// ============================================

interface AlertCardProps {
    alert: CaptainAlert;
    onDismiss: () => void;
    onAcknowledge: () => void;
    onPrimaryAction?: () => void;
    onSecondaryAction?: () => void;
}

function AlertCard({
    alert,
    onDismiss,
    onAcknowledge,
    onPrimaryAction,
    onSecondaryAction,
}: AlertCardProps) {
    const haptic = useHaptic();
    const priorityConfig = getPriorityConfig(alert.priority);
    const categoryConfig = getCategoryConfig(alert.category);

    const handleDismiss = (e: React.MouseEvent) => {
        e.stopPropagation();
        haptic.tap();
        onDismiss();
    };

    const handleAcknowledge = () => {
        haptic.tap();
        onAcknowledge();
    };

    const handlePrimary = (e: React.MouseEvent) => {
        e.stopPropagation();
        haptic.medium();
        onPrimaryAction?.();
    };

    const handleSecondary = (e: React.MouseEvent) => {
        e.stopPropagation();
        haptic.tap();
        onSecondaryAction?.();
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: -100, scale: 0.9 }}
            whileHover={{ scale: 1.01 }}
            onClick={handleAcknowledge}
            className={cn(
                'relative p-4 rounded-xl cursor-pointer transition-all overflow-hidden',
                alert.status === 'acknowledged' && 'opacity-70'
            )}
            style={{
                background: 'var(--surface)',
                borderLeft: `4px solid ${priorityConfig.color}`,
            }}
        >
            {/* Priority Pulse for Critical */}
            {alert.priority === 'critical' && alert.status === 'pending' && (
                <motion.div
                    className="absolute inset-0"
                    style={{ background: priorityConfig.bgColor }}
                    animate={{ opacity: [0.5, 0.2, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity }}
                />
            )}

            <div className="relative">
                {/* Header */}
                <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2">
                        {/* Priority Icon */}
                        <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center"
                            style={{ background: priorityConfig.bgColor }}
                        >
                            <priorityConfig.icon size={16} style={{ color: priorityConfig.color }} />
                        </div>

                        {/* Title and Category */}
                        <div>
                            <h4 className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
                                {alert.title}
                            </h4>
                            <div className="flex items-center gap-2">
                                <span
                                    className="text-[10px] px-1.5 py-0.5 rounded-full uppercase"
                                    style={{ background: 'var(--rule)', color: 'var(--ink-tertiary)' }}
                                >
                                    {categoryConfig.label}
                                </span>
                                <span className="text-[10px]" style={{ color: 'var(--ink-tertiary)' }}>
                                    {formatTimeAgo(alert.createdAt)}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Dismiss Button */}
                    <button
                        onClick={handleDismiss}
                        className="p-1.5 rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
                    >
                        <X size={14} style={{ color: 'var(--ink-tertiary)' }} />
                    </button>
                </div>

                {/* Description */}
                <p className="text-sm mb-3 ml-10" style={{ color: 'var(--ink-secondary)' }}>
                    {alert.description}
                </p>

                {/* Context Badges */}
                <div className="flex items-center gap-2 mb-3 ml-10">
                    {alert.matchNumber && (
                        <span
                            className="text-xs px-2 py-1 rounded-full flex items-center gap-1"
                            style={{ background: 'var(--rule)', color: 'var(--ink-secondary)' }}
                        >
                            <Flag size={10} />
                            Match {alert.matchNumber}
                        </span>
                    )}
                    {alert.playerName && (
                        <span
                            className="text-xs px-2 py-1 rounded-full flex items-center gap-1"
                            style={{ background: 'var(--rule)', color: 'var(--ink-secondary)' }}
                        >
                            <User size={10} />
                            {alert.playerName}
                        </span>
                    )}
                </div>

                {/* Actions */}
                {(alert.primaryAction || alert.secondaryAction) && (
                    <div className="flex items-center gap-2 ml-10">
                        {alert.primaryAction && (
                            <button
                                onClick={handlePrimary}
                                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-colors"
                                style={{ background: priorityConfig.color }}
                            >
                                {alert.primaryAction.label}
                            </button>
                        )}
                        {alert.secondaryAction && (
                            <button
                                onClick={handleSecondary}
                                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                                style={{
                                    background: 'var(--rule)',
                                    color: 'var(--ink-secondary)',
                                }}
                            >
                                {alert.secondaryAction.label}
                            </button>
                        )}
                    </div>
                )}

                {/* Status Indicator */}
                {alert.status === 'acknowledged' && (
                    <div className="absolute top-4 right-12 flex items-center gap-1 text-[10px]"
                        style={{ color: 'var(--ink-tertiary)' }}
                    >
                        <Eye size={10} />
                        Seen
                    </div>
                )}
            </div>
        </motion.div>
    );
}

// ============================================
// ALERT SUMMARY BAR
// ============================================

interface AlertSummaryBarProps {
    criticalCount: number;
    highCount: number;
    mediumCount: number;
    lowCount: number;
}

function AlertSummaryBar({
    criticalCount,
    highCount,
    mediumCount,
    lowCount,
}: AlertSummaryBarProps) {
    const total = criticalCount + highCount + mediumCount + lowCount;
    if (total === 0) return null;

    return (
        <div className="flex items-center gap-4 p-3 rounded-lg" style={{ background: 'var(--surface)' }}>
            {criticalCount > 0 && (
                <div className="flex items-center gap-1.5">
                    <AlertTriangle size={14} color="#EF4444" />
                    <span className="text-sm font-semibold" style={{ color: '#EF4444' }}>
                        {criticalCount}
                    </span>
                </div>
            )}
            {highCount > 0 && (
                <div className="flex items-center gap-1.5">
                    <AlertCircle size={14} color="#F59E0B" />
                    <span className="text-sm font-semibold" style={{ color: '#F59E0B' }}>
                        {highCount}
                    </span>
                </div>
            )}
            {mediumCount > 0 && (
                <div className="flex items-center gap-1.5">
                    <Info size={14} color="#3B82F6" />
                    <span className="text-sm font-semibold" style={{ color: '#3B82F6' }}>
                        {mediumCount}
                    </span>
                </div>
            )}
            {lowCount > 0 && (
                <div className="flex items-center gap-1.5">
                    <Info size={14} color="#6B7280" />
                    <span className="text-sm font-semibold" style={{ color: '#6B7280' }}>
                        {lowCount}
                    </span>
                </div>
            )}
            <span className="ml-auto text-xs" style={{ color: 'var(--ink-tertiary)' }}>
                {total} alert{total !== 1 ? 's' : ''}
            </span>
        </div>
    );
}

// ============================================
// EMPTY STATE
// ============================================

function EmptyAlertState() {
    return (
        <div className="text-center py-12" style={{ color: 'var(--ink-tertiary)' }}>
            <CheckCircle2 size={48} className="mx-auto mb-4 opacity-30" style={{ color: 'var(--positive)' }} />
            <p className="text-lg font-medium" style={{ color: 'var(--positive)' }}>
                All Clear!
            </p>
            <p className="text-sm">No alerts requiring attention</p>
        </div>
    );
}

// ============================================
// MAIN ALERT CENTER COMPONENT
// ============================================

export function AlertCenter({
    alerts,
    onDismiss,
    onAcknowledge,
    onAction,
    onRefresh,
    isLoading = false,
    className,
}: AlertCenterProps) {
    const haptic = useHaptic();
    const [filter, setFilter] = useState<AlertCategory | 'all'>('all');

    // Sort and filter alerts
    const { sortedAlerts, counts } = useMemo(() => {
        // Filter out resolved/dismissed
        const activeAlerts = alerts.filter(a =>
            a.status === 'pending' || a.status === 'acknowledged'
        );

        // Count by priority
        const critical = activeAlerts.filter(a => a.priority === 'critical').length;
        const high = activeAlerts.filter(a => a.priority === 'high').length;
        const medium = activeAlerts.filter(a => a.priority === 'medium').length;
        const low = activeAlerts.filter(a => a.priority === 'low').length;

        // Apply category filter
        const filtered = filter === 'all'
            ? activeAlerts
            : activeAlerts.filter(a => a.category === filter);

        // Sort by priority (critical first), then by date
        const sorted = [...filtered].sort((a, b) => {
            const priorityA = getPriorityConfig(a.priority).weight;
            const priorityB = getPriorityConfig(b.priority).weight;
            if (priorityA !== priorityB) return priorityB - priorityA;
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });

        return {
            sortedAlerts: sorted,
            counts: { critical, high, medium, low },
        };
    }, [alerts, filter]);

    const handleFilterChange = (newFilter: AlertCategory | 'all') => {
        haptic.tap();
        setFilter(newFilter);
    };

    const handleRefresh = () => {
        haptic.tap();
        onRefresh?.();
    };

    const filterOptions: { value: AlertCategory | 'all'; label: string }[] = [
        { value: 'all', label: 'All' },
        { value: 'score', label: 'Scores' },
        { value: 'player', label: 'Players' },
        { value: 'match', label: 'Matches' },
        { value: 'system', label: 'System' },
    ];

    return (
        <div className={cn('space-y-4', className)}>
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <Bell size={20} style={{ color: 'var(--masters)' }} />
                        {counts.critical > 0 && (
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                                style={{ background: '#EF4444' }}
                            >
                                {counts.critical}
                            </motion.div>
                        )}
                    </div>
                    <h2 className="text-xl font-bold" style={{ color: 'var(--ink)' }}>
                        Alert Center
                    </h2>
                </div>

                <button
                    onClick={handleRefresh}
                    disabled={isLoading}
                    className={cn(
                        'p-2 rounded-lg transition-colors',
                        isLoading && 'animate-spin'
                    )}
                    style={{ background: 'var(--surface)' }}
                >
                    <RefreshCw size={18} style={{ color: 'var(--ink-secondary)' }} />
                </button>
            </div>

            {/* Summary Bar */}
            <AlertSummaryBar {...counts} />

            {/* Filter Tabs */}
            <div className="flex items-center gap-1 p-1 rounded-lg" style={{ background: 'var(--surface)' }}>
                {filterOptions.map((opt) => (
                    <button
                        key={opt.value}
                        onClick={() => handleFilterChange(opt.value)}
                        className={cn(
                            'flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-all'
                        )}
                        style={{
                            background: filter === opt.value ? 'var(--masters)' : 'transparent',
                            color: filter === opt.value ? 'white' : 'var(--ink-secondary)',
                        }}
                    >
                        {opt.label}
                    </button>
                ))}
            </div>

            {/* Alert List */}
            <div className="space-y-3">
                <AnimatePresence mode="popLayout">
                    {sortedAlerts.length > 0 ? (
                        sortedAlerts.map((alert) => (
                            <AlertCard
                                key={alert.id}
                                alert={alert}
                                onDismiss={() => onDismiss?.(alert.id)}
                                onAcknowledge={() => onAcknowledge?.(alert.id)}
                                onPrimaryAction={
                                    alert.primaryAction
                                        ? () => onAction?.(alert.id, alert.primaryAction!.action)
                                        : undefined
                                }
                                onSecondaryAction={
                                    alert.secondaryAction
                                        ? () => onAction?.(alert.id, alert.secondaryAction!.action)
                                        : undefined
                                }
                            />
                        ))
                    ) : (
                        <EmptyAlertState />
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}

export default AlertCenter;
