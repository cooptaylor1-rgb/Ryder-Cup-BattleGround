import Link from 'next/link';
import type { ReactNode } from 'react';
import { EmptyStatePremium, NoStandingsPremiumEmpty } from '@/components/ui';
import { PathToVictoryCard } from '@/components/gamification/PathToVictoryCard';
import { STAT_DEFINITIONS, type TripStatType } from '@/lib/types/tripStats';
import type { TeamStandings, MagicNumber, PlayerLeaderboard } from '@/lib/types/computed';
import type { Award, PlayerStats } from '@/lib/types/awards';
import {
  Trophy,
  Crown,
  Flame,
  Zap,
  Award as AwardIcon,
  TrendingUp,
  Star,
  Medal,
  Share2,
  PartyPopper,
} from 'lucide-react';

export type StandingsTab = 'competition' | 'stats' | 'awards';

export interface HighlightStat {
  type: TripStatType;
  label: string;
  emoji: string;
  value: number;
  leader: string;
}

export function StandingsMasthead({
  standings,
  magicNumber,
  teamAName,
  teamBName,
  currentTripName,
  matchesCompleted,
  totalMatches,
}: {
  standings: TeamStandings | null;
  magicNumber: MagicNumber | null;
  teamAName: string;
  teamBName: string;
  currentTripName: string;
  matchesCompleted: number;
  totalMatches: number;
}) {
  const summary = !standings
    ? 'The board will take shape once matches are underway.'
    : standings.leader === 'teamA'
      ? `${teamAName} holds the edge.`
      : standings.leader === 'teamB'
        ? `${teamBName} has the upper hand.`
        : 'Everything is level.';

  const progress =
    totalMatches > 0 ? `${matchesCompleted} of ${totalMatches} matches complete` : 'Awaiting scores';

  return (
    <div className="overflow-hidden rounded-[2rem] border border-[var(--rule)] bg-[linear-gradient(180deg,rgba(255,255,255,0.82),rgba(248,244,237,0.94))] shadow-[0_22px_48px_rgba(46,34,18,0.08)]">
      <div className="border-b border-[color:var(--rule)]/80 px-[var(--space-5)] py-[var(--space-5)]">
        <p className="type-overline tracking-[0.18em] text-[var(--ink-tertiary)]">Leaderboard</p>
        <h1 className="mt-[var(--space-2)] font-serif text-[clamp(2rem,8vw,3.3rem)] italic leading-[1.02] text-[var(--ink)]">
          {currentTripName}
        </h1>
        <p className="mt-[var(--space-3)] type-body-sm text-[var(--ink-secondary)]">{summary}</p>
      </div>

      <div className="grid grid-cols-2 gap-[var(--space-3)] px-[var(--space-5)] py-[var(--space-5)] md:grid-cols-4">
        <StandingsFactCard label={teamAName} value={standings?.teamAPoints ?? '—'} />
        <StandingsFactCard label={teamBName} value={standings?.teamBPoints ?? '—'} />
        <StandingsFactCard
          label="Progress"
          value={progress}
          valueClassName="font-sans text-[0.95rem] not-italic"
        />
        <StandingsFactCard label="To Win" value={magicNumber?.pointsToWin ?? '—'} />
      </div>
    </div>
  );
}

export function TabButton({
  id,
  active,
  onClick,
  icon,
  label,
  controls,
}: {
  id: string;
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  label: string;
  controls: string;
}) {
  return (
    <button
      id={id}
      onClick={onClick}
      className={`press-scale flex flex-1 items-center justify-center gap-[var(--space-2)] rounded-[1rem] px-[var(--space-4)] py-[var(--space-3)] font-[family-name:var(--font-sans)] text-sm transition-all duration-200 ${
        active
          ? 'border border-[color:var(--masters-deep)] bg-[linear-gradient(135deg,var(--masters)_0%,var(--masters-deep)_100%)] font-semibold text-[var(--canvas)] shadow-[0_10px_24px_rgba(22,101,52,0.24)]'
          : 'border border-[var(--rule)] bg-[rgba(255,255,255,0.58)] font-medium text-[var(--ink-secondary)]'
      }`}
      aria-selected={active}
      aria-controls={controls}
      role="tab"
      tabIndex={active ? 0 : -1}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

export function CompetitionTab({
  standings,
  magicNumber,
  leaderboard,
  teamAName,
  teamBName,
  teamAId,
  pointsToWin,
  onShareStandings,
  isSharingStandings,
}: {
  standings: TeamStandings | null;
  magicNumber: MagicNumber | null;
  leaderboard: PlayerLeaderboard[];
  teamAName: string;
  teamBName: string;
  teamAId?: string;
  pointsToWin: number;
  onShareStandings: () => Promise<void> | void;
  isSharingStandings: boolean;
}) {
  if (!standings || !magicNumber) {
    return <EmptyState />;
  }

  return (
    <>
      <section className="section pt-[var(--space-7)]">
        <div className="rounded-[1.75rem] border border-[var(--rule)] bg-[linear-gradient(180deg,rgba(255,255,255,0.82),rgba(248,244,237,0.92))] p-[var(--space-5)] shadow-[0_20px_40px_rgba(46,34,18,0.08)]">
          <StandingsSectionHeading
            eyebrow="Competition"
            title="The board, in full."
            action={
              <button
                type="button"
                onClick={() => void onShareStandings()}
                disabled={isSharingStandings}
                className="inline-flex items-center gap-[var(--space-2)] rounded-xl border border-[var(--rule)] bg-[var(--canvas)] px-[var(--space-4)] py-[var(--space-2)] text-[length:var(--text-sm)] font-medium transition-colors hover:bg-[var(--surface-hover)] disabled:opacity-60"
                aria-label="Share standings card"
              >
                <Share2 size={16} />
                {isSharingStandings ? 'Sharing…' : 'Share Card'}
              </button>
            }
          />

          <div className="mt-[var(--space-5)] grid grid-cols-[1fr_auto_1fr] items-end gap-[var(--space-4)]">
            <StandingsScoreBlock
              teamName={teamAName}
              score={standings.teamAPoints}
              color="usa"
              isLeading={standings.teamAPoints >= standings.teamBPoints}
              animate={standings.leader !== null}
            />

            <div className="pb-[var(--space-5)] text-center">
              <p className="type-overline text-[var(--ink-faint)]">To Win</p>
              <p className="mt-[var(--space-2)] font-serif text-[1.8rem] italic text-[var(--ink-faint)]">
                {magicNumber.pointsToWin}
              </p>
            </div>

            <StandingsScoreBlock
              teamName={teamBName}
              score={standings.teamBPoints}
              color="europe"
              isLeading={standings.teamBPoints > standings.teamAPoints}
              animate={standings.leader !== null}
            />
          </div>

          <div className="mt-[var(--space-5)] grid grid-cols-2 gap-[var(--space-3)] md:grid-cols-4">
            <StandingsFactCard
              label="Matches Complete"
              value={`${standings.matchesCompleted}/${standings.totalMatches}`}
            />
            <StandingsFactCard label="Remaining" value={standings.remainingMatches} />
            <StandingsFactCard
              label="Leader"
              value={
                magicNumber.hasClinched
                  ? magicNumber.clinchingTeam === 'A'
                    ? teamAName
                    : teamBName
                  : standings.leader === 'teamA'
                    ? teamAName
                    : standings.leader === 'teamB'
                      ? teamBName
                      : 'All Square'
              }
            />
            <StandingsFactCard
              label="Magic Number"
              value={
                magicNumber.hasClinched
                  ? '0'
                  : standings.leader === 'teamA'
                    ? magicNumber.teamANeeded
                    : standings.leader === 'teamB'
                      ? magicNumber.teamBNeeded
                      : Math.min(magicNumber.teamANeeded, magicNumber.teamBNeeded)
              }
            />
          </div>

          <div className="mt-[var(--space-5)] rounded-[1.25rem] border border-[var(--rule)] bg-[rgba(255,255,255,0.7)] px-[var(--space-4)] py-[var(--space-4)]">
            {magicNumber.hasClinched ? (
              <div
                className={`victory-banner inline-flex ${magicNumber.clinchingTeam === 'A' ? 'victory-usa' : 'victory-europe'}`}
              >
                <div className="victory-icon">
                  <Trophy size={18} strokeWidth={1.75} />
                </div>
                <p className="text-base font-semibold">
                  {magicNumber.clinchingTeam === 'A' ? teamAName : teamBName} Wins
                </p>
              </div>
            ) : (
              <p className="font-serif text-[1.35rem] italic text-[var(--ink)]">
                {standings.leader === null
                  ? 'The match is all square.'
                  : `${standings.leader === 'teamA' ? teamAName : teamBName} controls the board.`}
              </p>
            )}

            {!magicNumber.hasClinched && (
              <p className="mt-[var(--space-2)] type-body-sm text-[var(--ink-secondary)]">
                {standings.leader === 'teamA'
                  ? `${teamAName} needs ${magicNumber.teamANeeded} more point${magicNumber.teamANeeded === 1 ? '' : 's'} to close the door.`
                  : standings.leader === 'teamB'
                    ? `${teamBName} needs ${magicNumber.teamBNeeded} more point${magicNumber.teamBNeeded === 1 ? '' : 's'} to close the door.`
                    : 'Every remaining match still matters.'}
              </p>
            )}
          </div>

          {standings.remainingMatches === 0 && standings.matchesCompleted > 0 && (
            <div className="mt-[var(--space-5)]">
              <Link
                href="/recap"
                className="flex w-full items-center justify-center gap-[var(--space-2)] rounded-xl bg-[var(--masters)] px-[var(--space-5)] py-[var(--space-3)] font-semibold text-[length:var(--text-sm)] text-[var(--canvas)] press-scale"
              >
                <PartyPopper size={18} />
                View Trip Recap & Share
                <Share2 size={16} />
              </Link>
            </div>
          )}
        </div>
      </section>

      {standings.remainingMatches > 0 && !magicNumber.hasClinched && (
        <section className="section-sm pb-0">
          <PathToVictoryCard
            standings={standings}
            pointsToWin={pointsToWin}
            teamAName={teamAName}
            teamBName={teamBName}
          />
        </section>
      )}

      <hr className="divider-lg" />

      <section className="section-sm rounded-[1.5rem] border border-[var(--rule)] bg-[var(--canvas-raised)] p-[var(--space-5)] shadow-[0_12px_30px_rgba(46,34,18,0.05)]">
        <StandingsSectionHeading
          eyebrow="Individual Leaders"
          title="Who is carrying the points."
        />

        {leaderboard.length > 0 ? (
          <div className="stagger-fast mt-[var(--space-5)]">
            {leaderboard.map((entry, index) => (
              <PlayerRow
                key={entry.playerId}
                entry={entry}
                rank={index + 1}
                isTeamA={entry.teamId === teamAId}
                teamALabel={teamAName.slice(0, 3).toUpperCase()}
                teamBLabel={teamBName.slice(0, 3).toUpperCase()}
                animationDelay={index * 50}
              />
            ))}
          </div>
        ) : (
          <p className="type-caption px-0 py-[var(--space-10)] text-center">
            Complete matches to see individual standings
          </p>
        )}
      </section>
    </>
  );
}

export function FunStatsTab({
  statTotals,
  highlightStats,
  onGoToMatchups,
  onGoToTripStats,
}: {
  statTotals: Map<TripStatType, { total: number; leader: string; leaderValue: number }>;
  highlightStats: HighlightStat[];
  onGoToMatchups: () => void;
  onGoToTripStats: () => void;
}) {
  const categories = [
    {
      key: 'golf_highlights',
      label: 'Highlights',
      emoji: '⭐',
      types: ['birdies', 'eagles', 'chip_ins', 'longest_putt', 'longest_drive', 'closest_to_pin'],
    },
    {
      key: 'golf_mishaps',
      label: 'Mishaps',
      emoji: '😅',
      types: [
        'balls_lost',
        'sand_traps',
        'water_hazards',
        'mulligans',
        'club_throws',
        'whiffs',
        'shanks',
        'four_putts',
      ],
    },
    {
      key: 'beverages',
      label: 'Beverages',
      emoji: '🍺',
      types: ['beers', 'cocktails', 'shots', 'waters', 'cigars', 'snacks'],
    },
    {
      key: 'cart_chaos',
      label: 'Cart Chaos',
      emoji: '🛒',
      types: ['cart_path_violations', 'near_misses', 'stuck_in_mud', 'wrong_fairway'],
    },
    {
      key: 'social',
      label: 'Social',
      emoji: '😂',
      types: ['late_to_tee', 'phone_checks', 'naps_taken', 'excuses_made', 'rules_argued'],
    },
  ];

  const hasAnyStats = statTotals.size > 0;
  const hasDisplayableStats = Array.from(statTotals.values()).some((value) => value.total > 0);

  const displayCategories = categories
    .map((category) => {
      const stats = category.types.reduce(
        (
          acc,
          statType
        ): Array<{
          statType: string;
          label: string;
          description: string;
          emoji: string;
          isNegative?: boolean;
          total: number;
          leader: string;
          leaderValue: number;
        }> => {
          const data = statTotals.get(statType as TripStatType);
          if (!data || data.total === 0) return acc;
          const definition = STAT_DEFINITIONS[statType as TripStatType];
          acc.push({ statType, ...definition, ...data });
          return acc;
        },
        []
      );

      return { category, stats };
    })
    .filter((entry) => entry.stats.length > 0);

  return (
    <section className="section-sm rounded-[1.5rem] border border-[var(--rule)] bg-[var(--canvas-raised)] p-[var(--space-5)] shadow-[0_12px_30px_rgba(46,34,18,0.05)]">
      <StandingsSectionHeading eyebrow="Fun Stats" title="The side stories worth remembering." />
      {!hasAnyStats || (!hasDisplayableStats && highlightStats.length === 0) ? (
        <div className="mt-[var(--space-5)]">
          <EmptyStatePremium
            illustration="podium"
            title="No trip stats yet"
            description="As soon as scores and side stats are entered, you'll see leaders and highlights here."
            action={{
              label: 'Go score a match',
              onClick: onGoToMatchups,
              icon: <TrendingUp size={18} strokeWidth={2} />,
            }}
            variant="compact"
          />
        </div>
      ) : null}

      {highlightStats.length > 0 && (
        <>
          <div className="mb-[var(--space-6)] mt-[var(--space-5)]">
            <p className="mb-[var(--space-3)] type-overline">Trip Highlights</p>
            <div className="grid grid-cols-2 gap-[var(--space-3)] sm:grid-cols-3">
              {highlightStats.slice(0, 6).map((stat) => (
                <div
                  key={stat.type}
                  className="rounded-[1.25rem] border border-[var(--rule)] bg-[rgba(255,255,255,0.72)] p-[var(--space-4)] text-center"
                >
                  <span className="text-2xl">{stat.emoji}</span>
                  <p className="mt-[var(--space-1)] type-title-lg">{stat.value}</p>
                  <p className="type-micro text-[var(--ink-tertiary)]">{stat.label}</p>
                  {stat.leader && (
                    <p className="mt-[var(--space-1)] type-micro text-[var(--masters)]">
                      👑 {stat.leader}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
          <hr className="divider-lg" />
        </>
      )}

      {hasDisplayableStats && displayCategories.length > 0 ? (
        displayCategories.map(({ category, stats }) => (
          <div key={category.key} className="mb-[var(--space-8)]">
            <h3 className="mb-[var(--space-4)] flex items-center gap-[var(--space-2)] type-overline">
              <span>{category.emoji}</span>
              <span>{category.label}</span>
            </h3>
            <div className="space-y-3">
              {stats.map((stat) => (
                <div
                  key={stat.statType}
                  className="flex items-center justify-between rounded-[1.25rem] border border-[var(--rule)] bg-[rgba(255,255,255,0.72)] px-[var(--space-4)] py-[var(--space-3)]"
                >
                  <div className="flex items-center gap-[var(--space-3)]">
                    <span className="text-xl">{stat.emoji}</span>
                    <div>
                      <p className="type-body-sm">{stat.label}</p>
                      <p className="type-micro text-[var(--ink-tertiary)]">{stat.description}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p
                      className={`type-title ${stat.isNegative ? 'text-[var(--error)]' : 'text-[var(--masters)]'}`}
                    >
                      {stat.total}
                    </p>
                    {stat.leader && (
                      <p className="type-micro text-[var(--ink-tertiary)]">👑 {stat.leader}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      ) : (
        <div className="mb-[var(--space-8)]">
          <EmptyStatePremium
            illustration="trophy"
            title="No stats yet"
            description="Track beverages, mishaps, highlights, and more during your rounds."
            action={{
              label: 'Start Tracking',
              onClick: onGoToTripStats,
              icon: <Star size={18} strokeWidth={2} />,
            }}
            variant="compact"
          />
        </div>
      )}

      {hasDisplayableStats && (
        <Link
          href="/trip-stats"
          className="press-scale mt-[var(--space-4)] flex items-center justify-between rounded-[1.25rem] border border-[var(--rule)] bg-[rgba(255,255,255,0.72)] p-[var(--space-4)] text-inherit no-underline"
        >
          <div className="flex items-center gap-[var(--space-3)]">
            <Star size={20} className="text-[var(--masters)]" />
            <span className="type-body-sm">View All Stats & Track More</span>
          </div>
          <span className="text-[var(--ink-tertiary)]">→</span>
        </Link>
      )}
    </section>
  );
}

export function AwardsTab({
  awards,
  playerStats,
}: {
  awards: Award[];
  playerStats: PlayerStats[];
}) {
  const getAwardIcon = (type: string) => {
    switch (type) {
      case 'mvp':
        return <Crown size={24} className="text-[var(--color-accent)]" />;
      case 'best-record':
        return <TrendingUp size={24} className="text-[var(--masters)]" />;
      case 'most-wins':
        return <Trophy size={24} className="text-[var(--masters)]" />;
      case 'most-halves':
        return <Medal size={24} className="text-[var(--ink-secondary)]" />;
      case 'biggest-win':
        return <Flame size={24} className="text-[var(--error)]" />;
      case 'iron-man':
        return <Zap size={24} className="text-[var(--team-usa)]" />;
      case 'streak-master':
        return <TrendingUp size={24} className="text-[var(--team-europe)]" />;
      default:
        return <AwardIcon size={24} className="text-[var(--masters)]" />;
    }
  };

  const hasAwards = awards.some((award) => award.winner);

  return (
    <section className="section-sm rounded-[1.5rem] border border-[var(--rule)] bg-[var(--canvas-raised)] p-[var(--space-5)] shadow-[0_12px_30px_rgba(46,34,18,0.05)]">
      <StandingsSectionHeading eyebrow="Trip Superlatives" title="The honors board." />

      <div className="mb-[var(--space-5)] mt-[var(--space-5)] flex flex-col gap-[var(--space-3)] rounded-[1.25rem] border border-[var(--rule)] bg-[linear-gradient(180deg,rgba(255,255,255,0.78),rgba(248,244,237,0.88))] p-[var(--space-4)]">
        <div className="flex items-center gap-[var(--space-3)]">
          <Crown size={24} className="text-[var(--color-accent)]" />
          <div>
            <p className="type-title-sm">End-of-Trip Highlights</p>
            <p className="type-caption text-[var(--ink-tertiary)]">
              Vote for MVP and crown the trip superlatives.
            </p>
          </div>
        </div>
        <Link
          href="/trip-stats/awards"
          className="btn-premium px-[var(--space-4)] py-[var(--space-3)] text-center"
        >
          Vote for MVP & Awards
        </Link>
      </div>

      {hasAwards ? (
        <div className="space-y-4">
          {awards.map((award) => (
            <div
              key={award.type}
              className={`rounded-[1.25rem] border border-[var(--rule)] bg-[rgba(255,255,255,0.72)] p-[var(--space-4)] ${award.winner ? '' : 'opacity-50'}`}
            >
              <div className="flex items-start gap-[var(--space-4)]">
                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-[var(--radius-lg)] ${
                    award.winner
                      ? 'bg-gradient-to-br from-[var(--masters)] to-[var(--masters-deep)]'
                      : 'bg-[var(--surface-elevated)]'
                  }`}
                >
                  {getAwardIcon(award.type)}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="type-title-sm">{award.title}</h3>
                  <p className="mt-0.5 type-micro text-[var(--ink-tertiary)]">
                    {award.description}
                  </p>
                  {award.winner ? (
                    <div className="mt-[var(--space-3)]">
                      <div className="flex items-center gap-[var(--space-2)]">
                        <span className={`team-dot team-dot-${award.winner.teamColor} h-2 w-2`} />
                        <span className="type-body-sm font-semibold">{award.winner.playerName}</span>
                        <span className="ml-auto type-caption text-[var(--masters)]">
                          {award.winner.value}
                        </span>
                      </div>
                      {award.runnerUp && (
                        <div className="mt-[var(--space-2)] flex items-center gap-[var(--space-2)] opacity-70">
                          <span className={`team-dot team-dot-${award.runnerUp.teamColor} h-1.5 w-1.5`} />
                          <span className="type-micro">{award.runnerUp.playerName}</span>
                          <span className="ml-auto type-micro">{award.runnerUp.value}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="mt-[var(--space-2)] type-micro text-[var(--ink-tertiary)]">
                      Not yet awarded
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="px-[var(--space-4)] py-[var(--space-12)] text-center">
          <div className="mb-[var(--space-4)] text-5xl">🏆</div>
          <h3 className="mb-[var(--space-2)] type-title">Awards Coming Soon</h3>
          <p className="type-body text-[var(--ink-tertiary)]">
            Complete some matches to unlock trip superlatives and see who earns the bragging rights!
          </p>
        </div>
      )}

      {playerStats.length > 0 && (
        <>
          <hr className="divider-lg my-[var(--space-8)]" />
          <h2 className="mb-[var(--space-6)] type-overline">Player Records</h2>
          <div className="grid grid-cols-2 gap-[var(--space-3)]">
            <RecordCard
              label="Most Points"
              emoji="🏆"
              stats={playerStats}
              getValue={(stat) => stat.points}
              formatValue={(value) => `${value} pts`}
            />
            <RecordCard
              label="Best Win %"
              emoji="📈"
              stats={playerStats.filter((stat) => stat.matchesPlayed >= 2)}
              getValue={(stat) => stat.winPercentage}
              formatValue={(value) => `${value.toFixed(0)}%`}
            />
            <RecordCard
              label="Most Holes Won"
              emoji="⛳"
              stats={playerStats}
              getValue={(stat) => stat.holesWon}
              formatValue={(value) => `${value}`}
            />
            <RecordCard
              label="Win Streak"
              emoji="🔥"
              stats={playerStats}
              getValue={(stat) => stat.longestWinStreak}
              formatValue={(value) => `${value} wins`}
            />
          </div>
        </>
      )}

      <Link
        href="/achievements"
        className="press-scale mt-[var(--space-6)] flex items-center justify-between rounded-[1.25rem] border border-[var(--rule)] bg-[rgba(255,255,255,0.72)] p-[var(--space-4)] text-inherit no-underline"
      >
        <div className="flex items-center gap-[var(--space-3)]">
          <Medal size={20} className="text-[var(--color-accent)]" />
          <span className="type-body-sm">View All Achievements & Badges</span>
        </div>
        <span className="text-[var(--ink-tertiary)]">→</span>
      </Link>
    </section>
  );
}

function StandingsSectionHeading({
  eyebrow,
  title,
  action,
}: {
  eyebrow: ReactNode;
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-[var(--space-4)]">
      <div className="min-w-0">
        <p className="type-overline text-[var(--ink-tertiary)]">{eyebrow}</p>
        <h2 className="mt-[var(--space-2)] font-serif text-[clamp(1.45rem,5vw,2rem)] italic leading-[1.08] text-[var(--ink)]">
          {title}
        </h2>
      </div>
      {action && <div className="shrink-0 pt-[2px]">{action}</div>}
    </div>
  );
}

function StandingsScoreBlock({
  teamName,
  score,
  color,
  isLeading,
  animate,
}: {
  teamName: string;
  score: number;
  color: 'usa' | 'europe';
  isLeading: boolean;
  animate: boolean;
}) {
  const teamColor = color === 'usa' ? 'var(--team-usa)' : 'var(--team-europe)';
  const gradient =
    color === 'usa'
      ? 'linear-gradient(180deg,rgba(27,59,119,0.08),rgba(255,255,255,0.62))'
      : 'linear-gradient(180deg,rgba(160,42,63,0.08),rgba(255,255,255,0.62))';

  return (
    <div
      className="rounded-[1.5rem] border px-[var(--space-4)] py-[var(--space-5)] text-center"
      style={{
        borderColor: `color-mix(in srgb, ${teamColor} 16%, white)`,
        background: gradient,
      }}
    >
      <span
        className={`team-dot team-dot-xl team-dot-${color} mb-[var(--space-4)] inline-block ${animate ? 'team-dot-pulse' : ''}`}
      />
      <p
        className="score-monumental"
        style={{ color: isLeading ? teamColor : 'var(--ink-tertiary)' }}
      >
        {score}
      </p>
      <p className="type-overline mt-[var(--space-3)]" style={{ color: teamColor }}>
        {teamName}
      </p>
    </div>
  );
}

function StandingsFactCard({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: ReactNode;
  valueClassName?: string;
}) {
  return (
    <div className="rounded-[1.1rem] border border-[var(--rule)] bg-[rgba(255,255,255,0.68)] px-[var(--space-4)] py-[var(--space-3)]">
      <p className="type-micro uppercase tracking-[0.14em] text-[var(--ink-tertiary)]">{label}</p>
      <p
        className={`mt-[2px] font-serif text-[1.25rem] italic leading-[1.2] text-[var(--ink)] ${valueClassName ?? ''}`}
      >
        {value}
      </p>
    </div>
  );
}

function RecordCard({
  label,
  emoji,
  stats,
  getValue,
  formatValue,
}: {
  label: string;
  emoji: string;
  stats: PlayerStats[];
  getValue: (stat: PlayerStats) => number;
  formatValue: (value: number) => string;
}) {
  const sorted = [...stats].sort((a, b) => getValue(b) - getValue(a));
  const leader = sorted[0];

  if (!leader || getValue(leader) === 0) {
    return (
      <div className="rounded-[1.1rem] border border-[var(--rule)] bg-[rgba(255,255,255,0.68)] p-[var(--space-3)] text-center opacity-50">
        <span className="text-xl">{emoji}</span>
        <p className="mt-[var(--space-1)] type-micro text-[var(--ink-tertiary)]">{label}</p>
        <p className="type-micro">-</p>
      </div>
    );
  }

  return (
    <div className="rounded-[1.1rem] border border-[var(--rule)] bg-[rgba(255,255,255,0.68)] p-[var(--space-3)] text-center">
      <span className="text-xl">{emoji}</span>
      <p className="mt-[var(--space-1)] type-micro text-[var(--ink-tertiary)]">{label}</p>
      <p className="type-title-sm text-[var(--masters)]">{formatValue(getValue(leader))}</p>
      <div className="mt-[var(--space-1)] flex items-center justify-center gap-[var(--space-1)]">
        <span className={`team-dot team-dot-${leader.teamColor} h-1.5 w-1.5`} />
        <p className="type-micro">{leader.playerName.split(' ')[0]}</p>
      </div>
    </div>
  );
}

function PlayerRow({
  entry,
  rank,
  isTeamA,
  teamALabel,
  teamBLabel,
  animationDelay = 0,
}: {
  entry: PlayerLeaderboard;
  rank: number;
  isTeamA: boolean;
  teamALabel?: string;
  teamBLabel?: string;
  animationDelay?: number;
}) {
  const isTopThree = rank <= 3;
  const accent = isTeamA ? 'var(--team-usa)' : 'var(--team-europe)';

  return (
    <div
      className="player-row stagger-item flex items-center gap-[var(--space-4)] rounded-[1.1rem] border px-[var(--space-4)] py-[var(--space-3)]"
      style={{
        animationDelay: `${animationDelay}ms`,
        borderColor: `color-mix(in srgb, ${accent} 14%, white)`,
        background: `linear-gradient(90deg, color-mix(in srgb, ${accent} 7%, white) 0%, rgba(255,255,255,0.82) 30%, rgba(255,255,255,0.82) 100%)`,
      }}
    >
      <span
        className={`w-7 text-center text-sm font-semibold ${isTopThree ? 'text-[var(--masters)]' : 'text-[var(--ink-tertiary)]'}`}
      >
        {rank}
      </span>
      <span
        className={`${isTeamA ? 'team-badge team-badge-usa' : 'team-badge team-badge-europe'} px-[var(--space-2)] py-[var(--space-1)] text-xs`}
      >
        {isTeamA ? teamALabel || 'USA' : teamBLabel || 'EUR'}
      </span>
      <div className="min-w-0 flex-1">
        <p className="type-title-sm">{entry.playerName}</p>
        <p className="mt-0.5 type-micro">
          {entry.record} · {entry.matchesPlayed} {entry.matchesPlayed === 1 ? 'match' : 'matches'}
        </p>
      </div>
      <span
        className={`score-medium ${isTopThree ? 'text-[var(--masters)]' : 'text-[var(--ink)]'}`}
      >
        {entry.points}
      </span>
    </div>
  );
}

function EmptyState() {
  return <NoStandingsPremiumEmpty />;
}
