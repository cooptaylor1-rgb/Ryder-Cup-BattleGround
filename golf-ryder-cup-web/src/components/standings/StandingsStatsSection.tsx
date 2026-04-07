import Link from 'next/link';

import { EmptyStatePremium } from '@/components/ui';
import { STAT_DEFINITIONS, type TripStatType } from '@/lib/types/tripStats';
import { Star, TrendingUp } from 'lucide-react';

import type { HighlightStat } from './StandingsTypes';
import { StandingsSectionHeading } from './StandingsShellSection';

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
            title="No stats yet"
            description="Leaders and highlights appear after the first hole is scored."
            action={{
              label: 'Open matchups',
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
