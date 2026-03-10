'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useTripStore, useScoringStore } from '@/lib/stores';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { uiLogger } from '@/lib/utils/logger';
import { useRealtimeScoring } from '@/lib/hooks/useRealtimeScoring';
import { EmptyStatePremium } from '@/components/ui';
import { PageHeader } from '@/components/layout';
import {
  Tv,
  RefreshCw,
  Maximize2,
  Volume2,
  VolumeX,
  Wifi,
  WifiOff,
  Clock3,
  Flag,
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
  const [isFullscreen, setIsFullscreen] = useState(false);
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

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
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
  const controlButtonClass =
    'min-h-11 min-w-11 p-2.5 rounded-[1rem] transition-all bg-[rgba(255,255,255,0.74)] border border-[var(--rule)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]';

  if (!currentTrip) {
    return (
      <div className="min-h-screen page-premium-enter texture-grain bg-[var(--canvas)]">
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
      </div>
    );
  }

  return (
    <div className="min-h-screen page-premium-enter texture-grain bg-[var(--canvas)]">
      <PageHeader
        title="Live Scores"
        subtitle={currentTrip.name}
        icon={<Tv size={16} className="text-[var(--color-accent)]" />}
        onBack={() => router.back()}
      />

      <main className="container-editorial py-6">
        {/* Session Info */}
        {activeSession && (
          <section className="mb-[var(--space-6)] overflow-hidden rounded-[2rem] border border-[var(--rule)] bg-[linear-gradient(180deg,rgba(255,255,255,0.84),rgba(248,244,237,0.94))] shadow-[0_22px_48px_rgba(46,34,18,0.08)]">
            <div className="border-b border-[color:var(--rule)]/80 px-[var(--space-5)] py-[var(--space-5)]">
              <div className="flex items-start justify-between gap-[var(--space-4)]">
                <div className="min-w-0">
                  <p className="type-overline tracking-[0.18em] text-[var(--ink-tertiary)]">
                    Live Jumbotron
                  </p>
                  <h1 className="mt-[var(--space-2)] font-serif text-[clamp(2rem,7vw,3rem)] italic leading-[1.02] text-[var(--ink)]">
                    {activeSession.name}
                  </h1>
                  <p className="mt-[var(--space-3)] type-body-sm text-[var(--ink-secondary)]" aria-live="polite">
                    {isConnected
                      ? `Connected and listening. Last update ${lastUpdate.toLocaleTimeString()}.`
                      : `Using cached data. Last update ${lastUpdate.toLocaleTimeString()}.`}
                  </p>
                </div>

                <LiveStatusPill
                  connected={isConnected}
                  label={isConnected ? 'Live Feed' : 'Offline View'}
                />
              </div>

              <div className="mt-[var(--space-4)] grid grid-cols-2 gap-[var(--space-3)] md:grid-cols-4">
                <LiveFactCard icon={<Flag size={14} strokeWidth={1.7} />} label="Matches" value={matches?.length ?? 0} />
                <LiveFactCard icon={<Clock3 size={14} strokeWidth={1.7} />} label="Updated" value={lastUpdate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} valueClassName="font-sans text-[0.95rem] not-italic" />
                <LiveFactCard icon={soundEnabled ? <Volume2 size={14} strokeWidth={1.7} /> : <VolumeX size={14} strokeWidth={1.7} />} label="Sound" value={soundEnabled ? 'On' : 'Off'} valueClassName="font-sans text-[0.95rem] not-italic" />
                <LiveFactCard icon={<Maximize2 size={14} strokeWidth={1.7} />} label="View" value={isFullscreen ? 'Fullscreen' : 'Windowed'} valueClassName="font-sans text-[0.95rem] not-italic" />
              </div>
            </div>

            <div className="flex flex-wrap gap-[var(--space-3)] px-[var(--space-5)] py-[var(--space-4)]">
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={controlButtonClass}
                aria-label={soundEnabled ? 'Mute live update sounds' : 'Enable live update sounds'}
                aria-pressed={soundEnabled}
                title={soundEnabled ? 'Mute live update sounds' : 'Enable live update sounds'}
              >
                {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
              </button>
              <button
                onClick={toggleFullscreen}
                className={controlButtonClass}
                aria-label="Toggle fullscreen"
                title="Toggle fullscreen"
              >
                <Maximize2 size={18} />
              </button>
              <button
                onClick={() => {
                  if (activeSession) loadSessionMatches(activeSession.id);
                  setLastUpdate(new Date());
                }}
                className={controlButtonClass}
                aria-label="Refresh live scores"
                title="Refresh live scores"
              >
                <RefreshCw size={18} />
              </button>
            </div>
          </section>
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
                  <div key={i} className="h-56 rounded-[1.5rem] bg-[var(--surface-elevated)] border border-[var(--rule)]" />
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
  const teamAPlayers = match.teamAPlayerIds.map((id) => getPlayer(id)).filter(Boolean) as Player[];
  const teamBPlayers = match.teamBPlayerIds.map((id) => getPlayer(id)).filter(Boolean) as Player[];

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

  const statusText = getStatusText();
  const scoreDisplay = getScoreDisplay();

  return (
    <div
      className={`overflow-hidden rounded-[1.75rem] border bg-[linear-gradient(180deg,rgba(255,255,255,0.86),rgba(248,244,237,0.94))] transition-all duration-500 ${
        isFlashing
          ? 'border-[var(--masters)] shadow-[0_18px_36px_rgba(22,101,52,0.2)] scale-[1.02]'
          : 'border-[var(--rule)] shadow-[0_12px_30px_rgba(46,34,18,0.06)]'
      }`}
    >
      {/* Match Header */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-[var(--rule)] bg-[rgba(255,255,255,0.7)]">
        <span className="type-overline text-[var(--ink-tertiary)]">Match {match.matchOrder}</span>
        <span
          className={
            `text-xs px-2.5 py-1 rounded-full border font-medium ` +
            (state?.status === 'inProgress'
              ? 'bg-[color:var(--error)]/10 text-[var(--error)] border-[color:var(--error)]/25'
              : state?.status === 'completed'
                ? 'bg-[color:var(--success)]/10 text-[var(--success)] border-[color:var(--success)]/25'
                : 'bg-[var(--canvas)] text-[var(--ink-tertiary)] border-[var(--rule)]')
          }
        >
          {state?.status === 'inProgress' && (
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--error)] mr-1 animate-pulse" />
          )}
          {statusText}
        </span>
      </div>

      <div className="px-4 pt-4">
        <div className="rounded-[1.25rem] border border-[var(--rule)] bg-[rgba(255,255,255,0.72)] px-[var(--space-4)] py-[var(--space-4)] text-center">
          <p className="type-micro uppercase tracking-[0.14em] text-[var(--ink-tertiary)]">
            {state?.status === 'completed' ? 'Final Margin' : 'Current Margin'}
          </p>
          <p className="mt-[var(--space-2)] font-serif text-[2rem] italic leading-none text-[var(--ink)]">
            {scoreDisplay}
          </p>
          <p className="mt-[var(--space-2)] type-caption text-[var(--ink-secondary)]">
            {state?.status === 'completed'
              ? state?.winningTeam === 'halved'
                ? 'Both sides finished level.'
                : 'Result confirmed.'
              : state?.holesPlayed
                ? `Through ${state.holesPlayed} hole${state.holesPlayed === 1 ? '' : 's'}`
                : 'Awaiting the opening hole.'}
          </p>
        </div>
      </div>

      {/* Teams */}
      <div className="p-4">
        {/* Team A */}
        <div
          className={`flex items-center justify-between py-3 px-4 rounded-[1rem] mb-3 transition-all border ${
            isTeamAWinning
              ? 'bg-[color:var(--team-usa)]/12 border-[color:var(--team-usa)]/18'
              : 'bg-[rgba(255,255,255,0.62)] border-[var(--rule)]'
          }`}
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
              {scoreDisplay}
            </span>
          )}
        </div>

        {/* Team B */}
        <div
          className={`flex items-center justify-between py-3 px-4 rounded-[1rem] transition-all border ${
            isTeamBWinning
              ? 'bg-[color:var(--team-europe)]/12 border-[color:var(--team-europe)]/18'
              : 'bg-[rgba(255,255,255,0.62)] border-[var(--rule)]'
          }`}
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
              {scoreDisplay}
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
          <div className="mb-3 flex items-center justify-between">
            <p className="type-micro uppercase tracking-[0.14em] text-[var(--ink-tertiary)]">
              Hole Progress
            </p>
            <p className="type-caption text-[var(--ink-secondary)]">
              Hole {state.holesPlayed + 1} of 18
            </p>
          </div>
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
                      ? 'bg-[color:var(--ink-tertiary)]/40'
                      : 'bg-[var(--surface-elevated)]'
                    }`}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function LiveStatusPill({ connected, label }: { connected: boolean; label: string }) {
  return (
    <div
      className="inline-flex items-center gap-[var(--space-2)] rounded-full border px-[var(--space-3)] py-[var(--space-2)]"
      style={{
        borderColor: connected ? 'rgba(22,163,74,0.2)' : 'var(--rule)',
        background: connected ? 'rgba(22,163,74,0.08)' : 'rgba(255,255,255,0.68)',
      }}
      title={connected ? 'Live — connected' : 'Offline — using cached data'}
    >
      {connected ? (
        <Wifi size={14} className="text-[var(--success)]" />
      ) : (
        <WifiOff size={14} className="text-[var(--ink-tertiary)]" />
      )}
      <span
        className={`text-xs font-medium uppercase tracking-[0.14em] ${
          connected ? 'text-[var(--success)]' : 'text-[var(--ink-tertiary)]'
        }`}
      >
        {label}
      </span>
    </div>
  );
}

function LiveFactCard({
  icon,
  label,
  value,
  valueClassName,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  valueClassName?: string;
}) {
  return (
    <div className="rounded-[1.1rem] border border-[var(--rule)] bg-[rgba(255,255,255,0.68)] px-[var(--space-4)] py-[var(--space-3)]">
      <div className="flex items-center gap-[var(--space-2)] text-[var(--masters)]">
        {icon}
        <p className="type-micro uppercase tracking-[0.14em] text-[var(--ink-tertiary)]">
          {label}
        </p>
      </div>
      <p
        className={`mt-[4px] font-serif text-[1.2rem] italic leading-[1.2] text-[var(--ink)] ${
          valueClassName ?? ''
        }`}
      >
        {value}
      </p>
    </div>
  );
}
