'use client';

import { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLiveQuery } from 'dexie-react-hooks';
import { DollarSign, Home, Plus, Receipt } from 'lucide-react';
import { PageHeader } from '@/components/layout';
import { Button } from '@/components/ui/Button';
import { EmptyStatePremium, PageLoadingSkeleton } from '@/components/ui';
import { db } from '@/lib/db';
import {
  buildTripFinancialSummary,
  createBulkDues,
  markAsPaid,
} from '@/lib/services/duesService';
import { useTripStore, useUIStore } from '@/lib/stores';
import { useShallow } from 'zustand/shallow';
import type { DuesCategory } from '@/lib/types/finances';
import { createLogger } from '@/lib/utils/logger';
import {
  ChargeComposer,
  FinanceHero,
  FinanceTabButton,
  LedgerSummaryPanel,
  PaymentsPanel,
  PlayerLedgerCard,
  SidebarNote,
} from './FinancesPageSections';

type TabType = 'overview' | 'add_charge' | 'payments';

const logger = createLogger('finances');

export default function FinancesPageClient() {
  const router = useRouter();
  const { currentTrip, players } = useTripStore(useShallow(s => ({ currentTrip: s.currentTrip, players: s.players })));
  const { isCaptainMode, showToast } = useUIStore(useShallow(s => ({ isCaptainMode: s.isCaptainMode, showToast: s.showToast })));

  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [expandedPlayerId, setExpandedPlayerId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [chargeCategory, setChargeCategory] = useState<DuesCategory>('green_fee');
  const [chargeDescription, setChargeDescription] = useState('');
  const [chargeAmount, setChargeAmount] = useState('');
  const [applyToAll, setApplyToAll] = useState(true);
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);

  const duesItems = useLiveQuery(
    async () => (currentTrip ? db.duesLineItems.where('tripId').equals(currentTrip.id).toArray() : []),
    [currentTrip?.id],
    []
  );

  const paymentRecords = useLiveQuery(
    async () => (currentTrip ? db.paymentRecords.where('tripId').equals(currentTrip.id).toArray() : []),
    [currentTrip?.id],
    []
  );

  const summary = useMemo(() => {
    if (!currentTrip) {
      return undefined;
    }

    return buildTripFinancialSummary(currentTrip.id, players, duesItems, paymentRecords);
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

      showToast(
        'success',
        `Charge added for ${targetPlayerIds.length} player${targetPlayerIds.length === 1 ? '' : 's'}`
      );
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
  }, [
    applyToAll,
    chargeAmount,
    chargeCategory,
    chargeDescription,
    currentTrip,
    isSubmitting,
    players,
    selectedPlayerIds,
    showToast,
  ]);

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
              icon: <Home size={16} />,
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
  const settledPlayers = summary.playerSummaries.filter(
    (playerSummary) => playerSummary.totalDues > 0 && playerSummary.balance === 0
  ).length;
  const collectionProgress =
    summary.totalCollectable > 0 ? Math.round((summary.totalCollected / summary.totalCollectable) * 100) : 0;
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
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Plus size={14} />}
              onClick={() => setActiveTab('add_charge')}
            >
              Charge
            </Button>
          ) : undefined
        }
      />

      <main className="container-editorial py-[var(--space-6)] pb-[var(--space-12)]">
        <FinanceHero
          summary={summary}
          settledPlayers={settledPlayers}
          owingPlayers={owingPlayers}
          totalPlayers={players.length}
        />

        <section className="mt-[var(--space-6)] flex flex-wrap gap-[var(--space-3)]">
          <FinanceTabButton
            active={activeTab === 'overview'}
            label="Overview"
            icon={<DollarSign size={15} />}
            onClick={() => setActiveTab('overview')}
          />
          {isCaptainMode ? (
            <FinanceTabButton
              active={activeTab === 'add_charge'}
              label="Add charge"
              icon={<Plus size={15} />}
              onClick={() => setActiveTab('add_charge')}
            />
          ) : null}
          <FinanceTabButton
            active={activeTab === 'payments'}
            label="Payments"
            icon={<Receipt size={15} />}
            onClick={() => setActiveTab('payments')}
          />
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
                          setExpandedPlayerId((current) =>
                            current === playerSummary.playerId ? null : playerSummary.playerId
                          )
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
