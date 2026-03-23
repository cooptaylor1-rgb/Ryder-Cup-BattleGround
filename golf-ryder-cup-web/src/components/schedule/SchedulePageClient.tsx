'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { PageHeader } from '@/components/layout';
import {
  ScheduleDaySection,
  ScheduleTabSelector,
} from '@/components/schedule/SchedulePageSections';
import {
  buildMySchedule,
  buildScheduleByDay,
  resolveCurrentUserPlayer,
} from '@/components/schedule/scheduleData';
import { EmptyStatePremium, ErrorEmpty, PageLoadingSkeleton } from '@/components/ui';
import { db } from '@/lib/db';
import { useAuthStore, useTripStore } from '@/lib/stores';
import { tripLogger } from '@/lib/utils/logger';
import { navigateBackOr } from '@/lib/utils/navigation';
import { assessTripPlayerLink, withTripPlayerIdentity } from '@/lib/utils/tripPlayerIdentity';
import { AlertCircle, CalendarDays, ChevronRight, User } from 'lucide-react';
import type { Match } from '@/lib/types/models';

export default function SchedulePageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentTrip, sessions, players } = useTripStore();
  const { currentUser, isAuthenticated, authUserId } = useAuthStore();
  const [matches, setMatches] = useState<Match[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const selectedTab = searchParams?.get('view') === 'all' ? 'all' : 'my';
  const myScheduleHref = '/schedule';
  const fullScheduleHref = '/schedule?view=all';

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
      const sessionIds = sessions.map((session) => session.id);
      if (sessionIds.length === 0) {
        setMatches([]);
        return;
      }

      const allMatches = await db.matches.where('sessionId').anyOf(sessionIds).toArray();
      setMatches(allMatches);
    } catch (error) {
      tripLogger.error('Error loading matches:', error);
      setLoadError("We couldn't load matches right now.");
    } finally {
      setIsLoading(false);
    }
  }, [currentTrip, isAuthenticated, sessions]);

  useEffect(() => {
    void loadMatches();
  }, [loadMatches]);

  const currentIdentity = useMemo(
    () => withTripPlayerIdentity(currentUser, authUserId),
    [authUserId, currentUser]
  );

  const currentUserPlayer = useMemo(
    () => resolveCurrentUserPlayer(players, currentIdentity, isAuthenticated),
    [currentIdentity, isAuthenticated, players]
  );
  const currentUserPlayerLink = useMemo(
    () => assessTripPlayerLink(players, currentIdentity, isAuthenticated),
    [currentIdentity, isAuthenticated, players]
  );

  const scheduleByDay = useMemo(
    () =>
      buildScheduleByDay({
        currentTrip,
        sessions,
        matches,
        players,
        currentUserPlayer,
      }),
    [currentTrip, currentUserPlayer, matches, players, sessions]
  );

  const mySchedule = useMemo(
    () => buildMySchedule(scheduleByDay, currentUserPlayer),
    [currentUserPlayer, scheduleByDay]
  );

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen page-premium-enter texture-grain bg-[var(--canvas)]">
        <PageHeader
          title="Schedule"
          subtitle="Sign in required"
          icon={<CalendarDays size={16} className="text-[var(--color-accent)]" />}
          onBack={() => navigateBackOr(router, '/')}
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
      </div>
    );
  }

  if (!currentTrip) {
    if (isLoading) {
      return <PageLoadingSkeleton title="Schedule" variant="list" />;
    }

    return (
      <div className="min-h-screen page-premium-enter texture-grain bg-[var(--canvas)]">
        <PageHeader
          title="Schedule"
          subtitle="No active trip"
          icon={<CalendarDays size={16} className="text-[var(--color-accent)]" />}
          onBack={() => navigateBackOr(router, '/')}
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
      </div>
    );
  }

  if (isLoading) {
    return <PageLoadingSkeleton title="Schedule" variant="list" />;
  }

  const displaySchedule = selectedTab === 'my' ? mySchedule : scheduleByDay;
  const hasUserSchedule = mySchedule.length > 0;

  return (
    <div className="min-h-screen page-premium-enter texture-grain bg-[var(--canvas)]">
      <PageHeader
        title="Schedule"
        subtitle={currentTrip.name}
        icon={<CalendarDays size={16} className="text-[var(--color-accent)]" />}
        onBack={() => navigateBackOr(router, '/')}
        rightSlot={
          currentUserPlayer ? (
            <div className="flex items-center gap-2 rounded-full border border-[var(--rule)] bg-[var(--surface-card)] px-3 py-1.5 shadow-sm">
              <User size={14} className="text-[var(--masters)]" />
              <span className="text-xs font-medium">{currentUserPlayer.firstName}</span>
            </div>
          ) : null
        }
      />

      <ScheduleTabSelector
        selectedTab={selectedTab}
        myHref={myScheduleHref}
        allHref={fullScheduleHref}
      />

      <main className="container-editorial pb-8" id="schedule-content" role="tabpanel">
        {loadError ? (
          <div className="py-12">
            <ErrorEmpty message={loadError} onRetry={loadMatches} />
          </div>
        ) : null}

        {!loadError && selectedTab === 'my' && !currentUserPlayer ? (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-[color:var(--warning)]/30 bg-[color:var(--warning)]/10 p-4">
            <AlertCircle size={20} className="mt-0.5 shrink-0 text-[var(--warning)]" />
            <div>
              <p className="font-medium text-[var(--warning)]">Profile not linked</p>
              <p className="type-caption mt-1">
                {currentUserPlayerLink.status === 'ambiguous-email-match' ||
                currentUserPlayerLink.status === 'ambiguous-name-match'
                  ? "This trip has more than one possible roster match for your profile. Ask the captain to confirm which player entry is yours."
                  : currentUser
                    ? "You're signed in, but this trip doesn't have a linked player entry for your profile yet."
                    : 'Create a profile or sign in to see your personal tee times.'}
              </p>
              <Link
                href={currentUser ? '/profile' : '/profile/create'}
                className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-[var(--masters)]"
              >
                {currentUser ? 'Open Profile' : 'Create Profile'}
                <ChevronRight size={16} />
              </Link>
            </div>
          </div>
        ) : null}

        {!loadError && selectedTab === 'my' && currentUserPlayer && !hasUserSchedule ? (
          <div className="py-12">
            <EmptyStatePremium
              illustration="calendar"
              title="No tee times yet"
              description="You haven't been assigned to any matches. Check the Full Schedule tab or ask your captain."
              action={{
                label: 'View Full Schedule',
                onClick: () => router.push(fullScheduleHref),
              }}
              variant="default"
            />
          </div>
        ) : null}

        {!loadError
          ? displaySchedule.map((day) => (
              <ScheduleDaySection
                key={day.date}
                day={day}
                onEntryPress={(entry) => {
                  if (entry.matchId) {
                    router.push(`/score/${entry.matchId}`);
                  }
                }}
              />
            ))
          : null}

        {!loadError && selectedTab === 'all' && scheduleByDay.every((day) => day.entries.length === 0) ? (
          <div className="py-16">
            <EmptyStatePremium
              illustration="calendar"
              title="No sessions scheduled"
              description="Sessions will appear here once the captain sets up the schedule."
              variant="default"
            />
          </div>
        ) : null}
      </main>
    </div>
  );
}
