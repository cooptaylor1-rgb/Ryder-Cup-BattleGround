'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useTripStore } from '@/lib/stores';
import { generateTripRecap, type TripRecapData, type FunStatHighlight, type TripHighlight } from '@/lib/services/recapService';
import { EmptyStatePremium } from '@/components/ui';
import { BottomNav, PageHeader } from '@/components/layout';
import {
  Trophy,
  Award,
  Users,
  Swords,
  BarChart3,
  MessageSquare,
  Camera,
  Zap,
  Share2,
  Medal,
  Star,
} from 'lucide-react';

/**
 * TRIP RECAP PAGE
 *
 * "Year in review" for your buddies golf trip.
 * Aggregates awards, stats, banter, photos, and match results
 * into a shareable, scrollable highlight reel.
 */

type Section = 'overview' | 'leaderboard' | 'matches' | 'stats' | 'banter' | 'photos';

export default function RecapPage() {
  const router = useRouter();
  const { currentTrip } = useTripStore();
  const [recap, setRecap] = useState<TripRecapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<Section>('overview');

  const loadRecap = useCallback(async () => {
    if (!currentTrip) return;
    setLoading(true);
    try {
      const data = await generateTripRecap(currentTrip.id);
      setRecap(data);
    } catch {
      // Failed to generate recap
    } finally {
      setLoading(false);
    }
  }, [currentTrip]);

  useEffect(() => {
    loadRecap();
  }, [loadRecap]);

  const handleShare = async () => {
    if (!recap) return;
    const text = `${recap.narrative.headline}\n\nFinal Score: USA ${recap.finalScore.usa} - ${recap.finalScore.europe} Europe\n\n${recap.narrative.body}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: `${recap.tripName} Recap`, text });
      } else {
        await navigator.clipboard.writeText(text);
      }
    } catch {
      // Share cancelled or unsupported
    }
  };

  if (!currentTrip) {
    return (
      <div className="min-h-screen pb-nav page-premium-enter texture-grain bg-[var(--canvas)]">
        <main className="container-editorial py-12">
          <EmptyStatePremium
            illustration="scorecard"
            title="No trip selected"
            description="Select a trip to view its recap."
            action={{ label: 'Go Home', onClick: () => router.push('/') }}
            variant="large"
          />
        </main>
        <BottomNav />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen pb-nav page-premium-enter texture-grain bg-[var(--canvas)]">
        <PageHeader
          title="Trip Recap"
          icon={<Trophy size={16} className="text-[var(--color-accent)]" />}
          onBack={() => router.back()}
        />
        <main className="container-editorial py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-56 rounded-2xl bg-[var(--surface-elevated)]" />
            <div className="h-10 rounded-lg bg-[var(--surface-elevated)] w-3/4 mx-auto" />
            <div className="grid grid-cols-2 gap-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-24 rounded-xl bg-[var(--surface-elevated)]" />
              ))}
            </div>
          </div>
        </main>
        <BottomNav />
      </div>
    );
  }

  if (!recap) {
    return (
      <div className="min-h-screen pb-nav page-premium-enter texture-grain bg-[var(--canvas)]">
        <PageHeader
          title="Trip Recap"
          icon={<Trophy size={16} className="text-[var(--color-accent)]" />}
          onBack={() => router.back()}
        />
        <main className="container-editorial py-12">
          <EmptyStatePremium
            illustration="scorecard"
            title="No recap data"
            description="Complete some matches to generate your trip recap."
            action={{ label: 'Go to Matchups', onClick: () => router.push('/matchups') }}
            variant="large"
          />
        </main>
        <BottomNav />
      </div>
    );
  }

  const sections: { id: Section; label: string; icon: typeof Trophy }[] = [
    { id: 'overview', label: 'Overview', icon: Trophy },
    { id: 'leaderboard', label: 'Players', icon: Users },
    { id: 'matches', label: 'Matches', icon: Swords },
    { id: 'stats', label: 'Stats', icon: BarChart3 },
    { id: 'banter', label: 'Banter', icon: MessageSquare },
    { id: 'photos', label: 'Photos', icon: Camera },
  ];

  return (
    <div className="min-h-screen pb-nav page-premium-enter texture-grain bg-[var(--canvas)]">
      <PageHeader
        title="Trip Recap"
        subtitle={recap.tripName}
        icon={<Trophy size={16} className="text-[var(--color-accent)]" />}
        onBack={() => router.back()}
        rightSlot={
          <button
            onClick={handleShare}
            className="p-2 rounded-lg bg-[var(--surface-card)] border border-[var(--rule)]"
            aria-label="Share recap"
          >
            <Share2 size={18} />
          </button>
        }
      />

      <main className="container-editorial py-6">
        {/* Hero Banner */}
        <HeroBanner recap={recap} />

        {/* Section Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 mt-6 -mx-1 px-1 scrollbar-hide">
          {sections.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveSection(id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                activeSection === id
                  ? 'bg-[var(--masters)] text-[var(--canvas)]'
                  : 'bg-[var(--surface-card)] text-[var(--ink-tertiary)] border border-[var(--rule)]'
              }`}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>

        {/* Section Content */}
        <div className="mt-6">
          {activeSection === 'overview' && <OverviewSection recap={recap} />}
          {activeSection === 'leaderboard' && <LeaderboardSection recap={recap} />}
          {activeSection === 'matches' && <MatchesSection recap={recap} />}
          {activeSection === 'stats' && <StatsSection recap={recap} />}
          {activeSection === 'banter' && <BanterSection recap={recap} />}
          {activeSection === 'photos' && <PhotosSection recap={recap} />}
        </div>
      </main>

      <BottomNav />
    </div>
  );
}

// ============================================
// HERO BANNER
// ============================================

function HeroBanner({ recap }: { recap: TripRecapData }) {
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

        {/* Final Score */}
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

        {/* Winner badge */}
        <div className="mt-6">
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[color:var(--canvas)]/12 text-[var(--canvas)] text-sm font-semibold">
            <Trophy size={16} className="text-[color:var(--gold)]" />
            {recap.winner === 'halved'
              ? 'Cup Halved!'
              : `Team ${recap.winner.toUpperCase()} Wins!`}
          </span>
        </div>
      </div>
    </div>
  );
}

// ============================================
// OVERVIEW SECTION
// ============================================

function OverviewSection({ recap }: { recap: TripRecapData }) {
  const mvp = recap.awards.find(a => a.type === 'mvp');
  const completedMatches = recap.matchResults.length;

  return (
    <div className="space-y-4">
      {/* MVP Card */}
      {mvp?.winner && (
        <div className="p-4 rounded-xl bg-[color:var(--gold)]/12 border border-[color:var(--gold)]/30">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-full bg-[color:var(--gold)]/20">
              <Award className="w-6 h-6 text-[color:var(--gold)]" />
            </div>
            <div className="flex-1">
              <div className="text-sm text-[color:var(--gold)] font-medium">Tournament MVP</div>
              <div className="text-lg font-bold">{mvp.winner.playerName}</div>
              <div className="text-sm text-[var(--ink-tertiary)]">
                {mvp.description}
              </div>
            </div>
            <span className="text-2xl">{mvp.winner.teamColor === 'usa' ? '🇺🇸' : '🇪🇺'}</span>
          </div>
        </div>
      )}

      {/* Quick Stats Grid */}
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

      {/* Awards List */}
      {recap.awards.length > 0 && (
        <div>
          <h3 className="type-overline mb-3">Awards</h3>
          <div className="space-y-2">
            {recap.awards.filter(a => a.winner).map(award => (
              <div
                key={award.type}
                className="flex items-center gap-3 p-3 rounded-lg bg-[var(--surface-card)] border border-[var(--rule)]"
              >
                <span className="text-xl">{award.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{award.title}</div>
                  <div className="text-xs text-[var(--ink-tertiary)] truncate">{award.winner!.playerName}</div>
                </div>
                <span className="text-sm font-bold text-[var(--ink-secondary)]">
                  {award.winner!.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Highlights */}
      {recap.highlights.length > 0 && (
        <div>
          <h3 className="type-overline mb-3">Key Moments</h3>
          <div className="space-y-2">
            {recap.highlights.map((h: TripHighlight, i: number) => (
              <div
                key={i}
                className="flex items-start gap-3 p-3 rounded-lg bg-[var(--surface-card)] border border-[var(--rule)]"
              >
                <span className="text-xl mt-0.5">{h.emoji}</span>
                <div>
                  <div className="font-medium text-sm">{h.title}</div>
                  <div className="text-xs text-[var(--ink-tertiary)]">{h.description}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Day Recaps */}
      {recap.dayRecaps.length > 0 && (
        <div>
          <h3 className="type-overline mb-3">Day by Day</h3>
          <div className="space-y-2">
            {recap.dayRecaps.map((day, i) => (
              <div key={i} className="p-3 rounded-lg bg-[var(--surface-card)] border border-[var(--rule)]">
                <div className="font-medium text-sm mb-1">{day.sessionName}</div>
                <div className="text-xs text-[var(--ink-secondary)] leading-relaxed">{day.recap}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// LEADERBOARD SECTION
// ============================================

function LeaderboardSection({ recap }: { recap: TripRecapData }) {
  return (
    <div className="space-y-2">
      {recap.playerLeaderboard.map((player, i) => (
        <div
          key={player.playerId}
          className="flex items-center gap-3 p-4 rounded-xl bg-[var(--surface-card)] border border-[var(--rule)]"
        >
          <div className="text-lg font-bold text-[var(--ink-tertiary)] w-8 text-center">
            {i === 0 ? <Medal size={20} className="text-[color:var(--gold-light)] mx-auto" /> : `#${i + 1}`}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-medium">{player.playerName}</div>
            <div className="text-sm text-[var(--ink-tertiary)]">
              {player.wins}W - {player.losses}L - {player.halves}H
            </div>
          </div>
          <span className="text-lg">
            {player.teamColor === 'usa' ? '🇺🇸' : '🇪🇺'}
          </span>
          <div className="text-right">
            <div className="text-xl font-bold">{player.points}</div>
            <div className="text-xs text-[var(--ink-tertiary)]">pts</div>
          </div>
        </div>
      ))}

      {recap.playerLeaderboard.length === 0 && (
        <EmptyStatePremium
          illustration="scorecard"
          title="No player data"
          description="Complete matches to see the leaderboard."
          variant="compact"
        />
      )}
    </div>
  );
}

// ============================================
// MATCHES SECTION
// ============================================

function MatchesSection({ recap }: { recap: TripRecapData }) {
  // Group by session
  const sessionGroups = new Map<string, typeof recap.matchResults>();
  for (const match of recap.matchResults) {
    const group = sessionGroups.get(match.sessionName) ?? [];
    group.push(match);
    sessionGroups.set(match.sessionName, group);
  }

  return (
    <div className="space-y-6">
      {Array.from(sessionGroups.entries()).map(([sessionName, matches]) => (
        <div key={sessionName}>
          <h3 className="text-sm font-medium text-[var(--ink-tertiary)] mb-2">{sessionName}</h3>
          <div className="space-y-2">
            {matches.map((match, i) => (
              <div
                key={i}
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

      {recap.matchResults.length === 0 && (
        <EmptyStatePremium
          illustration="scorecard"
          title="No completed matches"
          description="Match results will appear here once matches are completed."
          variant="compact"
        />
      )}
    </div>
  );
}

// ============================================
// STATS SECTION
// ============================================

function StatsSection({ recap }: { recap: TripRecapData }) {
  return (
    <div className="space-y-3">
      {recap.funStats.length > 0 ? (
        <div className="grid grid-cols-2 gap-3">
          {recap.funStats.map((stat: FunStatHighlight, i: number) => (
            <div
              key={i}
              className="p-4 rounded-xl bg-[var(--surface-card)] border border-[var(--rule)] text-center"
            >
              <span className="text-2xl">{stat.emoji}</span>
              <div className="text-2xl font-bold mt-1">{stat.value}</div>
              <div className="text-xs text-[var(--ink-tertiary)] mt-0.5">{stat.label}</div>
              {stat.playerName && (
                <div className="text-xs text-[var(--ink-secondary)] mt-1 flex items-center justify-center gap-1">
                  <Star size={10} />
                  {stat.playerName}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <EmptyStatePremium
          illustration="scorecard"
          title="No fun stats tracked"
          description="Track stats like beers, balls lost, and more during your trip."
          action={{ label: 'Track Stats', onClick: () => {} }}
          variant="compact"
        />
      )}
    </div>
  );
}

// ============================================
// BANTER SECTION
// ============================================

function BanterSection({ recap }: { recap: TripRecapData }) {
  return (
    <div className="space-y-3">
      {recap.topTrashTalk.length > 0 ? (
        <>
          <h3 className="type-overline">Top Trash Talk</h3>
          {recap.topTrashTalk.map((post, i) => (
            <div
              key={i}
              className="p-4 rounded-xl bg-[var(--surface-card)] border border-[var(--rule)]"
            >
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-[var(--surface-elevated)] flex items-center justify-center text-sm font-bold">
                  {post.authorName.charAt(0)}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium">{post.authorName}</div>
                  <p className="text-sm text-[var(--ink-secondary)] mt-1">{post.content}</p>
                  {post.reactionCount > 0 && (
                    <div className="flex items-center gap-1 mt-2 text-xs text-[var(--ink-tertiary)]">
                      <Zap size={12} />
                      {post.reactionCount} reaction{post.reactionCount !== 1 ? 's' : ''}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </>
      ) : (
        <EmptyStatePremium
          illustration="scorecard"
          title="No banter yet"
          description="The best trash talk from your trip will appear here."
          variant="compact"
        />
      )}
    </div>
  );
}

// ============================================
// PHOTOS SECTION
// ============================================

function PhotosSection({ recap }: { recap: TripRecapData }) {
  return (
    <div>
      {recap.topPhotos.length > 0 ? (
        <div className="grid grid-cols-2 gap-2">
          {recap.topPhotos.map((photo, i) => (
            <div
              key={i}
              className={`relative rounded-xl overflow-hidden border border-[var(--rule)] ${
                i === 0 ? 'col-span-2 aspect-video' : 'aspect-square'
              }`}
            >
              <Image
                src={photo.url}
                alt={photo.caption || 'Trip photo'}
                fill
                className="object-cover"
                sizes={i === 0 ? '100vw' : '50vw'}
              />
              {photo.isMomentOfTrip && (
                <div className="absolute top-2 left-2 px-2 py-1 rounded-full bg-[color:var(--ink)]/70 text-[var(--canvas)] text-xs flex items-center gap-1">
                  <Star size={10} className="text-[color:var(--gold)]" />
                  Moment of the Trip
                </div>
              )}
              {photo.caption && (
                <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-[color:var(--ink)]/70 to-transparent">
                  <p className="text-[var(--canvas)] text-xs">{photo.caption}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <EmptyStatePremium
          illustration="scorecard"
          title="No photos"
          description="Share photos during your trip and they'll appear in the recap."
          variant="compact"
        />
      )}
    </div>
  );
}
