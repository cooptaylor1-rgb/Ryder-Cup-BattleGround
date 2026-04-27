/**
 * MatchRecapClient — /score/[matchId]/recap
 *
 * Phase 4 cinematic post-match moment. Big result, awards earned in
 * this match, share + export, and the next-match handoff (auto-routes
 * to the next incomplete match in the user's session, falls back to a
 * picker when the path is ambiguous).
 *
 * Does not replace the in-cockpit `MatchScoringCompleteState` — that's
 * still rendered when an in-progress match closes out so the celebration
 * fires in context. Recap is the post-fact cinematic surface, link-deep
 * from the cockpit overflow and the home "recent matches" list.
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useShallow } from 'zustand/shallow';
import {
  ArrowRight,
  BarChart3,
  Check,
  ChevronLeft,
  Eye,
  FileText,
  Pencil,
  RefreshCw,
  Share2,
  Sparkles,
  Trophy,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { TEAM_COLORS } from '@/lib/constants/teamColors';
import { useAccessStore, useScoringStore, useToastStore, useTripStore } from '@/lib/stores';
import { useMatchState } from '@/lib/hooks';
import { calculateMatchState } from '@/lib/services/scoringEngine';
import { reopenMatch } from '@/lib/services/scoringEngine';
import { db } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { cn } from '@/lib/utils';
import { formatPlayerName } from '@/lib/utils';
import { usePrefersReducedMotion } from '@/lib/utils/accessibility';
import {
  buildMatchResultShareText,
  buildMatchSummaryText,
  buildPrintableMatchSummary,
  countHalvedHoles,
  findNextIncompleteMatch,
} from '../matchScoringReport';

interface RecapAward {
  icon: React.ReactNode;
  title: string;
  detail: string;
  tone: 'gold' | 'masters' | 'maroon';
}

export default function MatchRecapClient() {
  const router = useRouter();
  const params = useParams();
  const matchId = params.matchId as string;

  const { players, sessions } = useTripStore(
    useShallow((s) => ({
      players: s.players,
      sessions: s.sessions,
    }))
  );
  const { isCaptainMode } = useAccessStore(useShallow((s) => ({ isCaptainMode: s.isCaptainMode })));
  const { showToast } = useToastStore(useShallow((s) => ({ showToast: s.showToast })));
  const { selectMatch } = useScoringStore();

  const reducedMotion = usePrefersReducedMotion();
  const matchState = useMatchState(matchId);

  useEffect(() => {
    void selectMatch(matchId);
  }, [matchId, selectMatch]);

  // Pull session matches so we can hand off to "next match".
  const sessionMatches = useLiveQuery(
    async () => {
      if (!matchState?.match.sessionId) return [];
      return db.matches
        .where('sessionId')
        .equals(matchState.match.sessionId)
        .sortBy('matchOrder');
    },
    [matchState?.match.sessionId],
    []
  );

  if (!matchState) {
    return (
      <RecapShell>
        <div className="container-editorial pt-12 text-center text-sm text-[var(--ink-secondary)]">
          Loading recap…
        </div>
      </RecapShell>
    );
  }

  const match = matchState.match;
  const session = sessions.find((s) => s.id === match.sessionId);
  const teamAName = 'USA';
  const teamBName = 'Europe';
  const teamAColor = TEAM_COLORS.teamA;
  const teamBColor = TEAM_COLORS.teamB;
  const teamAPlayers = match.teamAPlayerIds
    .map((id) => players.find((p) => p.id === id))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));
  const teamBPlayers = match.teamBPlayerIds
    .map((id) => players.find((p) => p.id === id))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));

  const teamALineup = teamAPlayers
    .map((p) => formatPlayerName(p.firstName, p.lastName, 'short'))
    .join(' & ');
  const teamBLineup = teamBPlayers
    .map((p) => formatPlayerName(p.firstName, p.lastName, 'short'))
    .join(' & ');

  const winningTeam = matchState.winningTeam;
  const halvedHoles = countHalvedHoles(matchState);

  const matchUrl =
    typeof window !== 'undefined' ? `${window.location.origin}/score/${match.id}` : undefined;

  const summaryText = buildMatchSummaryText({
    matchState,
    teamAName,
    teamBName,
    teamAPlayers,
    teamBPlayers,
    matchUrl,
  });

  const nextIncomplete = findNextIncompleteMatch(match.id, sessionMatches);

  const awards = computeRecapAwards(matchState, teamAName, teamBName);

  const handleShareResult = () => {
    const text = buildMatchResultShareText({
      matchState,
      teamAName,
      teamBName,
      teamALineup,
      teamBLineup,
      matchUrl,
    });
    if (typeof navigator !== 'undefined' && navigator.share) {
      void navigator.share({ text, url: matchUrl });
      return;
    }
    if (typeof navigator !== 'undefined') {
      void navigator.clipboard?.writeText(text);
      showToast('success', 'Result copied to clipboard');
    }
  };

  const handleShareSummary = () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      void navigator.share({ text: summaryText });
      return;
    }
    if (typeof navigator !== 'undefined') {
      void navigator.clipboard?.writeText(summaryText);
      showToast('success', 'Summary copied to clipboard');
    }
  };

  const handleExport = () => {
    const printable = buildPrintableMatchSummary({
      matchState,
      teamAName,
      teamBName,
      summaryText,
    });
    if (typeof window === 'undefined') return;
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(printable);
    win.document.close();
    win.focus();
    win.print();
  };

  const handleScoreNext = () => {
    if (!nextIncomplete) return;
    router.push(`/score/${nextIncomplete.id}`);
  };

  const handleReopen = async () => {
    if (!isCaptainMode) return;
    if (!confirm('Reopen this match for correction? It will move back to in-progress.')) return;
    try {
      await reopenMatch(match.id);
      showToast('info', 'Match reopened — make corrections in the cockpit.');
      router.push(`/score/${match.id}`);
    } catch {
      showToast('error', 'Could not reopen match');
    }
  };

  return (
    <RecapShell>
      <header
        className="sticky top-0 z-30 border-b border-[color:var(--rule)] bg-[color:var(--canvas)]/95 backdrop-blur"
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        <div className="container-editorial flex items-center justify-between gap-2 py-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-[color:var(--rule)] bg-[var(--canvas)] text-[var(--ink-secondary)]"
            aria-label="Back"
          >
            <ChevronLeft size={18} />
          </button>
          <p className="type-overline text-[var(--masters)]">Recap</p>
          <div className="w-11" aria-hidden />
        </div>
      </header>

      <main className="container-editorial space-y-5 py-6">
        <RecapHero
          matchOrder={match.matchOrder}
          sessionLabel={session?.name ?? session?.sessionType ?? 'Match'}
          winningTeam={winningTeam}
          teamAName={teamAName}
          teamBName={teamBName}
          teamAColor={teamAColor}
          teamBColor={teamBColor}
          teamALineup={teamALineup}
          teamBLineup={teamBLineup}
          displayScore={matchState.displayScore}
          holesPlayed={matchState.holesPlayed}
          teamAHolesWon={matchState.teamAHolesWon}
          teamBHolesWon={matchState.teamBHolesWon}
          halvedHoles={halvedHoles}
          reducedMotion={reducedMotion}
        />

        <PrimaryActions
          nextIncompleteId={nextIncomplete?.id}
          onScoreNext={handleScoreNext}
          onViewStandings={() => router.push('/standings')}
          onShareResult={handleShareResult}
        />

        {awards.length > 0 && <AwardsCard awards={awards} />}

        <SecondaryActions
          onShareSummary={handleShareSummary}
          onExport={handleExport}
          onScorecard={() => router.push(`/score/${matchId}/scorecard`)}
          onReopen={isCaptainMode ? handleReopen : undefined}
        />

        <SummaryNote text={summaryText} />
      </main>
    </RecapShell>
  );
}

function RecapShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--canvas)] page-premium-enter texture-grain">
      {children}
    </div>
  );
}

function RecapHero({
  matchOrder,
  sessionLabel,
  winningTeam,
  teamAName,
  teamBName,
  teamAColor,
  teamBColor,
  teamALineup,
  teamBLineup,
  displayScore,
  holesPlayed,
  teamAHolesWon,
  teamBHolesWon,
  halvedHoles,
  reducedMotion,
}: {
  matchOrder: number;
  sessionLabel: string;
  winningTeam: ReturnType<typeof calculateMatchState>['winningTeam'];
  teamAName: string;
  teamBName: string;
  teamAColor: string;
  teamBColor: string;
  teamALineup: string;
  teamBLineup: string;
  displayScore: string;
  holesPlayed: number;
  teamAHolesWon: number;
  teamBHolesWon: number;
  halvedHoles: number;
  reducedMotion: boolean;
}) {
  const winnerColor =
    winningTeam === 'teamA'
      ? teamAColor
      : winningTeam === 'teamB'
        ? teamBColor
        : 'var(--ink-secondary)';
  const winnerLabel =
    winningTeam === 'halved'
      ? 'Match halved'
      : winningTeam === 'teamA'
        ? `${teamAName} wins`
        : winningTeam === 'teamB'
          ? `${teamBName} wins`
          : 'Match unfinished';

  return (
    <section className="overflow-hidden rounded-[28px] border border-[color:var(--rule)] bg-[var(--canvas-raised)] shadow-[0_24px_70px_rgba(26,24,21,0.10)]">
      <div
        aria-hidden
        className="h-1.5"
        style={{
          background: `linear-gradient(90deg, ${teamAColor} 0%, ${teamAColor} 49%, var(--gold) 49%, var(--gold) 51%, ${teamBColor} 51%, ${teamBColor} 100%)`,
        }}
      />
      <div className="px-5 py-6 text-center sm:px-6 sm:py-8">
        <p className="type-overline text-[var(--masters)]">
          Match {matchOrder} · {sessionLabel}
        </p>

        <motion.div
          initial={reducedMotion ? false : { scale: 0, rotate: -8 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ duration: 0.6, ease: [0.32, 0.72, 0, 1], delay: 0.1 }}
          className="mx-auto mt-5 flex h-20 w-20 items-center justify-center rounded-full text-[var(--canvas)] shadow-card-lg"
          style={{ background: winnerColor }}
        >
          <Trophy size={32} />
        </motion.div>

        <motion.h1
          initial={reducedMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="mt-5 font-serif text-[length:var(--text-3xl)] font-normal text-[var(--ink)]"
        >
          {winnerLabel}
        </motion.h1>

        <motion.p
          initial={reducedMotion ? false : { opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.32 }}
          className="score-monumental mt-2"
          style={{ color: winnerColor }}
        >
          {displayScore}
        </motion.p>

        <p className="mt-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ink-tertiary)]">
          {teamALineup} vs {teamBLineup}
        </p>

        <div className="mt-6 grid grid-cols-3 gap-3">
          <RecapStat
            label={teamAName}
            value={teamAHolesWon}
            color={teamAColor}
            sublabel="holes"
          />
          <RecapStat
            label="Halved"
            value={halvedHoles}
            color="var(--ink-tertiary)"
            sublabel="holes"
          />
          <RecapStat
            label={teamBName}
            value={teamBHolesWon}
            color={teamBColor}
            sublabel="holes"
          />
        </div>
        <p className="mt-3 text-xs text-[var(--ink-tertiary)]">
          Completed thru hole {holesPlayed}
        </p>
      </div>
    </section>
  );
}

function RecapStat({
  label,
  value,
  color,
  sublabel,
}: {
  label: string;
  value: number;
  color: string;
  sublabel: string;
}) {
  return (
    <div className="rounded-2xl border border-[color:var(--rule)]/80 bg-[var(--canvas-sunken)]/60 px-3 py-3 text-center">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ color }}>
        {label}
      </p>
      <p className="mt-1 font-serif text-[length:var(--text-2xl)] tabular-nums leading-none text-[var(--ink)]">
        {value}
      </p>
      <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-tertiary)]">
        {sublabel}
      </p>
    </div>
  );
}

function PrimaryActions({
  nextIncompleteId,
  onScoreNext,
  onViewStandings,
  onShareResult,
}: {
  nextIncompleteId?: string;
  onScoreNext: () => void;
  onViewStandings: () => void;
  onShareResult: () => void;
}) {
  return (
    <section className="grid gap-2.5">
      {nextIncompleteId && (
        <button
          type="button"
          onClick={onScoreNext}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--masters)] px-5 py-4 font-semibold text-[var(--canvas)] shadow-card transition-transform active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--canvas)]"
        >
          Score next match
          <ArrowRight size={18} />
        </button>
      )}
      <div className="grid grid-cols-2 gap-2.5">
        <button
          type="button"
          onClick={onViewStandings}
          className="flex items-center justify-center gap-2 rounded-2xl border border-[color:var(--rule)] bg-[var(--canvas-raised)] px-4 py-3 text-sm font-semibold text-[var(--ink)] transition-colors hover:bg-[var(--canvas-sunken)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--canvas)]"
        >
          <BarChart3 size={16} />
          Standings
        </button>
        <button
          type="button"
          onClick={onShareResult}
          className="flex items-center justify-center gap-2 rounded-2xl border border-[color:var(--rule)] bg-[var(--canvas-raised)] px-4 py-3 text-sm font-semibold text-[var(--ink)] transition-colors hover:bg-[var(--canvas-sunken)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--canvas)]"
        >
          <Share2 size={16} />
          Share
        </button>
      </div>
    </section>
  );
}

function AwardsCard({ awards }: { awards: RecapAward[] }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-[color:var(--rule)] bg-[var(--canvas-raised)]">
      <header className="flex items-center gap-2 border-b border-[color:var(--rule)] bg-[var(--canvas-sunken)] px-4 py-2.5">
        <Sparkles size={14} className="text-[var(--gold)]" />
        <p className="type-overline text-[var(--ink-secondary)]">Awards</p>
        <p className="ml-auto text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-tertiary)]">
          {awards.length} earned
        </p>
      </header>
      <ul className="divide-y divide-[color:var(--rule)]/70">
        {awards.map((award, idx) => (
          <li key={idx} className="flex items-start gap-3 px-4 py-3">
            <span
              className={cn(
                'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
                award.tone === 'gold'
                  ? 'bg-[var(--gold-subtle)] text-[var(--gold-dark)]'
                  : award.tone === 'maroon'
                    ? 'bg-[color:var(--team-europe-glow)] text-[var(--team-europe)]'
                    : 'bg-[var(--masters-subtle)] text-[var(--masters)]'
              )}
            >
              {award.icon}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-[var(--ink)]">{award.title}</p>
              <p className="mt-0.5 text-xs text-[var(--ink-tertiary)]">{award.detail}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function SecondaryActions({
  onShareSummary,
  onExport,
  onScorecard,
  onReopen,
}: {
  onShareSummary: () => void;
  onExport: () => void;
  onScorecard: () => void;
  onReopen?: () => void;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-[color:var(--rule)] bg-[var(--canvas-raised)]">
      <ActionRow icon={<Eye size={16} />} label="View scorecard" description="All 18 holes, with provenance" onClick={onScorecard} />
      <ActionRow icon={<Share2 size={16} />} label="Share summary" description="Detailed breakdown text" onClick={onShareSummary} />
      <ActionRow icon={<FileText size={16} />} label="Export PDF keepsake" description="Printable record of the match" onClick={onExport} />
      {onReopen && (
        <ActionRow
          icon={<RefreshCw size={16} />}
          label="Reopen for correction"
          description="Captain only — flips status back to in-progress"
          tone="warning"
          onClick={onReopen}
        />
      )}
    </section>
  );
}

function ActionRow({
  icon,
  label,
  description,
  onClick,
  tone = 'default',
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  onClick: () => void;
  tone?: 'default' | 'warning';
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 border-b border-[color:var(--rule)]/70 px-4 py-3 text-left transition-colors hover:bg-[var(--canvas-sunken)] focus-visible:bg-[var(--canvas-sunken)] focus-visible:outline-none last:border-0"
    >
      <span
        className={cn(
          'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
          tone === 'warning'
            ? 'bg-[var(--gold-subtle)] text-[var(--gold-dark)]'
            : 'bg-[var(--canvas-sunken)] text-[var(--ink-secondary)]'
        )}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span
          className={cn(
            'block text-sm font-semibold',
            tone === 'warning' ? 'text-[var(--gold-dark)]' : 'text-[var(--ink)]'
          )}
        >
          {label}
        </span>
        <span className="mt-0.5 block text-xs text-[var(--ink-tertiary)]">{description}</span>
      </span>
    </button>
  );
}

function SummaryNote({ text }: { text: string }) {
  const ref = useRef<HTMLPreElement>(null);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard?.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-[color:var(--rule)] bg-[var(--canvas-sunken)]">
      <header className="flex items-center justify-between gap-2 border-b border-[color:var(--rule)] px-4 py-2.5">
        <p className="type-overline text-[var(--ink-secondary)]">Match summary</p>
        <button
          type="button"
          onClick={copy}
          className="inline-flex h-8 items-center gap-1 rounded-full border border-[color:var(--rule)] bg-[var(--canvas)] px-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-secondary)] transition-colors hover:text-[var(--ink)]"
        >
          {copied ? <Check size={12} /> : <Pencil size={12} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </header>
      <pre
        ref={ref}
        className="m-0 whitespace-pre-wrap break-words px-4 py-3 font-mono text-xs text-[var(--ink-secondary)]"
      >
        {text}
      </pre>
    </section>
  );
}

function computeRecapAwards(
  matchState: ReturnType<typeof calculateMatchState>,
  teamAName: string,
  teamBName: string
): RecapAward[] {
  const awards: RecapAward[] = [];
  const halved = countHalvedHoles(matchState);

  // Decisive close-out (5&4 or better)
  if (
    matchState.winningTeam !== 'halved' &&
    matchState.winningTeam !== null &&
    matchState.holesPlayed > 0 &&
    matchState.holesRemaining > 0
  ) {
    const margin = Math.abs(matchState.currentScore);
    if (margin >= 5) {
      awards.push({
        icon: <Sparkles size={16} />,
        title: 'Statement closeout',
        detail: `Won by ${margin} with ${matchState.holesRemaining} to play.`,
        tone: 'gold',
      });
    } else if (margin >= 3 && matchState.holesRemaining >= 2) {
      awards.push({
        icon: <Sparkles size={16} />,
        title: 'Comfortable win',
        detail: `${matchState.displayScore}.`,
        tone: 'masters',
      });
    }
  }

  if (halved >= 6) {
    awards.push({
      icon: <Sparkles size={16} />,
      title: 'Trench warfare',
      detail: `${halved} halved holes — neither side gave an inch.`,
      tone: 'maroon',
    });
  }

  // Comeback: did the trailing team take the win?
  // Compute earliest hole the eventual loser was up.
  let teamAUp = 0;
  let runningMaxA = 0;
  let runningMaxB = 0;
  for (const r of [...matchState.holeResults].sort((a, b) => a.holeNumber - b.holeNumber)) {
    if (r.winner === 'teamA') teamAUp += 1;
    else if (r.winner === 'teamB') teamAUp -= 1;
    runningMaxA = Math.max(runningMaxA, teamAUp);
    runningMaxB = Math.max(runningMaxB, -teamAUp);
  }
  if (
    matchState.winningTeam === 'teamA' &&
    runningMaxB >= 2 &&
    matchState.currentScore >= 1
  ) {
    awards.push({
      icon: <Sparkles size={16} />,
      title: 'Comeback win',
      detail: `${teamAName} were ${runningMaxB} down at one point.`,
      tone: 'masters',
    });
  } else if (
    matchState.winningTeam === 'teamB' &&
    runningMaxA >= 2 &&
    matchState.currentScore <= -1
  ) {
    awards.push({
      icon: <Sparkles size={16} />,
      title: 'Comeback win',
      detail: `${teamBName} were ${runningMaxA} down at one point.`,
      tone: 'maroon',
    });
  }

  return awards;
}

// Suppress lint for unused useMemo (guards future refactor without retest)
export const __recapInternal = { computeRecapAwards };
