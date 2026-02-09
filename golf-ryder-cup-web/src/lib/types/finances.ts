/**
 * Payment & Dues Tracker - Type Definitions
 *
 * Types for tracking trip expenses (green fees, cart fees, lodging, food, custom).
 * Separate from SettlementTransaction in sideGames.ts which covers game winnings.
 * All monetary amounts are stored in cents to avoid floating-point issues.
 */

import type { UUID, ISODateString } from './models';

/** Categories of trip expenses */
export type DuesCategory =
  | 'green_fee'
  | 'cart_fee'
  | 'lodging'
  | 'food_beverage'
  | 'calcutta'
  | 'skins_pot'
  | 'side_bet'
  | 'custom';

/** Status of a single dues line item */
export type DuesStatus = 'unpaid' | 'paid' | 'partial' | 'waived' | 'disputed';

/** Payment methods */
export type PaymentMethod = 'venmo' | 'zelle' | 'paypal' | 'cash' | 'check' | 'other';

/**
 * A single dues line item — represents a charge to a specific player.
 * Captain creates these, players see them on their dashboard.
 */
export interface DuesLineItem {
  id: UUID;
  tripId: UUID;
  playerId: UUID;
  category: DuesCategory;
  description: string;
  amount: number;           // Total amount owed (cents to avoid float issues)
  amountPaid: number;       // Amount paid so far (cents)
  status: DuesStatus;
  dueDate?: ISODateString;
  paidAt?: ISODateString;
  paidVia?: PaymentMethod;
  notes?: string;
  /** Who created this charge */
  createdBy: UUID;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

/**
 * A payment record — tracks when money changes hands.
 * One payment can cover multiple dues line items.
 */
export interface PaymentRecord {
  id: UUID;
  tripId: UUID;
  fromPlayerId: UUID;       // Who paid
  toPlayerId?: UUID;        // Who received (captain/organizer), null = house
  amount: number;           // Amount in cents
  method: PaymentMethod;
  lineItemIds: UUID[];      // Which dues this payment covers
  reference?: string;       // Venmo transaction ID, check #, etc.
  confirmedBy?: UUID;       // Captain who confirmed receipt
  confirmedAt?: ISODateString;
  notes?: string;
  createdAt: ISODateString;
}

/**
 * Summary of a player's financial position for a trip.
 * Computed, not stored.
 */
export interface PlayerFinancialSummary {
  playerId: UUID;
  playerName: string;
  totalDues: number;        // Total owed in cents
  totalPaid: number;        // Total paid in cents
  balance: number;          // Remaining (positive = still owes)
  lineItems: DuesLineItem[];
  payments: PaymentRecord[];
}

/**
 * Trip-wide financial overview. Computed, not stored.
 */
export interface TripFinancialSummary {
  tripId: UUID;
  totalCollectable: number; // Sum of all dues
  totalCollected: number;   // Sum of all payments
  outstandingBalance: number;
  playerSummaries: PlayerFinancialSummary[];
  /** Players with outstanding balance, sorted by amount desc */
  delinquent: PlayerFinancialSummary[];
  /** All fully paid */
  isFullySettled: boolean;
}

/** Category display config */
export const DUES_CATEGORIES: Record<DuesCategory, { label: string; icon: string; color: string }> = {
  green_fee: { label: 'Green Fees', icon: 'Flag', color: 'var(--masters)' },
  cart_fee: { label: 'Cart Fees', icon: 'Car', color: 'var(--info)' },
  lodging: { label: 'Lodging', icon: 'Home', color: 'var(--team-europe)' },
  food_beverage: { label: 'Food & Beverage', icon: 'UtensilsCrossed', color: 'var(--warning)' },
  calcutta: { label: 'Calcutta', icon: 'Gavel', color: 'var(--maroon)' },
  skins_pot: { label: 'Skins Pot', icon: 'Coins', color: 'var(--gold)' },
  side_bet: { label: 'Side Bet', icon: 'DollarSign', color: 'var(--success)' },
  custom: { label: 'Other', icon: 'Receipt', color: 'var(--ink-secondary)' },
};
