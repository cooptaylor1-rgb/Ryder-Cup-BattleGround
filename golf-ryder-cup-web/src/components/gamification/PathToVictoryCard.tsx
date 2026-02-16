'use client';

/**
 * Path to Victory Component (Production Quality)
 *
 * Displays tournament clinch scenarios:
 * - Visual progress toward cup
 * - Each team's path to victory
 * - Dramatic moment highlighting
 */

import React, { useState } from 'react';
import { Trophy, TrendingUp, Target, AlertCircle, ChevronDown, ChevronUp, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TeamStandings } from '@/lib/types/computed';
import {
  calculatePathToVictory,
  getQuickSummary,
  detectDramaticMoment,
  type PathToVictory,
  type VictoryScenario,
} from '@/lib/services/pathToVictoryService';

// ============================================
// TYPES
// ============================================

interface PathToVictoryCardProps {
  standings: TeamStandings;
  pointsToWin: number;
  teamAName?: string;
  teamBName?: string;
  compact?: boolean;
}

// Brand colors (non-theme dependent)
const COLORS = {
  usa: '#1565C0',
  europe: '#C62828',
  gold: '#FFD54F',
  green: '#004225',
  success: '#4CAF50',
  warning: '#FF9800',
  error: '#EF5350',
};

// ============================================
// MAIN COMPONENT
// ============================================

export function PathToVictoryCard({
  standings,
  pointsToWin,
  teamAName = 'Team USA',
  teamBName = 'Team Europe',
  compact = false,
}: PathToVictoryCardProps) {
  const [expanded, setExpanded] = useState(false);

  const pathData = calculatePathToVictory(standings, pointsToWin, teamAName, teamBName);
  const { teamASummary, teamBSummary } = getQuickSummary(pathData);
  const dramaticMoment = detectDramaticMoment(pathData);

  if (pathData.isDecided && !expanded) {
    const winner = pathData.teamA.hasClinched ? pathData.teamA : pathData.teamB;
    return (
      <div className="rounded-2xl border-2 border-[#FFD54F] bg-[linear-gradient(135deg,#FFD54F33,#FFD54F1a)] p-6 text-center">
        <Trophy size={40} className="mx-auto mb-3 text-[#FFD54F]" />
        <h3 className="mb-2 text-2xl font-bold text-[var(--ink)]">{winner.name} Wins!</h3>
        <p className="text-base text-[var(--ink-secondary)]">
          Final: {pathData.teamA.currentPoints} - {pathData.teamB.currentPoints}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl overflow-hidden border border-[color:var(--rule)]/30 bg-[var(--surface)]">
      {/* Dramatic Moment Banner */}
      {dramaticMoment && (
        <div className="flex items-center gap-3 border-b border-b-[#FFD54F66] bg-[linear-gradient(90deg,#FFD54F4d,#FFD54F1a)] px-4 py-3">
          <Zap size={20} className="text-[#FFD54F]" />
          <div>
            <div className="text-xs font-semibold text-[#FFD54F]">{dramaticMoment.headline}</div>
            <div className="text-xs text-[var(--ink-secondary)]">{dramaticMoment.subtext}</div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Target size={20} className="text-[#004225]" />
            <h3 className="text-sm font-semibold text-[var(--ink)]">
              Path to Victory
            </h3>
          </div>
          <div className="text-xs text-[var(--ink-secondary)]">
            {pathData.remainingMatches} matches remaining
          </div>
        </div>

        {/* Progress Bar */}
        <CupProgressBar pathData={pathData} />

        {/* Quick Summaries */}
        <div className="flex flex-col gap-3 mt-4">
          <QuickSummaryRow
            summary={teamASummary}
            color={COLORS.usa}
            hasClinched={pathData.teamA.hasClinched}
            isEliminated={pathData.teamA.isEliminated}
          />
          <QuickSummaryRow
            summary={teamBSummary}
            color={COLORS.europe}
            hasClinched={pathData.teamB.hasClinched}
            isEliminated={pathData.teamB.isEliminated}
          />
        </div>
      </div>

      {/* Expand/Collapse */}
      {!compact && (
        <>
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex w-full cursor-pointer items-center justify-center gap-2 border-t border-[color:var(--rule)]/30 bg-[var(--surface)] py-3 text-xs text-[var(--ink-secondary)] transition-colors hover:bg-[var(--surface-raised)] hover:text-[var(--ink)]"
          >
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            {expanded ? 'Hide scenarios' : 'View detailed scenarios'}
          </button>

          {expanded && (
            <div className="border-t border-[color:var(--rule)]/30 bg-[var(--canvas-sunken)] p-4">
              <div className="grid grid-cols-2 gap-4">
                <TeamScenarios team={pathData.teamA} color={COLORS.usa} />
                <TeamScenarios team={pathData.teamB} color={COLORS.europe} />
              </div>
              <div className="mt-4 flex items-center gap-3 rounded-lg border border-[color:var(--rule)]/30 bg-[var(--surface-raised)] p-3">
                <AlertCircle size={16} className="text-[var(--ink-tertiary)]" />
                <span className="text-xs text-[var(--ink-secondary)]">{pathData.tieBreaker}</span>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function CupProgressBar({ pathData }: { pathData: PathToVictory }) {
  const { teamA, teamB, pointsToWin } = pathData;
  const teamAPercent = Math.min(100, (teamA.currentPoints / pointsToWin) * 50);
  const teamBPercent = Math.min(100, (teamB.currentPoints / pointsToWin) * 50);

  return (
    <div>
      <div className="flex justify-between mb-2">
        <div className="text-xl font-bold text-[#1565C0]">{teamA.currentPoints}</div>
        <div className="text-xs text-[var(--ink-secondary)]">{pointsToWin} to win</div>
        <div className="text-xl font-bold text-[#C62828]">{teamB.currentPoints}</div>
      </div>
      <div className="relative flex h-3 overflow-hidden rounded-full bg-[color:var(--rule)]/25">
        <div
          className="bg-[linear-gradient(90deg,#1565C0,#1565C0cc)] transition-[width] duration-300 ease-out"
          style={{ width: `${teamAPercent}%` }}
        />
        <div className="absolute left-1/2 top-1/2 z-10 flex h-5 w-5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-[#FFD54F] shadow-[0_0_8px_#FFD54F66]">
          <Trophy size={12} className="text-[var(--ink)]" />
        </div>
        <div className="flex-1" />
        <div
          className="bg-[linear-gradient(90deg,#C62828cc,#C62828)] transition-[width] duration-300 ease-out"
          style={{ width: `${teamBPercent}%` }}
        />
      </div>
    </div>
  );
}

function QuickSummaryRow({
  summary,
  color,
  hasClinched,
  isEliminated,
}: {
  summary: string;
  color: string;
  hasClinched: boolean;
  isEliminated: boolean;
}) {
  return (
    <div
      style={{ '--ptv-color': color } as React.CSSProperties}
      className={cn(
        'flex items-center gap-3 rounded-lg border-l-[3px] border-l-[var(--ptv-color)] p-3',
        'bg-[color-mix(in_srgb,var(--ptv-color)_10%,transparent)]',
        isEliminated && 'opacity-50'
      )}
    >
      {hasClinched ? (
        <Trophy size={16} className="text-[#FFD54F]" />
      ) : (
        <TrendingUp size={16} className="text-[var(--ptv-color)]" />
      )}
      <span className="flex-1 text-sm text-[var(--ink)]">{summary}</span>
    </div>
  );
}

function TeamScenarios({ team, color }: { team: PathToVictory['teamA']; color: string }) {
  return (
    <div>
      <div
        style={{ '--ptv-team-color': color } as React.CSSProperties}
        className="mb-3 text-sm font-semibold text-[var(--ptv-team-color)]"
      >
        {team.name}
      </div>
      {team.hasClinched ? (
        <div className="flex items-center gap-2 rounded-lg bg-[#FFD54F]/20 p-3">
          <Trophy size={16} className="text-[#FFD54F]" />
          <span className="text-sm text-[#FFD54F]">Cup clinched!</span>
        </div>
      ) : team.isEliminated ? (
        <div className="rounded-lg border border-[color:var(--rule)]/30 bg-[var(--surface)] p-3 text-sm text-[var(--ink-secondary)]">
          Eliminated from contention
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {team.scenarios.map((scenario, index) => (
            <ScenarioRow key={index} scenario={scenario} />
          ))}
        </div>
      )}
    </div>
  );
}

function ScenarioRow({ scenario }: { scenario: VictoryScenario }) {
  const dotClassName =
    scenario.probability === 'high'
      ? 'bg-[#4CAF50]'
      : scenario.probability === 'medium'
        ? 'bg-[#FF9800]'
        : scenario.probability === 'low'
          ? 'bg-[#FF9800]'
          : 'bg-[#EF5350]';

  return (
    <div className="flex items-center gap-3 rounded border border-[color:var(--rule)]/20 bg-[var(--surface)] p-2">
      <div className={cn('h-2 w-2 rounded-full', dotClassName)} />
      <span className="flex-1 text-xs text-[var(--ink)]">{scenario.description}</span>
    </div>
  );
}

export function PathToVictoryInline({
  standings,
  pointsToWin,
  teamAName = 'Team USA',
  teamBName = 'Team Europe',
}: Omit<PathToVictoryCardProps, 'compact'>) {
  const pathData = calculatePathToVictory(standings, pointsToWin, teamAName, teamBName);
  const { teamASummary, teamBSummary } = getQuickSummary(pathData);

  if (pathData.isDecided) {
    const winner = pathData.teamA.hasClinched ? pathData.teamA : pathData.teamB;
    return (
      <div className="flex items-center gap-2 text-sm text-[#FFD54F]">
        <Trophy size={14} />
        {winner.name} wins the cup
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1 text-xs text-[var(--ink-secondary)]">
      <div>{teamASummary}</div>
      <div>{teamBSummary}</div>
    </div>
  );
}

export default PathToVictoryCard;
