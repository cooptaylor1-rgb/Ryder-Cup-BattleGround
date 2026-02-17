'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTripStore, useAuthStore } from '@/lib/stores';
import { EmptyStatePremium, ErrorEmpty, PageLoadingSkeleton } from '@/components/ui';
import { db } from '@/lib/db';
import { tripLogger } from '@/lib/utils/logger';
import { cn, getCountdown, getCountdownColor, isToday } from '@/lib/utils';
import {
  CalendarDays,
  ChevronRight,
  Calendar,
  Sunrise,
  Sunset,
  Flag,
  User,
  AlertCircle,
  Clock,
} from 'lucide-react';
import type { Match } from '@/lib/types/models';
import { SessionTypeDisplay } from '@/lib/types/models';
import { BottomNav, PageHeader } from '@/components/layout';

/**
 * SCHEDULE PAGE — Personal & Trip Schedule
 *
 * Shows:
 * - User's personal tee times based on their matches
 * - Overall trip schedule by day with sessions
 * - Quick access to match details
 */

interface ScheduleEntry {
  id: string;
  type: 'session' | 'teeTime' | 'event';
  title: string;
  subtitle?: string;
  time?: string;
  date: string;
  /** Full datetime for countdown calculation */
  datetime?: Date;
  sessionType?: string;
  matchId?: string;
  isUserMatch?: boolean;
  players?: string[];
  status?: 'upcoming' | 'inProgress' | 'completed';
}

interface DaySchedule {
  date: string;
  dayName: string;
  dayNumber: number;
  entries: ScheduleEntry[];
}

export default function SchedulePage() {
  const router = useRouter();
  const {
    currentTrip,
    sessions,
    players,
    teams: _teams,
    teamMembers: _teamMembers,
  } = useTripStore();
  const { currentUser, isAuthenticated } = useAuthStore();
  const [matches, setMatches] = useState<Match[]>([]);
  const [selectedTab, setSelectedTab] = useState<'my' | 'all'>('my');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadMatches = useCallback(async () => {
    if (!isAuthenticated) {
      setMatches([]);
      setIsLoading(false);
      setLoadError(null);
      return;
    }

    if (!currentTrip) {
      setIsLoading(false);
      setLoadError(null);
      return;
    }

    setIsLoading(true);
    setLoadError(null);

    try {
      const sessionIds = sessions.map((s) => s.id);
      if (sessionIds.length === 0) {
        setMatches([]);
        return;
      }

      const allMatches = await db.matches.where('sessionId').anyOf(sessionIds).toArray();
      setMatches(allMatches);
    } catch (error) {
      tripLogger.error('Error loading matches:', error);
      setLoadError('We couldn\'t load matches right now.');
    } finally {
      setIsLoading(false);
    }
  }, [currentTrip, sessions, isAuthenticated]);

  // Load matches from database
  useEffect(() => {
    loadMatches();
  }, [loadMatches]);

  // Find the player record that matches current user
  const currentUserPlayer = useMemo(() => {
    if (!isAuthenticated || !currentUser) return undefined;

    // Try to match by email first, then by name
    return players.find((p) => {
      const playerEmail = p.email?.toLowerCase();
      const userEmail = currentUser.email?.toLowerCase();
      if (playerEmail && userEmail && playerEmail === userEmail) return true;

      const playerFirst = (p.firstName ?? '').toLowerCase();
      const playerLast = (p.lastName ?? '').toLowerCase();
      const userFirst = (currentUser.firstName ?? '').toLowerCase();
      const userLast = (currentUser.lastName ?? '').toLowerCase();

      if (!playerFirst || !userFirst || !playerLast || !userLast) return false;
      return playerFirst === userFirst && playerLast === userLast;
    });
  }, [currentUser, isAuthenticated, players]);

  // Get player name helper - memoized for stable reference
  const getPlayerName = useCallback(
    (playerId: string): string => {
      const player = players.find((p) => p.id === playerId);
      return player ? `${player.firstName} ${player.lastName?.[0] || ''}`.trim() : 'Unknown';
    },
    [players]
  );

  // Get player names for a match - memoized for stable reference
  const getMatchPlayerNames = useCallback(
    (match: Match): { teamA: string; teamB: string } => {
      const teamA = match.teamAPlayerIds.map(getPlayerName).join(' & ');
      const teamB = match.teamBPlayerIds.map(getPlayerName).join(' & ');
      return { teamA, teamB };
    },
    [getPlayerName]
  );

  // Check if user is in a match - memoized for stable reference
  const isUserInMatch = useCallback(
    (match: Match): boolean => {
      if (!currentUserPlayer) return false;
      return (
        match.teamAPlayerIds.includes(currentUserPlayer.id) ||
        match.teamBPlayerIds.includes(currentUserPlayer.id)
      );
    },
    [currentUserPlayer]
  );


  // Build schedule entries
  const scheduleByDay = useMemo((): DaySchedule[] => {
    if (!currentTrip) return [];

    // Get all dates in trip range
    const startDate = new Date(currentTrip.startDate);
    const endDate = new Date(currentTrip.endDate);
    const days: DaySchedule[] = [];

    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      const dayName = d.toLocaleDateString('en-US', { weekday: 'long' });
      const dayNumber = Math.floor((d.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

      const entries: ScheduleEntry[] = [];

      // Find sessions for this day
      const daySessions = sessions
        .filter((s) => {
          if (!s.scheduledDate) return false;
          const sessionDate = new Date(s.scheduledDate).toISOString().split('T')[0];
          return sessionDate === dateStr;
        })
        .sort((a, b) => {
          // Sort by time slot (AM before PM)
          if (a.timeSlot === 'AM' && b.timeSlot === 'PM') return -1;
          if (a.timeSlot === 'PM' && b.timeSlot === 'AM') return 1;
          return a.sessionNumber - b.sessionNumber;
        });

      // Add session entries with their matches
      for (const session of daySessions) {
        const sessionMatches = matches.filter((m) => m.sessionId === session.id);

        // Add session header
        entries.push({
          id: session.id,
          type: 'session',
          title: session.name,
          subtitle: `${SessionTypeDisplay[session.sessionType]} • ${sessionMatches.length} matches`,
          time: session.timeSlot === 'AM' ? '8:00 AM' : '1:00 PM',
          date: dateStr,
          sessionType: session.sessionType,
          status:
            session.status === 'completed'
              ? 'completed'
              : session.status === 'inProgress'
                ? 'inProgress'
                : 'upcoming',
        });

        // Add individual match entries
        for (const match of sessionMatches.sort((a, b) => a.matchOrder - b.matchOrder)) {
          const playerNames = getMatchPlayerNames(match);
          const userInMatch = isUserInMatch(match);

          // Estimate tee time based on match order
          const baseTime = session.timeSlot === 'AM' ? 8 : 13;
          const interval = session.sessionType === 'singles' ? 8 : 10;
          const matchTime = new Date(d);
          matchTime.setHours(baseTime, (match.matchOrder - 1) * interval, 0, 0);

          entries.push({
            id: match.id,
            type: 'teeTime',
            title: `Match ${match.matchOrder}`,
            subtitle: `${playerNames.teamA} vs ${playerNames.teamB}`,
            time: matchTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
            datetime: new Date(matchTime), // For countdown calculation
            date: dateStr,
            matchId: match.id,
            isUserMatch: userInMatch,
            players: [...match.teamAPlayerIds, ...match.teamBPlayerIds],
            status:
              match.status === 'completed'
                ? 'completed'
                : match.status === 'inProgress'
                  ? 'inProgress'
                  : 'upcoming',
          });
        }
      }

      days.push({
        date: dateStr,
        dayName,
        dayNumber,
        entries,
      });
    }

    return days;
  }, [currentTrip, sessions, matches, getMatchPlayerNames, isUserInMatch]);

  // Filter for user's schedule
  const mySchedule = useMemo(() => {
    if (!currentUserPlayer) return [];
    return scheduleByDay
      .map((day) => ({
        ...day,
        entries: day.entries.filter((e) => e.isUserMatch || e.type === 'session'),
      }))
      .filter((day) => day.entries.some((e) => e.isUserMatch));
  }, [scheduleByDay, currentUserPlayer]);

  // If not signed in, render an explicit empty state (no blank redirects).
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen pb-nav page-premium-enter texture-grain bg-[var(--canvas)]">
        <PageHeader
          title="Schedule"
          subtitle="Sign in required"
          icon={<CalendarDays size={16} className="text-[var(--color-accent)]" />}
          onBack={() => router.back()}
        />

        <main className="container-editorial py-12">
          <EmptyStatePremium
            illustration="calendar"
            title="Sign in to view the schedule"
            description="Your trip schedule is available after you sign in."
            action={{
              label: 'Sign In',
              onClick: () => router.push('/login'),
            }}
            variant="large"
          />
        </main>
        <BottomNav />
      </div>
    );
  }

  // If no trip, render an explicit empty state (no auto-redirect).
  if (!currentTrip) {
    if (isLoading) {
      return <PageLoadingSkeleton title="Schedule" variant="list" />;
    }

    return (
      <div className="min-h-screen pb-nav page-premium-enter texture-grain bg-[var(--canvas)]">
        <PageHeader
          title="Schedule"
          subtitle="No active trip"
          icon={<CalendarDays size={16} className="text-[var(--color-accent)]" />}
          onBack={() => router.back()}
        />

        <main className="container-editorial py-12">
          <EmptyStatePremium
            illustration="calendar"
            title="No trip selected"
            description="Pick a trip to see the schedule."
            action={{
              label: 'Back to Home',
              onClick: () => router.push('/'),
            }}
            variant="large"
          />
        </main>
        <BottomNav />
      </div>
    );
  }

  // Standard loading skeleton when trip exists but match data is still loading.
  if (isLoading) {
    return <PageLoadingSkeleton title="Schedule" variant="list" />;
  }

  const displaySchedule = selectedTab === 'my' ? mySchedule : scheduleByDay;
  const hasUserSchedule = mySchedule.length > 0;

  return (
    <div className="min-h-screen pb-nav page-premium-enter texture-grain bg-[var(--canvas)]">
      <PageHeader
        title="Schedule"
        subtitle={currentTrip.name}
        icon={<CalendarDays size={16} className="text-[var(--color-accent)]" />}
        onBack={() => router.back()}
        rightSlot={
          currentUserPlayer ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--surface-card)] border border-[var(--rule)] shadow-sm">
              <User size={14} className="text-[var(--masters)]" />
              <span className="text-xs font-medium">{currentUserPlayer.firstName}</span>
            </div>
          ) : null
        }
      />

      {/* Tab Selector */}
      <div className="container-editorial py-4" role="tablist" aria-label="Schedule views">
        <div className="flex gap-2">
          <button
            onClick={() => setSelectedTab('my')}
            role="tab"
            aria-selected={selectedTab === 'my'}
            aria-controls="schedule-content"
            className={cn(
              'flex-1 py-3 px-4 rounded-xl font-medium transition-all flex items-center justify-center gap-2',
              selectedTab === 'my'
                ? 'bg-[var(--masters)] text-[var(--canvas)]'
                : 'bg-[var(--surface)] border border-[var(--rule)]'
            )}
          >
            <User size={18} />
            Your Matches
          </button>
          <button
            onClick={() => setSelectedTab('all')}
            role="tab"
            aria-selected={selectedTab === 'all'}
            aria-controls="schedule-content"
            className={cn(
              'flex-1 py-3 px-4 rounded-xl font-medium transition-all flex items-center justify-center gap-2',
              selectedTab === 'all'
                ? 'bg-[var(--masters)] text-[var(--canvas)]'
                : 'bg-[var(--surface)] border border-[var(--rule)]'
            )}
          >
            <Calendar size={18} />
            Full Schedule
          </button>
        </div>
      </div>

      {/* Main Content */}
      <main className="container-editorial pb-8" id="schedule-content" role="tabpanel">
        {/* Error State */}
        {loadError && (
          <div className="py-12">
            <ErrorEmpty message={loadError} onRetry={loadMatches} />
          </div>
        )}

        {/* No Profile Warning */}
        {!loadError && selectedTab === 'my' && !currentUserPlayer && (
          <div className="p-4 rounded-xl mb-6 flex items-start gap-3 bg-[color:var(--warning)]/10 border border-[color:var(--warning)]/30">
            <AlertCircle size={20} className="text-[var(--warning)] shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-[var(--warning)]">Profile not linked</p>
              <p className="type-caption mt-1">
                Create a profile or sign in to see your personal tee times.
              </p>
              <Link
                href="/profile/create"
                className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-[var(--masters)]"
              >
                Create Profile
                <ChevronRight size={16} />
              </Link>
            </div>
          </div>
        )}

        {/* No Matches for User */}
        {!loadError && selectedTab === 'my' && currentUserPlayer && !hasUserSchedule && (
          <div className="py-12">
            <EmptyStatePremium
              illustration="calendar"
              title="No tee times yet"
              description="You haven't been assigned to any matches. Check the Full Schedule tab or ask your captain."
              action={{
                label: 'View Full Schedule',
                onClick: () => setSelectedTab('all'),
              }}
              variant="default"
            />
          </div>
        )}

        {/* Schedule Days */}
        {!loadError && displaySchedule.map((day) => (
            <div key={day.date} className="mb-8">
              {/* Day Header */}
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-12 w-12 flex-col items-center justify-center rounded-xl bg-[var(--masters)] text-[var(--canvas)]">
                  <span className="text-xs font-medium opacity-80">Day</span>
                  <span className="text-lg font-bold leading-none">{day.dayNumber}</span>
                </div>
                <div>
                  <p className="font-semibold">{day.dayName}</p>
                  <p className="type-caption">
                    {new Date(day.date).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>
              </div>

              {/* Entries */}
              {day.entries.length === 0 ? (
                <div className="py-[var(--space-4)]">
                  <EmptyStatePremium
                    illustration="calendar"
                    title="No scheduled events"
                    description="Nothing is on the books for this day yet."
                    variant="compact"
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  {day.entries.map((entry) => (
                    <ScheduleEntryCard
                      key={entry.id}
                      entry={entry}
                      onPress={
                        entry.matchId ? () => router.push(`/score/${entry.matchId}`) : undefined
                      }
                    />
                  ))}
                </div>
              )}
            </div>
          ))}

        {/* Empty State for All Schedule */}
        {!loadError &&
          selectedTab === 'all' &&
          scheduleByDay.every((day) => day.entries.length === 0) && (
          <div className="py-16">
            <EmptyStatePremium
              illustration="calendar"
              title="No sessions scheduled"
              description="Sessions will appear here once the captain sets up the schedule."
              variant="default"
            />
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}

/* Schedule Entry Card Component */
interface ScheduleEntryCardProps {
  entry: ScheduleEntry;
  onPress?: () => void;
}

function ScheduleEntryCard({ entry, onPress }: ScheduleEntryCardProps) {
  const isSession = entry.type === 'session';
  const isUserMatch = entry.isUserMatch;

  // Calculate countdown for upcoming tee times (P1: Show countdown)
  const countdown = useMemo(() => {
    if (!entry.datetime || entry.status !== 'upcoming') return undefined;
    return getCountdown(entry.datetime);
  }, [entry.datetime, entry.status]);

  // Check if this is today's entry
  const entryIsToday = isToday(entry.date);

  const statusClasses = {
    upcoming: {
      text: 'text-[var(--ink-tertiary)]',
      bg: 'bg-[color:var(--ink-tertiary)]/20',
    },
    inProgress: {
      text: 'text-[var(--warning)]',
      bg: 'bg-[color:var(--warning)]/20',
    },
    completed: {
      text: 'text-[var(--success)]',
      bg: 'bg-[color:var(--success)]/20',
    },
  } as const;

  return (
    <button
      onClick={onPress}
      disabled={!onPress}
      className={cn(
        'w-full text-left p-4 rounded-xl transition-all border',
        onPress && 'press-scale',
        isSession
          ? 'bg-[color:var(--masters)]/10 border-[var(--masters-glow)]'
          : isUserMatch
            ? 'bg-[color:var(--gold)]/10 border-[color:var(--gold)]/30'
            : 'bg-[var(--surface)] border-[var(--rule)]'
      )}
    >
      <div className="flex items-start gap-3">
        {/* Time Column */}
        <div className="w-16 shrink-0">
          {entry.time && (
            <div className="text-sm font-semibold text-[var(--ink)]">
              {entry.time}
            </div>
          )}
          {/* Countdown badge for upcoming user matches (P1) */}
          {countdown && !countdown.isPast && isUserMatch && entryIsToday && (
            <div
              className="flex items-center gap-1 mt-1 text-xs font-medium px-1.5 py-0.5 rounded"
              style={{
                background: `${getCountdownColor(countdown.urgency)}15`,
                color: getCountdownColor(countdown.urgency),
              }}
            >
              <Clock size={10} />
              {countdown.display}
            </div>
          )}
          {isSession && !countdown && (
            <div className="flex items-center gap-1 mt-1">
              {entry.time?.includes('AM') ? (
                <Sunrise size={12} className="text-[var(--masters)]" />
              ) : (
                <Sunset size={12} className="text-[var(--team-europe)]" />
              )}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {isSession && <Flag size={14} className="text-[var(--masters)]" />}
            {isUserMatch && <User size={14} className="text-[var(--gold-light)]" />}
            <span
              className={cn(
                'font-medium',
                !isSession && 'text-sm',
                isSession ? 'text-[var(--masters)]' : 'text-[var(--ink)]'
              )}
            >
              {entry.title}
            </span>
            {entry.status && (
              <span
                className={cn(
                  'text-[10px] px-2 py-0.5 rounded-full font-medium uppercase',
                  statusClasses[entry.status].bg,
                  statusClasses[entry.status].text
                )}
              >
                {entry.status === 'inProgress' ? 'Live' : entry.status}
              </span>
            )}
          </div>
          {entry.subtitle && (
            <p className="text-sm mt-1 truncate text-[var(--ink-secondary)]">
              {entry.subtitle}
            </p>
          )}
        </div>

        {/* Arrow for tappable items */}
        {onPress && (
          <ChevronRight size={18} className="text-[var(--ink-tertiary)] shrink-0" />
        )}
      </div>
    </button>
  );
}
