import Link from 'next/link';

import type { Award, PlayerStats } from '@/lib/types/awards';
import {
  Award as AwardIcon,
  Crown,
  Flame,
  Medal,
  TrendingUp,
  Trophy,
  Zap,
} from 'lucide-react';

import { StandingsSectionHeading } from './StandingsShellSection';

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
        <div className="px-[var(--space-4)] py-[var(--space-6)] text-center">
          {/* Compact empty state — was 12-unit vertical chrome for two
              lines of content. Per docs/TERMINOLOGY.md empty states are
              one-line facts, not pep talks. */}
          <p className="type-body text-[var(--ink-tertiary)]">
            🏆 Awards unlock as matches complete.
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
