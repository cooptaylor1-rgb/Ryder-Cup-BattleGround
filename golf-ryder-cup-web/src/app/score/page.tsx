'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { useTripStore, useScoringStore } from '@/lib/stores';
import { calculateMatchState } from '@/lib/services/scoringEngine';
import { formatPlayerName } from '@/lib/utils';
import { ChevronRight, ChevronLeft, Home, Target, Users, Trophy, MoreHorizontal } from 'lucide-react';
import type { MatchState } from '@/lib/types/computed';
import type { Player } from '@/lib/types/models';

/**
 * SCORE PAGE - Match List
 *
 * Design: Editorial typography, scores as sacred numbers
 * Clean match rows - no cards, dividers carry structure
 */

export default function ScorePage() {
  const router = useRouter();
  const { currentTrip, sessions, players, teams, teamMembers } = useTripStore();
  const { selectMatch } = useScoringStore();

  useEffect(() => {
    if (!currentTrip) {
      router.push('/');
    }
  }, [currentTrip, router]);

  const activeSession = sessions.find(s => s.status === 'inProgress') ||
    sessions.find(s => s.status === 'scheduled');

  const matches = useLiveQuery(
    async () => {
      if (!activeSession) return [];
      return db.matches
        .where('sessionId')
        .equals(activeSession.id)
        .sortBy('matchNumber');
    },
    [activeSession?.id],
    []
  );

  const holeResults = useLiveQuery(
    async () => {
      if (!matches || matches.length === 0) return [];
      const matchIds = matches.map(m => m.id);
      return db.holeResults
        .where('matchId')
        .anyOf(matchIds)
        .toArray();
    },
    [matches],
    []
  );

  const matchStates: MatchState[] = matches.map(match => {
    const results = holeResults.filter(r => r.matchId === match.id);
    return calculateMatchState(match, results);
  });

  const getMatchPlayers = (playerIds: string[]) => {
    return playerIds
      .map(id => players.find(p => p.id === id))
      .filter(Boolean) as typeof players;
  };

  const handleMatchSelect = async (matchId: string) => {
    await selectMatch(matchId);
    router.push(`/score/${matchId}`);
  };

  const isLoading = matches === undefined || holeResults === undefined;

  if (!currentTrip) return null;

  return (
    <div className="min-h-screen pb-nav" style={{ background: 'var(--canvas)' }}>
      {/* Header */}
      <header className="header">
        <div className="container-editorial flex items-center gap-3">
          <button onClick={() => router.back()} className="nav-item p-1" aria-label="Back">
            <ChevronLeft size={20} />
          </button>
          <div>
            <span className="type-overline">Score</span>
            <p className="type-meta truncate" style={{ marginTop: '2px' }}>{currentTrip.name}</p>
          </div>
        </div>
      </header>

      <main className="container-editorial">
        {/* Session Header */}
        {activeSession && (
          <section className="section" style={{ paddingTop: 'var(--space-6)' }}>
            <p className="type-meta" style={{ color: 'var(--masters)' }}>
              Session {activeSession.sessionNumber}
            </p>
            <h1 className="type-headline capitalize" style={{ marginTop: 'var(--space-1)' }}>
              {activeSession.sessionType}
            </h1>
            <p className="type-meta" style={{ marginTop: 'var(--space-2)' }}>
              {activeSession.status === 'inProgress' ? 'In Progress' : 
               activeSession.status === 'completed' ? 'Complete' : 'Scheduled'}
            </p>
          </section>
        )}

        <hr className="divider" />

        {/* Matches */}
        <section className="section">
          <h2 className="type-overline" style={{ marginBottom: 'var(--space-4)' }}>
            Matches
          </h2>

          {isLoading ? (
            <p className="type-meta" style={{ textAlign: 'center', padding: 'var(--space-8) 0' }}>
              Loading…
            </p>
          ) : matchStates.length > 0 ? (
            <div>
              {matchStates.map((matchState, index) => (
                <MatchRow
                  key={matchState.match.id}
                  matchState={matchState}
                  matchNumber={index + 1}
                  teamAPlayers={getMatchPlayers(matchState.match.teamAPlayerIds)}
                  teamBPlayers={getMatchPlayers(matchState.match.teamBPlayerIds)}
                  onClick={() => handleMatchSelect(matchState.match.id)}
                />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <Target size={32} style={{ color: 'var(--ink-tertiary)', marginBottom: 'var(--space-4)' }} />
              <p className="empty-state-title">No matches scheduled</p>
              <p className="empty-state-text">Set up matchups to start scoring</p>
              <Link href="/matchups" className="btn btn-primary">
                Set Up Matches
              </Link>
            </div>
          )}
        </section>

        {/* Session Selector */}
        {sessions.length > 1 && (
          <>
            <hr className="divider" />
            <section className="section">
              <h2 className="type-overline" style={{ marginBottom: 'var(--space-3)' }}>
                Sessions
              </h2>
              <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
                {sessions.map(session => (
                  <button
                    key={session.id}
                    className={session.id === activeSession?.id ? 'btn btn-primary' : 'btn btn-secondary'}
                    style={{ whiteSpace: 'nowrap' }}
                  >
                    Session {session.sessionNumber}
                  </button>
                ))}
              </div>
            </section>
          </>
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="bottom-nav">
        <Link href="/" className="nav-item">
          <Home size={20} />
          <span>Home</span>
        </Link>
        <Link href="/score" className="nav-item nav-item-active">
          <Target size={20} />
          <span>Score</span>
        </Link>
        <Link href="/matchups" className="nav-item">
          <Users size={20} />
          <span>Matches</span>
        </Link>
        <Link href="/standings" className="nav-item">
          <Trophy size={20} />
          <span>Standings</span>
        </Link>
        <Link href="/more" className="nav-item">
          <MoreHorizontal size={20} />
          <span>More</span>
        </Link>
      </nav>
    </div>
  );
}

/* ============================================
   Match Row - Typography-driven match display
   ============================================ */
interface MatchRowProps {
  matchState: MatchState;
  matchNumber: number;
  teamAPlayers: Player[];
  teamBPlayers: Player[];
  onClick: () => void;
}

function MatchRow({ matchState, matchNumber, teamAPlayers, teamBPlayers, onClick }: MatchRowProps) {
  const { currentScore, holesPlayed, status, displayScore } = matchState;

  const formatPlayers = (playerList: Player[]) => {
    if (playerList.length === 0) return '—';
    return playerList
      .map(p => formatPlayerName(p.firstName, p.lastName, 'short'))
      .join(' / ');
  };

  return (
    <button onClick={onClick} className="match-row w-full text-left">
      {/* Match number */}
      <span className="type-meta" style={{ width: '24px', color: 'var(--ink-tertiary)' }}>
        {matchNumber}
      </span>

      {/* Players */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span style={{ color: 'var(--team-usa)' }}>●</span>
          <span className="truncate" style={{ fontWeight: currentScore > 0 ? 500 : 400 }}>
            {formatPlayers(teamAPlayers)}
          </span>
        </div>
        <div className="flex items-center gap-2" style={{ marginTop: 'var(--space-1)' }}>
          <span style={{ color: 'var(--team-europe)' }}>●</span>
          <span className="truncate" style={{ fontWeight: currentScore < 0 ? 500 : 400 }}>
            {formatPlayers(teamBPlayers)}
          </span>
        </div>
      </div>

      {/* Score */}
      <div className="text-right" style={{ minWidth: '60px' }}>
        <span 
          className="score-medium"
          style={{
            color: currentScore > 0 ? 'var(--team-usa)' : 
                   currentScore < 0 ? 'var(--team-europe)' : 'var(--ink-secondary)'
          }}
        >
          {displayScore}
        </span>
        {holesPlayed > 0 && (
          <p className="type-meta" style={{ marginTop: '2px' }}>
            {status === 'completed' ? 'Final' : `thru ${holesPlayed}`}
          </p>
        )}
        {status === 'scheduled' && holesPlayed === 0 && (
          <p className="type-meta">Not started</p>
        )}
      </div>

      <ChevronRight size={18} style={{ color: 'var(--ink-tertiary)', marginLeft: 'var(--space-2)' }} />
    </button>
  );
}
