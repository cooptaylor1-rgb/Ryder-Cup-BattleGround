import type {
  CourseDetailsResponse,
  CourseProfileCompleteness,
  CourseProfileProvenance,
  HoleData,
  LinkedCourseAsset,
  TeeSetData,
} from './golfCourseDetailsTypes';

const UPSTREAM_TIMEOUT_MS = 8000;

export function normalizeWebsiteUrl(value: string | null): string | undefined {
  if (!value) return undefined;

  try {
    const parsed = new URL(value);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return undefined;
    }
    return parsed.toString();
  } catch {
    return undefined;
  }
}

export async function fetchWithTimeout(
  input: string,
  init: RequestInit = {}
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

export function toAbsoluteHttpUrl(value: string, baseUrl: string): string | null {
  if (
    !value ||
    value.startsWith('#') ||
    value.startsWith('mailto:') ||
    value.startsWith('tel:')
  ) {
    return null;
  }

  try {
    const absolute = new URL(value, baseUrl);
    if (absolute.protocol !== 'http:' && absolute.protocol !== 'https:') {
      return null;
    }
    return absolute.toString();
  } catch {
    return null;
  }
}

export function getSchemaType(record: Record<string, unknown>): string[] {
  const type = record['@type'];
  if (Array.isArray(type)) {
    return type.filter((entry): entry is string => typeof entry === 'string');
  }
  return typeof type === 'string' ? [type] : [];
}

export function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

export function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0
    ? decodeHtml(value.trim())
    : undefined;
}

export function asNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value.replace(/[^0-9.]/g, ''));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function stripTags(value: string): string {
  return value.replace(/<[^>]+>/g, ' ');
}

export function decodeHtml(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&ndash;/g, '–')
    .replace(/&rsquo;/g, '’')
    .replace(/&ldquo;/g, '“')
    .replace(/&rdquo;/g, '”');
}

export function inferTeeColor(name: string): string {
  const value = name.toLowerCase();
  if (value.includes('black') || value.includes('championship')) return 'Black';
  if (value.includes('blue')) return 'Blue';
  if (value.includes('white')) return 'White';
  if (value.includes('gold')) return 'Gold';
  if (value.includes('red') || value.includes('forward')) return 'Red';
  if (value.includes('green')) return 'Green';
  if (value.includes('silver')) return 'Silver';
  if (value.includes('orange')) return 'Orange';
  return name;
}

export function toTitleCase(value: string): string {
  return value
    .toLowerCase()
    .split(/\s+/)
    .map((word) =>
      word
        .split('/')
        .map((part) => (part ? part.charAt(0).toUpperCase() + part.slice(1) : part))
        .join(' / ')
    )
    .join(' ')
    .replace(/\s+\/\s+/g, ' / ');
}

export function sumYardages(yardages: Array<number | null>): number {
  return yardages.reduce<number>((sum, value) => sum + (value ?? 0), 0);
}

export function coerceHoles(holes: HoleData[]): HoleData[] {
  if (holes.length === 18) {
    return holes.map((hole, index) => ({
      par: hole.par || 4,
      handicap: hole.handicap || index + 1,
      yardage: hole.yardage ?? null,
    }));
  }

  return [];
}

export function coerceTeeSets(teeSets: TeeSetData[]): TeeSetData[] {
  return teeSets.map((tee) => ({
    name: tee.name,
    color: tee.color,
    gender: tee.gender,
    rating: tee.rating,
    slope: tee.slope,
    totalYardage: tee.totalYardage,
    yardages:
      tee.yardages && tee.yardages.length === 18 ? tee.yardages : Array(18).fill(null),
  }));
}

export function determineCourseProfileCompleteness(
  holes: HoleData[],
  teeSets: TeeSetData[],
  source: string
): CourseProfileCompleteness {
  if (source === 'placeholder') {
    return 'placeholder';
  }

  const hasPlayableTeeData =
    teeSets.length > 0 &&
    teeSets.some(
      (tee) =>
        typeof tee.rating === 'number' ||
        typeof tee.slope === 'number' ||
        tee.yardages.some((yardage) => yardage !== null)
    );
  const hasCourseProfile = Boolean(holes.length > 0 || teeSets.length > 0);

  if (hasPlayableTeeData) {
    return 'playable';
  }

  return hasCourseProfile ? 'basic' : 'placeholder';
}

export function deriveMissingCourseFields(
  details: Pick<CourseDetailsResponse, 'description' | 'city' | 'state' | 'country'>,
  holes: HoleData[],
  teeSets: TeeSetData[]
): string[] {
  const missingFields: string[] = [];

  if (!details.description) {
    missingFields.push('description');
  }

  if (!details.city && !details.state && !details.country) {
    missingFields.push('location');
  }

  if (teeSets.length === 0) {
    missingFields.push('tee-data');
  } else if (
    !teeSets.some(
      (tee) =>
        typeof tee.rating === 'number' ||
        typeof tee.slope === 'number' ||
        tee.yardages.some((yardage) => yardage !== null)
    )
  ) {
    missingFields.push('ratings-or-yardage');
  }

  if (holes.length !== 18) {
    missingFields.push('hole-layout');
  }

  return missingFields;
}

export function buildCourseDetailsResponse(
  details: Omit<CourseDetailsResponse, 'dataCompleteness' | 'hasPlayableTeeData'>
): CourseDetailsResponse {
  const holes = coerceHoles(details.holes);
  const teeSets = coerceTeeSets(details.teeSets);
  const dataCompleteness = determineCourseProfileCompleteness(holes, teeSets, details.source);
  const hasPlayableTeeData = dataCompleteness === 'playable';
  const missingFields =
    details.missingFields && details.missingFields.length > 0
      ? details.missingFields
      : deriveMissingCourseFields(details, holes, teeSets);

  return {
    ...details,
    holes,
    teeSets,
    dataCompleteness,
    hasPlayableTeeData,
    missingFields,
  };
}

export function withProvenance(
  provenance: CourseProfileProvenance[] | undefined,
  fallback: CourseProfileProvenance
): CourseProfileProvenance[] {
  return provenance && provenance.length > 0 ? provenance : [fallback];
}
