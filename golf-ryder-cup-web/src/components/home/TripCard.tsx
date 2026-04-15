/**
 * TripCard
 *
 * A reusable card for a trip in the archive / tournaments lists. Exposes the
 * primary "open trip" tap target plus a secondary "..." menu for managing the
 * trip (Settings, Invite, Delete) so those actions don't have to live in a
 * deeply-nested navigation hierarchy.
 */
'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    Calendar,
    ChevronRight,
    MapPin,
    MoreVertical,
    Settings,
    Share2,
    Trash2,
    Trophy,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { useConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToastStore } from '@/lib/stores';
import { useShallow } from 'zustand/shallow';
import { shareTrip } from '@/lib/utils/share';
import { ensureTripShareCode } from '@/lib/services/tripSyncService';
import { deleteTripCascade } from '@/lib/services/cascadeDelete';
import type { Trip } from '@/lib/types/models';

export interface TripCardProps {
    trip: Trip;
    onSelect: (tripId: string) => void;
    /** If true, rendered as a more prominent card (for standalone lists). */
    emphasized?: boolean;
    className?: string;
    /**
     * Tag rendered before the trip name. Useful for distinguishing practice
     * rounds from cup trips in a mixed list.
     */
    tag?: string;
}

export const TripCard = React.memo(function TripCard({
    trip,
    onSelect,
    emphasized,
    className,
    tag,
}: TripCardProps) {
    const router = useRouter();
    const { showToast } = useToastStore(useShallow(s => ({ showToast: s.showToast })));
    const { showConfirm, ConfirmDialogComponent } = useConfirmDialog();

    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement | null>(null);

    // Close the menu on outside click or Escape.
    useEffect(() => {
        if (!menuOpen) return;
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setMenuOpen(false);
            }
        };
        const handleKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setMenuOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleKey);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKey);
        };
    }, [menuOpen]);

    const handleSettings = useCallback(() => {
        setMenuOpen(false);
        router.push(`/trip/${trip.id}/settings`);
    }, [router, trip.id]);

    const handleInvite = useCallback(async () => {
        setMenuOpen(false);
        const shareCode = await ensureTripShareCode(trip.id);
        if (!shareCode) {
            showToast('info', 'Unable to publish a trip invite right now. Check cloud sync and try again.');
            router.push('/captain/invites');
            return;
        }
        await shareTrip(trip.name, shareCode);
    }, [router, trip.id, trip.name, showToast]);

    const handleDelete = useCallback(() => {
        setMenuOpen(false);
        showConfirm({
            title: 'Delete trip?',
            message: `"${trip.name}" and all of its sessions, matches, and scores will be permanently removed. This can't be undone.`,
            confirmLabel: 'Delete trip',
            cancelLabel: 'Cancel',
            variant: 'danger',
            onConfirm: async () => {
                try {
                    await deleteTripCascade(trip.id);
                    showToast('success', 'Trip deleted');
                } catch {
                    showToast('error', 'Failed to delete trip');
                }
            },
        });
    }, [showConfirm, showToast, trip.id, trip.name]);

    return (
        <>
            {ConfirmDialogComponent}
            <div
                className={`card-editorial card-interactive border border-[var(--rule)] relative ${className ?? ''}`}
                style={{
                    padding: emphasized ? 'var(--space-5)' : 'var(--space-4)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-3)',
                    borderRadius: 'var(--radius-xl)',
                }}
            >
                <button
                    onClick={() => onSelect(trip.id)}
                    className="press-scale active:scale-[0.98]"
                    style={{
                        flex: 1,
                        minWidth: 0,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-4)',
                        background: 'transparent',
                        border: 'none',
                        padding: 0,
                        textAlign: 'left',
                        cursor: 'pointer',
                    }}
                    aria-label={`Open ${trip.name}`}
                >
                    <div
                        style={{
                            width: emphasized ? '52px' : '48px',
                            height: emphasized ? '52px' : '48px',
                            borderRadius: 'var(--radius-lg)',
                            background: 'linear-gradient(135deg, var(--masters) 0%, var(--masters-deep) 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                        }}
                    >
                        <Trophy size={emphasized ? 24 : 22} className="text-[var(--gold)]" />
                    </div>

                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-[var(--space-2)]">
                            {tag ? (
                                <span className="inline-block rounded-full border border-[var(--rule)] bg-[var(--surface-elevated)] px-[6px] py-[1px] text-[10px] font-medium uppercase tracking-[0.1em] text-[var(--ink-tertiary)]">
                                    {tag}
                                </span>
                            ) : null}
                            <p className="type-title-sm font-semibold truncate">{trip.name}</p>
                        </div>
                        <div className="type-caption flex items-center gap-[var(--space-3)] mt-[var(--space-1)]">
                            {trip.location && (
                                <span className="flex items-center gap-[var(--space-1)] min-w-0">
                                    <MapPin
                                        size={12}
                                        strokeWidth={1.5}
                                        className="text-[var(--ink-tertiary)] shrink-0"
                                    />
                                    <span className="truncate">{trip.location}</span>
                                </span>
                            )}
                            <span className="flex items-center gap-[var(--space-1)]">
                                <Calendar
                                    size={12}
                                    strokeWidth={1.5}
                                    className="text-[var(--ink-tertiary)]"
                                />
                                {formatDate(trip.startDate, 'short')}
                            </span>
                        </div>
                    </div>

                    <ChevronRight
                        size={18}
                        strokeWidth={1.5}
                        className="text-[var(--ink-tertiary)] shrink-0"
                    />
                </button>

                <div ref={menuRef} style={{ position: 'relative', flexShrink: 0 }}>
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            setMenuOpen(prev => !prev);
                        }}
                        aria-haspopup="menu"
                        aria-expanded={menuOpen}
                        aria-label={`More actions for ${trip.name}`}
                        className="press-scale"
                        style={{
                            padding: '8px',
                            borderRadius: 'var(--radius-md)',
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--ink-tertiary)',
                            cursor: 'pointer',
                        }}
                    >
                        <MoreVertical size={18} strokeWidth={1.75} />
                    </button>

                    {menuOpen && (
                        <div
                            role="menu"
                            style={{
                                position: 'absolute',
                                top: 'calc(100% + 4px)',
                                right: 0,
                                minWidth: '180px',
                                background: 'var(--canvas)',
                                border: '1px solid var(--rule)',
                                borderRadius: 'var(--radius-lg)',
                                boxShadow: '0 12px 32px rgba(46,34,18,0.12)',
                                padding: 'var(--space-1)',
                                zIndex: 40,
                            }}
                        >
                            <TripMenuItem icon={<Settings size={14} />} label="Settings" onClick={handleSettings} />
                            <TripMenuItem icon={<Share2 size={14} />} label="Invite" onClick={handleInvite} />
                            <TripMenuItem
                                icon={<Trash2 size={14} />}
                                label="Delete trip"
                                onClick={handleDelete}
                                danger
                            />
                        </div>
                    )}
                </div>
            </div>
        </>
    );
});

function TripMenuItem({
    icon,
    label,
    onClick,
    danger,
}: {
    icon: React.ReactNode;
    label: string;
    onClick: () => void;
    danger?: boolean;
}) {
    return (
        <button
            type="button"
            role="menuitem"
            onClick={onClick}
            className="press-scale"
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-3)',
                width: '100%',
                padding: 'var(--space-2) var(--space-3)',
                background: 'transparent',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                textAlign: 'left',
                fontSize: 'var(--text-sm)',
                color: danger ? 'var(--error)' : 'var(--ink)',
                cursor: 'pointer',
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--surface-elevated)';
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
            }}
        >
            <span style={{ color: danger ? 'var(--error)' : 'var(--ink-tertiary)' }}>{icon}</span>
            {label}
        </button>
    );
}
