'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Zap, Plus, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';

/**
 * PRESS TRACKER COMPONENT
 *
 * Tracks press bets during a match play round.
 * A press is a new bet that starts from the current hole.
 *
 * Rules:
 * - Press can be called when down 2+ holes
 * - Auto-press option at configurable threshold
 * - Multiple presses can be active simultaneously
 * - Each press is worth the original bet amount
 */

export interface Press {
  id: string;
  startHole: number;
  pressedBy: 'teamA' | 'teamB';
  status: 'active' | 'closed';
  score: number; // Positive = teamA leading this press
  result?: 'teamA' | 'teamB' | 'halved';
  closedAtHole?: number;
}

export interface PressTrackerProps {
  currentHole: number;
  mainMatchScore: number; // Positive = teamA leading
  holesRemaining: number;
  presses: Press[];
  onPress: (pressedBy: 'teamA' | 'teamB') => void;
  teamAName: string;
  teamBName: string;
  betAmount?: number;
  autoPress?: boolean;
  autoPressThreshold?: number;
  className?: string;
}

export function PressTracker({
  currentHole,
  mainMatchScore,
  holesRemaining,
  presses,
  onPress,
  teamAName,
  teamBName,
  betAmount = 0,
  autoPress = false,
  autoPressThreshold = 2,
  className,
}: PressTrackerProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  // Calculate if teams can press
  const teamACanPress = mainMatchScore < -1; // Team A is down 2+
  const teamBCanPress = mainMatchScore > 1; // Team B is down 2+

  // Calculate active presses
  const activePresses = presses.filter((p) => p.status === 'active');

  // Calculate total exposure
  const totalPresses = presses.length;
  const totalValue = totalPresses * betAmount;
  const showSetupState = betAmount <= 0 && presses.length === 0;

  return (
    <div
      className={cn(
        'rounded-xl overflow-hidden bg-[var(--surface)] border border-[var(--rule)]',
        className
      )}
    >
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          'w-full px-4 py-3 flex items-center justify-between',
          totalPresses > 0 && 'bg-[rgba(0,103,71,0.1)]'
        )}
      >
        <div className="flex items-center gap-2">
          <Zap size={18} className="text-[var(--masters)]" />
          <span className="font-medium text-[var(--ink)]">Press Bets</span>
          {activePresses.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-[var(--masters)] text-[var(--canvas)]">
              {activePresses.length} Active
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {showSetupState ? (
            <span className="flex items-center gap-1 text-xs font-medium text-[var(--warning)]">
              <AlertCircle size={14} />
              Set bet amount
            </span>
          ) : (
            betAmount > 0 && (
              <span className="text-sm text-[var(--ink-secondary)]">
                ${totalValue} at stake
              </span>
            )
          )}
          {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </div>
      </button>

      {/* Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div
              className={cn(
                'p-4 border-t border-[var(--rule)]',
                !showSetupState && 'space-y-4'
              )}
            >
              {showSetupState ? (
                <div className="flex items-start gap-3 rounded-xl border border-[var(--rule)] bg-[var(--canvas-sunken)] p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--canvas)] text-[var(--warning)]">
                    <AlertCircle size={18} />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-[var(--ink)]">
                      Press bets not configured yet
                    </p>
                    <p className="text-xs text-[var(--ink-secondary)]">
                      Set a default press amount in match settings to enable quick tracking during the round.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  {/* Press Buttons */}
                  <div className="grid grid-cols-2 gap-3">
                    {/* Team A Press Button */}
                    <button
                      onClick={() => onPress('teamA')}
                      disabled={!teamACanPress || holesRemaining <= 1}
                      className={cn(
                        'py-3 px-4 rounded-xl font-medium flex items-center justify-center gap-2 transition-all',
                        teamACanPress && holesRemaining > 1
                          ? 'press-scale bg-[var(--team-usa)] text-[var(--canvas)]'
                          : 'opacity-40 cursor-not-allowed bg-[var(--canvas-sunken)] text-[var(--ink-tertiary)]'
                      )}
                    >
                      <Plus size={16} />
                      {teamAName} Press
                    </button>

                    {/* Team B Press Button */}
                    <button
                      onClick={() => onPress('teamB')}
                      disabled={!teamBCanPress || holesRemaining <= 1}
                      className={cn(
                        'py-3 px-4 rounded-xl font-medium flex items-center justify-center gap-2 transition-all',
                        teamBCanPress && holesRemaining > 1
                          ? 'press-scale bg-[var(--team-europe)] text-[var(--canvas)]'
                          : 'opacity-40 cursor-not-allowed bg-[var(--canvas-sunken)] text-[var(--ink-tertiary)]'
                      )}
                    >
                      <Plus size={16} />
                      {teamBName} Press
                    </button>
                  </div>

                  {/* Press Status Hint */}
                  {!teamACanPress && !teamBCanPress && holesRemaining > 1 && (
                    <div className="text-center py-2 text-sm text-[var(--ink-tertiary)]">
                      Press available when down 2+ holes
                    </div>
                  )}

                  {holesRemaining <= 1 && (
                    <div className="flex items-center justify-center gap-2 py-2 text-sm text-[var(--warning)]">
                      <AlertCircle size={14} />
                      No new presses on final hole
                    </div>
                  )}

                  {/* Active Presses */}
                  {activePresses.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium uppercase tracking-wider text-[var(--ink-tertiary)]">
                        Active Presses
                      </p>
                      {activePresses.map((press, idx) => (
                        <PressCard
                          key={press.id}
                          press={press}
                          pressNumber={idx + 1}
                          teamAName={teamAName}
                          teamBName={teamBName}
                          betAmount={betAmount}
                          currentHole={currentHole}
                        />
                      ))}
                    </div>
                  )}

                  {/* Auto-Press Status */}
                  {autoPress && (
                    <div className="flex items-center justify-between py-2 px-3 rounded-lg text-sm bg-[var(--canvas-sunken)]">
                      <span className="text-[var(--ink-secondary)]">
                        Auto-press at {autoPressThreshold} down
                      </span>
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-[var(--masters)] text-[var(--canvas)]">
                        ON
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================
// PRESS CARD
// ============================================

interface PressCardProps {
  press: Press;
  pressNumber: number;
  teamAName: string;
  teamBName: string;
  betAmount: number;
  currentHole: number;
}

function PressCard({
  press,
  pressNumber,
  teamAName,
  teamBName,
  betAmount: _betAmount,
  currentHole,
}: PressCardProps) {
  const isTeamALeading = press.score > 0;
  const isTeamBLeading = press.score < 0;
  const isAllSquare = press.score === 0;

  const holesPlayed = currentHole - press.startHole;

  const scoreDisplay = (() => {
    if (isAllSquare) return 'AS';
    const absScore = Math.abs(press.score);
    return `${absScore} UP`;
  })();

  const leader = (() => {
    if (isAllSquare) return null;
    return isTeamALeading ? teamAName : teamBName;
  })();

  return (
    <div
      className={cn(
        'p-3 rounded-lg flex items-center justify-between border',
        isTeamALeading
          ? 'bg-[rgba(179,39,57,0.1)] border-[rgba(179,39,57,0.3)]'
          : isTeamBLeading
            ? 'bg-[rgba(0,39,118,0.1)] border-[rgba(0,39,118,0.3)]'
            : 'bg-[var(--canvas-sunken)] border-[var(--rule)]'
      )}
    >
      <div className="flex items-center gap-3">
        <span className="w-6 h-6 rounded flex items-center justify-center text-xs font-bold bg-[var(--surface)] text-[var(--ink-secondary)]">
          P{pressNumber}
        </span>
        <div>
          <p className="text-sm font-medium text-[var(--ink)]">
            Started hole {press.startHole}
          </p>
          <p className="text-xs text-[var(--ink-tertiary)]">
            By {press.pressedBy === 'teamA' ? teamAName : teamBName} • {holesPlayed}{' '}
            holes played
          </p>
        </div>
      </div>

      <div className="text-right">
        <p
          className={cn(
            'font-bold',
            isTeamALeading
              ? 'text-[var(--team-usa)]'
              : isTeamBLeading
                ? 'text-[var(--team-europe)]'
                : 'text-[var(--ink-secondary)]'
          )}
        >
          {scoreDisplay}
        </p>
        {leader && (
          <p className="text-xs text-[var(--ink-tertiary)]">{leader}</p>
        )}
      </div>
    </div>
  );
}

export default PressTracker;
