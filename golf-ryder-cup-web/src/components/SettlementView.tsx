'use client';

import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/db';
import { useTripStore, useUIStore } from '@/lib/stores';
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
  const { currentTrip, players } = useTripStore();
  const { showToast } = useUIStore();
  const [expandedTx, setExpandedTx] = useState<string | null>(null);

  // Load all completed side games from DB
  const wolfGames = useLiveQuery(
    async () => {
      if (!currentTrip) return [];
      return db.wolfGames.where('tripId').equals(currentTrip.id).toArray();
    },
    [currentTrip?.id],
    []
  );

  const vegasGames = useLiveQuery(
    async () => {
      if (!currentTrip) return [];
      return db.vegasGames.where('tripId').equals(currentTrip.id).toArray();
    },
    [currentTrip?.id],
    []
  );

  const hammerGames = useLiveQuery(
    async () => {
      if (!currentTrip) return [];
      return db.hammerGames.where('tripId').equals(currentTrip.id).toArray();
    },
    [currentTrip?.id],
    []
  );

  const nassauGames = useLiveQuery(
    async () => {
      if (!currentTrip) return [];
      return db.nassauGames.where('tripId').equals(currentTrip.id).toArray();
    },
    [currentTrip?.id],
    []
  );

  // Get skins results from side bets
  const sideBets = useLiveQuery(
    async () => {
      if (!currentTrip) return [];
      return db.sideBets.where('tripId').equals(currentTrip.id).toArray();
    },
    [currentTrip?.id],
    []
  );

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
