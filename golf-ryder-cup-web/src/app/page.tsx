'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { seedDemoData, clearDemoData } from '@/lib/db/seed';
import { useTripStore, useUIStore } from '@/lib/stores';
import { AppShellNew } from '@/components/layout';
import { Badge, ConfirmDialog } from '@/components/ui';
import {
  Trophy,
  Play,
  Plus,
  ChevronRight,
  Calendar,
  MapPin,
  Zap,
  Settings,
  ChevronDown,
  Flag,
  Users,
  Database,
  Trash2,
} from 'lucide-react';
import { cn, formatDate } from '@/lib/utils';

/**
 * MASTERS-INSPIRED HOME PAGE
 * Premium, polished, tournament-quality design
 */

// ============================================
// HERO SECTION - Grand entrance
// ============================================
function HeroSection() {
  return (
    <div className="text-center py-12 px-4">
      {/* Trophy Icon - Gold accent */}
      <div
        className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-6"
        style={{
          background: 'linear-gradient(135deg, #C4A747 0%, #A38B2D 100%)',
          boxShadow: '0 10px 40px rgba(196, 167, 71, 0.4)'
        }}
      >
        <Trophy className="h-10 w-10 text-white" />
      </div>

      {/* Title - Serif elegance */}
      <h1
        className="text-3xl md:text-4xl font-semibold mb-3"
        style={{ fontFamily: 'Georgia, serif', color: '#F5F1E8' }}
      >
        Ryder Cup Tracker
      </h1>

      {/* Subtitle */}
      <p style={{ color: '#B8B0A0' }} className="text-lg max-w-md mx-auto">
        Score your matches, track standings, manage your tournament
      </p>
    </div>
  );
}

// ============================================
// TRIP CARD - Premium card styling
// ============================================
interface TripCardProps {
  trip: {
    id: string;
    name: string;
    location?: string;
    startDate: Date | string;
    endDate: Date | string;
  };
  onSelect: (id: string) => void;
}

function TripCard({ trip, onSelect }: TripCardProps) {
  return (
    <button
      onClick={() => onSelect(trip.id)}
      style={{
        background: '#1E1C18',
        borderLeft: '4px solid #C4A747',
        border: '1px solid #3A3530',
        borderLeftWidth: '4px',
        borderLeftColor: '#C4A747',
      }}
      className="group w-full text-left p-5 rounded-xl hover:bg-[#252320] active:scale-[0.99] transition-all duration-200"
    >
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <h3 style={{ color: '#F5F1E8' }} className="font-semibold text-lg truncate">
            {trip.name}
          </h3>
          {trip.location && (
            <div className="flex items-center gap-1.5 mt-1" style={{ color: '#807868' }}>
              <MapPin className="h-3.5 w-3.5" />
              <span className="text-sm truncate">{trip.location}</span>
            </div>
          )}
        </div>
        {/* Date badge */}
        <div className="flex items-center gap-2 ml-4">
          <span style={{ color: '#C4A747' }} className="text-sm font-medium">
            {formatDate(trip.startDate, 'short')}
          </span>
          <ChevronRight style={{ color: '#807868' }} className="h-5 w-5 group-hover:translate-x-0.5 transition-all" />
        </div>
      </div>
    </button>
  );
}

// ============================================
// DEVELOPER TOOLS SECTION
// ============================================
interface DevToolsProps {
  onLoadDemo: () => void;
  onClearData: () => void;
  isLoading: boolean;
}

function DevToolsSection({ onLoadDemo, onClearData, isLoading }: DevToolsProps) {
  return (
    <div style={{ borderTop: '1px solid #3A3530' }} className="mt-12 pt-8">
      <h3 style={{ color: '#807868' }} className="text-sm font-medium mb-4">Developer Tools</h3>
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={onLoadDemo}
          disabled={isLoading}
          style={{
            background: '#1E1C18',
            border: '1px solid #3A3530',
            color: '#B8B0A0',
          }}
          className="flex items-center justify-center gap-2 p-4 rounded-xl hover:bg-[#252320] disabled:opacity-50 transition-all duration-200"
        >
          <Database className="h-4 w-4" />
          <span className="text-sm font-medium">Load Demo</span>
        </button>
        <button
          onClick={onClearData}
          disabled={isLoading}
          style={{
            background: 'rgba(216, 76, 111, 0.1)',
            border: '1px solid rgba(216, 76, 111, 0.3)',
            color: '#D84C6F',
          }}
          className="flex items-center justify-center gap-2 p-4 rounded-xl hover:bg-[#D84C6F]/20 disabled:opacity-50 transition-all duration-200"
        >
          <Trash2 className="h-4 w-4" />
          <span className="text-sm font-medium">Clear Data</span>
        </button>
      </div>
    </div>
  );
}

// ============================================
// MAIN HOME PAGE COMPONENT
// ============================================
export default function HomePage() {
  const router = useRouter();
  const { loadTrip } = useTripStore();
  const { showToast } = useUIStore();

  // Loading states
  const [isDemoLoading, setIsDemoLoading] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Query trips from database
  const trips = useLiveQuery(
    () => db.trips.orderBy('startDate').reverse().toArray(),
    []
  );

  const handleSelectTrip = async (tripId: string) => {
    await loadTrip(tripId);
    router.push('/standings');
  };

  const handleCreateTrip = () => {
    router.push('/trip/new');
  };

  const handleLoadDemo = async () => {
    setIsDemoLoading(true);
    try {
      await seedDemoData();
      showToast('success', 'Demo tournament loaded');
    } catch (error) {
      showToast('error', 'Failed to load demo data');
      console.error(error);
    } finally {
      setIsDemoLoading(false);
    }
  };

  const handleClearData = async () => {
    setIsDemoLoading(true);
    try {
      await clearDemoData();
      showToast('info', 'All data cleared');
    } catch (error) {
      showToast('error', 'Failed to clear data');
      console.error(error);
    } finally {
      setIsDemoLoading(false);
      setShowClearConfirm(false);
    }
  };

  return (
    <AppShellNew>
      <div className="min-h-screen" style={{ background: '#0F0D0A' }}>
        <div className="max-w-2xl mx-auto px-4 pb-24">
          {/* Hero Section */}
          <HeroSection />

          {/* Trips Section */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-serif text-xl" style={{ color: '#F5F1E8' }}>Your Trips</h2>
              <button
                onClick={handleCreateTrip}
                className="flex items-center gap-1.5 text-sm font-medium transition-colors"
                style={{ color: '#C4A747' }}
              >
                <Plus className="h-4 w-4" />
                <span>New Trip</span>
              </button>
            </div>

            {trips && trips.length > 0 ? (
              <div className="space-y-3">
                {trips.map((trip) => (
                  <TripCard
                    key={trip.id}
                    trip={trip}
                    onSelect={handleSelectTrip}
                  />
                ))}
              </div>
            ) : (
              <div
                className="text-center py-16 px-6 rounded-2xl border border-dashed"
                style={{ background: '#1A1814', borderColor: '#3A3530' }}
              >
                <div
                  className="inline-flex items-center justify-center w-14 h-14 rounded-xl mb-4"
                  style={{ background: '#252320' }}
                >
                  <Flag className="h-7 w-7" style={{ color: '#807868' }} />
                </div>
                <h3 className="font-serif text-lg mb-2" style={{ color: '#F5F1E8' }}>No tournaments yet</h3>
                <p className="text-sm mb-6" style={{ color: '#807868' }}>Create your first tournament to get started</p>
                <button
                  onClick={handleCreateTrip}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold active:scale-[0.98] transition-all duration-200"
                  style={{
                    background: 'linear-gradient(to right, #C4A747, #A38B2D)',
                    color: '#0F0D0A',
                    boxShadow: '0 10px 15px -3px rgba(196, 167, 71, 0.2)'
                  }}
                >
                  <Plus className="h-5 w-5" />
                  <span>Create Tournament</span>
                </button>
              </div>
            )}
          </section>

          {/* Developer Tools */}
          <DevToolsSection
            onLoadDemo={handleLoadDemo}
            onClearData={() => setShowClearConfirm(true)}
            isLoading={isDemoLoading}
          />
        </div>

        {/* Clear Confirmation Dialog */}
        <ConfirmDialog
          isOpen={showClearConfirm}
          onClose={() => setShowClearConfirm(false)}
          onConfirm={handleClearData}
          title="Clear All Data"
          description="This will permanently delete all tournaments, players, and scores. This action cannot be undone."
          confirmLabel="Clear Everything"
          variant="danger"
        />
      </div>
    </AppShellNew>
  );
}
