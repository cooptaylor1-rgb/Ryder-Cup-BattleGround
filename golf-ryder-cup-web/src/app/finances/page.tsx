'use client';

import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  AlertCircle,
  Car,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Coins,
  DollarSign,
  Flag,
  Home,
  Plus,
  Receipt,
  Users,
  UtensilsCrossed,
} from 'lucide-react';
import { PageHeader } from '@/components/layout';
import { Button } from '@/components/ui/Button';
import { EmptyStatePremium, PageLoadingSkeleton } from '@/components/ui';
import { db } from '@/lib/db';
import { createBulkDues, markAsPaid } from '@/lib/services/duesService';
import { useTripStore, useUIStore } from '@/lib/stores';
import { createLogger } from '@/lib/utils/logger';
import type {
  DuesCategory,
  DuesLineItem,
  PaymentRecord,
  PlayerFinancialSummary,
  TripFinancialSummary,
} from '@/lib/types/finances';
import { DUES_CATEGORIES } from '@/lib/types/finances';
import { cn } from '@/lib/utils';

type TabType = 'overview' | 'add_charge' | 'payments';

const logger = createLogger('finances');

const CATEGORY_ICONS: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  Flag,
  Car,
  Home,
  UtensilsCrossed,
  Coins,
  DollarSign,
  Receipt,
  Gavel: Receipt,
};

function formatCents(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function FinancesPage() {
  const router = useRouter();
  const { currentTrip, players } = useTripStore();
  const { isCaptainMode, showToast } = useUIStore();

  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [expandedPlayerId, setExpandedPlayerId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [chargeCategory, setChargeCategory] = useState<DuesCategory>('green_fee');
  const [chargeDescription, setChargeDescription] = useState('');
  const [chargeAmount, setChargeAmount] = useState('');
  const [applyToAll, setApplyToAll] = useState(true);
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);

  const duesItems = useLiveQuery(
    async () => {
      if (!currentTrip) {
        return [];
      }

      return db.duesLineItems.where('tripId').equals(currentTrip.id).toArray();
    },
    [currentTrip?.id],
    []
  );

  const paymentRecords = useLiveQuery(
    async () => {
      if (!currentTrip) {
        return [];
      }

      return db.paymentRecords.where('tripId').equals(currentTrip.id).toArray();
    },
    [currentTrip?.id],
    []
  );

  const summary = useMemo<TripFinancialSummary | undefined>(() => {
    if (!currentTrip || !duesItems) {
      return undefined;
    }

    const playerSummaries: PlayerFinancialSummary[] = players.map((player) => {
      const lineItems = duesItems.filter((item) => item.playerId === player.id);
      const payments = (paymentRecords ?? []).filter((payment) => payment.fromPlayerId === player.id);
      const totalDues = lineItems.reduce((sum, item) => sum + item.amount, 0);
      const totalPaid = lineItems.reduce((sum, item) => sum + item.amountPaid, 0);

      return {
        playerId: player.id,
        playerName: `${player.firstName}${player.lastName ? ` ${player.lastName}` : ''}`,
        totalDues,
        totalPaid,
        balance: totalDues - totalPaid,
        lineItems,
        payments,
      };
    });

    const totalCollectable = playerSummaries.reduce((sum, playerSummary) => sum + playerSummary.totalDues, 0);
    const totalCollected = playerSummaries.reduce((sum, playerSummary) => sum + playerSummary.totalPaid, 0);

    return {
      tripId: currentTrip.id,
      totalCollectable,
      totalCollected,
      outstandingBalance: totalCollectable - totalCollected,
      playerSummaries,
      delinquent: playerSummaries.filter((playerSummary) => playerSummary.balance > 0).sort((left, right) => right.balance - left.balance),
      isFullySettled: totalCollectable > 0 && totalCollectable === totalCollected,
    };
  }, [currentTrip, duesItems, paymentRecords, players]);

  const handleMarkPaid = useCallback(
    async (lineItemId: string) => {
      if (isSubmitting) {
        return;
      }

      setIsSubmitting(true);
      try {
        await markAsPaid(lineItemId, 'cash', 'captain');
        showToast('success', 'Marked as paid');
      } catch (error) {
        logger.error('Failed to mark as paid', { error });
        showToast('error', 'Failed to update payment');
      } finally {
        setIsSubmitting(false);
      }
    },
    [isSubmitting, showToast]
  );

  const handleAddCharge = useCallback(async () => {
    if (!currentTrip || isSubmitting) {
      return;
    }

    const parsedAmount = parseFloat(chargeAmount);
    if (!chargeDescription.trim()) {
      showToast('error', 'Please enter a description');
      return;
    }

    if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      showToast('error', 'Please enter a valid amount');
      return;
    }

    const targetPlayerIds = applyToAll ? players.map((player) => player.id) : selectedPlayerIds;
    if (targetPlayerIds.length === 0) {
      showToast('error', 'Please select at least one player');
      return;
    }

    setIsSubmitting(true);
    try {
      await createBulkDues(
        currentTrip.id,
        targetPlayerIds,
        chargeCategory,
        chargeDescription.trim(),
        Math.round(parsedAmount * 100),
        'captain'
      );

      showToast('success', `Charge added for ${targetPlayerIds.length} player${targetPlayerIds.length === 1 ? '' : 's'}`);
      setChargeCategory('green_fee');
      setChargeDescription('');
      setChargeAmount('');
      setApplyToAll(true);
      setSelectedPlayerIds([]);
      setActiveTab('overview');
    } catch (error) {
      logger.error('Failed to create charge', { error });
      showToast('error', 'Failed to add charge');
    } finally {
      setIsSubmitting(false);
    }
  }, [applyToAll, chargeAmount, chargeCategory, chargeDescription, currentTrip, isSubmitting, players, selectedPlayerIds, showToast]);

  const togglePlayerSelection = useCallback((playerId: string) => {
    setSelectedPlayerIds((current) =>
      current.includes(playerId) ? current.filter((id) => id !== playerId) : [...current, playerId]
    );
  }, []);

  if (!currentTrip) {
    return (
      <div className="min-h-screen page-premium-enter texture-grain bg-[var(--canvas)]">
        <PageHeader
          title="Finances"
          subtitle="No active trip"
          icon={<DollarSign size={16} className="text-[var(--canvas)]" />}
          iconContainerClassName="bg-[linear-gradient(135deg,var(--masters)_0%,var(--masters-deep)_100%)]"
          onBack={() => router.back()}
        />

        <main className="container-editorial py-12">
          <EmptyStatePremium
            illustration="golf-ball"
            title="No active trip"
            description="Start or select a trip before opening the ledger."
            action={{
              label: 'Back home',
              onClick: () => router.push('/'),
            }}
            variant="large"
          />
        </main>
      </div>
    );
  }

  if (!summary) {
    return <PageLoadingSkeleton title="Finances" showBackButton variant="list" />;
  }

  const hasDues = duesItems.length > 0;
  const owingPlayers = summary.playerSummaries.filter((playerSummary) => playerSummary.totalDues > 0).length;
  const settledPlayers = summary.playerSummaries.filter((playerSummary) => playerSummary.totalDues > 0 && playerSummary.balance === 0).length;
  const collectionProgress = summary.totalCollectable > 0 ? Math.round((summary.totalCollected / summary.totalCollectable) * 100) : 0;
  const chargeAmountCents = Math.round((parseFloat(chargeAmount) || 0) * 100);
  const chargeTargetCount = applyToAll ? players.length : selectedPlayerIds.length;
  const chargeTotalCents = chargeAmountCents * chargeTargetCount;

  return (
    <div className="min-h-screen page-premium-enter texture-grain bg-[var(--canvas)]">
      <PageHeader
        title="Finances"
        subtitle={currentTrip.name}
        icon={<DollarSign size={16} className="text-[var(--canvas)]" />}
        iconContainerClassName="bg-[linear-gradient(135deg,var(--masters)_0%,var(--masters-deep)_100%)]"
        onBack={() => router.back()}
        rightSlot={
          isCaptainMode ? (
            <Button variant="outline" size="sm" leftIcon={<Plus size={14} />} onClick={() => setActiveTab('add_charge')}>
              Charge
            </Button>
          ) : undefined
        }
      />

      <main className="container-editorial py-[var(--space-6)] pb-[var(--space-12)]">
        <section className="overflow-hidden rounded-[2rem] border border-[var(--masters)]/14 bg-[linear-gradient(135deg,rgba(10,80,48,0.97),rgba(4,52,30,0.98))] text-[var(--canvas)] shadow-[0_28px_64px_rgba(5,58,35,0.22)]">
          <div className="grid gap-[var(--space-5)] px-[var(--space-5)] py-[var(--space-5)] lg:grid-cols-[minmax(0,1.2fr)_18rem]">
            <div>
              <p className="type-overline tracking-[0.18em] text-[color:var(--canvas)]/72">Ledger Room</p>
              <h1 className="mt-[var(--space-2)] font-serif text-[clamp(2rem,7vw,3.2rem)] italic leading-[1.02] text-[var(--canvas)]">
                Money should feel organized long before the settlement text starts.
              </h1>
              <p className="mt-[var(--space-3)] max-w-[36rem] text-sm leading-7 text-[color:var(--canvas)]/80">
                The point of this room is not complexity. It is calm. Green fees, carts, lodging, and side expenses
                should sit in one clean ledger instead of leaking into a dozen awkward conversations.
              </p>
            </div>

            <div className="grid gap-[var(--space-3)] sm:grid-cols-3 lg:grid-cols-1">
              <FinanceFactCard label="Collected" value={formatCents(summary.totalCollected)} detail="Confirmed money already on the books." />
              <FinanceFactCard label="Outstanding" value={formatCents(summary.outstandingBalance)} detail="Still sitting out in the group." />
              <FinanceFactCard label="Settled players" value={`${settledPlayers}/${owingPlayers || players.length}`} detail="How many people are actually done." valueClassName="font-sans text-[1rem] not-italic leading-[1.25]" />
            </div>
          </div>
        </section>

        <section className="mt-[var(--space-6)] flex flex-wrap gap-[var(--space-3)]">
          <FinanceTabButton active={activeTab === 'overview'} label="Overview" icon={<DollarSign size={15} />} onClick={() => setActiveTab('overview')} />
          {isCaptainMode ? (
            <FinanceTabButton active={activeTab === 'add_charge'} label="Add charge" icon={<Plus size={15} />} onClick={() => setActiveTab('add_charge')} />
          ) : null}
          <FinanceTabButton active={activeTab === 'payments'} label="Payments" icon={<Receipt size={15} />} onClick={() => setActiveTab('payments')} />
        </section>

        {activeTab === 'overview' ? (
          <section className="mt-[var(--space-6)] grid gap-[var(--space-4)] xl:grid-cols-[minmax(0,1.14fr)_18rem]">
            <div className="space-y-[var(--space-4)]">
              {hasDues ? (
                <LedgerSummaryPanel
                  totalCollectable={summary.totalCollectable}
                  totalCollected={summary.totalCollected}
                  progress={collectionProgress}
                  settledPlayers={settledPlayers}
                  owingPlayers={owingPlayers}
                  isFullySettled={summary.isFullySettled}
                  outstandingBalance={summary.outstandingBalance}
                />
              ) : (
                <EmptyStatePremium
                  illustration="golf-ball"
                  title="No charges yet"
                  description="The ledger is empty. Add the first green fee, cart bill, or lodging split when the captain is ready."
                  action={
                    isCaptainMode
                      ? {
                          label: 'Add first charge',
                          onClick: () => setActiveTab('add_charge'),
                          icon: <Plus size={16} />,
                        }
                      : undefined
                  }
                  variant="large"
                />
              )}

              {hasDues ? (
                <section className="space-y-[var(--space-3)]">
                  {summary.playerSummaries
                    .filter((playerSummary) => playerSummary.totalDues > 0)
                    .map((playerSummary) => (
                      <PlayerLedgerCard
                        key={playerSummary.playerId}
                        playerSummary={playerSummary}
                        expanded={expandedPlayerId === playerSummary.playerId}
                        onToggle={() =>
                          setExpandedPlayerId((current) => (current === playerSummary.playerId ? null : playerSummary.playerId))
                        }
                        onMarkPaid={handleMarkPaid}
                        isCaptainMode={isCaptainMode}
                        isSubmitting={isSubmitting}
                      />
                    ))}
                </section>
              ) : null}
            </div>

            <aside className="space-y-[var(--space-4)]">
              <SidebarNote
                title="The best ledger feels dull"
                body="If the money room is exciting, something already went wrong. Calmness is the design goal here."
              />
              <SidebarNote
                title="Captains need one charging desk"
                body="Charges should originate from one composed place instead of popping up ad hoc around the app."
                tone="green"
              />
            </aside>
          </section>
        ) : null}

        {activeTab === 'add_charge' && isCaptainMode ? (
          <section className="mt-[var(--space-6)] grid gap-[var(--space-4)] xl:grid-cols-[minmax(0,1.08fr)_18rem]">
            <ChargeComposer
              chargeCategory={chargeCategory}
              setChargeCategory={setChargeCategory}
              chargeDescription={chargeDescription}
              setChargeDescription={setChargeDescription}
              chargeAmount={chargeAmount}
              setChargeAmount={setChargeAmount}
              applyToAll={applyToAll}
              setApplyToAll={setApplyToAll}
              selectedPlayerIds={selectedPlayerIds}
              players={players}
              togglePlayerSelection={togglePlayerSelection}
              chargeTargetCount={chargeTargetCount}
              chargeTotalCents={chargeTotalCents}
              onSubmit={handleAddCharge}
              isSubmitting={isSubmitting}
            />

            <aside className="space-y-[var(--space-4)]">
              <SidebarNote
                title="Charge once, explain once"
                body="The cleaner the description is at creation time, the fewer settlement questions the captain gets later."
              />
              <SidebarNote
                title="Per-player amounts only"
                body="This room works best when the unit is always obvious: per-player, then multiplied by the selected group."
                tone="green"
              />
            </aside>
          </section>
        ) : null}

        {activeTab === 'payments' ? (
          <section className="mt-[var(--space-6)] grid gap-[var(--space-4)] xl:grid-cols-[minmax(0,1.12fr)_18rem]">
            <PaymentsPanel paymentRecords={paymentRecords} players={players} />

            <aside className="space-y-[var(--space-4)]">
              <SidebarNote
                title="Receipts need sequence"
                body="Chronology beats cleverness here. People want to know who paid, when, and by what method."
              />
            </aside>
          </section>
        ) : null}
      </main>
    </div>
  );
}

function FinanceTabButton({
  active,
  label,
  icon,
  onClick,
}: {
  active: boolean;
  label: string;
  icon: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-transform duration-150 hover:scale-[1.01]',
        active
          ? 'border-[var(--masters)]/24 bg-[color:var(--masters)]/10 text-[var(--masters)]'
          : 'border-[color:var(--rule)]/70 bg-[color:var(--surface)]/78 text-[var(--ink-secondary)]'
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function LedgerSummaryPanel({
  totalCollectable,
  totalCollected,
  progress,
  settledPlayers,
  owingPlayers,
  isFullySettled,
  outstandingBalance,
}: {
  totalCollectable: number;
  totalCollected: number;
  progress: number;
  settledPlayers: number;
  owingPlayers: number;
  isFullySettled: boolean;
  outstandingBalance: number;
}) {
  return (
    <section className="rounded-[1.85rem] border border-[color:var(--rule)]/75 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(244,238,231,0.99))] p-[var(--space-5)] shadow-[0_18px_38px_rgba(41,29,17,0.06)]">
      <div className="flex flex-wrap items-end justify-between gap-[var(--space-4)]">
        <div>
          <p className="type-overline tracking-[0.16em] text-[var(--ink-tertiary)]">Collection Progress</p>
          <p className="mt-[var(--space-2)] font-serif text-[2.4rem] italic leading-none text-[var(--masters)]">
            {formatCents(totalCollected)}
          </p>
          <p className="mt-[var(--space-2)] text-sm text-[var(--ink-secondary)]">collected of {formatCents(totalCollectable)}</p>
        </div>
        <div className="text-right">
          <p className="type-overline tracking-[0.16em] text-[var(--ink-tertiary)]">Players settled</p>
          <p className="mt-[var(--space-2)] font-serif text-[2rem] italic leading-none text-[var(--ink)]">
            {settledPlayers}/{owingPlayers}
          </p>
        </div>
      </div>

      <div className="mt-[var(--space-4)] h-3 overflow-hidden rounded-full bg-[var(--surface-raised)]">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500',
            isFullySettled ? 'bg-[var(--success)]' : 'bg-[linear-gradient(90deg,var(--masters),var(--masters-deep))]'
          )}
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="mt-[var(--space-4)] flex items-center justify-between gap-[var(--space-3)]">
        <p className="text-sm text-[var(--ink-secondary)]">{progress}% of the ledger collected</p>
        {isFullySettled ? (
          <div className="inline-flex items-center gap-2 rounded-full bg-[color:var(--success)]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--success)]">
            <CheckCircle2 size={14} />
            Settled
          </div>
        ) : (
          <p className="text-sm font-medium text-[var(--ink)]">{formatCents(outstandingBalance)} outstanding</p>
        )}
      </div>
    </section>
  );
}

function PlayerLedgerCard({
  playerSummary,
  expanded,
  onToggle,
  onMarkPaid,
  isCaptainMode,
  isSubmitting,
}: {
  playerSummary: PlayerFinancialSummary;
  expanded: boolean;
  onToggle: () => void;
  onMarkPaid: (lineItemId: string) => void;
  isCaptainMode: boolean;
  isSubmitting: boolean;
}) {
  const isPaid = playerSummary.balance === 0 && playerSummary.totalDues > 0;
  const isPartial = playerSummary.totalPaid > 0 && playerSummary.balance > 0;

  return (
    <section className="rounded-[1.75rem] border border-[color:var(--rule)]/75 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(244,238,231,0.99))] shadow-[0_16px_34px_rgba(41,29,17,0.05)]">
      <button type="button" onClick={onToggle} className="flex w-full items-center justify-between gap-[var(--space-4)] px-[var(--space-5)] py-[var(--space-4)] text-left">
        <div className="flex items-center gap-[var(--space-3)]">
          {expanded ? <ChevronDown size={18} className="text-[var(--ink-tertiary)]" /> : <ChevronRight size={18} className="text-[var(--ink-tertiary)]" />}
          <div>
            <p className="text-sm font-semibold text-[var(--ink)]">{playerSummary.playerName}</p>
            <p className="mt-[2px] text-xs uppercase tracking-[0.14em] text-[var(--ink-tertiary)]">
              {formatCents(playerSummary.totalPaid)} paid of {formatCents(playerSummary.totalDues)}
            </p>
          </div>
        </div>

        {isPaid ? (
          <span className="inline-flex items-center gap-2 rounded-full bg-[color:var(--success)]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--success)]">
            <CheckCircle2 size={14} />
            Paid
          </span>
        ) : isPartial ? (
          <span className="rounded-full bg-[color:var(--warning)]/12 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--warning)]">
            Partial
          </span>
        ) : (
          <span className="inline-flex items-center gap-2 rounded-full bg-[color:var(--error)]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--error)]">
            <AlertCircle size={14} />
            Unpaid
          </span>
        )}
      </button>

      {expanded ? (
        <div className="border-t border-[color:var(--rule)]/70 px-[var(--space-5)] py-[var(--space-4)]">
          <div className="space-y-[var(--space-3)]">
            {playerSummary.lineItems.map((lineItem) => (
              <LineItemRow
                key={lineItem.id}
                lineItem={lineItem}
                onMarkPaid={onMarkPaid}
                isCaptainMode={isCaptainMode}
                isSubmitting={isSubmitting}
              />
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function LineItemRow({
  lineItem,
  onMarkPaid,
  isCaptainMode,
  isSubmitting,
}: {
  lineItem: DuesLineItem;
  onMarkPaid: (lineItemId: string) => void;
  isCaptainMode: boolean;
  isSubmitting: boolean;
}) {
  const category = DUES_CATEGORIES[lineItem.category];
  const Icon = CATEGORY_ICONS[category.icon] || Receipt;

  return (
    <div className="flex items-center justify-between gap-[var(--space-4)] rounded-[1.15rem] bg-[color:var(--surface)]/82 px-[var(--space-4)] py-[var(--space-3)]">
      <div className="flex min-w-0 items-center gap-[var(--space-3)]">
        <div className="flex h-10 w-10 items-center justify-center rounded-[1rem] bg-[color:var(--surface-raised)] text-[var(--ink-tertiary)]">
          <Icon size={16} />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[var(--ink)]">{lineItem.description}</p>
          <p className="mt-[2px] text-xs uppercase tracking-[0.14em] text-[var(--ink-tertiary)]">{category.label}</p>
        </div>
      </div>

      <div className="flex items-center gap-[var(--space-3)]">
        <p
          className={cn(
            'text-sm font-semibold',
            lineItem.status === 'paid'
              ? 'text-[var(--success)]'
              : lineItem.status === 'partial'
                ? 'text-[var(--warning)]'
                : 'text-[var(--ink)]'
          )}
        >
          {formatCents(lineItem.amount)}
        </p>
        {isCaptainMode && lineItem.status !== 'paid' && lineItem.status !== 'waived' ? (
          <Button size="sm" variant="primary" disabled={isSubmitting} onClick={() => onMarkPaid(lineItem.id)}>
            Mark paid
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function ChargeComposer({
  chargeCategory,
  setChargeCategory,
  chargeDescription,
  setChargeDescription,
  chargeAmount,
  setChargeAmount,
  applyToAll,
  setApplyToAll,
  selectedPlayerIds,
  players,
  togglePlayerSelection,
  chargeTargetCount,
  chargeTotalCents,
  onSubmit,
  isSubmitting,
}: {
  chargeCategory: DuesCategory;
  setChargeCategory: (value: DuesCategory) => void;
  chargeDescription: string;
  setChargeDescription: (value: string) => void;
  chargeAmount: string;
  setChargeAmount: (value: string) => void;
  applyToAll: boolean;
  setApplyToAll: (value: boolean) => void;
  selectedPlayerIds: string[];
  players: Array<{ id: string; firstName: string; lastName?: string }>;
  togglePlayerSelection: (playerId: string) => void;
  chargeTargetCount: number;
  chargeTotalCents: number;
  onSubmit: () => void;
  isSubmitting: boolean;
}) {
  const categories = Object.entries(DUES_CATEGORIES) as Array<[DuesCategory, { label: string; icon: string; color: string }]>;

  return (
    <section className="rounded-[1.9rem] border border-[color:var(--rule)]/75 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(244,238,231,0.99))] p-[var(--space-5)] shadow-[0_18px_38px_rgba(41,29,17,0.06)]">
      <div>
        <p className="type-overline tracking-[0.16em] text-[var(--ink-tertiary)]">Charge Composer</p>
        <h2 className="mt-[var(--space-2)] font-serif text-[1.9rem] italic text-[var(--ink)]">
          Build the charge once, then let the ledger do the repeating.
        </h2>
      </div>

      <div className="mt-[var(--space-5)] space-y-[var(--space-5)]">
        <div>
          <label className="mb-[var(--space-2)] block text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ink-tertiary)]">
            Category
          </label>
          <div className="flex flex-wrap gap-[var(--space-2)]">
            {categories.map(([key, config]) => (
              <button
                key={key}
                type="button"
                onClick={() => setChargeCategory(key)}
                className={cn(
                  'rounded-full px-4 py-2 text-sm font-medium transition-transform duration-150 hover:scale-[1.01]',
                  chargeCategory === key
                    ? 'text-[var(--canvas)]'
                    : 'bg-[color:var(--surface)]/82 text-[var(--ink-secondary)]'
                )}
                style={chargeCategory === key ? { background: config.color } : undefined}
              >
                {config.label}
              </button>
            ))}
          </div>
        </div>

        <FormField label="Description">
          <input
            type="text"
            value={chargeDescription}
            onChange={(event) => setChargeDescription(event.target.value)}
            placeholder="Pinehurst green fee"
            className="w-full rounded-xl border border-[color:var(--rule)]/75 bg-[color:var(--surface)]/82 px-4 py-3 text-sm text-[var(--ink)] outline-none transition focus:border-[var(--masters)]"
          />
        </FormField>

        <FormField label="Amount per player">
          <div className="relative">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-[var(--ink-tertiary)]">$</span>
            <input
              type="text"
              inputMode="decimal"
              value={chargeAmount}
              onChange={(event) => setChargeAmount(event.target.value)}
              placeholder="0.00"
              className="w-full rounded-xl border border-[color:var(--rule)]/75 bg-[color:var(--surface)]/82 py-3 pl-8 pr-4 text-lg font-semibold text-[var(--ink)] outline-none transition focus:border-[var(--masters)]"
            />
          </div>
        </FormField>

        <div>
          <label className="mb-[var(--space-2)] block text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ink-tertiary)]">
            Apply to
          </label>
          <div className="flex flex-wrap gap-[var(--space-2)]">
            <button
              type="button"
              onClick={() => setApplyToAll(true)}
              className={cn(
                'inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-transform duration-150 hover:scale-[1.01]',
                applyToAll ? 'bg-[var(--masters)] text-[var(--canvas)]' : 'bg-[color:var(--surface)]/82 text-[var(--ink-secondary)]'
              )}
            >
              <Users size={15} />
              All players
            </button>
            <button
              type="button"
              onClick={() => setApplyToAll(false)}
              className={cn(
                'inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-transform duration-150 hover:scale-[1.01]',
                !applyToAll ? 'bg-[var(--masters)] text-[var(--canvas)]' : 'bg-[color:var(--surface)]/82 text-[var(--ink-secondary)]'
              )}
            >
              Select players
            </button>
          </div>

          {!applyToAll ? (
            <div className="mt-[var(--space-3)] flex flex-wrap gap-[var(--space-2)]">
              {players.map((player) => {
                const isSelected = selectedPlayerIds.includes(player.id);
                return (
                  <button
                    key={player.id}
                    type="button"
                    onClick={() => togglePlayerSelection(player.id)}
                    className={cn(
                      'rounded-full px-4 py-2 text-sm font-medium transition-transform duration-150 hover:scale-[1.01]',
                      isSelected ? 'bg-[var(--masters)] text-[var(--canvas)]' : 'bg-[color:var(--surface)]/82 text-[var(--ink-secondary)]'
                    )}
                  >
                    {player.firstName}
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>

        {chargeTargetCount > 0 && chargeTotalCents > 0 ? (
          <div className="rounded-[1.2rem] border border-[var(--masters)]/18 bg-[color:var(--masters)]/8 px-[var(--space-4)] py-[var(--space-4)]">
            <p className="text-sm font-medium text-[var(--masters)]">
              {chargeTargetCount} charge{chargeTargetCount === 1 ? '' : 's'} for a total of {formatCents(chargeTotalCents)}
            </p>
          </div>
        ) : null}

        <Button variant="primary" fullWidth leftIcon={<Plus size={16} />} isLoading={isSubmitting} loadingText="Adding charge" onClick={onSubmit}>
          Add charge
        </Button>
      </div>
    </section>
  );
}

function PaymentsPanel({
  paymentRecords,
  players,
}: {
  paymentRecords: PaymentRecord[];
  players: Array<{ id: string; firstName: string; lastName?: string }>;
}) {
  const sortedPayments = [...paymentRecords].sort(
    (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
  );

  const playerName = (playerId: string) => {
    const player = players.find((candidate) => candidate.id === playerId);
    return player ? `${player.firstName}${player.lastName ? ` ${player.lastName}` : ''}` : 'Unknown';
  };

  if (sortedPayments.length === 0) {
    return (
      <EmptyStatePremium
        illustration="golf-ball"
        title="No payments recorded"
        description="Payments will appear here once players start settling the ledger."
        variant="large"
      />
    );
  }

  return (
    <section className="space-y-[var(--space-3)]">
      {sortedPayments.map((payment) => (
        <article
          key={payment.id}
          className="rounded-[1.75rem] border border-[color:var(--rule)]/75 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(244,238,231,0.99))] px-[var(--space-5)] py-[var(--space-4)] shadow-[0_16px_34px_rgba(41,29,17,0.05)]"
        >
          <div className="flex items-center justify-between gap-[var(--space-4)]">
            <div className="flex items-center gap-[var(--space-3)]">
              <div className="flex h-11 w-11 items-center justify-center rounded-[1rem] bg-[color:var(--success)]/10 text-[var(--success)]">
                <CheckCircle2 size={18} />
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--ink)]">{playerName(payment.fromPlayerId)}</p>
                <p className="mt-[2px] text-xs uppercase tracking-[0.14em] text-[var(--ink-tertiary)]">
                  {payment.method} · {new Date(payment.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </p>
              </div>
            </div>

            <p className="font-serif text-[1.5rem] italic text-[var(--success)]">+{formatCents(payment.amount)}</p>
          </div>
        </article>
      ))}
    </section>
  );
}

function FinanceFactCard({
  label,
  value,
  detail,
  valueClassName,
}: {
  label: string;
  value: string;
  detail: string;
  valueClassName?: string;
}) {
  return (
    <div className="rounded-[1.55rem] border border-[color:var(--canvas)]/16 bg-[color:var(--canvas)]/10 p-[var(--space-4)]">
      <p className="type-overline tracking-[0.14em] text-[color:var(--canvas)]/72">{label}</p>
      <p className={cn('mt-[var(--space-2)] font-serif text-[2rem] italic leading-none text-[var(--canvas)]', valueClassName)}>
        {value}
      </p>
      <p className="mt-[var(--space-2)] text-xs leading-5 text-[color:var(--canvas)]/72">{detail}</p>
    </div>
  );
}

function SidebarNote({
  title,
  body,
  tone = 'default',
}: {
  title: string;
  body: string;
  tone?: 'default' | 'green';
}) {
  return (
    <aside
      className={cn(
        'rounded-[1.8rem] border p-[var(--space-5)] shadow-[0_18px_38px_rgba(41,29,17,0.06)]',
        tone === 'green'
          ? 'border-[var(--masters)]/16 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(238,246,241,0.99))]'
          : 'border-[color:var(--rule)]/75 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(245,239,232,0.99))]'
      )}
    >
      <p className="type-overline tracking-[0.15em] text-[var(--ink-tertiary)]">Ledger note</p>
      <h3 className="mt-[var(--space-2)] font-serif text-[1.6rem] italic text-[var(--ink)]">{title}</h3>
      <p className="mt-[var(--space-3)] text-sm leading-7 text-[var(--ink-secondary)]">{body}</p>
    </aside>
  );
}

function FormField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-[var(--space-2)] block text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ink-tertiary)]">
        {label}
      </span>
      {children}
    </label>
  );
}
