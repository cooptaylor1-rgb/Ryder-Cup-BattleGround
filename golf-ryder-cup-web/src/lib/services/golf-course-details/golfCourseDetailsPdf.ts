import { apiLogger } from '@/lib/utils/logger';

import {
  fetchWithTimeout,
  inferTeeColor,
  sumYardages,
  toTitleCase,
} from './golfCourseDetailsShared';
import type {
  ExtractedCourseProfile,
  PdfRow,
  PdfTextItem,
  TeeSetData,
} from './golfCourseDetailsTypes';

interface ParsedScorecardHoleRow {
  holeNumber: number;
  yardages: number[];
  par: number;
  handicap: number;
}

export async function extractProfileFromPdfAsset(
  pdfUrl: string
): Promise<ExtractedCourseProfile> {
  try {
    const response = await fetchWithTimeout(pdfUrl, {
      headers: {
        'User-Agent': 'GolfRyderCupApp/1.0',
        Accept: 'application/pdf,*/*',
      },
    });

    if (!response.ok) {
      return { holes: [], teeSets: [] };
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('pdf') && !pdfUrl.toLowerCase().endsWith('.pdf')) {
      return { holes: [], teeSets: [] };
    }

    const pdf = await extractPdfPages(await response.arrayBuffer());
    const tees = extractTeeSetsFromPdfPages(pdf.pages);
    const scorecard = extractScorecardFromPdfPages(pdf.pages, tees.length);

    const teeSets = (tees.length > 0 ? tees : scorecard.teeSets).map((tee, index) => {
      const yardages =
        scorecard.teeSets[index]?.yardages || tee.yardages || Array(18).fill(null);
      const totalYardage = tee.totalYardage ?? sumYardages(yardages);

      return {
        ...tee,
        yardages,
        totalYardage: totalYardage > 0 ? totalYardage : undefined,
      };
    });

    return {
      name: pdf.courseName,
      sourcePageUrl: pdfUrl,
      holes: scorecard.holes,
      teeSets,
      provenance:
        teeSets.length > 0 || scorecard.holes.length > 0
          ? [
              {
                kind: 'scorecard-pdf',
                label: 'Linked scorecard PDF',
                url: pdfUrl,
                confidence: 'high',
              },
            ]
          : [],
    };
  } catch (error) {
    apiLogger.error('PDF scorecard extraction error:', { pdfUrl, error });
    return { holes: [], teeSets: [] };
  }
}

async function extractPdfPages(arrayBuffer: ArrayBuffer): Promise<{
  courseName?: string;
  pages: PdfTextItem[][];
}> {
  const loadWorkerModule = async (): Promise<{ WorkerMessageHandler: unknown }> => {
    // pdfjs-dist does not publish typings for the worker bundle.
    // @ts-expect-error Untyped worker entrypoint.
    return import('pdfjs-dist/legacy/build/pdf.worker.mjs');
  };

  const [{ getDocument }, workerModule] = await Promise.all([
    import('pdfjs-dist/legacy/build/pdf.mjs'),
    loadWorkerModule(),
  ]);

  (
    globalThis as typeof globalThis & {
      pdfjsWorker?: typeof workerModule;
    }
  ).pdfjsWorker = workerModule;

  const task = getDocument({
    data: new Uint8Array(arrayBuffer),
    useWorkerFetch: false,
    useSystemFonts: false,
    disableFontFace: true,
    isOffscreenCanvasSupported: false,
    isImageDecoderSupported: false,
  });

  try {
    const pdf = await task.promise;
    const pages: PdfTextItem[][] = [];
    let courseName: string | undefined;

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      const items = (content.items as Array<{
        str?: string;
        transform?: number[];
        width?: number;
        height?: number;
      }>)
        .map((item) => ({
          str: item.str?.trim() || '',
          x: item.transform?.[4] ?? 0,
          y: item.transform?.[5] ?? 0,
          width: item.width ?? 0,
          height: item.height ?? 0,
        }))
        .filter((item) => item.str.length > 0);

      if (!courseName) {
        courseName = inferCourseNameFromPdfItems(items);
      }

      pages.push(items);
    }

    return { courseName, pages };
  } finally {
    await task.destroy();
  }
}

function inferCourseNameFromPdfItems(items: PdfTextItem[]): string | undefined {
  const candidates = items
    .map((item) => item.str.trim())
    .filter(
      (value) =>
        /^[A-Z][A-Z\s/&-]{2,}$/.test(value) &&
        !/RATING|SLOPE|HANDICAP|TOTAL|SIGNED|ATTESTED/.test(value)
    );

  if (candidates.length === 0) return undefined;
  const unique = Array.from(new Set(candidates));
  return toTitleCase(unique[unique.length - 1]);
}

function extractTeeSetsFromPdfPages(pages: PdfTextItem[][]): TeeSetData[] {
  for (const page of pages) {
    const rows = groupPdfRows(page);
    const teeRows = rows
      .map((row) => normalizePdfRowText(row))
      .map((text): TeeSetData | null => {
        const match = text.match(
          /^([A-Z][A-Z /]+?)\s+(\d{2}\.\d)\s*\/\s*(\d{2,3})(?:\s+(\d{2}\.\d)\s*\/\s*(\d{2,3}))?$/
        );
        if (!match) return null;

        return {
          name: toTitleCase(match[1]),
          color: inferTeeColor(toTitleCase(match[1])),
          rating: Number.parseFloat(match[2]),
          slope: Number.parseInt(match[3], 10),
          yardages: Array(18).fill(null),
        };
      })
      .filter((row): row is TeeSetData => row !== null);

    if (teeRows.length > 0) {
      return teeRows;
    }
  }

  return [];
}

function extractScorecardFromPdfPages(
  pages: PdfTextItem[][],
  teeCountHint: number
): {
  holes: ExtractedCourseProfile['holes'];
  teeSets: TeeSetData[];
} {
  for (const page of pages) {
    const rows = groupPdfRows(page);
    const holeRows = rows
      .map((row) => parseScorecardHoleRow(row, teeCountHint))
      .filter((row): row is ParsedScorecardHoleRow => row !== null)
      .sort((a, b) => a.holeNumber - b.holeNumber);

    if (holeRows.length !== 18) continue;

    const teeCount = teeCountHint > 0 ? teeCountHint : holeRows[0].yardages.length;
    const teeSets = Array.from({ length: teeCount }, (_, index) => ({
      name: `Tee ${index + 1}`,
      color: undefined,
      yardages: holeRows.map((row) => row.yardages[index] ?? null),
      totalYardage: holeRows.reduce((sum, row) => sum + (row.yardages[index] ?? 0), 0),
    }));

    const holes = holeRows.map((row) => ({
      par: row.par,
      handicap: row.handicap,
      yardage: row.yardages[0] ?? null,
    }));

    return { holes, teeSets };
  }

  return { holes: [], teeSets: [] };
}

function groupPdfRows(items: PdfTextItem[], tolerance = 3): PdfRow[] {
  const sorted = [...items].sort((a, b) => {
    if (Math.abs(b.y - a.y) > tolerance) return b.y - a.y;
    return a.x - b.x;
  });

  const rows: PdfRow[] = [];

  for (const item of sorted) {
    const row = rows.find((entry) => Math.abs(entry.y - item.y) <= tolerance);
    if (row) {
      row.items.push(item);
      continue;
    }
    rows.push({ y: item.y, items: [item] });
  }

  return rows
    .map((row) => ({
      ...row,
      items: [...row.items].sort((a, b) => a.x - b.x),
    }))
    .sort((a, b) => b.y - a.y);
}

function normalizePdfRowText(row: PdfRow): string {
  return row.items
    .map((item) => item.str)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\s+\/\s+/g, ' / ');
}

function parseScorecardHoleRow(
  row: PdfRow,
  teeCountHint: number
): ParsedScorecardHoleRow | null {
  const numericTokens = row.items
    .map((item) => item.str.replace(/,/g, '').trim())
    .filter((value) => /^\d{1,4}$/.test(value))
    .map((value) => Number.parseInt(value, 10));

  const holeNumber = numericTokens[0];
  if (!holeNumber || holeNumber < 1 || holeNumber > 18) {
    return null;
  }

  const teeCount = teeCountHint > 0 ? teeCountHint : Math.max(1, numericTokens.length - 4);
  if (numericTokens.length < teeCount + 3) {
    return null;
  }

  return {
    holeNumber,
    yardages: numericTokens.slice(1, 1 + teeCount),
    par: numericTokens[1 + teeCount] ?? 4,
    handicap: numericTokens[2 + teeCount] ?? holeNumber,
  };
}
