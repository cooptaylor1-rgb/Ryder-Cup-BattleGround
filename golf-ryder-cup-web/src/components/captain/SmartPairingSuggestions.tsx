'use client';

import { useState, useMemo } from 'react';
import {
  generatePairingSuggestions,
  extractPairingHistory,
  analyzeSessionPairings,
  type PairingSuggestion,
} from '@/lib/services/smartPairingService';
import { Player, Team, RyderCupSession, Match } from '@/lib/types';
import {
  Users,
  Lightbulb,
  AlertTriangle,
  CheckCircle,
  History,
  Star,
  ArrowRight,
  Info,
} from 'lucide-react';

interface SmartPairingSuggestionsProps {
  players: Player[];
  teams: Team[];
  sessions: RyderCupSession[];
  matches: Match[];
  currentSessionId?: string;
  onApplySuggestion?: (suggestion: PairingSuggestion) => void;
}

type FairnessTone = 'success' | 'warning' | 'error';

function getFairnessTone(score: number): FairnessTone {
  if (score >= 0.8) return 'success';
  if (score >= 0.6) return 'warning';
  return 'error';
}

function toneStyles(tone: FairnessTone) {
  switch (tone) {
    case 'success':
      return {
        bg: 'bg-[color:var(--success)]/12',
        text: 'text-[var(--success)]',
        badge: 'bg-[color:var(--success)]/15 text-[var(--success)]',
      };
    case 'warning':
      return {
        bg: 'bg-[color:var(--warning)]/12',
        text: 'text-[var(--warning)]',
        badge: 'bg-[color:var(--warning)]/15 text-[var(--warning)]',
      };
    case 'error':
      return {
        bg: 'bg-[color:var(--error)]/12',
        text: 'text-[var(--error)]',
        badge: 'bg-[color:var(--error)]/15 text-[var(--error)]',
      };
  }
}

export function SmartPairingSuggestions({
  players,
  teams,
  sessions,
  matches,
  currentSessionId,
  onApplySuggestion,
}: SmartPairingSuggestionsProps) {
  const [selectedFormat, setSelectedFormat] = useState<'fourball' | 'foursomes' | 'singles'>('fourball');
  const [showHistory, setShowHistory] = useState(false);

  // Get current trip ID from first session
  const tripId = sessions[0]?.tripId;

  // Split players by team - MUST be called unconditionally
  const { teamAPlayers, teamBPlayers } = useMemo(() => {
    if (!tripId || teams.length < 2) {
      // Default split if no teams defined - use stable player order
      const sortedPlayers = [...players].sort((a, b) => a.id.localeCompare(b.id));
      const half = Math.ceil(sortedPlayers.length / 2);
      return {
        teamAPlayers: sortedPlayers.slice(0, half),
        teamBPlayers: sortedPlayers.slice(half),
      };
    }

    // Get players assigned to each team from matches
    const teamAIds = new Set<string>();
    const teamBIds = new Set<string>();

    matches.forEach(m => {
      m.teamAPlayerIds?.forEach(id => teamAIds.add(id));
      m.teamBPlayerIds?.forEach(id => teamBIds.add(id));
    });

    // For unassigned players, split them evenly in a stable manner
    const unassignedPlayers = players
      .filter(p => !teamAIds.has(p.id) && !teamBIds.has(p.id))
      .sort((a, b) => a.id.localeCompare(b.id));

    const halfUnassigned = Math.ceil(unassignedPlayers.length / 2);
    const unassignedToA = new Set(unassignedPlayers.slice(0, halfUnassigned).map(p => p.id));

    return {
      teamAPlayers: players.filter(p => teamAIds.has(p.id) || unassignedToA.has(p.id)),
      teamBPlayers: players.filter(p => teamBIds.has(p.id) || (!teamAIds.has(p.id) && !unassignedToA.has(p.id))),
    };
  }, [players, teams, matches, tripId]);

  // Extract pairing history from past matches - MUST be called unconditionally
  const pairingHistory = useMemo(() => {
    if (!tripId) return [];
    return extractPairingHistory(matches, sessions, tripId);
  }, [matches, sessions, tripId]);

  // Get or create current session - MUST be called unconditionally
  const currentSession = useMemo(() => {
    if (!tripId) return null;
    if (currentSessionId) {
      return sessions.find(s => s.id === currentSessionId) || null;
    }
    // Create a mock session for suggestions
    return sessions[0] || {
      id: 'temp',
      tripId,
      name: 'New Session',
      sessionNumber: 1,
      sessionType: selectedFormat,
      status: 'scheduled' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }, [currentSessionId, sessions, tripId, selectedFormat]);

  // Generate suggestions - MUST be called unconditionally
  const suggestions = useMemo(() => {
    if (!currentSession || !tripId || teamAPlayers.length === 0 || teamBPlayers.length === 0) {
      return [];
    }

    // Create session with correct type
    const sessionForSuggestions: RyderCupSession = {
      ...currentSession,
      sessionType: selectedFormat,
    };

    const matchCount = Math.min(
      selectedFormat === 'singles' ? teamAPlayers.length : Math.floor(teamAPlayers.length / 2),
      selectedFormat === 'singles' ? teamBPlayers.length : Math.floor(teamBPlayers.length / 2)
    );

    return generatePairingSuggestions(
      sessionForSuggestions,
      teamAPlayers,
      teamBPlayers,
      pairingHistory,
      [], // No constraints for now
      matchCount
    );
  }, [currentSession, teamAPlayers, teamBPlayers, pairingHistory, selectedFormat, tripId]);

  // Analyze current session if provided - MUST be called unconditionally
  const currentSessionAnalysis = useMemo(() => {
    if (!currentSessionId || !currentSession || !tripId) return null;
    const sessionMatches = matches.filter(m => m.sessionId === currentSessionId);
    if (sessionMatches.length === 0) return null;
    return analyzeSessionPairings(
      currentSession,
      sessionMatches,
      teamAPlayers,
      teamBPlayers,
      pairingHistory,
      []
    );
  }, [currentSessionId, currentSession, matches, teamAPlayers, teamBPlayers, pairingHistory, tripId]);

  // Calculate overall fairness from suggestions average - MUST be called unconditionally
  const overallFairness = useMemo(() => {
    if (suggestions.length === 0) return 0.7; // Default
    const avgScore = suggestions.reduce((sum, s) => sum + s.fairnessScore, 0) / suggestions.length;
    return avgScore / 100;
  }, [suggestions]);

  const overallTone = getFairnessTone(overallFairness);
  const overallToneStyles = toneStyles(overallTone);

  // Early return AFTER all hooks
  if (!tripId) {
    return (
      <div className="card p-4 text-center text-[var(--ink-tertiary)]">
        No active trip found. Please create a trip first.
      </div>
    );
  }

  const getPlayerName = (playerId: string) => {
    const player = players.find(p => p.id === playerId);
    return player ? `${player.firstName} ${player.lastName}` : 'Unknown';
  };

  const getTeamName = (index: 0 | 1) => {
    return teams[index]?.name || (index === 0 ? 'Team A' : 'Team B');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Lightbulb className="w-6 h-6 text-[var(--color-accent)]" />
          <div>
            <h3 className="font-semibold text-[var(--ink-primary)]">
              Smart Pairing Suggestions
            </h3>
            <p className="text-sm text-[var(--ink-tertiary)]">
              AI-powered recommendations based on history
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowHistory(!showHistory)}
          className={
            `p-2 rounded-lg transition-colors ${showHistory
              ? 'bg-[color:var(--info)]/12 text-[var(--info)]'
              : 'hover:bg-[var(--surface-secondary)] text-[var(--ink-secondary)]'
            }`
          }
          title="View pairing history"
        >
          <History className="w-5 h-5" />
        </button>
      </div>

      {/* Fairness Score */}
      <div className="p-4 rounded-lg border border-[var(--rule)] bg-linear-to-r from-[color:var(--info)]/10 to-[color:var(--color-accent)]/8">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-[var(--ink-secondary)]">Overall Pairing Fairness</p>
            <p className="text-2xl font-bold text-[var(--ink-primary)]">
              {Math.round(overallFairness * 100)}%
            </p>
          </div>
          <div className={`p-3 rounded-full ${overallToneStyles.bg}`}>
            {overallTone === 'success' ? (
              <CheckCircle className={`w-6 h-6 ${overallToneStyles.text}`} />
            ) : (
              <AlertTriangle className={`w-6 h-6 ${overallToneStyles.text}`} />
            )}
          </div>
        </div>
        <p className="text-sm text-[var(--ink-tertiary)] mt-2">
          {overallFairness >= 0.8
            ? 'Pairings are well-distributed across players'
            : overallFairness >= 0.6
              ? 'Some players have played together frequently'
              : 'Consider mixing up pairings more'}
        </p>
      </div>

      {/* Format Selection */}
      <div>
        <label className="block text-sm font-medium text-[var(--ink-secondary)] mb-2">
          Match Format
        </label>
        <div className="flex gap-2">
          {(['fourball', 'foursomes', 'singles'] as const).map(format => (
            <button
              key={format}
              onClick={() => setSelectedFormat(format)}
              className={
                `px-4 py-2 rounded-lg text-sm font-medium transition-colors ${selectedFormat === format
                  ? 'bg-[var(--masters)] text-[var(--canvas)]'
                  : 'bg-[var(--surface-secondary)] text-[var(--ink-secondary)] hover:bg-[var(--surface-tertiary)]'
                }`
              }
            >
              {format.charAt(0).toUpperCase() + format.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Suggestions */}
      <div className="space-y-3">
        <h4 className="font-medium text-[var(--ink-primary)]">
          Recommended Pairings
        </h4>
        {suggestions.length === 0 ? (
          <p className="text-[var(--ink-tertiary)] text-center py-4">
            No suggestions available. Add more players to generate pairings.
          </p>
        ) : (
          suggestions.map((suggestion, idx) => {
            const suggestionTone = getFairnessTone(suggestion.fairnessScore / 100);
            const suggestionToneStyles = toneStyles(suggestionTone);

            return (
              <div
                key={idx}
                className="p-4 border border-[var(--rule)] bg-[var(--surface)] rounded-lg hover:border-[color:var(--masters)]/60 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-0.5 text-xs rounded-full ${suggestionToneStyles.badge}`}>
                        Score: {suggestion.fairnessScore}
                      </span>
                      {suggestion.fairnessScore >= 80 && (
                        <Star className="w-4 h-4 text-[var(--warning)]" />
                      )}
                    </div>

                    {/* Team A */}
                    <div className="mb-2">
                      <p className="text-xs text-[var(--info)] mb-1">
                        {getTeamName(0)}
                      </p>
                      <div className="flex items-center gap-2 text-[var(--ink-primary)]">
                        <Users className="w-4 h-4 text-[var(--ink-tertiary)]" />
                        {suggestion.teamAPlayers.map(getPlayerName).join(' & ')}
                      </div>
                    </div>

                    <div className="flex items-center justify-center my-2">
                      <span className="text-sm text-[var(--ink-tertiary)]">vs</span>
                    </div>

                    {/* Team B */}
                    <div>
                      <p className="text-xs text-[var(--error)] mb-1">
                        {getTeamName(1)}
                      </p>
                      <div className="flex items-center gap-2 text-[var(--ink-primary)]">
                        <Users className="w-4 h-4 text-[var(--ink-tertiary)]" />
                        {suggestion.teamBPlayers.map(getPlayerName).join(' & ')}
                      </div>
                    </div>

                    {/* Handicap Gap */}
                    {suggestion.handicapGap > 0 && (
                      <div className="mt-2 text-xs text-[var(--ink-tertiary)]">
                        Handicap gap: {suggestion.handicapGap.toFixed(1)} strokes
                      </div>
                    )}

                    {/* Reasoning */}
                    {suggestion.reasoning.length > 0 && (
                      <div className="mt-3 flex items-start gap-2">
                        <Info className="w-4 h-4 text-[var(--ink-tertiary)] mt-0.5" />
                        <p className="text-sm text-[var(--ink-secondary)]">
                          {suggestion.reasoning.join(' • ')}
                        </p>
                      </div>
                    )}

                    {/* Warnings */}
                    {suggestion.warnings.length > 0 && (
                      <div className="mt-2 flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-[var(--warning)] mt-0.5" />
                        <p className="text-sm text-[var(--warning)]">
                          {suggestion.warnings.join(' • ')}
                        </p>
                      </div>
                    )}
                  </div>

                  {onApplySuggestion && (
                    <button
                      onClick={() => onApplySuggestion(suggestion)}
                      className="ml-4 p-2 bg-[var(--masters)] text-[var(--canvas)] rounded-lg hover:bg-[var(--masters-deep)] transition-colors"
                      title="Apply this pairing"
                    >
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pairing History */}
      {showHistory && (
        <div className="border border-[var(--rule)] rounded-lg overflow-hidden bg-[var(--surface)]">
          <div className="bg-[var(--surface-secondary)] px-4 py-3 border-b border-[var(--rule)]">
            <h4 className="font-medium text-[var(--ink-primary)]">
              Pairing History
            </h4>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {pairingHistory.length === 0 ? (
              <p className="text-center text-[var(--ink-tertiary)] py-4">
                No pairing history yet
              </p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-[var(--surface-secondary)] sticky top-0">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium text-[var(--ink-secondary)]">Players</th>
                    <th className="px-4 py-2 text-left font-medium text-[var(--ink-secondary)]">Type</th>
                    <th className="px-4 py-2 text-left font-medium text-[var(--ink-secondary)]">Format</th>
                    <th className="px-4 py-2 text-left font-medium text-[var(--ink-secondary)]">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[color:var(--rule)]">
                  {pairingHistory.slice(0, 20).map((entry, idx) => (
                    <tr key={idx} className="hover:bg-[var(--surface-secondary)]">
                      <td className="px-4 py-2 text-[var(--ink-primary)]">
                        {getPlayerName(entry.player1Id)} & {getPlayerName(entry.player2Id)}
                      </td>
                      <td className="px-4 py-2 text-[var(--ink-secondary)] capitalize">
                        {entry.relationship}
                      </td>
                      <td className="px-4 py-2 text-[var(--ink-secondary)] capitalize">
                        {entry.sessionType}
                      </td>
                      <td className="px-4 py-2 text-[var(--ink-tertiary)] text-xs">
                        {entry.timestamp
                          ? new Date(entry.timestamp).toLocaleDateString()
                          : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Current Session Analysis */}
      {currentSessionAnalysis && (
        <div className="p-4 rounded-lg border border-[var(--rule)] bg-[var(--surface-secondary)]">
          <h4 className="font-medium text-[var(--ink-primary)] mb-2">
            Current Session Analysis
          </h4>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-[var(--ink-primary)]">
                {currentSessionAnalysis.overallFairnessScore}%
              </p>
              <p className="text-xs text-[var(--ink-tertiary)]">Fairness Score</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-[var(--ink-primary)]">
                {currentSessionAnalysis.repeatMatchupCount}
              </p>
              <p className="text-xs text-[var(--ink-tertiary)]">Repeat Matchups</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-[var(--ink-primary)]">
                {currentSessionAnalysis.handicapBalance}%
              </p>
              <p className="text-xs text-[var(--ink-tertiary)]">Handicap Balance</p>
            </div>
          </div>
          {currentSessionAnalysis.suggestions.length > 0 && (
            <div className="mt-3 pt-3 border-t border-[var(--rule)]">
              <p className="text-sm text-[var(--ink-secondary)]">
                💡 {currentSessionAnalysis.suggestions[0]}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default SmartPairingSuggestions;
