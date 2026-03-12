import type { BulkImportResult } from '@/lib/types/captain';

import type { BulkImportPlan } from './bulkImportTypes';

export function buildBulkImportResult(plan: BulkImportPlan): BulkImportResult {
  return {
    success: plan.importedCount > 0,
    totalRows: plan.totalRows,
    importedCount: plan.importedCount,
    skippedCount: plan.skippedCount,
    errorCount: plan.errorCount,
    validationResults: plan.validationResults,
    importedPlayers: plan.importedPlayers,
  };
}

export function buildRejectedBulkImportResult(plan: BulkImportPlan): BulkImportResult {
  return {
    success: false,
    totalRows: plan.totalRows,
    importedCount: 0,
    skippedCount: plan.skippedCount,
    errorCount: plan.errorCount,
    validationResults: plan.validationResults,
    importedPlayers: [],
  };
}

export function formatImportSummary(result: BulkImportResult): string {
  const lines: string[] = [];

  if (result.success) {
    lines.push(`✅ Successfully imported ${result.importedCount} player(s)`);
  } else {
    lines.push('❌ Import failed');
  }

  if (result.skippedCount > 0) {
    lines.push(`⏭️ Skipped ${result.skippedCount} duplicate(s)`);
  }

  if (result.errorCount > 0) {
    lines.push(`⚠️ ${result.errorCount} row(s) had errors`);
  }

  return lines.join('\n');
}
