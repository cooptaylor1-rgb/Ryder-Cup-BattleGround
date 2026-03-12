import type { ImportSource, PlayerImportRow } from '@/lib/types/captain';

import type { ParsedBulkImportInput } from './bulkImportTypes';

function parseCSVLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];

    if (char === '"') {
      if (inQuotes && line[index + 1] === '"') {
        current += '"';
        index += 1;
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

export function parseCSV(csvText: string): PlayerImportRow[] {
  const lines = csvText.trim().split('\n');
  if (lines.length === 0 || !lines[0]?.trim()) return [];

  const firstLine = lines[0];
  const delimiter = firstLine.includes('\t') ? '\t' : firstLine.includes(';') ? ';' : ',';
  const headers = lines[0]
    .toLowerCase()
    .split(delimiter)
    .map((header) => header.trim().replace(/"/g, ''));

  const headerMap: Record<string, keyof PlayerImportRow> = {
    'first name': 'firstName',
    firstname: 'firstName',
    first: 'firstName',
    'last name': 'lastName',
    lastname: 'lastName',
    last: 'lastName',
    name: 'firstName',
    email: 'email',
    'e-mail': 'email',
    handicap: 'handicapIndex',
    'handicap index': 'handicapIndex',
    hdcp: 'handicapIndex',
    hcp: 'handicapIndex',
    index: 'handicapIndex',
    ghin: 'ghin',
    'ghin number': 'ghin',
    'ghin #': 'ghin',
    team: 'team',
    phone: 'phone',
    mobile: 'phone',
    cell: 'phone',
  };

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

  const rows: PlayerImportRow[] = [];

  for (let lineIndex = 1; lineIndex < lines.length; lineIndex += 1) {
    const line = lines[lineIndex].trim();
    if (!line) continue;

    const values = parseCSVLine(line, delimiter);
    const row: PlayerImportRow = {
      firstName: '',
      lastName: '',
    };

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
      const handicap = parseFloat(values[columnMap.handicapIndex]);
      if (!Number.isNaN(handicap)) {
        row.handicapIndex = handicap;
      }
    }

    if (columnMap.ghin !== undefined) {
      row.ghin = values[columnMap.ghin]?.trim();
    }

    if (columnMap.team !== undefined) {
      const teamValue = values[columnMap.team]?.trim().toUpperCase();
      if (teamValue === 'A' || teamValue === 'B' || teamValue === '1' || teamValue === '2') {
        row.team = teamValue === '1' ? 'A' : teamValue === '2' ? 'B' : (teamValue as 'A' | 'B');
      }
    }

    if (columnMap.phone !== undefined) {
      row.phone = values[columnMap.phone]?.trim();
    }

    rows.push(row);
  }

  return rows;
}

export function parseClipboardText(text: string): PlayerImportRow[] {
  const lines = text
    .trim()
    .split('\n')
    .filter((line) => line.trim());
  const rows: PlayerImportRow[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

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

export function detectImportFormat(data: string): ImportSource {
  const trimmed = data.trim();
  const firstLine = trimmed.split('\n')[0]?.toLowerCase() || '';

  if (
    (firstLine.includes('first') || firstLine.includes('name') || firstLine.includes('handicap')) &&
    (firstLine.includes(',') || firstLine.includes('\t'))
  ) {
    return 'csv';
  }

  if (trimmed.includes('\t')) {
    return 'csv';
  }

  return 'clipboard';
}

export function parseImportData(source: ImportSource, data: string): ParsedBulkImportInput {
  switch (source) {
    case 'csv':
      return { source, rows: parseCSV(data) };
    case 'clipboard':
    case 'manual':
    case 'contacts':
    case 'ghin':
    default:
      return { source, rows: parseClipboardText(data) };
  }
}

export function generateCSVTemplate(): string {
  return [
    ['First Name', 'Last Name', 'Email', 'Handicap', 'GHIN', 'Team'].join(','),
    ['John', 'Smith', 'john@example.com', '12.5', '1234567', 'A'].join(','),
    '// Add your players below, one per row',
  ].join('\n');
}
