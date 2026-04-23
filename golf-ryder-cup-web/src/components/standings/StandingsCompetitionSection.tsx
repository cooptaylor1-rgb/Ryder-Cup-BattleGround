import Link from 'next/link';

import { NoStandingsEmpty } from '@/components/ui';
import { PathToVictoryCard } from '@/components/gamification/PathToVictoryCard';
import { TeamLogo } from '@/components/team/TeamLogo';
import type { MagicNumber, PlayerLeaderboard, TeamStandings } from '@/lib/types/computed';
import { PartyPopper, Share2, Trophy } from 'lucide-react';

import { StandingsFactCard, StandingsSectionHeading } from './StandingsShellSection';

function StandingsScoreBlock({
  teamName,
  teamIcon,
  score,
  color,
  isLeading,
  animate,
}: {
  teamName: string;
  teamIcon?: string;
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
      {teamIcon ? (
        <TeamLogo
          src={teamIcon}
          alt={teamName}
          size={88}
          rounded={false}
          className="mb-[var(--space-4)]"
        />
      ) : (
        <span
          className={`team-dot team-dot-xl team-dot-${color} mb-[var(--space-4)] inline-block ${animate ? 'team-dot-pulse' : ''}`}
        />
      )}
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

function CompetitionEmptyState() {
  return <NoStandingsEmpty />;
}

export function CompetitionTab({
  standings,
  magicNumber,
  leaderboard,
  teamAName,
  teamBName,
  teamAIcon,
  teamBIcon,
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
  teamAIcon?: string;
  teamBIcon?: string;
  teamAId?: string;
  pointsToWin: number;
  onShareStandings: () => Promise<void> | void;
  isSharingStandings: boolean;
}) {
  if (!standings || !magicNumber) {
    return <CompetitionEmptyState />;
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
              teamIcon={teamAIcon}
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
              teamIcon={teamBIcon}
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
