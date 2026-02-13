'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  generateTeeSheet,
  suggestTeeTimeConfig,
  formatTeeSheetForDisplay,
  generatePrintableTeeSheet,
  type GeneratedTeeSheet,
} from '@/lib/services/teeTimeService';
import type { TeeTimeMode } from '@/lib/types/captain';
import { RyderCupSession, Match, Player, Team } from '@/lib/types';
import { Clock, Calendar, Printer, Download, Settings } from 'lucide-react';

interface TeeTimeGeneratorProps {
  session: RyderCupSession;
  matches: Match[];
  players: Player[];
  teams: Team[];
  onSave?: (teeSheet: GeneratedTeeSheet) => void;
}

export function TeeTimeGenerator({
  session,
  matches,
  players,
  teams: _teams,
  onSave,
}: TeeTimeGeneratorProps) {
  const [teeSheet, setTeeSheet] = useState<GeneratedTeeSheet | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  // Config state
  const [startTime, setStartTime] = useState('08:00');
  const [intervalMinutes, setIntervalMinutes] = useState(10);
  const [format, setFormat] = useState<TeeTimeMode>('staggered');

  // Initialize with suggested config
  useEffect(() => {
    const suggested = suggestTeeTimeConfig(matches.length, session.sessionType);
    // Defer to avoid setState-in-effect warning
    const timeoutId = setTimeout(() => {
      setStartTime(suggested.firstTeeTime);
      setIntervalMinutes(suggested.intervalMinutes);
      setFormat(suggested.mode);
    }, 0);
    return () => clearTimeout(timeoutId);
  }, [matches.length, session.sessionType]);

  // Generate tee sheet when config changes
  useEffect(() => {
    if (matches.length === 0) return;

    const config = {
      mode: format,
      firstTeeTime: startTime,
      intervalMinutes,
    };

    const generated = generateTeeSheet(session, matches, config);
    // Defer to avoid setState-in-effect warning
    const timeoutId = setTimeout(() => {
      setTeeSheet(generated);
    }, 0);
    return () => clearTimeout(timeoutId);
  }, [session, matches, startTime, intervalMinutes, format]);

  // Helper to get player names
  const getPlayerNames = useCallback(
    (ids: string[]) => {
      return ids
        .map((id) => {
          const player = players.find((p) => p.id === id);
          return player ? `${player.firstName} ${player.lastName}` : 'Unknown';
        })
        .join(' & ');
    },
    [players]
  );

  // Format for display
  const displayItems = useMemo(() => {
    if (!teeSheet) return [];
    return formatTeeSheetForDisplay(teeSheet, matches, getPlayerNames);
  }, [teeSheet, matches, getPlayerNames]);

  const handlePrint = () => {
    if (!teeSheet) return;

    const formatted = formatTeeSheetForDisplay(teeSheet, matches, getPlayerNames);
    const sessionDate = session.scheduledDate
      ? new Date(session.scheduledDate).toLocaleDateString()
      : 'TBD';
    const printContent = generatePrintableTeeSheet(session.name, sessionDate, formatted);

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Tee Sheet - ${session.name}</title>
            <style>
              body { font-family: monospace; padding: 20px; white-space: pre; }
            </style>
          </head>
          <body>${printContent}</body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const handleExport = () => {
    if (!teeSheet) return;

    const formatted = formatTeeSheetForDisplay(teeSheet, matches, getPlayerNames);
    const sessionDate = session.scheduledDate
      ? new Date(session.scheduledDate).toLocaleDateString()
      : 'TBD';
    const printContent = generatePrintableTeeSheet(session.name, sessionDate, formatted);

    const blob = new Blob([printContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `tee-sheet-${session.name.replace(/[^a-z0-9]/gi, '-')}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (matches.length === 0) {
    return (
      <div className="text-center p-8 text-[var(--ink-tertiary)]">
        <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p className="text-[var(--ink-secondary)]">No matches to schedule</p>
        <p className="text-sm mt-1">Create some matches first to generate tee times</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Clock className="w-6 h-6 text-[color:var(--info)]" />
          <div>
            <h3 className="font-semibold text-[var(--ink-primary)]">Tee Time Generator</h3>
            <p className="text-sm text-[var(--ink-tertiary)]">
              {matches.length} groups •{' '}
              {format === 'shotgun'
                ? 'Shotgun Start'
                : format === 'wave'
                  ? 'Wave Start'
                  : 'Staggered'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="p-2 hover:bg-[var(--surface-secondary)] rounded-lg transition-colors"
            title="Print"
          >
            <Printer className="w-5 h-5 text-[var(--ink-secondary)]" />
          </button>
          <button
            onClick={handleExport}
            className="p-2 hover:bg-[var(--surface-secondary)] rounded-lg transition-colors"
            title="Export"
          >
            <Download className="w-5 h-5 text-[var(--ink-secondary)]" />
          </button>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`p-2 rounded-lg transition-colors ${
              showSettings
                ? 'bg-[color:var(--info)]/10 text-[color:var(--info)]'
                : 'hover:bg-[var(--surface-secondary)] text-[var(--ink-secondary)]'
            }`}
            title="Settings"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="p-4 bg-[var(--surface-secondary)] rounded-lg border border-[var(--rule)] space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--ink-secondary)] mb-1">
                Start Time
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2 border border-[var(--rule)] rounded-lg bg-[var(--surface)] text-[var(--ink-primary)] focus:outline-none focus:ring-2 focus:ring-[color:var(--masters)]/30"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--ink-secondary)] mb-1">
                Interval (min)
              </label>
              <input
                type="number"
                value={intervalMinutes}
                onChange={(e) => setIntervalMinutes(parseInt(e.target.value) || 10)}
                min={6}
                max={20}
                className="w-full px-3 py-2 border border-[var(--rule)] rounded-lg bg-[var(--surface)] text-[var(--ink-primary)] focus:outline-none focus:ring-2 focus:ring-[color:var(--masters)]/30"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--ink-secondary)] mb-1">
                Format
              </label>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value as TeeTimeMode)}
                className="w-full px-3 py-2 border border-[var(--rule)] rounded-lg bg-[var(--surface)] text-[var(--ink-primary)] focus:outline-none focus:ring-2 focus:ring-[color:var(--masters)]/30"
              >
                <option value="staggered">Staggered</option>
                <option value="shotgun">Shotgun</option>
                <option value="wave">Wave</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Summary */}
      {teeSheet && (
        <div className="flex items-center gap-4 p-3 bg-[color:var(--info)]/10 border border-[color:var(--info)]/20 rounded-lg text-sm text-[color:var(--info)]">
          <span>
            First tee: <strong>{teeSheet.firstTeeTime}</strong>
          </span>
          <span>
            Last tee: <strong>{teeSheet.lastTeeTime}</strong>
          </span>
          <span>
            Duration: <strong>{teeSheet.totalDuration} min</strong>
          </span>
        </div>
      )}

      {/* Tee Sheet */}
      <div className="border border-[var(--rule)] rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-[var(--surface-secondary)]">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-[var(--ink-secondary)]">
                Time
              </th>
              <th className="px-4 py-3 text-left font-medium text-[var(--ink-secondary)]">
                Hole
              </th>
              <th className="px-4 py-3 text-left font-medium text-[var(--ink-secondary)]">
                Match
              </th>
              <th className="px-4 py-3 text-left font-medium text-[var(--ink-secondary)]">
                Team A
              </th>
              <th className="px-4 py-3 text-left font-medium text-[var(--ink-secondary)]">
                Team B
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--rule)]">
            {displayItems.map((item, idx) => (
              <tr key={idx} className="hover:bg-[var(--surface-secondary)]/60">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[var(--ink-tertiary)]" />
                    <span className="font-mono font-medium text-[var(--ink-primary)]">
                      {item.time}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-[var(--ink-secondary)]">#{item.hole}</td>
                <td className="px-4 py-3 text-[var(--ink-secondary)]">{item.match}</td>
                <td className="px-4 py-3">
                  <span className="text-team-usa">{item.teamA}</span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-team-europe">{item.teamB}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Save Button */}
      {onSave && teeSheet && (
        <div className="flex justify-end">
          <button
            onClick={() => onSave(teeSheet)}
            className="px-4 py-2 bg-[var(--masters)] text-white rounded-lg hover:bg-[var(--masters-deep)] transition-colors flex items-center gap-2"
          >
            <Calendar className="w-4 h-4" />
            Save Tee Sheet
          </button>
        </div>
      )}
    </div>
  );
}

export default TeeTimeGenerator;
