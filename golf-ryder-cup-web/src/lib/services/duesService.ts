/**
 * Dues & Payment Service
 *
 * Manages trip expense tracking: creating dues, recording payments,
 * computing financial summaries, and generating payment links.
 * Covers trip EXPENSES (green fees, cart fees, lodging, food, custom) —
 * separate from SettlementTransaction which covers game winnings.
 */

import { db } from '@/lib/db';
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
  logger.info('Created bulk dues', { count: items.length, category, amount });
  return items;
}

/** Update a dues item */
export async function updateDuesItem(id: string, updates: Partial<DuesLineItem>): Promise<void> {
  await db.duesLineItems.update(id, { ...updates, updatedAt: new Date().toISOString() });
}

/** Delete a dues item */
export async function deleteDuesItem(id: string): Promise<void> {
  await db.duesLineItems.delete(id);
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

  // Create payment record for audit trail
  await db.paymentRecords.add({
    id: crypto.randomUUID(),
    tripId: item.tripId,
    fromPlayerId: item.playerId,
    amount: item.amount,
    method,
    lineItemIds: [lineItemId],
    confirmedBy,
    confirmedAt: now,
    createdAt: now,
  });
}

/** Mark a dues item as waived */
export async function waiveDues(lineItemId: string): Promise<void> {
  await db.duesLineItems.update(lineItemId, {
    status: 'waived',
    updatedAt: new Date().toISOString(),
  });
}

/** Get all payments for a trip */
export async function getTripPayments(tripId: string): Promise<PaymentRecord[]> {
  return db.paymentRecords.where('tripId').equals(tripId).toArray();
}

// ============================================
// SUMMARIES (Computed)
// ============================================

/** Get financial summary for a single player */
export async function getPlayerFinancialSummary(
  tripId: string,
  playerId: string,
  playerName: string,
): Promise<PlayerFinancialSummary> {
  const lineItems = await getPlayerDues(tripId, playerId);
  const allPayments = await getTripPayments(tripId);
  const payments = allPayments.filter(p => p.fromPlayerId === playerId);

  const totalDues = lineItems
    .filter(i => i.status !== 'waived')
    .reduce((sum, i) => sum + i.amount, 0);
  const totalPaid = lineItems
    .filter(i => i.status !== 'waived')
    .reduce((sum, i) => sum + i.amountPaid, 0);

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

/** Get trip-wide financial summary */
export async function getTripFinancialSummary(
  tripId: string,
  players: Player[],
): Promise<TripFinancialSummary> {
  const playerSummaries: PlayerFinancialSummary[] = [];

  for (const player of players) {
    const summary = await getPlayerFinancialSummary(
      tripId,
      player.id,
      `${player.firstName} ${player.lastName}`,
    );
    playerSummaries.push(summary);
  }

  const totalCollectable = playerSummaries.reduce((sum, s) => sum + s.totalDues, 0);
  const totalCollected = playerSummaries.reduce((sum, s) => sum + s.totalPaid, 0);
  const delinquent = playerSummaries
    .filter(s => s.balance > 0)
    .sort((a, b) => b.balance - a.balance);

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
