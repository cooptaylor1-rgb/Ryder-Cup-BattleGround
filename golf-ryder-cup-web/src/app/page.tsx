'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, seedDemoData, clearAllData } from '@/lib/db';
import { useTripStore, useUIStore } from '@/lib/stores';
import { AppShell } from '@/components/layout';
import { Trophy, Plus, Trash2, Database } from 'lucide-react';
import { cn, formatDate } from '@/lib/utils';

export default function HomePage() {
  const router = useRouter();
  const { loadTrip } = useTripStore();
  const { showToast } = useUIStore();
  const [isSeeding, setIsSeeding] = useState(false);

  // Get all trips
  const trips = useLiveQuery(() => db.trips.toArray(), []);

  const handleTripSelect = async (tripId: string) => {
    await loadTrip(tripId);
    router.push('/score');
  };

  const handleSeedData = async () => {
    setIsSeeding(true);
    try {
      await seedDemoData();
      showToast('success', 'Demo data loaded successfully');
    } catch (error) {
      showToast('error', 'Failed to load demo data');
      console.error(error);
    } finally {
      setIsSeeding(false);
    }
  };

  const handleClearData = async () => {
    if (confirm('Are you sure you want to clear all data?')) {
      try {
        await clearAllData();
        showToast('info', 'All data cleared');
      } catch (error) {
        showToast('error', 'Failed to clear data');
        console.error(error);
      }
    }
  };

  return (
    <AppShell showNav={false} headerTitle="Ryder Cup Tracker">
      <div className="p-4 space-y-6">
        {/* Hero Section */}
        <div className="text-center py-8">
          <div className="w-20 h-20 bg-augusta-green rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Trophy className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Ryder Cup Tracker</h1>
          <p className="text-surface-500 dark:text-surface-400">
            Score your matches, track standings, manage your tournament
          </p>
        </div>

        {/* Trips List */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Your Trips</h2>
            <button
              onClick={() => router.push('/trip/new')}
              className="flex items-center gap-1 text-sm text-augusta-green font-medium"
            >
              <Plus className="w-4 h-4" />
              New Trip
            </button>
          </div>

          {trips && trips.length > 0 ? (
            <div className="space-y-3">
              {trips.map(trip => (
                <button
                  key={trip.id}
                  onClick={() => handleTripSelect(trip.id)}
                  className={cn(
                    'card w-full p-4 text-left',
                    'hover:bg-surface-100 dark:hover:bg-surface-800',
                    'transition-colors duration-150'
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold">{trip.name}</h3>
                      {trip.location && (
                        <p className="text-sm text-surface-500 mt-0.5">
                          {trip.location}
                        </p>
                      )}
                    </div>
                    <span className="text-xs text-surface-400">
                      {formatDate(trip.startDate)}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="card p-8 text-center">
              <p className="text-surface-500 mb-4">No trips yet</p>
              <button
                onClick={() => router.push('/trip/new')}
                className="btn-primary"
              >
                Create Your First Trip
              </button>
            </div>
          )}
        </section>

        {/* Dev Tools (remove in production) */}
        <section className="pt-4 border-t border-surface-200 dark:border-surface-800">
          <h3 className="text-sm font-medium text-surface-400 mb-3">
            Developer Tools
          </h3>
          <div className="flex gap-3">
            <button
              onClick={handleSeedData}
              disabled={isSeeding}
              className={cn(
                'flex-1 flex items-center justify-center gap-2',
                'py-3 px-4 rounded-lg',
                'bg-augusta-green/10 text-augusta-green',
                'hover:bg-augusta-green/20 transition-colors',
                isSeeding && 'opacity-50 cursor-not-allowed'
              )}
            >
              <Database className="w-4 h-4" />
              {isSeeding ? 'Loading...' : 'Load Demo'}
            </button>
            <button
              onClick={handleClearData}
              className={cn(
                'flex-1 flex items-center justify-center gap-2',
                'py-3 px-4 rounded-lg',
                'bg-red-500/10 text-red-500',
                'hover:bg-red-500/20 transition-colors'
              )}
            >
              <Trash2 className="w-4 h-4" />
              Clear Data
            </button>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
