'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import analytics, { AnalyticsEvents } from '@/lib/services/analyticsService';

// ============================================
// TYPES
// ============================================

interface TeamStanding {
  teamId: string;
  teamName: string;
  teamColor: string;
  points: number;
  wins: number;
  losses: number;
  halves: number;
  matchesPlayed: number;
}

interface PlayerStanding {
  playerId: string;
  playerName: string;
  teamId: string;
  teamName: string;
  wins: number;
  losses: number;
  halves: number;
  points: number;
  holesWon: number;
}

interface Match {
  id: string;
  name: string;
  format: string;
  status: 'pending' | 'active' | 'complete';
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number;
  awayScore: number;
  holesPlayed: number;
  totalHoles: number;
  completedAt?: Date;
}

// ============================================
// STANDING CARD COMPONENTS
// ============================================

function TeamCard({ standing, rank }: { standing: TeamStanding; rank: number }) {
  return (
    <div
      className="team-card"
      style={{
        '--team-color': standing.teamColor,
      } as React.CSSProperties}
    >
      <div className="team-rank">#{rank}</div>
      <div className="team-info">
        <h3 className="team-name">{standing.teamName}</h3>
        <div className="team-record">
          {standing.wins}W - {standing.losses}L - {standing.halves}H
        </div>
      </div>
      <div className="team-points">
        <span className="points-value">{standing.points}</span>
        <span className="points-label">pts</span>
      </div>
    </div>
  );
}

function PlayerCard({ standing, rank }: { standing: PlayerStanding; rank: number }) {
  return (
    <div className="player-card">
      <div className="player-rank">#{rank}</div>
      <div className="player-info">
        <p className="player-name">{standing.playerName}</p>
        <p className="player-team">{standing.teamName}</p>
        <div className="player-record">
          {standing.wins}W - {standing.losses}L - {standing.halves}H
        </div>
      </div>
      <div className="player-points">
        <span className="points-value">{standing.points}</span>
        <span className="points-label">pts</span>
      </div>
    </div>
  );
}

function MatchResultCard({ match }: { match: Match }) {
  const isHomeWin = match.homeScore > match.awayScore;
  const isAwayWin = match.awayScore > match.homeScore;
  const isHalved = match.homeScore === match.awayScore;

  return (
    <div className={`match-result-card ${match.status}`}>
      <div className="match-format-badge">{match.format}</div>
      <div className="match-scores">
        <div className={`team-score ${isHomeWin ? 'winner' : ''}`}>
          <span className="score-val">{match.homeScore}</span>
        </div>
        <div className="score-divider">{isHalved ? 'H' : 'vs'}</div>
        <div className={`team-score ${isAwayWin ? 'winner' : ''}`}>
          <span className="score-val">{match.awayScore}</span>
        </div>
      </div>
      <div className="match-holes">
        {match.status === 'complete' ? 'Final' : `${match.holesPlayed}/${match.totalHoles} holes`}
      </div>
    </div>
  );
}

// ============================================
// STANDINGS TABS
// ============================================

type StandingsView = 'teams' | 'players' | 'matches';

function StandingsTabs({
  activeView,
  onViewChange,
  counts,
}: {
  activeView: StandingsView;
  onViewChange: (view: StandingsView) => void;
  counts: { teams: number; players: number; matches: number };
}) {
  return (
    <div className="standings-tabs">
      {(['teams', 'players', 'matches'] as StandingsView[]).map((view) => (
        <button
          key={view}
          onClick={() => onViewChange(view)}
          className={`tab-btn ${activeView === view ? 'active' : ''}`}
        >
          {view.charAt(0).toUpperCase() + view.slice(1)}
          <span className="tab-count">{counts[view]}</span>
        </button>
      ))}
    </div>
  );
}

// ============================================
// MAIN PAGE
// ============================================

export default function StandingsPage() {
  const router = useRouter();
  const [activeView, setActiveView] = useState<StandingsView>('teams');
  const [activeTripId, setActiveTripId] = useState<string | null>(null);

  // Live DB queries
  const trips = useLiveQuery(() => db.trips.toArray(), []);
  const matches = useLiveQuery(
    () => (activeTripId ? db.matches.where('tripId').equals(activeTripId).toArray() : db.matches.toArray()),
    [activeTripId]
  );
  const players = useLiveQuery(() => db.players.toArray(), []);
  const teams = useLiveQuery(() => db.teams.toArray(), []);

  // Set default trip
  useEffect(() => {
    if (trips && trips.length > 0 && !activeTripId) {
      setActiveTripId(trips[0].id);
    }
  }, [trips, activeTripId]);

  // Track page view
  useEffect(() => {
    analytics.track(AnalyticsEvents.PAGE_VIEW, 'navigation', { page: 'standings' });
  }, []);

  // ----------------------------------------
  // COMPUTE STANDINGS
  // ----------------------------------------

  const teamStandings: TeamStanding[] = (teams || []).map((team) => {
    const teamMatches = (matches || []).filter(
      (m) => m.homeTeamId === team.id || m.awayTeamId === team.id
    );
    const completedMatches = teamMatches.filter((m) => m.status === 'complete');

    let wins = 0;
    let losses = 0;
    let halves = 0;

    completedMatches.forEach((m) => {
      const isHome = m.homeTeamId === team.id;
      const teamScore = isHome ? m.homeScore : m.awayScore;
      const oppScore = isHome ? m.awayScore : m.homeScore;

      if (teamScore > oppScore) wins++;
      else if (teamScore < oppScore) losses++;
      else halves++;
    });

    return {
      teamId: team.id,
      teamName: team.name,
      teamColor: team.color || '#666',
      points: wins * 1 + halves * 0.5,
      wins,
      losses,
      halves,
      matchesPlayed: completedMatches.length,
    };
  }).sort((a, b) => b.points - a.points);

  const playerStandings: PlayerStanding[] = (players || []).map((player) => {
    const team = (teams || []).find((t) => t.id === player.teamId);
    const playerMatches = (matches || []).filter(
      (m) => m.playerIds?.includes(player.id) && m.status === 'complete'
    );

    let wins = 0;
    let losses = 0;
    let halves = 0;
    let holesWon = 0;

    playerMatches.forEach((m) => {
      const isHome = m.homeTeamId === player.teamId;
      const teamScore = isHome ? m.homeScore : m.awayScore;
      const oppScore = isHome ? m.awayScore : m.homeScore;

      if (teamScore > oppScore) wins++;
      else if (teamScore < oppScore) losses++;
      else halves++;

      holesWon += isHome ? m.homeScore : m.awayScore;
    });

    return {
      playerId: player.id,
      playerName: player.name,
      teamId: player.teamId,
      teamName: team?.name || 'Unknown',
      wins,
      losses,
      halves,
      points: wins * 1 + halves * 0.5,
      holesWon,
    };
  }).sort((a, b) => b.points - a.points);

  const matchResults: Match[] = (matches || [])
    .filter((m) => m.status === 'complete' || m.status === 'active')
    .sort((a, b) => {
      if (a.status === 'active' && b.status !== 'active') return -1;
      if (b.status === 'active' && a.status !== 'active') return 1;
      return 0;
    });

  // ----------------------------------------
  // RENDER
  // ----------------------------------------

  const handleViewChange = useCallback(
    (view: StandingsView) => {
      setActiveView(view);
      analytics.track(AnalyticsEvents.NAV_CLICK, 'navigation', { view });
    },
    []
  );

  return (
    <div className="standings-page">
      {/* Header */}
      <header className="standings-header">
        <Link href="/" className="back-link">
          ← Home
        </Link>
        <h1 className="page-title">Standings</h1>
        <div className="header-spacer" />
      </header>

      {/* Trip Filter */}
      {trips && trips.length > 1 && (
        <div className="trip-filter">
          <label className="filter-label">Trip:</label>
          <div className="trip-buttons">
            <button
              onClick={() => setActiveTripId(null)}
              className={`trip-btn ${activeTripId === null ? 'active' : ''}`}
            >
              All Trips
            </button>
            {trips.map((trip) => (
              <button
                key={trip.id}
                onClick={() => setActiveTripId(trip.id)}
                className={`trip-btn ${activeTripId === trip.id ? 'active' : ''}`}
              >
                {trip.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <StandingsTabs
        activeView={activeView}
        onViewChange={handleViewChange}
        counts={{
          teams: teamStandings.length,
          players: playerStandings.length,
          matches: matchResults.length,
        }}
      />

      {/* Content */}
      <main className="standings-content">
        {activeView === 'teams' && (
          <section className="teams-section">
            {teamStandings.length === 0 ? (
              <div className="empty-state">
                <p>No team standings yet.</p>
                <Link href="/matches/new" className="cta-link">
                  Create a match
                </Link>
              </div>
            ) : (
              teamStandings.map((standing, idx) => (
                <TeamCard key={standing.teamId} standing={standing} rank={idx + 1} />
              ))
            )}
          </section>
        )}

        {activeView === 'players' && (
          <section className="players-section">
            {playerStandings.length === 0 ? (
              <div className="empty-state">
                <p>No player standings yet.</p>
              </div>
            ) : (
              playerStandings.map((standing, idx) => (
                <PlayerCard key={standing.playerId} standing={standing} rank={idx + 1} />
              ))
            )}
          </section>
        )}

        {activeView === 'matches' && (
          <section className="matches-section">
            {matchResults.length === 0 ? (
              <div className="empty-state">
                <p>No completed matches yet.</p>
                <Link href="/score" className="cta-link">
                  Start scoring
                </Link>
              </div>
            ) : (
              matchResults.map((match) => <MatchResultCard key={match.id} match={match} />)
            )}
          </section>
        )}
      </main>

      {/* Footer CTA */}
      <footer className="standings-footer">
        <Link href="/matches/new" className="new-match-btn">
          + New Match
        </Link>
      </footer>
    </div>
  );
}
