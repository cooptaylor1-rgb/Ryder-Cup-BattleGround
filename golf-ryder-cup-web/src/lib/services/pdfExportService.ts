/**
 * PDF Export Service
 *
 * Production-ready PDF generation for:
 * - Scorecards
 * - Match results
 * - Trip standings
 * - Player statistics
 *
 * Uses browser's print functionality with custom styles for best quality.
 */

import { useCallback } from 'react';

import {
  exportPlayerStatsDocument,
  exportScorecardDocument,
  exportStandingsDocument,
} from './pdf-export/pdfExportDocument';
import type {
  PlayerStatsData,
  ScorecardData,
  StandingsData,
  UsePDFExportReturn,
} from './pdf-export/pdfExportTypes';

export type {
  MatchStandingData,
  PlayerScoreData,
  PlayerStatsData,
  ScorecardData,
  StandingsData,
  UsePDFExportReturn,
} from './pdf-export/pdfExportTypes';

export function exportScorecard(data: ScorecardData): void {
  exportScorecardDocument(data);
}

export function exportStandings(data: StandingsData): void {
  exportStandingsDocument(data);
}

export function exportPlayerStats(data: PlayerStatsData): void {
  exportPlayerStatsDocument(data);
}

export function usePDFExport(): UsePDFExportReturn {
  const handleExportScorecard = useCallback((data: ScorecardData) => {
    exportScorecard(data);
  }, []);

  const handleExportStandings = useCallback((data: StandingsData) => {
    exportStandings(data);
  }, []);

  const handleExportPlayerStats = useCallback((data: PlayerStatsData) => {
    exportPlayerStats(data);
  }, []);

  return {
    exportScorecard: handleExportScorecard,
    exportStandings: handleExportStandings,
    exportPlayerStats: handleExportPlayerStats,
  };
}

export default usePDFExport;
