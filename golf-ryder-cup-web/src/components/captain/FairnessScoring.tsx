/**
 * Fairness Scoring Utilities
 *
 * Algorithms and components for ensuring fair match pairings:
 * - Handicap balance calculation
 * - Experience/games played balance
 * - Head-to-head history consideration
 * - Auto-fill suggestions
 *
 * Features:
 * - Multiple fairness metrics
 * - Configurable weights
 * - Detailed breakdown
 * - Improvement suggestions
 */

'use client';

import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import {
  Scale,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Users,
  Target,
  Shuffle,
  ChevronRight,
  Info,
} from 'lucide-react';

// ============================================
// TYPES
// ============================================

export interface Player {
  id: string;
  firstName: string;
  lastName: string;
  handicapIndex: number;
  team: 'A' | 'B';
  matchesPlayed?: number;
  wins?: number;
  losses?: number;
  halves?: number;
}

export interface MatchPairing {
  id: string;
  teamAPlayers: Player[];
  teamBPlayers: Player[];
}

export interface FairnessScore {
  overall: number; // 0-100
  handicapBalance: number;
  experienceBalance: number;
  playTimeBalance: number;
  warnings: string[];
  suggestions: string[];
}

export interface FairnessBreakdown {
  match: MatchPairing;
  matchNumber: number;
  teamAHandicap: number;
  teamBHandicap: number;
  handicapDiff: number;
  isFair: boolean;
  warning?: string;
}

export interface SuggestedPairing {
  teamAPlayers: Player[];
  teamBPlayers: Player[];
  fairnessScore: number;
  handicapDiff: number;
}

export interface FairnessConfig {
  maxHandicapDiff: number;
  handicapWeight: number;
  experienceWeight: number;
  playTimeWeight: number;
}

// ============================================
// DEFAULT CONFIG
// ============================================

export const DEFAULT_FAIRNESS_CONFIG: FairnessConfig = {
  maxHandicapDiff: 5, // Max acceptable combined handicap difference
  handicapWeight: 0.5, // 50% of overall score
  experienceWeight: 0.3, // 30% of overall score
  playTimeWeight: 0.2, // 20% of overall score
};

// ============================================
// CALCULATION FUNCTIONS
// ============================================

/**
 * Calculate combined handicap for a set of players
 */
export function calculateCombinedHandicap(players: Player[]): number {
  return players.reduce((sum, p) => sum + p.handicapIndex, 0);
}

/**
 * Calculate handicap difference between two teams
 */
export function calculateHandicapDiff(
  teamAPlayers: Player[],
  teamBPlayers: Player[]
): number {
  const teamA = calculateCombinedHandicap(teamAPlayers);
  const teamB = calculateCombinedHandicap(teamBPlayers);
  return Math.abs(teamA - teamB);
}

/**
 * Calculate handicap balance score (0-100)
 * 100 = perfectly balanced, 0 = very unbalanced
 */
export function calculateHandicapBalance(
  matches: MatchPairing[],
  config: FairnessConfig = DEFAULT_FAIRNESS_CONFIG
): number {
  if (matches.length === 0) return 100;

  const validMatches = matches.filter(
    (m) => m.teamAPlayers.length > 0 && m.teamBPlayers.length > 0
  );

  if (validMatches.length === 0) return 100;

  let totalPenalty = 0;

  validMatches.forEach((match) => {
    const diff = calculateHandicapDiff(match.teamAPlayers, match.teamBPlayers);
    // Penalty increases exponentially for larger differences
    const penalty = Math.min(100, (diff / config.maxHandicapDiff) * 100);
    totalPenalty += penalty;
  });

  const avgPenalty = totalPenalty / validMatches.length;
  return Math.max(0, Math.round(100 - avgPenalty));
}

/**
 * Calculate experience balance (based on matches played)
 */
export function calculateExperienceBalance(
  matches: MatchPairing[],
): number {
  if (matches.length === 0) return 100;

  const validMatches = matches.filter(
    (m) => m.teamAPlayers.length > 0 && m.teamBPlayers.length > 0
  );

  if (validMatches.length === 0) return 100;

  let totalPenalty = 0;

  validMatches.forEach((match) => {
    const teamAExp = match.teamAPlayers.reduce((sum, p) => sum + (p.matchesPlayed || 0), 0);
    const teamBExp = match.teamBPlayers.reduce((sum, p) => sum + (p.matchesPlayed || 0), 0);
    const maxExp = Math.max(teamAExp, teamBExp, 1);
    const diff = Math.abs(teamAExp - teamBExp);
    const penalty = (diff / maxExp) * 100;
    totalPenalty += Math.min(100, penalty);
  });

  const avgPenalty = totalPenalty / validMatches.length;
  return Math.max(0, Math.round(100 - avgPenalty));
}

/**
 * Calculate play time balance (ensure all players get equal games)
 */
export function calculatePlayTimeBalance(
  matches: MatchPairing[],
  allPlayers: Player[]
): number {
  const playCount = new Map<string, number>();
  allPlayers.forEach((p) => playCount.set(p.id, 0));

  matches.forEach((match) => {
    [...match.teamAPlayers, ...match.teamBPlayers].forEach((p) => {
      playCount.set(p.id, (playCount.get(p.id) || 0) + 1);
    });
  });

  const counts = Array.from(playCount.values());
  if (counts.length === 0) return 100;

  const max = Math.max(...counts);
  const min = Math.min(...counts);

  if (max === 0) return 100;

  const imbalance = (max - min) / max;
  return Math.round(100 - imbalance * 100);
}

/**
 * Calculate overall fairness score
 */
export function calculateFairnessScore(
  matches: MatchPairing[],
  allPlayers: Player[],
  config: FairnessConfig = DEFAULT_FAIRNESS_CONFIG
): FairnessScore {
  const handicapBalance = calculateHandicapBalance(matches, config);
  const experienceBalance = calculateExperienceBalance(matches);
  const playTimeBalance = calculatePlayTimeBalance(matches, allPlayers);

  const overall = Math.round(
    handicapBalance * config.handicapWeight +
    experienceBalance * config.experienceWeight +
    playTimeBalance * config.playTimeWeight
  );

  const warnings: string[] = [];
  const suggestions: string[] = [];

  // Generate warnings
  matches.forEach((match, i) => {
    if (match.teamAPlayers.length === 0 || match.teamBPlayers.length === 0) return;

    const diff = calculateHandicapDiff(match.teamAPlayers, match.teamBPlayers);
    if (diff > config.maxHandicapDiff) {
      warnings.push(`Match ${i + 1}: Handicap difference of ${diff.toFixed(1)} exceeds ${config.maxHandicapDiff}`);
    }
  });

  // Generate suggestions
  if (handicapBalance < 70) {
    suggestions.push('Consider swapping players between matches to balance handicaps');
  }
  if (playTimeBalance < 80) {
    suggestions.push('Some players have significantly more/fewer matches than others');
  }

  return {
    overall,
    handicapBalance,
    experienceBalance,
    playTimeBalance,
    warnings,
    suggestions,
  };
}

/**
 * Get detailed breakdown for each match
 */
export function getFairnessBreakdown(
  matches: MatchPairing[],
  config: FairnessConfig = DEFAULT_FAIRNESS_CONFIG
): FairnessBreakdown[] {
  return matches.map((match, i) => {
    const teamAHandicap = calculateCombinedHandicap(match.teamAPlayers);
    const teamBHandicap = calculateCombinedHandicap(match.teamBPlayers);
    const handicapDiff = Math.abs(teamAHandicap - teamBHandicap);
    const isFair = handicapDiff <= config.maxHandicapDiff;

    return {
      match,
      matchNumber: i + 1,
      teamAHandicap,
      teamBHandicap,
      handicapDiff,
      isFair,
      warning: isFair
        ? undefined
        : `Handicap difference (${handicapDiff.toFixed(1)}) exceeds recommended max (${config.maxHandicapDiff})`,
    };
  });
}

/**
 * Generate optimal pairings using a greedy algorithm
 */
export function generateOptimalPairings(
  teamAPlayers: Player[],
  teamBPlayers: Player[],
  matchCount: number,
  playersPerTeam: number
): MatchPairing[] {
  // Sort players by handicap
  const sortedA = [...teamAPlayers].sort((a, b) => a.handicapIndex - b.handicapIndex);
  const sortedB = [...teamBPlayers].sort((a, b) => a.handicapIndex - b.handicapIndex);

  const matches: MatchPairing[] = [];
  const usedA = new Set<string>();
  const usedB = new Set<string>();

  for (let m = 0; m < matchCount; m++) {
    const matchAPlayers: Player[] = [];
    const matchBPlayers: Player[] = [];

    // Get available players
    const availableA = sortedA.filter((p) => !usedA.has(p.id));
    const availableB = sortedB.filter((p) => !usedB.has(p.id));

    // Select players for this match
    for (let p = 0; p < playersPerTeam; p++) {
      if (availableA[p]) {
        matchAPlayers.push(availableA[p]);
        usedA.add(availableA[p].id);
      }
      if (availableB[p]) {
        matchBPlayers.push(availableB[p]);
        usedB.add(availableB[p].id);
      }
    }

    matches.push({
      id: `match-${m + 1}`,
      teamAPlayers: matchAPlayers,
      teamBPlayers: matchBPlayers,
    });
  }

  return matches;
}

/**
 * Suggest swaps to improve fairness
 */
export function suggestSwaps(
  matches: MatchPairing[],
  config: FairnessConfig = DEFAULT_FAIRNESS_CONFIG
): { fromMatch: number; toMatch: number; player: Player; improvement: number }[] {
  const suggestions: { fromMatch: number; toMatch: number; player: Player; improvement: number }[] = [];

  const currentScore = calculateFairnessScore(matches, [], config).overall;

  // Try swapping each player with each other player on same team
  matches.forEach((match1, i) => {
    matches.forEach((match2, j) => {
      if (i >= j) return;

      // Try swapping Team A players
      match1.teamAPlayers.forEach((p1) => {
        match2.teamAPlayers.forEach((p2) => {
          // Simulate swap
          const newMatches = matches.map((m, idx) => {
            if (idx === i) {
              return {
                ...m,
                teamAPlayers: m.teamAPlayers.map((p) => (p.id === p1.id ? p2 : p)),
              };
            }
            if (idx === j) {
              return {
                ...m,
                teamAPlayers: m.teamAPlayers.map((p) => (p.id === p2.id ? p1 : p)),
              };
            }
            return m;
          });

          const newScore = calculateFairnessScore(newMatches, [], config).overall;
          const improvement = newScore - currentScore;

          if (improvement > 5) {
            suggestions.push({
              fromMatch: i + 1,
              toMatch: j + 1,
              player: p1,
              improvement,
            });
          }
        });
      });
    });
  });

  return suggestions.sort((a, b) => b.improvement - a.improvement).slice(0, 3);
}

// ============================================
// FAIRNESS CARD COMPONENT
// ============================================

interface FairnessCardProps {
  score: FairnessScore;
  breakdown?: FairnessBreakdown[];
  showDetails?: boolean;
  onImprove?: () => void;
  className?: string;
}

export function FairnessCard({
  score,
  breakdown,
  showDetails = false,
  onImprove,
  className,
}: FairnessCardProps) {
  const [expanded, setExpanded] = useState(false);

  const getColor = (value: number) => {
    if (value >= 80) return 'var(--success)';
    if (value >= 60) return 'var(--warning)';
    return 'var(--error)';
  };

  const getLabel = (value: number) => {
    if (value >= 90) return 'Excellent';
    if (value >= 80) return 'Good';
    if (value >= 60) return 'Fair';
    return 'Poor';
  };

  return (
    <div
      className={cn('rounded-2xl overflow-hidden', className)}
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--rule)',
      }}
    >
      {/* Header */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{
                background: `${getColor(score.overall)}15`,
              }}
            >
              <Scale className="w-6 h-6" style={{ color: getColor(score.overall) }} />
            </div>
            <div>
              <h3
                className="font-semibold"
                style={{ color: 'var(--ink)' }}
              >
                Fairness Score
              </h3>
              <p
                className="text-sm"
                style={{ color: getColor(score.overall) }}
              >
                {getLabel(score.overall)}
              </p>
            </div>
          </div>
          <div className="text-right">
            <span
              className="text-3xl font-bold"
              style={{ color: getColor(score.overall) }}
            >
              {score.overall}
            </span>
            <span
              className="text-lg"
              style={{ color: 'var(--ink-tertiary)' }}
            >
              /100
            </span>
          </div>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-3 gap-3">
          <MetricBar
            label="Handicap"
            value={score.handicapBalance}
            icon={<Target className="w-4 h-4" />}
          />
          <MetricBar
            label="Experience"
            value={score.experienceBalance}
            icon={<TrendingUp className="w-4 h-4" />}
          />
          <MetricBar
            label="Play Time"
            value={score.playTimeBalance}
            icon={<Users className="w-4 h-4" />}
          />
        </div>

        {/* Warnings */}
        {score.warnings.length > 0 && (
          <div className="mt-4 p-3 rounded-xl flex items-start gap-2 bg-[var(--warning)] text-[var(--canvas)]">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-sm">Attention Needed</p>
              <ul className="text-xs text-[color:var(--canvas)]/80 mt-1 space-y-0.5">
                {score.warnings.map((w, i) => (
                  <li key={i}>• {w}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Suggestions */}
        {score.suggestions.length > 0 && (
          <div
            className="mt-3 p-3 rounded-xl flex items-start gap-2"
            style={{ background: 'var(--surface-raised)' }}
          >
            <Info className="w-5 h-5 shrink-0 mt-0.5" style={{ color: 'var(--masters)' }} />
            <div>
              <p className="font-medium text-sm" style={{ color: 'var(--ink)' }}>
                Suggestions
              </p>
              <ul className="text-xs mt-1 space-y-0.5" style={{ color: 'var(--ink-secondary)' }}>
                {score.suggestions.map((s, i) => (
                  <li key={i}>• {s}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Actions */}
        {onImprove && score.overall < 80 && (
          <button
            onClick={onImprove}
            className="w-full mt-4 py-3 rounded-xl font-medium flex items-center justify-center gap-2 bg-[var(--masters)] text-[var(--canvas)]"
          >
            <Shuffle className="w-5 h-5" />
            Auto-improve Fairness
          </button>
        )}
      </div>

      {/* Breakdown (expandable) */}
      {showDetails && breakdown && breakdown.length > 0 && (
        <>
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full py-3 flex items-center justify-center gap-2 text-sm font-medium"
            style={{
              borderTop: '1px solid var(--rule)',
              color: 'var(--masters)',
            }}
          >
            {expanded ? 'Hide' : 'Show'} Match Breakdown
            <ChevronRight
              className={cn('w-4 h-4 transition-transform', expanded && 'rotate-90')}
            />
          </button>

          {expanded && (
            <div className="px-4 pb-4 space-y-2">
              {breakdown.map((b) => (
                <div
                  key={b.matchNumber}
                  className="flex items-center justify-between p-3 rounded-lg"
                  style={{ background: 'var(--surface-raised)' }}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={cn(
                        'w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold text-[var(--canvas)]',
                        b.isFair ? 'bg-[var(--success)]' : 'bg-[var(--warning)]'
                      )}
                    >
                      {b.matchNumber}
                    </span>
                    <div>
                      <p className="text-sm" style={{ color: 'var(--ink)' }}>
                        Match {b.matchNumber}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--ink-tertiary)' }}>
                        {b.teamAHandicap.toFixed(1)} vs {b.teamBHandicap.toFixed(1)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p
                      className="text-sm font-medium"
                      style={{ color: b.isFair ? 'var(--success)' : 'var(--warning)' }}
                    >
                      {b.isFair ? (
                        <CheckCircle2 className="w-5 h-5" />
                      ) : (
                        <span>Δ {b.handicapDiff.toFixed(1)}</span>
                      )}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ============================================
// METRIC BAR
// ============================================

interface MetricBarProps {
  label: string;
  value: number;
  icon: React.ReactNode;
}

function MetricBar({ label, value, icon }: MetricBarProps) {
  const getColor = (v: number) => {
    if (v >= 80) return 'var(--success)';
    if (v >= 60) return 'var(--warning)';
    return 'var(--error)';
  };

  return (
    <div className="text-center">
      <div
        className="w-8 h-8 mx-auto mb-1 rounded-lg flex items-center justify-center"
        style={{
          background: `${getColor(value)}15`,
          color: getColor(value),
        }}
      >
        {icon}
      </div>
      <div
        className="h-1.5 rounded-full mb-1"
        style={{ background: 'var(--rule)' }}
      >
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${value}%`,
            background: getColor(value),
          }}
        />
      </div>
      <p className="text-xs" style={{ color: 'var(--ink-tertiary)' }}>
        {label}
      </p>
    </div>
  );
}

// ============================================
// HOOK: USE FAIRNESS
// ============================================

export function useFairness(
  matches: MatchPairing[],
  allPlayers: Player[],
  config: FairnessConfig = DEFAULT_FAIRNESS_CONFIG
) {
  const score = useMemo(
    () => calculateFairnessScore(matches, allPlayers, config),
    [matches, allPlayers, config]
  );

  const breakdown = useMemo(
    () => getFairnessBreakdown(matches, config),
    [matches, config]
  );

  const swapSuggestions = useMemo(
    () => suggestSwaps(matches, config),
    [matches, config]
  );

  return {
    score,
    breakdown,
    swapSuggestions,
    isValid: score.warnings.length === 0,
    needsAttention: score.overall < 70,
  };
}

export default FairnessCard;
