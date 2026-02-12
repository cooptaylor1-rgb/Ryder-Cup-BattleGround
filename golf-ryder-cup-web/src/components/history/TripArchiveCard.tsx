'use client';

/**
 * TripArchiveCard - Trip History Archive Display
 *
 * Displays archived trip history with:
 * - Year-over-year comparisons
 * - All-time standings
 * - MVP history
 * - Trip highlights
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  getAllTimeStandings,
  compareTrips,
} from '@/lib/services/archiveService';
import type { TripArchive } from '@/lib/types/captain';

interface TripArchiveCardProps {
  archives: TripArchive[];
  currentTripId?: string;
  teamAName?: string;
  teamBName?: string;
  onViewTrip?: (tripId: string) => void;
}

export function TripArchiveCard({
  archives,
  currentTripId,
  teamAName = 'Team USA',
  teamBName = 'Team Europe',
  onViewTrip,
}: TripArchiveCardProps) {
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [compareYears, setCompareYears] = useState<[number | null, number | null]>([null, null]);

  // Sort archives by year (newest first)
  const sortedArchives = useMemo(() => {
    return [...archives].sort((a, b) => b.year - a.year);
  }, [archives]);

  // All-time standings
  const allTimeStats = useMemo(() => {
    return getAllTimeStandings(archives);
  }, [archives]);

  // Get selected archive
  const selectedArchive = selectedYear
    ? sortedArchives.find((a) => a.year === selectedYear)
    : null;

  // Get comparison data
  const comparisonData = useMemo(() => {
    if (!compareMode || !compareYears[0] || !compareYears[1]) return null;

    const archive1 = sortedArchives.find((a) => a.year === compareYears[0]);
    const archive2 = sortedArchives.find((a) => a.year === compareYears[1]);

    if (!archive1 || !archive2) return null;

    return {
      archive1,
      archive2,
      comparison: compareTrips(archive1, archive2),
    };
  }, [compareMode, compareYears, sortedArchives]);

  // Toggle year selection for comparison
  const toggleCompareYear = (year: number) => {
    if (compareYears[0] === year) {
      setCompareYears([compareYears[1], null]);
    } else if (compareYears[1] === year) {
      setCompareYears([compareYears[0], null]);
    } else if (!compareYears[0]) {
      setCompareYears([year, compareYears[1]]);
    } else if (!compareYears[1]) {
      setCompareYears([compareYears[0], year]);
    } else {
      // Replace the older selection
      setCompareYears([compareYears[1], year]);
    }
  };

  return (
    <div className="card overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-[color:var(--masters)] to-[color:var(--masters-deep)] px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🏆</span>
            <div>
              <h2 className="text-xl font-bold text-white">Trip Archives</h2>
              <p className="text-white/80 text-sm">{archives.length} trips recorded</p>
            </div>
          </div>
          <button
            onClick={() => {
              setCompareMode(!compareMode);
              setCompareYears([null, null]);
              setSelectedYear(null);
            }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              compareMode
                ? 'bg-[var(--surface-raised)] text-[var(--ink-primary)]'
                : 'bg-white/20 text-white hover:bg-white/30'
            }`}
          >
            {compareMode ? 'Exit Compare' : 'Compare Years'}
          </button>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* All-Time Standings */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-4 bg-team-usa/10 rounded-lg border border-[color:var(--rule)]/30">
            <h4 className="text-sm font-medium text-team-usa mb-1">{teamAName}</h4>
            <p className="text-3xl font-bold text-team-usa">{allTimeStats.teamAWins}</p>
            <p className="text-xs text-[var(--ink-tertiary)]">{allTimeStats.totalTeamAPoints} total pts</p>
          </div>
          <div className="text-center p-4 bg-[var(--surface-secondary)] rounded-lg border border-[color:var(--rule)]/30">
            <h4 className="text-sm font-medium text-[var(--ink-secondary)] mb-1">Ties</h4>
            <p className="text-3xl font-bold text-[var(--ink-primary)]">{allTimeStats.ties}</p>
            <p className="text-xs text-[var(--ink-tertiary)]">All-time record</p>
          </div>
          <div className="text-center p-4 bg-team-europe/10 rounded-lg border border-[color:var(--rule)]/30">
            <h4 className="text-sm font-medium text-team-europe mb-1">{teamBName}</h4>
            <p className="text-3xl font-bold text-team-europe">{allTimeStats.teamBWins}</p>
            <p className="text-xs text-[var(--ink-tertiary)]">{allTimeStats.totalTeamBPoints} total pts</p>
          </div>
        </div>

        {/* Timeline */}
        <div className="relative">
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-[color:var(--rule)]" />

          <div className="space-y-4">
            {sortedArchives.map((archive) => {
              const isSelected = selectedYear === archive.year;
              const isCompareSelected = compareYears.includes(archive.year);
              const isCurrent = archive.tripId === currentTripId;

              return (
                <motion.div
                  key={archive.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="relative pl-10"
                >
                  {/* Year Marker */}
                  <div
                    className={`absolute left-2 w-5 h-5 rounded-full border-2 cursor-pointer transition-all ${
                      isCompareSelected
                        ? 'bg-[var(--info)] border-[color:var(--info)]/50 scale-125'
                        : isSelected
                        ? 'bg-[var(--masters)] border-[color:var(--masters)]/50 scale-125'
                        : archive.winner === 'A'
                        ? 'bg-team-usa border-team-usa/50'
                        : archive.winner === 'B'
                        ? 'bg-team-europe border-team-europe/50'
                        : 'bg-[color:var(--ink-tertiary)] border-[color:var(--rule)]'
                    }`}
                    onClick={() => {
                      if (compareMode) {
                        toggleCompareYear(archive.year);
                      } else {
                        setSelectedYear(isSelected ? null : archive.year);
                      }
                    }}
                  />

                  {/* Card */}
                  <button
                    onClick={() => {
                      if (compareMode) {
                        toggleCompareYear(archive.year);
                      } else {
                        setSelectedYear(isSelected ? null : archive.year);
                      }
                    }}
                    className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                      isCompareSelected
                        ? 'border-[var(--info)] bg-[color:var(--info)]/10'
                        : isSelected
                        ? 'border-[var(--masters)] bg-[color:var(--masters)]/10'
                        : 'border-[color:var(--rule)] bg-[var(--surface-secondary)] hover:border-[color:var(--rule)]/70'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold text-[var(--ink-primary)]">
                            {archive.year}
                          </span>
                          {isCurrent && (
                            <span className="px-2 py-0.5 bg-[color:var(--success)]/15 text-[var(--success)] text-xs rounded-full">
                              Current
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-[var(--ink-tertiary)]">
                          {archive.tripName}
                        </p>
                      </div>
                      <div className="text-right">
                        <span
                          className={`text-lg font-bold ${
                            archive.winner === 'A'
                              ? 'text-team-usa'
                              : archive.winner === 'B'
                              ? 'text-team-europe'
                              : 'text-[var(--ink-secondary)]'
                          }`}
                        >
                          {archive.finalScore}
                        </span>
                        <p className="text-sm text-[var(--ink-tertiary)]">
                          {archive.winningTeamName}
                        </p>
                      </div>
                    </div>
                  </button>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Selected Archive Details */}
        <AnimatePresence>
          {selectedArchive && !compareMode && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="p-4 bg-[color:var(--masters)]/10 rounded-lg border border-[color:var(--rule)]/30 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-[var(--ink-primary)]">
                    {selectedArchive.year} Details
                  </h4>
                  {onViewTrip && (
                    <button
                      onClick={() => onViewTrip(selectedArchive.tripId)}
                      className="px-3 py-1 text-sm bg-[var(--masters)] text-white rounded-lg hover:bg-[color:var(--masters-deep)]"
                    >
                      View Full Trip
                    </button>
                  )}
                </div>

                {/* MVP */}
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🏅</span>
                  <div>
                    <p className="text-sm text-[var(--ink-tertiary)]">MVP</p>
                    <p className="font-semibold text-[var(--ink-primary)]">
                      {selectedArchive.mvpName}
                    </p>
                  </div>
                </div>

                {/* Highlights */}
                {selectedArchive.highlights.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-[var(--ink-secondary)] mb-2">
                      Highlights
                    </p>
                    <ul className="space-y-1">
                      {selectedArchive.highlights.map((highlight, idx) => (
                        <li
                          key={idx}
                          className="flex items-start gap-2 text-sm text-[var(--ink-tertiary)]"
                        >
                          <span className="text-[var(--masters)]">•</span>
                          {highlight}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Comparison View */}
        <AnimatePresence>
          {compareMode && comparisonData && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="p-4 bg-[color:var(--info)]/10 rounded-lg border border-[color:var(--rule)]/30"
            >
              <h4 className="font-semibold text-[var(--ink-primary)] mb-4 text-center">
                {comparisonData.archive1.year} vs {comparisonData.archive2.year}
              </h4>

              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-[var(--ink-primary)]">
                    {comparisonData.archive1.finalScore}
                  </p>
                  <p className="text-sm text-[var(--ink-tertiary)]">{comparisonData.archive1.year}</p>
                </div>
                <div>
                  <p className="text-sm text-[var(--ink-tertiary)] mb-1">Score Change</p>
                  <p className="text-lg font-semibold">
                    <span className="text-team-usa">
                      {comparisonData.comparison.scoreDiff.teamA >= 0 ? '+' : ''}
                      {comparisonData.comparison.scoreDiff.teamA}
                    </span>
                    {' / '}
                    <span className="text-team-europe">
                      {comparisonData.comparison.scoreDiff.teamB >= 0 ? '+' : ''}
                      {comparisonData.comparison.scoreDiff.teamB}
                    </span>
                  </p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-[var(--ink-primary)]">
                    {comparisonData.archive2.finalScore}
                  </p>
                  <p className="text-sm text-[var(--ink-tertiary)]">{comparisonData.archive2.year}</p>
                </div>
              </div>

              <div className="mt-4 flex justify-center gap-4">
                <span
                  className={`px-3 py-1 rounded-full text-xs ${
                    comparisonData.comparison.sameWinner
                      ? 'bg-[color:var(--success)]/15 text-[var(--success)]'
                      : 'bg-[color:var(--warning)]/15 text-[var(--warning)]'
                  }`}
                >
                  {comparisonData.comparison.sameWinner ? 'Same Winner' : 'Different Winner'}
                </span>
                <span
                  className={`px-3 py-1 rounded-full text-xs ${
                    comparisonData.comparison.sameMVP
                      ? 'bg-[color:var(--success)]/15 text-[var(--success)]'
                      : 'bg-[var(--surface-secondary)] text-[var(--ink-tertiary)]'
                  }`}
                >
                  {comparisonData.comparison.sameMVP ? 'Same MVP' : 'Different MVP'}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Compare Mode Instructions */}
        {compareMode && !comparisonData && (
          <div className="text-center p-4 bg-[var(--surface-secondary)] rounded-lg border border-[color:var(--rule)]/30">
            <p className="text-[var(--ink-tertiary)]">
              {compareYears[0]
                ? `Selected ${compareYears[0]}. Click another year to compare.`
                : 'Click two years to compare them.'}
            </p>
          </div>
        )}

        {/* Empty State */}
        {archives.length === 0 && (
          <div className="text-center py-12">
            <span className="text-5xl mb-4 block">📚</span>
            <h3 className="text-lg font-medium text-[var(--ink-primary)] mb-2">
              No Archives Yet
            </h3>
            <p className="text-[var(--ink-tertiary)]">
              Complete trips will appear here for historical comparison.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default TripArchiveCard;
