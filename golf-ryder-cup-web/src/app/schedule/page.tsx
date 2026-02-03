'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTripStore, useAuthStore } from '@/lib/stores';
import { PageLoadingSkeleton } from '@/components/ui';
import { db } from '@/lib/db';
import { tripLogger } from '@/lib/utils/logger';
import { getCountdown, getCountdownColor, isToday } from '@/lib/utils';
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
import { BottomNav } from '@/components/layout';

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

  // Load matches from database
  useEffect(() => {
    async function loadMatches() {
      if (!currentTrip) {
        setIsLoading(false);
        return;
      }

      try {
        const sessionIds = sessions.map((s) => s.id);
        if (sessionIds.length === 0) {
          setMatches([]);
          setIsLoading(false);
          return;
        }

        const allMatches = await db.matches.where('sessionId').anyOf(sessionIds).toArray();

        setMatches(allMatches);
      } catch (error) {
        tripLogger.error('Error loading matches:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadMatches();
  }, [currentTrip, sessions]);

  // Find the player record that matches current user
  const currentUserPlayer = useMemo(() => {
    if (!isAuthenticated || !currentUser) return null;

    // Try to match by email first, then by name
    return players.find(
      (p) =>
        (p.email &&
          currentUser.email &&
          p.email.toLowerCase() === currentUser.email.toLowerCase()) ||
        (p.firstName.toLowerCase() === currentUser.firstName.toLowerCase() &&
          p.lastName.toLowerCase() === currentUser.lastName.toLowerCase())
    );
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

  // Get user's team in a match
  const _getUserTeam = (match: Match): 'A' | 'B' | null => {
    if (!currentUserPlayer) return null;
    if (match.teamAPlayerIds.includes(currentUserPlayer.id)) return 'A';
    if (match.teamBPlayerIds.includes(currentUserPlayer.id)) return 'B';
    return null;
  };

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

  // Redirect if no trip
  useEffect(() => {
    if (!currentTrip && !isLoading) {
      router.push('/');
    }
  }, [currentTrip, isLoading, router]);

  if (!currentTrip) {
    return <PageLoadingSkeleton title="Schedule" variant="list" />;
  }

  const displaySchedule = selectedTab === 'my' ? mySchedule : scheduleByDay;
  const hasUserSchedule = mySchedule.length > 0;

  return (
    <div
      className="min-h-screen pb-nav page-premium-enter texture-grain"
      style={{ background: 'var(--canvas)' }}
    >
      {/* Premium Header */}
      <header className="header-premium">
        <div className="container-editorial flex items-center justify-between">
          <div className="flex items-center gap-3">
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
              <CalendarDays size={16} style={{ color: 'var(--color-accent)' }} />
            </div>
            <div>
              <span className="type-overline" style={{ letterSpacing: '0.1em' }}>
                Schedule
              </span>
              <p className="type-caption">{currentTrip.name}</p>
            </div>
          </div>
          {currentUserPlayer && (
            <div
              className="flex items-center gap-2 px-3 py-1.5 rounded-full"
              style={{
                background: 'var(--surface-card)',
                border: '1px solid var(--rule)',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <User size={14} style={{ color: 'var(--masters)' }} />
              <span className="text-xs font-medium">{currentUserPlayer.firstName}</span>
            </div>
          )}
        </div>
      </header>

      {/* Tab Selector */}
      <div className="container-editorial py-4" role="tablist" aria-label="Schedule views">
        <div className="flex gap-2">
          <button
            onClick={() => setSelectedTab('my')}
            role="tab"
            aria-selected={selectedTab === 'my'}
            aria-controls="schedule-content"
            className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
              selectedTab === 'my' ? 'text-white' : ''
            }`}
            style={{
              background: selectedTab === 'my' ? 'var(--masters)' : 'var(--surface)',
              border: selectedTab === 'my' ? 'none' : '1px solid var(--rule)',
            }}
          >
            <User size={18} />
            Your Matches
          </button>
          <button
            onClick={() => setSelectedTab('all')}
            role="tab"
            aria-selected={selectedTab === 'all'}
            aria-controls="schedule-content"
            className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
              selectedTab === 'all' ? 'text-white' : ''
            }`}
            style={{
              background: selectedTab === 'all' ? 'var(--masters)' : 'var(--surface)',
              border: selectedTab === 'all' ? 'none' : '1px solid var(--rule)',
            }}
          >
            <Calendar size={18} />
            Full Schedule
          </button>
        </div>
      </div>

      {/* Main Content */}
      <main className="container-editorial pb-8" id="schedule-content" role="tabpanel">
        {/* Loading State */}
        {isLoading && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="animate-pulse rounded-xl p-4"
                style={{ background: 'var(--surface-card)' }}
              >
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-3"></div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
              </div>
            ))}
          </div>
        )}

        {/* No Profile Warning */}
        {!isLoading && selectedTab === 'my' && !currentUserPlayer && (
          <div
            className="p-4 rounded-xl mb-6 flex items-start gap-3"
            style={{
              background: 'rgba(161, 98, 7, 0.1)',
              border: '1px solid rgba(161, 98, 7, 0.3)',
            }}
          >
            <AlertCircle
              size={20}
              style={{ color: 'var(--warning)', flexShrink: 0, marginTop: 2 }}
            />
            <div>
              <p className="font-medium" style={{ color: 'var(--warning)' }}>
                Profile not linked
              </p>
              <p className="type-caption mt-1">
                Create a profile or sign in to see your personal tee times.
              </p>
              <Link
                href="/profile/create"
                className="inline-flex items-center gap-1 mt-2 text-sm font-medium"
                style={{ color: 'var(--masters)' }}
              >
                Create Profile
                <ChevronRight size={16} />
              </Link>
            </div>
          </div>
        )}

        {/* No Matches for User */}
        {!isLoading && selectedTab === 'my' && currentUserPlayer && !hasUserSchedule && (
          <div className="text-center py-12">
            <Calendar size={48} className="mx-auto mb-4 opacity-30" />
            <p className="type-title-sm">No tee times yet</p>
            <p className="type-caption mt-2 max-w-xs mx-auto">
              You haven&apos;t been assigned to any matches. Check the &quot;Full Schedule&quot; tab
              or ask your captain.
            </p>
            <button
              onClick={() => setSelectedTab('all')}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all"
              style={{ background: 'var(--masters)', color: 'white' }}
            >
              <Calendar size={16} />
              View Full Schedule
            </button>
          </div>
        )}

        {/* Schedule Days */}
        {!isLoading &&
          displaySchedule.map((day) => (
            <div key={day.date} className="mb-8">
              {/* Day Header */}
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-12 h-12 rounded-xl flex flex-col items-center justify-center"
                  style={{ background: 'var(--masters)', color: 'white' }}
                >
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
                <div
                  className="p-4 rounded-xl text-center"
                  style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}
                >
                  <p className="type-caption">No scheduled events</p>
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
        {selectedTab === 'all' && scheduleByDay.every((day) => day.entries.length === 0) && (
          <div className="text-center py-16">
            <Calendar size={48} className="mx-auto mb-4 opacity-30" />
            <p className="type-title-sm">No sessions scheduled</p>
            <p className="type-caption mt-2">
              Sessions will appear here once the captain sets up the schedule.
            </p>
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
    if (!entry.datetime || entry.status !== 'upcoming') return null;
    return getCountdown(entry.datetime);
  }, [entry.datetime, entry.status]);

  // Check if this is today's entry
  const entryIsToday = isToday(entry.date);

  const statusColors = {
    upcoming: 'var(--ink-tertiary)',
    inProgress: 'var(--warning)',
    completed: 'var(--success)',
  };

  return (
    <button
      onClick={onPress}
      disabled={!onPress}
      className={`w-full text-left p-4 rounded-xl transition-all ${onPress ? 'press-scale' : ''}`}
      style={{
        background: isSession
          ? 'var(--masters-subtle, rgba(0, 103, 68, 0.1))'
          : isUserMatch
            ? 'rgba(212, 175, 55, 0.1)'
            : 'var(--surface)',
        border: isSession
          ? '1px solid var(--masters-glow)'
          : isUserMatch
            ? '1px solid rgba(212, 175, 55, 0.3)'
            : '1px solid var(--rule)',
      }}
    >
      <div className="flex items-start gap-3">
        {/* Time Column */}
        <div className="w-16 shrink-0">
          {entry.time && (
            <div className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
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
                <Sunrise size={12} style={{ color: 'var(--masters)' }} />
              ) : (
                <Sunset size={12} style={{ color: 'var(--team-europe)' }} />
              )}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {isSession && <Flag size={14} style={{ color: 'var(--masters)' }} />}
            {isUserMatch && <User size={14} style={{ color: '#D4AF37' }} />}
            <span
              className={`font-medium ${isSession ? '' : 'text-sm'}`}
              style={{ color: isSession ? 'var(--masters)' : 'var(--ink)' }}
            >
              {entry.title}
            </span>
            {entry.status && (
              <span
                className="text-[10px] px-2 py-0.5 rounded-full font-medium uppercase"
                style={{
                  background: `${statusColors[entry.status]}20`,
                  color: statusColors[entry.status],
                }}
              >
                {entry.status === 'inProgress' ? 'Live' : entry.status}
              </span>
            )}
          </div>
          {entry.subtitle && (
            <p className="text-sm mt-1 truncate" style={{ color: 'var(--ink-secondary)' }}>
              {entry.subtitle}
            </p>
          )}
        </div>

        {/* Arrow for tappable items */}
        {onPress && (
          <ChevronRight size={18} style={{ color: 'var(--ink-tertiary)', flexShrink: 0 }} />
        )}
      </div>
    </button>
  );
}
