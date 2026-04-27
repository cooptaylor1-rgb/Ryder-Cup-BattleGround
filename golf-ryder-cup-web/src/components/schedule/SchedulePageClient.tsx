'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMemo } from 'react';
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
import { EmptyStatePremium, PageLoadingSkeleton } from '@/components/ui';
import { useTripScopedMatches } from '@/lib/hooks/useTripScopedMatches';
import { useAccessStore, useAuthStore, useTripStore } from '@/lib/stores';
import { useShallow } from 'zustand/shallow';
import { navigateBackOr } from '@/lib/utils/navigation';
import { assessTripPlayerLink, withTripPlayerIdentity } from '@/lib/utils/tripPlayerIdentity';
import { AlertCircle, CalendarDays, ChevronRight, User } from 'lucide-react';
import type { Match, RyderCupSession } from '@/lib/types/models';

const EMPTY_SESSIONS: RyderCupSession[] = [];
const EMPTY_MATCHES: Match[] = [];

export default function SchedulePageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentTrip, players, courses, teeSets, isTripLoading } = useTripStore(
    useShallow((s) => ({
      currentTrip: s.currentTrip,
      players: s.players,
      courses: s.courses,
      teeSets: s.teeSets,
      isTripLoading: s.isLoading,
    }))
  );
  const { currentUser, isAuthenticated, authUserId } = useAuthStore();
  const isCaptainMode = useAccessStore((s) => s.isCaptainMode);
  const tripData = useTripScopedMatches(isAuthenticated ? currentTrip?.id : undefined);
  const sessions = tripData?.sessions ?? EMPTY_SESSIONS;
  const matches = tripData?.matches ?? EMPTY_MATCHES;
  const isScheduleLoading = isAuthenticated && Boolean(currentTrip) && tripData === undefined;

  // Default to "all" when there's no linked player profile. Otherwise
  // first-time users land on an empty "My Schedule" tab and think the
  // page is broken. Once the profile link exists, "my" becomes the
  // default so you see your own tee times first.
  const explicitView = searchParams?.get('view');
  const selectedTab =
    explicitView === 'all' ? 'all' : explicitView === 'my' ? 'my' : currentUser ? 'my' : 'all';
  const myScheduleHref = '/schedule';
  const fullScheduleHref = '/schedule?view=all';

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
        courses,
        teeSets,
        currentUserPlayer,
      }),
    [courses, currentTrip, currentUserPlayer, matches, players, sessions, teeSets]
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
    if (isTripLoading) {
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

  if (isScheduleLoading) {
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
        onSelectMy={() => router.push(myScheduleHref)}
        onSelectAll={() => router.push(fullScheduleHref)}
      />

      <main className="container-editorial pb-8" id="schedule-content" role="tabpanel">
        {selectedTab === 'my' && !currentUserPlayer ? (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-[color:var(--warning)]/30 bg-[color:var(--warning)]/10 p-4">
            <AlertCircle size={20} className="mt-0.5 shrink-0 text-[var(--warning)]" />
            <div>
              <p className="font-medium text-[var(--warning)]">Roster link needed</p>
              <p className="type-caption mt-1">
                {currentUserPlayerLink.status === 'ambiguous-email-match' ||
                currentUserPlayerLink.status === 'ambiguous-name-match'
                  ? 'This trip has more than one possible roster match for your profile. Ask the captain to confirm which player entry is yours.'
                  : currentUser
                    ? "You're signed in, but this trip doesn't have a linked player entry for your profile yet."
                    : 'Create a profile or sign in to see your personal tee times.'}
              </p>
              <Link
                href={currentUser ? '/profile' : '/profile/create'}
                className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-[var(--masters)]"
              >
                {currentUser ? 'Link profile to roster' : 'Create Profile'}
                <ChevronRight size={16} />
              </Link>
            </div>
          </div>
        ) : null}

        {selectedTab === 'my' && currentUserPlayer && !hasUserSchedule ? (
          <div className="py-12">
            <EmptyStatePremium
              illustration="calendar"
              title="No matches assigned yet"
              description="Your roster profile is linked, but no tee time has been assigned to you yet. Open the full schedule to see every session."
              action={{
                label: 'Open Full Schedule',
                onClick: () => router.push(fullScheduleHref),
              }}
              variant="default"
            />
          </div>
        ) : null}

        {displaySchedule.map((day) => (
          <ScheduleDaySection
            key={day.date}
            day={day}
            onEntryPress={(entry) => {
              if (entry.matchId) {
                router.push(`/score/${entry.matchId}`);
              }
            }}
          />
        ))}

        {selectedTab === 'all' && scheduleByDay.every((day) => day.entries.length === 0) ? (
          <div className="py-16">
            <EmptyStatePremium
              illustration="calendar"
              title="No sessions on the schedule"
              description={
                isCaptainMode
                  ? 'Create a session, then publish pairings when the lineup is ready.'
                  : 'The full schedule will appear here after the captain adds sessions.'
              }
              action={
                isCaptainMode
                  ? {
                      label: 'Create Session',
                      onClick: () => router.push('/lineup/new?mode=session'),
                    }
                  : undefined
              }
              variant="default"
            />
          </div>
        ) : null}
      </main>
    </div>
  );
}
