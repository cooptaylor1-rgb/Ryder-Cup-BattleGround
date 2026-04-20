import type { MatchState } from '@/lib/types/computed';
import type { Match, Player, RyderCupSession } from '@/lib/types/models';
import { parseDateInLocalZone } from '@/lib/utils';
import type { TripPlayerLinkResult } from '@/lib/utils/tripPlayerIdentity';

interface UserMatchData {
  match: Match;
  session: RyderCupSession;
  matchState: MatchState | null;
}

export interface DashboardNextUp {
  eyebrow: string;
  title: string;
  body: string;
  href: string;
  footerLabel: string;
}

export function getNextSession(sessions: RyderCupSession[]): RyderCupSession | null {
  if (sessions.length === 0) return null;

  const sorted = [...sessions].sort((left, right) => {
    const leftTime = left.scheduledDate ? new Date(left.scheduledDate).getTime() : Number.MAX_SAFE_INTEGER;
    const rightTime = right.scheduledDate ? new Date(right.scheduledDate).getTime() : Number.MAX_SAFE_INTEGER;
    if (leftTime !== rightTime) return leftTime - rightTime;

    const leftSlot = left.timeSlot === 'PM' ? 1 : 0;
    const rightSlot = right.timeSlot === 'PM' ? 1 : 0;
    if (leftSlot !== rightSlot) return leftSlot - rightSlot;

    return left.sessionNumber - right.sessionNumber;
  });

  return sorted.find((session) => session.status !== 'completed') ?? sorted[0] ?? null;
}

function formatSessionTiming(session: RyderCupSession): string {
  const date = session.scheduledDate
    ? parseDateInLocalZone(session.scheduledDate).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      })
    : 'Date TBD';
  return `${date}${session.timeSlot ? ` · ${session.timeSlot}` : ''}`;
}

function getNextPlayerMatch(
  matches: Match[],
  sessions: RyderCupSession[],
  currentUserPlayerId?: string
): { match: Match; session: RyderCupSession } | null {
  if (!currentUserPlayerId) {
    return null;
  }

  const sessionById = new Map(sessions.map((session) => [session.id, session]));
  const now = Date.now();

  const candidateMatches = matches
    .filter(
      (match) =>
        match.status === 'scheduled' &&
        (match.teamAPlayerIds.includes(currentUserPlayerId) ||
          match.teamBPlayerIds.includes(currentUserPlayerId))
    )
    .map((match) => ({
      match,
      session: sessionById.get(match.sessionId),
    }))
    .filter(
      (item): item is { match: Match; session: RyderCupSession } =>
        Boolean(item.session)
    )
    .sort((left, right) => {
      const leftTime = left.session.scheduledDate
        ? new Date(left.session.scheduledDate).getTime()
        : Number.MAX_SAFE_INTEGER;
      const rightTime = right.session.scheduledDate
        ? new Date(right.session.scheduledDate).getTime()
        : Number.MAX_SAFE_INTEGER;
      const normalizedLeftTime = leftTime < now ? now : leftTime;
      const normalizedRightTime = rightTime < now ? now : rightTime;

      if (normalizedLeftTime !== normalizedRightTime) {
        return normalizedLeftTime - normalizedRightTime;
      }

      return left.match.matchOrder - right.match.matchOrder;
    });

  return candidateMatches[0] ?? null;
}

function getCaptainBlockingItem(
  sessions: RyderCupSession[],
  matches: Match[]
): DashboardNextUp | null {
  const sessionById = new Map(sessions.map((session) => [session.id, session]));
  const courseBlockedMatch = matches.find(
    (match) => match.status !== 'cancelled' && (!match.courseId || !match.teeSetId)
  );
  if (courseBlockedMatch) {
    const session = sessionById.get(courseBlockedMatch.sessionId);
    const params = new URLSearchParams({
      focus: 'course',
      matchId: courseBlockedMatch.id,
    });
    if (session) {
      params.set('sessionId', session.id);
    }

    return {
      eyebrow: 'Captain Blocker',
      title: 'A match still needs course setup',
      body: session
        ? `${session.name} is not handicap-ready yet. Assign the course and tee before scoring starts.`
        : 'At least one match still needs a course and tee set before scoring starts.',
      href: `/captain/manage?${params.toString()}`,
      footerLabel: 'Finish course setup',
    };
  }

  const lineupBlockedSession = sessions.find((session) =>
    matches.some(
      (match) =>
        match.sessionId === session.id &&
        (match.teamAPlayerIds.length === 0 || match.teamBPlayerIds.length === 0)
    )
  );
  if (lineupBlockedSession) {
    return {
      eyebrow: 'Captain Blocker',
      title: `${lineupBlockedSession.name} still needs lineups`,
      body: 'Finish player assignments before the session goes live.',
      href: `/lineup/${lineupBlockedSession.id}`,
      footerLabel: 'Open lineup',
    };
  }

  if (sessions.length === 0) {
    return {
      eyebrow: 'Captain Blocker',
      title: 'Your trip still needs the first session',
      body: 'Create the opening session and matches before the board can come alive.',
      href: '/lineup/new?mode=session',
      footerLabel: 'Create first session',
    };
  }

  return null;
}

export function buildNextUpBlock({
  userMatchData,
  currentUserPlayer,
  sessions,
  matches,
  tripPlayerLink,
  isCaptainMode,
}: {
  userMatchData: UserMatchData | null;
  currentUserPlayer: Player | null;
  sessions: RyderCupSession[];
  matches: Match[];
  tripPlayerLink: TripPlayerLinkResult;
  isCaptainMode: boolean;
}): DashboardNextUp | null {
  if (userMatchData?.match.status === 'inProgress') {
    return {
      eyebrow: 'Next Up',
      title: 'Continue your live match',
      body: `${userMatchData.session.name} is already underway. Jump straight back into scoring.`,
      href: `/score/${userMatchData.match.id}`,
      footerLabel: 'Resume scoring',
    };
  }

  const nextPlayerMatch = getNextPlayerMatch(matches, sessions, currentUserPlayer?.id);
  if (nextPlayerMatch) {
    return {
      eyebrow: 'Next Up',
      title: 'Your next match is set',
      body: `${nextPlayerMatch.session.name} · Match ${nextPlayerMatch.match.matchOrder} is the next stop on your card.`,
      href: '/schedule',
      footerLabel: 'Open your schedule',
    };
  }

  const nextSession = getNextSession(sessions);
  if (nextSession) {
    return {
      eyebrow: 'Next Up',
      title: nextSession.name,
      body: `${formatSessionTiming(nextSession)} · Keep the full order of play close at hand.`,
      href: '/schedule?view=all',
      footerLabel: 'View full schedule',
    };
  }

  if (isCaptainMode) {
    return getCaptainBlockingItem(sessions, matches);
  }

  if (
    tripPlayerLink.status === 'ambiguous-email-match' ||
    tripPlayerLink.status === 'ambiguous-name-match'
  ) {
    return {
      eyebrow: 'Next Up',
      title: 'Review your roster link',
      body: 'This trip has more than one possible roster match for your profile. Confirm it before relying on your personal schedule.',
      href: '/profile',
      footerLabel: 'Review in profile',
    };
  }

  return null;
}

export function buildUserMatchCardContent({
  userMatchData,
  currentUserPlayer,
  tripPlayerLink,
  players,
}: {
  userMatchData: UserMatchData | null;
  currentUserPlayer: Player | null;
  tripPlayerLink: TripPlayerLinkResult;
  players: Player[];
}) {
  if (userMatchData) {
    return {
      href:
        userMatchData.match.status === 'inProgress' ? `/score/${userMatchData.match.id}` : '/schedule',
      footerLabel:
        userMatchData.match.status === 'inProgress' ? 'Enter scoring' : 'Open schedule',
    };
  }

  if (!currentUserPlayer) {
    if (
      tripPlayerLink.status === 'ambiguous-email-match' ||
      tripPlayerLink.status === 'ambiguous-name-match'
    ) {
      return {
        title: 'Roster link needs review',
        body: 'There are multiple possible roster matches for your profile. Confirm the right player entry before relying on personal tee times.',
        href: '/profile',
        footerLabel: 'Review roster link',
      };
    }

    return {
      title: 'Link your roster entry',
      body:
        tripPlayerLink.status === 'unresolved'
          ? 'You are signed in, but this trip does not have a linked player entry for your profile yet.'
          : 'Open your profile to review how this trip maps to your roster entry.',
      href: '/profile',
      footerLabel: 'Open profile',
    };
  }

  return {
    title: 'Open your schedule',
    body:
      players.length > 0
        ? 'Your trip roster is linked. Open the schedule to see where your matches land.'
        : 'Your trip roster is linked. Open the schedule to see your tee times.',
    href: '/schedule',
    footerLabel: 'Open schedule',
  };
}
