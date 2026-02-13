"use client";

import React, { useState, useRef } from "react";
import {
  parseCSV,
  parseClipboardText,
  validateImportRows,
  createPlayersFromImport,
  generateCSVTemplate,
  type PlayerImportRow,
  type BulkImportResult,
} from "@/lib/services/bulkImportService";
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
} from "lucide-react";

interface BulkImportModalProps {
  tripId: string;
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: (result: BulkImportResult) => void;
  existingPlayers?: { firstName: string; lastName: string }[];
}

type ImportMethod = "csv" | "paste" | null;

export function BulkImportModal({
  tripId: _tripId,
  isOpen,
  onClose,
  onImportComplete,
  existingPlayers: _existingPlayers = [],
}: BulkImportModalProps) {
  const [method, setMethod] = useState<ImportMethod>(null);
  const [pasteText, setPasteText] = useState("");
  const [parsedRows, setParsedRows] = useState<PlayerImportRow[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<BulkImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setMethod(null);
    setPasteText("");
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
        .filter((v) => !v.isValid)
        .flatMap((v) => v.errors.map((err) => `Row ${v.rowNumber}: ${err}`));

      setParsedRows(rows);
      setValidationErrors(errors);
    } catch {
      setValidationErrors(["Failed to parse CSV file"]);
    }
  };

  const handlePasteSubmit = () => {
    if (!pasteText.trim()) {
      setValidationErrors(["Please paste some player data"]);
      return;
    }

    const rows = parseClipboardText(pasteText);
    const validation = validateImportRows(rows);
    const errors = validation
      .filter((v) => !v.isValid)
      .flatMap((v) => v.errors.map((err) => `Row ${v.rowNumber}: ${err}`));

    setParsedRows(rows);
    setValidationErrors(errors);
  };

  const handleImport = async () => {
    if (parsedRows.length === 0) return;

    setImporting(true);
    try {
      const validationResults = validateImportRows(parsedRows);
      const players = createPlayersFromImport(validationResults, true);

      const errorCount = validationResults.filter((v) => !v.isValid).length;

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
      setValidationErrors(["Import failed: " + (error as Error).message]);
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = () => {
    const csv = generateCSVTemplate();
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "player-import-template.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-sm p-4">
      <div className="flex w-full max-w-2xl max-h-[90vh] flex-col overflow-hidden rounded-2xl border border-[var(--rule)] bg-[var(--surface-raised)] shadow-[var(--shadow-card-lg)]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--rule)] bg-[color:var(--surface-secondary)]/40 px-5 py-4">
          <div className="flex items-center gap-3">
            <Users className="h-6 w-6 text-[var(--masters)]" />
            <h2 className="text-xl font-semibold leading-tight text-[var(--ink-primary)]">
              Bulk Import Players
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="rounded-lg p-2 text-[var(--ink-tertiary)] transition-colors hover:bg-[var(--surface-secondary)] hover:text-[var(--ink-primary)]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto px-5 py-4">
          {result ? (
            // Result View
            <div className="space-y-4">
              <div
                className={
                  result.success
                    ? "rounded-xl border border-[color:var(--success)]/20 bg-[color:var(--success)]/10 p-4"
                    : "rounded-xl border border-[color:var(--warning)]/25 bg-[color:var(--warning)]/10 p-4"
                }
              >
                <div className="mb-2 flex items-center gap-3">
                  {result.success ? (
                    <CheckCircle className="h-6 w-6 text-[var(--success)]" />
                  ) : (
                    <AlertTriangle className="h-6 w-6 text-[var(--warning)]" />
                  )}
                  <span className="text-lg font-semibold text-[var(--ink-primary)]">
                    Import {result.success ? "Complete" : "Completed with Issues"}
                  </span>
                </div>
                <p className="text-[var(--ink-secondary)]">
                  Successfully imported {result.importedCount} player(s)
                  {result.skippedCount > 0 && `, skipped ${result.skippedCount}`}
                  {result.errorCount > 0 && `, ${result.errorCount} errors`}
                </p>
              </div>

              {result.importedPlayers.length > 0 && (
                <div>
                  <h4 className="mb-2 font-medium text-[var(--ink-primary)]">
                    Imported Players
                  </h4>
                  <div className="space-y-1">
                    {result.importedPlayers.map((player, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 text-sm text-[var(--ink-secondary)]"
                      >
                        <CheckCircle className="h-4 w-4 text-[var(--success)]" />
                        {player.firstName} {player.lastName}
                        {player.handicapIndex !== undefined && ` (${player.handicapIndex})`}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {result.skippedCount > 0 && (
                <div>
                  <h4 className="mb-2 font-medium text-[var(--ink-primary)]">
                    Skipped ({result.skippedCount})
                  </h4>
                  <div className="space-y-1">
                    {result.validationResults
                      .filter((v) => !v.isValid)
                      .map((v, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-2 text-sm text-[var(--ink-secondary)]"
                        >
                          <AlertTriangle className="h-4 w-4 text-[var(--warning)]" />
                          Row {v.rowNumber}: {v.row.firstName} {v.row.lastName}
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {result.errorCount > 0 && (
                <div>
                  <h4 className="mb-2 font-medium text-[var(--ink-primary)]">
                    Errors
                  </h4>
                  <div className="space-y-1">
                    {result.validationResults
                      .filter((v) => !v.isValid)
                      .flatMap((v, idx) =>
                        v.errors.map((error, eIdx) => (
                          <div
                            key={`${idx}-${eIdx}`}
                            className="flex items-center gap-2 text-sm text-[var(--error)]"
                          >
                            <XCircle className="h-4 w-4" />
                            Row {v.rowNumber}: {error}
                          </div>
                        )),
                      )}
                  </div>
                </div>
              )}
            </div>
          ) : parsedRows.length > 0 ? (
            // Preview View
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-[var(--ink-primary)]">
                  Preview ({parsedRows.length} players)
                </h3>
                <button
                  onClick={reset}
                  className="text-sm font-medium text-[var(--masters)] transition-colors hover:text-[color:var(--masters-hover)]"
                >
                  Start Over
                </button>
              </div>

              {validationErrors.length > 0 && (
                <div className="rounded-xl border border-[color:var(--error)]/25 bg-[color:var(--error)]/10 p-3">
                  <h4 className="mb-2 font-medium text-[var(--error)]">
                    Validation Issues
                  </h4>
                  <ul className="space-y-1 text-sm text-[var(--error)]">
                    {validationErrors.map((error, idx) => (
                      <li key={idx}>• {error}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="overflow-hidden rounded-xl border border-[var(--rule)]/60">
                <table className="w-full text-sm">
                  <thead className="bg-[var(--surface-secondary)]/60 text-left">
                    <tr>
                      <th className="px-3 py-2 text-[var(--ink-secondary)]">Name</th>
                      <th className="px-3 py-2 text-[var(--ink-secondary)]">Email</th>
                      <th className="px-3 py-2 text-[var(--ink-secondary)]">Handicap</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[color:var(--rule)]/60">
                    {parsedRows.map((row, idx) => (
                      <tr key={idx} className="bg-[var(--surface-raised)]">
                        <td className="px-3 py-2 text-[var(--ink-primary)]">
                          {row.firstName} {row.lastName}
                        </td>
                        <td className="px-3 py-2 text-[var(--ink-secondary)]">
                          {row.email || "-"}
                        </td>
                        <td className="px-3 py-2 text-[var(--ink-secondary)]">
                          {row.handicapIndex !== undefined ? row.handicapIndex : "-"}
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
              <p className="text-[var(--ink-secondary)]">
                Choose how you&apos;d like to import players:
              </p>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <button
                  onClick={() => {
                    setMethod("csv");
                    fileInputRef.current?.click();
                  }}
                  className="rounded-xl border-2 border-dashed border-[color:var(--rule)] bg-[color:var(--surface-secondary)]/20 p-6 text-center transition-colors hover:border-[var(--masters)] hover:bg-[color:var(--masters)]/12"
                >
                  <FileText className="mx-auto mb-3 h-10 w-10 text-[var(--masters)]" />
                  <h3 className="font-semibold text-[var(--ink-primary)]">Upload CSV</h3>
                  <p className="mt-1 text-sm text-[var(--ink-secondary)]">
                    Import from a spreadsheet
                  </p>
                </button>

                <button
                  onClick={() => setMethod("paste")}
                  className="rounded-xl border-2 border-dashed border-[color:var(--rule)] bg-[color:var(--surface-secondary)]/20 p-6 text-center transition-colors hover:border-[var(--masters)] hover:bg-[color:var(--masters)]/12"
                >
                  <Clipboard className="mx-auto mb-3 h-10 w-10 text-[var(--masters)]" />
                  <h3 className="font-semibold text-[var(--ink-primary)]">Paste Data</h3>
                  <p className="mt-1 text-sm text-[var(--ink-secondary)]">
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

              <div className="border-t border-[color:var(--rule)]/60 pt-4">
                <button
                  onClick={downloadTemplate}
                  className="flex items-center gap-2 text-sm font-medium text-[var(--masters)] transition-colors hover:text-[color:var(--masters-hover)]"
                >
                  <Download className="h-4 w-4" />
                  Download CSV Template
                </button>
              </div>
            </div>
          ) : method === "paste" ? (
            // Paste Input
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-[var(--ink-primary)]">
                  Paste Player Data
                </h3>
                <button
                  onClick={() => setMethod(null)}
                  className="text-sm font-medium text-[var(--masters)] transition-colors hover:text-[color:var(--masters-hover)]"
                >
                  Back
                </button>
              </div>

              <p className="text-sm text-[var(--ink-secondary)]">
                Paste player names, one per line. You can optionally add email and handicap separated by commas or tabs.
              </p>

              <textarea
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                placeholder={`John Smith, john@email.com, 12.5\nJane Doe, jane@email.com, 18.2\nBob Wilson`}
                className="h-48 w-full resize-none rounded-xl border border-[var(--rule)] bg-[var(--surface-secondary)]/35 p-3 text-[var(--ink-primary)] shadow-inner focus:outline-none focus:ring-2 focus:ring-[color:var(--masters)]/40 focus:ring-offset-2 focus:ring-offset-[var(--surface-raised)] placeholder:text-[var(--ink-tertiary)]"
              />

              <button
                onClick={handlePasteSubmit}
                disabled={!pasteText.trim()}
                className="w-full rounded-lg bg-[var(--masters)] py-2 text-sm font-semibold text-[var(--canvas)] transition-colors hover:bg-[color:var(--masters-hover)] disabled:cursor-not-allowed disabled:bg-[color:var(--ink-tertiary)]/25 disabled:text-[color:var(--ink-tertiary)]/70"
              >
                Parse Players
              </button>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 border-t border-[var(--rule)] px-5 py-4">
          <button
            onClick={handleClose}
            className="rounded-lg px-4 py-2 text-[var(--ink-secondary)] transition-colors hover:bg-[var(--surface-secondary)] hover:text-[var(--ink-primary)]"
          >
            {result ? "Close" : "Cancel"}
          </button>

          {parsedRows.length > 0 && !result && (
            <button
              onClick={handleImport}
              disabled={importing || validationErrors.length > 0}
              className="flex items-center gap-2 rounded-lg bg-[var(--masters)] px-4 py-2 font-semibold text-[var(--canvas)] transition-colors hover:bg-[color:var(--masters-hover)] disabled:cursor-not-allowed disabled:bg-[color:var(--ink-tertiary)]/25 disabled:text-[color:var(--ink-tertiary)]/70"
            >
              {importing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
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
