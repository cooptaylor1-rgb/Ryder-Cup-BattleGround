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
  CalendarDays,
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

      <main className="container-editorial" style={{ paddingTop: 'var(--space-4)', paddingBottom: 'var(--space-4)' }}>
        {/* Pot Summary */}
        <div
          className="card text-center"
          style={{
            background: 'linear-gradient(135deg, var(--masters) 0%, var(--masters-hover) 100%)',
            color: 'white',
            padding: 'var(--space-6)',
            marginBottom: 'var(--space-6)',
          }}
        >
          <DollarSign size={32} style={{ margin: '0 auto var(--space-2)', opacity: 0.9 }} />
          <h2 className="score-large" style={{ marginBottom: 'var(--space-1)' }}>${totalPot}</h2>
          <p className="type-body" style={{ opacity: 0.8 }}>Total in Play</p>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-6)' }}>
          <button
            onClick={() => setSelectedTab('active')}
            className={selectedTab === 'active' ? 'btn btn-primary' : 'btn btn-secondary'}
            style={{ flex: 1 }}
          >
            Active ({activeBets.length})
          </button>
          <button
            onClick={() => setSelectedTab('completed')}
            className={selectedTab === 'completed' ? 'btn btn-primary' : 'btn btn-secondary'}
            style={{ flex: 1 }}
          >
            Completed ({completedBets.length})
          </button>
        </div>

        {/* Bets List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
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
            <hr className="divider-lg" style={{ marginTop: 'var(--space-6)', marginBottom: 'var(--space-6)' }} />
            <h3 className="type-overline" style={{ marginBottom: 'var(--space-4)' }}>Quick Add</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-3)' }}>
              <QuickAddButton
                icon={<Zap size={20} />}
                label="Skins Game"
                color="var(--warning)"
              />
              <QuickAddButton
                icon={<Target size={20} />}
                label="Closest to Pin"
                color="var(--team-usa)"
              />
              <QuickAddButton
                icon={<TrendingUp size={20} />}
                label="Long Drive"
                color="var(--team-europe)"
              />
              <QuickAddButton
                icon={<DollarSign size={20} />}
                label="Nassau"
                color="var(--masters)"
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
        <Link href="/schedule" className="nav-item">
          <CalendarDays size={22} strokeWidth={1.75} />
          <span>Schedule</span>
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
    <div className="card" style={{ padding: 'var(--space-4)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)' }}>
        {/* Icon */}
        <div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: bet.status === 'completed' ? 'var(--success)' : 'var(--masters)',
            color: 'white',
          }}
        >
          {bet.status === 'completed' ? <Check size={20} /> : icon}
        </div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 className="type-title-sm">{bet.name}</h3>
            {bet.pot && (
              <span className="type-title-sm" style={{ color: 'var(--success)' }}>
                ${bet.pot}
              </span>
            )}
          </div>
          <p className="type-caption" style={{ marginTop: 'var(--space-1)' }}>{bet.description}</p>

          {/* Status / Winner */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
            {bet.status === 'active' ? (
              <>
                <Clock size={14} style={{ color: 'var(--warning)' }} />
                <span className="type-micro" style={{ color: 'var(--warning)' }}>
                  In Progress
                </span>
              </>
            ) : winner ? (
              <>
                <Crown size={14} style={{ color: 'var(--success)' }} />
                <span className="type-micro" style={{ color: 'var(--success)' }}>
                  Won by {winner.firstName} {winner.lastName}
                </span>
              </>
            ) : null}
          </div>

          {/* Participants */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)', marginTop: 'var(--space-2)' }}>
            <span className="type-micro" style={{ color: 'var(--ink-tertiary)' }}>
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
      className="card press-scale"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-3)',
        padding: 'var(--space-4)',
        cursor: 'pointer',
        border: 'none',
        textAlign: 'left',
        width: '100%',
      }}
    >
      <div
        style={{
          width: '40px',
          height: '40px',
          borderRadius: 'var(--radius-md)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: `color-mix(in srgb, ${color} 15%, transparent)`,
          color,
        }}
      >
        {icon}
      </div>
      <span className="type-body-sm">{label}</span>
    </button>
  );
}
