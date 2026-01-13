'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { seedDemoData, clearDemoData } from '@/lib/db/seed';
import { useTripStore, useUIStore } from '@/lib/stores';
import { AppShellNew } from '@/components/layout';
import {
  Button,
  Card,
  Badge,
  SectionHeader,
  ConfirmDialog,
  NoTripsEmptyNew,
  Skeleton,
} from '@/components/ui';
import {
  Trophy,
  Plus,
  Trash2,
  Database,
  ChevronRight,
  Calendar,
  MapPin,
} from 'lucide-react';
import { cn, formatDate } from '@/lib/utils';

// Trip card component
interface TripCardProps {
  trip: {
    id: string;
    name: string;
    location?: string;
    startDate: Date | string;
    endDate: Date | string;
  };
  onSelect: () => void;
}

function TripCard({ trip, onSelect }: TripCardProps) {
  const startDate = new Date(trip.startDate);
  const endDate = new Date(trip.endDate);
  const now = new Date();

  // Determine trip status
  let status: 'upcoming' | 'active' | 'completed' = 'upcoming';
  if (now > endDate) status = 'completed';
  else if (now >= startDate) status = 'active';

  return (
    <Card interactive onClick={onSelect} className="group">
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div
          className={cn(
            'flex-shrink-0 flex items-center justify-center',
            'h-12 w-12 rounded-xl',
            'bg-augusta-green/10 text-augusta-green',
            'group-hover:bg-augusta-green group-hover:text-white',
            'transition-colors duration-200'
          )}
        >
          <Trophy className="h-6 w-6" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="font-semibold text-text-primary truncate">
                {trip.name}
              </h3>
              {trip.location && (
                <div className="flex items-center gap-1.5 mt-1 text-text-secondary">
                  <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                  <span className="text-sm truncate">{trip.location}</span>
                </div>
              )}
            </div>
            <Badge
              variant={
                status === 'active'
                  ? 'success'
                  : status === 'upcoming'
                    ? 'info'
                    : 'default'
              }
              dot={status === 'active'}
              pulse={status === 'active'}
            >
              {status === 'active'
                ? 'Active'
                : status === 'upcoming'
                  ? 'Upcoming'
                  : 'Completed'}
            </Badge>
          </div>

          {/* Date range */}
          <div className="flex items-center gap-1.5 mt-2 text-text-tertiary">
            <Calendar className="h-3.5 w-3.5" />
            <span className="text-xs">
              {formatDate(trip.startDate, 'short')} –{' '}
              {formatDate(trip.endDate, 'short')}
            </span>
          </div>
        </div>

        {/* Arrow */}
        <ChevronRight
          className={cn(
            'h-5 w-5 text-text-tertiary flex-shrink-0',
            'group-hover:text-text-secondary transition-colors'
          )}
        />
      </div>
    </Card>
  );
}

// Loading skeleton for trip cards
function TripCardSkeleton() {
  return (
    <Card>
      <div className="flex items-start gap-4">
        <Skeleton className="h-12 w-12 rounded-xl flex-shrink-0" />
        <div className="flex-1 min-w-0 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-28" />
        </div>
      </div>
    </Card>
  );
}

export default function HomePage() {
  const router = useRouter();
  const { loadTrip } = useTripStore();
  const { showToast } = useUIStore();
  const [isSeeding, setIsSeeding] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Get all trips
  const trips = useLiveQuery(
    () => db.trips.orderBy('startDate').reverse().toArray(),
    []
  );

  const handleTripSelect = async (tripId: string) => {
    await loadTrip(tripId);
    router.push('/score');
  };

  const handleSeedData = async () => {
    setIsSeeding(true);
    try {
      const tripId = await seedDemoData();
      await loadTrip(tripId);
      showToast('success', 'Demo data loaded successfully');
      router.push('/score');
    } catch (error) {
      showToast('error', 'Failed to load demo data');
      console.error(error);
    } finally {
      setIsSeeding(false);
    }
  };

  const handleClearData = async () => {
    try {
      await clearDemoData();
      showToast('info', 'All data cleared');
      setShowClearConfirm(false);
    } catch (error) {
      showToast('error', 'Failed to clear data');
      console.error(error);
    }
  };

  const isLoading = trips === undefined;
  const hasTrips = trips && trips.length > 0;

  return (
    <AppShellNew headerTitle="Ryder Cup Tracker" showNav={true}>
      <div className="p-4 lg:p-6 space-y-8">
        {/* Hero Section - Only show when no trips */}
        {!hasTrips && !isLoading && (
          <section className="pt-8 pb-4">
            <div className="text-center">
              <div
                className={cn(
                  'inline-flex items-center justify-center',
                  'h-20 w-20 rounded-2xl mb-6',
                  'bg-augusta-green shadow-lg shadow-augusta-green/30'
                )}
              >
                <Trophy className="h-10 w-10 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-text-primary mb-2">
                Welcome to Ryder Cup Tracker
              </h1>
              <p className="text-text-secondary max-w-md mx-auto">
                Track your golf trip matches with Ryder Cup-style scoring.
                Create a trip to get started.
              </p>
            </div>
          </section>
        )}

        {/* Trips Section */}
        <section>
          <SectionHeader
            title={hasTrips ? 'Your Trips' : 'Get Started'}
            subtitle={
              hasTrips
                ? `${trips.length} trip${trips.length !== 1 ? 's' : ''}`
                : undefined
            }
            icon={Trophy}
            action={
              <Button
                onClick={() => router.push('/trip/new')}
                leftIcon={<Plus className="h-4 w-4" />}
                size="sm"
              >
                New trip
              </Button>
            }
            className="mb-4"
          />

          {/* Loading state */}
          {isLoading && (
            <div className="space-y-3">
              <TripCardSkeleton />
              <TripCardSkeleton />
            </div>
          )}

          {/* Empty state */}
          {!isLoading && !hasTrips && (
            <Card variant="outlined" padding="none">
              <NoTripsEmptyNew onCreateTrip={() => router.push('/trip/new')} />
            </Card>
          )}

          {/* Trip list */}
          {hasTrips && (
            <div className="space-y-3">
              {trips.map(trip => (
                <TripCard
                  key={trip.id}
                  trip={trip}
                  onSelect={() => handleTripSelect(trip.id)}
                />
              ))}
            </div>
          )}
        </section>

        {/* Quick Actions Section */}
        <section>
          <SectionHeader title="Quick Actions" size="sm" className="mb-3" />
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="secondary"
              onClick={handleSeedData}
              isLoading={isSeeding}
              loadingText="Loading..."
              leftIcon={<Database className="h-4 w-4" />}
              fullWidth
            >
              Load demo
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowClearConfirm(true)}
              leftIcon={<Trash2 className="h-4 w-4" />}
              fullWidth
              className="text-error border-error/30 hover:bg-error/10"
            >
              Clear data
            </Button>
          </div>
        </section>

        {/* Footer */}
        <footer className="pt-8 pb-4 text-center">
          <div className="flex items-center justify-center gap-2 text-text-tertiary">
            <div
              className={cn(
                'h-6 w-6 rounded-md',
                'bg-augusta-green text-white',
                'flex items-center justify-center',
                'text-xs font-bold'
              )}
            >
              RC
            </div>
            <span className="text-xs">Golf Ryder Cup App • v1.0.0</span>
          </div>
        </footer>
      </div>

      {/* Confirm Clear Dialog */}
      <ConfirmDialog
        isOpen={showClearConfirm}
        onClose={() => setShowClearConfirm(false)}
        onConfirm={handleClearData}
        title="Clear all data?"
        description="This will permanently delete all trips, players, matches, and scores. This action cannot be undone."
        confirmLabel="Clear everything"
        cancelLabel="Cancel"
        variant="danger"
        confirmText="DELETE"
      />
    </AppShellNew>
  );
}
