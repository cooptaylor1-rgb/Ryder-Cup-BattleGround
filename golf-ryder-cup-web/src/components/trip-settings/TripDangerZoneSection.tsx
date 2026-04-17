'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, MoreHorizontal, Trash2 } from 'lucide-react';
import { db } from '@/lib/db';
import { useToastStore } from '@/lib/stores';
import { useShallow } from 'zustand/shallow';

interface TripDangerZoneSectionProps {
    tripId: string;
}

/**
 * Destructive trip actions. Extracted from the trip settings page to keep
 * the delete flow (confirmation state, cascade delete, routing) isolated
 * from the backup and rules editors.
 */
export function TripDangerZoneSection({ tripId }: TripDangerZoneSectionProps) {
    const router = useRouter();
    const { showToast } = useToastStore(useShallow(s => ({ showToast: s.showToast })));

    const [isDeleting, setIsDeleting] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            // Cascade-delete all related data inside one transaction so
            // we don't leave orphans if any step fails.
            const sessions = await db.sessions.where('tripId').equals(tripId).toArray();
            const sessionIds = sessions.map((s) => s.id);
            const matches = await db.matches.where('sessionId').anyOf(sessionIds).toArray();
            const matchIds = matches.map((m) => m.id);

            await db.transaction(
                'rw',
                [db.trips, db.teams, db.teamMembers, db.sessions, db.matches, db.holeResults],
                async () => {
                    await db.holeResults.where('matchId').anyOf(matchIds).delete();
                    await db.matches.where('sessionId').anyOf(sessionIds).delete();
                    await db.sessions.where('tripId').equals(tripId).delete();

                    const teams = await db.teams.where('tripId').equals(tripId).toArray();
                    const teamIds = teams.map((t) => t.id);
                    await db.teamMembers.where('teamId').anyOf(teamIds).delete();
                    await db.teams.where('tripId').equals(tripId).delete();

                    await db.trips.delete(tripId);
                },
            );

            showToast('success', 'Trip deleted');
            router.push('/');
        } catch {
            showToast('error', 'Could not delete trip');
            setIsDeleting(false);
            setShowDeleteConfirm(false);
        }
    };

    return (
        <section className="card-elevated overflow-hidden">
            <div className="p-4 border-b border-[var(--rule)]">
                <h2 className="type-h3 text-[var(--error)]">Danger Zone</h2>
                <p className="text-sm text-[var(--ink-secondary)] mt-1">
                    Destructive actions can’t be undone.
                </p>
            </div>

            <div className="p-4 space-y-3">
                {!showDeleteConfirm ? (
                    <button
                        onClick={() => setShowDeleteConfirm(true)}
                        className="w-full flex items-center gap-3 p-4 bg-[color:var(--error)]/10 hover:bg-[color:var(--error)]/15 rounded-xl transition-colors"
                    >
                        <div className="w-10 h-10 rounded-full bg-[color:var(--error)]/15 flex items-center justify-center">
                            <Trash2 className="w-5 h-5 text-[var(--error)]" />
                        </div>
                        <div className="text-left flex-1">
                            <div className="font-medium text-[var(--error)]">Delete Trip</div>
                            <div className="text-sm text-[color:var(--error)]/70">
                                Permanently remove this trip and all related data
                            </div>
                        </div>
                    </button>
                ) : (
                    <div className="rounded-xl border border-[color:var(--error)]/25 bg-[color:var(--error)]/10 p-4">
                        <div className="flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-[var(--error)] mt-0.5" />
                            <div className="flex-1">
                                <div className="font-semibold text-[var(--error)]">Confirm delete</div>
                                <p className="text-sm text-[color:var(--error)]/80 mt-1">
                                    This will delete the trip, teams, players, sessions, matches, and scores from this device.
                                </p>

                                <div className="mt-4 flex flex-wrap gap-2">
                                    <button
                                        onClick={handleDelete}
                                        disabled={isDeleting}
                                        className="px-4 py-2 rounded-xl bg-[var(--error)] hover:bg-[color:var(--error)]/90 text-[var(--canvas)] text-sm font-semibold disabled:opacity-50"
                                    >
                                        {isDeleting ? 'Deleting…' : 'Yes, delete'}
                                    </button>
                                    <button
                                        onClick={() => {
                                            setShowDeleteConfirm(false);
                                            setIsDeleting(false);
                                        }}
                                        className="px-4 py-2 rounded-xl text-sm font-semibold bg-[color:var(--surface)]/60 hover:bg-[var(--surface)] border border-[color:var(--rule)]/30 text-[var(--ink-primary)]"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={() => router.push('/more')}
                                        className="ml-auto px-4 py-2 rounded-xl text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] text-sm font-semibold inline-flex items-center gap-2"
                                    >
                                        <MoreHorizontal className="w-4 h-4" />
                                        More
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </section>
    );
}
