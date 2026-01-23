'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  generateTeeSheet,
  suggestTeeTimeConfig,
  formatTeeSheetForDisplay,
  generatePrintableTeeSheet,
  type GeneratedTeeSheet,
  type TeeTimeMode,
} from '@/lib/services/teeTimeService';
import { RyderCupSession, Match, Player, Team } from '@/lib/types';
import {
  Clock,
  Calendar,
  Printer,
  Download,
  Settings,
} from 'lucide-react';

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
  _teams,
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
    setStartTime(suggested.firstTeeTime);
    setIntervalMinutes(suggested.intervalMinutes);
    setFormat(suggested.mode);
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
    setTeeSheet(generated);
  }, [session, matches, startTime, intervalMinutes, format]);

  // Helper to get player names
  const getPlayerNames = (ids: string[]) => {
    return ids.map(id => {
      const player = players.find(p => p.id === id);
      return player ? `${player.firstName} ${player.lastName}` : 'Unknown';
    }).join(' & ');
  };

  // Format for display
  const displayItems = useMemo(() => {
    if (!teeSheet) return [];
    return formatTeeSheetForDisplay(teeSheet, matches, getPlayerNames);
  }, [teeSheet, matches, players]);

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
      <div className="text-center p-8 text-gray-500 dark:text-gray-400">
        <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>No matches to schedule</p>
        <p className="text-sm mt-1">Create some matches first to generate tee times</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Clock className="w-6 h-6 text-blue-500" />
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">
              Tee Time Generator
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {matches.length} groups • {format === 'shotgun' ? 'Shotgun Start' : format === 'wave' ? 'Wave Start' : 'Staggered'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title="Print"
          >
            <Printer className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </button>
          <button
            onClick={handleExport}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title="Export"
          >
            <Download className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </button>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`p-2 rounded-lg transition-colors ${showSettings
              ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600'
              : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300'
              }`}
            title="Settings"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border dark:border-gray-700 space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Start Time
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Interval (min)
              </label>
              <input
                type="number"
                value={intervalMinutes}
                onChange={(e) => setIntervalMinutes(parseInt(e.target.value) || 10)}
                min={6}
                max={20}
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Format
              </label>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value as TeeTimeMode)}
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
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
        <div className="flex items-center gap-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm text-blue-700 dark:text-blue-300">
          <span>First tee: <strong>{teeSheet.firstTeeTime}</strong></span>
          <span>Last tee: <strong>{teeSheet.lastTeeTime}</strong></span>
          <span>Duration: <strong>{teeSheet.totalDuration} min</strong></span>
        </div>
      )}

      {/* Tee Sheet */}
      <div className="border dark:border-gray-700 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">Time</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">Hole</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">Match</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">Team A</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">Team B</th>
            </tr>
          </thead>
          <tbody className="divide-y dark:divide-gray-700">
            {displayItems.map((item, idx) => (
              <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span className="font-mono font-medium text-gray-900 dark:text-white">
                      {item.time}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                  #{item.hole}
                </td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                  {item.match}
                </td>
                <td className="px-4 py-3">
                  <span className="text-blue-600 dark:text-blue-400">
                    {item.teamA}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-red-600 dark:text-red-400">
                    {item.teamB}
                  </span>
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
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
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
