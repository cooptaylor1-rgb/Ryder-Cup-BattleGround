/**
 * Your Match Card Component (P0-1)
 *
 * Hero card showing the current user's match on the Home page.
 * Provides one-tap access to scoring - eliminates 3+ navigation steps.
 *
 * Features:
 * - Shows match details (opponent, tee time, format)
 * - Countdown to tee time if scheduled
 * - Live score if in progress
 * - Prominent CTA to enter scoring
 */

'use client';

import { useMemo } from 'react';
import { Target, Clock, ChevronRight, Zap } from 'lucide-react';
import type { Match, Player, RyderCupSession } from '@/lib/types/models';
import type { MatchState } from '@/lib/types/computed';
import { cn, formatPlayerName } from '@/lib/utils';

interface YourMatchCardProps {
  match: Match;
  matchState?: MatchState;
  session: RyderCupSession;
  currentUserPlayer: Player;
  allPlayers: Player[];
  teamAName?: string;
  teamBName?: string;
  onEnterScore: () => void;
}

export function YourMatchCard({
  match,
  matchState,
  session,
  currentUserPlayer,
  allPlayers,
  teamAName = 'USA',
  teamBName = 'Europe',
  onEnterScore,
}: YourMatchCardProps) {
  // Determine which team the user is on
  const userTeam = useMemo<undefined | 'A' | 'B'>(() => {
    if (match.teamAPlayerIds.includes(currentUserPlayer.id)) return 'A';
    if (match.teamBPlayerIds.includes(currentUserPlayer.id)) return 'B';
    return undefined;
  }, [match, currentUserPlayer]);

  const resolvedUserTeamName =
    userTeam === 'A' ? teamAName : userTeam === 'B' ? teamBName : 'Teams TBD';
  const resolvedOpponentTeamName =
    userTeam === 'A' ? teamBName : userTeam === 'B' ? teamAName : 'Teams TBD';

  const teamTextClass = useMemo(() => {
    if (userTeam === 'A') return 'text-[var(--team-usa)]';
    if (userTeam === 'B') return 'text-[var(--team-europe)]';
    return 'text-[var(--ink-secondary)]';
  }, [userTeam]);

  const opponentTeamTextClass = useMemo(() => {
    if (userTeam === 'A') return 'text-[var(--team-europe)]';
    if (userTeam === 'B') return 'text-[var(--team-usa)]';
    return 'text-[var(--ink-secondary)]';
  }, [userTeam]);

  // Get partner and opponents
  const { partner, opponents } = useMemo(() => {
    const getPlayer = (id: string) => allPlayers.find((p) => p.id === id);

    if (userTeam === 'A') {
      const partnerIds = match.teamAPlayerIds.filter((id) => id !== currentUserPlayer.id);
      const partner = partnerIds.length > 0 ? getPlayer(partnerIds[0]) : null;
      const opponents = match.teamBPlayerIds.map(getPlayer).filter(Boolean) as Player[];
      return { partner, opponents };
    }

    if (userTeam === 'B') {
      const partnerIds = match.teamBPlayerIds.filter((id) => id !== currentUserPlayer.id);
      const partner = partnerIds.length > 0 ? getPlayer(partnerIds[0]) : null;
      const opponents = match.teamAPlayerIds.map(getPlayer).filter(Boolean) as Player[];
      return { partner, opponents };
    }

    return { partner: null, opponents: [] };
  }, [match, currentUserPlayer, allPlayers, userTeam]);

  // Calculate time until tee time
  const teeTimeInfo = useMemo(() => {
    if (!session.scheduledDate) return null;

    const sessionDate = new Date(session.scheduledDate);
    const now = new Date();

    // Estimate tee time based on session time slot and match order
    const baseHour = session.timeSlot === 'AM' ? 8 : 13;
    const intervalMinutes = session.sessionType === 'singles' ? 8 : 10;
    sessionDate.setHours(baseHour, (match.matchOrder - 1) * intervalMinutes, 0, 0);

    const diffMs = sessionDate.getTime() - now.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 0) {
      return { text: 'Started', isPast: true };
    }

    if (diffMins < 60) {
      return { text: `in ${diffMins} min`, isPast: false };
    }

    if (diffMins < 1440) {
      const hours = Math.floor(diffMins / 60);
      return { text: `in ${hours}h ${diffMins % 60}m`, isPast: false };
    }

    return {
      text: sessionDate.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      }),
      isPast: false,
    };
  }, [session, match.matchOrder]);

  const isLive = match.status === 'inProgress';
  const formatLabel = session.sessionType.charAt(0).toUpperCase() + session.sessionType.slice(1);

  const liveScoreClass = useMemo(() => {
    if (!matchState) return 'text-[var(--ink-secondary)]';

    // Positive currentScore means Team A is leading.
    if (matchState.currentScore === 0) return 'text-[var(--ink-secondary)]';

    const isTeamALeading = matchState.currentScore > 0;
    const userIsTeamA = userTeam === 'A';
    const userIsTeamB = userTeam === 'B';

    if (!userIsTeamA && !userIsTeamB) return 'text-[var(--ink-secondary)]';

    const userLeading = (isTeamALeading && userIsTeamA) || (!isTeamALeading && userIsTeamB);
    return userLeading ? teamTextClass : opponentTeamTextClass;
  }, [matchState, userTeam, teamTextClass, opponentTeamTextClass]);

  return (
    <button
      onClick={onEnterScore}
      className={cn(
        'w-full text-left rounded-[var(--radius-xl)] transition-all card-premium press-scale',
        'p-[var(--space-5)]',
        isLive
          ? 'border-2 border-[var(--masters)] bg-[linear-gradient(135deg,rgba(var(--masters-rgb),0.10)_0%,var(--canvas-raised)_100%)] shadow-[0_4px_20px_rgba(0,103,71,0.15)]'
          : 'border border-[var(--rule)] bg-[var(--canvas-raised)]'
      )}
    >
      {/* Header: Badge + Status */}
      <div className="flex items-center justify-between mb-[var(--space-4)]">
        <div className="flex items-center gap-[var(--space-2)]">
          <div
            className={cn(
              'flex items-center gap-[var(--space-2)] px-[var(--space-3)] py-[var(--space-2)] rounded-full',
              'text-[12px] font-bold uppercase tracking-[0.05em]',
              isLive ? 'bg-[var(--masters)] text-[var(--canvas)]' : 'bg-[var(--canvas-sunken)] text-[var(--ink-secondary)]'
            )}
          >
            <Target size={14} />
            Your Match
          </div>

          {isLive && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide bg-[color:var(--masters)]/15 text-[var(--masters)]">
              Live
            </span>
          )}
        </div>

        {/* Time/Status */}
        {!isLive && teeTimeInfo && (
          <div
            className={cn(
              'flex items-center gap-[var(--space-1)] text-[length:var(--text-sm)]',
              teeTimeInfo.isPast ? 'text-[var(--warning)]' : 'text-[var(--ink-secondary)]'
            )}
          >
            <Clock size={14} />
            <span>{teeTimeInfo.text}</span>
          </div>
        )}
      </div>

      {/* Match Info */}
      <div className="mb-[var(--space-4)]">
        <div className="flex items-center gap-[var(--space-2)] mb-[var(--space-2)]">
          <span className="type-micro text-[var(--ink-tertiary)] uppercase tracking-[0.1em]">
            Match {match.matchOrder} • {formatLabel}
          </span>
        </div>

        {/* Players Display */}
        <div className="flex items-center gap-[var(--space-4)]">
          {/* You (and partner) */}
          <div className="flex-1">
            <p className="font-bold text-[var(--ink)] mb-1 text-[16px]">
              You{partner && ` & ${formatPlayerName(partner.firstName, partner.lastName, 'short')}`}
            </p>
            <p className={cn('text-[13px] font-semibold', teamTextClass)}>{resolvedUserTeamName}</p>
          </div>

          {/* VS */}
          <div className="px-[var(--space-4)] py-[var(--space-2)] bg-[var(--canvas-sunken)] rounded-[var(--radius-lg)] text-[var(--ink-secondary)] font-bold text-[13px]">
            VS
          </div>

          {/* Opponents */}
          <div className="flex-1 text-right">
            <p className="font-bold text-[var(--ink)] mb-1 text-[16px]">
              {opponents.length > 0
                ? opponents
                    .map((o) => formatPlayerName(o.firstName, o.lastName, 'short'))
                    .join(' & ')
                : 'TBD'}
            </p>
            <p className={cn('text-[13px] font-semibold', opponentTeamTextClass)}>
              {resolvedOpponentTeamName}
            </p>
          </div>
        </div>
      </div>

      {/* Live Score (if in progress) */}
      {isLive && matchState && (
        <div className="p-[var(--space-3)] bg-[var(--canvas-sunken)] rounded-[var(--radius-md)] mb-[var(--space-4)] text-center">
          <p className={cn('score-large', liveScoreClass)}>{matchState.displayScore}</p>
          <p className="type-micro text-[var(--ink-tertiary)]">thru {matchState.holesPlayed}</p>
        </div>
      )}

      {/* CTA */}
      <div className="flex items-center justify-center gap-[var(--space-3)] p-[var(--space-4)] bg-[var(--masters)] rounded-[var(--radius-xl)] text-[var(--canvas)] font-bold text-[16px] min-h-[52px] shadow-[0_2px_8px_rgba(0,103,71,0.30)]">
        <Zap size={20} />
        <span>{isLive ? 'Continue Scoring' : 'Enter Score'}</span>
        <ChevronRight size={20} />
      </div>
    </button>
  );
}

export default YourMatchCard;
