/**
 * Dues & Payment Service Tests
 *
 * Comprehensive tests for trip expense tracking: creating dues,
 * recording payments, computing financial summaries, and generating payment links.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { db } from '../lib/db';
import {
  createDuesItem,
  createBulkDues,
  updateDuesItem,
  deleteDuesItem,
  getTripDues,
  getPlayerDues,
  recordPayment,
  markAsPaid,
  waiveDues,
  getTripPayments,
  getPlayerFinancialSummary,
  getTripFinancialSummary,
  getVenmoLink,
  getZelleDisplay,
  getPayPalLink,
} from '../lib/services/duesService';
import type { Player } from '../lib/types/models';

// ============================================
// HELPERS
// ============================================

function createMockPlayer(id: string, firstName: string, lastName: string): Player {
  return {
    id,
    tripId: 'trip-1',
    firstName,
    lastName,
    handicapIndex: 10,
    createdAt: new Date().toISOString(),
  };
}

const TRIP_ID = 'trip-1';
const CAPTAIN_ID = 'captain-1';
const PLAYER_1_ID = 'player-1';
const PLAYER_2_ID = 'player-2';
const PLAYER_3_ID = 'player-3';

describe('DuesService', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  afterEach(async () => {
    await db.delete();
  });

  // ============================================
  // DUES CRUD
  // ============================================

  describe('createDuesItem', () => {
    it('should create and return a dues item with generated id', async () => {
      const result = await createDuesItem({
        tripId: TRIP_ID,
        playerId: PLAYER_1_ID,
        category: 'green_fee',
        description: 'Round 1 Green Fee',
        amount: 15000,
        amountPaid: 0,
        status: 'unpaid',
        createdBy: CAPTAIN_ID,
      });

      expect(result.id).toBeDefined();
      expect(result.id).toHaveLength(36); // UUID format
      expect(result.tripId).toBe(TRIP_ID);
      expect(result.playerId).toBe(PLAYER_1_ID);
      expect(result.category).toBe('green_fee');
      expect(result.description).toBe('Round 1 Green Fee');
      expect(result.amount).toBe(15000);
      expect(result.amountPaid).toBe(0);
      expect(result.status).toBe('unpaid');
      expect(result.createdBy).toBe(CAPTAIN_ID);
      expect(result.createdAt).toBeDefined();
      expect(result.updatedAt).toBeDefined();
    });

    it('should persist the item to the database', async () => {
      const result = await createDuesItem({
        tripId: TRIP_ID,
        playerId: PLAYER_1_ID,
        category: 'lodging',
        description: 'Hotel stay',
        amount: 50000,
        amountPaid: 0,
        status: 'unpaid',
        createdBy: CAPTAIN_ID,
      });

      const stored = await db.duesLineItems.get(result.id);
      expect(stored).toBeDefined();
      expect(stored!.amount).toBe(50000);
      expect(stored!.category).toBe('lodging');
    });

    it('should support optional fields like dueDate and notes', async () => {
      const result = await createDuesItem({
        tripId: TRIP_ID,
        playerId: PLAYER_1_ID,
        category: 'custom',
        description: 'Caddie tips',
        amount: 5000,
        amountPaid: 0,
        status: 'unpaid',
        dueDate: '2026-03-15T00:00:00.000Z',
        notes: 'Per-round caddie tip',
        createdBy: CAPTAIN_ID,
      });

      expect(result.dueDate).toBe('2026-03-15T00:00:00.000Z');
      expect(result.notes).toBe('Per-round caddie tip');
    });
  });

  describe('createBulkDues', () => {
    it('should create items for all players', async () => {
      const playerIds = [PLAYER_1_ID, PLAYER_2_ID, PLAYER_3_ID];

      const results = await createBulkDues(
        TRIP_ID,
        playerIds,
        'green_fee',
        'Day 1 Green Fee',
        15000,
        CAPTAIN_ID,
      );

      expect(results).toHaveLength(3);
      results.forEach(item => {
        expect(item.category).toBe('green_fee');
        expect(item.amount).toBe(15000);
        expect(item.amountPaid).toBe(0);
        expect(item.status).toBe('unpaid');
        expect(item.createdBy).toBe(CAPTAIN_ID);
      });

      // Verify each player got one
      const ids = results.map(r => r.playerId);
      expect(ids).toContain(PLAYER_1_ID);
      expect(ids).toContain(PLAYER_2_ID);
      expect(ids).toContain(PLAYER_3_ID);
    });

    it('should persist all items to the database', async () => {
      const playerIds = [PLAYER_1_ID, PLAYER_2_ID];

      await createBulkDues(
        TRIP_ID,
        playerIds,
        'cart_fee',
        'Cart rental',
        3500,
        CAPTAIN_ID,
      );

      const stored = await db.duesLineItems.where('tripId').equals(TRIP_ID).toArray();
      expect(stored).toHaveLength(2);
    });

    it('should apply optional dueDate to all items', async () => {
      const dueDate = '2026-04-01T00:00:00.000Z';
      const results = await createBulkDues(
        TRIP_ID,
        [PLAYER_1_ID, PLAYER_2_ID],
        'lodging',
        'Hotel',
        50000,
        CAPTAIN_ID,
        dueDate,
      );

      results.forEach(item => {
        expect(item.dueDate).toBe(dueDate);
      });
    });

    it('should generate unique IDs for each item', async () => {
      const results = await createBulkDues(
        TRIP_ID,
        [PLAYER_1_ID, PLAYER_2_ID, PLAYER_3_ID],
        'food_beverage',
        'Dinner',
        8000,
        CAPTAIN_ID,
      );

      const uniqueIds = new Set(results.map(r => r.id));
      expect(uniqueIds.size).toBe(3);
    });
  });

  describe('updateDuesItem', () => {
    it('should update fields and set updatedAt', async () => {
      const item = await createDuesItem({
        tripId: TRIP_ID,
        playerId: PLAYER_1_ID,
        category: 'green_fee',
        description: 'Green Fee',
        amount: 15000,
        amountPaid: 0,
        status: 'unpaid',
        createdBy: CAPTAIN_ID,
      });

      const originalUpdatedAt = item.updatedAt;

      // Small delay to ensure updatedAt differs
      await new Promise(resolve => setTimeout(resolve, 10));

      await updateDuesItem(item.id, { amount: 18000, description: 'Green Fee (updated)' });

      const updated = await db.duesLineItems.get(item.id);
      expect(updated!.amount).toBe(18000);
      expect(updated!.description).toBe('Green Fee (updated)');
      expect(updated!.updatedAt).not.toBe(originalUpdatedAt);
    });
  });

  describe('deleteDuesItem', () => {
    it('should remove the item from the database', async () => {
      const item = await createDuesItem({
        tripId: TRIP_ID,
        playerId: PLAYER_1_ID,
        category: 'custom',
        description: 'Temp charge',
        amount: 1000,
        amountPaid: 0,
        status: 'unpaid',
        createdBy: CAPTAIN_ID,
      });

      await deleteDuesItem(item.id);

      const stored = await db.duesLineItems.get(item.id);
      expect(stored).toBeUndefined();
    });
  });

  describe('getTripDues', () => {
    it('should return all dues for a trip', async () => {
      await createDuesItem({
        tripId: TRIP_ID,
        playerId: PLAYER_1_ID,
        category: 'green_fee',
        description: 'Green Fee',
        amount: 15000,
        amountPaid: 0,
        status: 'unpaid',
        createdBy: CAPTAIN_ID,
      });
      await createDuesItem({
        tripId: TRIP_ID,
        playerId: PLAYER_2_ID,
        category: 'lodging',
        description: 'Lodging',
        amount: 50000,
        amountPaid: 0,
        status: 'unpaid',
        createdBy: CAPTAIN_ID,
      });
      // Different trip — should not appear
      await createDuesItem({
        tripId: 'trip-other',
        playerId: PLAYER_1_ID,
        category: 'cart_fee',
        description: 'Cart',
        amount: 3000,
        amountPaid: 0,
        status: 'unpaid',
        createdBy: CAPTAIN_ID,
      });

      const results = await getTripDues(TRIP_ID);
      expect(results).toHaveLength(2);
    });
  });

  describe('getPlayerDues', () => {
    it('should return dues for a specific player in a trip', async () => {
      await createDuesItem({
        tripId: TRIP_ID,
        playerId: PLAYER_1_ID,
        category: 'green_fee',
        description: 'Green Fee',
        amount: 15000,
        amountPaid: 0,
        status: 'unpaid',
        createdBy: CAPTAIN_ID,
      });
      await createDuesItem({
        tripId: TRIP_ID,
        playerId: PLAYER_1_ID,
        category: 'lodging',
        description: 'Lodging',
        amount: 50000,
        amountPaid: 0,
        status: 'unpaid',
        createdBy: CAPTAIN_ID,
      });
      await createDuesItem({
        tripId: TRIP_ID,
        playerId: PLAYER_2_ID,
        category: 'cart_fee',
        description: 'Cart',
        amount: 3000,
        amountPaid: 0,
        status: 'unpaid',
        createdBy: CAPTAIN_ID,
      });

      const results = await getPlayerDues(TRIP_ID, PLAYER_1_ID);
      expect(results).toHaveLength(2);
      results.forEach(item => {
        expect(item.playerId).toBe(PLAYER_1_ID);
      });
    });
  });

  // ============================================
  // PAYMENTS
  // ============================================

  describe('recordPayment', () => {
    it('should create a payment record and update line item status to paid', async () => {
      const duesItem = await createDuesItem({
        tripId: TRIP_ID,
        playerId: PLAYER_1_ID,
        category: 'green_fee',
        description: 'Green Fee',
        amount: 15000,
        amountPaid: 0,
        status: 'unpaid',
        createdBy: CAPTAIN_ID,
      });

      const payment = await recordPayment({
        tripId: TRIP_ID,
        fromPlayerId: PLAYER_1_ID,
        amount: 15000,
        method: 'venmo',
        lineItemIds: [duesItem.id],
        reference: 'venmo-txn-123',
      });

      expect(payment.id).toBeDefined();
      expect(payment.amount).toBe(15000);
      expect(payment.method).toBe('venmo');
      expect(payment.createdAt).toBeDefined();

      // Line item should be marked paid
      const updated = await db.duesLineItems.get(duesItem.id);
      expect(updated!.status).toBe('paid');
      expect(updated!.amountPaid).toBe(15000);
      expect(updated!.paidVia).toBe('venmo');
      expect(updated!.paidAt).toBeDefined();
    });

    it('should set status to partial for partial payment', async () => {
      const duesItem = await createDuesItem({
        tripId: TRIP_ID,
        playerId: PLAYER_1_ID,
        category: 'lodging',
        description: 'Hotel',
        amount: 50000,
        amountPaid: 0,
        status: 'unpaid',
        createdBy: CAPTAIN_ID,
      });

      await recordPayment({
        tripId: TRIP_ID,
        fromPlayerId: PLAYER_1_ID,
        amount: 25000,
        method: 'cash',
        lineItemIds: [duesItem.id],
      });

      const updated = await db.duesLineItems.get(duesItem.id);
      expect(updated!.status).toBe('partial');
      expect(updated!.amountPaid).toBe(25000);
      expect(updated!.paidAt).toBeUndefined();
    });

    it('should cap amountPaid at the total amount', async () => {
      const duesItem = await createDuesItem({
        tripId: TRIP_ID,
        playerId: PLAYER_1_ID,
        category: 'green_fee',
        description: 'Green Fee',
        amount: 15000,
        amountPaid: 0,
        status: 'unpaid',
        createdBy: CAPTAIN_ID,
      });

      await recordPayment({
        tripId: TRIP_ID,
        fromPlayerId: PLAYER_1_ID,
        amount: 20000, // Overpayment
        method: 'cash',
        lineItemIds: [duesItem.id],
      });

      const updated = await db.duesLineItems.get(duesItem.id);
      expect(updated!.amountPaid).toBe(15000); // Capped at amount
      expect(updated!.status).toBe('paid');
    });
  });

  describe('markAsPaid', () => {
    it('should update status and create payment record', async () => {
      const duesItem = await createDuesItem({
        tripId: TRIP_ID,
        playerId: PLAYER_1_ID,
        category: 'green_fee',
        description: 'Green Fee',
        amount: 15000,
        amountPaid: 0,
        status: 'unpaid',
        createdBy: CAPTAIN_ID,
      });

      await markAsPaid(duesItem.id, 'cash', CAPTAIN_ID);

      // Verify line item updated
      const updated = await db.duesLineItems.get(duesItem.id);
      expect(updated!.status).toBe('paid');
      expect(updated!.amountPaid).toBe(15000);
      expect(updated!.paidVia).toBe('cash');
      expect(updated!.paidAt).toBeDefined();

      // Verify audit payment record created
      const payments = await db.paymentRecords.where('tripId').equals(TRIP_ID).toArray();
      expect(payments).toHaveLength(1);
      expect(payments[0].fromPlayerId).toBe(PLAYER_1_ID);
      expect(payments[0].amount).toBe(15000);
      expect(payments[0].method).toBe('cash');
      expect(payments[0].confirmedBy).toBe(CAPTAIN_ID);
      expect(payments[0].confirmedAt).toBeDefined();
      expect(payments[0].lineItemIds).toEqual([duesItem.id]);
    });

    it('should throw if line item does not exist', async () => {
      await expect(markAsPaid('nonexistent-id', 'cash', CAPTAIN_ID))
        .rejects.toThrow('Dues item nonexistent-id not found');
    });
  });

  describe('waiveDues', () => {
    it('should set status to waived', async () => {
      const duesItem = await createDuesItem({
        tripId: TRIP_ID,
        playerId: PLAYER_1_ID,
        category: 'food_beverage',
        description: 'Dinner (comped)',
        amount: 8000,
        amountPaid: 0,
        status: 'unpaid',
        createdBy: CAPTAIN_ID,
      });

      await waiveDues(duesItem.id);

      const updated = await db.duesLineItems.get(duesItem.id);
      expect(updated!.status).toBe('waived');
      expect(updated!.updatedAt).toBeDefined();
    });
  });

  describe('getTripPayments', () => {
    it('should return all payments for a trip', async () => {
      const duesItem1 = await createDuesItem({
        tripId: TRIP_ID,
        playerId: PLAYER_1_ID,
        category: 'green_fee',
        description: 'Green Fee',
        amount: 15000,
        amountPaid: 0,
        status: 'unpaid',
        createdBy: CAPTAIN_ID,
      });
      const duesItem2 = await createDuesItem({
        tripId: TRIP_ID,
        playerId: PLAYER_2_ID,
        category: 'lodging',
        description: 'Lodging',
        amount: 50000,
        amountPaid: 0,
        status: 'unpaid',
        createdBy: CAPTAIN_ID,
      });

      await recordPayment({
        tripId: TRIP_ID,
        fromPlayerId: PLAYER_1_ID,
        amount: 15000,
        method: 'venmo',
        lineItemIds: [duesItem1.id],
      });
      await recordPayment({
        tripId: TRIP_ID,
        fromPlayerId: PLAYER_2_ID,
        amount: 50000,
        method: 'zelle',
        lineItemIds: [duesItem2.id],
      });

      const payments = await getTripPayments(TRIP_ID);
      expect(payments).toHaveLength(2);
    });
  });

  // ============================================
  // SUMMARIES
  // ============================================

  describe('getPlayerFinancialSummary', () => {
    it('should compute correct totals for unpaid dues', async () => {
      await createDuesItem({
        tripId: TRIP_ID,
        playerId: PLAYER_1_ID,
        category: 'green_fee',
        description: 'Green Fee',
        amount: 15000,
        amountPaid: 0,
        status: 'unpaid',
        createdBy: CAPTAIN_ID,
      });
      await createDuesItem({
        tripId: TRIP_ID,
        playerId: PLAYER_1_ID,
        category: 'lodging',
        description: 'Lodging',
        amount: 50000,
        amountPaid: 0,
        status: 'unpaid',
        createdBy: CAPTAIN_ID,
      });

      const summary = await getPlayerFinancialSummary(TRIP_ID, PLAYER_1_ID, 'Tiger Woods');

      expect(summary.playerId).toBe(PLAYER_1_ID);
      expect(summary.playerName).toBe('Tiger Woods');
      expect(summary.totalDues).toBe(65000);
      expect(summary.totalPaid).toBe(0);
      expect(summary.balance).toBe(65000);
      expect(summary.lineItems).toHaveLength(2);
      expect(summary.payments).toHaveLength(0);
    });

    it('should reflect partial payments in the summary', async () => {
      const duesItem = await createDuesItem({
        tripId: TRIP_ID,
        playerId: PLAYER_1_ID,
        category: 'lodging',
        description: 'Hotel',
        amount: 50000,
        amountPaid: 0,
        status: 'unpaid',
        createdBy: CAPTAIN_ID,
      });

      await recordPayment({
        tripId: TRIP_ID,
        fromPlayerId: PLAYER_1_ID,
        amount: 30000,
        method: 'venmo',
        lineItemIds: [duesItem.id],
      });

      const summary = await getPlayerFinancialSummary(TRIP_ID, PLAYER_1_ID, 'Tiger Woods');

      expect(summary.totalDues).toBe(50000);
      expect(summary.totalPaid).toBe(30000);
      expect(summary.balance).toBe(20000);
      expect(summary.payments).toHaveLength(1);
    });

    it('should exclude waived items from balance calculations', async () => {
      await createDuesItem({
        tripId: TRIP_ID,
        playerId: PLAYER_1_ID,
        category: 'green_fee',
        description: 'Green Fee',
        amount: 15000,
        amountPaid: 0,
        status: 'unpaid',
        createdBy: CAPTAIN_ID,
      });

      const waivedItem = await createDuesItem({
        tripId: TRIP_ID,
        playerId: PLAYER_1_ID,
        category: 'food_beverage',
        description: 'Dinner (comped)',
        amount: 8000,
        amountPaid: 0,
        status: 'unpaid',
        createdBy: CAPTAIN_ID,
      });

      await waiveDues(waivedItem.id);

      const summary = await getPlayerFinancialSummary(TRIP_ID, PLAYER_1_ID, 'Tiger Woods');

      // Waived item should NOT count toward totalDues or balance
      expect(summary.totalDues).toBe(15000);
      expect(summary.totalPaid).toBe(0);
      expect(summary.balance).toBe(15000);
      // But the line item still appears in the list
      expect(summary.lineItems).toHaveLength(2);
    });

    it('should show zero balance when fully paid', async () => {
      const duesItem = await createDuesItem({
        tripId: TRIP_ID,
        playerId: PLAYER_1_ID,
        category: 'green_fee',
        description: 'Green Fee',
        amount: 15000,
        amountPaid: 0,
        status: 'unpaid',
        createdBy: CAPTAIN_ID,
      });

      await markAsPaid(duesItem.id, 'cash', CAPTAIN_ID);

      const summary = await getPlayerFinancialSummary(TRIP_ID, PLAYER_1_ID, 'Tiger Woods');

      expect(summary.totalDues).toBe(15000);
      expect(summary.totalPaid).toBe(15000);
      expect(summary.balance).toBe(0);
    });
  });

  describe('getTripFinancialSummary', () => {
    it('should aggregate all players correctly', async () => {
      const players: Player[] = [
        createMockPlayer(PLAYER_1_ID, 'Tiger', 'Woods'),
        createMockPlayer(PLAYER_2_ID, 'Phil', 'Mickelson'),
        createMockPlayer(PLAYER_3_ID, 'Rory', 'McIlroy'),
      ];

      // Create dues for all players
      await createBulkDues(TRIP_ID, [PLAYER_1_ID, PLAYER_2_ID, PLAYER_3_ID], 'green_fee', 'Green Fee', 15000, CAPTAIN_ID);
      await createBulkDues(TRIP_ID, [PLAYER_1_ID, PLAYER_2_ID, PLAYER_3_ID], 'lodging', 'Hotel', 50000, CAPTAIN_ID);

      const summary = await getTripFinancialSummary(TRIP_ID, players);

      expect(summary.tripId).toBe(TRIP_ID);
      expect(summary.totalCollectable).toBe(195000); // 3 players * (15000 + 50000)
      expect(summary.totalCollected).toBe(0);
      expect(summary.outstandingBalance).toBe(195000);
      expect(summary.playerSummaries).toHaveLength(3);
      expect(summary.delinquent).toHaveLength(3);
      expect(summary.isFullySettled).toBe(false);
    });

    it('should sort delinquent players by balance descending', async () => {
      const players: Player[] = [
        createMockPlayer(PLAYER_1_ID, 'Tiger', 'Woods'),
        createMockPlayer(PLAYER_2_ID, 'Phil', 'Mickelson'),
      ];

      // Player 1 owes more
      await createDuesItem({
        tripId: TRIP_ID,
        playerId: PLAYER_1_ID,
        category: 'green_fee',
        description: 'Green Fee',
        amount: 30000,
        amountPaid: 0,
        status: 'unpaid',
        createdBy: CAPTAIN_ID,
      });
      await createDuesItem({
        tripId: TRIP_ID,
        playerId: PLAYER_2_ID,
        category: 'green_fee',
        description: 'Green Fee',
        amount: 15000,
        amountPaid: 0,
        status: 'unpaid',
        createdBy: CAPTAIN_ID,
      });

      const summary = await getTripFinancialSummary(TRIP_ID, players);

      expect(summary.delinquent[0].playerId).toBe(PLAYER_1_ID);
      expect(summary.delinquent[0].balance).toBe(30000);
      expect(summary.delinquent[1].playerId).toBe(PLAYER_2_ID);
      expect(summary.delinquent[1].balance).toBe(15000);
    });

    it('should report isFullySettled when all dues are paid', async () => {
      const players: Player[] = [
        createMockPlayer(PLAYER_1_ID, 'Tiger', 'Woods'),
        createMockPlayer(PLAYER_2_ID, 'Phil', 'Mickelson'),
      ];

      const items = await createBulkDues(TRIP_ID, [PLAYER_1_ID, PLAYER_2_ID], 'green_fee', 'Green Fee', 15000, CAPTAIN_ID);

      // Mark both as paid
      for (const item of items) {
        await markAsPaid(item.id, 'venmo', CAPTAIN_ID);
      }

      const summary = await getTripFinancialSummary(TRIP_ID, players);

      expect(summary.totalCollectable).toBe(30000);
      expect(summary.totalCollected).toBe(30000);
      expect(summary.outstandingBalance).toBe(0);
      expect(summary.delinquent).toHaveLength(0);
      expect(summary.isFullySettled).toBe(true);
    });

    it('should exclude waived items from trip totals', async () => {
      const players: Player[] = [
        createMockPlayer(PLAYER_1_ID, 'Tiger', 'Woods'),
      ];

      await createDuesItem({
        tripId: TRIP_ID,
        playerId: PLAYER_1_ID,
        category: 'green_fee',
        description: 'Green Fee',
        amount: 15000,
        amountPaid: 0,
        status: 'unpaid',
        createdBy: CAPTAIN_ID,
      });

      const waivedItem = await createDuesItem({
        tripId: TRIP_ID,
        playerId: PLAYER_1_ID,
        category: 'food_beverage',
        description: 'Dinner (comped)',
        amount: 8000,
        amountPaid: 0,
        status: 'unpaid',
        createdBy: CAPTAIN_ID,
      });

      await waiveDues(waivedItem.id);

      const summary = await getTripFinancialSummary(TRIP_ID, players);

      expect(summary.totalCollectable).toBe(15000); // Only green fee, not the waived dinner
      expect(summary.outstandingBalance).toBe(15000);
    });

    it('should handle a trip with zero dues gracefully', async () => {
      const players: Player[] = [
        createMockPlayer(PLAYER_1_ID, 'Tiger', 'Woods'),
      ];

      const summary = await getTripFinancialSummary(TRIP_ID, players);

      expect(summary.totalCollectable).toBe(0);
      expect(summary.totalCollected).toBe(0);
      expect(summary.outstandingBalance).toBe(0);
      expect(summary.isFullySettled).toBe(true);
      expect(summary.delinquent).toHaveLength(0);
    });
  });

  // ============================================
  // PAYMENT LINK GENERATORS
  // ============================================

  describe('getVenmoLink', () => {
    it('should produce a valid Venmo deep link', () => {
      const link = getVenmoLink('johndoe', 15000, 'Ryder Cup green fee');

      expect(link).toContain('venmo://paycharge');
      expect(link).toContain('txn=pay');
      expect(link).toContain('recipients=johndoe');
      expect(link).toContain('amount=150.00');
      expect(link).toContain('note=Ryder%20Cup%20green%20fee');
    });

    it('should convert cents to dollars correctly', () => {
      const link = getVenmoLink('player1', 9950, 'Test');
      expect(link).toContain('amount=99.50');
    });

    it('should encode special characters in username and note', () => {
      const link = getVenmoLink('john-doe_1', 5000, 'Trip #1 - Green fee & cart');
      expect(link).toContain('recipients=john-doe_1');
      expect(link).toContain(encodeURIComponent('Trip #1 - Green fee & cart'));
    });
  });

  describe('getZelleDisplay', () => {
    it('should display email when provided', () => {
      expect(getZelleDisplay('john@example.com')).toBe('Zelle to: john@example.com');
    });

    it('should display phone when email is not provided', () => {
      expect(getZelleDisplay(undefined, '555-123-4567')).toBe('Zelle to: 555-123-4567');
    });

    it('should prefer email over phone', () => {
      expect(getZelleDisplay('john@example.com', '555-123-4567')).toBe('Zelle to: john@example.com');
    });

    it('should show fallback when neither is provided', () => {
      expect(getZelleDisplay()).toBe('Zelle (no info provided)');
    });
  });

  describe('getPayPalLink', () => {
    it('should produce a valid PayPal.me URL', () => {
      const link = getPayPalLink('johndoe', 15000);

      expect(link).toBe('https://paypal.me/johndoe/150.00');
    });

    it('should convert cents to dollars correctly', () => {
      const link = getPayPalLink('player1', 9950);
      expect(link).toBe('https://paypal.me/player1/99.50');
    });

    it('should encode special characters in username', () => {
      const link = getPayPalLink('john doe', 5000);
      expect(link).toContain('paypal.me/john%20doe/50.00');
    });
  });
});
