'use client';

import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { useTripStore, useUIStore } from '@/lib/stores';
import { generateTripSettlement } from '@/lib/services/extendedSideGamesService';
import type { TripSettlementSummary, SettlementTransaction } from '@/lib/types/sideGames';
import {
  DollarSign,
  ArrowRight,
  Check,
  ChevronDown,
  ChevronRight,
  Calculator,
  Wallet,
} from 'lucide-react';

/**
 * SETTLEMENT VIEW — "Who Owes Who" Calculator
 *
 * Aggregates all side game results (Wolf, Vegas, Hammer, Nassau, Skins)
 * into a simplified list of payments between players.
 */

export default function SettlementView() {
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

  // Calculate settlement
  const settlement: TripSettlementSummary | null = useMemo(() => {
    if (!currentTrip || !wolfGames || !vegasGames || !hammerGames || !nassauGames) {
      return null;
    }

    // Extract skins results from completed skins bets
    const skinsResults = (sideBets ?? [])
      .filter((b) => b.type === 'skins' && b.status === 'completed' && b.winnerId)
      .flatMap((b) => {
        const pot = b.pot || 0;
        const participants = b.participantIds || [];
        const perPlayer = participants.length > 0 ? pot / participants.length : 0;
        return participants.map((id) => ({
          playerId: id,
          amount: id === b.winnerId ? pot - perPlayer : -perPlayer,
        }));
      });

    return generateTripSettlement(
      currentTrip.id,
      wolfGames,
      vegasGames,
      hammerGames,
      nassauGames,
      skinsResults,
      players
    );
  }, [currentTrip, wolfGames, vegasGames, hammerGames, nassauGames, sideBets, players]);

  const handleMarkSettled = async (txId: string) => {
    // For now, just show a toast — in a future version this would persist to DB
    showToast('success', 'Marked as settled');
    setExpandedTx(null);
  };

  if (!settlement) {
    return (
      <div className="py-12 text-center">
        <Calculator size={40} className="mx-auto mb-4 text-[var(--ink-tertiary)]" />
        <p className="type-body text-[var(--ink-secondary)]">Loading settlement data...</p>
      </div>
    );
  }

  const hasGames =
    (wolfGames?.length ?? 0) +
      (vegasGames?.length ?? 0) +
      (hammerGames?.length ?? 0) +
      (nassauGames?.length ?? 0) >
    0;

  if (!hasGames && (sideBets?.length ?? 0) === 0) {
    return (
      <div className="py-12 text-center">
        <Wallet size={40} className="mx-auto mb-4 text-[var(--ink-tertiary)]" />
        <p className="type-title-sm mb-2 text-[var(--ink)]">No games to settle</p>
        <p className="type-body-sm text-[var(--ink-secondary)]">
          Completed Wolf, Vegas, Hammer, Nassau, and Skins games will appear here with a &ldquo;who
          owes who&rdquo; summary.
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
      {/* Total pot header */}
      <div
        className="card text-center p-[var(--space-5)] mb-[var(--space-4)] bg-[linear-gradient(135deg,var(--masters)_0%,var(--masters-hover)_100%)] text-[var(--canvas)]"
      >
        <Calculator size={28} className="mx-auto mb-[var(--space-2)] opacity-90" />
        <p className="type-overline opacity-80 mb-[var(--space-1)]">Total Action</p>
        <p className="font-[family-name:var(--font-serif)] text-3xl font-bold">
          ${settlement.totalPot.toFixed(2)}
        </p>
        <p className="type-caption opacity-70 mt-[var(--space-1)]">
          {settlement.transactions.length} payment{settlement.transactions.length !== 1 ? 's' : ''}{' '}
          needed
        </p>
      </div>

      {/* Transaction cards */}
      <div className="flex flex-col gap-[var(--space-3)]">
        {settlement.transactions.map((tx) => (
          <TransactionCard
            key={tx.id}
            tx={tx}
            isExpanded={expandedTx === tx.id}
            onToggle={() => setExpandedTx(expandedTx === tx.id ? null : tx.id)}
            onMarkSettled={() => handleMarkSettled(tx.id)}
          />
        ))}
      </div>

      {/* Player balances summary */}
      <div className="mt-[var(--space-6)]">
        <h3 className="type-overline mb-[var(--space-3)]">Net Balances</h3>
        <div className="card">
          {settlement.playerBalances
            .filter((b) => Math.abs(b.netAmount) > 0.01)
            .sort((a, b) => b.netAmount - a.netAmount)
            .map((balance) => (
              <div
                key={balance.playerId}
                className="flex items-center justify-between py-[var(--space-3)] px-[var(--space-4)] border-b border-[var(--rule)] last:border-b-0"
              >
                <span className="type-body-sm font-medium">{balance.playerName}</span>
                <span
                  className={`type-body-sm font-bold ${
                    balance.netAmount > 0
                      ? 'text-[var(--success)]'
                      : balance.netAmount < 0
                        ? 'text-[var(--error)]'
                        : 'text-[var(--ink-secondary)]'
                  }`}
                >
                  {balance.netAmount >= 0 ? '+' : ''}${balance.netAmount.toFixed(2)}
                </span>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}

/* ============================================
   Transaction Card
   ============================================ */
function TransactionCard({
  tx,
  isExpanded,
  onToggle,
  onMarkSettled,
}: {
  tx: SettlementTransaction;
  isExpanded: boolean;
  onToggle: () => void;
  onMarkSettled: () => void;
}) {
  return (
    <div className="card overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-[var(--space-3)] p-[var(--space-4)] bg-transparent border-none cursor-pointer text-left"
      >
        {/* From player */}
        <div className="flex-1 min-w-0">
          <p className="type-body-sm font-semibold truncate">{tx.fromPlayerName}</p>
          <p className="type-caption text-[var(--ink-tertiary)]">pays</p>
        </div>

        {/* Amount arrow */}
        <div className="flex items-center gap-[var(--space-2)] shrink-0">
          <span className="font-[family-name:var(--font-serif)] text-lg font-bold text-[var(--masters)]">
            ${tx.amount.toFixed(2)}
          </span>
          <ArrowRight size={16} className="text-[var(--ink-tertiary)]" />
        </div>

        {/* To player */}
        <div className="flex-1 min-w-0 text-right">
          <p className="type-body-sm font-semibold truncate">{tx.toPlayerName}</p>
        </div>

        {/* Expand icon */}
        {isExpanded ? (
          <ChevronDown size={16} className="text-[var(--ink-tertiary)] shrink-0" />
        ) : (
          <ChevronRight size={16} className="text-[var(--ink-tertiary)] shrink-0" />
        )}
      </button>

      {/* Expanded breakdown */}
      {isExpanded && (
        <div className="border-t border-[var(--rule)] p-[var(--space-4)]">
          {tx.gameBreakdown.length > 0 && (
            <div className="mb-[var(--space-3)]">
              <p className="type-overline mb-[var(--space-2)]">Breakdown</p>
              {tx.gameBreakdown.map((item, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between py-[var(--space-1)]"
                >
                  <span className="type-caption text-[var(--ink-secondary)]">
                    {item.gameName}
                  </span>
                  <span className="type-caption font-medium">
                    ${item.amount.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Payment shortcuts */}
          <div className="flex flex-col gap-[var(--space-2)]">
            {tx.venmoLink && (
              <a
                href={tx.venmoLink}
                className="btn btn-secondary text-sm text-center"
                target="_blank"
                rel="noopener noreferrer"
              >
                <DollarSign size={14} />
                Pay with Venmo
              </a>
            )}
            {tx.paypalLink && (
              <a
                href={tx.paypalLink}
                className="btn btn-secondary text-sm text-center"
                target="_blank"
                rel="noopener noreferrer"
              >
                <DollarSign size={14} />
                Pay with PayPal
              </a>
            )}
            <button onClick={onMarkSettled} className="btn btn-primary text-sm">
              <Check size={14} />
              Mark as Settled
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
