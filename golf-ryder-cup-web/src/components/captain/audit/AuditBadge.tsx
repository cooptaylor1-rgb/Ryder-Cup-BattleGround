/**
 * AuditBadge Component — Phase 2: Captain Empowerment
 *
 * Visual indicator for modified scores:
 * - Shows when a score has been overridden
 * - Hover/tap to see audit details
 * - Color-coded by override recency
 * - Links to full audit history
 *
 * Maintains transparency while keeping UI clean.
 */

'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Edit3, History, Shield, Clock, User, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useHaptic } from '@/lib/hooks';

// ============================================
// TYPES
// ============================================

export interface AuditInfo {
    hasOverrides: boolean;
    overrideCount: number;
    lastOverride?: {
        timestamp: string;
        userName: string;
        reason: string;
        previousValue: string;
        newValue: string;
    };
    allOverrides?: {
        id: string;
        timestamp: string;
        userName: string;
        reason: string;
        previousValue: string;
        newValue: string;
    }[];
}

interface AuditBadgeProps {
    auditInfo: AuditInfo;
    size?: 'sm' | 'md' | 'lg';
    position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'inline';
    onViewHistory?: () => void;
    className?: string;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function formatTimeAgo(isoString: string): string {
    const now = new Date();
    const then = new Date(isoString);
    const diffMs = now.getTime() - then.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
}

function getRecencyColor(isoString: string): string {
    const now = new Date();
    const then = new Date(isoString);
    const diffMs = now.getTime() - then.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    if (diffHours < 1) return '#F59E0B'; // Amber - very recent
    if (diffHours < 24) return '#3B82F6'; // Blue - today
    return '#6B7280'; // Gray - older
}

function formatReason(reason: string): string {
    const reasonMap: Record<string, string> = {
        scoring_error: 'Scoring Error',
        wrong_player: 'Wrong Player',
        wrong_hole: 'Wrong Hole',
        dispute_resolution: 'Dispute',
        late_entry: 'Late Entry',
        system_error: 'System Error',
        handicap_adjustment: 'Handicap Adj.',
        other: 'Other',
    };
    return reasonMap[reason] || reason;
}

// ============================================
// AUDIT TOOLTIP
// ============================================

interface AuditTooltipProps {
    auditInfo: AuditInfo;
    onViewHistory?: () => void;
    onClose: () => void;
}

function AuditTooltip({ auditInfo, onViewHistory, onClose }: AuditTooltipProps) {
    const haptic = useHaptic();
    const tooltipRef = useRef<HTMLDivElement>(null);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (tooltipRef.current && !tooltipRef.current.contains(e.target as Node)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose]);

    const lastOverride = auditInfo.lastOverride;
    if (!lastOverride) return null;

    return (
        <motion.div
            ref={tooltipRef}
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            className="absolute z-50 min-w-[220px] p-3 rounded-xl shadow-lg"
            style={{
                background: 'var(--surface)',
                border: '1px solid var(--rule)',
                top: 'calc(100% + 8px)',
                right: 0,
            }}
        >
            {/* Header */}
            <div className="flex items-center gap-2 mb-2">
                <Shield size={14} style={{ color: '#F59E0B' }} />
                <span className="text-xs font-semibold" style={{ color: '#F59E0B' }}>
                    Score Modified
                </span>
            </div>

            {/* Last Override Details */}
            <div className="space-y-2 mb-3">
                <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase" style={{ color: 'var(--ink-tertiary)' }}>
                        Reason
                    </span>
                    <span className="text-xs font-medium" style={{ color: 'var(--ink)' }}>
                        {formatReason(lastOverride.reason)}
                    </span>
                </div>

                <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase" style={{ color: 'var(--ink-tertiary)' }}>
                        Change
                    </span>
                    <div className="flex items-center gap-1 text-xs">
                        <span className="line-through" style={{ color: 'var(--ink-tertiary)' }}>
                            {lastOverride.previousValue}
                        </span>
                        <span>→</span>
                        <span className="font-medium" style={{ color: 'var(--ink)' }}>
                            {lastOverride.newValue}
                        </span>
                    </div>
                </div>

                <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase" style={{ color: 'var(--ink-tertiary)' }}>
                        By
                    </span>
                    <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--ink-secondary)' }}>
                        <User size={10} />
                        {lastOverride.userName}
                    </div>
                </div>

                <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase" style={{ color: 'var(--ink-tertiary)' }}>
                        When
                    </span>
                    <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--ink-secondary)' }}>
                        <Clock size={10} />
                        {formatTimeAgo(lastOverride.timestamp)}
                    </div>
                </div>
            </div>

            {/* View History Button */}
            {onViewHistory && auditInfo.overrideCount > 1 && (
                <button
                    onClick={() => {
                        haptic.tap();
                        onViewHistory();
                        onClose();
                    }}
                    className="w-full flex items-center justify-between p-2 rounded-lg text-xs font-medium"
                    style={{ background: 'var(--rule)', color: 'var(--ink-secondary)' }}
                >
                    <div className="flex items-center gap-1.5">
                        <History size={12} />
                        View all {auditInfo.overrideCount} changes
                    </div>
                    <ChevronRight size={12} />
                </button>
            )}
        </motion.div>
    );
}

// ============================================
// MAIN AUDIT BADGE
// ============================================

export function AuditBadge({
    auditInfo,
    size = 'sm',
    position = 'top-right',
    onViewHistory,
    className,
}: AuditBadgeProps) {
    const haptic = useHaptic();
    const [showTooltip, setShowTooltip] = useState(false);

    if (!auditInfo.hasOverrides) return null;

    const sizeClasses = {
        sm: 'w-4 h-4 text-[8px]',
        md: 'w-5 h-5 text-[10px]',
        lg: 'w-6 h-6 text-xs',
    };

    const positionClasses = {
        'top-right': 'absolute -top-1 -right-1',
        'top-left': 'absolute -top-1 -left-1',
        'bottom-right': 'absolute -bottom-1 -right-1',
        'bottom-left': 'absolute -bottom-1 -left-1',
        inline: 'relative',
    };

    const iconSize = size === 'sm' ? 8 : size === 'md' ? 10 : 12;
    const recencyColor = auditInfo.lastOverride
        ? getRecencyColor(auditInfo.lastOverride.timestamp)
        : '#6B7280';

    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        haptic.tap();
        setShowTooltip(!showTooltip);
    };

    return (
        <div className={cn(positionClasses[position], 'z-10', className)}>
            <motion.button
                onClick={handleClick}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                className={cn(
                    'rounded-full flex items-center justify-center font-bold',
                    sizeClasses[size]
                )}
                style={{
                    background: recencyColor,
                    color: 'white',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                }}
            >
                {auditInfo.overrideCount > 1 ? (
                    auditInfo.overrideCount
                ) : (
                    <Edit3 size={iconSize} />
                )}
            </motion.button>

            <AnimatePresence>
                {showTooltip && (
                    <AuditTooltip
                        auditInfo={auditInfo}
                        onViewHistory={onViewHistory}
                        onClose={() => setShowTooltip(false)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}

// ============================================
// INLINE AUDIT INDICATOR
// ============================================

interface InlineAuditIndicatorProps {
    auditInfo: AuditInfo;
    onViewHistory?: () => void;
}

export function InlineAuditIndicator({ auditInfo, onViewHistory }: InlineAuditIndicatorProps) {
    const haptic = useHaptic();

    if (!auditInfo.hasOverrides || !auditInfo.lastOverride) return null;

    const recencyColor = getRecencyColor(auditInfo.lastOverride.timestamp);

    return (
        <button
            onClick={() => {
                haptic.tap();
                onViewHistory?.();
            }}
            className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors hover:opacity-80"
            style={{ background: `${recencyColor}20`, color: recencyColor }}
        >
            <Edit3 size={10} />
            Modified {formatTimeAgo(auditInfo.lastOverride.timestamp)}
        </button>
    );
}

// ============================================
// AUDIT HISTORY LIST
// ============================================

interface AuditHistoryListProps {
    overrides: AuditInfo['allOverrides'];
    className?: string;
}

export function AuditHistoryList({ overrides, className }: AuditHistoryListProps) {
    if (!overrides || overrides.length === 0) return null;

    return (
        <div className={cn('space-y-2', className)}>
            {overrides.map((override) => (
                <div
                    key={override.id}
                    className="p-3 rounded-lg"
                    style={{ background: 'var(--surface)' }}
                >
                    <div className="flex items-center justify-between mb-2">
                        <span
                            className="text-xs font-medium px-2 py-0.5 rounded-full"
                            style={{
                                background: `${getRecencyColor(override.timestamp)}20`,
                                color: getRecencyColor(override.timestamp),
                            }}
                        >
                            {formatReason(override.reason)}
                        </span>
                        <span className="text-[10px]" style={{ color: 'var(--ink-tertiary)' }}>
                            {formatTimeAgo(override.timestamp)}
                        </span>
                    </div>

                    <div className="flex items-center gap-2 text-sm">
                        <span className="line-through" style={{ color: 'var(--ink-tertiary)' }}>
                            {override.previousValue}
                        </span>
                        <span style={{ color: 'var(--ink-tertiary)' }}>→</span>
                        <span className="font-medium" style={{ color: 'var(--ink)' }}>
                            {override.newValue}
                        </span>
                    </div>

                    <div className="flex items-center gap-1 mt-1 text-[10px]" style={{ color: 'var(--ink-tertiary)' }}>
                        <User size={10} />
                        {override.userName}
                    </div>
                </div>
            ))}
        </div>
    );
}

export default AuditBadge;
