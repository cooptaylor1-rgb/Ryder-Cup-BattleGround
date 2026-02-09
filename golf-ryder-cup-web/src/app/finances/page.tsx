'use client';

import { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { useTripStore, useUIStore } from '@/lib/stores';
import { createLogger } from '@/lib/utils/logger';
import {
  createBulkDues,
  markAsPaid,
} from '@/lib/services/duesService';
import type { DuesCategory, PlayerFinancialSummary, TripFinancialSummary } from '@/lib/types/finances';
import { DUES_CATEGORIES } from '@/lib/types/finances';
import { EmptyStatePremium, PageLoadingSkeleton } from '@/components/ui';
import { BottomNav, PageHeader } from '@/components/layout';
import {
  DollarSign,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Users,
  Flag,
  Car,
  Home,
  UtensilsCrossed,
  Coins,
  Receipt,
  Plus,
} from 'lucide-react';

/**
 * FINANCES PAGE -- Trip Expense Tracker
 *
 * Fried Egg Golf Editorial Design:
 * - Cream canvas, warm ink, generous whitespace
 * - Serif for monumental dollar amounts
 * - Sans for UI, captions, form labels
 * - Captain-managed charges, player-visible ledger
 */

type TabType = 'overview' | 'add_charge' | 'payments';

const logger = createLogger('finances');

/** Map icon string names from DUES_CATEGORIES to actual lucide components */
const CATEGORY_ICONS: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  Flag,
  Car,
  Home,
  UtensilsCrossed,
  Coins,
  DollarSign,
  Receipt,
  Gavel: Receipt, // fallback — Gavel is not commonly available
};

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function FinancesPage() {
  const router = useRouter();
  const { currentTrip, players } = useTripStore();
  const { isCaptainMode, showToast } = useUIStore();

  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [expandedPlayer, setExpandedPlayer] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- Add Charge form state ---
  const [chargeCategory, setChargeCategory] = useState<DuesCategory>('green_fee');
  const [chargeDescription, setChargeDescription] = useState('');
  const [chargeAmount, setChargeAmount] = useState('');
  const [applyToAll, setApplyToAll] = useState(true);
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);

  // Reactive queries
  const duesItems = useLiveQuery(
    async () => {
      if (!currentTrip) return [];
      return db.duesLineItems.where('tripId').equals(currentTrip.id).toArray();
    },
    [currentTrip?.id],
    []
  );

  const paymentRecords = useLiveQuery(
    async () => {
      if (!currentTrip) return [];
      return db.paymentRecords.where('tripId').equals(currentTrip.id).toArray();
    },
    [currentTrip?.id],
    []
  );

  // Compute financial summary from live data
  const summary: TripFinancialSummary | null = useMemo(() => {
    if (!currentTrip || !duesItems) return null;
    const playerSummaries: PlayerFinancialSummary[] = players.map((player) => {
      const items = duesItems.filter((d) => d.playerId === player.id);
      const playerPayments = (paymentRecords ?? []).filter((p) => p.fromPlayerId === player.id);
      const totalDues = items.reduce((sum, d) => sum + d.amount, 0);
      const totalPaid = items.reduce((sum, d) => sum + d.amountPaid, 0);
      return {
        playerId: player.id,
        playerName: `${player.firstName}${player.lastName ? ' ' + player.lastName : ''}`,
        totalDues,
        totalPaid,
        balance: totalDues - totalPaid,
        lineItems: items,
        payments: playerPayments,
      };
    });

    const totalCollectable = playerSummaries.reduce((s, p) => s + p.totalDues, 0);
    const totalCollected = playerSummaries.reduce((s, p) => s + p.totalPaid, 0);
    const delinquent = playerSummaries
      .filter((p) => p.balance > 0)
      .sort((a, b) => b.balance - a.balance);

    return {
      tripId: currentTrip.id,
      totalCollectable,
      totalCollected,
      outstandingBalance: totalCollectable - totalCollected,
      playerSummaries,
      delinquent,
      isFullySettled: totalCollectable > 0 && totalCollectable === totalCollected,
    };
  }, [currentTrip, duesItems, paymentRecords, players]);

  // Handlers
  const handleMarkPaid = useCallback(
    async (lineItemId: string) => {
      if (isSubmitting) return;
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
    if (!currentTrip || isSubmitting) return;

    const amountDollars = parseFloat(chargeAmount);
    if (!chargeDescription.trim()) {
      showToast('error', 'Please enter a description');
      return;
    }
    if (isNaN(amountDollars) || amountDollars <= 0) {
      showToast('error', 'Please enter a valid amount');
      return;
    }

    const targetPlayerIds = applyToAll ? players.map((p) => p.id) : selectedPlayerIds;
    if (targetPlayerIds.length === 0) {
      showToast('error', 'Please select at least one player');
      return;
    }

    setIsSubmitting(true);
    try {
      const amountCents = Math.round(amountDollars * 100);
      await createBulkDues(
        currentTrip.id,
        targetPlayerIds,
        chargeCategory,
        chargeDescription.trim(),
        amountCents,
        'captain', // simplified — real app uses auth context
      );

      showToast('success', `Charge added for ${targetPlayerIds.length} player${targetPlayerIds.length > 1 ? 's' : ''}`);
      // Reset form
      setChargeDescription('');
      setChargeAmount('');
      setChargeCategory('green_fee');
      setApplyToAll(true);
      setSelectedPlayerIds([]);
      setActiveTab('overview');
    } catch (error) {
      logger.error('Failed to create charge', { error });
      showToast('error', 'Failed to add charge');
    } finally {
      setIsSubmitting(false);
    }
  }, [currentTrip, isSubmitting, chargeAmount, chargeDescription, chargeCategory, applyToAll, selectedPlayerIds, players, showToast]);

  const togglePlayerSelection = useCallback((playerId: string) => {
    setSelectedPlayerIds((prev) =>
      prev.includes(playerId) ? prev.filter((id) => id !== playerId) : [...prev, playerId]
    );
  }, []);

  // --- Early returns for missing states ---

  if (!currentTrip) {
    return (
      <div className="min-h-screen pb-nav page-premium-enter texture-grain bg-[var(--canvas)]">
        <PageHeader
          title="Finances"
          subtitle="No active trip"
          icon={<DollarSign size={16} className="text-white" />}
          onBack={() => router.back()}
        />
        <main className="container-editorial py-12">
          <EmptyStatePremium
            illustration="golf-ball"
            title="No active trip"
            description="Start or select a trip to track finances."
            action={{ label: 'Back to Home', onClick: () => router.push('/') }}
            variant="large"
          />
        </main>
        <BottomNav />
      </div>
    );
  }

  if (!summary) {
    return <PageLoadingSkeleton title="Finances" showBackButton variant="default" />;
  }

  const hasDues = duesItems && duesItems.length > 0;
  const paidCount = summary.playerSummaries.filter((p) => p.totalDues > 0 && p.balance === 0).length;
  const owingCount = summary.playerSummaries.filter((p) => p.totalDues > 0).length;
  const progressPct = summary.totalCollectable > 0
    ? Math.round((summary.totalCollected / summary.totalCollectable) * 100)
    : 0;

  // Charge preview for the Add Charge form
  const chargeAmountCents = Math.round((parseFloat(chargeAmount) || 0) * 100);
  const chargeTargetCount = applyToAll ? players.length : selectedPlayerIds.length;
  const chargeTotalCents = chargeAmountCents * chargeTargetCount;

  return (
    <div className="min-h-screen pb-nav page-premium-enter texture-grain bg-[var(--canvas)]">
      <PageHeader
        title="Finances"
        subtitle={currentTrip.name}
        icon={<DollarSign size={16} className="text-white" />}
        onBack={() => router.back()}
      />

      {/* Tab Navigation */}
      <div className="sticky top-0 z-10 bg-[var(--canvas)] border-b border-[var(--rule)]">
        <div className="container-editorial">
          <div className="flex gap-1 py-[var(--space-2)]">
            <TabButton
              active={activeTab === 'overview'}
              onClick={() => setActiveTab('overview')}
              icon={<DollarSign size={16} />}
              label="Overview"
            />
            {isCaptainMode && (
              <TabButton
                active={activeTab === 'add_charge'}
                onClick={() => setActiveTab('add_charge')}
                icon={<Plus size={16} />}
                label="Add Charge"
              />
            )}
            <TabButton
              active={activeTab === 'payments'}
              onClick={() => setActiveTab('payments')}
              icon={<Receipt size={16} />}
              label="Payments"
            />
          </div>
        </div>
      </div>

      <main className="container-editorial">
        {activeTab === 'overview' ? (
          <>
            {/* Summary Card */}
            {hasDues ? (
              <SummaryCard
                summary={summary}
                paidCount={paidCount}
                owingCount={owingCount}
                progressPct={progressPct}
              />
            ) : null}

            {/* Per-player list or empty state */}
            {hasDues ? (
              <OverviewTab
                summary={summary}
                expandedPlayer={expandedPlayer}
                setExpandedPlayer={setExpandedPlayer}
                onMarkPaid={handleMarkPaid}
                isCaptainMode={isCaptainMode}
                isSubmitting={isSubmitting}
              />
            ) : (
              <section className="section pt-[var(--space-8)]">
                <EmptyStatePremium
                  illustration="golf-ball"
                  title="No charges yet"
                  description="Add green fees, cart fees, and other expenses to track who owes what."
                  action={
                    isCaptainMode
                      ? {
                          label: 'Add First Charge',
                          onClick: () => setActiveTab('add_charge'),
                          icon: <Plus size={18} />,
                        }
                      : undefined
                  }
                  variant="large"
                />
              </section>
            )}
          </>
        ) : activeTab === 'add_charge' && isCaptainMode ? (
          <AddChargeTab
            chargeCategory={chargeCategory}
            setChargeCategory={setChargeCategory}
            chargeDescription={chargeDescription}
            setChargeDescription={setChargeDescription}
            chargeAmount={chargeAmount}
            setChargeAmount={setChargeAmount}
            applyToAll={applyToAll}
            setApplyToAll={setApplyToAll}
            selectedPlayerIds={selectedPlayerIds}
            togglePlayerSelection={togglePlayerSelection}
            players={players}
            chargeTargetCount={chargeTargetCount}
            chargeTotalCents={chargeTotalCents}
            onSubmit={handleAddCharge}
            isSubmitting={isSubmitting}
          />
        ) : (
          <PaymentsTab paymentRecords={paymentRecords ?? []} players={players} />
        )}
      </main>

      <BottomNav />
    </div>
  );
}

/* ============================================
   Tab Button
   ============================================ */
function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`press-scale flex flex-1 items-center justify-center gap-[var(--space-2)] py-[var(--space-3)] px-[var(--space-4)] rounded-[var(--radius-full)] font-[family-name:var(--font-sans)] text-sm cursor-pointer transition-all duration-200 ${
        active
          ? 'border-0 bg-[var(--masters)] text-white font-semibold'
          : 'border border-[var(--rule)] bg-transparent text-[var(--ink-secondary)] font-medium'
      }`}
      aria-label={`${label} tab`}
      aria-selected={active}
      role="tab"
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

/* ============================================
   Summary Card
   ============================================ */
function SummaryCard({
  summary,
  paidCount,
  owingCount,
  progressPct,
}: {
  summary: TripFinancialSummary;
  paidCount: number;
  owingCount: number;
  progressPct: number;
}) {
  return (
    <section className="section pt-[var(--space-6)]">
      <div className="card p-[var(--space-5)]">
        {/* Collected vs Owed */}
        <div className="flex items-baseline justify-between mb-[var(--space-3)]">
          <div>
            <p className="type-overline mb-[var(--space-1)]">Collected</p>
            <p
              className="font-[family-name:var(--font-serif)] text-3xl font-bold text-[var(--masters)]"
            >
              {formatCents(summary.totalCollected)}
            </p>
          </div>
          <div className="text-right">
            <p className="type-overline mb-[var(--space-1)]">Total Owed</p>
            <p
              className="font-[family-name:var(--font-serif)] text-3xl font-bold text-[var(--ink)]"
            >
              {formatCents(summary.totalCollectable)}
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-3 rounded-[var(--radius-full)] bg-[var(--surface-elevated)] overflow-hidden mb-[var(--space-3)]">
          <div
            className="h-full rounded-[var(--radius-full)] transition-all duration-500 ease-out"
            style={{
              width: `${progressPct}%`,
              background: summary.isFullySettled
                ? 'var(--success)'
                : 'linear-gradient(90deg, var(--masters) 0%, var(--masters-deep) 100%)',
            }}
          />
        </div>

        {/* Status line */}
        <div className="flex items-center justify-between">
          <p className="type-body-sm text-[var(--ink-secondary)]">
            {paidCount} of {owingCount} players paid
          </p>
          {summary.isFullySettled ? (
            <div className="flex items-center gap-[var(--space-1)]">
              <CheckCircle2 size={16} className="text-[var(--success)]" />
              <span className="type-caption font-semibold text-[var(--success)]">Settled</span>
            </div>
          ) : (
            <p className="type-caption text-[var(--ink-tertiary)]">
              {formatCents(summary.outstandingBalance)} outstanding
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

/* ============================================
   Overview Tab — Per-Player List
   ============================================ */
function OverviewTab({
  summary,
  expandedPlayer,
  setExpandedPlayer,
  onMarkPaid,
  isCaptainMode,
  isSubmitting,
}: {
  summary: TripFinancialSummary;
  expandedPlayer: string | null;
  setExpandedPlayer: (id: string | null) => void;
  onMarkPaid: (lineItemId: string) => void;
  isCaptainMode: boolean;
  isSubmitting: boolean;
}) {
  // Only show players who have dues
  const playersWithDues = summary.playerSummaries.filter((p) => p.totalDues > 0);

  if (playersWithDues.length === 0) {
    return (
      <section className="section-sm">
        <EmptyStatePremium
          illustration="golf-ball"
          title="No player ledger yet"
          description="Charges exist, but none are currently assigned to active players."
          variant="compact"
        />
      </section>
    );
  }

  return (
    <section className="section-sm">
      <h2 className="type-overline mb-[var(--space-4)]">Player Ledger</h2>
      <div className="space-y-2">
        {playersWithDues.map((ps) => (
          <PlayerRow
            key={ps.playerId}
            playerSummary={ps}
            isExpanded={expandedPlayer === ps.playerId}
            onToggle={() =>
              setExpandedPlayer(expandedPlayer === ps.playerId ? null : ps.playerId)
            }
            onMarkPaid={onMarkPaid}
            isCaptainMode={isCaptainMode}
            isSubmitting={isSubmitting}
          />
        ))}
      </div>
    </section>
  );
}

/* ============================================
   Player Row — Expandable Ledger Entry
   ============================================ */
function PlayerRow({
  playerSummary,
  isExpanded,
  onToggle,
  onMarkPaid,
  isCaptainMode,
  isSubmitting,
}: {
  playerSummary: PlayerFinancialSummary;
  isExpanded: boolean;
  onToggle: () => void;
  onMarkPaid: (lineItemId: string) => void;
  isCaptainMode: boolean;
  isSubmitting: boolean;
}) {
  const { playerName, totalDues, totalPaid, balance, lineItems } = playerSummary;
  const isPaid = balance === 0 && totalDues > 0;
  const isPartial = totalPaid > 0 && balance > 0;

  return (
    <div className="card overflow-hidden">
      {/* Tap row */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-[var(--space-4)] bg-transparent border-none cursor-pointer text-left"
      >
        <div className="flex items-center gap-[var(--space-3)] min-w-0">
          {isExpanded ? (
            <ChevronDown size={18} className="text-[var(--ink-tertiary)] shrink-0" />
          ) : (
            <ChevronRight size={18} className="text-[var(--ink-tertiary)] shrink-0" />
          )}
          <span className="type-body-sm font-semibold text-[var(--ink)] truncate">
            {playerName}
          </span>
        </div>

        {/* Status Badge */}
        {isPaid ? (
          <span className="shrink-0 flex items-center gap-[var(--space-1)] py-[var(--space-1)] px-[var(--space-3)] rounded-[var(--radius-full)] bg-[color-mix(in_srgb,var(--success)_12%,transparent)] text-[var(--success)] type-caption font-semibold">
            <CheckCircle2 size={14} />
            Paid
          </span>
        ) : isPartial ? (
          <span className="shrink-0 py-[var(--space-1)] px-[var(--space-3)] rounded-[var(--radius-full)] bg-[color-mix(in_srgb,var(--warning)_12%,transparent)] text-[var(--warning)] type-caption font-semibold">
            Partial ({formatCents(totalPaid)}/{formatCents(totalDues)})
          </span>
        ) : (
          <span className="shrink-0 flex items-center gap-[var(--space-1)] py-[var(--space-1)] px-[var(--space-3)] rounded-[var(--radius-full)] bg-[color-mix(in_srgb,var(--error)_12%,transparent)] text-[var(--error)] type-caption font-semibold">
            <AlertCircle size={14} />
            Unpaid ({formatCents(totalDues)})
          </span>
        )}
      </button>

      {/* Expanded details */}
      {isExpanded && (
        <div className="border-t border-[var(--rule)] px-[var(--space-4)] pb-[var(--space-4)]">
          {/* Line items */}
          {lineItems.map((item) => {
            const catConfig = DUES_CATEGORIES[item.category];
            const IconComponent = CATEGORY_ICONS[catConfig.icon] || Receipt;

            return (
              <div
                key={item.id}
                className="flex items-center justify-between py-[var(--space-3)] border-b border-[var(--rule)] last:border-b-0"
              >
                <div className="flex items-center gap-[var(--space-3)] min-w-0">
                  <IconComponent size={16} className="text-[var(--ink-tertiary)] shrink-0" />
                  <div className="min-w-0">
                    <p className="type-body-sm truncate">{item.description}</p>
                    <p className="type-caption text-[var(--ink-tertiary)]">{catConfig.label}</p>
                  </div>
                </div>
                <div className="flex items-center gap-[var(--space-3)] shrink-0">
                  <span
                    className={`type-body-sm font-semibold ${
                      item.status === 'paid'
                        ? 'text-[var(--success)]'
                        : item.status === 'partial'
                          ? 'text-[var(--warning)]'
                          : 'text-[var(--ink)]'
                    }`}
                  >
                    {formatCents(item.amount)}
                  </span>
                  {isCaptainMode && item.status !== 'paid' && item.status !== 'waived' && (
                    <button
                      onClick={() => onMarkPaid(item.id)}
                      disabled={isSubmitting}
                      className="press-scale py-[var(--space-1)] px-[var(--space-2)] rounded-[var(--radius-md)] bg-[var(--masters)] text-white border-none cursor-pointer text-xs font-semibold disabled:opacity-50"
                    >
                      Mark Paid
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ============================================
   Add Charge Tab — Captain-Only Form
   ============================================ */
function AddChargeTab({
  chargeCategory,
  setChargeCategory,
  chargeDescription,
  setChargeDescription,
  chargeAmount,
  setChargeAmount,
  applyToAll,
  setApplyToAll,
  selectedPlayerIds,
  togglePlayerSelection,
  players,
  chargeTargetCount,
  chargeTotalCents,
  onSubmit,
  isSubmitting,
}: {
  chargeCategory: DuesCategory;
  setChargeCategory: (c: DuesCategory) => void;
  chargeDescription: string;
  setChargeDescription: (d: string) => void;
  chargeAmount: string;
  setChargeAmount: (a: string) => void;
  applyToAll: boolean;
  setApplyToAll: (v: boolean) => void;
  selectedPlayerIds: string[];
  togglePlayerSelection: (id: string) => void;
  players: { id: string; firstName: string; lastName?: string }[];
  chargeTargetCount: number;
  chargeTotalCents: number;
  onSubmit: () => void;
  isSubmitting: boolean;
}) {
  const categories = Object.entries(DUES_CATEGORIES) as [DuesCategory, { label: string; icon: string; color: string }][];

  return (
    <section className="section-sm">
      <h2 className="type-overline mb-[var(--space-4)]">New Charge</h2>

      <div className="card p-[var(--space-5)] space-y-[var(--space-5)]">
        {/* Category Selector */}
        <div>
          <label className="type-caption block mb-[var(--space-2)] text-[var(--ink-secondary)]">
            Category
          </label>
          <div className="flex flex-wrap gap-[var(--space-2)]">
            {categories.map(([key, config]) => {
              const isActive = chargeCategory === key;
              return (
                <button
                  key={key}
                  onClick={() => setChargeCategory(key)}
                  className={`press-scale flex items-center gap-[var(--space-2)] py-[var(--space-2)] px-[var(--space-3)] rounded-[var(--radius-full)] border-none cursor-pointer text-sm font-medium transition-all duration-150 ${
                    isActive
                      ? 'text-white'
                      : 'bg-[var(--surface-elevated)] text-[var(--ink-secondary)]'
                  }`}
                  style={isActive ? { background: config.color } : undefined}
                >
                  {config.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="type-caption block mb-[var(--space-2)] text-[var(--ink-secondary)]">
            Description
          </label>
          <input
            type="text"
            value={chargeDescription}
            onChange={(e) => setChargeDescription(e.target.value)}
            placeholder="e.g., Pinehurst No. 2 green fee"
            className="w-full py-[var(--space-3)] px-[var(--space-4)] rounded-[var(--radius-lg)] border border-[var(--rule)] bg-[var(--surface-elevated)] text-[var(--ink)] font-[family-name:var(--font-sans)] text-sm outline-none focus:border-[var(--masters)] transition-colors"
          />
        </div>

        {/* Amount */}
        <div>
          <label className="type-caption block mb-[var(--space-2)] text-[var(--ink-secondary)]">
            Amount (per player)
          </label>
          <div className="relative">
            <span className="absolute left-[var(--space-3)] top-1/2 -translate-y-1/2 text-[var(--ink-tertiary)] font-semibold">
              $
            </span>
            <input
              type="text"
              inputMode="decimal"
              value={chargeAmount}
              onChange={(e) => setChargeAmount(e.target.value)}
              placeholder="0.00"
              className="w-full py-[var(--space-3)] pl-[var(--space-8)] pr-[var(--space-4)] rounded-[var(--radius-lg)] border border-[var(--rule)] bg-[var(--surface-elevated)] text-[var(--ink)] font-[family-name:var(--font-serif)] text-xl font-bold outline-none focus:border-[var(--masters)] transition-colors"
            />
          </div>
        </div>

        {/* Apply To */}
        <div>
          <label className="type-caption block mb-[var(--space-2)] text-[var(--ink-secondary)]">
            Apply to
          </label>
          <div className="flex gap-[var(--space-2)] mb-[var(--space-3)]">
            <button
              onClick={() => setApplyToAll(true)}
              className={`press-scale flex items-center gap-[var(--space-2)] py-[var(--space-2)] px-[var(--space-4)] rounded-[var(--radius-full)] border-none cursor-pointer text-sm font-medium transition-all duration-150 ${
                applyToAll
                  ? 'bg-[var(--masters)] text-white'
                  : 'bg-[var(--surface-elevated)] text-[var(--ink-secondary)]'
              }`}
            >
              <Users size={16} />
              All Players
            </button>
            <button
              onClick={() => setApplyToAll(false)}
              className={`press-scale flex items-center gap-[var(--space-2)] py-[var(--space-2)] px-[var(--space-4)] rounded-[var(--radius-full)] border-none cursor-pointer text-sm font-medium transition-all duration-150 ${
                !applyToAll
                  ? 'bg-[var(--masters)] text-white'
                  : 'bg-[var(--surface-elevated)] text-[var(--ink-secondary)]'
              }`}
            >
              Select Players
            </button>
          </div>

          {/* Player checkboxes when selecting specific players */}
          {!applyToAll && (
            <div className="flex flex-wrap gap-[var(--space-2)]">
              {players.map((player) => {
                const isSelected = selectedPlayerIds.includes(player.id);
                return (
                  <button
                    key={player.id}
                    onClick={() => togglePlayerSelection(player.id)}
                    className={`press-scale py-[var(--space-2)] px-[var(--space-3)] rounded-[var(--radius-full)] border-none cursor-pointer text-sm font-medium transition-all duration-150 ${
                      isSelected
                        ? 'bg-[var(--masters)] text-white'
                        : 'bg-[var(--surface-elevated)] text-[var(--ink-secondary)]'
                    }`}
                  >
                    {isSelected && <span className="mr-[var(--space-1)]">&check;</span>}
                    {player.firstName}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Charge Preview */}
        {chargeTargetCount > 0 && chargeTotalCents > 0 && (
          <div className="py-[var(--space-3)] px-[var(--space-4)] rounded-[var(--radius-md)] bg-[color-mix(in_srgb,var(--masters)_8%,transparent)] border border-[color-mix(in_srgb,var(--masters)_20%,transparent)]">
            <p className="type-body-sm text-[var(--masters)] font-medium">
              This will create {chargeTargetCount} charge{chargeTargetCount > 1 ? 's' : ''} totaling{' '}
              {formatCents(chargeTotalCents)}
            </p>
          </div>
        )}

        {/* Submit */}
        <button
          onClick={onSubmit}
          disabled={isSubmitting}
          className="btn-premium press-scale w-full py-[var(--space-4)] flex items-center justify-center gap-[var(--space-2)] text-base font-semibold disabled:opacity-50"
        >
          <Plus size={18} />
          {isSubmitting ? 'Adding...' : 'Add Charge'}
        </button>
      </div>
    </section>
  );
}

/* ============================================
   Payments Tab — Chronological List
   ============================================ */
function PaymentsTab({
  paymentRecords,
  players,
}: {
  paymentRecords: { id: string; fromPlayerId: string; amount: number; method: string; createdAt: string; notes?: string }[];
  players: { id: string; firstName: string; lastName?: string }[];
}) {
  const getPlayerName = (id: string) => {
    const p = players.find((pl) => pl.id === id);
    return p ? p.firstName : 'Unknown';
  };

  const sorted = [...paymentRecords].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  if (sorted.length === 0) {
    return (
      <section className="section-sm pt-[var(--space-8)]">
        <EmptyStatePremium
          illustration="golf-ball"
          title="No payments recorded"
          description="Payments will appear here as players settle their dues."
          variant="compact"
        />
      </section>
    );
  }

  return (
    <section className="section-sm">
      <h2 className="type-overline mb-[var(--space-4)]">Payment History</h2>
      <div className="space-y-2">
        {sorted.map((payment) => (
          <div
            key={payment.id}
            className="card py-[var(--space-3)] px-[var(--space-4)] flex items-center justify-between"
          >
            <div className="flex items-center gap-[var(--space-3)] min-w-0">
              <div className="w-9 h-9 rounded-[var(--radius-md)] bg-[color-mix(in_srgb,var(--success)_12%,transparent)] flex items-center justify-center shrink-0">
                <CheckCircle2 size={18} className="text-[var(--success)]" />
              </div>
              <div className="min-w-0">
                <p className="type-body-sm font-semibold truncate">
                  {getPlayerName(payment.fromPlayerId)}
                </p>
                <p className="type-caption text-[var(--ink-tertiary)]">
                  {payment.method.charAt(0).toUpperCase() + payment.method.slice(1)}
                  {' \u00B7 '}
                  {new Date(payment.createdAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </p>
              </div>
            </div>
            <span className="type-body-sm font-bold text-[var(--success)] shrink-0">
              +{formatCents(payment.amount)}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
