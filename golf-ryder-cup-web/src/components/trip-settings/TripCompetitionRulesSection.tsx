'use client';

import { useState } from 'react';
import { Calculator, ChevronDown, ChevronRight, ChevronUp, Settings, Sliders } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { LinkButton } from '@/components/ui/LinkButton';
import {
    ScoringFormatOptions,
    HandicapRules,
    DEFAULT_SCORING_SETTINGS,
    DEFAULT_HANDICAP_SETTINGS,
    type ScoringSettings,
    type HandicapSettings,
} from '@/components/trip-setup';
import { useToastStore, useTripStore } from '@/lib/stores';
import { useShallow } from 'zustand/shallow';
import type { Trip } from '@/lib/types/models';

interface TripCompetitionRulesSectionProps {
    trip: Trip;
}

/**
 * Competition rules editor — scoring format + handicap allowances + a
 * link to captain manage for per-session overrides. Extracted from the
 * trip settings page so each accordion keeps its own open/close state.
 */
export function TripCompetitionRulesSection({ trip }: TripCompetitionRulesSectionProps) {
    const { showToast } = useToastStore(useShallow(s => ({ showToast: s.showToast })));
    const { updateTrip } = useTripStore(useShallow(s => ({ updateTrip: s.updateTrip })));

    const [scoringOpen, setScoringOpen] = useState(false);
    const [handicapOpen, setHandicapOpen] = useState(false);
    const [localScoring, setLocalScoring] = useState<ScoringSettings>(
        trip.scoringSettings ?? DEFAULT_SCORING_SETTINGS,
    );
    const [localHandicap, setLocalHandicap] = useState<HandicapSettings>(
        trip.handicapSettings ?? DEFAULT_HANDICAP_SETTINGS,
    );
    const [isSavingRules, setIsSavingRules] = useState(false);

    const handleSave = async () => {
        setIsSavingRules(true);
        try {
            // Route through tripStore.updateTrip so the rules change
            // queues a Supabase sync. db.trips.update alone leaves
            // Supabase holding the old rules, and the next roster
            // poll pulls that row back and wipes the captain's edit.
            await updateTrip(trip.id, {
                scoringSettings: localScoring,
                handicapSettings: localHandicap,
            });
            showToast('success', 'Competition rules saved');
        } catch {
            showToast('error', 'Failed to save rules');
        } finally {
            setIsSavingRules(false);
        }
    };

    return (
        <>
            {/* Scoring Rules */}
            <section className="card-elevated overflow-hidden">
                <button
                    type="button"
                    onClick={() => setScoringOpen(v => !v)}
                    aria-expanded={scoringOpen}
                    className="w-full p-4 flex items-center justify-between border-b border-[var(--rule)] text-left"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[color:var(--masters)]/12 flex items-center justify-center">
                            <Calculator className="w-5 h-5 text-[var(--masters)]" />
                        </div>
                        <div>
                            <h2 className="type-h3">Scoring Rules</h2>
                            <p className="text-sm text-[var(--ink-secondary)] mt-0.5">
                                Format, win condition, and point values
                            </p>
                        </div>
                    </div>
                    {scoringOpen ? (
                        <ChevronUp className="w-5 h-5 text-[var(--ink-tertiary)]" />
                    ) : (
                        <ChevronDown className="w-5 h-5 text-[var(--ink-tertiary)]" />
                    )}
                </button>

                {scoringOpen && (
                    <div className="p-4 space-y-4">
                        <ScoringFormatOptions
                            settings={localScoring}
                            onSettingsChange={setLocalScoring}
                        />
                        <Button
                            variant="primary"
                            onClick={handleSave}
                            isLoading={isSavingRules}
                            loadingText="Saving…"
                            fullWidth
                        >
                            Save scoring rules
                        </Button>
                    </div>
                )}
            </section>

            {/* Handicap Rules */}
            <section className="card-elevated overflow-hidden">
                <button
                    type="button"
                    onClick={() => setHandicapOpen(v => !v)}
                    aria-expanded={handicapOpen}
                    className="w-full p-4 flex items-center justify-between border-b border-[var(--rule)] text-left"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[color:var(--masters)]/12 flex items-center justify-center">
                            <Settings className="w-5 h-5 text-[var(--masters)]" />
                        </div>
                        <div>
                            <h2 className="type-h3">Handicap Settings</h2>
                            <p className="text-sm text-[var(--ink-secondary)] mt-0.5">
                                Allowances, methods, and max handicap
                            </p>
                        </div>
                    </div>
                    {handicapOpen ? (
                        <ChevronUp className="w-5 h-5 text-[var(--ink-tertiary)]" />
                    ) : (
                        <ChevronDown className="w-5 h-5 text-[var(--ink-tertiary)]" />
                    )}
                </button>

                {handicapOpen && (
                    <div className="p-4 space-y-4">
                        <HandicapRules
                            settings={localHandicap}
                            onSettingsChange={setLocalHandicap}
                        />
                        <Button
                            variant="primary"
                            onClick={handleSave}
                            isLoading={isSavingRules}
                            loadingText="Saving…"
                            fullWidth
                        >
                            Save handicap settings
                        </Button>
                    </div>
                )}
            </section>

            {/* Per-session overrides */}
            <section className="card-elevated overflow-hidden">
                <div className="p-4 border-b border-[var(--rule)]">
                    <h2 className="type-h3">Session Adjustments</h2>
                    <p className="text-sm text-[var(--ink-secondary)] mt-1">
                        Each session can override the trip defaults with its own format, course, and tee set.
                    </p>
                </div>
                <div className="p-4">
                    <LinkButton
                        href="/captain/manage"
                        variant="secondary"
                        leftIcon={<Sliders size={16} />}
                        rightIcon={<ChevronRight size={16} />}
                        fullWidth
                        className="justify-between"
                    >
                        Open captain manage
                    </LinkButton>
                </div>
            </section>
        </>
    );
}
