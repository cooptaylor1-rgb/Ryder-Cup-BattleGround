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

// Colors
const COLORS = {
    usa: '#1565C0',
    europe: '#C62828',
    gold: '#FFD54F',
    green: '#004225',
    success: '#4CAF50',
    warning: '#FF9800',
    error: '#EF5350',
    textPrimary: '#FFFFFF',
    textSecondary: '#A0A0A0',
    surface: '#141414',
    surfaceElevated: '#1E1E1E',
    border: '#3A3A3A',
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
            <div
                style={{
                    background: `linear-gradient(135deg, ${COLORS.gold}20, ${COLORS.gold}10)`,
                    borderRadius: '16px',
                    padding: '24px',
                    border: `2px solid ${COLORS.gold}`,
                    textAlign: 'center',
                }}
            >
                <Trophy
                    size={40}
                    style={{ color: COLORS.gold, margin: '0 auto', marginBottom: '12px' }}
                />
                <h3 style={{
                    fontSize: '1.5rem',
                    fontWeight: 700,
                    color: COLORS.textPrimary,
                    marginBottom: '8px',
                }}>
                    {winner.name} Wins!
                </h3>
                <p style={{
                    fontSize: '1rem',
                    color: COLORS.textSecondary,
                }}>
                    Final: {pathData.teamA.currentPoints} - {pathData.teamB.currentPoints}
                </p>
            </div>
        );
    }

    return (
        <div
            style={{
                background: COLORS.surface,
                borderRadius: '16px',
                overflow: 'hidden',
                border: `1px solid ${COLORS.border}`,
            }}
        >
            {/* Dramatic Moment Banner */}
            {dramaticMoment && (
                <div
                    style={{
                        background: `linear-gradient(90deg, ${COLORS.gold}30, ${COLORS.gold}10)`,
                        padding: '12px 16px',
                        borderBottom: `1px solid ${COLORS.gold}40`,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                    }}
                >
                    <Zap size={20} style={{ color: COLORS.gold }} />
                    <div>
                        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: COLORS.gold }}>
                            {dramaticMoment.headline}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: COLORS.textSecondary }}>
                            {dramaticMoment.subtext}
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <div style={{ padding: '16px' }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '16px',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <Target size={20} style={{ color: COLORS.green }} />
                        <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: COLORS.textPrimary }}>
                            Path to Victory
                        </h3>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: COLORS.textSecondary }}>
                        {pathData.remainingMatches} matches remaining
                    </div>
                </div>

                {/* Progress Bar */}
                <CupProgressBar pathData={pathData} />

                {/* Quick Summaries */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
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
                        style={{
                            width: '100%',
                            padding: '12px',
                            background: COLORS.surfaceElevated,
                            border: 'none',
                            borderTop: `1px solid ${COLORS.border}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            color: COLORS.textSecondary,
                            cursor: 'pointer',
                            fontSize: '0.75rem',
                        }}
                    >
                        {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        {expanded ? 'Hide scenarios' : 'View detailed scenarios'}
                    </button>

                    {expanded && (
                        <div style={{
                            padding: '16px',
                            borderTop: `1px solid ${COLORS.border}`,
                            background: COLORS.surfaceElevated,
                        }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <TeamScenarios team={pathData.teamA} color={COLORS.usa} />
                                <TeamScenarios team={pathData.teamB} color={COLORS.europe} />
                            </div>
                            <div style={{
                                marginTop: '16px',
                                padding: '12px',
                                background: COLORS.surface,
                                borderRadius: '8px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                            }}>
                                <AlertCircle size={16} style={{ color: COLORS.textSecondary }} />
                                <span style={{ fontSize: '0.75rem', color: COLORS.textSecondary }}>
                                    {pathData.tieBreaker}
                                </span>
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
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: COLORS.usa }}>{teamA.currentPoints}</div>
                <div style={{ fontSize: '0.75rem', color: COLORS.textSecondary }}>{pointsToWin} to win</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: COLORS.europe }}>{teamB.currentPoints}</div>
            </div>
            <div style={{
                display: 'flex',
                height: 12,
                background: COLORS.border,
                borderRadius: '9999px',
                overflow: 'hidden',
                position: 'relative',
            }}>
                <div style={{
                    width: `${teamAPercent}%`,
                    background: `linear-gradient(90deg, ${COLORS.usa}, ${COLORS.usa}CC)`,
                    transition: 'width 0.3s ease',
                }} />
                <div style={{
                    position: 'absolute',
                    left: '50%',
                    top: '50%',
                    transform: 'translate(-50%, -50%)',
                    background: COLORS.gold,
                    borderRadius: '50%',
                    width: 20,
                    height: 20,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 2,
                    boxShadow: `0 0 8px ${COLORS.gold}40`,
                }}>
                    <Trophy size={12} style={{ color: '#000' }} />
                </div>
                <div style={{ flex: 1 }} />
                <div style={{
                    width: `${teamBPercent}%`,
                    background: `linear-gradient(90deg, ${COLORS.europe}CC, ${COLORS.europe})`,
                    transition: 'width 0.3s ease',
                }} />
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
        <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px',
            background: `${color}10`,
            borderRadius: '8px',
            borderLeft: `3px solid ${color}`,
            opacity: isEliminated ? 0.5 : 1,
        }}>
            {hasClinched ? (
                <Trophy size={16} style={{ color: COLORS.gold }} />
            ) : (
                <TrendingUp size={16} style={{ color }} />
            )}
            <span style={{ fontSize: '0.875rem', color: COLORS.textPrimary, flex: 1 }}>{summary}</span>
        </div>
    );
}

function TeamScenarios({ team, color }: { team: PathToVictory['teamA']; color: string }) {
    return (
        <div>
            <div style={{ fontSize: '0.875rem', fontWeight: 600, color, marginBottom: '12px' }}>{team.name}</div>
            {team.hasClinched ? (
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '12px',
                    background: `${COLORS.gold}20`,
                    borderRadius: '8px',
                }}>
                    <Trophy size={16} style={{ color: COLORS.gold }} />
                    <span style={{ fontSize: '0.875rem', color: COLORS.gold }}>Cup clinched!</span>
                </div>
            ) : team.isEliminated ? (
                <div style={{
                    padding: '12px',
                    background: COLORS.surface,
                    borderRadius: '8px',
                    fontSize: '0.875rem',
                    color: COLORS.textSecondary,
                }}>
                    Eliminated from contention
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {team.scenarios.map((scenario, index) => (
                        <ScenarioRow key={index} scenario={scenario} />
                    ))}
                </div>
            )}
        </div>
    );
}

function ScenarioRow({ scenario }: { scenario: VictoryScenario }) {
    const probabilityColors = {
        high: COLORS.success,
        medium: COLORS.warning,
        low: '#FF9800',
        unlikely: COLORS.error,
    };
    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '8px',
            background: COLORS.surface,
            borderRadius: '4px',
        }}>
            <div style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: probabilityColors[scenario.probability],
            }} />
            <span style={{ fontSize: '0.75rem', color: COLORS.textPrimary, flex: 1 }}>{scenario.description}</span>
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem', color: COLORS.gold }}>
                <Trophy size={14} />
                {winner.name} wins the cup
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.75rem', color: COLORS.textSecondary }}>
            <div>{teamASummary}</div>
            <div>{teamBSummary}</div>
        </div>
    );
}

export default PathToVictoryCard;
