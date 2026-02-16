'use client';

import { useMemo, useState, type ReactNode } from 'react';
import {
  calculatePlayerBalances,
  calculateSettlements,
  createExpense,
  createSideGame,
  type SideGame,
  type TripExpense,
} from '@/lib/services/sideBetsService';
import type { Player } from '@/lib/types';
import {
  ArrowRight,
  Check,
  CreditCard,
  DollarSign,
  PlusCircle,
  Target,
  TrendingDown,
  TrendingUp,
  Trophy,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { EmptyStatePremium } from '@/components/ui/EmptyStatePremium';

interface SideBetsTrackerProps {
  tripId: string;
  players: Player[];
  onUpdate?: () => void;
}

type TabType = 'games' | 'expenses' | 'settlements';

const TABS: { id: TabType; label: string }[] = [
  { id: 'games', label: 'Games' },
  { id: 'expenses', label: 'Expenses' },
  { id: 'settlements', label: 'Settlements' },
];

function getPlayerName(players: Player[], playerId: string) {
  const p = players.find((pl) => pl.id === playerId);
  return p ? `${p.firstName} ${p.lastName}` : 'Unknown';
}

function formatCurrency(amount: number) {
  const absAmount = Math.abs(amount);
  return `$${absAmount.toFixed(2)}`;
}

function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <span className="mb-1 block text-sm font-medium text-[var(--ink-secondary)]">
      {children}
    </span>
  );
}

const inputClassName =
  'w-full rounded-[var(--radius-md)] border border-[var(--rule)] bg-[var(--surface)] px-[var(--space-3)] py-[var(--space-2)] text-sm text-[var(--ink-primary)] placeholder:text-[var(--ink-tertiary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--masters)]/35 focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--canvas)]';

export function SideBetsTracker({ tripId, players, onUpdate }: SideBetsTrackerProps) {
  const [activeTab, setActiveTab] = useState<TabType>('games');
  const [sideGames, setSideGames] = useState<SideGame[]>([]);
  const [expenses, setExpenses] = useState<TripExpense[]>([]);
  const [showAddGame, setShowAddGame] = useState(false);
  const [showAddExpense, setShowAddExpense] = useState(false);

  // Form state
  const [newGameType, setNewGameType] = useState<SideGame['type']>('skins');
  const [newGameAmount, setNewGameAmount] = useState(5);
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);

  const [newExpenseDescription, setNewExpenseDescription] = useState('');
  const [newExpenseAmount, setNewExpenseAmount] = useState(0);
  const [newExpensePaidBy, setNewExpensePaidBy] = useState('');
  const [newExpenseSplitBetween, setNewExpenseSplitBetween] = useState<string[]>([]);

  const balances = useMemo(() => calculatePlayerBalances(expenses, players), [expenses, players]);
  const settlements = useMemo(() => calculateSettlements(balances), [balances]);

  const togglePlayer = (playerId: string, list: string[], setList: (l: string[]) => void) => {
    if (list.includes(playerId)) {
      setList(list.filter((id) => id !== playerId));
      return;
    }

    setList([...list, playerId]);
  };

  const handleAddGame = () => {
    if (selectedPlayers.length < 2) return;

    const game = createSideGame(
      tripId,
      newGameType,
      `${newGameType.charAt(0).toUpperCase() + newGameType.slice(1)} Game`,
      newGameAmount,
      selectedPlayers
    );

    setSideGames([...sideGames, game]);
    setShowAddGame(false);
    setSelectedPlayers([]);
    setNewGameAmount(5);
    onUpdate?.();
  };

  const handleAddExpense = () => {
    if (!newExpensePaidBy || newExpenseSplitBetween.length === 0 || newExpenseAmount <= 0) return;

    const expense = createExpense(
      tripId,
      'other',
      newExpenseDescription || 'Expense',
      newExpenseAmount,
      newExpensePaidBy,
      newExpenseSplitBetween
    );

    setExpenses([...expenses, expense]);
    setShowAddExpense(false);
    setNewExpenseDescription('');
    setNewExpenseAmount(0);
    setNewExpensePaidBy('');
    setNewExpenseSplitBetween([]);
    onUpdate?.();
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <DollarSign className="w-6 h-6 text-[var(--masters)]" />
          <div>
            <h3 className="font-semibold text-[var(--ink-primary)]">Side Bets & Expenses</h3>
            <p className="text-sm text-[var(--ink-tertiary)]">Track skins, nassau, and trip expenses</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-[var(--radius-lg)] bg-[var(--surface-secondary)] p-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex-1 rounded-[var(--radius-md)] px-3 py-2 text-sm font-medium transition-colors',
              activeTab === tab.id
                ? 'bg-[var(--surface)] text-[var(--ink-primary)] shadow-card-sm'
                : 'text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] hover:bg-[color:var(--ink-tertiary)]/10'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Games Tab */}
      {activeTab === 'games' && (
        <div className="space-y-4">
          {!showAddGame ? (
            <button
              type="button"
              onClick={() => setShowAddGame(true)}
              className={cn(
                'w-full rounded-[var(--radius-lg)] border-2 border-dashed border-[color:var(--rule)]/40',
                'p-4 transition-colors',
                'hover:border-[color:var(--masters)]/50 hover:bg-[color:var(--masters)]/5',
                'flex items-center justify-center gap-2'
              )}
            >
              <PlusCircle className="w-5 h-5 text-[var(--masters)]" />
              <span className="text-[var(--ink-secondary)]">Add Side Game</span>
            </button>
          ) : (
            <div className="card p-4 space-y-4">
              <h4 className="font-medium text-[var(--ink-primary)]">New Side Game</h4>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block">
                    <FieldLabel>Game Type</FieldLabel>
                    <select
                      value={newGameType}
                      onChange={(e) => setNewGameType(e.target.value as SideGame['type'])}
                      className={inputClassName}
                    >
                      <option value="skins">Skins</option>
                      <option value="nassau">Nassau</option>
                      <option value="kp">Closest to Pin</option>
                      <option value="longest-drive">Longest Drive</option>
                      <option value="custom">Custom</option>
                    </select>
                  </label>
                </div>

                <div>
                  <label className="block">
                    <FieldLabel>Amount ($)</FieldLabel>
                    <input
                      type="number"
                      value={newGameAmount}
                      onChange={(e) => setNewGameAmount(parseFloat(e.target.value) || 0)}
                      min={1}
                      className={inputClassName}
                    />
                  </label>
                </div>
              </div>

              <div>
                <FieldLabel>Participants</FieldLabel>
                <div className="flex flex-wrap gap-2">
                  {players.map((player) => {
                    const isSelected = selectedPlayers.includes(player.id);
                    return (
                      <button
                        key={player.id}
                        type="button"
                        onClick={() => togglePlayer(player.id, selectedPlayers, setSelectedPlayers)}
                        className={cn(
                          'rounded-full px-3 py-1 text-sm transition-colors',
                          isSelected
                            ? 'bg-[var(--masters)] text-[var(--canvas)]'
                            : 'bg-[var(--surface-secondary)] text-[var(--ink-secondary)] hover:bg-[color:var(--ink-tertiary)]/10 hover:text-[var(--ink-primary)]'
                        )}
                      >
                        {player.firstName} {player.lastName}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddGame(false)}
                  className={cn(
                    'rounded-[var(--radius-md)] px-4 py-2 transition-colors',
                    'text-[var(--ink-secondary)] hover:bg-[var(--surface-secondary)]'
                  )}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAddGame}
                  disabled={selectedPlayers.length < 2}
                  className={cn(
                    'rounded-[var(--radius-md)] px-4 py-2 font-medium transition-colors',
                    'bg-[var(--masters)] text-[var(--canvas)] hover:brightness-95',
                    'disabled:bg-[color:var(--ink-tertiary)]/25 disabled:text-[var(--ink-tertiary)] disabled:cursor-not-allowed'
                  )}
                >
                  Create Game
                </button>
              </div>
            </div>
          )}

          {/* Game List */}
          {sideGames.length > 0 && (
            <div className="space-y-2">
              {sideGames.map((game) => (
                <div key={game.id} className="card p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {game.type === 'skins' && <Target className="h-4 w-4 text-[var(--info)]" />}
                      {game.type === 'nassau' && <Trophy className="h-4 w-4 text-[var(--warning)]" />}
                      {game.type === 'kp' && <Target className="h-4 w-4 text-[var(--color-accent)]" />}
                      <span className="font-medium text-[var(--ink-primary)] capitalize">
                        {game.type.replace('_', ' ')}
                      </span>
                    </div>
                    <span className="font-medium text-[var(--success)]">${game.buyIn}</span>
                  </div>
                  <p className="text-sm text-[var(--ink-tertiary)]">
                    {game.playerIds.map((id) => getPlayerName(players, id)).join(', ')}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Expenses Tab */}
      {activeTab === 'expenses' && (
        <div className="space-y-4">
          {!showAddExpense ? (
            <button
              type="button"
              onClick={() => setShowAddExpense(true)}
              className={cn(
                'w-full rounded-[var(--radius-lg)] border-2 border-dashed border-[color:var(--rule)]/40',
                'p-4 transition-colors',
                'hover:border-[color:var(--info)]/50 hover:bg-[color:var(--info)]/5',
                'flex items-center justify-center gap-2'
              )}
            >
              <PlusCircle className="w-5 h-5 text-[var(--info)]" />
              <span className="text-[var(--ink-secondary)]">Add Expense</span>
            </button>
          ) : (
            <div className="card p-4 space-y-4">
              <h4 className="font-medium text-[var(--ink-primary)]">New Expense</h4>

              <label className="block">
                <FieldLabel>Description</FieldLabel>
                <input
                  type="text"
                  value={newExpenseDescription}
                  onChange={(e) => setNewExpenseDescription(e.target.value)}
                  placeholder="e.g., Golf cart rental"
                  className={inputClassName}
                />
              </label>

              <div className="grid grid-cols-2 gap-4">
                <label className="block">
                  <FieldLabel>Amount ($)</FieldLabel>
                  <input
                    type="number"
                    value={newExpenseAmount}
                    onChange={(e) => setNewExpenseAmount(parseFloat(e.target.value) || 0)}
                    min={0}
                    step={0.01}
                    className={inputClassName}
                  />
                </label>

                <label className="block">
                  <FieldLabel>Paid By</FieldLabel>
                  <select
                    value={newExpensePaidBy}
                    onChange={(e) => setNewExpensePaidBy(e.target.value)}
                    className={inputClassName}
                  >
                    <option value="">Select...</option>
                    {players.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.firstName} {p.lastName}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div>
                <FieldLabel>Split Between</FieldLabel>
                <div className="flex flex-wrap gap-2">
                  {players.map((player) => {
                    const isSelected = newExpenseSplitBetween.includes(player.id);
                    return (
                      <button
                        key={player.id}
                        type="button"
                        onClick={() =>
                          togglePlayer(player.id, newExpenseSplitBetween, setNewExpenseSplitBetween)
                        }
                        className={cn(
                          'rounded-full px-3 py-1 text-sm transition-colors',
                          isSelected
                            ? 'bg-[var(--info)] text-[var(--canvas)]'
                            : 'bg-[var(--surface-secondary)] text-[var(--ink-secondary)] hover:bg-[color:var(--ink-tertiary)]/10 hover:text-[var(--ink-primary)]'
                        )}
                      >
                        {player.firstName} {player.lastName}
                      </button>
                    );
                  })}
                </div>
                <button
                  type="button"
                  onClick={() => setNewExpenseSplitBetween(players.map((p) => p.id))}
                  className="mt-2 text-xs font-medium text-[var(--info)] hover:brightness-95"
                >
                  Select All
                </button>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddExpense(false)}
                  className={cn(
                    'rounded-[var(--radius-md)] px-4 py-2 transition-colors',
                    'text-[var(--ink-secondary)] hover:bg-[var(--surface-secondary)]'
                  )}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAddExpense}
                  disabled={!newExpensePaidBy || newExpenseSplitBetween.length === 0 || newExpenseAmount <= 0}
                  className={cn(
                    'rounded-[var(--radius-md)] px-4 py-2 font-medium transition-colors',
                    'bg-[var(--info)] text-[var(--canvas)] hover:brightness-95',
                    'disabled:bg-[color:var(--ink-tertiary)]/25 disabled:text-[var(--ink-tertiary)] disabled:cursor-not-allowed'
                  )}
                >
                  Add Expense
                </button>
              </div>
            </div>
          )}

          {/* Expense List */}
          {expenses.length > 0 && (
            <div className="space-y-2">
              {expenses.map((expense) => (
                <div key={expense.id} className="card p-4">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="font-medium text-[var(--ink-primary)]">{expense.description}</span>
                    <span className="font-medium text-[var(--info)]">${expense.amount.toFixed(2)}</span>
                  </div>
                  <p className="text-sm text-[var(--ink-tertiary)]">
                    Paid by {getPlayerName(players, expense.paidBy)} • Split {expense.splitAmong.length}{' '}
                    ways
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Settlements Tab */}
      {activeTab === 'settlements' && (
        <div className="space-y-4">
          {/* Player Balances */}
          <div>
            <h4 className="mb-3 font-medium text-[var(--ink-primary)]">Player Balances</h4>
            <div className="space-y-2">
              {balances.map((balance) => (
                <div
                  key={balance.playerId}
                  className="flex items-center justify-between rounded-[var(--radius-lg)] bg-[var(--surface-secondary)] p-3"
                >
                  <span className="text-[var(--ink-primary)]">
                    {getPlayerName(players, balance.playerId)}
                  </span>
                  <div className="flex items-center gap-2">
                    {balance.netBalance > 0 ? (
                      <TrendingUp className="h-4 w-4 text-[var(--success)]" />
                    ) : balance.netBalance < 0 ? (
                      <TrendingDown className="h-4 w-4 text-[var(--error)]" />
                    ) : (
                      <Check className="h-4 w-4 text-[var(--ink-tertiary)]" />
                    )}
                    <span
                      className={cn(
                        'font-medium',
                        balance.netBalance > 0
                          ? 'text-[var(--success)]'
                          : balance.netBalance < 0
                            ? 'text-[var(--error)]'
                            : 'text-[var(--ink-tertiary)]'
                      )}
                    >
                      {balance.netBalance >= 0 ? '+' : ''}
                      {formatCurrency(balance.netBalance)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Settlement Transactions */}
          {settlements.length > 0 && (
            <div>
              <h4 className="mb-3 font-medium text-[var(--ink-primary)]">To Settle Up</h4>
              <div className="space-y-2">
                {settlements.map((settlement, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      'flex items-center justify-between rounded-[var(--radius-lg)] border p-4',
                      settlement.settled
                        ? 'border-[color:var(--success)]/25 bg-[color:var(--success)]/10'
                        : 'border-[var(--rule)] bg-[var(--surface)]'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-[var(--ink-primary)]">
                        {getPlayerName(players, settlement.fromPlayerId)}
                      </span>
                      <ArrowRight className="h-4 w-4 text-[var(--ink-tertiary)]" />
                      <span className="text-[var(--ink-primary)]">
                        {getPlayerName(players, settlement.toPlayerId)}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-[var(--ink-primary)]">
                        {formatCurrency(settlement.amount)}
                      </span>
                      {settlement.settled ? (
                        <Check className="h-5 w-5 text-[var(--success)]" />
                      ) : (
                        <CreditCard className="h-5 w-5 text-[var(--ink-tertiary)]" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {balances.length === 0 && (
            <div className="card p-4">
              <EmptyStatePremium
                illustration="trophy"
                title="No balances to settle"
                description="Add some games or expenses to start tracking." 
                variant="compact"
              />
            </div>
          )}
        </div>
      )}

      {/* Empty states for first-time use */}
      {activeTab === 'games' && sideGames.length === 0 && !showAddGame && (
        <div className="card p-4">
          <EmptyStatePremium
            illustration="trophy"
            title="No side games yet"
            description="Create a skins or Nassau game to start tracking." 
            variant="compact"
          />
        </div>
      )}

      {activeTab === 'expenses' && expenses.length === 0 && !showAddExpense && (
        <div className="card p-4">
          <EmptyStatePremium
            illustration="scorecard"
            title="No expenses recorded"
            description="Add shared trip expenses to calculate balances automatically." 
            variant="compact"
          />
        </div>
      )}
    </div>
  );
}

export default SideBetsTracker;
