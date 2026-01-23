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

  // Early return AFTER all hooks
  if (!tripId) {
    return (
      <div className="p-4 text-center text-gray-500 dark:text-gray-400">
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
          <Lightbulb className="w-6 h-6 text-yellow-500" />
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">
              Smart Pairing Suggestions
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              AI-powered recommendations based on history
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowHistory(!showHistory)}
          className={`p-2 rounded-lg transition-colors ${showHistory
            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600'
            : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300'
            }`}
          title="View pairing history"
        >
          <History className="w-5 h-5" />
        </button>
      </div>

      {/* Fairness Score */}
      <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-300">Overall Pairing Fairness</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {Math.round(overallFairness * 100)}%
            </p>
          </div>
          <div className={`p-3 rounded-full ${overallFairness >= 0.8
            ? 'bg-green-100 dark:bg-green-900/30'
            : overallFairness >= 0.6
              ? 'bg-yellow-100 dark:bg-yellow-900/30'
              : 'bg-red-100 dark:bg-red-900/30'
            }`}>
            {overallFairness >= 0.8 ? (
              <CheckCircle className="w-6 h-6 text-green-600" />
            ) : overallFairness >= 0.6 ? (
              <AlertTriangle className="w-6 h-6 text-yellow-600" />
            ) : (
              <AlertTriangle className="w-6 h-6 text-red-600" />
            )}
          </div>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
          {overallFairness >= 0.8
            ? 'Pairings are well-distributed across players'
            : overallFairness >= 0.6
              ? 'Some players have played together frequently'
              : 'Consider mixing up pairings more'}
        </p>
      </div>

      {/* Format Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Match Format
        </label>
        <div className="flex gap-2">
          {(['fourball', 'foursomes', 'singles'] as const).map(format => (
            <button
              key={format}
              onClick={() => setSelectedFormat(format)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${selectedFormat === format
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
            >
              {format.charAt(0).toUpperCase() + format.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Suggestions */}
      <div className="space-y-3">
        <h4 className="font-medium text-gray-900 dark:text-white">
          Recommended Pairings
        </h4>
        {suggestions.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-center py-4">
            No suggestions available. Add more players to generate pairings.
          </p>
        ) : (
          suggestions.map((suggestion, idx) => (
            <div
              key={idx}
              className="p-4 border dark:border-gray-700 rounded-lg hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-0.5 text-xs rounded-full ${suggestion.fairnessScore >= 80
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : suggestion.fairnessScore >= 60
                        ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                        : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                      }`}>
                      Score: {suggestion.fairnessScore}
                    </span>
                    {suggestion.fairnessScore >= 80 && (
                      <Star className="w-4 h-4 text-yellow-500" />
                    )}
                  </div>

                  {/* Team A */}
                  <div className="mb-2">
                    <p className="text-xs text-blue-600 dark:text-blue-400 mb-1">
                      {getTeamName(0)}
                    </p>
                    <div className="flex items-center gap-2 text-gray-900 dark:text-white">
                      <Users className="w-4 h-4 text-gray-400" />
                      {suggestion.teamAPlayers.map(getPlayerName).join(' & ')}
                    </div>
                  </div>

                  <div className="flex items-center justify-center my-2">
                    <span className="text-sm text-gray-400">vs</span>
                  </div>

                  {/* Team B */}
                  <div>
                    <p className="text-xs text-red-600 dark:text-red-400 mb-1">
                      {getTeamName(1)}
                    </p>
                    <div className="flex items-center gap-2 text-gray-900 dark:text-white">
                      <Users className="w-4 h-4 text-gray-400" />
                      {suggestion.teamBPlayers.map(getPlayerName).join(' & ')}
                    </div>
                  </div>

                  {/* Handicap Gap */}
                  {suggestion.handicapGap > 0 && (
                    <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                      Handicap gap: {suggestion.handicapGap.toFixed(1)} strokes
                    </div>
                  )}

                  {/* Reasoning */}
                  {suggestion.reasoning.length > 0 && (
                    <div className="mt-3 flex items-start gap-2">
                      <Info className="w-4 h-4 text-gray-400 mt-0.5" />
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {suggestion.reasoning.join(' • ')}
                      </p>
                    </div>
                  )}

                  {/* Warnings */}
                  {suggestion.warnings.length > 0 && (
                    <div className="mt-2 flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5" />
                      <p className="text-sm text-yellow-600 dark:text-yellow-400">
                        {suggestion.warnings.join(' • ')}
                      </p>
                    </div>
                  )}
                </div>

                {onApplySuggestion && (
                  <button
                    onClick={() => onApplySuggestion(suggestion)}
                    className="ml-4 p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                    title="Apply this pairing"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pairing History */}
      {showHistory && (
        <div className="border dark:border-gray-700 rounded-lg overflow-hidden">
          <div className="bg-gray-50 dark:bg-gray-800 px-4 py-3 border-b dark:border-gray-700">
            <h4 className="font-medium text-gray-900 dark:text-white">
              Pairing History
            </h4>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {pairingHistory.length === 0 ? (
              <p className="text-center text-gray-500 dark:text-gray-400 py-4">
                No pairing history yet
              </p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium text-gray-600 dark:text-gray-300">Players</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-600 dark:text-gray-300">Type</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-600 dark:text-gray-300">Format</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-600 dark:text-gray-300">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y dark:divide-gray-700">
                  {pairingHistory.slice(0, 20).map((entry, idx) => (
                    <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="px-4 py-2 text-gray-900 dark:text-white">
                        {getPlayerName(entry.player1Id)} & {getPlayerName(entry.player2Id)}
                      </td>
                      <td className="px-4 py-2 text-gray-600 dark:text-gray-300 capitalize">
                        {entry.relationship}
                      </td>
                      <td className="px-4 py-2 text-gray-600 dark:text-gray-300 capitalize">
                        {entry.sessionType}
                      </td>
                      <td className="px-4 py-2 text-gray-500 dark:text-gray-400 text-xs">
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
        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <h4 className="font-medium text-gray-900 dark:text-white mb-2">
            Current Session Analysis
          </h4>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {currentSessionAnalysis.overallFairnessScore}%
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Fairness Score</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {currentSessionAnalysis.repeatMatchupCount}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Repeat Matchups</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {currentSessionAnalysis.handicapBalance}%
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Handicap Balance</p>
            </div>
          </div>
          {currentSessionAnalysis.suggestions.length > 0 && (
            <div className="mt-3 pt-3 border-t dark:border-gray-700">
              <p className="text-sm text-gray-600 dark:text-gray-300">
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
