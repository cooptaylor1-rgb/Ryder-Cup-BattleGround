'use client';

import {
  Award,
  BarChart3,
  Medal,
  MessageSquare,
  Star,
  Swords,
  Trophy,
  Users,
  Zap,
} from 'lucide-react';
import { EmptyStatePremium } from '@/components/ui';
import { stripHtml } from '@/lib/utils/sanitize';
import type { FunStatHighlight, TripHighlight, TripRecapData } from '@/lib/services/recapService';

// The "photos" tab was on this list before the photo-share feature
// was cut. The Dexie tables it backed never had a writer in
// production so the tab was always an empty state. Removed along
// with the feature's client-side remnants in the same commit.
export type RecapSection = 'overview' | 'leaderboard' | 'matches' | 'stats' | 'banter';

export const RECAP_SECTIONS: { id: RecapSection; label: string; icon: typeof Trophy }[] = [
  { id: 'overview', label: 'Overview', icon: Trophy },
  { id: 'leaderboard', label: 'Players', icon: Users },
  { id: 'matches', label: 'Matches', icon: Swords },
  { id: 'stats', label: 'Stats', icon: BarChart3 },
  { id: 'banter', label: 'Banter', icon: MessageSquare },
];

export function HeroBanner({ recap }: { recap: TripRecapData }) {
  const winnerGradient =
    recap.winner === 'usa'
      ? 'from-[color:var(--team-usa-gradient-start)] to-[color:var(--team-usa-gradient-end)]'
      : recap.winner === 'europe'
        ? 'from-[color:var(--team-europe-gradient-start)] to-[color:var(--team-europe-gradient-end)]'
        : 'from-[color:var(--masters)] to-[color:var(--masters-deep)]';

  return (
    <div className={`relative p-8 rounded-2xl overflow-hidden bg-gradient-to-br ${winnerGradient}`}>
      <div className="absolute top-4 right-4 opacity-10">
        <Trophy className="w-28 h-28 text-[var(--canvas)]" />
      </div>

      <div className="relative z-10">
        <h1 className="text-2xl font-bold text-[var(--canvas)]">{recap.narrative.headline}</h1>
        <p className="text-[color:var(--canvas)]/70 text-sm mt-2 leading-relaxed max-w-lg">
          {recap.narrative.body}
        </p>

        <div className="flex items-center gap-8 mt-8">
          <div className={`text-center ${recap.winner === 'usa' ? 'scale-110' : ''}`}>
            <div className="text-3xl mb-1">🇺🇸</div>
            <div className="text-[var(--canvas)] text-4xl font-bold">{recap.finalScore.usa}</div>
            <div className="text-[color:var(--canvas)]/60 text-sm">USA</div>
          </div>

          <div className="text-[color:var(--canvas)]/30 text-2xl font-light">-</div>

          <div className={`text-center ${recap.winner === 'europe' ? 'scale-110' : ''}`}>
            <div className="text-3xl mb-1">🇪🇺</div>
            <div className="text-[var(--canvas)] text-4xl font-bold">{recap.finalScore.europe}</div>
            <div className="text-[color:var(--canvas)]/60 text-sm">EUR</div>
          </div>
        </div>

        <div className="mt-6">
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[color:var(--canvas)]/12 text-[var(--canvas)] text-sm font-semibold">
            <Trophy size={16} className="text-[color:var(--gold)]" />
            {recap.winner === 'halved' ? 'Cup Halved!' : `Team ${recap.winner.toUpperCase()} Wins!`}
          </span>
        </div>
      </div>
    </div>
  );
}

export function OverviewSection({ recap }: { recap: TripRecapData }) {
  const mvp = recap.awards.find((award) => award.type === 'mvp');
  const completedMatches = recap.matchResults.length;

  return (
    <div className="space-y-4">
      {mvp?.winner ? (
        <div className="p-4 rounded-xl bg-[color:var(--gold)]/12 border border-[color:var(--gold)]/30">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-full bg-[color:var(--gold)]/20">
              <Award className="w-6 h-6 text-[color:var(--gold)]" />
            </div>
            <div className="flex-1">
              <div className="text-sm text-[color:var(--gold)] font-medium">Tournament MVP</div>
              <div className="text-lg font-bold">{mvp.winner.playerName}</div>
              <div className="text-sm text-[var(--ink-tertiary)]">{mvp.description}</div>
            </div>
            <span className="text-2xl">{mvp.winner.teamColor === 'usa' ? '🇺🇸' : '🇪🇺'}</span>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3">
        <div className="card p-4 rounded-xl">
          <div className="flex items-center gap-2 text-[var(--ink-tertiary)] mb-1">
            <Swords size={14} />
            <span className="text-xs">Matches Played</span>
          </div>
          <div className="text-2xl font-bold">{completedMatches}</div>
        </div>
        <div className="card p-4 rounded-xl">
          <div className="flex items-center gap-2 text-[var(--ink-tertiary)] mb-1">
            <Users size={14} />
            <span className="text-xs">Players</span>
          </div>
          <div className="text-2xl font-bold">{recap.playerLeaderboard.length}</div>
        </div>
      </div>

      {recap.awards.length > 0 ? (
        <div>
          <h3 className="type-overline mb-3">Awards</h3>
          <div className="space-y-2">
            {recap.awards
              .filter((award) => award.winner)
              .map((award) => (
                <div
                  key={award.type}
                  className="flex items-center gap-3 p-3 rounded-lg bg-[var(--surface-card)] border border-[var(--rule)]"
                >
                  <span className="text-xl">{award.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{award.title}</div>
                    <div className="text-xs text-[var(--ink-tertiary)] truncate">{award.winner?.playerName}</div>
                  </div>
                  <span className="text-sm font-bold text-[var(--ink-secondary)]">{award.winner?.value}</span>
                </div>
              ))}
          </div>
        </div>
      ) : null}

      {recap.highlights.length > 0 ? (
        <div>
          <h3 className="type-overline mb-3">Key Moments</h3>
          <div className="space-y-2">
            {recap.highlights.map((highlight: TripHighlight, index: number) => (
              <div
                key={`${highlight.type}-${index}`}
                className="flex items-start gap-3 p-3 rounded-lg bg-[var(--surface-card)] border border-[var(--rule)]"
              >
                <span className="text-xl mt-0.5">{highlight.emoji}</span>
                <div>
                  <div className="font-medium text-sm">{highlight.title}</div>
                  <div className="text-xs text-[var(--ink-tertiary)]">{highlight.description}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {recap.dayRecaps.length > 0 ? (
        <div>
          <h3 className="type-overline mb-3">Day by Day</h3>
          <div className="space-y-2">
            {recap.dayRecaps.map((day, index) => (
              <div key={`${day.sessionName}-${index}`} className="p-3 rounded-lg bg-[var(--surface-card)] border border-[var(--rule)]">
                <div className="font-medium text-sm mb-1">{day.sessionName}</div>
                <div className="text-xs text-[var(--ink-secondary)] leading-relaxed">{day.recap}</div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function LeaderboardSection({ recap }: { recap: TripRecapData }) {
  if (recap.playerLeaderboard.length === 0) {
    return (
      <EmptyStatePremium
        illustration="scorecard"
        title="No player data"
        description="Complete matches to see the leaderboard."
        variant="compact"
      />
    );
  }

  return (
    <div className="space-y-2">
      {recap.playerLeaderboard.map((player, index) => (
        <div
          key={player.playerId}
          className="flex items-center gap-3 p-4 rounded-xl bg-[var(--surface-card)] border border-[var(--rule)]"
        >
          <div className="text-lg font-bold text-[var(--ink-tertiary)] w-8 text-center">
            {index === 0 ? <Medal size={20} className="text-[color:var(--gold-light)] mx-auto" /> : `#${index + 1}`}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-medium">{player.playerName}</div>
            <div className="text-sm text-[var(--ink-tertiary)]">
              {player.wins}W - {player.losses}L - {player.halves}H
            </div>
          </div>
          <span className="text-lg">{player.teamColor === 'usa' ? '🇺🇸' : '🇪🇺'}</span>
          <div className="text-right">
            <div className="text-xl font-bold">{player.points}</div>
            <div className="text-xs text-[var(--ink-tertiary)]">pts</div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function MatchesSection({ recap }: { recap: TripRecapData }) {
  const sessionGroups = new Map<string, typeof recap.matchResults>();
  for (const match of recap.matchResults) {
    const group = sessionGroups.get(match.sessionName) ?? [];
    group.push(match);
    sessionGroups.set(match.sessionName, group);
  }

  if (recap.matchResults.length === 0) {
    return (
      <EmptyStatePremium
        illustration="scorecard"
        title="No completed matches"
        description="Match results will appear here once matches are completed."
        variant="compact"
      />
    );
  }

  return (
    <div className="space-y-6">
      {Array.from(sessionGroups.entries()).map(([sessionName, matches]) => (
        <div key={sessionName}>
          <h3 className="text-sm font-medium text-[var(--ink-tertiary)] mb-2">{sessionName}</h3>
          <div className="space-y-2">
            {matches.map((match, index) => (
              <div
                key={`${sessionName}-${index}`}
                className="flex items-center gap-3 p-3 rounded-lg bg-[var(--surface-card)] border border-[var(--rule)]"
              >
                <div className="flex-1 text-sm font-medium">{match.teamANames}</div>
                <div className="px-3 py-1 rounded-full bg-[var(--surface-elevated)] text-xs font-bold">
                  {match.result}
                </div>
                <div className="flex-1 text-sm font-medium text-right">{match.teamBNames}</div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function StatsSection({ recap }: { recap: TripRecapData }) {
  if (recap.funStats.length === 0) {
    return (
      <EmptyStatePremium
        illustration="scorecard"
        title="No fun stats tracked"
        description="Track stats like beers, balls lost, and more during your trip."
        variant="compact"
      />
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {recap.funStats.map((stat: FunStatHighlight, index: number) => (
        <div
          key={`${stat.label}-${index}`}
          className="p-4 rounded-xl bg-[var(--surface-card)] border border-[var(--rule)] text-center"
        >
          <span className="text-2xl">{stat.emoji}</span>
          <div className="text-2xl font-bold mt-1">{stat.value}</div>
          <div className="text-xs text-[var(--ink-tertiary)] mt-0.5">{stat.label}</div>
          {stat.playerName ? (
            <div className="text-xs text-[var(--ink-secondary)] mt-1 flex items-center justify-center gap-1">
              <Star size={10} />
              {stat.playerName}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

export function BanterSection({ recap }: { recap: TripRecapData }) {
  if (recap.topTrashTalk.length === 0) {
    return (
      <EmptyStatePremium
        illustration="scorecard"
        title="No banter yet"
        description="The best trash talk from your trip will appear here."
        variant="compact"
      />
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="type-overline">Top Trash Talk</h3>
      {recap.topTrashTalk.map((post, index) => (
        <div key={`${post.authorName}-${index}`} className="p-4 rounded-xl bg-[var(--surface-card)] border border-[var(--rule)]">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-[var(--surface-elevated)] flex items-center justify-center text-sm font-bold">
              {post.authorName.charAt(0)}
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium">{post.authorName}</div>
              <p className="text-sm text-[var(--ink-secondary)] mt-1">{stripHtml(post.content)}</p>
              {post.reactionCount > 0 ? (
                <div className="flex items-center gap-1 mt-2 text-xs text-[var(--ink-tertiary)]">
                  <Zap size={12} />
                  {post.reactionCount} reaction{post.reactionCount !== 1 ? 's' : ''}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}


