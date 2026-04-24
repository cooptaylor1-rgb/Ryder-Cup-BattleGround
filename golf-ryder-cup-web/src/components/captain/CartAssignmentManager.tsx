'use client';

import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  AlertCircle,
  Car,
  Check,
  ChevronDown,
  ChevronUp,
  Plus,
  Printer,
  Sparkles,
  X,
} from 'lucide-react';

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

const TEAM_META = {
  A: {
    labelFallback: 'Team A',
    accent: 'var(--team-usa)',
    panel:
      'border-[color:var(--team-usa)]/14 bg-[linear-gradient(180deg,rgba(30,58,95,0.06),rgba(255,255,255,0.98))]',
  },
  B: {
    labelFallback: 'Team B',
    accent: 'var(--team-europe)',
    panel:
      'border-[color:var(--team-europe)]/14 bg-[linear-gradient(180deg,rgba(114,47,55,0.08),rgba(255,255,255,0.98))]',
  },
} as const;

function generateCartNumber(index: number): string {
  return `Cart ${index + 1}`;
}

function createCartId(): string {
  return crypto.randomUUID();
}

export function CartAssignmentManager({
  players,
  initialCarts,
  maxCartsPerCart = 2,
  teamAName = 'Team A',
  teamBName = 'Team B',
  onAssignmentsChange,
  className,
}: CartAssignmentManagerProps) {
  const defaultCartCount = Math.max(1, Math.ceil(players.length / maxCartsPerCart));
  const [carts, setCarts] = useState<Cart[]>(
    initialCarts ||
      Array.from({ length: defaultCartCount }, (_, index) => ({
        id: createCartId(),
        number: generateCartNumber(index),
        players: [],
        maxCapacity: maxCartsPerCart,
      }))
  );

  const assignedPlayerIds = useMemo(
    () => new Set(carts.flatMap((cart) => cart.players.map((player) => player.id))),
    [carts]
  );
  const unassignedPlayers = useMemo(
    () => players.filter((player) => !assignedPlayerIds.has(player.id)),
    [assignedPlayerIds, players]
  );
  const totalAssigned = carts.reduce((sum, cart) => sum + cart.players.length, 0);
  const allAssigned = totalAssigned === players.length;

  const commitCarts = useCallback(
    (updater: (current: Cart[]) => Cart[]) => {
      setCarts((current) => {
        const next = updater(current);
        onAssignmentsChange?.(next);
        return next;
      });
    },
    [onAssignmentsChange]
  );

  const handleAddPlayer = useCallback(
    (cartId: string, playerId: string) => {
      const player = players.find((candidate) => candidate.id === playerId);
      if (!player) return;

      commitCarts((current) =>
        current.map((cart) => {
          if (cart.id !== cartId || cart.players.length >= cart.maxCapacity) {
            return cart;
          }

          return { ...cart, players: [...cart.players, player] };
        })
      );
    },
    [commitCarts, players]
  );

  const handleRemovePlayer = useCallback(
    (cartId: string, playerId: string) => {
      commitCarts((current) =>
        current.map((cart) =>
          cart.id === cartId
            ? { ...cart, players: cart.players.filter((player) => player.id !== playerId) }
            : cart
        )
      );
    },
    [commitCarts]
  );

  const handleUpdateNotes = useCallback(
    (cartId: string, notes: string) => {
      commitCarts((current) =>
        current.map((cart) => (cart.id === cartId ? { ...cart, notes } : cart))
      );
    },
    [commitCarts]
  );

  const handleAddCart = useCallback(() => {
    commitCarts((current) => [
      ...current,
      {
        id: createCartId(),
        number: generateCartNumber(current.length),
        players: [],
        maxCapacity: maxCartsPerCart,
      },
    ]);
  }, [commitCarts, maxCartsPerCart]);

  const handleAutoAssign = useCallback(() => {
    const playersByGroup = new Map<string, CartPlayer[]>();

    players.forEach((player) => {
      const key = player.teeTime || player.matchId || 'unassigned';
      const current = playersByGroup.get(key) || [];
      current.push(player);
      playersByGroup.set(key, current);
    });

    const nextCarts: Cart[] = [];
    let cartIndex = 0;

    playersByGroup.forEach((groupPlayers) => {
      const teamAPlayers = groupPlayers.filter((player) => player.teamId === 'A');
      const teamBPlayers = groupPlayers.filter((player) => player.teamId === 'B');
      const maxPairs = Math.min(teamAPlayers.length, teamBPlayers.length);

      for (let index = 0; index < maxPairs; index += 1) {
        nextCarts.push({
          id: createCartId(),
          number: generateCartNumber(cartIndex),
          players: [teamAPlayers[index], teamBPlayers[index]],
          maxCapacity: maxCartsPerCart,
        });
        cartIndex += 1;
      }

      const remaining = [...teamAPlayers.slice(maxPairs), ...teamBPlayers.slice(maxPairs)];
      for (let index = 0; index < remaining.length; index += maxCartsPerCart) {
        const cartPlayers = remaining.slice(index, index + maxCartsPerCart);
        if (cartPlayers.length > 0) {
          nextCarts.push({
            id: createCartId(),
            number: generateCartNumber(cartIndex),
            players: cartPlayers,
            maxCapacity: maxCartsPerCart,
          });
          cartIndex += 1;
        }
      }
    });

    if (nextCarts.length === 0) {
      nextCarts.push({
        id: createCartId(),
        number: generateCartNumber(0),
        players: [],
        maxCapacity: maxCartsPerCart,
      });
    }

    setCarts(nextCarts);
    onAssignmentsChange?.(nextCarts);
  }, [maxCartsPerCart, onAssignmentsChange, players]);

  const handlePrint = useCallback(() => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const cartsHtml = carts
      .filter((cart) => cart.players.length > 0)
      .map(
        (cart) => `
          <div style="margin-bottom: 16px; padding: 14px; border: 1px solid #d9d3c8; border-radius: 14px;">
            <div style="font-weight: 700; font-size: 16px; margin-bottom: 8px;">${cart.number}</div>
            <div style="margin-left: 4px;">
              ${cart.players
                .map(
                  (player) => `
                    <div style="display: flex; align-items: center; gap: 8px; margin: 4px 0;">
                      <span style="color: ${player.teamId === 'A' ? '#1e3a5f' : '#722f37'};">●</span>
                      ${player.firstName} ${player.lastName}
                    </div>
                  `
                )
                .join('')}
            </div>
            ${cart.notes ? `<div style="margin-top: 8px; font-size: 12px; color: #666;">Notes: ${cart.notes}</div>` : ''}
          </div>
        `
      )
      .join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Cart Assignments</title>
          <style>
            body { font-family: system-ui, sans-serif; padding: 24px; }
            h1 { margin-bottom: 16px; }
          </style>
        </head>
        <body>
          <h1>Cart Assignments</h1>
          ${cartsHtml}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  }, [carts]);

  return (
    <div
      className={cn(
        'overflow-hidden rounded-[1.7rem] border border-[color:var(--rule)]/75 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(245,239,232,1))] shadow-[0_18px_38px_rgba(41,29,17,0.05)]',
        className
      )}
    >
      <div className="border-b border-[color:var(--rule)]/70 px-[var(--space-5)] py-[var(--space-5)]">
        <div className="flex flex-col gap-[var(--space-4)] lg:flex-row lg:items-start lg:justify-between">
          <div className="flex gap-[var(--space-4)]">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[1.1rem] bg-[color:var(--maroon)]/10 text-[var(--maroon)]">
              <Car size={22} />
            </div>
            <div>
              <p className="type-overline tracking-[0.16em] text-[var(--maroon)]">Cart Room</p>
              <h2 className="mt-[var(--space-2)] font-serif text-[1.9rem] italic text-[var(--ink)]">
                Build the lot before people start improvising.
              </h2>
              <p className="mt-[var(--space-2)] text-sm text-[var(--ink-secondary)]">
                Assign partners, leave cart notes, and print the board when the course wants something tangible.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <HeaderActionButton icon={<Sparkles size={16} />} label="Auto" onClick={handleAutoAssign} />
            <HeaderActionButton icon={<Printer size={16} />} label="Print" onClick={handlePrint} />
            <HeaderActionButton icon={<Plus size={16} />} label="Add Cart" onClick={handleAddCart} />
          </div>
        </div>

        <div className="mt-[var(--space-5)] grid gap-[var(--space-3)] sm:grid-cols-2 xl:grid-cols-4">
          <CartMetric label="Assigned" value={`${totalAssigned}/${players.length}`} detail="Seats spoken for" tone={allAssigned ? 'green' : 'maroon'} />
          <CartMetric label="Open Spots" value={unassignedPlayers.length} detail="Players still looking for a cart" tone={unassignedPlayers.length > 0 ? 'gold' : 'ink'} />
          <CartMetric label="Carts" value={carts.length} detail="Boards currently in play" tone="ink" />
          <CartMetric label="Capacity" value={maxCartsPerCart} detail="Players per cart" tone="ink" />
        </div>

        <div
          className={cn(
            'mt-[var(--space-4)] rounded-[1.2rem] border px-[var(--space-4)] py-[var(--space-3)]',
            allAssigned
              ? 'border-[color:var(--success)]/18 bg-[color:var(--success)]/10'
              : 'border-[color:var(--warning)]/18 bg-[color:var(--warning)]/10'
          )}
        >
          <div className="flex items-center gap-2 text-sm font-semibold">
            {allAssigned ? (
              <>
                <Check size={16} className="text-[var(--success)]" />
                <span className="text-[var(--success)]">Every player has a cart.</span>
              </>
            ) : (
              <>
                <AlertCircle size={16} className="text-[var(--warning)]" />
                <span className="text-[var(--warning)]">
                  {unassignedPlayers.length} player{unassignedPlayers.length === 1 ? '' : 's'} still need a seat.
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {unassignedPlayers.length > 0 ? (
        <div className="border-b border-[color:var(--rule)]/70 px-[var(--space-5)] py-[var(--space-4)]">
          <p className="type-overline tracking-[0.15em] text-[var(--ink-tertiary)]">Unassigned</p>
          <div className="mt-[var(--space-3)] flex flex-wrap gap-2">
            {unassignedPlayers.map((player) => (
              <span
                key={player.id}
                className="inline-flex items-center gap-2 rounded-full border border-[color:var(--rule)]/75 bg-[color:var(--surface)]/84 px-3 py-2 text-sm text-[var(--ink-secondary)]"
              >
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ background: player.teamId === 'A' ? 'var(--team-usa)' : 'var(--team-europe)' }}
                />
                {player.firstName} {player.lastName}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      <div className="grid gap-[var(--space-4)] p-[var(--space-4)] xl:grid-cols-2">
        {carts.map((cart) => (
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
      </div>
    </div>
  );
}

function HeaderActionButton({
  icon,
  label,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[color:var(--rule)]/70 bg-[color:var(--surface)]/82 px-[var(--space-4)] py-[var(--space-3)] text-sm font-semibold text-[var(--ink-secondary)] transition-colors hover:text-[var(--ink)]"
    >
      {icon}
      {label}
    </button>
  );
}

function CartMetric({
  label,
  value,
  detail,
  tone,
}: {
  label: string;
  value: ReactNode;
  detail: string;
  tone: 'ink' | 'gold' | 'green' | 'maroon';
}) {
  const toneClassNames = {
    ink: 'border-[color:var(--rule)]/70 bg-[color:var(--surface)]/82',
    gold:
      'border-[color:var(--warning)]/18 bg-[linear-gradient(180deg,rgba(184,134,11,0.10),rgba(255,255,255,0.98))]',
    green:
      'border-[color:var(--success)]/16 bg-[linear-gradient(180deg,rgba(45,122,79,0.10),rgba(255,255,255,0.98))]',
    maroon:
      'border-[color:var(--maroon)]/16 bg-[linear-gradient(180deg,rgba(104,35,48,0.10),rgba(255,255,255,0.98))]',
  } satisfies Record<'ink' | 'gold' | 'green' | 'maroon', string>;

  return (
    <div className={cn('rounded-[1.2rem] border p-[var(--space-4)]', toneClassNames[tone])}>
      <p className="type-overline tracking-[0.14em] text-[var(--ink-tertiary)]">{label}</p>
      <p className="mt-[var(--space-3)] font-serif text-[1.8rem] italic leading-none text-[var(--ink)]">{value}</p>
      <p className="mt-[var(--space-2)] text-sm text-[var(--ink-secondary)]">{detail}</p>
    </div>
  );
}

function CartCard({
  cart,
  availablePlayers,
  onAddPlayer,
  onRemovePlayer,
  onUpdateNotes,
  teamAName = 'Team A',
  teamBName = 'Team B',
}: {
  cart: Cart;
  availablePlayers: CartPlayer[];
  onAddPlayer: (playerId: string) => void;
  onRemovePlayer: (playerId: string) => void;
  onUpdateNotes: (notes: string) => void;
  teamAName?: string;
  teamBName?: string;
}) {
  const [expanded, setExpanded] = useState(cart.players.length > 0);
  const [showPlayerPicker, setShowPlayerPicker] = useState(false);
  const isFull = cart.players.length >= cart.maxCapacity;
  const teamNameById = { A: teamAName, B: teamBName };
  const occupancyTone = cart.players[0]?.teamId || 'A';

  return (
    <motion.section
      layout
      className={cn(
        'overflow-hidden rounded-[1.55rem] border shadow-[0_16px_34px_rgba(41,29,17,0.05)]',
        TEAM_META[occupancyTone].panel
      )}
    >
      <button
        type="button"
        onClick={() => setExpanded((current) => !current)}
        className="flex w-full items-start justify-between gap-[var(--space-3)] px-[var(--space-4)] py-[var(--space-4)] text-left"
      >
        <div className="flex gap-[var(--space-3)]">
          <div className="flex h-11 w-11 items-center justify-center rounded-[1rem] bg-[color:var(--canvas)]/86 text-[var(--ink)]">
            <Car size={20} />
          </div>
          <div>
            <p className="type-overline tracking-[0.15em] text-[var(--ink-tertiary)]">{cart.number}</p>
            <h3 className="mt-[var(--space-2)] font-serif text-[1.55rem] italic text-[var(--ink)]">
              {cart.players.length}/{cart.maxCapacity} seats filled
            </h3>
            <p className="mt-[var(--space-2)] text-sm text-[var(--ink-secondary)]">
              {isFull ? 'Ready to roll' : availablePlayers.length > 0 ? 'Still room to add a partner' : 'No one left to seat'}
            </p>
          </div>
        </div>
        {expanded ? (
          <ChevronUp size={18} className="mt-1 text-[var(--ink-tertiary)]" />
        ) : (
          <ChevronDown size={18} className="mt-1 text-[var(--ink-tertiary)]" />
        )}
      </button>

      <AnimatePresence initial={false}>
        {expanded ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="border-t border-[color:var(--rule)]/60 bg-[color:var(--surface)]/65 px-[var(--space-4)] py-[var(--space-4)]">
              <div className="space-y-3">
                {cart.players.length > 0 ? (
                  cart.players.map((player) => (
                    <div
                      key={player.id}
                      className="flex items-center justify-between rounded-[1.2rem] border border-[color:var(--rule)]/70 bg-[color:var(--canvas)]/82 px-[var(--space-3)] py-[var(--space-3)]"
                    >
                      <div className="flex min-w-0 items-center gap-[var(--space-3)]">
                        <span
                          className="h-9 w-9 shrink-0 rounded-full"
                          style={{ background: player.teamId === 'A' ? 'var(--team-usa)' : 'var(--team-europe)' }}
                        />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-[var(--ink)]">
                            {player.firstName} {player.lastName}
                          </p>
                          <p className="text-sm text-[var(--ink-secondary)]">
                            {teamNameById[player.teamId]}
                            {player.teeTime ? ` • ${player.teeTime}` : ''}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => onRemovePlayer(player.id)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[color:var(--error)]/18 bg-[color:var(--error)]/10 text-[var(--error)]"
                        aria-label={`Remove ${player.firstName} ${player.lastName}`}
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="rounded-[1.2rem] border border-dashed border-[color:var(--rule)]/75 bg-[color:var(--canvas)]/74 px-[var(--space-4)] py-[var(--space-5)] text-sm text-[var(--ink-secondary)]">
                    This cart is still empty.
                  </div>
                )}
              </div>

              {!isFull ? (
                <div className="mt-[var(--space-4)]">
                  <button
                    type="button"
                    onClick={() => setShowPlayerPicker((current) => !current)}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-dashed border-[color:var(--rule)]/75 bg-[color:var(--canvas)]/72 px-[var(--space-4)] py-[var(--space-3)] text-sm font-semibold text-[var(--ink-secondary)] transition-colors hover:text-[var(--ink)]"
                  >
                    <Plus size={16} />
                    Add player
                  </button>

                  <AnimatePresence initial={false}>
                    {showPlayerPicker ? (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-[var(--space-3)] grid gap-2">
                          {availablePlayers.length > 0 ? (
                            availablePlayers.map((player) => (
                              <button
                                key={player.id}
                                type="button"
                                onClick={() => {
                                  onAddPlayer(player.id);
                                  setShowPlayerPicker(false);
                                }}
                                className="flex items-center justify-between rounded-[1.1rem] border border-[color:var(--rule)]/70 bg-[color:var(--canvas)]/82 px-[var(--space-3)] py-[var(--space-3)] text-left transition-colors hover:border-[var(--maroon-subtle)]"
                              >
                                <span className="flex items-center gap-[var(--space-3)]">
                                  <span
                                    className="h-3 w-3 rounded-full"
                                    style={{ background: player.teamId === 'A' ? 'var(--team-usa)' : 'var(--team-europe)' }}
                                  />
                                  <span className="text-sm font-semibold text-[var(--ink)]">
                                    {player.firstName} {player.lastName}
                                  </span>
                                </span>
                                <span className="text-sm text-[var(--ink-tertiary)]">
                                  {teamNameById[player.teamId]}
                                </span>
                              </button>
                            ))
                          ) : (
                            <div className="rounded-[1.1rem] border border-dashed border-[color:var(--rule)]/75 bg-[color:var(--canvas)]/72 px-[var(--space-4)] py-[var(--space-4)] text-sm text-[var(--ink-secondary)]">
                              Everyone is already seated.
                            </div>
                          )}
                        </div>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </div>
              ) : null}

              <div className="mt-[var(--space-4)] rounded-[1.2rem] border border-[color:var(--rule)]/70 bg-[color:var(--canvas)]/78 p-[var(--space-3)]">
                <label className="block text-sm font-semibold text-[var(--ink)]">Cart notes</label>
                <input
                  type="text"
                  value={cart.notes || ''}
                  onChange={(event) => onUpdateNotes(event.target.value)}
                  placeholder="Cooler, umbrellas, speakers..."
                  className="mt-2 w-full rounded-xl border border-[color:var(--rule)]/75 bg-[color:var(--surface)]/88 px-4 py-3 text-sm text-[var(--ink)] outline-none placeholder:text-[var(--ink-tertiary)] focus:border-[var(--maroon-subtle)]"
                />
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.section>
  );
}

export default CartAssignmentManager;
