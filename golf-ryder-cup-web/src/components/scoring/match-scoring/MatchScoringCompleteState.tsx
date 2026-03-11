import { motion } from 'framer-motion';
import { ArrowRight, BarChart3, Pencil, Share2, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ConfettiPiece {
  i: number;
  x: string;
  y: string;
  rotate: number;
  duration: number;
}

interface MatchScoringCompleteStateProps {
  confettiPieces: ConfettiPiece[];
  prefersReducedMotion: boolean;
  winningTeam: 'teamA' | 'teamB' | 'halved' | 'none' | null;
  displayScore: string;
  teamAHolesWon: number;
  teamBHolesWon: number;
  halvedHoles: number;
  holesPlayed: number;
  teamAName: string;
  teamBName: string;
  summaryText: string;
  nextIncompleteMatchId?: string;
  canEditScores: boolean;
  onScoreNextMatch: (matchId: string) => void;
  onViewStandings: () => void;
  onShareSummary: () => void;
  onExportSummary: () => void;
  onShareResult: () => void;
  onEditScores: () => void;
  onBackToMatches: () => void;
}

export function MatchScoringCompleteState({
  confettiPieces,
  prefersReducedMotion,
  winningTeam,
  displayScore,
  teamAHolesWon,
  teamBHolesWon,
  halvedHoles,
  holesPlayed,
  teamAName,
  teamBName,
  summaryText,
  nextIncompleteMatchId,
  canEditScores,
  onScoreNextMatch,
  onViewStandings,
  onShareSummary,
  onExportSummary,
  onShareResult,
  onEditScores,
  onBackToMatches,
}: MatchScoringCompleteStateProps) {
  return (
    <section className="pt-[var(--space-10)] pb-[var(--space-8)] text-center">
      {!prefersReducedMotion && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.6 }}
          className="absolute inset-0 pointer-events-none overflow-hidden"
        >
          {confettiPieces.slice(0, 12).map((piece) => (
            <motion.div
              key={piece.i}
              className={`absolute w-2 h-2 rounded-full ${
                piece.i % 3 === 0 ? 'bg-masters' : piece.i % 3 === 1 ? 'bg-gold' : 'bg-maroon'
              }`}
              initial={{
                opacity: 1,
                x: '50%',
                y: '30%',
                scale: 0,
              }}
              animate={{
                opacity: [1, 0.6, 0],
                x: piece.x,
                y: piece.y,
                scale: [0, 1, 0.5],
                rotate: piece.rotate,
              }}
              transition={{
                duration: piece.duration,
                delay: piece.i * 0.06,
                ease: 'easeOut',
              }}
            />
          ))}
        </motion.div>
      )}

      <motion.div
        initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="relative z-10"
      >
        <div
          className={cn(
            'w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-[var(--space-6)]',
            winningTeam === 'teamA'
              ? 'bg-[color:var(--team-usa)]'
              : winningTeam === 'teamB'
                ? 'bg-[color:var(--team-europe)]'
                : 'bg-[color:var(--ink-tertiary)]'
          )}
        >
          <Trophy className="w-10 h-10 text-[var(--canvas)]" />
        </div>

        <h2 className="font-serif text-[length:var(--text-3xl)] font-normal tracking-[-0.02em] text-ink mb-[var(--space-2)]">
          {winningTeam === 'halved'
            ? 'Match Halved'
            : `${winningTeam === 'teamA' ? teamAName : teamBName} Wins`}
        </h2>

        <p
          className={cn(
            'score-monumental mb-[var(--space-8)]',
            winningTeam === 'teamA'
              ? 'text-[color:var(--team-usa)]'
              : winningTeam === 'teamB'
                ? 'text-[color:var(--team-europe)]'
                : 'text-ink-secondary'
          )}
        >
          {displayScore}
        </p>

        <div className="card-editorial mx-auto max-w-sm mb-[var(--space-6)]">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="font-serif text-[length:var(--text-2xl)] text-[color:var(--team-usa)]">
                {teamAHolesWon}
              </p>
              <p className="font-sans text-[length:var(--text-xs)] text-ink-tertiary mt-xs">
                {teamAName} Holes
              </p>
            </div>
            <div>
              <p className="font-serif text-[length:var(--text-2xl)] text-ink-tertiary">
                {halvedHoles}
              </p>
              <p className="font-sans text-[length:var(--text-xs)] text-ink-tertiary mt-xs">
                Halved
              </p>
            </div>
            <div>
              <p className="font-serif text-[length:var(--text-2xl)] text-[color:var(--team-europe)]">
                {teamBHolesWon}
              </p>
              <p className="font-sans text-[length:var(--text-xs)] text-ink-tertiary mt-xs">
                {teamBName} Holes
              </p>
            </div>
          </div>
          <div className="mt-[var(--space-4)] pt-[var(--space-4)] border-t border-rule">
            <p className="font-sans text-[length:var(--text-sm)] text-ink-secondary">
              Completed through hole {holesPlayed}
            </p>
          </div>
        </div>

        <div className="card-editorial mx-auto max-w-sm text-left mb-[var(--space-6)]">
          <p className="font-sans text-[length:var(--text-sm)] font-semibold text-ink">
            Match Summary
          </p>
          <p className="font-sans text-[length:var(--text-xs)] text-ink-tertiary whitespace-pre-line mt-[var(--space-2)]">
            {summaryText}
          </p>
          <div className="mt-[var(--space-4)] flex flex-col gap-[var(--space-2)]">
            <button
              onClick={onShareSummary}
              className="w-full py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 font-sans font-medium bg-canvas border border-rule"
            >
              <Share2 size={16} />
              Share Summary
            </button>
            <button
              onClick={onExportSummary}
              className="w-full py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 font-sans font-medium bg-masters text-[var(--canvas)]"
            >
              <Trophy size={16} />
              Export PDF Keepsake
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-3 max-w-sm mx-auto">
          {nextIncompleteMatchId && (
            <button
              onClick={() => onScoreNextMatch(nextIncompleteMatchId)}
              className="w-full py-4 px-6 rounded-xl flex items-center justify-center gap-2 font-sans font-semibold bg-masters text-[var(--canvas)]"
            >
              Score Next Match
              <ArrowRight size={20} />
            </button>
          )}

          <button
            onClick={onViewStandings}
            className={`w-full py-3 px-6 rounded-xl flex items-center justify-center gap-2 font-sans ${
              nextIncompleteMatchId
                ? 'font-medium bg-canvas-raised border border-rule text-ink'
                : 'font-semibold bg-masters text-[var(--canvas)]'
            }`}
          >
            <BarChart3 size={nextIncompleteMatchId ? 18 : 20} />
            View Standings
          </button>

          <button
            onClick={onShareResult}
            className="w-full py-3 px-6 rounded-xl flex items-center justify-center gap-2 font-sans font-medium bg-canvas-raised border border-rule text-ink"
          >
            <Share2 size={18} />
            Share Result
          </button>

          {canEditScores && (
            <button
              onClick={onEditScores}
              className="w-full py-3 px-6 rounded-xl flex items-center justify-center gap-2 font-sans font-medium bg-canvas-raised border border-rule text-ink"
            >
              <Pencil size={16} />
              Correct a Score
            </button>
          )}

          <button
            onClick={onBackToMatches}
            className="w-full py-3 px-6 rounded-xl text-center font-sans font-medium text-ink-secondary"
          >
            Back to Matches
          </button>
        </div>
      </motion.div>
    </section>
  );
}
