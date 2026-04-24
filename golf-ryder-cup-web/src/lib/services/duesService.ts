/**
 * Dues & Payment Service
 *
 * Manages trip expense tracking: creating dues, recording payments,
 * computing financial summaries, and generating payment links.
 * Covers trip EXPENSES (green fees, cart fees, lodging, food, custom) —
 * separate from SettlementTransaction which covers game winnings.
 */

import { db } from '@/lib/db';
import { queueSyncOperation } from '@/lib/services/tripSyncService';
import { createLogger } from '@/lib/utils/logger';
import type {
  DuesLineItem,
  PaymentRecord,
  PlayerFinancialSummary,
  TripFinancialSummary,
  DuesCategory,
  DuesStatus,
  PaymentMethod,
} from '@/lib/types/finances';
import type { Player } from '@/lib/types/models';

const logger = createLogger('DuesService');

type FinancialSummaryPlayer = Pick<Player, 'id' | 'firstName' | 'lastName'>;

function formatPlayerName(player: FinancialSummaryPlayer): string {
  return `${player.firstName}${player.lastName ? ` ${player.lastName}` : ''}`;
}

function queueDuesItem(item: DuesLineItem, operation: 'create' | 'update'): void {
  queueSyncOperation('duesLineItem', item.id, operation, item.tripId, item);
}

function queuePaymentRecord(record: PaymentRecord, operation: 'create' | 'update'): void {
  queueSyncOperation('paymentRecord', record.id, operation, record.tripId, record);
}

// ============================================
// DUES CRUD
// ============================================

/** Create a single dues line item for a player */
export async function createDuesItem(item: Omit<DuesLineItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<DuesLineItem> {
  const now = new Date().toISOString();
  const dues: DuesLineItem = {
    ...item,
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
  };
  await db.duesLineItems.add(dues);
  queueDuesItem(dues, 'create');
  logger.info('Created dues item', { id: dues.id, category: dues.category, amount: dues.amount });
  return dues;
}

/** Create dues for ALL players in a trip (bulk - e.g., "Everyone owes $150 green fee") */
export async function createBulkDues(
  tripId: string,
  playerIds: string[],
  category: DuesCategory,
  description: string,
  amount: number,
  createdBy: string,
  dueDate?: string,
): Promise<DuesLineItem[]> {
  const now = new Date().toISOString();
  const items: DuesLineItem[] = playerIds.map(playerId => ({
    id: crypto.randomUUID(),
    tripId,
    playerId,
    category,
    description,
    amount,
    amountPaid: 0,
    status: 'unpaid' as DuesStatus,
    dueDate,
    createdBy,
    createdAt: now,
    updatedAt: now,
  }));
  await db.duesLineItems.bulkAdd(items);
  for (const item of items) {
    queueDuesItem(item, 'create');
  }
  logger.info('Created bulk dues', { count: items.length, category, amount });
  return items;
}

/** Update a dues item */
export async function updateDuesItem(id: string, updates: Partial<DuesLineItem>): Promise<void> {
  await db.duesLineItems.update(id, { ...updates, updatedAt: new Date().toISOString() });
  const updated = await db.duesLineItems.get(id);
  if (updated) queueDuesItem(updated, 'update');
}

/** Delete a dues item */
export async function deleteDuesItem(id: string): Promise<void> {
  const existing = await db.duesLineItems.get(id);
  await db.duesLineItems.delete(id);
  if (existing) queueSyncOperation('duesLineItem', id, 'delete', existing.tripId);
}

/** Get all dues for a trip */
export async function getTripDues(tripId: string): Promise<DuesLineItem[]> {
  return db.duesLineItems.where('tripId').equals(tripId).toArray();
}

/** Get dues for a specific player */
export async function getPlayerDues(tripId: string, playerId: string): Promise<DuesLineItem[]> {
  return db.duesLineItems.where('[tripId+playerId]').equals([tripId, playerId]).toArray();
}

// ============================================
// PAYMENTS
// ============================================

/** Record a payment */
export async function recordPayment(payment: Omit<PaymentRecord, 'id' | 'createdAt'>): Promise<PaymentRecord> {
  const record: PaymentRecord = {
    ...payment,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  await db.paymentRecords.add(record);
  queuePaymentRecord(record, 'create');

  // Update corresponding dues line items
  for (const lineItemId of payment.lineItemIds) {
    const item = await db.duesLineItems.get(lineItemId);
    if (item) {
      const newPaid = item.amountPaid + payment.amount;
      const newStatus: DuesStatus = newPaid >= item.amount ? 'paid' : 'partial';
      await db.duesLineItems.update(lineItemId, {
        amountPaid: Math.min(newPaid, item.amount),
        status: newStatus,
        paidAt: newStatus === 'paid' ? new Date().toISOString() : undefined,
        paidVia: payment.method,
        updatedAt: new Date().toISOString(),
      });
      const updated = await db.duesLineItems.get(lineItemId);
      if (updated) queueDuesItem(updated, 'update');
    }
  }

  logger.info('Recorded payment', { id: record.id, amount: record.amount });
  return record;
}

/** Mark a dues item as paid (captain confirmation, no payment record needed) */
export async function markAsPaid(
  lineItemId: string,
  method: PaymentMethod,
  confirmedBy: string,
): Promise<void> {
  const item = await db.duesLineItems.get(lineItemId);
  if (!item) throw new Error(`Dues item ${lineItemId} not found`);

  const now = new Date().toISOString();
  await db.duesLineItems.update(lineItemId, {
    amountPaid: item.amount,
    status: 'paid',
    paidAt: now,
    paidVia: method,
    updatedAt: now,
  });
  const updated = await db.duesLineItems.get(lineItemId);
  if (updated) queueDuesItem(updated, 'update');

  // Create payment record for audit trail
  const record: PaymentRecord = {
    id: crypto.randomUUID(),
    tripId: item.tripId,
    fromPlayerId: item.playerId,
    amount: item.amount,
    method,
    lineItemIds: [lineItemId],
    confirmedBy,
    confirmedAt: now,
    createdAt: now,
  };
  await db.paymentRecords.add(record);
  queuePaymentRecord(record, 'create');
}

/** Mark a dues item as waived */
export async function waiveDues(lineItemId: string): Promise<void> {
  await db.duesLineItems.update(lineItemId, {
    status: 'waived',
    updatedAt: new Date().toISOString(),
  });
  const updated = await db.duesLineItems.get(lineItemId);
  if (updated) queueDuesItem(updated, 'update');
}

/** Get all payments for a trip */
export async function getTripPayments(tripId: string): Promise<PaymentRecord[]> {
  return db.paymentRecords.where('tripId').equals(tripId).toArray();
}

// ============================================
// SUMMARIES (Computed)
// ============================================

export function buildPlayerFinancialSummary({
  playerId,
  playerName,
  lineItems,
  payments,
}: {
  playerId: string;
  playerName: string;
  lineItems: DuesLineItem[];
  payments: PaymentRecord[];
}): PlayerFinancialSummary {
  const collectableLineItems = lineItems.filter(item => item.status !== 'waived');
  const totalDues = collectableLineItems.reduce((sum, item) => sum + item.amount, 0);
  const totalPaid = collectableLineItems.reduce((sum, item) => sum + item.amountPaid, 0);

  return {
    playerId,
    playerName,
    totalDues,
    totalPaid,
    balance: totalDues - totalPaid,
    lineItems,
    payments,
  };
}

export function buildTripFinancialSummary(
  tripId: string,
  players: FinancialSummaryPlayer[],
  lineItems: DuesLineItem[],
  paymentRecords: PaymentRecord[],
): TripFinancialSummary {
  const playerSummaries = players.map((player) =>
    buildPlayerFinancialSummary({
      playerId: player.id,
      playerName: formatPlayerName(player),
      lineItems: lineItems.filter((item) => item.playerId === player.id),
      payments: paymentRecords.filter((payment) => payment.fromPlayerId === player.id),
    })
  );

  const totalCollectable = playerSummaries.reduce((sum, summary) => sum + summary.totalDues, 0);
  const totalCollected = playerSummaries.reduce((sum, summary) => sum + summary.totalPaid, 0);
  const delinquent = playerSummaries
    .filter((summary) => summary.balance > 0)
    .sort((left, right) => right.balance - left.balance);

  return {
    tripId,
    totalCollectable,
    totalCollected,
    outstandingBalance: totalCollectable - totalCollected,
    playerSummaries,
    delinquent,
    isFullySettled: delinquent.length === 0,
  };
}

/** Get financial summary for a single player */
export async function getPlayerFinancialSummary(
  tripId: string,
  playerId: string,
  playerName: string,
): Promise<PlayerFinancialSummary> {
  const [lineItems, allPayments] = await Promise.all([
    getPlayerDues(tripId, playerId),
    getTripPayments(tripId),
  ]);

  return buildPlayerFinancialSummary({
    playerId,
    playerName,
    lineItems,
    payments: allPayments.filter(payment => payment.fromPlayerId === playerId),
  });
}

/** Get trip-wide financial summary */
export async function getTripFinancialSummary(
  tripId: string,
  players: Player[],
): Promise<TripFinancialSummary> {
  const [lineItems, paymentRecords] = await Promise.all([
    getTripDues(tripId),
    getTripPayments(tripId),
  ]);

  return buildTripFinancialSummary(tripId, players, lineItems, paymentRecords);
}

// ============================================
// PAYMENT LINK GENERATORS
// ============================================

/** Generate Venmo payment link */
export function getVenmoLink(username: string, amount: number, note: string): string {
  const amountDollars = (amount / 100).toFixed(2);
  return `venmo://paycharge?txn=pay&recipients=${encodeURIComponent(username)}&amount=${amountDollars}&note=${encodeURIComponent(note)}`;
}

/** Generate Zelle info (no deep link, just display) */
export function getZelleDisplay(email?: string, phone?: string): string {
  if (email) return `Zelle to: ${email}`;
  if (phone) return `Zelle to: ${phone}`;
  return 'Zelle (no info provided)';
}

/** Generate PayPal.me link */
export function getPayPalLink(username: string, amount: number): string {
  const amountDollars = (amount / 100).toFixed(2);
  return `https://paypal.me/${encodeURIComponent(username)}/${amountDollars}`;
}
