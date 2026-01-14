'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTripStore } from '@/lib/stores';
import { NoBetsEmpty } from '@/components/ui';
import type { Player } from '@/lib/types/models';
import {
  ChevronLeft,
  Home,
  Target,
  Users,
  Trophy,
  MoreHorizontal,
  DollarSign,
  Zap,
  TrendingUp,
  Plus,
  ChevronRight,
  Check,
  Clock,
  Crown,
} from 'lucide-react';

/**
 * BETS PAGE — Side Bets & Games
 *
 * Track skins, nassaus, closest to pin,
 * long drive, and other side action!
 */

interface SideBet {
  id: string;
  type: 'skins' | 'nassau' | 'ctp' | 'longdrive' | 'custom';
  name: string;
  description: string;
  status: 'active' | 'completed' | 'pending';
  pot?: number;
  winner?: string;
  hole?: number;
  participants: string[];
}

export default function BetsPage() {
  const router = useRouter();
  const { currentTrip, players } = useTripStore();
  const [selectedTab, setSelectedTab] = useState<'active' | 'completed'>('active');

  useEffect(() => {
    if (!currentTrip) {
      router.push('/');
    }
  }, [currentTrip, router]);

  // Demo side bets
  const sideBets: SideBet[] = [
    {
      id: '1',
      type: 'skins',
      name: 'Round 1 Skins',
      description: '$5 per hole, carry-overs',
      status: 'active',
      pot: 45,
      participants: players.slice(0, 4).map((p) => p.id),
    },
    {
      id: '2',
      type: 'ctp',
      name: 'Closest to Pin',
      description: 'Hole 7 - Par 3',
      status: 'active',
      hole: 7,
      pot: 20,
      participants: players.map((p) => p.id),
    },
    {
      id: '3',
      type: 'longdrive',
      name: 'Long Drive',
      description: 'Hole 12 - Par 5',
      status: 'active',
      hole: 12,
      pot: 20,
      participants: players.map((p) => p.id),
    },
    {
      id: '4',
      type: 'nassau',
      name: 'Nassau - Match 1',
      description: 'Front 9, Back 9, Overall',
      status: 'active',
      pot: 30,
      participants: players.slice(0, 2).map((p) => p.id),
    },
    {
      id: '5',
      type: 'ctp',
      name: 'Closest to Pin',
      description: 'Hole 3 - Par 3',
      status: 'completed',
      hole: 3,
      pot: 20,
      winner: players[0]?.id,
      participants: players.map((p) => p.id),
    },
    {
      id: '6',
      type: 'custom',
      name: 'First Birdie',
      description: 'First player to make birdie',
      status: 'completed',
      pot: 40,
      winner: players[1]?.id,
      participants: players.map((p) => p.id),
    },
  ];

  const activeBets = sideBets.filter((b) => b.status === 'active' || b.status === 'pending');
  const completedBets = sideBets.filter((b) => b.status === 'completed');

  const totalPot = activeBets.reduce((sum, bet) => sum + (bet.pot || 0), 0);

  const getPlayer = (id: string) => players.find((p) => p.id === id);

  const getBetIcon = (type: SideBet['type']) => {
    switch (type) {
      case 'skins':
        return <Zap size={20} />;
      case 'ctp':
        return <Target size={20} />;
      case 'longdrive':
        return <TrendingUp size={20} />;
      case 'nassau':
        return <DollarSign size={20} />;
      default:
        return <Trophy size={20} />;
    }
  };

  if (!currentTrip) return null;

  return (
    <div className="min-h-screen pb-nav" style={{ background: 'var(--canvas)' }}>
      {/* Header */}
      <header className="header">
        <div className="container-editorial flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="p-2 -ml-2 press-scale"
              style={{ color: 'var(--ink-secondary)' }}
              aria-label="Back"
            >
              <ChevronLeft size={22} />
            </button>
            <div>
              <span className="type-overline">Side Bets</span>
              <p className="type-caption">{activeBets.length} active</p>
            </div>
          </div>
          <button
            className="p-2 rounded-lg"
            style={{ color: 'var(--masters)' }}
          >
            <Plus size={22} />
          </button>
        </div>
      </header>

      <main className="container-editorial py-4">
        {/* Pot Summary */}
        <div
          className="p-6 rounded-2xl mb-6 text-center"
          style={{
            background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
            color: 'white',
          }}
        >
          <DollarSign size={32} className="mx-auto mb-2 opacity-90" />
          <h2 className="text-4xl font-bold mb-1">${totalPot}</h2>
          <p className="opacity-80">Total in Play</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setSelectedTab('active')}
            className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all ${
              selectedTab === 'active' ? 'text-white' : ''
            }`}
            style={{
              background: selectedTab === 'active' ? 'var(--masters)' : 'var(--surface)',
              border: selectedTab === 'active' ? 'none' : '1px solid var(--rule)',
            }}
          >
            Active ({activeBets.length})
          </button>
          <button
            onClick={() => setSelectedTab('completed')}
            className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all ${
              selectedTab === 'completed' ? 'text-white' : ''
            }`}
            style={{
              background: selectedTab === 'completed' ? 'var(--masters)' : 'var(--surface)',
              border: selectedTab === 'completed' ? 'none' : '1px solid var(--rule)',
            }}
          >
            Completed ({completedBets.length})
          </button>
        </div>

        {/* Bets List */}
        <div className="space-y-3">
          {(selectedTab === 'active' ? activeBets : completedBets).map((bet) => (
            <BetCard
              key={bet.id}
              bet={bet}
              icon={getBetIcon(bet.type)}
              getPlayer={getPlayer}
            />
          ))}
        </div>

        {/* Empty State */}
        {(selectedTab === 'active' ? activeBets : completedBets).length === 0 && (
          <NoBetsEmpty isActive={selectedTab === 'active'} />
        )}

        {/* Quick Add Section */}
        {selectedTab === 'active' && (
          <>
            <hr className="divider-lg my-6" />
            <h3 className="type-overline mb-4">Quick Add</h3>
            <div className="grid grid-cols-2 gap-3">
              <QuickAddButton
                icon={<Zap size={20} />}
                label="Skins Game"
                color="#f59e0b"
              />
              <QuickAddButton
                icon={<Target size={20} />}
                label="Closest to Pin"
                color="#3b82f6"
              />
              <QuickAddButton
                icon={<TrendingUp size={20} />}
                label="Long Drive"
                color="#8b5cf6"
              />
              <QuickAddButton
                icon={<DollarSign size={20} />}
                label="Nassau"
                color="#16a34a"
              />
            </div>
          </>
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="bottom-nav">
        <Link href="/" className="nav-item">
          <Home size={22} strokeWidth={1.75} />
          <span>Home</span>
        </Link>
        <Link href="/score" className="nav-item">
          <Target size={22} strokeWidth={1.75} />
          <span>Score</span>
        </Link>
        <Link href="/matchups" className="nav-item">
          <Users size={22} strokeWidth={1.75} />
          <span>Matches</span>
        </Link>
        <Link href="/standings" className="nav-item">
          <Trophy size={22} strokeWidth={1.75} />
          <span>Standings</span>
        </Link>
        <Link href="/more" className="nav-item">
          <MoreHorizontal size={22} strokeWidth={1.75} />
          <span>More</span>
        </Link>
      </nav>
    </div>
  );
}

/* Bet Card Component */
interface BetCardProps {
  bet: SideBet;
  icon: React.ReactNode;
  getPlayer: (id: string) => Player | undefined;
}

function BetCard({ bet, icon, getPlayer }: BetCardProps) {
  const winner = bet.winner ? getPlayer(bet.winner) : null;

  return (
    <div
      className="p-4 rounded-xl"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--rule)',
      }}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{
            background: bet.status === 'completed' ? 'var(--success)' : 'var(--masters)',
            color: 'white',
          }}
        >
          {bet.status === 'completed' ? <Check size={20} /> : icon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">{bet.name}</h3>
            {bet.pot && (
              <span className="font-bold" style={{ color: 'var(--success)' }}>
                ${bet.pot}
              </span>
            )}
          </div>
          <p className="type-caption mt-0.5">{bet.description}</p>

          {/* Status / Winner */}
          <div className="flex items-center gap-2 mt-2">
            {bet.status === 'active' ? (
              <>
                <Clock size={14} style={{ color: 'var(--warning)' }} />
                <span className="text-xs" style={{ color: 'var(--warning)' }}>
                  In Progress
                </span>
              </>
            ) : winner ? (
              <>
                <Crown size={14} style={{ color: 'var(--success)' }} />
                <span className="text-xs" style={{ color: 'var(--success)' }}>
                  Won by {winner.firstName} {winner.lastName}
                </span>
              </>
            ) : null}
          </div>

          {/* Participants */}
          <div className="flex items-center gap-1 mt-2">
            <span className="text-xs opacity-50">
              {bet.participants.length} player{bet.participants.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        <ChevronRight size={20} style={{ color: 'var(--ink-tertiary)' }} />
      </div>
    </div>
  );
}

/* Quick Add Button */
interface QuickAddButtonProps {
  icon: React.ReactNode;
  label: string;
  color: string;
}

function QuickAddButton({ icon, label, color }: QuickAddButtonProps) {
  return (
    <button
      className="p-4 rounded-xl flex items-center gap-3 transition-all press-scale"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--rule)',
      }}
    >
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center"
        style={{ background: `${color}20`, color }}
      >
        {icon}
      </div>
      <span className="font-medium text-sm">{label}</span>
    </button>
  );
}
