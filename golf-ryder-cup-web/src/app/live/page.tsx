'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useTripStore, useScoringStore } from '@/lib/stores';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { uiLogger } from '@/lib/utils/logger';
import { useRealtimeScoring } from '@/lib/hooks/useRealtimeScoring';
import { EmptyStatePremium } from '@/components/ui';
import { BottomNav, PageHeader } from '@/components/layout';
import {
  Tv,
  RefreshCw,
  Maximize2,
  Volume2,
  VolumeX,
  Wifi,
  WifiOff,
} from 'lucide-react';

import type { Match, Player } from '@/lib/types/models';
import type { MatchState } from '@/lib/types/computed';
import type { ScoreUpdate } from '@/lib/services/realtimeSyncService';

/**
 * LIVE PAGE — Jumbotron View
 *
 * TV-optimized view for displaying all matches in real-time.
 * Uses Supabase Realtime for instant score updates — no polling.
 */
export default function LivePage() {
  const router = useRouter();
  const { currentTrip, players, getActiveSession } = useTripStore();
  const { matchStates, loadSessionMatches, refreshMatchState } = useScoringStore();
  const [, setIsFullscreen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  // Track which match just received an update for flash animation
  const [flashMatchId, setFlashMatchId] = useState<string | null>(null);
  const flashTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const activeSession = getActiveSession();

  // Load matches for active session from IndexedDB (reactive)
  const matches = useLiveQuery(
    async () => {
      if (!activeSession) return [];
      return db.matches
        .where('sessionId')
        .equals(activeSession.id)
        .sortBy('matchOrder');
    },
    [activeSession?.id],
    []
  );

  // Initial load of session matches
  useEffect(() => {
    if (activeSession) {
      loadSessionMatches(activeSession.id);
    }
  }, [activeSession, loadSessionMatches]);

  // Handle incoming realtime score updates
  const handleScoreUpdate = useCallback(
    (update: ScoreUpdate) => {
      uiLogger.log(`Live: realtime score update for match ${update.matchId}, hole ${update.holeNumber}`);

      // Refresh the specific match state from DB
      refreshMatchState(update.matchId);
      setLastUpdate(new Date());

      // Flash animation on the card that just updated
      if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
      setFlashMatchId(update.matchId);
      flashTimeoutRef.current = setTimeout(() => setFlashMatchId(null), 2000);

      // Play sound if enabled
      if (soundEnabled) {
        try {
          const audio = new Audio('/sounds/score-tick.mp3');
          audio.volume = 0.3;
          audio.play().catch(() => {});
        } catch {
          // Sound not available
        }
      }
    },
    [refreshMatchState, soundEnabled]
  );

  // Subscribe to trip-level realtime channel
  const { isConnected } = useRealtimeScoring({
    tripId: currentTrip?.id,
    onScoreUpdate: handleScoreUpdate,
    enabled: !!currentTrip,
  });

  // Fallback: refresh when tab becomes visible (covers reconnect scenarios)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && activeSession) {
        loadSessionMatches(activeSession.id);
        setLastUpdate(new Date());
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [activeSession, loadSessionMatches]);

  // Cleanup flash timeout
  useEffect(() => {
    return () => {
      if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
    };
  }, []);

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
      uiLogger.warn('Fullscreen toggle failed:', error);
    }
  };

  const getPlayer = (id: string): Player | undefined => {
    return players.find(p => p.id === id);
  };

  const getMatchState = (matchId: string): MatchState | undefined => {
    return matchStates.get(matchId);
  };

  const isLoadingMatches = matches === undefined;

  if (!currentTrip) {
    return (
      <div className="min-h-screen pb-nav page-premium-enter texture-grain bg-[var(--canvas)]">
        <main className="container-editorial py-12">
          <EmptyStatePremium
            illustration="scorecard"
            title="No trip selected"
            description="Start or select a trip to view the live jumbotron."
            action={{
              label: 'Go Home',
              onClick: () => router.push('/'),
            }}
            secondaryAction={{
              label: 'More',
              onClick: () => router.push('/more'),
            }}
            variant="large"
          />
        </main>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-nav page-premium-enter texture-grain bg-[var(--canvas)]">
      <PageHeader
        title="Live Scores"
        subtitle={currentTrip.name}
        icon={<Tv size={16} className="text-[var(--color-accent)]" />}
        onBack={() => router.back()}
        rightSlot={
          <div className="flex items-center gap-2">
            {/* Connection status indicator */}
            <div
              className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-[var(--surface-card)] border border-[var(--rule)]"
              title={isConnected ? 'Live — connected' : 'Offline — using cached data'}
            >
              {isConnected ? (
                <>
                  <Wifi size={14} className="text-[var(--success)]" />
                  <span className="text-xs text-[var(--success)] font-medium hidden sm:inline">Live</span>
                </>
              ) : (
                <>
                  <WifiOff size={14} className="text-[var(--ink-tertiary)]" />
                  <span className="text-xs text-[var(--ink-tertiary)] hidden sm:inline">Offline</span>
                </>
              )}
            </div>
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-2 rounded-lg transition-colors bg-[var(--surface-card)] border border-[var(--rule)]"
              aria-label={soundEnabled ? 'Mute' : 'Unmute'}
            >
              {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </button>
            <button
              onClick={toggleFullscreen}
              className="p-2 rounded-lg transition-colors bg-[var(--surface-card)] border border-[var(--rule)]"
              aria-label="Toggle fullscreen"
            >
              <Maximize2 size={18} />
            </button>
            <button
              onClick={() => {
                if (activeSession) loadSessionMatches(activeSession.id);
                setLastUpdate(new Date());
              }}
              className="p-2 rounded-lg transition-colors bg-[var(--surface-card)] border border-[var(--rule)]"
              aria-label="Refresh"
            >
              <RefreshCw size={18} />
            </button>
          </div>
        }
      />

      <main className="container-editorial py-6">
        {/* Session Info */}
        {activeSession && (
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">{activeSession.name}</h1>
            <p className="type-caption">
              {isConnected ? (
                <>
                  <span className="inline-block w-2 h-2 rounded-full bg-[var(--success)] mr-1.5 animate-pulse" />
                  Live — last update {lastUpdate.toLocaleTimeString()}
                </>
              ) : (
                <>Last updated: {lastUpdate.toLocaleTimeString()}</>
              )}
            </p>
          </div>
        )}

        {!activeSession ? (
          <div className="max-w-xl mx-auto py-12">
            <EmptyStatePremium
              illustration="scorecard"
              title="No active session"
              description="Once a session is in progress, live matches will appear here automatically."
              action={{
                label: 'View Schedule',
                onClick: () => router.push('/schedule'),
              }}
              secondaryAction={{
                label: 'Go to Matchups',
                onClick: () => router.push('/matchups'),
              }}
              variant="large"
            />
          </div>
        ) : (
          /* Matches Grid */
          <>
            {isLoadingMatches ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-40 rounded-xl bg-[var(--surface-elevated)] border border-[var(--rule)]" />
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
                      isFlashing={flashMatchId === match.id}
                    />
                  );
                })}
              </div>
            ) : (
              <div className="max-w-xl mx-auto py-12">
                <EmptyStatePremium
                  illustration="scorecard"
                  title="No live matches"
                  description="Start a session to see live scores here."
                  action={{
                    label: 'Go to Matchups',
                    onClick: () => router.push('/matchups'),
                  }}
                  secondaryAction={{
                    label: 'View Schedule',
                    onClick: () => router.push('/schedule'),
                  }}
                  variant="large"
                />
              </div>
            )}
          </>
        )}
      </main>

      <BottomNav />
    </div>
  );
}

/* Live Match Card Component */
interface LiveMatchCardProps {
  match: Match;
  state?: MatchState;
  getPlayer: (id: string) => Player | undefined;
  isFlashing?: boolean;
}

function LiveMatchCard({ match, state, getPlayer, isFlashing }: LiveMatchCardProps) {
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
      className={`card rounded-2xl overflow-hidden border bg-[var(--surface-card)] transition-all duration-500 ${
        isFlashing
          ? 'border-[var(--masters)] shadow-lg shadow-[var(--masters)]/20 scale-[1.02]'
          : 'border-[var(--rule)]'
      }`}
    >
      {/* Match Header */}
      <div className="px-4 py-2 flex items-center justify-between bg-[var(--surface)] border-b border-[var(--rule)]">
        <span className="text-sm text-[var(--ink-tertiary)]">Match {match.matchOrder}</span>
        <span
          className={
            `text-xs px-2 py-1 rounded-full border ` +
            (state?.status === 'inProgress'
              ? 'bg-[color:var(--error)]/10 text-[var(--error)] border-[color:var(--error)]/25'
              : state?.status === 'completed'
                ? 'bg-[color:var(--success)]/10 text-[var(--success)] border-[color:var(--success)]/25'
                : 'bg-[var(--surface-card)] text-[var(--ink-tertiary)] border-[var(--rule)]')
          }
        >
          {state?.status === 'inProgress' && (
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--error)] mr-1 animate-pulse" />
          )}
          {getStatusText()}
        </span>
      </div>

      {/* Teams */}
      <div className="p-4">
        {/* Team A */}
        <div
          className={`flex items-center justify-between py-3 px-4 rounded-lg mb-2 transition-all ${isTeamAWinning ? 'bg-[color:var(--team-usa)]/15' : ''}`}
        >
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-[var(--team-usa)]" />
            <span
              className={`font-medium ${
                isTeamAWinning ? 'text-[var(--ink)]' : 'text-[var(--ink-secondary)]'
              }`}
            >
              {formatPlayerNames(teamAPlayers)}
            </span>
          </div>
          {isTeamAWinning && (
            <span className={`text-lg font-bold text-[var(--team-usa)] ${isFlashing ? 'animate-bounce' : ''}`}>
              {getScoreDisplay()}
            </span>
          )}
        </div>

        {/* Team B */}
        <div
          className={`flex items-center justify-between py-3 px-4 rounded-lg transition-all ${isTeamBWinning ? 'bg-[color:var(--team-europe)]/15' : ''}`}
        >
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-[var(--team-europe)]" />
            <span
              className={`font-medium ${
                isTeamBWinning ? 'text-[var(--ink)]' : 'text-[var(--ink-secondary)]'
              }`}
            >
              {formatPlayerNames(teamBPlayers)}
            </span>
          </div>
          {isTeamBWinning && (
            <span className={`text-lg font-bold text-[var(--team-europe)] ${isFlashing ? 'animate-bounce' : ''}`}>
              {getScoreDisplay()}
            </span>
          )}
        </div>

        {/* Halved indicator */}
        {isHalved && state && state.holesPlayed > 0 && (
          <div className="text-center mt-2">
            <span className="text-sm text-[var(--ink-tertiary)]">All Square</span>
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
                    ? 'bg-[var(--masters)] animate-pulse'
                    : isPlayed
                      ? 'bg-[var(--ink-tertiary)]/40'
                      : 'bg-[var(--surface-elevated)]'
                    }`}
                />
              );
            })}
          </div>
          <p className="text-xs text-center mt-2 text-[var(--ink-tertiary)]">
            Hole {state.holesPlayed + 1} of 18
          </p>
        </div>
      )}
    </div>
  );
}
