'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Home, MoreHorizontal } from 'lucide-react';
import { db } from '@/lib/db';
import { PageHeader } from '@/components/layout';
import { EmptyStatePremium, PageLoadingSkeleton } from '@/components/ui';
import {
    TripBackupSection,
    TripCompetitionRulesSection,
    TripDangerZoneSection,
    TripDetailsSection,
} from '@/components/trip-settings';
import { useAccessStore, useTripStore } from '@/lib/stores';
import { useShallow } from 'zustand/shallow';
import type { Trip } from '@/lib/types/models';

/**
 * Trip Settings — post-creation customization hub.
 *
 * The page itself is a thin shell that loads the trip and delegates each
 * feature to a focused sub-component in src/components/trip-settings/.
 * Splitting the concerns keeps this file under 150 lines and makes each
 * section independently testable.
 */
export default function TripSettingsPage() {
    const params = useParams();
    const router = useRouter();
    const tripId = params.tripId as string;

    const { isCaptainMode } = useAccessStore(useShallow(s => ({ isCaptainMode: s.isCaptainMode })));
    const { currentTrip } = useTripStore(useShallow(s => ({ currentTrip: s.currentTrip })));

    const [isVerifyingTrip, setIsVerifyingTrip] = useState(true);
    const [trip, setTrip] = useState<Trip | null>(null);
    const [tripLookupError, setTripLookupError] = useState<string | null>(null);

    // Captains have /captain/settings as the single configuration hub
    // (trip details + team names + competition rules + backup + danger
    // zone). When a captain lands here for the active trip, forward them
    // there instead of showing a duplicate page with the same controls.
    // Non-captains and captains viewing a non-active trip still see this
    // page unchanged.
    useEffect(() => {
        if (isCaptainMode && currentTrip?.id === tripId) {
            router.replace('/captain/settings');
        }
    }, [isCaptainMode, currentTrip?.id, tripId, router]);

    const loadTrip = async () => {
        try {
            setTripLookupError(null);
            const loaded = await db.trips.get(tripId);
            setTrip(loaded ?? null);
        } catch {
            setTripLookupError("We couldn't load this trip right now.");
            setTrip(null);
        } finally {
            setIsVerifyingTrip(false);
        }
    };

    useEffect(() => {
        void loadTrip();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tripId]);

    if (isVerifyingTrip) {
        return <PageLoadingSkeleton title="Trip Settings" variant="form" />;
    }

    const pageChrome = (children: React.ReactNode) => (
        <main className="min-h-screen page-premium-enter texture-grain bg-[var(--canvas)]">
            <div className="absolute inset-0 bg-linear-to-b from-[color:var(--masters)]/15 via-transparent to-transparent pointer-events-none" />
            <div className="relative page-container">
                <PageHeader
                    title="Trip Settings"
                    subtitle={trip?.name ?? undefined}
                    icon={<MoreHorizontal size={16} className="text-[var(--color-accent)]" />}
                    backFallback="/trips"
                    rightSlot={
                        <button
                            onClick={() => router.push('/')}
                            className="inline-flex items-center gap-2 text-sm text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] transition-colors"
                            aria-label="Go home"
                        >
                            <Home className="w-4 h-4" />
                            Home
                        </button>
                    }
                />
                {children}
            </div>
        </main>
    );

    if (tripLookupError) {
        return pageChrome(
            <div className="content-area">
                <EmptyStatePremium
                    illustration="flag"
                    title="Couldn’t load trip"
                    description={tripLookupError}
                    action={{
                        label: 'Try again',
                        onClick: () => {
                            setIsVerifyingTrip(true);
                            void loadTrip();
                        },
                    }}
                    secondaryAction={{
                        label: 'Go Home',
                        onClick: () => router.push('/'),
                    }}
                    variant="large"
                />
            </div>,
        );
    }

    if (!trip) {
        return pageChrome(
            <div className="content-area">
                <EmptyStatePremium
                    illustration="trophy"
                    title="Trip not found"
                    description="This trip doesn’t exist or may have been deleted."
                    action={{
                        label: 'Go Home',
                        onClick: () => router.push('/'),
                    }}
                    secondaryAction={{
                        label: 'More',
                        onClick: () => router.push('/more'),
                    }}
                    variant="large"
                />
            </div>,
        );
    }

    return pageChrome(
        <div className="content-area space-y-6">
            <TripDetailsSection trip={trip} />
            <TripBackupSection tripId={trip.id} />
            <TripCompetitionRulesSection trip={trip} />
            <TripDangerZoneSection tripId={trip.id} />
        </div>,
    );
}
