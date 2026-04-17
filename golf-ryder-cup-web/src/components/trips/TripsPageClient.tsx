'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trophy } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { useTripStore } from '@/lib/stores';
import { useShallow } from 'zustand/shallow';
import { PageHeader } from '@/components/layout';
import { Button } from '@/components/ui/Button';
import { EmptyStatePremium, NoTournamentsEmpty, PageLoadingSkeleton } from '@/components/ui';
import { JoinTripModal } from '@/components/ui/JoinTripModal';
import { TripCard } from '@/components/home/TripCard';

/**
 * TRIPS — the full archive of trips the user has access to.
 *
 * Extracted from the home page, which previously listed every trip in an
 * "Other Trips" block below the active-trip dashboard. The archive now lives
 * at its own route so the home page can stay focused on the current trip
 * and today's play.
 */
export default function TripsPageClient() {
    const router = useRouter();
    const { currentTrip, loadTrip } = useTripStore(
        useShallow(s => ({ currentTrip: s.currentTrip, loadTrip: s.loadTrip }))
    );
    const [showJoinTrip, setShowJoinTrip] = useState(false);

    const trips = useLiveQuery(async () => {
        return db.trips.orderBy('startDate').reverse().toArray();
    });

    const { active, archived } = useMemo(() => {
        if (!trips) return { active: null, archived: [] };
        const activeId = currentTrip?.id;
        const activeTrip = activeId ? trips.find(t => t.id === activeId) ?? null : null;
        const archivedTrips = trips.filter(t => t.id !== activeId);
        return { active: activeTrip, archived: archivedTrips };
    }, [trips, currentTrip?.id]);

    const handleSelectTrip = async (tripId: string) => {
        await loadTrip(tripId);
        router.push('/');
    };

    if (trips === undefined) {
        return <PageLoadingSkeleton title="Trips" variant="list" />;
    }

    return (
        <div className="min-h-screen page-premium-enter texture-grain bg-[var(--canvas)]">
            <PageHeader
                title="Trips"
                subtitle={trips.length === 1 ? '1 trip' : `${trips.length} trips`}
                icon={<Trophy size={16} className="text-[var(--color-accent)]" />}
                backFallback="/"
                rightSlot={
                    <Button
                        variant="primary"
                        onClick={() => router.push('/trip/new')}
                        aria-label="Create a new trip"
                        leftIcon={<Plus size={14} strokeWidth={2.5} />}
                        className="press-scale rounded-full text-sm"
                    >
                        New
                    </Button>
                }
            />

            <main className="container-editorial py-[var(--space-6)] pb-[var(--space-12)]">
                {trips.length === 0 ? (
                    <NoTournamentsEmpty
                        createHref="/trip/new"
                        onCreateTrip={() => router.push('/trip/new')}
                        onJoinTrip={() => setShowJoinTrip(true)}
                    />
                ) : (
                    <div className="space-y-[var(--space-6)]">
                        {active ? (
                            <section>
                                <h2 className="type-overline tracking-[0.15em] mb-[var(--space-4)] text-[var(--ink-tertiary)]">
                                    Active trip
                                </h2>
                                <TripCard
                                    trip={active}
                                    onSelect={handleSelectTrip}
                                    emphasized
                                    tag={active.isPracticeRound ? 'Practice' : undefined}
                                />
                            </section>
                        ) : null}

                        {archived.length > 0 ? (
                            <section>
                                <h2 className="type-overline tracking-[0.15em] mb-[var(--space-4)] text-[var(--ink-tertiary)]">
                                    {active ? 'Other trips' : 'All trips'}
                                </h2>
                                <div className="flex flex-col gap-[var(--space-3)]">
                                    {archived.map(trip => (
                                        <TripCard
                                            key={trip.id}
                                            trip={trip}
                                            onSelect={handleSelectTrip}
                                            tag={trip.isPracticeRound ? 'Practice' : undefined}
                                        />
                                    ))}
                                </div>
                            </section>
                        ) : !active ? (
                            <EmptyStatePremium
                                illustration="trophy"
                                title="No trips yet"
                                description="Create your first trip to get started."
                                action={{
                                    label: 'Create trip',
                                    onClick: () => router.push('/trip/new'),
                                }}
                                variant="default"
                            />
                        ) : null}
                    </div>
                )}
            </main>

            <JoinTripModal
                isOpen={showJoinTrip}
                onClose={() => setShowJoinTrip(false)}
                onSuccess={() => {
                    setShowJoinTrip(false);
                    router.push('/');
                }}
            />
        </div>
    );
}
