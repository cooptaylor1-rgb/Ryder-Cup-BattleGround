'use client';

import type { TripSettlementSummary, SettlementTransaction } from '@/lib/types/sideGames';
import { ArrowRight, Calculator, Check, ChevronDown, ChevronRight, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export function SettlementSummaryCard({ settlement }: { settlement: TripSettlementSummary }) {
  return (
    <div className="card mb-[var(--space-4)] bg-[linear-gradient(135deg,var(--masters)_0%,var(--masters-hover)_100%)] p-[var(--space-5)] text-center text-[var(--canvas)]">
      <Calculator size={28} className="mx-auto mb-[var(--space-2)] opacity-90" />
      <p className="type-overline mb-[var(--space-1)] opacity-80">Total Action</p>
      <p className="font-[family-name:var(--font-serif)] text-3xl font-bold">
        ${settlement.totalPot.toFixed(2)}
      </p>
      <p className="type-caption mt-[var(--space-1)] opacity-70">
        {settlement.transactions.length} payment{settlement.transactions.length !== 1 ? 's' : ''} needed
      </p>
    </div>
  );
}

export function SettlementTransactionsList({
  transactions,
  expandedTx,
  onToggle,
  onMarkSettled,
}: {
  transactions: TripSettlementSummary['transactions'];
  expandedTx: string | null;
  onToggle: (transactionId: string) => void;
  onMarkSettled: (transactionId: string) => void;
}) {
  return (
    <div className="flex flex-col gap-[var(--space-3)]">
      {transactions.map((transaction) => (
        <TransactionCard
          key={transaction.id}
          tx={transaction}
          isExpanded={expandedTx === transaction.id}
          onToggle={() => onToggle(transaction.id)}
          onMarkSettled={() => onMarkSettled(transaction.id)}
        />
      ))}
    </div>
  );
}

export function SettlementBalancesSection({ settlement }: { settlement: TripSettlementSummary }) {
  return (
    <div className="mt-[var(--space-6)]">
      <h3 className="type-overline mb-[var(--space-3)]">Net Balances</h3>
      <div className="card">
        {settlement.playerBalances
          .filter((balance) => Math.abs(balance.netAmount) > 0.01)
          .sort((left, right) => right.netAmount - left.netAmount)
          .map((balance) => (
            <div
              key={balance.playerId}
              className="flex items-center justify-between border-b border-[var(--rule)] px-[var(--space-4)] py-[var(--space-3)] last:border-b-0"
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
  );
}

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
        type="button"
        onClick={onToggle}
        className="flex w-full cursor-pointer items-center gap-[var(--space-3)] border-none bg-transparent p-[var(--space-4)] text-left"
      >
        <div className="min-w-0 flex-1">
          <p className="type-body-sm truncate font-semibold">{tx.fromPlayerName}</p>
          <p className="type-caption text-[var(--ink-tertiary)]">pays</p>
        </div>

        <div className="shrink-0 flex items-center gap-[var(--space-2)]">
          <span className="font-[family-name:var(--font-serif)] text-lg font-bold text-[var(--masters)]">
            ${tx.amount.toFixed(2)}
          </span>
          <ArrowRight size={16} className="text-[var(--ink-tertiary)]" />
        </div>

        <div className="min-w-0 flex-1 text-right">
          <p className="type-body-sm truncate font-semibold">{tx.toPlayerName}</p>
        </div>

        {isExpanded ? (
          <ChevronDown size={16} className="shrink-0 text-[var(--ink-tertiary)]" />
        ) : (
          <ChevronRight size={16} className="shrink-0 text-[var(--ink-tertiary)]" />
        )}
      </button>

      {isExpanded ? (
        <div className="border-t border-[var(--rule)] p-[var(--space-4)]">
          {tx.gameBreakdown.length > 0 ? (
            <div className="mb-[var(--space-3)]">
              <p className="type-overline mb-[var(--space-2)]">Breakdown</p>
              {tx.gameBreakdown.map((item, index) => (
                <div key={index} className="flex items-center justify-between py-[var(--space-1)]">
                  <span className="type-caption text-[var(--ink-secondary)]">{item.gameName}</span>
                  <span className="type-caption font-medium">${item.amount.toFixed(2)}</span>
                </div>
              ))}
            </div>
          ) : null}

          <div className="flex flex-col gap-[var(--space-2)]">
            {tx.venmoLink ? (
              <a
                href={tx.venmoLink}
                className="btn btn-secondary text-center text-sm"
                target="_blank"
                rel="noopener noreferrer"
              >
                <DollarSign size={14} />
                Pay with Venmo
              </a>
            ) : null}
            {tx.paypalLink ? (
              <a
                href={tx.paypalLink}
                className="btn btn-secondary text-center text-sm"
                target="_blank"
                rel="noopener noreferrer"
              >
                <DollarSign size={14} />
                Pay with PayPal
              </a>
            ) : null}
            <Button
              variant="primary"
              size="sm"
              onClick={onMarkSettled}
              leftIcon={<Check size={14} />}
            >
              Mark as Settled
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
