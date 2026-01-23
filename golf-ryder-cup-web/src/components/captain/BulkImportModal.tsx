'use client';

import React, { useState, useRef } from 'react';
import {
  parseCSV,
  parseClipboardText,
  validateImportRows,
  createPlayersFromImport,
  generateCSVTemplate,
  type PlayerImportRow,
  type BulkImportResult,
} from '@/lib/services/bulkImportService';
import {
  Upload,
  FileText,
  Clipboard,
  Download,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Users,
  Loader2,
  X,
} from 'lucide-react';

interface BulkImportModalProps {
  tripId: string;
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: (result: BulkImportResult) => void;
  existingPlayers?: { firstName: string; lastName: string }[];
}

type ImportMethod = 'csv' | 'paste' | null;

export function BulkImportModal({
  tripId: _tripId,
  isOpen,
  onClose,
  onImportComplete,
  existingPlayers: _existingPlayers = [],
}: BulkImportModalProps) {
  const [method, setMethod] = useState<ImportMethod>(null);
  const [pasteText, setPasteText] = useState('');
  const [parsedRows, setParsedRows] = useState<PlayerImportRow[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<BulkImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setMethod(null);
    setPasteText('');
    setParsedRows([]);
    setValidationErrors([]);
    setResult(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const rows = parseCSV(text);
      const validation = validateImportRows(rows);
      const errors = validation
        .filter(v => !v.isValid)
        .flatMap(v => v.errors.map(e => `Row ${v.rowNumber}: ${e}`));

      setParsedRows(rows);
      setValidationErrors(errors);
    } catch {
      setValidationErrors(['Failed to parse CSV file']);
    }
  };

  const handlePasteSubmit = () => {
    if (!pasteText.trim()) {
      setValidationErrors(['Please paste some player data']);
      return;
    }

    const rows = parseClipboardText(pasteText);
    const validation = validateImportRows(rows);
    const errors = validation
      .filter(v => !v.isValid)
      .flatMap(v => v.errors.map(e => `Row ${v.rowNumber}: ${e}`));

    setParsedRows(rows);
    setValidationErrors(errors);
  };

  const handleImport = async () => {
    if (parsedRows.length === 0) return;

    setImporting(true);
    try {
      const validationResults = validateImportRows(parsedRows);
      const players = createPlayersFromImport(validationResults, true);

      const errorCount = validationResults.filter(v => !v.isValid).length;

      const importResult: BulkImportResult = {
        success: errorCount === 0 || players.length > 0,
        totalRows: parsedRows.length,
        importedCount: players.length,
        skippedCount: parsedRows.length - players.length,
        errorCount,
        validationResults,
        importedPlayers: players,
      };

      setResult(importResult);
      onImportComplete(importResult);
    } catch (error) {
      setValidationErrors(['Import failed: ' + (error as Error).message]);
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = () => {
    const csv = generateCSVTemplate();
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'player-import-template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
          <div className="flex items-center gap-3">
            <Users className="w-6 h-6 text-blue-500" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Bulk Import Players
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          {result ? (
            // Result View
            <div className="space-y-4">
              <div className={`p-4 rounded-lg ${result.success
                ? 'bg-green-50 dark:bg-green-900/20'
                : 'bg-yellow-50 dark:bg-yellow-900/20'
                }`}>
                <div className="flex items-center gap-3 mb-2">
                  {result.success ? (
                    <CheckCircle className="w-6 h-6 text-green-500" />
                  ) : (
                    <AlertTriangle className="w-6 h-6 text-yellow-500" />
                  )}
                  <span className="font-semibold text-lg text-gray-900 dark:text-white">
                    Import {result.success ? 'Complete' : 'Completed with Issues'}
                  </span>
                </div>
                <p className="text-gray-600 dark:text-gray-300">
                  Successfully imported {result.importedCount} player(s)
                  {result.skippedCount > 0 && `, skipped ${result.skippedCount}`}
                  {result.errorCount > 0 && `, ${result.errorCount} errors`}
                </p>
              </div>

              {result.importedPlayers.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                    Imported Players
                  </h4>
                  <div className="space-y-1">
                    {result.importedPlayers.map((player, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        {player.firstName} {player.lastName}
                        {player.handicapIndex !== undefined && ` (${player.handicapIndex})`}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {result.skippedCount > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                    Skipped ({result.skippedCount})
                  </h4>
                  <div className="space-y-1">
                    {result.validationResults
                      .filter(v => !v.isValid)
                      .map((v, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                          <AlertTriangle className="w-4 h-4 text-yellow-500" />
                          Row {v.rowNumber}: {v.row.firstName} {v.row.lastName}
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {result.errorCount > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                    Errors
                  </h4>
                  <div className="space-y-1">
                    {result.validationResults
                      .filter(v => !v.isValid)
                      .flatMap((v, idx) => v.errors.map((error, eIdx) => (
                        <div key={`${idx}-${eIdx}`} className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
                          <XCircle className="w-4 h-4" />
                          Row {v.rowNumber}: {error}
                        </div>
                      )))}
                  </div>
                </div>
              )}
            </div>
          ) : parsedRows.length > 0 ? (
            // Preview View
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  Preview ({parsedRows.length} players)
                </h3>
                <button
                  onClick={reset}
                  className="text-sm text-blue-500 hover:text-blue-600"
                >
                  Start Over
                </button>
              </div>

              {validationErrors.length > 0 && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <h4 className="font-medium text-red-700 dark:text-red-400 mb-2">
                    Validation Issues
                  </h4>
                  <ul className="text-sm text-red-600 dark:text-red-300 space-y-1">
                    {validationErrors.map((error, idx) => (
                      <li key={idx}>• {error}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="border dark:border-gray-700 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-300">Name</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-300">Email</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-300">Handicap</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y dark:divide-gray-700">
                    {parsedRows.map((row, idx) => (
                      <tr key={idx}>
                        <td className="px-3 py-2 text-gray-900 dark:text-white">
                          {row.firstName} {row.lastName}
                        </td>
                        <td className="px-3 py-2 text-gray-600 dark:text-gray-300">{row.email || '-'}</td>
                        <td className="px-3 py-2 text-gray-600 dark:text-gray-300">
                          {row.handicapIndex !== undefined ? row.handicapIndex : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : !method ? (
            // Method Selection
            <div className="space-y-6">
              <p className="text-gray-600 dark:text-gray-300">
                Choose how you&apos;d like to import players:
              </p>

              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => {
                    setMethod('csv');
                    fileInputRef.current?.click();
                  }}
                  className="p-6 border-2 border-dashed rounded-xl hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors text-center"
                >
                  <FileText className="w-10 h-10 text-blue-500 mx-auto mb-3" />
                  <h3 className="font-semibold text-gray-900 dark:text-white">Upload CSV</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Import from a spreadsheet
                  </p>
                </button>

                <button
                  onClick={() => setMethod('paste')}
                  className="p-6 border-2 border-dashed rounded-xl hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors text-center"
                >
                  <Clipboard className="w-10 h-10 text-blue-500 mx-auto mb-3" />
                  <h3 className="font-semibold text-gray-900 dark:text-white">Paste Data</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Paste names from clipboard
                  </p>
                </button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
              />

              <div className="pt-4 border-t dark:border-gray-700">
                <button
                  onClick={downloadTemplate}
                  className="flex items-center gap-2 text-sm text-blue-500 hover:text-blue-600"
                >
                  <Download className="w-4 h-4" />
                  Download CSV Template
                </button>
              </div>
            </div>
          ) : method === 'paste' ? (
            // Paste Input
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  Paste Player Data
                </h3>
                <button
                  onClick={() => setMethod(null)}
                  className="text-sm text-blue-500 hover:text-blue-600"
                >
                  Back
                </button>
              </div>

              <p className="text-sm text-gray-600 dark:text-gray-300">
                Paste player names, one per line. You can optionally add email and handicap separated by commas or tabs.
              </p>

              <textarea
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                placeholder="John Smith, john@email.com, 12.5
Jane Doe, jane@email.com, 18.2
Bob Wilson"
                className="w-full h-48 p-3 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white resize-none"
              />

              <button
                onClick={handlePasteSubmit}
                disabled={!pasteText.trim()}
                className="w-full py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                Parse Players
              </button>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-4 border-t dark:border-gray-700">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            {result ? 'Close' : 'Cancel'}
          </button>

          {parsedRows.length > 0 && !result && (
            <button
              onClick={handleImport}
              disabled={importing || validationErrors.length > 0}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {importing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Import {parsedRows.length} Players
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default BulkImportModal;
