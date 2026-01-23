'use client';

import { useState, useMemo } from 'react';
import {
  createSideGame,
  createExpense,
  calculatePlayerBalances,
  calculateSettlements,
  SideGame,
  TripExpense,
} from '@/lib/services/sideBetsService';
import { Player } from '@/lib/types';
import {
  DollarSign,
  Trophy,
  Target,
  PlusCircle,
  TrendingUp,
  TrendingDown,
  CreditCard,
  ArrowRight,
  Check,
  AlertCircle,
} from 'lucide-react';

interface SideBetsTrackerProps {
  tripId: string;
  players: Player[];
  onUpdate?: () => void;
}

type TabType = 'games' | 'expenses' | 'settlements';

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

  // Calculate balances
  const balances = useMemo(() => {
    return calculatePlayerBalances(expenses, players);
  }, [expenses, players]);

  // Calculate settlements
  const settlements = useMemo(() => {
    return calculateSettlements(balances);
  }, [balances]);

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
      'other',  // default category
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

  const togglePlayer = (playerId: string, list: string[], setList: (l: string[]) => void) => {
    if (list.includes(playerId)) {
      setList(list.filter(id => id !== playerId));
    } else {
      setList([...list, playerId]);
    }
  };

  const getPlayerName = (playerId: string) => {
    const p = players.find(p => p.id === playerId);
    return p ? `${p.firstName} ${p.lastName}` : 'Unknown';
  };

  const formatCurrency = (amount: number) => {
    const absAmount = Math.abs(amount);
    return `$${absAmount.toFixed(2)}`;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <DollarSign className="w-6 h-6 text-green-500" />
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">
              Side Bets & Expenses
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Track skins, nassau, and trip expenses
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
        {(['games', 'expenses', 'settlements'] as TabType[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${activeTab === tab
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Games Tab */}
      {activeTab === 'games' && (
        <div className="space-y-4">
          {!showAddGame ? (
            <button
              onClick={() => setShowAddGame(true)}
              className="w-full p-4 border-2 border-dashed dark:border-gray-700 rounded-lg hover:border-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors flex items-center justify-center gap-2"
            >
              <PlusCircle className="w-5 h-5 text-green-500" />
              <span className="text-gray-600 dark:text-gray-300">Add Side Game</span>
            </button>
          ) : (
            <div className="p-4 border dark:border-gray-700 rounded-lg space-y-4">
              <h4 className="font-medium text-gray-900 dark:text-white">New Side Game</h4>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Game Type
                  </label>
                  <select
                    value={newGameType}
                    onChange={(e) => setNewGameType(e.target.value as SideGame['type'])}
                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  >
                    <option value="skins">Skins</option>
                    <option value="nassau">Nassau</option>
                    <option value="kp">Closest to Pin</option>
                    <option value="longest-drive">Longest Drive</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Amount ($)
                  </label>
                  <input
                    type="number"
                    value={newGameAmount}
                    onChange={(e) => setNewGameAmount(parseFloat(e.target.value) || 0)}
                    min={1}
                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Participants
                </label>
                <div className="flex flex-wrap gap-2">
                  {players.map(player => (
                    <button
                      key={player.id}
                      onClick={() => togglePlayer(player.id, selectedPlayers, setSelectedPlayers)}
                      className={`px-3 py-1 rounded-full text-sm transition-colors ${selectedPlayers.includes(player.id)
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                        }`}
                    >
                      {player.firstName} {player.lastName}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowAddGame(false)}
                  className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddGame}
                  disabled={selectedPlayers.length < 2}
                  className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  Create Game
                </button>
              </div>
            </div>
          )}

          {/* Game List */}
          {sideGames.length > 0 && (
            <div className="space-y-2">
              {sideGames.map(game => (
                <div
                  key={game.id}
                  className="p-4 border dark:border-gray-700 rounded-lg"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {game.type === 'skins' && <Target className="w-4 h-4 text-purple-500" />}
                      {game.type === 'nassau' && <Trophy className="w-4 h-4 text-yellow-500" />}
                      {game.type === 'kp' && <Target className="w-4 h-4 text-blue-500" />}
                      <span className="font-medium text-gray-900 dark:text-white capitalize">
                        {game.type.replace('_', ' ')}
                      </span>
                    </div>
                    <span className="text-green-600 dark:text-green-400 font-medium">
                      ${game.buyIn}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {game.playerIds.map(getPlayerName).join(', ')}
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
              onClick={() => setShowAddExpense(true)}
              className="w-full p-4 border-2 border-dashed dark:border-gray-700 rounded-lg hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors flex items-center justify-center gap-2"
            >
              <PlusCircle className="w-5 h-5 text-blue-500" />
              <span className="text-gray-600 dark:text-gray-300">Add Expense</span>
            </button>
          ) : (
            <div className="p-4 border dark:border-gray-700 rounded-lg space-y-4">
              <h4 className="font-medium text-gray-900 dark:text-white">New Expense</h4>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={newExpenseDescription}
                  onChange={(e) => setNewExpenseDescription(e.target.value)}
                  placeholder="e.g., Golf cart rental"
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Amount ($)
                  </label>
                  <input
                    type="number"
                    value={newExpenseAmount}
                    onChange={(e) => setNewExpenseAmount(parseFloat(e.target.value) || 0)}
                    min={0}
                    step={0.01}
                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Paid By
                  </label>
                  <select
                    value={newExpensePaidBy}
                    onChange={(e) => setNewExpensePaidBy(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  >
                    <option value="">Select...</option>
                    {players.map(p => (
                      <option key={p.id} value={p.id}>{p.firstName} {p.lastName}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Split Between
                </label>
                <div className="flex flex-wrap gap-2">
                  {players.map(player => (
                    <button
                      key={player.id}
                      onClick={() => togglePlayer(player.id, newExpenseSplitBetween, setNewExpenseSplitBetween)}
                      className={`px-3 py-1 rounded-full text-sm transition-colors ${newExpenseSplitBetween.includes(player.id)
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                        }`}
                    >
                      {player.firstName} {player.lastName}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setNewExpenseSplitBetween(players.map(p => p.id))}
                  className="text-xs text-blue-500 hover:text-blue-600 mt-2"
                >
                  Select All
                </button>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowAddExpense(false)}
                  className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddExpense}
                  disabled={!newExpensePaidBy || newExpenseSplitBetween.length === 0 || newExpenseAmount <= 0}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  Add Expense
                </button>
              </div>
            </div>
          )}

          {/* Expense List */}
          {expenses.length > 0 && (
            <div className="space-y-2">
              {expenses.map(expense => (
                <div
                  key={expense.id}
                  className="p-4 border dark:border-gray-700 rounded-lg"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-gray-900 dark:text-white">
                      {expense.description}
                    </span>
                    <span className="text-blue-600 dark:text-blue-400 font-medium">
                      ${expense.amount.toFixed(2)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Paid by {getPlayerName(expense.paidBy)} •
                    Split {expense.splitAmong.length} ways
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
            <h4 className="font-medium text-gray-900 dark:text-white mb-3">Player Balances</h4>
            <div className="space-y-2">
              {balances.map(balance => (
                <div
                  key={balance.playerId}
                  className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg flex items-center justify-between"
                >
                  <span className="text-gray-900 dark:text-white">
                    {getPlayerName(balance.playerId)}
                  </span>
                  <div className="flex items-center gap-2">
                    {balance.netBalance > 0 ? (
                      <TrendingUp className="w-4 h-4 text-green-500" />
                    ) : balance.netBalance < 0 ? (
                      <TrendingDown className="w-4 h-4 text-red-500" />
                    ) : (
                      <Check className="w-4 h-4 text-gray-400" />
                    )}
                    <span className={`font-medium ${balance.netBalance > 0
                      ? 'text-green-600 dark:text-green-400'
                      : balance.netBalance < 0
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-gray-500'
                      }`}>
                      {balance.netBalance >= 0 ? '+' : ''}{formatCurrency(balance.netBalance)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Settlement Transactions */}
          {settlements.length > 0 && (
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                To Settle Up
              </h4>
              <div className="space-y-2">
                {settlements.map((settlement, idx) => (
                  <div
                    key={idx}
                    className={`p-4 border rounded-lg flex items-center justify-between ${settlement.settled
                      ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20'
                      : 'dark:border-gray-700'
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-gray-900 dark:text-white">
                        {getPlayerName(settlement.fromPlayerId)}
                      </span>
                      <ArrowRight className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-900 dark:text-white">
                        {getPlayerName(settlement.toPlayerId)}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-gray-900 dark:text-white">
                        {formatCurrency(settlement.amount)}
                      </span>
                      {settlement.settled ? (
                        <Check className="w-5 h-5 text-green-500" />
                      ) : (
                        <CreditCard className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {balances.length === 0 && (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <AlertCircle className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p>No balances to settle</p>
              <p className="text-sm">Add some games or expenses to track</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default SideBetsTracker;
