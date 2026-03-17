'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import {
  CalendarDays,
  ChevronRight,
  MessageSquareText,
  ScrollText,
  Sparkles,
  Target,
  Trophy,
} from 'lucide-react';

import { formatDate, formatPlayerName } from '@/lib/utils';
import type { TeamStandings, MatchState } from '@/lib/types/computed';
import type { BanterPost, Match, Player, RyderCupSession, SideBet, Trip } from '@/lib/types/models';
import type { TripAward } from '@/lib/types/tripStats';

interface UserMatchData {
  match: Match;
  session: RyderCupSession;
  matchState: MatchState | null;
}

interface TripDashboardSectionsProps {
  trip: Trip;
  standings: TeamStandings | null;
  userMatchData: UserMatchData | null;
  currentUserPlayer: Player | null;
  players: Player[];
  sessions: RyderCupSession[];
  matches: Match[];
  sideBets: SideBet[];
  banterPosts: BanterPost[];
  tripAwards: TripAward[];
  teamAName: string;
  teamBName: string;
}

export function TripDashboardSections({
  trip,
  standings,
  userMatchData,
  currentUserPlayer,
  players,
  sessions,
  matches,
  sideBets,
  banterPosts,
  tripAwards,
  teamAName,
  teamBName,
}: TripDashboardSectionsProps) {
  const nextSession = getNextSession(sessions);
  const latestPost = [...banterPosts].sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0];
  const activeBets = sideBets.filter((bet) => bet.status === 'active');
  const activeBetPot = activeBets.reduce((sum, bet) => sum + (bet.pot ?? 0), 0);
  const completedMatches = matches.filter((match) => match.result !== 'notFinished').length;

  return (
    <section className="rounded-[1.5rem] border border-[var(--rule)] bg-[var(--canvas-raised)] px-[var(--space-5)] py-[var(--space-5)] shadow-[0_12px_30px_rgba(46,34,18,0.05)]">
      <div className="flex items-start justify-between gap-[var(--space-4)]">
        <div className="min-w-0">
          <p className="type-overline tracking-[0.15em] text-[var(--ink-tertiary)]">
            Trip Dashboard
          </p>
          <h2 className="mt-[var(--space-2)] font-serif text-[clamp(1.45rem,5vw,2rem)] italic leading-[1.08] text-[var(--ink)]">
            Everything for {trip.name} is one turn away.
          </h2>
        </div>
      </div>

      <div className="mt-[var(--space-5)] grid grid-cols-2 gap-[var(--space-3)] lg:grid-cols-4">
        <DashboardStat label="Sessions" value={sessions.length} />
        <DashboardStat label="Matches" value={matches.length} />
        <DashboardStat label="Active Bets" value={activeBets.length} />
        <DashboardStat label="Awards" value={tripAwards.length} />
      </div>

      <div className="mt-[var(--space-5)] grid gap-[var(--space-4)] sm:grid-cols-2 xl:grid-cols-3">
        <DashboardCard
          href="/standings"
          eyebrow="Leaderboard"
          title={standings ? `${teamAName} ${standings.teamAPoints} - ${standings.teamBPoints} ${teamBName}` : 'Open the leaderboard'}
          body={
            standings
              ? buildStandingsNarrative(standings, teamAName, teamBName)
              : 'Standings, player board, and team race in one place.'
          }
          footerLabel="View standings"
          icon={<Trophy size={18} strokeWidth={1.8} />}
          accentClassName="bg-[color:var(--masters)]/10 text-[var(--masters)]"
        />

        <DashboardCard
          href={userMatchData?.match.status === 'inProgress' ? `/score/${userMatchData.match.id}` : currentUserPlayer ? '/schedule' : '/profile'}
          eyebrow="Your Matches"
          title={buildUserMatchTitle(userMatchData, currentUserPlayer)}
          body={buildUserMatchBody(userMatchData, currentUserPlayer, players)}
          footerLabel={userMatchData?.match.status === 'inProgress' ? 'Enter scoring' : currentUserPlayer ? 'Open schedule' : 'Open profile'}
          icon={<Target size={18} strokeWidth={1.8} />}
          accentClassName="bg-[color:var(--team-usa)]/10 text-[var(--team-usa)]"
        />

        <DashboardCard
          href="/schedule?view=all"
          eyebrow="Schedule"
          title={nextSession ? nextSession.name : 'Open the full schedule'}
          body={
            nextSession
              ? `${formatSessionTiming(nextSession)} · ${matches.length} total matches, ${completedMatches} complete.`
              : 'Session times, pairings, and full day order.'
          }
          footerLabel="View schedule"
          icon={<CalendarDays size={18} strokeWidth={1.8} />}
          accentClassName="bg-[color:var(--gold)]/14 text-[var(--gold-dark)]"
        />

        <DashboardCard
          href="/bets"
          eyebrow="Bets"
          title={
            activeBets.length > 0
              ? `${activeBets.length} active game${activeBets.length === 1 ? '' : 's'}`
              : 'No bets started yet'
          }
          body={
            activeBets.length > 0
              ? `$${activeBetPot} currently in play across trip-wide and match-side games.`
              : 'Open Nassau, skins, and match-side action.'
          }
          footerLabel="Open bets"
          icon={<ScrollText size={18} strokeWidth={1.8} />}
          accentClassName="bg-[color:var(--maroon)]/10 text-[var(--maroon)]"
        />

        <DashboardCard
          href="/trip-stats/awards"
          eyebrow="Awards"
          title={
            tripAwards.length > 0
              ? `${tripAwards.length} award${tripAwards.length === 1 ? '' : 's'} on record`
              : 'Awards room is open'
          }
          body={
            tripAwards.length > 0
              ? 'Review the ceremony board and lock in the weekend superlatives.'
              : 'Vote on the trip characters, moments, and superlatives.'
          }
          footerLabel="View awards"
          icon={<Sparkles size={18} strokeWidth={1.8} />}
          accentClassName="bg-[color:var(--masters-deep)]/10 text-[var(--masters-deep)]"
        />

        <DashboardCard
          href="/social"
          eyebrow="Journal"
          title={
            latestPost
              ? `${latestPost.authorName} said:`
              : `${banterPosts.length} trip note${banterPosts.length === 1 ? '' : 's'}`
          }
          body={
            latestPost
              ? `“${truncateText(latestPost.content, 88)}”`
              : 'Photos, banter, and the running memory of the trip.'
          }
          footerLabel="Open journal"
          icon={<MessageSquareText size={18} strokeWidth={1.8} />}
          accentClassName="bg-[color:var(--warning)]/10 text-[var(--warning)]"
        />
      </div>
    </section>
  );
}

function DashboardStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-[1rem] border border-[var(--rule)] bg-[var(--canvas)] px-[var(--space-3)] py-[var(--space-3)]">
      <p className="type-micro uppercase tracking-[0.14em] text-[var(--ink-tertiary)]">{label}</p>
      <p className="mt-[4px] font-serif text-[1.35rem] italic text-[var(--ink)]">{value}</p>
    </div>
  );
}

function DashboardCard({
  href,
  eyebrow,
  title,
  body,
  footerLabel,
  icon,
  accentClassName,
}: {
  href: string;
  eyebrow: string;
  title: string;
  body: string;
  footerLabel: string;
  icon: ReactNode;
  accentClassName: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-[1.3rem] border border-[var(--rule)] bg-[color:var(--canvas)]/85 p-[var(--space-4)] no-underline shadow-[0_10px_24px_rgba(46,34,18,0.04)] transition-transform duration-200 hover:-translate-y-[1px]"
    >
      <div className="flex items-start justify-between gap-[var(--space-3)]">
        <div className={`inline-flex rounded-full px-[var(--space-3)] py-[var(--space-2)] ${accentClassName}`}>
          {icon}
        </div>
        <span className="type-micro uppercase tracking-[0.14em] text-[var(--ink-tertiary)]">
          {eyebrow}
        </span>
      </div>
      <h3 className="mt-[var(--space-4)] text-[1.05rem] font-semibold leading-[1.2] text-[var(--ink)]">
        {title}
      </h3>
      <p className="mt-[var(--space-2)] text-sm leading-[1.55] text-[var(--ink-secondary)]">
        {body}
      </p>
      <div className="mt-[var(--space-4)] flex items-center gap-[var(--space-2)] text-sm font-medium text-[var(--masters)]">
        <span>{footerLabel}</span>
        <ChevronRight
          size={16}
          strokeWidth={1.8}
          className="transition-transform duration-200 group-hover:translate-x-[2px]"
        />
      </div>
    </Link>
  );
}

function getNextSession(sessions: RyderCupSession[]): RyderCupSession | null {
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

function buildStandingsNarrative(
  standings: TeamStandings,
  teamAName: string,
  teamBName: string
): string {
  const diff = Math.abs(standings.teamAPoints - standings.teamBPoints);
  if (diff === 0) return 'The team match is all square right now.';

  const leader = standings.teamAPoints > standings.teamBPoints ? teamAName : teamBName;
  return `${leader} leads by ${diff} point${diff === 1 ? '' : 's'}.`;
}

function buildUserMatchTitle(
  userMatchData: UserMatchData | null,
  currentUserPlayer: Player | null
): string {
  if (userMatchData?.match.status === 'inProgress') return 'Your match is live';
  if (userMatchData) return `Match ${userMatchData.match.matchOrder} is on your card`;
  if (currentUserPlayer) return 'Your tee sheet lives here';
  return 'Link your profile to personalize';
}

function buildUserMatchBody(
  userMatchData: UserMatchData | null,
  currentUserPlayer: Player | null,
  players: Player[]
): string {
  if (!userMatchData) {
    return currentUserPlayer
      ? 'Open the schedule to see your upcoming matches and assigned pairings.'
      : 'Connect your profile so the app can find your matches and tee times.';
  }

  const opponents = resolveOpponents(userMatchData.match, currentUserPlayer, players);
  const opponentLine = opponents.length > 0 ? opponents.join(' & ') : 'Opponents pending';
  const format = userMatchData.session.sessionType === 'fourball'
    ? 'Four-Ball'
    : userMatchData.session.sessionType === 'foursomes'
      ? 'Foursomes'
      : 'Singles';

  return `${format} against ${opponentLine}. ${
    userMatchData.match.status === 'inProgress'
      ? 'Jump back into scoring.'
      : `Tee time ${formatSessionTiming(userMatchData.session)}.`
  }`;
}

function resolveOpponents(
  match: Match,
  currentUserPlayer: Player | null,
  players: Player[]
): string[] {
  if (!currentUserPlayer) return [];

  const isTeamA = match.teamAPlayerIds.includes(currentUserPlayer.id);
  const isTeamB = match.teamBPlayerIds.includes(currentUserPlayer.id);
  const opponentIds = isTeamA ? match.teamBPlayerIds : isTeamB ? match.teamAPlayerIds : [];

  return opponentIds
    .map((playerId) => players.find((player) => player.id === playerId))
    .filter(Boolean)
    .map((player) => formatPlayerName(player!.firstName, player!.lastName, 'short'));
}

function formatSessionTiming(session: RyderCupSession): string {
  const dateLabel = session.scheduledDate ? formatDate(session.scheduledDate, 'short') : 'Date TBD';
  return session.timeSlot ? `${dateLabel} ${session.timeSlot}` : dateLabel;
}

function truncateText(value: string, maxLength: number): string {
  const trimmed = value.trim();
  if (trimmed.length <= maxLength) return trimmed;
  return `${trimmed.slice(0, maxLength - 1).trimEnd()}…`;
}
