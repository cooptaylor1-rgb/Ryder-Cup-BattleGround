'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { useTripStore, useUIStore } from '@/lib/stores';
import { EmptyStatePremium, NoBetsEmpty } from '@/components/ui';
import { BottomNav, PageHeader } from '@/components/layout';
import type { Player, SideBet, SideBetType, Match } from '@/lib/types/models';
import dynamic from 'next/dynamic';
import {
  Target,
  Users,
  Trophy,
  DollarSign,
  Zap,
  TrendingUp,
  Plus,
  ChevronRight,
  Check,
  Clock,
  Crown,
  X,
  Flag,
  Ruler,
  Calculator,
} from 'lucide-react';

const SettlementView = dynamic(() => import('@/components/SettlementView'), {
  loading: () => <div className="py-12 text-center type-body text-[var(--ink-tertiary)]">Loading...</div>,
});

/**
 * BETS PAGE — Side Bets & Games
 *
 * Track skins, nassaus, closest to pin,
 * long drive, and other side action!
 */

export default function BetsPage() {
  const router = useRouter();
  const { currentTrip, players, sessions: _sessions } = useTripStore();
  const { showToast } = useUIStore();
  const [selectedTab, setSelectedTab] = useState<'active' | 'completed' | 'settle'>('active');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [newBetType, setNewBetType] = useState<SideBetType>('skins');
  const [newBetName, setNewBetName] = useState('');
  const [newBetPot, setNewBetPot] = useState('20');
  const [newBetPerHole, setNewBetPerHole] = useState('5');
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  // Nassau-specific state for 2v2 team selection
  const [nassauTeamA, setNassauTeamA] = useState<string[]>([]);
  const [nassauTeamB, setNassauTeamB] = useState<string[]>([]);

  // If no active trip, we render a premium empty state instead of redirecting.

  // Get real side bets from database
  const sideBets = useLiveQuery(
    async () => {
      if (!currentTrip) return [];
      return db.sideBets
        .where('tripId')
        .equals(currentTrip.id)
        .toArray();
    },
    [currentTrip?.id],
    []
  );

  // Get matches for linking bets to specific matches
  const matches = useLiveQuery(
    async () => {
      if (!currentTrip) return [];
      const tripSessions = await db.sessions
        .where('tripId')
        .equals(currentTrip.id)
        .toArray();
      if (tripSessions.length === 0) return [];
      const sessionIds = tripSessions.map(s => s.id);
      return db.matches
        .where('sessionId')
        .anyOf(sessionIds)
        .toArray();
    },
    [currentTrip?.id],
    []
  );

  if (!currentTrip) {
    return (
      <div className="min-h-screen pb-nav page-premium-enter texture-grain bg-[var(--canvas)]">
        <PageHeader
          title="Bets"
          subtitle="No active trip"
          icon={<Trophy size={16} className="text-[var(--color-accent)]" />}
          onBack={() => router.back()}
        />

        <main className="container-editorial py-12">
          <EmptyStatePremium
            illustration="trophy"
            title="No trip selected"
            description="Select or create a trip to view and manage side bets."
            action={{ label: 'Back to Home', onClick: () => router.push('/') }}
            secondaryAction={{ label: 'More', onClick: () => router.push('/more') }}
            variant="large"
          />
        </main>

        <BottomNav />
      </div>
    );
  }

  const activeBets = sideBets.filter((b) => b.status === 'active' || b.status === 'pending');
  const completedBets = sideBets.filter((b) => b.status === 'completed');

  const totalPot = activeBets.reduce((sum, bet) => sum + (bet.pot || 0), 0);

  const getPlayer = (id: string) => players.find((p) => p.id === id);

  const getBetIcon = (type: SideBetType) => {
    switch (type) {
      case 'skins':
        return <DollarSign size={20} />;
      case 'ctp':
        return <Target size={20} />;
      case 'longdrive':
        return <Ruler size={20} />;
      case 'nassau':
        return <Trophy size={20} />;
      default:
        return <Zap size={20} />;
    }
  };

  const betNames: Record<SideBetType, string> = {
    skins: 'Skins Game',
    ctp: 'Closest to Pin',
    longdrive: 'Long Drive',
    nassau: 'Nassau',
    custom: 'Custom Bet',
  };

  const betDescriptions: Record<SideBetType, string> = {
    skins: '$5 per hole, carry-overs',
    ctp: 'Par 3 challenge',
    longdrive: 'Longest drive wins',
    nassau: 'Front 9, Back 9, Overall',
    custom: 'Custom side bet',
  };

  const createQuickBet = async (type: SideBetType) => {
    if (!currentTrip) return;

    const newBet: SideBet = {
      id: crypto.randomUUID(),
      tripId: currentTrip.id,
      type,
      name: betNames[type],
      description: betDescriptions[type],
      status: 'active',
      pot: 20,
      perHole: type === 'skins' ? 5 : undefined,
      participantIds: players.map(p => p.id),
      createdAt: new Date().toISOString(),
    };

    await db.sideBets.add(newBet);
    showToast('success', `${betNames[type]} created!`);
  };

  const openCreateModal = () => {
    setNewBetType('skins');
    setNewBetName('');
    setNewBetPot('20');
    setNewBetPerHole('5');
    setSelectedMatch(null);
    setSelectedParticipants(players.map(p => p.id));
    setNassauTeamA([]);
    setNassauTeamB([]);
    setShowCreateModal(true);
  };

  const createCustomBet = async () => {
    if (!currentTrip) return;

    const name = newBetName.trim() || betNames[newBetType];

    // Handle Nassau separately - requires exactly 2 players per team
    if (newBetType === 'nassau') {
      if (nassauTeamA.length !== 2 || nassauTeamB.length !== 2) {
        showToast('error', 'Nassau requires exactly 2 players per team');
        return;
      }
      const participantIds = [...nassauTeamA, ...nassauTeamB];
      const teamANames = nassauTeamA.map(id => players.find(p => p.id === id)?.lastName).filter(Boolean).join(' & ');
      const teamBNames = nassauTeamB.map(id => players.find(p => p.id === id)?.lastName).filter(Boolean).join(' & ');

      const newBet: SideBet = {
        id: crypto.randomUUID(),
        tripId: currentTrip.id,
        matchId: selectedMatch?.id,
        type: 'nassau',
        name,
        description: `${teamANames} vs ${teamBNames}`,
        status: 'active',
        pot: parseInt(newBetPot) || 20,
        participantIds,
        nassauTeamA,
        nassauTeamB,
        nassauResults: {},
        createdAt: new Date().toISOString(),
      };

      await db.sideBets.add(newBet);
      showToast('success', `${name} created!`);
      setShowCreateModal(false);
      router.push(`/bets/${newBet.id}`);
      return;
    }

    // Non-Nassau bets
    const participantIds = selectedMatch
      ? [...selectedMatch.teamAPlayerIds, ...selectedMatch.teamBPlayerIds]
      : selectedParticipants;

    if (participantIds.length < 2) {
      showToast('error', 'Need at least 2 participants');
      return;
    }

    const newBet: SideBet = {
      id: crypto.randomUUID(),
      tripId: currentTrip.id,
      matchId: selectedMatch?.id,
      type: newBetType,
      name,
      description: selectedMatch
        ? `Inside game for Match #${selectedMatch.matchOrder}`
        : betDescriptions[newBetType],
      status: 'active',
      pot: parseInt(newBetPot) || 20,
      perHole: newBetType === 'skins' ? (parseInt(newBetPerHole) || 5) : undefined,
      participantIds,
      createdAt: new Date().toISOString(),
    };

    await db.sideBets.add(newBet);
    showToast('success', `${name} created!`);
    setShowCreateModal(false);
    router.push(`/bets/${newBet.id}`);
  };

  const getMatchPlayers = (match: Match) => {
    const allPlayerIds = [...match.teamAPlayerIds, ...match.teamBPlayerIds];
    return allPlayerIds.map((id) => players.find((p) => p.id === id)).filter(Boolean) as Player[];
  };

  return (
    <div className="min-h-screen pb-nav page-premium-enter texture-grain bg-[var(--canvas)]">
      <PageHeader
        title="Side Bets"
        subtitle={`${activeBets.length} active`}
        icon={<DollarSign size={16} className="text-[var(--color-accent)]" />}
        onBack={() => router.back()}
        rightSlot={
          <button
            onClick={openCreateModal}
            className="press-scale p-2 rounded-lg text-[var(--color-accent)] bg-transparent border-0 cursor-pointer"
            aria-label="Create bet"
          >
            <Plus size={22} />
          </button>
        }
      />

      <main className="container-editorial py-[var(--space-4)]">
        {/* Pot Summary */}
        <div className="card text-center bg-[linear-gradient(135deg,var(--masters)_0%,var(--masters-hover)_100%)] text-[var(--canvas)] p-[var(--space-6)] mb-[var(--space-6)]">
          <DollarSign size={32} className="mx-auto mb-[var(--space-2)] opacity-90" />
          <h2 className="score-large mb-[var(--space-1)]">${totalPot}</h2>
          <p className="type-body opacity-80">Total in Play</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-[var(--space-2)] mb-[var(--space-6)]">
          <button
            onClick={() => setSelectedTab('active')}
            className={`${selectedTab === 'active' ? 'btn btn-primary' : 'btn btn-secondary'} flex-1`}
          >
            Active ({activeBets.length})
          </button>
          <button
            onClick={() => setSelectedTab('completed')}
            className={`${selectedTab === 'completed' ? 'btn btn-primary' : 'btn btn-secondary'} flex-1`}
          >
            Done ({completedBets.length})
          </button>
          <button
            onClick={() => setSelectedTab('settle')}
            className={`${selectedTab === 'settle' ? 'btn btn-primary' : 'btn btn-secondary'} flex-1 flex items-center justify-center gap-[var(--space-1)]`}
          >
            <Calculator size={14} />
            Settle Up
          </button>
        </div>

        {/* Settle Up Tab */}
        {selectedTab === 'settle' && <SettlementView />}

        {/* Bets List */}
        {selectedTab !== 'settle' && (
          <div className="flex flex-col gap-[var(--space-3)]">
            {(selectedTab === 'active' ? activeBets : completedBets).map((bet) => (
              <BetCard
                key={bet.id}
                bet={bet}
                icon={getBetIcon(bet.type)}
                getPlayer={getPlayer}
              />
            ))}
          </div>
        )}

        {/* Empty State */}
        {selectedTab !== 'settle' &&
          (selectedTab === 'active' ? activeBets : completedBets).length === 0 && (
            <NoBetsEmpty isActive={selectedTab === 'active'} />
          )}

        {/* Quick Add Section */}
        {selectedTab === 'active' && (
          <>
            <hr className="divider-lg my-[var(--space-6)]" />
            <h3 className="type-overline mb-[var(--space-4)]">Quick Add</h3>
            <div className="grid grid-cols-2 gap-[var(--space-3)]">
              <QuickAddButton
                icon={<Zap size={20} />}
                label="Skins Game"
                color="var(--warning)"
                onClick={() => createQuickBet('skins')}
              />
              <QuickAddButton
                icon={<Target size={20} />}
                label="Closest to Pin"
                color="var(--team-usa)"
                onClick={() => createQuickBet('ctp')}
              />
              <QuickAddButton
                icon={<TrendingUp size={20} />}
                label="Long Drive"
                color="var(--team-europe)"
                onClick={() => createQuickBet('longdrive')}
              />
              <QuickAddButton
                icon={<DollarSign size={20} />}
                label="Nassau"
                color="var(--masters)"
                onClick={() => createQuickBet('nassau')}
              />
            </div>
          </>
        )}
      </main>

      <BottomNav />

      {/* Create Bet Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowCreateModal(false)}
          />
          <div className="relative w-full max-w-lg rounded-t-3xl border border-[var(--rule)] bg-[var(--surface-raised)] p-6 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="type-title">Create Side Bet</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 rounded-full hover:bg-[var(--surface)]"
                style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
              >
                <X size={24} />
              </button>
            </div>

            {/* Bet Type Selection */}
            <div style={{ marginBottom: 'var(--space-4)' }}>
              <label className="type-overline" style={{ display: 'block', marginBottom: 'var(--space-2)' }}>
                Bet Type
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-2)' }}>
                {(['skins', 'nassau', 'ctp', 'longdrive', 'custom'] as SideBetType[]).map(type => (
                  <button
                    key={type}
                    onClick={() => setNewBetType(type)}
                    className="p-3 rounded-xl transition-all"
                    style={{
                      background: newBetType === type ? 'var(--masters)' : 'var(--surface)',
                      color: newBetType === type ? 'white' : 'var(--ink)',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    <div className="flex flex-col items-center gap-1">
                      {getBetIcon(type)}
                      <span className="type-micro capitalize">{type === 'ctp' ? 'CTP' : type}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Name */}
            <div style={{ marginBottom: 'var(--space-4)' }}>
              <label className="type-overline" style={{ display: 'block', marginBottom: 'var(--space-2)' }}>
                Name (optional)
              </label>
              <input
                type="text"
                value={newBetName}
                onChange={(e) => setNewBetName(e.target.value)}
                placeholder={betNames[newBetType]}
                className="w-full p-3 rounded-xl"
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--rule)',
                  color: 'var(--ink)',
                }}
              />
            </div>

            {/* Pot Amount */}
            <div style={{ display: 'grid', gridTemplateColumns: newBetType === 'skins' ? '1fr 1fr' : '1fr', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
              <div>
                <label className="type-overline" style={{ display: 'block', marginBottom: 'var(--space-2)' }}>
                  Total Pot ($)
                </label>
                <input
                  type="number"
                  min="0"
                  value={newBetPot}
                  onChange={(e) => setNewBetPot(e.target.value)}
                  className="w-full p-3 rounded-xl"
                  style={{
                    background: 'var(--surface)',
                    border: '1px solid var(--rule)',
                    color: 'var(--ink)',
                  }}
                />
              </div>
              {newBetType === 'skins' && (
                <div>
                  <label className="type-overline" style={{ display: 'block', marginBottom: 'var(--space-2)' }}>
                    Per Hole ($)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={newBetPerHole}
                    onChange={(e) => setNewBetPerHole(e.target.value)}
                    className="w-full p-3 rounded-xl"
                    style={{
                      background: 'var(--surface)',
                      border: '1px solid var(--rule)',
                      color: 'var(--ink)',
                    }}
                  />
                </div>
              )}
            </div>

            {/* Link to Match */}
            {matches && matches.length > 0 && newBetType !== 'nassau' && (
              <div style={{ marginBottom: 'var(--space-4)' }}>
                <label className="type-overline" style={{ display: 'block', marginBottom: 'var(--space-2)' }}>
                  Link to Match (Inside Game)
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                  <button
                    onClick={() => setSelectedMatch(null)}
                    className="p-3 rounded-xl text-left transition-all flex items-center gap-3"
                    style={{
                      background: !selectedMatch ? 'var(--masters-light)' : 'var(--surface)',
                      border: !selectedMatch ? '2px solid var(--masters)' : '1px solid var(--rule)',
                      cursor: 'pointer',
                    }}
                  >
                    <Users size={18} />
                    <span className="type-body-sm">Trip-wide (All Players)</span>
                  </button>
                  {matches.map(match => {
                    const matchPlayers = getMatchPlayers(match);
                    const isSelected = selectedMatch?.id === match.id;
                    return (
                      <button
                        key={match.id}
                        onClick={() => setSelectedMatch(match)}
                        className="p-3 rounded-xl text-left transition-all"
                        style={{
                          background: isSelected ? 'var(--masters-light)' : 'var(--surface)',
                          border: isSelected ? '2px solid var(--masters)' : '1px solid var(--rule)',
                          cursor: 'pointer',
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <Flag size={18} style={{ color: isSelected ? 'var(--masters)' : 'var(--ink-secondary)' }} />
                          <div>
                            <p className="type-body-sm">Match #{match.matchOrder}</p>
                            <p className="type-micro" style={{ color: 'var(--ink-tertiary)' }}>
                              {matchPlayers.map(p => p.lastName).join(', ')}
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Nassau Team Selection (2v2) */}
            {newBetType === 'nassau' && (
              <div style={{ marginBottom: 'var(--space-4)' }}>
                <div
                  className="p-3 rounded-lg"
                  style={{ background: 'var(--info-light)', marginBottom: 'var(--space-3)' }}
                >
                  <p className="type-caption" style={{ color: 'var(--info)' }}>
                    Nassau is a 2v2 match bet with 3 wagers: Front 9, Back 9, and Overall.
                    Select exactly 2 players for each team.
                  </p>
                </div>

                {/* Team A Selection */}
                <label className="type-overline" style={{ display: 'block', marginBottom: 'var(--space-2)' }}>
                  Team A ({nassauTeamA.length}/2)
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
                  {players.map(player => {
                    const isSelected = nassauTeamA.includes(player.id);
                    const isOnOtherTeam = nassauTeamB.includes(player.id);
                    return (
                      <button
                        key={player.id}
                        onClick={() => {
                          if (isOnOtherTeam) return;
                          if (isSelected) {
                            setNassauTeamA(nassauTeamA.filter(id => id !== player.id));
                          } else if (nassauTeamA.length < 2) {
                            setNassauTeamA([...nassauTeamA, player.id]);
                          }
                        }}
                        disabled={isOnOtherTeam}
                        className="px-3 py-2 rounded-lg transition-all"
                        style={{
                          background: isSelected ? 'var(--team-usa)' : isOnOtherTeam ? 'var(--surface-secondary)' : 'var(--surface)',
                          color: isSelected ? 'white' : isOnOtherTeam ? 'var(--ink-tertiary)' : 'var(--ink)',
                          border: isSelected ? '2px solid var(--team-usa)' : '1px solid var(--rule)',
                          cursor: isOnOtherTeam ? 'not-allowed' : 'pointer',
                          opacity: isOnOtherTeam ? 0.5 : 1,
                        }}
                      >
                        {player.firstName} {player.lastName}
                      </button>
                    );
                  })}
                </div>

                {/* Team B Selection */}
                <label className="type-overline" style={{ display: 'block', marginBottom: 'var(--space-2)' }}>
                  Team B ({nassauTeamB.length}/2)
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                  {players.map(player => {
                    const isSelected = nassauTeamB.includes(player.id);
                    const isOnOtherTeam = nassauTeamA.includes(player.id);
                    return (
                      <button
                        key={player.id}
                        onClick={() => {
                          if (isOnOtherTeam) return;
                          if (isSelected) {
                            setNassauTeamB(nassauTeamB.filter(id => id !== player.id));
                          } else if (nassauTeamB.length < 2) {
                            setNassauTeamB([...nassauTeamB, player.id]);
                          }
                        }}
                        disabled={isOnOtherTeam}
                        className="px-3 py-2 rounded-lg transition-all"
                        style={{
                          background: isSelected ? 'var(--team-europe)' : isOnOtherTeam ? 'var(--surface-secondary)' : 'var(--surface)',
                          color: isSelected ? 'white' : isOnOtherTeam ? 'var(--ink-tertiary)' : 'var(--ink)',
                          border: isSelected ? '2px solid var(--team-europe)' : '1px solid var(--rule)',
                          cursor: isOnOtherTeam ? 'not-allowed' : 'pointer',
                          opacity: isOnOtherTeam ? 0.5 : 1,
                        }}
                      >
                        {player.firstName} {player.lastName}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Create Button */}
            <button
              onClick={createCustomBet}
              className="btn btn-primary w-full"
              style={{ marginTop: 'var(--space-4)' }}
            >
              Create Bet
            </button>
          </div>
        </div>
      )}
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
  const router = useRouter();
  const winner = bet.winnerId ? getPlayer(bet.winnerId) : null;
  const isNassau = bet.type === 'nassau';

  // Calculate Nassau summary
  const getNassauSummary = () => {
    if (!isNassau || !bet.nassauResults) return undefined;
    const r = bet.nassauResults;
    let teamAWins = 0;
    let teamBWins = 0;
    if (r.front9Winner === 'teamA') teamAWins++;
    else if (r.front9Winner === 'teamB') teamBWins++;
    if (r.back9Winner === 'teamA') teamAWins++;
    else if (r.back9Winner === 'teamB') teamBWins++;
    if (r.overallWinner === 'teamA') teamAWins++;
    else if (r.overallWinner === 'teamB') teamBWins++;
    const completed = (r.front9Winner ? 1 : 0) + (r.back9Winner ? 1 : 0) + (r.overallWinner ? 1 : 0);
    return { teamAWins, teamBWins, completed };
  };

  const nassauSummary = getNassauSummary();

  return (
    <button
      className="card press-scale"
      style={{
        padding: 'var(--space-4)',
        width: '100%',
        textAlign: 'left',
        border: 'none',
        cursor: 'pointer',
      }}
      onClick={() => {
        router.push(`/bets/${bet.id}`);
      }}
    >
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
            {bet.status === 'active' && isNassau && nassauSummary ? (
              <>
                <Trophy size={14} style={{ color: 'var(--warning)' }} />
                <span className="type-micro" style={{ color: 'var(--warning)' }}>
                  {nassauSummary.completed}/3 segments • {nassauSummary.teamAWins}-{nassauSummary.teamBWins}
                </span>
              </>
            ) : bet.status === 'active' ? (
              <>
                <Clock size={14} style={{ color: 'var(--warning)' }} />
                <span className="type-micro" style={{ color: 'var(--warning)' }}>
                  In Progress
                </span>
              </>
            ) : isNassau && nassauSummary ? (
              <>
                <Trophy size={14} style={{ color: 'var(--success)' }} />
                <span className="type-micro" style={{ color: 'var(--success)' }}>
                  Final: {nassauSummary.teamAWins}-{nassauSummary.teamBWins}
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
              {isNassau ? '2v2 Match' : `${bet.participantIds.length} player${bet.participantIds.length !== 1 ? 's' : ''}`}
            </span>
          </div>
        </div>

        <ChevronRight size={20} style={{ color: 'var(--ink-tertiary)' }} />
      </div>
    </button>
  );
}

/* Quick Add Button */
interface QuickAddButtonProps {
  icon: React.ReactNode;
  label: string;
  color: string;
  onClick?: () => void;
}

function QuickAddButton({ icon, label, color, onClick }: QuickAddButtonProps) {
  return (
    <button
      onClick={onClick}
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
