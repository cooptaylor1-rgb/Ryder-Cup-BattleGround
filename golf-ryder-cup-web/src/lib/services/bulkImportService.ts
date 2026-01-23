/**
 * Bulk Player Import Service
 *
 * Handles importing players from various sources:
 * - CSV/spreadsheet data
 * - Clipboard paste
 * - Contact integration (future)
 * - GHIN lookup (future)
 */

import type {
    ImportSource,
    PlayerImportRow,
    ImportValidationResult,
    BulkImportResult,
    GHINLookupResult,
} from '@/lib/types/captain';
import type { Player } from '@/lib/types/models';

// Re-export types for convenience
export type {
    ImportSource,
    PlayerImportRow,
    ImportValidationResult,
    BulkImportResult,
    GHINLookupResult,
} from '@/lib/types/captain';

/**
 * Parse CSV text into player import rows
 */
export function parseCSV(csvText: string): PlayerImportRow[] {
    const lines = csvText.trim().split('\n');
    if (lines.length === 0) return [];

    // Detect delimiter (comma, tab, or semicolon)
    const firstLine = lines[0];
    const delimiter = firstLine.includes('\t') ? '\t'
        : firstLine.includes(';') ? ';'
            : ',';

    // Parse header row
    const headers = lines[0].toLowerCase().split(delimiter).map(h => h.trim().replace(/"/g, ''));

    // Map common header variations
    const headerMap: Record<string, keyof PlayerImportRow> = {
        'first name': 'firstName',
        'firstname': 'firstName',
        'first': 'firstName',
        'last name': 'lastName',
        'lastname': 'lastName',
        'last': 'lastName',
        'name': 'firstName', // Will handle full name
        'email': 'email',
        'e-mail': 'email',
        'handicap': 'handicapIndex',
        'handicap index': 'handicapIndex',
        'hdcp': 'handicapIndex',
        'hcp': 'handicapIndex',
        'index': 'handicapIndex',
        'ghin': 'ghin',
        'ghin number': 'ghin',
        'ghin #': 'ghin',
        'team': 'team',
        'phone': 'phone',
        'mobile': 'phone',
        'cell': 'phone',
    };

    // Map headers to indices
    const columnMap: Partial<Record<keyof PlayerImportRow, number>> = {};
    let hasFullName = false;

    headers.forEach((header, index) => {
        const mappedField = headerMap[header];
        if (mappedField) {
            columnMap[mappedField] = index;
        }
        if (header === 'name' || header === 'full name' || header === 'player') {
            hasFullName = true;
        }
    });

    // Parse data rows
    const rows: PlayerImportRow[] = [];

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const values = parseCSVLine(line, delimiter);
        const row: PlayerImportRow = {
            firstName: '',
            lastName: '',
        };

        // Handle full name splitting
        if (hasFullName && columnMap.firstName !== undefined) {
            const fullName = values[columnMap.firstName] || '';
            const nameParts = fullName.trim().split(/\s+/);
            if (nameParts.length >= 2) {
                row.firstName = nameParts[0];
                row.lastName = nameParts.slice(1).join(' ');
            } else {
                row.firstName = fullName;
            }
        } else {
            if (columnMap.firstName !== undefined) {
                row.firstName = values[columnMap.firstName]?.trim() || '';
            }
            if (columnMap.lastName !== undefined) {
                row.lastName = values[columnMap.lastName]?.trim() || '';
            }
        }

        if (columnMap.email !== undefined) {
            row.email = values[columnMap.email]?.trim();
        }
        if (columnMap.handicapIndex !== undefined) {
            const hdcp = parseFloat(values[columnMap.handicapIndex]);
            if (!isNaN(hdcp)) {
                row.handicapIndex = hdcp;
            }
        }
        if (columnMap.ghin !== undefined) {
            row.ghin = values[columnMap.ghin]?.trim();
        }
        if (columnMap.team !== undefined) {
            const teamValue = values[columnMap.team]?.trim().toUpperCase();
            if (teamValue === 'A' || teamValue === 'B' || teamValue === '1' || teamValue === '2') {
                row.team = teamValue === '1' ? 'A' : teamValue === '2' ? 'B' : teamValue as 'A' | 'B';
            }
        }
        if (columnMap.phone !== undefined) {
            row.phone = values[columnMap.phone]?.trim();
        }

        rows.push(row);
    }

    return rows;
}

/**
 * Parse a single CSV line handling quoted values
 */
function parseCSVLine(line: string, delimiter: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (char === '"') {
            if (inQuotes && line[i + 1] === '"') {
                // Escaped quote
                current += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === delimiter && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }

    result.push(current.trim());
    return result;
}

/**
 * Parse clipboard/plain text (one player per line)
 */
export function parseClipboardText(text: string): PlayerImportRow[] {
    const lines = text.trim().split('\n').filter(l => l.trim());
    const rows: PlayerImportRow[] = [];

    for (const line of lines) {
        // Try different patterns
        const trimmed = line.trim();

        // Pattern: "First Last (handicap)" or "First Last - handicap"
        const handicapMatch = trimmed.match(/^(.+?)\s*[\(\-–]\s*(\d+\.?\d*)\s*[\)]?$/);
        if (handicapMatch) {
            const nameParts = handicapMatch[1].trim().split(/\s+/);
            rows.push({
                firstName: nameParts[0] || '',
                lastName: nameParts.slice(1).join(' ') || '',
                handicapIndex: parseFloat(handicapMatch[2]),
            });
            continue;
        }

        // Pattern: "First Last, handicap"
        const commaMatch = trimmed.match(/^(.+?),\s*(\d+\.?\d*)$/);
        if (commaMatch) {
            const nameParts = commaMatch[1].trim().split(/\s+/);
            rows.push({
                firstName: nameParts[0] || '',
                lastName: nameParts.slice(1).join(' ') || '',
                handicapIndex: parseFloat(commaMatch[2]),
            });
            continue;
        }

        // Pattern: Just names
        const nameParts = trimmed.split(/\s+/);
        if (nameParts.length >= 1) {
            rows.push({
                firstName: nameParts[0] || '',
                lastName: nameParts.slice(1).join(' ') || '',
            });
        }
    }

    return rows;
}

/**
 * Validate import rows
 */
export function validateImportRows(rows: PlayerImportRow[]): ImportValidationResult[] {
    return rows.map((row, index) => {
        const errors: string[] = [];
        const warnings: string[] = [];

        // Required: first name
        if (!row.firstName || row.firstName.length < 1) {
            errors.push('First name is required');
        }

        // Last name warning
        if (!row.lastName || row.lastName.length < 1) {
            warnings.push('Last name is missing');
        }

        // Validate email format
        if (row.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) {
            errors.push('Invalid email format');
        }

        // Validate handicap range
        if (row.handicapIndex !== undefined) {
            if (row.handicapIndex < -10 || row.handicapIndex > 54) {
                errors.push('Handicap must be between -10 and 54');
            }
        } else {
            warnings.push('Handicap not provided');
        }

        // Validate GHIN format
        if (row.ghin && !/^\d{5,8}$/.test(row.ghin)) {
            warnings.push('GHIN number format may be invalid');
        }

        return {
            isValid: errors.length === 0,
            row,
            rowNumber: index + 1,
            errors,
            warnings,
        };
    });
}

/**
 * Create player entities from import rows
 */
export function createPlayersFromImport(
    validatedRows: ImportValidationResult[],
    skipInvalid: boolean = false
): Player[] {
    const players: Player[] = [];

    for (const result of validatedRows) {
        if (!result.isValid && !skipInvalid) continue;
        if (!result.isValid && result.errors.length > 0) continue;

        const row = result.row;
        const player: Player = {
            id: crypto.randomUUID(),
            firstName: row.firstName.trim(),
            lastName: row.lastName?.trim() || '',
            email: row.email?.trim(),
            handicapIndex: row.handicapIndex,
            ghin: row.ghin?.trim(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        players.push(player);
    }

    return players;
}

/**
 * Execute bulk import
 */
export function executeBulkImport(
    source: ImportSource,
    data: string,
    existingPlayers: Player[] = [],
    options: {
        skipDuplicates?: boolean;
        skipInvalid?: boolean;
    } = {}
): BulkImportResult {
    const { skipDuplicates = true, skipInvalid = false } = options;

    // Parse based on source
    let rows: PlayerImportRow[];
    switch (source) {
        case 'csv':
            rows = parseCSV(data);
            break;
        case 'clipboard':
            rows = parseClipboardText(data);
            break;
        default:
            rows = parseClipboardText(data);
    }

    // Validate rows
    const validationResults = validateImportRows(rows);

    // Check for duplicates against existing players
    if (skipDuplicates) {
        const existingNames = new Set(
            existingPlayers.map(p => `${p.firstName} ${p.lastName}`.toLowerCase())
        );

        validationResults.forEach(result => {
            const name = `${result.row.firstName} ${result.row.lastName}`.toLowerCase();
            if (existingNames.has(name)) {
                result.warnings.push('Player with this name already exists');
            }
        });
    }

    // Create players
    const importedPlayers = createPlayersFromImport(validationResults, skipInvalid);

    return {
        success: importedPlayers.length > 0,
        totalRows: rows.length,
        importedCount: importedPlayers.length,
        skippedCount: rows.length - importedPlayers.length - validationResults.filter(r => !r.isValid).length,
        errorCount: validationResults.filter(r => !r.isValid).length,
        validationResults,
        importedPlayers,
    };
}

/**
 * Generate CSV template for download
 */
export function generateCSVTemplate(): string {
    const headers = ['First Name', 'Last Name', 'Email', 'Handicap', 'GHIN', 'Team'];
    const example = ['John', 'Smith', 'john@example.com', '12.5', '1234567', 'A'];

    return [
        headers.join(','),
        example.join(','),
        '// Add your players below, one per row',
    ].join('\n');
}

/**
 * GHIN Lookup (stub - would need API integration)
 */
export async function lookupGHIN(ghinNumber: string): Promise<GHINLookupResult> {
    // This is a stub - real implementation would call GHIN API
    // For now, return a simulated response

    if (!ghinNumber || !/^\d{5,8}$/.test(ghinNumber)) {
        return {
            found: false,
            ghinNumber,
            error: 'Invalid GHIN number format',
        };
    }

    // Simulated delay
    await new Promise(resolve => setTimeout(resolve, 500));

    // In production, this would call the GHIN API
    return {
        found: false,
        ghinNumber,
        error: 'GHIN API integration not yet available',
    };
}

/**
 * Auto-detect import format
 */
export function detectImportFormat(data: string): ImportSource {
    const trimmed = data.trim();

    // Check for CSV headers
    const firstLine = trimmed.split('\n')[0].toLowerCase();
    if (firstLine.includes('first') || firstLine.includes('name') || firstLine.includes('handicap')) {
        if (firstLine.includes(',') || firstLine.includes('\t')) {
            return 'csv';
        }
    }

    // Check for tab-separated
    if (trimmed.includes('\t')) {
        return 'csv';
    }

    // Default to clipboard paste format
    return 'clipboard';
}

/**
 * Format import summary for display
 */
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
