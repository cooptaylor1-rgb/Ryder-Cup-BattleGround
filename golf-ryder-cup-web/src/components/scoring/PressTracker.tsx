'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  Zap,
  Plus,
  ChevronDown,
  ChevronUp,
  AlertCircle,
} from 'lucide-react';

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
  const teamBCanPress = mainMatchScore > 1;  // Team B is down 2+

  // Calculate active presses
  const activePresses = presses.filter(p => p.status === 'active');
  const _closedPresses = presses.filter(p => p.status === 'closed');

  // Calculate total exposure
  const totalPresses = presses.length;
  const totalValue = totalPresses * betAmount;

  // Get team's active press status
  const getTeamPressStatus = (team: 'teamA' | 'teamB') => {
    const teamPresses = activePresses.filter(p => p.pressedBy === team);
    const winning = teamPresses.filter(p => team === 'teamA' ? p.score > 0 : p.score < 0);
    const losing = teamPresses.filter(p => team === 'teamA' ? p.score < 0 : p.score > 0);
    return { total: teamPresses.length, winning: winning.length, losing: losing.length };
  };

  const _teamAPressStatus = getTeamPressStatus('teamA');
  const _teamBPressStatus = getTeamPressStatus('teamB');

  if (betAmount === 0 && presses.length === 0) {
    return null; // Don't show if no bets configured
  }

  return (
    <div className={cn('rounded-xl overflow-hidden', className)} style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}>
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between"
        style={{ background: totalPresses > 0 ? 'rgba(0, 103, 71, 0.1)' : undefined }}
      >
        <div className="flex items-center gap-2">
          <Zap size={18} style={{ color: 'var(--masters)' }} />
          <span className="font-medium" style={{ color: 'var(--ink)' }}>
            Press Bets
          </span>
          {activePresses.length > 0 && (
            <span
              className="px-2 py-0.5 rounded-full text-xs font-bold"
              style={{ background: 'var(--masters)', color: 'white' }}
            >
              {activePresses.length} Active
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {betAmount > 0 && (
            <span className="text-sm" style={{ color: 'var(--ink-secondary)' }}>
              ${totalValue} at stake
            </span>
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
            <div className="p-4 space-y-4 border-t" style={{ borderColor: 'var(--rule)' }}>
              {/* Press Buttons */}
              <div className="grid grid-cols-2 gap-3">
                {/* Team A Press Button */}
                <button
                  onClick={() => onPress('teamA')}
                  disabled={!teamACanPress || holesRemaining <= 1}
                  className={cn(
                    'py-3 px-4 rounded-xl font-medium flex items-center justify-center gap-2 transition-all',
                    teamACanPress && holesRemaining > 1
                      ? 'press-scale'
                      : 'opacity-40 cursor-not-allowed'
                  )}
                  style={{
                    background: teamACanPress ? 'var(--team-usa)' : 'var(--canvas-sunken)',
                    color: teamACanPress ? 'white' : 'var(--ink-tertiary)',
                  }}
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
                      ? 'press-scale'
                      : 'opacity-40 cursor-not-allowed'
                  )}
                  style={{
                    background: teamBCanPress ? 'var(--team-europe)' : 'var(--canvas-sunken)',
                    color: teamBCanPress ? 'white' : 'var(--ink-tertiary)',
                  }}
                >
                  <Plus size={16} />
                  {teamBName} Press
                </button>
              </div>

              {/* Press Status Hint */}
              {!teamACanPress && !teamBCanPress && holesRemaining > 1 && (
                <div
                  className="text-center py-2 text-sm"
                  style={{ color: 'var(--ink-tertiary)' }}
                >
                  Press available when down 2+ holes
                </div>
              )}

              {holesRemaining <= 1 && (
                <div
                  className="flex items-center justify-center gap-2 py-2 text-sm"
                  style={{ color: 'var(--warning)' }}
                >
                  <AlertCircle size={14} />
                  No new presses on final hole
                </div>
              )}

              {/* Active Presses */}
              {activePresses.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--ink-tertiary)' }}>
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
                <div
                  className="flex items-center justify-between py-2 px-3 rounded-lg text-sm"
                  style={{ background: 'var(--canvas-sunken)' }}
                >
                  <span style={{ color: 'var(--ink-secondary)' }}>
                    Auto-press at {autoPressThreshold} down
                  </span>
                  <span
                    className="px-2 py-0.5 rounded text-xs font-medium"
                    style={{ background: 'var(--masters)', color: 'white' }}
                  >
                    ON
                  </span>
                </div>
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
  _betAmount,
  currentHole,
}: PressCardProps) {
  const isTeamALeading = press.score > 0;
  const isTeamBLeading = press.score < 0;
  const isAllSquare = press.score === 0;

  const holesPlayed = currentHole - press.startHole;

  const getScoreDisplay = () => {
    if (isAllSquare) return 'AS';
    const absScore = Math.abs(press.score);
    return `${absScore} UP`;
  };

  const getLeader = () => {
    if (isAllSquare) return null;
    return isTeamALeading ? teamAName : teamBName;
  };

  return (
    <div
      className="p-3 rounded-lg flex items-center justify-between"
      style={{
        background: isTeamALeading
          ? 'rgba(179, 39, 57, 0.1)'
          : isTeamBLeading
            ? 'rgba(0, 39, 118, 0.1)'
            : 'var(--canvas-sunken)',
        border: `1px solid ${isTeamALeading
          ? 'rgba(179, 39, 57, 0.3)'
          : isTeamBLeading
            ? 'rgba(0, 39, 118, 0.3)'
            : 'var(--rule)'
          }`,
      }}
    >
      <div className="flex items-center gap-3">
        <span
          className="w-6 h-6 rounded flex items-center justify-center text-xs font-bold"
          style={{ background: 'var(--surface)', color: 'var(--ink-secondary)' }}
        >
          P{pressNumber}
        </span>
        <div>
          <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>
            Started hole {press.startHole}
          </p>
          <p className="text-xs" style={{ color: 'var(--ink-tertiary)' }}>
            By {press.pressedBy === 'teamA' ? teamAName : teamBName} • {holesPlayed} holes played
          </p>
        </div>
      </div>

      <div className="text-right">
        <p
          className="font-bold"
          style={{
            color: isTeamALeading
              ? 'var(--team-usa)'
              : isTeamBLeading
                ? 'var(--team-europe)'
                : 'var(--ink-secondary)',
          }}
        >
          {getScoreDisplay()}
        </p>
        {getLeader() && (
          <p className="text-xs" style={{ color: 'var(--ink-tertiary)' }}>
            {getLeader()}
          </p>
        )}
      </div>
    </div>
  );
}

export default PressTracker;
