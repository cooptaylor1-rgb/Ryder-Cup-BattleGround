/**
 * Runtime validators for the JSONB trip settings columns.
 *
 * Supabase stores trip.scoring_settings and trip.handicap_settings
 * as opaque JSONB. The writer sends our well-typed TS shapes, but
 * any row on the server could hold a malformed blob — a pre-v2
 * legacy import, a manual dashboard edit, a client that shipped
 * before a field was renamed. Writing that blob back into Dexie
 * unchecked gives React components a silently-mistyped Trip that
 * will blow up deep in a reducer the first time someone reads
 * `trip.scoringSettings.stablefordPoints.par`.
 *
 * These guards coerce unknown JSON into the typed shape or return
 * undefined. They intentionally accept loose inputs (missing
 * optional fields get defaults) so a partially-valid blob still
 * round-trips the fields we can trust.
 */

import type {
  ScoringSettings,
  WinCondition,
  ScoringFormat,
} from '@/components/trip-setup/ScoringFormatOptions';
import type { HandicapSettings } from '@/components/trip-setup/HandicapRules';

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

const SCORING_FORMATS = new Set<ScoringFormat>([
  'match-play',
  'stroke-play',
  'stableford',
  'modified-stableford',
]);
const WIN_CONDITIONS = new Set<WinCondition>([
  'most-points',
  'points-threshold',
  'match-count',
]);

function asScoringFormat(v: unknown): ScoringFormat | undefined {
  return typeof v === 'string' && SCORING_FORMATS.has(v as ScoringFormat)
    ? (v as ScoringFormat)
    : undefined;
}

function asWinCondition(v: unknown): WinCondition | undefined {
  return typeof v === 'string' && WIN_CONDITIONS.has(v as WinCondition)
    ? (v as WinCondition)
    : undefined;
}

function asPointsMap<K extends string>(
  v: unknown,
  keys: readonly K[]
): Record<K, number> | undefined {
  if (!isRecord(v)) return undefined;
  const result = {} as Record<K, number>;
  for (const key of keys) {
    const raw = v[key];
    if (typeof raw !== 'number' || !Number.isFinite(raw)) return undefined;
    result[key] = raw;
  }
  return result;
}

export function coerceScoringSettings(raw: unknown): ScoringSettings | undefined {
  if (!isRecord(raw)) return undefined;

  const defaultFormat = asScoringFormat(raw.defaultFormat);
  if (!defaultFormat) return undefined;
  const winCondition = asWinCondition(raw.winCondition);
  if (!winCondition) return undefined;

  const stablefordPoints = asPointsMap(raw.stablefordPoints, [
    'eagle',
    'birdie',
    'par',
    'bogey',
    'doubleBogey',
    'worse',
  ] as const);
  if (!stablefordPoints) return undefined;

  const modifiedStablefordPoints = asPointsMap(raw.modifiedStablefordPoints, [
    'albatross',
    'eagle',
    'birdie',
    'par',
    'bogey',
    'doubleBogey',
    'worse',
  ] as const);
  if (!modifiedStablefordPoints) return undefined;

  return {
    defaultFormat,
    allowFormatPerSession: Boolean(raw.allowFormatPerSession),
    winCondition,
    pointsToWin:
      typeof raw.pointsToWin === 'number' ? raw.pointsToWin : undefined,
    matchesToWin:
      typeof raw.matchesToWin === 'number' ? raw.matchesToWin : undefined,
    stablefordPoints,
    modifiedStablefordPoints,
  } as ScoringSettings;
}

const MATCH_PLAY_ALLOWANCES = new Set(['full', 'three-quarters', 'half']);
const STROKE_PLAY_ALLOWANCES = new Set(['full', 'three-quarters', 'half']);
const FOURSOMES_METHODS = new Set(['average', 'lower', 'combined']);
const FOURBALL_METHODS = new Set(['full', 'percentage']);

export function coerceHandicapSettings(raw: unknown): HandicapSettings | undefined {
  if (!isRecord(raw)) return undefined;

  const allowance = raw.allowancePercent;
  const max = raw.maxHandicap;
  if (typeof allowance !== 'number' || !Number.isFinite(allowance)) return undefined;
  if (typeof max !== 'number' || !Number.isFinite(max)) return undefined;

  const matchPlay = raw.matchPlayAllowance;
  const strokePlay = raw.strokePlayAllowance;
  const foursomes = raw.foursomesMethod;
  const fourball = raw.fourballMethod;
  if (typeof matchPlay !== 'string' || !MATCH_PLAY_ALLOWANCES.has(matchPlay)) return undefined;
  if (typeof strokePlay !== 'string' || !STROKE_PLAY_ALLOWANCES.has(strokePlay))
    return undefined;
  if (typeof foursomes !== 'string' || !FOURSOMES_METHODS.has(foursomes)) return undefined;
  if (typeof fourball !== 'string' || !FOURBALL_METHODS.has(fourball)) return undefined;

  return {
    allowancePercent: allowance,
    maxHandicap: max,
    useNetScoring: Boolean(raw.useNetScoring),
    matchPlayAllowance: matchPlay as HandicapSettings['matchPlayAllowance'],
    strokePlayAllowance: strokePlay as HandicapSettings['strokePlayAllowance'],
    foursomesMethod: foursomes as HandicapSettings['foursomesMethod'],
    fourballMethod: fourball as HandicapSettings['fourballMethod'],
    roundHandicaps: Boolean(raw.roundHandicaps),
  };
}
