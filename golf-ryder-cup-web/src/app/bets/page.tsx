'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { useTripStore, useUIStore } from '@/lib/stores';
import { NoBetsEmpty, PageSkeleton, Skeleton } from '@/components/ui';
import type { Player, SideBet, SideBetType, Match } from '@/lib/types/models';
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
  X,
  Flag,
  Ruler,
} from 'lucide-react';

/**
 * BETS PAGE — Side Bets & Games
 *
 * Track skins, nassaus, closest to pin,
 * long drive, and other side action!
 */

export default function BetsPage() {
  const router = useRouter();
  const { currentTrip, players, sessions } = useTripStore();
  const { showToast } = useUIStore();
  const [selectedTab, setSelectedTab] = useState<'active' | 'completed'>('active');
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

  useEffect(() => {
    if (!currentTrip) {
      router.push('/');
    }
  }, [currentTrip, router]);

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
    return allPlayerIds.map(id => players.find(p => p.id === id)).filter(Boolean) as Player[];
  };

  if (!currentTrip) {
    return (
      <PageSkeleton>
        <div className="space-y-4 mt-4">
          <Skeleton className="h-12 w-full rounded-xl" />
          <div className="grid gap-3">
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
          </div>
        </div>
      </PageSkeleton>
    );
  }

  return (
    <div className="min-h-screen pb-nav page-premium-enter texture-grain" style={{ background: 'var(--canvas)' }}>
      {/* Premium Header */}
      <header className="header-premium">
        <div className="container-editorial flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="p-2 -ml-2 press-scale"
              style={{ color: 'var(--ink-secondary)', background: 'transparent', border: 'none', cursor: 'pointer' }}
              aria-label="Back"
            >
              <ChevronLeft size={22} />
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: 'var(--radius-md)',
                  background: 'linear-gradient(135deg, var(--masters) 0%, var(--masters-deep) 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: 'var(--shadow-glow-green)',
                }}
              >
                <DollarSign size={16} style={{ color: 'var(--color-accent)' }} />
              </div>
              <div>
                <span className="type-overline" style={{ letterSpacing: '0.1em' }}>Side Bets</span>
                <p className="type-caption">{activeBets.length} active</p>
              </div>
            </div>
          </div>
          <button
            onClick={openCreateModal}
            className="btn-premium p-2 rounded-lg"
            style={{ color: 'var(--color-accent)', background: 'transparent', border: 'none', cursor: 'pointer' }}
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

      {/* Bottom Navigation */}
      <nav className="nav-premium bottom-nav">
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

      {/* Create Bet Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowCreateModal(false)}
          />
          <div
            className="relative w-full max-w-lg bg-background rounded-t-3xl p-6"
            style={{ maxHeight: '90vh', overflowY: 'auto' }}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="type-title">Create Side Bet</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 rounded-full hover:bg-muted"
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
                          background: isSelected ? 'var(--team-usa)' : isOnOtherTeam ? 'var(--muted)' : 'var(--surface)',
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
                          background: isSelected ? 'var(--team-europe)' : isOnOtherTeam ? 'var(--muted)' : 'var(--surface)',
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
    if (!isNassau || !bet.nassauResults) return null;
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
