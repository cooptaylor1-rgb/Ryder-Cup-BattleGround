/**
 * Statistics Dashboard Component
 *
 * Production-ready comprehensive statistics display for trips.
 */

'use client';

import { useMemo, useState } from 'react';
import {
  Trophy,
  TrendingUp,
  Target,
  Users,
  BarChart3,
  Medal,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PlayerStatistics, TripAward } from '@/lib/types/captain';
import type { Player, Match, HoleResult, RyderCupSession } from '@/lib/types/models';
import { calculateEnhancedPlayerStats, calculateTripAwards } from '@/lib/services/statisticsService';
import { PlayerStatsCard } from './PlayerStatsCard';

interface StatsDashboardProps {
  tripId: string;
  players: Player[];
  matches: Match[];
  sessions: RyderCupSession[];
  holeResults: HoleResult[];
  className?: string;
}

type SortKey = 'points' | 'wins' | 'winPct' | 'holesWon' | 'comebacks';

export function StatsDashboard({
  tripId,
  players,
  matches,
  sessions,
  holeResults,
  className,
}: StatsDashboardProps) {
  const [sortBy, setSortBy] = useState<SortKey>('points');
  const [showAllPlayers, setShowAllPlayers] = useState(false);

  // Calculate stats for all players
  const playerStats = useMemo(() => {
    return players.map(player =>
      calculateEnhancedPlayerStats(
        player.id,
        tripId,
        matches,
        sessions,
        holeResults,
        players
      )
    ).filter(stats => stats.matchesPlayed > 0);
  }, [players, tripId, matches, sessions, holeResults]);

  // Calculate awards
  const awards = useMemo(() => {
    return calculateTripAwards(tripId, playerStats, matches, holeResults, players);
  }, [tripId, playerStats, matches, holeResults, players]);

  // Sort players
  const sortedStats = useMemo(() => {
    return [...playerStats].sort((a, b) => {
      switch (sortBy) {
        case 'points':
          return b.points - a.points;
        case 'wins':
          return b.wins - a.wins;
        case 'winPct':
          return b.winPercentage - a.winPercentage;
        case 'holesWon':
          return b.holesWon - a.holesWon;
        case 'comebacks':
          return b.comebacks - a.comebacks;
        default:
          return b.points - a.points;
      }
    });
  }, [playerStats, sortBy]);

  const visibleStats = showAllPlayers ? sortedStats : sortedStats.slice(0, 5);

  // Avoid `return null` inside list rendering; prefilter invalid rows so ranks are consistent.
  const leaderboardRows = useMemo(() => {
    const rows: Array<{ stats: PlayerStatistics; player: Player }> = [];
    for (const stats of visibleStats) {
      const player = players.find((p) => p.id === stats.playerId);
      if (!player) continue;
      rows.push({ stats, player });
    }
    return rows;
  }, [players, visibleStats]);

  // Calculate aggregate stats
  const aggregateStats = useMemo(() => {
    const totalMatches = matches.filter(m => m.status === 'completed').length;
    const totalHoles = holeResults.length;
    const avgPointsPerPlayer = playerStats.length > 0
      ? (playerStats.reduce((sum, s) => sum + s.points, 0) / playerStats.length).toFixed(1)
      : '0';

    // Calculate close matches (decided by 1 hole or less)
    let closeMatches = 0;
    matches.filter(m => m.status === 'completed').forEach(match => {
      const results = holeResults.filter(hr => hr.matchId === match.id);
      let aWins = 0, bWins = 0;
      results.forEach(hr => {
        if (hr.winner === 'teamA') aWins++;
        else if (hr.winner === 'teamB') bWins++;
      });
      if (Math.abs(aWins - bWins) <= 1) closeMatches++;
    });

    return {
      totalMatches,
      totalHoles,
      avgPointsPerPlayer,
      closeMatches,
      closeMatchPct: totalMatches > 0 ? Math.round((closeMatches / totalMatches) * 100) : 0,
    };
  }, [matches, holeResults, playerStats]);

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          label="Total Matches"
          value={aggregateStats.totalMatches}
          icon={<Trophy size={18} />}
        />
        <StatCard
          label="Avg Points"
          value={aggregateStats.avgPointsPerPlayer}
          icon={<TrendingUp size={18} />}
        />
        <StatCard
          label="Close Matches"
          value={`${aggregateStats.closeMatches}`}
          subtext={`${aggregateStats.closeMatchPct}%`}
          icon={<Target size={18} />}
        />
        <StatCard
          label="Active Players"
          value={playerStats.length}
          icon={<Users size={18} />}
        />
      </div>

      {/* Awards */}
      {awards.length > 0 && (
        <div>
          <h3 className="type-h4 mb-3 flex items-center gap-2">
            <Medal className="text-[var(--masters)]" size={20} />
            Trip Awards
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {awards.map(award => (
              <AwardCard key={award.id} award={award} />
            ))}
          </div>
        </div>
      )}

      {/* Player Leaderboard */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="type-h4 flex items-center gap-2">
            <BarChart3 className="text-[var(--accent)]" size={20} />
            Player Leaderboard
          </h3>

          {/* Sort selector */}
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as SortKey)}
            className="input-premium py-1.5 text-sm"
          >
            <option value="points">Sort by Points</option>
            <option value="wins">Sort by Wins</option>
            <option value="winPct">Sort by Win %</option>
            <option value="holesWon">Sort by Holes Won</option>
            <option value="comebacks">Sort by Comebacks</option>
          </select>
        </div>

        <div className="space-y-3">
          {leaderboardRows.map(({ stats, player }, index) => (
            <PlayerStatsCard
              key={stats.playerId}
              stats={stats}
              player={player}
              allPlayers={players}
              rank={index + 1}
              showDetails={index < 3}
            />
          ))}
        </div>

        {sortedStats.length > 5 && (
          <button
            onClick={() => setShowAllPlayers(!showAllPlayers)}
            className="w-full mt-3 py-2 text-center type-caption text-[var(--accent)] hover:text-[var(--accent-hover)] flex items-center justify-center gap-1"
          >
            {showAllPlayers ? (
              <>
                Show less <ChevronUp size={14} />
              </>
            ) : (
              <>
                Show all {sortedStats.length} players <ChevronDown size={14} />
              </>
            )}
          </button>
        )}
      </div>

      {/* Empty state */}
      {playerStats.length === 0 && (
        <div className="card p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[var(--surface-secondary)] flex items-center justify-center">
            <BarChart3 size={32} className="text-[var(--ink-tertiary)]" />
          </div>
          <p className="type-body-lg text-[var(--ink-secondary)] mb-1">No stats yet</p>
          <p className="type-caption text-[var(--ink-tertiary)]">
            Complete some matches to see player statistics
          </p>
        </div>
      )}
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  icon: React.ReactNode;
}

function StatCard({ label, value, subtext, icon }: StatCardProps) {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-2 mb-2 text-[var(--ink-tertiary)]">
        {icon}
        <span className="type-caption">{label}</span>
      </div>
      <div className="type-h3 text-[var(--ink-primary)] font-bold">
        {value}
        {subtext && (
          <span className="type-caption text-[var(--ink-tertiary)] font-normal ml-1">
            ({subtext})
          </span>
        )}
      </div>
    </div>
  );
}

interface AwardCardProps {
  award: TripAward;
}

function AwardCard({ award }: AwardCardProps) {
  const awardIcons: Record<string, string> = {
    mvp: '🏆',
    iron_man: '💪',
    consistent: '🎯',
    comeback_king: '👑',
    clutch: '⚡',
    team_player: '🤝',
    rookie: '⭐',
    sniper: '🔥',
  };

  const awardLabels: Record<string, string> = {
    mvp: 'MVP',
    iron_man: 'Iron Man',
    consistent: 'Most Consistent',
    comeback_king: 'Comeback King',
    clutch: 'Clutch Performer',
    team_player: 'Team Player',
    rookie: 'Rookie of the Trip',
    sniper: 'Hole Sniper',
  };

  return (
    <div className="card p-4 flex items-center gap-3">
      <div className="text-2xl">
        {awardIcons[award.type] || '🏅'}
      </div>
      <div className="flex-1 min-w-0">
        <div className="type-caption text-[var(--accent)] font-medium">
          {awardLabels[award.type] || award.type}
        </div>
        <div className="type-body font-semibold text-[var(--ink-primary)] truncate">
          {award.playerName}
        </div>
        <div className="type-caption text-[var(--ink-tertiary)]">
          {award.value}
        </div>
      </div>
    </div>
  );
}

export default StatsDashboard;
