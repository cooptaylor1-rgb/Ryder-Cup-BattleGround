'use client';

import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/db';
import { useTripStore, useToastStore } from '@/lib/stores';
import { useShallow } from 'zustand/shallow';
import {
  SettlementBalancesSection,
  SettlementSummaryCard,
  SettlementTransactionsList,
} from '@/components/bets/SettlementViewSections';
import {
  buildTripSettlementSummary,
  getSettlementActivitySummary,
} from '@/lib/services/tripSettlementService';
import { EmptyStatePremium } from '@/components/ui/EmptyStatePremium';
import type { TripSettlementSummary } from '@/lib/types/sideGames';
import { Check, Calculator, Wallet } from 'lucide-react';

/**
 * SETTLEMENT VIEW — "Who Owes Who" Calculator
 *
 * Aggregates all side game results (Wolf, Vegas, Hammer, Nassau, Skins)
 * into a simplified list of payments between players.
 */

export default function SettlementView() {
  const router = useRouter();
  const { currentTrip, players } = useTripStore(useShallow(s => ({ currentTrip: s.currentTrip, players: s.players })));
  const { showToast } = useToastStore(useShallow(s => ({ showToast: s.showToast })));
  const [expandedTx, setExpandedTx] = useState<string | null>(null);

  // Load all side game data in a single batched query (avoids 5 separate DB round-trips)
  const sideGameData = useLiveQuery(
    async () => {
      if (!currentTrip) return { wolfGames: [], vegasGames: [], hammerGames: [], nassauGames: [], sideBets: [] };
      const tripId = currentTrip.id;
      const [wolfGames, vegasGames, hammerGames, nassauGames, sideBets] = await Promise.all([
        db.wolfGames.where('tripId').equals(tripId).toArray(),
        db.vegasGames.where('tripId').equals(tripId).toArray(),
        db.hammerGames.where('tripId').equals(tripId).toArray(),
        db.nassauGames.where('tripId').equals(tripId).toArray(),
        db.sideBets.where('tripId').equals(tripId).toArray(),
      ]);
      return { wolfGames, vegasGames, hammerGames, nassauGames, sideBets };
    },
    [currentTrip?.id],
    { wolfGames: [], vegasGames: [], hammerGames: [], nassauGames: [], sideBets: [] }
  );

  const { wolfGames, vegasGames, hammerGames, nassauGames, sideBets } = sideGameData;

  const activitySummary = useMemo(() => {
    if (!currentTrip) {
      return null;
    }

    return getSettlementActivitySummary({
      wolfGames,
      vegasGames,
      hammerGames,
      nassauGames,
      sideBets,
    });
  }, [currentTrip, wolfGames, vegasGames, hammerGames, nassauGames, sideBets]);

  // Calculate settlement from completed games only
  const settlement: TripSettlementSummary | null = useMemo(() => {
    if (!currentTrip) {
      return null;
    }

    return buildTripSettlementSummary({
      tripId: currentTrip.id,
      wolfGames,
      vegasGames,
      hammerGames,
      nassauGames,
      sideBets,
      players,
    });
  }, [currentTrip, wolfGames, vegasGames, hammerGames, nassauGames, sideBets, players]);

  const handleMarkSettled = async (_txId: string) => {
    // For now, just show a toast — in a future version this would persist to DB
    showToast('success', 'Marked as settled');
    setExpandedTx(null);
  };

  if (!currentTrip) {
    return (
      <div className="py-12">
        <EmptyStatePremium
          illustration="trophy"
          title="No active trip"
          description="Create or join a trip to see a settlement summary for side games."
          variant="compact"
          action={{
            label: 'Create a trip',
            onClick: () => router.push('/trip/new'),
          }}
          secondaryAction={{
            label: 'Join a trip',
            onClick: () => router.push('/join'),
          }}
        />
      </div>
    );
  }

  if (!settlement) {
    return (
      <div className="py-12 text-center">
        <Calculator size={40} className="mx-auto mb-4 text-[var(--ink-tertiary)]" />
        <p className="type-body text-[var(--ink-secondary)]">Loading settlement data...</p>
      </div>
    );
  }

  if (!activitySummary?.hasSettleableActivity) {
    return (
      <div className="py-12 text-center">
        <Wallet size={40} className="mx-auto mb-4 text-[var(--ink-tertiary)]" />
        <p className="type-title-sm mb-2 text-[var(--ink)]">No games to settle</p>
        <p className="type-body-sm text-[var(--ink-secondary)]">
          Completed Wolf, Vegas, Hammer, Nassau, and Skins results will appear here with a &ldquo;who
          owes who&rdquo; summary once they are actually ready to settle.
        </p>
      </div>
    );
  }

  if (settlement.transactions.length === 0) {
    return (
      <div className="py-12 text-center">
        <Check size={40} className="mx-auto mb-4 text-[var(--success)]" />
        <p className="type-title-sm mb-2 text-[var(--ink)]">All square</p>
        <p className="type-body-sm text-[var(--ink-secondary)]">
          No one owes anyone. Everyone broke even!
        </p>
      </div>
    );
  }

  return (
    <div>
      <SettlementSummaryCard settlement={settlement} />
      <SettlementTransactionsList
        transactions={settlement.transactions}
        expandedTx={expandedTx}
        onToggle={(transactionId) =>
          setExpandedTx((current) => (current === transactionId ? null : transactionId))
        }
        onMarkSettled={(transactionId) => {
          void handleMarkSettled(transactionId);
        }}
      />
      <SettlementBalancesSection settlement={settlement} />
    </div>
  );
}
