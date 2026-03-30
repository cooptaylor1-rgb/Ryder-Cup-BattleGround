'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Share2, Trophy } from 'lucide-react';
import { useTripStore } from '@/lib/stores';
import { useShallow } from 'zustand/shallow';
import { buildRecapShareText, generateTripRecap, type TripRecapData } from '@/lib/services/recapService';
import { EmptyStatePremium } from '@/components/ui';
import { PageHeader } from '@/components/layout';
import {
  BanterSection,
  HeroBanner,
  LeaderboardSection,
  MatchesSection,
  OverviewSection,
  PhotosSection,
  RECAP_SECTIONS,
  StatsSection,
  type RecapSection,
} from '@/components/recap/RecapPageSections';

export default function RecapPageClient() {
  const router = useRouter();
  const { currentTrip } = useTripStore(useShallow(s => ({ currentTrip: s.currentTrip })));
  const [recap, setRecap] = useState<TripRecapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<RecapSection>('overview');

  const loadRecap = useCallback(async () => {
    if (!currentTrip) {
      setRecap(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const data = await generateTripRecap(currentTrip.id);
      setRecap(data);
    } catch {
      setRecap(null);
    } finally {
      setLoading(false);
    }
  }, [currentTrip]);

  useEffect(() => {
    void loadRecap();
  }, [loadRecap]);

  const handleShare = useCallback(async () => {
    if (!recap) {
      return;
    }

    const text = buildRecapShareText(recap);
    try {
      if (navigator.share) {
        await navigator.share({ title: `${recap.tripName} Recap`, text });
      } else {
        await navigator.clipboard.writeText(text);
      }
    } catch {
      // Share cancelled or unavailable.
    }
  }, [recap]);

  if (!currentTrip) {
    return (
      <div className="min-h-screen page-premium-enter texture-grain bg-[var(--canvas)]">
        <main className="container-editorial py-12">
          <EmptyStatePremium
            illustration="scorecard"
            title="No trip selected"
            description="Select a trip to view its recap."
            action={{ label: 'Go Home', onClick: () => router.push('/') }}
            variant="large"
          />
        </main>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen page-premium-enter texture-grain bg-[var(--canvas)]">
        <PageHeader
          title="Trip Recap"
          icon={<Trophy size={16} className="text-[var(--color-accent)]" />}
          onBack={() => router.back()}
        />
        <main className="container-editorial py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-56 rounded-2xl bg-[var(--surface-elevated)]" />
            <div className="h-10 rounded-lg bg-[var(--surface-elevated)] w-3/4 mx-auto" />
            <div className="grid grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((key) => (
                <div key={key} className="h-24 rounded-xl bg-[var(--surface-elevated)]" />
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!recap) {
    return (
      <div className="min-h-screen page-premium-enter texture-grain bg-[var(--canvas)]">
        <PageHeader
          title="Trip Recap"
          icon={<Trophy size={16} className="text-[var(--color-accent)]" />}
          onBack={() => router.back()}
        />
        <main className="container-editorial py-12">
          <EmptyStatePremium
            illustration="scorecard"
            title="No recap data"
            description="Complete some matches to generate your trip recap."
            action={{ label: 'Go to Matchups', onClick: () => router.push('/matchups') }}
            variant="large"
          />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen page-premium-enter texture-grain bg-[var(--canvas)]">
      <PageHeader
        title="Trip Recap"
        subtitle={recap.tripName}
        icon={<Trophy size={16} className="text-[var(--color-accent)]" />}
        onBack={() => router.back()}
        rightSlot={
          <button
            onClick={handleShare}
            className="p-2 rounded-lg bg-[var(--surface-card)] border border-[var(--rule)]"
            aria-label="Share recap"
          >
            <Share2 size={18} />
          </button>
        }
      />

      <main className="container-editorial py-6 pb-[var(--space-12)]">
        <HeroBanner recap={recap} />

        <div className="flex gap-2 overflow-x-auto pb-2 mt-6 -mx-1 px-1 scrollbar-hide">
          {RECAP_SECTIONS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveSection(id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                activeSection === id
                  ? 'bg-[var(--masters)] text-[var(--canvas)]'
                  : 'bg-[var(--surface-card)] text-[var(--ink-tertiary)] border border-[var(--rule)]'
              }`}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>

        <div className="mt-6">
          {activeSection === 'overview' ? <OverviewSection recap={recap} /> : null}
          {activeSection === 'leaderboard' ? <LeaderboardSection recap={recap} /> : null}
          {activeSection === 'matches' ? <MatchesSection recap={recap} /> : null}
          {activeSection === 'stats' ? <StatsSection recap={recap} /> : null}
          {activeSection === 'banter' ? <BanterSection recap={recap} /> : null}
          {activeSection === 'photos' ? <PhotosSection recap={recap} /> : null}
        </div>
      </main>
    </div>
  );
}
