'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTripStore, useScoringStore } from '@/lib/stores';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { uiLogger } from '@/lib/utils/logger';
import {
  ChevronLeft,
  Home,
  Target,
  Users,
  Trophy,
  MoreHorizontal,
  Tv,
  RefreshCw,
  Maximize2,
  Volume2,
  VolumeX,
  CalendarDays,
} from 'lucide-react';
import { PageSkeleton, LiveMatchCardSkeleton } from '@/components/ui';
import type { Match, Player } from '@/lib/types/models';
import type { MatchState } from '@/lib/types/computed';

/**
 * LIVE PAGE — Jumbotron View
 *
 * TV-optimized view for displaying all matches in real-time
 * Perfect for the clubhouse or 19th hole
 */
export default function LivePage() {
  const router = useRouter();
  const { currentTrip, players, getActiveSession } = useTripStore();
  const { matchStates, loadSessionMatches } = useScoringStore();
  const [, setIsFullscreen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  const activeSession = getActiveSession();

  // Load matches for active session
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

  useEffect(() => {
    if (!currentTrip) {
      router.push('/');
    }
  }, [currentTrip, router]);

  useEffect(() => {
    if (activeSession) {
      loadSessionMatches(activeSession.id);
    }
  }, [activeSession, loadSessionMatches]);

  // Auto-refresh every 30 seconds (only when tab is visible for battery optimization)
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    const startPolling = () => {
      if (interval) return;
      interval = setInterval(() => {
        if (activeSession && document.visibilityState === 'visible') {
          loadSessionMatches(activeSession.id);
          setLastUpdate(new Date());
        }
      }, 30000);
    };

    const stopPolling = () => {
      if (interval) {
        clearInterval(interval);
        interval = null;
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Refresh immediately when tab becomes visible
        if (activeSession) {
          loadSessionMatches(activeSession.id);
          setLastUpdate(new Date());
        }
        startPolling();
      } else {
        stopPolling();
      }
    };

    // Start polling if visible
    if (document.visibilityState === 'visible') {
      startPolling();
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [activeSession, loadSessionMatches]);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (error) {
      // Fullscreen may not be supported or user denied permission
      uiLogger.warn('Fullscreen toggle failed:', error);
    }
  };

  const getPlayer = (id: string): Player | undefined => {
    return players.find(p => p.id === id);
  };

  const getMatchState = (matchId: string): MatchState | undefined => {
    return matchStates.get(matchId);
  };

  // Check if matches are still loading
  const isLoadingMatches = matches === undefined;

  if (!currentTrip) {
    return (
      <PageSkeleton>
        <div className="grid gap-4 mt-4">
          <LiveMatchCardSkeleton />
          <LiveMatchCardSkeleton />
          <LiveMatchCardSkeleton />
        </div>
      </PageSkeleton>
    );
  }

  return (
    <div
      className="min-h-screen pb-nav page-premium-enter bg-background text-foreground"
    >
      {/* Premium Header */}
      <header className="header-premium bg-transparent border-b border-border">
        <div className="container-editorial flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="p-2 -ml-2 rounded-lg hover:bg-muted transition-colors bg-transparent border-none cursor-pointer"
              aria-label="Back"
            >
              <ChevronLeft size={22} />
            </button>
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-md bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center shadow-lg"
              >
                <Tv size={16} className="text-white" />
              </div>
              <div>
                <span className="type-overline text-muted-foreground tracking-wider">Live Scores</span>
                <p className="text-sm text-muted-foreground">{currentTrip.name}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-2 rounded-lg hover:bg-muted transition-colors bg-transparent border-none cursor-pointer"
              aria-label={soundEnabled ? 'Mute' : 'Unmute'}
            >
              {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
            </button>
            <button
              onClick={toggleFullscreen}
              className="p-2 rounded-lg hover:bg-muted transition-colors bg-transparent border-none cursor-pointer"
              aria-label="Toggle fullscreen"
            >
              <Maximize2 size={20} />
            </button>
            <button
              onClick={() => {
                if (activeSession) loadSessionMatches(activeSession.id);
                setLastUpdate(new Date());
              }}
              className="p-2 rounded-lg hover:bg-muted transition-colors bg-transparent border-none cursor-pointer"
              aria-label="Refresh"
            >
              <RefreshCw size={20} />
            </button>
          </div>
        </div>
      </header>

      <main className="container-editorial py-6">
        {/* Session Info */}
        {activeSession && (
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">{activeSession.name}</h1>
            <p className="text-muted-foreground">
              Last updated: {lastUpdate.toLocaleTimeString()}
            </p>
          </div>
        )}

        {/* Matches Grid */}
        {isLoadingMatches ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-40 rounded-xl bg-muted/50" />
            ))}
          </div>
        ) : matches && matches.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {matches.map((match) => {
              const state = getMatchState(match.id);
              return (
                <LiveMatchCard
                  key={match.id}
                  match={match}
                  state={state}
                  getPlayer={getPlayer}
                />
              );
            })}
          </div>
        ) : !isLoadingMatches && (
          <div className="text-center py-20 text-muted-foreground">
            <Tv size={48} className="mx-auto mb-4 opacity-50" />
            <p className="text-xl">No live matches</p>
            <p className="text-sm mt-2">Start a session to see live scores here</p>
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="nav-premium bottom-nav bg-background/95 backdrop-blur-sm border-t border-border">
        <Link href="/" className="nav-item text-muted-foreground hover:text-foreground">
          <Home size={22} strokeWidth={1.75} />
          <span>Home</span>
        </Link>
        <Link href="/schedule" className="nav-item text-muted-foreground hover:text-foreground">
          <CalendarDays size={22} strokeWidth={1.75} />
          <span>Schedule</span>
        </Link>
        <Link href="/score" className="nav-item text-muted-foreground hover:text-foreground">
          <Target size={22} strokeWidth={1.75} />
          <span>Score</span>
        </Link>
        <Link href="/matchups" className="nav-item text-muted-foreground hover:text-foreground">
          <Users size={22} strokeWidth={1.75} />
          <span>Matches</span>
        </Link>
        <Link href="/standings" className="nav-item text-muted-foreground hover:text-foreground">
          <Trophy size={22} strokeWidth={1.75} />
          <span>Standings</span>
        </Link>
        <Link href="/more" className="nav-item text-muted-foreground hover:text-foreground">
          <MoreHorizontal size={22} strokeWidth={1.75} />
          <span>More</span>
        </Link>
      </nav>
    </div>
  );
}

/* Live Match Card Component */
interface LiveMatchCardProps {
  match: Match;
  state?: MatchState;
  getPlayer: (id: string) => Player | undefined;
}

function LiveMatchCard({ match, state, getPlayer }: LiveMatchCardProps) {
  const teamAPlayers = match.teamAPlayerIds.map(id => getPlayer(id)).filter(Boolean) as Player[];
  const teamBPlayers = match.teamBPlayerIds.map(id => getPlayer(id)).filter(Boolean) as Player[];

  const formatPlayerNames = (players: Player[]) => {
    if (players.length === 0) return 'TBD';
    if (players.length === 1) return players[0].lastName;
    return players.map(p => p.lastName).join(' / ');
  };

  const isTeamAWinning = state ? state.currentScore > 0 : false;
  const isTeamBWinning = state ? state.currentScore < 0 : false;
  const isHalved = state?.currentScore === 0;

  const getStatusText = () => {
    if (!state) return 'Not Started';
    if (state.status === 'completed') {
      if (state.winningTeam === 'halved') return 'Halved';
      return state.displayScore;
    }
    if (state.holesPlayed === 0) return 'Not Started';
    return `Thru ${state.holesPlayed}`;
  };

  const getScoreDisplay = () => {
    if (!state || state.holesPlayed === 0) return 'AS';
    if (state.currentScore === 0) return 'AS';
    const absScore = Math.abs(state.currentScore);
    return `${absScore} UP`;
  };

  return (
    <div
      className="rounded-2xl overflow-hidden bg-card border border-border"
    >
      {/* Match Header */}
      <div
        className="px-4 py-2 flex items-center justify-between bg-muted/50"
      >
        <span className="text-sm text-muted-foreground">Match {match.matchOrder}</span>
        <span
          className={`text-xs px-2 py-1 rounded-full ${state?.status === 'inProgress'
            ? 'bg-red-500/20 text-red-500'
            : state?.status === 'completed'
              ? 'bg-green-500/20 text-green-500'
              : 'bg-muted text-muted-foreground'
            }`}
        >
          {getStatusText()}
        </span>
      </div>

      {/* Teams */}
      <div className="p-4">
        {/* Team A */}
        <div
          className={`flex items-center justify-between py-3 px-4 rounded-lg mb-2 transition-all ${isTeamAWinning ? 'bg-blue-500/20' : ''
            }`}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-3 h-3 rounded-full"
              style={{ background: 'var(--team-usa)' }}
            />
            <span className={`font-medium ${isTeamAWinning ? 'text-foreground' : 'text-muted-foreground'}`}>
              {formatPlayerNames(teamAPlayers)}
            </span>
          </div>
          {isTeamAWinning && (
            <span className="text-lg font-bold text-blue-400">
              {getScoreDisplay()}
            </span>
          )}
        </div>

        {/* Team B */}
        <div
          className={`flex items-center justify-between py-3 px-4 rounded-lg transition-all ${isTeamBWinning ? 'bg-yellow-500/20' : ''
            }`}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-3 h-3 rounded-full"
              style={{ background: 'var(--team-europe)' }}
            />
            <span className={`font-medium ${isTeamBWinning ? 'text-foreground' : 'text-muted-foreground'}`}>
              {formatPlayerNames(teamBPlayers)}
            </span>
          </div>
          {isTeamBWinning && (
            <span className="text-lg font-bold text-yellow-400">
              {getScoreDisplay()}
            </span>
          )}
        </div>

        {/* Halved indicator */}
        {isHalved && state && state.holesPlayed > 0 && (
          <div className="text-center mt-2">
            <span className="text-sm text-muted-foreground">All Square</span>
          </div>
        )}
      </div>

      {/* Hole Progress */}
      {state && state.status === 'inProgress' && (
        <div className="px-4 pb-4">
          <div className="flex gap-1">
            {Array.from({ length: 18 }, (_, i) => {
              const holeNum = i + 1;
              const isPlayed = holeNum <= state.holesPlayed;
              const isCurrent = holeNum === state.holesPlayed + 1;
              return (
                <div
                  key={i}
                  className={`h-1 flex-1 rounded-full transition-all ${isCurrent
                    ? 'bg-green-500 animate-pulse'
                    : isPlayed
                      ? 'bg-foreground/40'
                      : 'bg-muted'
                    }`}
                />
              );
            })}
          </div>
          <p className="text-xs text-center mt-2 text-muted-foreground">
            Hole {state.holesPlayed + 1} of 18
          </p>
        </div>
      )}
    </div>
  );
}
