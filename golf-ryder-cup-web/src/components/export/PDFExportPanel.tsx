/**
 * PDF Export Panel Component
 *
 * Production-ready PDF export interface for scorecards and standings.
 */

'use client';

import { useState, useCallback } from 'react';
import {
  FileText,
  Download,
  Trophy,
  BarChart3,
  Loader2,
  Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  exportScorecard,
  exportStandings,
  exportPlayerStats,
  type ScorecardData,
  type StandingsData,
  type PlayerStatsData,
} from '@/lib/services/pdfExportService';

type ExportType = 'scorecard' | 'standings' | 'playerStats';

interface ExportOption {
  id: ExportType;
  label: string;
  description: string;
  icon: typeof FileText;
}

const EXPORT_OPTIONS: ExportOption[] = [
  {
    id: 'scorecard',
    label: 'Match Scorecard',
    description: 'Individual match with hole-by-hole scores',
    icon: FileText,
  },
  {
    id: 'standings',
    label: 'Trip Standings',
    description: 'Overall standings with all match results',
    icon: Trophy,
  },
  {
    id: 'playerStats',
    label: 'Player Statistics',
    description: 'Detailed stats for a selected player',
    icon: BarChart3,
  },
];

interface PDFExportPanelProps {
  tripName: string;
  // Scorecard data
  scorecardData?: Partial<ScorecardData>;
  // Standings data
  standingsData?: Partial<StandingsData>;
  // Player stats data
  playerStatsOptions?: { playerId: string; name: string }[];
  getPlayerStats?: (playerId: string) => PlayerStatsData | null;
  className?: string;
}

export function PDFExportPanel({
  tripName,
  scorecardData,
  standingsData,
  playerStatsOptions = [],
  getPlayerStats,
  className,
}: PDFExportPanelProps) {
  const [selectedType, setSelectedType] = useState<ExportType | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<string>('');
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  const handleExport = useCallback(async () => {
    if (!selectedType) return;

    setIsExporting(true);
    setExportSuccess(false);

    try {
      switch (selectedType) {
        case 'scorecard':
          if (scorecardData) {
            const fullScorecardData: ScorecardData = {
              tripName,
              courseName: scorecardData.courseName || 'Unknown Course',
              date: scorecardData.date || new Date().toLocaleDateString(),
              format: scorecardData.format || 'Match Play',
              player1: scorecardData.player1 || {
                name: 'Player 1',
                team: 'USA',
                scores: Array(18).fill(null),
                frontNine: 0,
                backNine: 0,
                total: 0,
              },
              player2: scorecardData.player2 || {
                name: 'Player 2',
                team: 'Europe',
                scores: Array(18).fill(null),
                frontNine: 0,
                backNine: 0,
                total: 0,
              },
              result: scorecardData.result || 'In Progress',
            };
            exportScorecard(fullScorecardData);
          }
          break;

        case 'standings':
          if (standingsData) {
            const fullStandingsData: StandingsData = {
              tripName,
              date: standingsData.date || new Date().toLocaleDateString(),
              usaScore: standingsData.usaScore || 0,
              europeScore: standingsData.europeScore || 0,
              matches: standingsData.matches || [],
              pointsToWin: standingsData.pointsToWin || 14.5,
            };
            exportStandings(fullStandingsData);
          }
          break;

        case 'playerStats':
          if (selectedPlayer && getPlayerStats) {
            const stats = getPlayerStats(selectedPlayer);
            if (stats) {
              exportPlayerStats(stats);
            }
          }
          break;
      }

      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 3000);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  }, [selectedType, tripName, scorecardData, standingsData, selectedPlayer, getPlayerStats]);

  const canExport = () => {
    switch (selectedType) {
      case 'scorecard':
        return !!scorecardData;
      case 'standings':
        return !!standingsData;
      case 'playerStats':
        return !!selectedPlayer && !!getPlayerStats;
      default:
        return false;
    }
  };

  return (
    <div className={cn('card overflow-hidden', className)}>
      {/* Header */}
      <div className="p-4 border-b border-[var(--rule)]">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-[color:var(--accent)]/10 text-[var(--accent)]">
            <FileText size={20} />
          </div>
          <div>
            <h3 className="type-body-lg font-semibold text-[var(--ink-primary)]">
              Export to PDF
            </h3>
            <p className="type-caption text-[var(--ink-tertiary)]">
              Download printable scorecards and reports
            </p>
          </div>
        </div>
      </div>

      {/* Export Options */}
      <div className="p-4 space-y-3">
        <p className="type-caption text-[var(--ink-tertiary)]">Select what to export:</p>

        {EXPORT_OPTIONS.map(option => {
          const Icon = option.icon;
          const isSelected = selectedType === option.id;
          const isDisabled =
            (option.id === 'scorecard' && !scorecardData) ||
            (option.id === 'standings' && !standingsData) ||
            (option.id === 'playerStats' && playerStatsOptions.length === 0);

          return (
            <button
              key={option.id}
              onClick={() => setSelectedType(option.id)}
              disabled={isDisabled}
              className={cn(
                'w-full flex items-center gap-3 p-3 rounded-lg transition-all',
                isSelected
                  ? 'bg-[color:var(--accent)]/10 ring-2 ring-[var(--accent)]'
                  : 'bg-[var(--surface-secondary)] hover:bg-[color:var(--surface-secondary)]/70',
                isDisabled && 'opacity-50 cursor-not-allowed'
              )}
            >
              <div className={cn(
                'p-2 rounded-lg',
                isSelected
                  ? 'bg-[var(--accent)] text-[var(--canvas)]'
                  : 'bg-[var(--surface-secondary)] text-[var(--ink-tertiary)]'
              )}>
                <Icon size={18} />
              </div>
              <div className="text-left flex-1">
                <p className={cn(
                  'type-body font-medium',
                  isSelected ? 'text-[var(--accent)]' : 'text-[var(--ink-primary)]'
                )}>
                  {option.label}
                </p>
                <p className="type-caption text-[var(--ink-tertiary)]">
                  {option.description}
                </p>
              </div>
              {isSelected && (
                <Check size={18} className="text-[var(--accent)]" />
              )}
            </button>
          );
        })}
      </div>

      {/* Player Selection for Stats */}
      {selectedType === 'playerStats' && playerStatsOptions.length > 0 && (
        <div className="px-4 pb-4">
          <label className="type-caption text-[var(--ink-tertiary)] mb-2 block">
            Select Player
          </label>
          <select
            value={selectedPlayer}
            onChange={e => setSelectedPlayer(e.target.value)}
            className="input-premium w-full"
          >
            <option value="">Choose a player...</option>
            {playerStatsOptions.map(player => (
              <option key={player.playerId} value={player.playerId}>
                {player.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Export Button */}
      <div className="p-4 border-t border-[var(--rule)]">
        <button
          onClick={handleExport}
          disabled={!canExport() || isExporting}
          className={cn(
            'w-full py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-all',
            canExport() && !isExporting
              ? 'bg-[var(--accent)] text-[var(--canvas)] hover:bg-[var(--accent-hover)]'
              : 'bg-[var(--surface-secondary)] text-[var(--ink-tertiary)] cursor-not-allowed'
          )}
        >
          {isExporting ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Generating PDF...
            </>
          ) : exportSuccess ? (
            <>
              <Check size={18} />
              Downloaded!
            </>
          ) : (
            <>
              <Download size={18} />
              Download PDF
            </>
          )}
        </button>

        {!selectedType && (
          <p className="type-caption text-[var(--ink-tertiary)] text-center mt-2">
            Select an export type above
          </p>
        )}
      </div>
    </div>
  );
}

export default PDFExportPanel;
