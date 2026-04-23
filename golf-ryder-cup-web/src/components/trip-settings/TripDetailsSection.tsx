'use client';

import { useEffect, useState } from 'react';
import { Calendar, ChevronDown, ChevronUp, Flag, MapPin, Users } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { db } from '@/lib/db';
import { useToastStore } from '@/lib/stores';
import { useShallow } from 'zustand/shallow';
import type { Team, Trip } from '@/lib/types/models';
import { queueSyncOperation } from '@/lib/services/tripSyncService';

interface TripDetailsSectionProps {
    trip: Trip;
}

/**
 * Editable trip metadata — name, dates, location, and team names/colors.
 *
 * Previously these fields were locked after trip creation, which meant
 * captains had to delete and recreate a whole trip to fix a typo or
 * adjust dates when a venue moved. Letting captains edit these in place
 * — and persisting the team-name changes to the underlying Team rows —
 * closes one of the biggest usability gaps on the settings page.
 */
export function TripDetailsSection({ trip }: TripDetailsSectionProps) {
    const { showToast } = useToastStore(useShallow(s => ({ showToast: s.showToast })));

    const [open, setOpen] = useState(false);
    const [name, setName] = useState(trip.name);
    const [startDate, setStartDate] = useState(trip.startDate.split('T')[0]);
    const [endDate, setEndDate] = useState(trip.endDate.split('T')[0]);
    const [location, setLocation] = useState(trip.location ?? '');

    // Teams for this trip — loaded once when the section opens so
    // name/color edits can be saved alongside the trip metadata.
    const [teams, setTeams] = useState<Team[]>([]);
    const [teamAName, setTeamAName] = useState('');
    const [teamAColor, setTeamAColor] = useState('');
    const [teamAIcon, setTeamAIcon] = useState('');
    const [teamBName, setTeamBName] = useState('');
    const [teamBColor, setTeamBColor] = useState('');
    const [teamBIcon, setTeamBIcon] = useState('');

    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (!open) return;
        let cancelled = false;

        void db.teams
            .where('tripId')
            .equals(trip.id)
            .toArray()
            .then((rows) => {
                if (cancelled) return;
                setTeams(rows);
                const a = rows.find((t) => t.color === 'usa');
                const b = rows.find((t) => t.color === 'europe');
                setTeamAName(a?.name ?? 'Team USA');
                setTeamAColor(a?.colorHex ?? '#1E3A5F');
                setTeamAIcon(a?.icon ?? '');
                setTeamBName(b?.name ?? 'Team Europe');
                setTeamBColor(b?.colorHex ?? '#722F37');
                setTeamBIcon(b?.icon ?? '');
            });

        return () => {
            cancelled = true;
        };
    }, [open, trip.id]);

    const handleSave = async () => {
        if (!name.trim()) {
            showToast('error', 'Trip name cannot be empty');
            return;
        }

        if (endDate && endDate < startDate) {
            showToast('error', 'End date must be on or after the start date');
            return;
        }

        setIsSaving(true);
        try {
            const now = new Date().toISOString();

            await db.trips.update(trip.id, {
                name: name.trim(),
                startDate: `${startDate}T00:00:00.000Z`,
                endDate: `${endDate || startDate}T23:59:59.000Z`,
                location: location.trim() || undefined,
                updatedAt: now,
            });

            const teamA = teams.find((t) => t.color === 'usa');
            const teamB = teams.find((t) => t.color === 'europe');
            const nextTeamAIcon = teamAIcon.trim() || undefined;
            const nextTeamBIcon = teamBIcon.trim() || undefined;

            if (
                teamA &&
                (teamA.name !== teamAName.trim() ||
                    teamA.colorHex !== teamAColor ||
                    teamA.icon !== nextTeamAIcon)
            ) {
                const nextName = teamAName.trim() || 'Team USA';
                const updated = {
                    ...teamA,
                    name: nextName,
                    colorHex: teamAColor,
                    icon: nextTeamAIcon,
                    updatedAt: now,
                };
                await db.teams.update(teamA.id, {
                    name: nextName,
                    colorHex: teamAColor,
                    icon: nextTeamAIcon,
                    updatedAt: now,
                });
                queueSyncOperation('team', teamA.id, 'update', trip.id, updated);
            }
            if (
                teamB &&
                (teamB.name !== teamBName.trim() ||
                    teamB.colorHex !== teamBColor ||
                    teamB.icon !== nextTeamBIcon)
            ) {
                const nextName = teamBName.trim() || 'Team Europe';
                const updated = {
                    ...teamB,
                    name: nextName,
                    colorHex: teamBColor,
                    icon: nextTeamBIcon,
                    updatedAt: now,
                };
                await db.teams.update(teamB.id, {
                    name: nextName,
                    colorHex: teamBColor,
                    icon: nextTeamBIcon,
                    updatedAt: now,
                });
                queueSyncOperation('team', teamB.id, 'update', trip.id, updated);
            }

            showToast('success', 'Trip details saved');
        } catch {
            showToast('error', 'Failed to save trip details');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <section className="card-elevated overflow-hidden">
            <button
                type="button"
                onClick={() => setOpen(v => !v)}
                aria-expanded={open}
                className="w-full p-4 flex items-center justify-between border-b border-[var(--rule)] text-left"
            >
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[color:var(--masters)]/12 flex items-center justify-center">
                        <Flag className="w-5 h-5 text-[var(--masters)]" />
                    </div>
                    <div>
                        <h2 className="type-h3">Trip Details</h2>
                        <p className="text-sm text-[var(--ink-secondary)] mt-0.5">
                            Name, dates, location, and team branding
                        </p>
                    </div>
                </div>
                {open ? (
                    <ChevronUp className="w-5 h-5 text-[var(--ink-tertiary)]" />
                ) : (
                    <ChevronDown className="w-5 h-5 text-[var(--ink-tertiary)]" />
                )}
            </button>

            {open && (
                <div className="p-4 space-y-4">
                    <label className="block">
                        <span className="type-meta font-semibold text-[var(--ink)] flex items-center gap-2">
                            <Flag size={14} /> Trip Name
                        </span>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g., Myrtle Beach 2026"
                            className="input mt-2 w-full"
                        />
                    </label>

                    <div className="grid grid-cols-2 gap-3">
                        <label className="block">
                            <span className="type-meta font-semibold text-[var(--ink)] flex items-center gap-2">
                                <Calendar size={14} /> Start Date
                            </span>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="input mt-2 w-full"
                            />
                        </label>
                        <label className="block">
                            <span className="type-meta font-semibold text-[var(--ink)] flex items-center gap-2">
                                <Calendar size={14} /> End Date
                            </span>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                min={startDate}
                                className="input mt-2 w-full"
                            />
                        </label>
                    </div>

                    <label className="block">
                        <span className="type-meta font-semibold text-[var(--ink)] flex items-center gap-2">
                            <MapPin size={14} /> Location
                        </span>
                        <input
                            type="text"
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                            placeholder="e.g., Myrtle Beach, SC"
                            className="input mt-2 w-full"
                        />
                    </label>

                    <div className="mt-2 pt-4 border-t border-[var(--rule)]">
                        <div className="flex items-center gap-2 mb-3">
                            <Users size={14} className="text-[var(--ink-secondary)]" />
                            <span className="type-meta font-semibold text-[var(--ink)]">
                                Teams
                            </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <label className="block">
                                    <span className="type-micro text-[var(--ink-tertiary)]">Team 1 name</span>
                                    <input
                                        type="text"
                                        value={teamAName}
                                        onChange={(e) => setTeamAName(e.target.value)}
                                        placeholder="Team USA"
                                        className="input mt-1 w-full"
                                    />
                                </label>
                                <label className="flex items-center gap-2">
                                    <span className="type-micro text-[var(--ink-tertiary)]">Color</span>
                                    <input
                                        type="color"
                                        value={teamAColor}
                                        onChange={(e) => setTeamAColor(e.target.value)}
                                        className="h-8 w-16 rounded cursor-pointer border border-[var(--rule)]"
                                        aria-label="Team 1 color"
                                    />
                                </label>
                                <label className="block">
                                    <span className="type-micro text-[var(--ink-tertiary)]">Logo URL</span>
                                    <input
                                        type="url"
                                        value={teamAIcon}
                                        onChange={(e) => setTeamAIcon(e.target.value)}
                                        placeholder="https://…/logo.png"
                                        className="input mt-1 w-full"
                                    />
                                </label>
                            </div>

                            <div className="space-y-2">
                                <label className="block">
                                    <span className="type-micro text-[var(--ink-tertiary)]">Team 2 name</span>
                                    <input
                                        type="text"
                                        value={teamBName}
                                        onChange={(e) => setTeamBName(e.target.value)}
                                        placeholder="Team Europe"
                                        className="input mt-1 w-full"
                                    />
                                </label>
                                <label className="flex items-center gap-2">
                                    <span className="type-micro text-[var(--ink-tertiary)]">Color</span>
                                    <input
                                        type="color"
                                        value={teamBColor}
                                        onChange={(e) => setTeamBColor(e.target.value)}
                                        className="h-8 w-16 rounded cursor-pointer border border-[var(--rule)]"
                                        aria-label="Team 2 color"
                                    />
                                </label>
                                <label className="block">
                                    <span className="type-micro text-[var(--ink-tertiary)]">Logo URL</span>
                                    <input
                                        type="url"
                                        value={teamBIcon}
                                        onChange={(e) => setTeamBIcon(e.target.value)}
                                        placeholder="https://…/logo.png"
                                        className="input mt-1 w-full"
                                    />
                                </label>
                            </div>
                        </div>
                    </div>

                    <Button
                        variant="primary"
                        onClick={handleSave}
                        isLoading={isSaving}
                        loadingText="Saving…"
                        fullWidth
                    >
                        Save trip details
                    </Button>
                </div>
            )}
        </section>
    );
}
