/**
 * Cart Assignment Manager
 *
 * Assign golf carts to players and groups.
 * Helps with logistics and ensures everyone knows their cart partner.
 *
 * Features:
 * - Visual cart assignment grid
 * - Drag-and-drop player assignment
 * - Cart partner visibility
 * - Auto-assignment suggestions
 * - Print cart assignment sheet
 */

'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Car,
    Printer,
    Check,
    X,
    AlertCircle,
    ChevronDown,
    ChevronUp,
    Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================
// TYPES
// ============================================

export interface CartPlayer {
    id: string;
    firstName: string;
    lastName: string;
    teamId: 'A' | 'B';
    teeTime?: string;
    matchId?: string;
}

export interface Cart {
    id: string;
    number: string;
    players: CartPlayer[];
    maxCapacity: number;
    notes?: string;
}

interface CartAssignmentManagerProps {
    players: CartPlayer[];
    initialCarts?: Cart[];
    maxCartsPerCart?: number;
    teamAName?: string;
    teamBName?: string;
    onAssignmentsChange?: (carts: Cart[]) => void;
    className?: string;
}

// ============================================
// UTILITIES
// ============================================

function generateCartNumber(index: number): string {
    return `Cart ${index + 1}`;
}

// ============================================
// CART CARD COMPONENT
// ============================================

interface CartCardProps {
    cart: Cart;
    availablePlayers: CartPlayer[];
    onAddPlayer: (playerId: string) => void;
    onRemovePlayer: (playerId: string) => void;
    onUpdateNotes: (notes: string) => void;
    teamAName?: string;
    teamBName?: string;
}

function CartCard({
    cart,
    availablePlayers,
    onAddPlayer,
    onRemovePlayer,
    onUpdateNotes,
    teamAName = 'Team A',
    teamBName = 'Team B',
}: CartCardProps) {
    const [expanded, setExpanded] = useState(false);
    const [showPlayerPicker, setShowPlayerPicker] = useState(false);

    const isFull = cart.players.length >= cart.maxCapacity;
    const isEmpty = cart.players.length === 0;

    return (
        <div
            className="rounded-xl overflow-hidden bg-[var(--surface)] border border-[rgba(128,120,104,0.2)]"
        >
            {/* Header */}
            <div
                className="p-4 flex items-center justify-between cursor-pointer"
                onClick={() => setExpanded(!expanded)}
            >
                <div className="flex items-center gap-3">
                    <div
                        className={cn(
                            'w-10 h-10 rounded-lg flex items-center justify-center',
                            isEmpty
                                ? 'bg-[var(--canvas)]'
                                : isFull
                                  ? 'bg-[var(--masters-muted)]'
                                  : 'bg-amber-500/20'
                        )}
                    >
                        <Car
                            className={cn(
                                'w-5 h-5',
                                isEmpty
                                    ? 'text-[var(--ink-muted)]'
                                    : isFull
                                      ? 'text-[var(--masters)]'
                                      : 'text-amber-500'
                            )}
                        />
                    </div>
                    <div>
                        <p className="font-semibold text-[var(--ink)]">
                            {cart.number}
                        </p>
                        <p className="text-sm text-[var(--ink-muted)]">
                            {cart.players.length}/{cart.maxCapacity} players
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {cart.players.length > 0 && (
                        <div className="flex -space-x-2">
                            {cart.players.slice(0, 2).map((player, _idx) => (
                                <div
                                    key={player.id}
                                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2"
                                    style={{
                                        background: player.teamId === 'A' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(59, 130, 246, 0.2)',
                                        borderColor: 'var(--surface)',
                                        color: player.teamId === 'A' ? '#ef4444' : '#3b82f6',
                                    }}
                                >
                                    {player.firstName[0]}{player.lastName[0]}
                                </div>
                            ))}
                        </div>
                    )}
                    {expanded ? (
                        <ChevronUp className="w-5 h-5 text-[var(--ink-muted)]" />
                    ) : (
                        <ChevronDown className="w-5 h-5 text-[var(--ink-muted)]" />
                    )}
                </div>
            </div>

            {/* Expanded Content */}
            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="px-4 pb-4">
                            {/* Players List */}
                            <div className="space-y-2 mb-4">
                                {cart.players.map(player => (
                                    <div
                                        key={player.id}
                                        className="flex items-center justify-between p-2 rounded-lg bg-[var(--canvas)]"
                                    >
                                        <div className="flex items-center gap-2">
                                            <div
                                                className="w-3 h-3 rounded-full"
                                                style={{ background: player.teamId === 'A' ? '#ef4444' : '#3b82f6' }}
                                            />
                                            <span className="text-[var(--ink)]">
                                                {player.firstName} {player.lastName}
                                            </span>
                                            <span className="text-xs text-[var(--ink-muted)]">
                                                {player.teamId === 'A' ? teamAName : teamBName}
                                            </span>
                                        </div>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onRemovePlayer(player.id);
                                            }}
                                            className="p-1 rounded hover:bg-red-500/20 transition-colors"
                                        >
                                            <X className="w-4 h-4 text-red-500" />
                                        </button>
                                    </div>
                                ))}

                                {isEmpty && (
                                    <p className="text-center py-4 text-sm text-[var(--ink-muted)]">
                                        No players assigned
                                    </p>
                                )}
                            </div>

                            {/* Add Player */}
                            {!isFull && (
                                <div>
                                    <button
                                        onClick={() => setShowPlayerPicker(!showPlayerPicker)}
                                        className="w-full p-2 rounded-lg text-sm font-medium border-2 border-dashed transition-colors hover:border-solid border-[rgba(128,120,104,0.3)] text-[var(--ink-muted)]"
                                    >
                                        + Add Player
                                    </button>

                                    <AnimatePresence>
                                        {showPlayerPicker && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                className="mt-2 max-h-48 overflow-y-auto rounded-lg bg-[var(--canvas)]"
                                            >
                                                {availablePlayers.length === 0 ? (
                                                    <p className="p-3 text-center text-sm text-[var(--ink-muted)]">
                                                        All players assigned
                                                    </p>
                                                ) : (
                                                    availablePlayers.map(player => (
                                                        <button
                                                            key={player.id}
                                                            onClick={() => {
                                                                onAddPlayer(player.id);
                                                                setShowPlayerPicker(false);
                                                            }}
                                                            className="w-full flex items-center gap-2 p-2 hover:bg-white/5 transition-colors"
                                                        >
                                                            <div
                                                                className="w-3 h-3 rounded-full"
                                                                style={{ background: player.teamId === 'A' ? '#ef4444' : '#3b82f6' }}
                                                            />
                                                            <span className="text-[var(--ink)]">
                                                                {player.firstName} {player.lastName}
                                                            </span>
                                                        </button>
                                                    ))
                                                )}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            )}

                            {/* Notes */}
                            <div className="mt-4">
                                <input
                                    type="text"
                                    value={cart.notes || ''}
                                    onChange={(e) => onUpdateNotes(e.target.value)}
                                    placeholder="Add notes (e.g., cooler, umbrellas)..."
                                    className="w-full p-2 rounded-lg text-sm"
                                    style={{
                                        background: 'var(--canvas)',
                                        color: 'var(--ink)',
                                        border: '1px solid rgba(128, 120, 104, 0.2)',
                                    }}
                                />
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ============================================
// CART ASSIGNMENT MANAGER
// ============================================

export function CartAssignmentManager({
    players,
    initialCarts,
    maxCartsPerCart = 2,
    teamAName = 'Team A',
    teamBName = 'Team B',
    onAssignmentsChange,
    className,
}: CartAssignmentManagerProps) {
    // Initialize carts based on player count
    const defaultCartCount = Math.ceil(players.length / maxCartsPerCart);
    const [carts, setCarts] = useState<Cart[]>(
        initialCarts ||
        Array.from({ length: defaultCartCount }, (_, i) => ({
            id: `cart-${i}`,
            number: generateCartNumber(i),
            players: [],
            maxCapacity: maxCartsPerCart,
        }))
    );

    const assignedPlayerIds = new Set(carts.flatMap(c => c.players.map(p => p.id)));
    const unassignedPlayers = players.filter(p => !assignedPlayerIds.has(p.id));

    const handleAddPlayer = useCallback((cartId: string, playerId: string) => {
        const player = players.find(p => p.id === playerId);
        if (!player) return;

        setCarts(prev => {
            const updated = prev.map(cart => {
                if (cart.id === cartId && cart.players.length < cart.maxCapacity) {
                    return { ...cart, players: [...cart.players, player] };
                }
                return cart;
            });
            onAssignmentsChange?.(updated);
            return updated;
        });
    }, [players, onAssignmentsChange]);

    const handleRemovePlayer = useCallback((cartId: string, playerId: string) => {
        setCarts(prev => {
            const updated = prev.map(cart => {
                if (cart.id === cartId) {
                    return { ...cart, players: cart.players.filter(p => p.id !== playerId) };
                }
                return cart;
            });
            onAssignmentsChange?.(updated);
            return updated;
        });
    }, [onAssignmentsChange]);

    const handleUpdateNotes = useCallback((cartId: string, notes: string) => {
        setCarts(prev => {
            const updated = prev.map(cart => {
                if (cart.id === cartId) {
                    return { ...cart, notes };
                }
                return cart;
            });
            onAssignmentsChange?.(updated);
            return updated;
        });
    }, [onAssignmentsChange]);

    const handleAutoAssign = useCallback(() => {
        // Group players by match/tee time first, then by team
        const playersByGroup = new Map<string, CartPlayer[]>();

        players.forEach(player => {
            const key = player.teeTime || player.matchId || 'unassigned';
            if (!playersByGroup.has(key)) {
                playersByGroup.set(key, []);
            }
            playersByGroup.get(key)!.push(player);
        });

        const newCarts: Cart[] = [];
        let cartIndex = 0;

        playersByGroup.forEach(groupPlayers => {
            // Pair players from same group (ideally mix teams)
            const teamAPlayers = groupPlayers.filter(p => p.teamId === 'A');
            const teamBPlayers = groupPlayers.filter(p => p.teamId === 'B');

            // Pair Team A with Team B players for social mixing
            const maxPairs = Math.min(teamAPlayers.length, teamBPlayers.length);

            for (let i = 0; i < maxPairs; i++) {
                newCarts.push({
                    id: `cart-${cartIndex}`,
                    number: generateCartNumber(cartIndex),
                    players: [teamAPlayers[i], teamBPlayers[i]],
                    maxCapacity: maxCartsPerCart,
                });
                cartIndex++;
            }

            // Handle remaining players
            const remaining = [
                ...teamAPlayers.slice(maxPairs),
                ...teamBPlayers.slice(maxPairs),
            ];

            for (let i = 0; i < remaining.length; i += maxCartsPerCart) {
                const cartPlayers = remaining.slice(i, i + maxCartsPerCart);
                if (cartPlayers.length > 0) {
                    newCarts.push({
                        id: `cart-${cartIndex}`,
                        number: generateCartNumber(cartIndex),
                        players: cartPlayers,
                        maxCapacity: maxCartsPerCart,
                    });
                    cartIndex++;
                }
            }
        });

        setCarts(newCarts);
        onAssignmentsChange?.(newCarts);
    }, [players, maxCartsPerCart, onAssignmentsChange]);

    const handleAddCart = useCallback(() => {
        setCarts(prev => {
            const updated = [
                ...prev,
                {
                    id: `cart-${prev.length}`,
                    number: generateCartNumber(prev.length),
                    players: [],
                    maxCapacity: maxCartsPerCart,
                },
            ];
            onAssignmentsChange?.(updated);
            return updated;
        });
    }, [maxCartsPerCart, onAssignmentsChange]);

    const handlePrint = useCallback(() => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const cartsHtml = carts
            .filter(c => c.players.length > 0)
            .map(cart => `
        <div style="margin-bottom: 15px; padding: 12px; border: 1px solid #ddd; border-radius: 8px;">
          <div style="font-weight: bold; font-size: 16px; margin-bottom: 8px;">🚗 ${cart.number}</div>
          <div style="margin-left: 20px;">
            ${cart.players.map(p => `
              <div style="display: flex; align-items: center; gap: 8px; margin: 4px 0;">
                <span style="color: ${p.teamId === 'A' ? '#ef4444' : '#3b82f6'};">●</span>
                ${p.firstName} ${p.lastName}
              </div>
            `).join('')}
          </div>
          ${cart.notes ? `<div style="margin-top: 8px; font-size: 12px; color: #666;">Notes: ${cart.notes}</div>` : ''}
        </div>
      `).join('');

        printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Cart Assignments</title>
          <style>
            body { font-family: system-ui, sans-serif; padding: 20px; }
            h1 { margin-bottom: 20px; }
          </style>
        </head>
        <body>
          <h1>🏌️ Cart Assignments</h1>
          ${cartsHtml}
        </body>
      </html>
    `);
        printWindow.document.close();
        printWindow.print();
    }, [carts]);

    const totalAssigned = carts.reduce((sum, c) => sum + c.players.length, 0);
    const allAssigned = totalAssigned === players.length;

    return (
        <div className={cn('flex flex-col', className)}>
            {/* Header */}
            <div className="p-4 border-b" style={{ borderColor: 'rgba(128, 120, 104, 0.2)' }}>
                <div className="flex items-center justify-between mb-3">
                    <div>
                        <h2 className="text-lg font-semibold" style={{ color: 'var(--ink)' }}>
                            Cart Assignments
                        </h2>
                        <p className="text-sm text-[var(--ink-muted)]">
                            {totalAssigned}/{players.length} players assigned • {carts.length} carts
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleAutoAssign}
                            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                            title="Auto-assign"
                        >
                            <Sparkles className="w-5 h-5" style={{ color: 'var(--masters)' }} />
                        </button>
                        <button
                            onClick={handlePrint}
                            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                            title="Print"
                        >
                            <Printer className="w-5 h-5" style={{ color: 'var(--ink-muted)' }} />
                        </button>
                    </div>
                </div>

                {/* Status */}
                <div
                    className="flex items-center gap-2 p-2 rounded-lg"
                    style={{
                        background: allAssigned ? 'rgba(34, 197, 94, 0.1)' : 'rgba(251, 191, 36, 0.1)',
                    }}
                >
                    {allAssigned ? (
                        <>
                            <Check className="w-4 h-4 text-green-500" />
                            <span className="text-sm text-green-600">All players assigned to carts</span>
                        </>
                    ) : (
                        <>
                            <AlertCircle className="w-4 h-4 text-amber-500" />
                            <span className="text-sm text-amber-600">{unassignedPlayers.length} players still need carts</span>
                        </>
                    )}
                </div>
            </div>

            {/* Unassigned Players */}
            {unassignedPlayers.length > 0 && (
                <div className="p-4 border-b border-[rgba(128,120,104,0.2)] bg-[var(--surface)]">
                    <p className="text-sm font-medium mb-2 text-[var(--ink-muted)]">
                        Unassigned Players
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {unassignedPlayers.map(player => (
                            <span
                                key={player.id}
                                className="flex items-center gap-1.5 px-2 py-1 rounded-full text-sm bg-[var(--canvas)]"
                            >
                                <div
                                    className="w-2 h-2 rounded-full"
                                    style={{ background: player.teamId === 'A' ? '#ef4444' : '#3b82f6' }}
                                />
                                <span className="text-[var(--ink)]">
                                    {player.firstName} {player.lastName}
                                </span>
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* Cart List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {carts.map(cart => (
                    <CartCard
                        key={cart.id}
                        cart={cart}
                        availablePlayers={unassignedPlayers}
                        onAddPlayer={(playerId) => handleAddPlayer(cart.id, playerId)}
                        onRemovePlayer={(playerId) => handleRemovePlayer(cart.id, playerId)}
                        onUpdateNotes={(notes) => handleUpdateNotes(cart.id, notes)}
                        teamAName={teamAName}
                        teamBName={teamBName}
                    />
                ))}

                {/* Add Cart Button */}
                <button
                    onClick={handleAddCart}
                    className="w-full p-4 rounded-xl border-2 border-dashed transition-colors hover:border-solid"
                    style={{
                        borderColor: 'rgba(128, 120, 104, 0.3)',
                        color: 'var(--ink-muted)',
                    }}
                >
                    + Add Another Cart
                </button>
            </div>
        </div>
    );
}

export default CartAssignmentManager;
