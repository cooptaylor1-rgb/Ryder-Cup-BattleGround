import { FORMAT_CONFIGS } from '@/lib/types/matchFormats';
import type { MatchFormat } from '@/lib/types/matchFormats';
import type { SessionType } from '@/lib/types';
import type { ScoringMode } from '@/lib/types/scoringFormats';

export type FormatCategory = 'match_play' | 'side_game' | 'individual';

export interface FormatOption {
  value: string;
  label: string;
  description: string;
  playersPerTeam: number;
  defaultMatches: number;
  category: FormatCategory;
  isTeamBased: boolean;
  icon: string;
  comingSoon?: boolean;
}

export function getScoringMode(formatValue: string): ScoringMode | 'both' | undefined {
  const config = FORMAT_CONFIGS[formatValue as MatchFormat];
  return config?.scoringMode;
}

export const ALL_FORMATS: FormatOption[] = [
  {
    value: 'foursomes',
    label: 'Foursomes (Alternate Shot)',
    description: 'Partners take turns hitting the same ball - traditional Ryder Cup format',
    playersPerTeam: 2,
    defaultMatches: 4,
    category: 'match_play',
    isTeamBased: true,
    icon: '🔄',
  },
  {
    value: 'fourball',
    label: 'Four-Ball (Best Ball)',
    description: 'Each player plays their own ball, best score on each team counts',
    playersPerTeam: 2,
    defaultMatches: 4,
    category: 'match_play',
    isTeamBased: true,
    icon: '⚡',
  },
  {
    value: 'singles',
    label: 'Match Play (Singles)',
    description: '1v1 head-to-head match play competition',
    playersPerTeam: 1,
    defaultMatches: 12,
    category: 'match_play',
    isTeamBased: true,
    icon: '🎯',
  },
  {
    value: 'pinehurst',
    label: 'Pinehurst (Chapman)',
    description: 'Both tee off, switch balls for 2nd shot, choose one ball to finish',
    playersPerTeam: 2,
    defaultMatches: 4,
    category: 'match_play',
    isTeamBased: true,
    icon: '🔀',
  },
  {
    value: 'greensomes',
    label: 'Greensomes',
    description: 'Both tee off, choose best drive, alternate shots from there',
    playersPerTeam: 2,
    defaultMatches: 4,
    category: 'match_play',
    isTeamBased: true,
    icon: '🎪',
  },
  {
    value: 'scramble',
    label: 'Scramble',
    description: 'All players hit, pick best shot, all play from there - repeat',
    playersPerTeam: 4,
    defaultMatches: 2,
    category: 'match_play',
    isTeamBased: true,
    icon: '🤝',
  },
  {
    value: 'texas-scramble',
    label: 'Texas Scramble',
    description: 'Scramble with minimum drive requirements per player',
    playersPerTeam: 4,
    defaultMatches: 2,
    category: 'match_play',
    isTeamBased: true,
    icon: '🤠',
  },
  {
    value: 'shamble',
    label: 'Shamble',
    description: 'Scramble off the tee, then everyone plays their own ball',
    playersPerTeam: 4,
    defaultMatches: 2,
    category: 'match_play',
    isTeamBased: true,
    icon: '🌟',
  },
  {
    value: 'best-2-of-4',
    label: 'Best 2 of 4',
    description: 'Four players, best 2 net scores count on each hole',
    playersPerTeam: 4,
    defaultMatches: 1,
    category: 'match_play',
    isTeamBased: true,
    icon: '✌️',
  },
  {
    value: 'cha-cha-cha',
    label: 'Cha-Cha-Cha',
    description: 'Best 1 score (1-6), best 2 (7-12), all 3 (13-18)',
    playersPerTeam: 3,
    defaultMatches: 1,
    category: 'match_play',
    isTeamBased: true,
    icon: '💃',
  },
  {
    value: 'six-six-six',
    label: 'Sixes (6-6-6)',
    description: 'Format changes every 6 holes: best ball, aggregate, alternate shot',
    playersPerTeam: 2,
    defaultMatches: 2,
    category: 'match_play',
    isTeamBased: true,
    icon: '6️⃣',
  },
  {
    value: 'skins',
    label: 'Skins',
    description: 'Win the hole outright to win a skin, ties carry over',
    playersPerTeam: 1,
    defaultMatches: 1,
    category: 'side_game',
    isTeamBased: false,
    icon: '💰',
  },
  {
    value: 'nassau',
    label: 'Nassau',
    description: 'Three bets in one - front nine, back nine, and overall',
    playersPerTeam: 1,
    defaultMatches: 1,
    category: 'side_game',
    isTeamBased: true,
    icon: '🎲',
  },
  {
    value: 'wolf',
    label: 'Wolf',
    description: 'Rotating wolf picks partner or goes lone wolf against the field',
    playersPerTeam: 1,
    defaultMatches: 1,
    category: 'side_game',
    isTeamBased: false,
    icon: '🐺',
  },
  {
    value: 'vegas',
    label: 'Las Vegas',
    description: 'Team scores create a number (4+5=45), lowest wins the difference',
    playersPerTeam: 2,
    defaultMatches: 2,
    category: 'side_game',
    isTeamBased: true,
    icon: '🎰',
  },
  {
    value: 'bingo-bango-bongo',
    label: 'Bingo Bango Bongo',
    description: '3 points per hole: first on green, closest to pin, first in hole',
    playersPerTeam: 1,
    defaultMatches: 1,
    category: 'side_game',
    isTeamBased: false,
    icon: '🎉',
  },
  {
    value: 'stroke-play',
    label: 'Stroke Play',
    description: 'Traditional golf - lowest total gross strokes wins',
    playersPerTeam: 1,
    defaultMatches: 1,
    category: 'individual',
    isTeamBased: false,
    icon: '🏌️',
  },
  {
    value: 'net-stroke-play',
    label: 'Net Stroke Play',
    description: 'Stroke play with full handicap - lowest net score wins',
    playersPerTeam: 1,
    defaultMatches: 1,
    category: 'individual',
    isTeamBased: false,
    icon: '📉',
  },
  {
    value: 'stableford',
    label: 'Stableford',
    description: 'Point-based scoring - earn points relative to par on each hole',
    playersPerTeam: 1,
    defaultMatches: 1,
    category: 'individual',
    isTeamBased: false,
    icon: '📊',
  },
  {
    value: 'modified-stableford',
    label: 'Modified Stableford',
    description: 'Aggressive points - rewards eagles, penalizes bogeys',
    playersPerTeam: 1,
    defaultMatches: 1,
    category: 'individual',
    isTeamBased: false,
    icon: '⚡',
  },
  {
    value: 'bogey-golf',
    label: 'Bogey Golf (Par Competition)',
    description: 'Score vs par each hole: beat par (+1), match (0), lose (-1)',
    playersPerTeam: 1,
    defaultMatches: 1,
    category: 'individual',
    isTeamBased: false,
    icon: '🎯',
  },
];

export const SESSION_TYPES = ALL_FORMATS.filter((format) =>
  ['foursomes', 'fourball', 'singles'].includes(format.value)
).map((format) => ({
  value: format.value as SessionType,
  label: format.label,
  description: format.description,
  playersPerTeam: format.playersPerTeam,
  defaultMatches: format.defaultMatches,
}));

export const POPULAR_FORMATS = ['fourball', 'foursomes', 'singles', 'skins'];

export const FORMAT_CATEGORIES: {
  value: FormatCategory;
  label: string;
  description: string;
}[] = [
  { value: 'match_play', label: 'Match Play', description: 'Traditional Ryder Cup formats' },
  { value: 'side_game', label: 'Side Games', description: 'Additional betting formats' },
  { value: 'individual', label: 'Individual', description: 'Stroke-based formats' },
];

export function generateSessionName(existingSessions: number): string {
  const sessionNum = existingSessions + 1;
  const dayNum = sessionNum <= 3 ? sessionNum : Math.ceil(sessionNum / 2);
  const timeSlot = sessionNum % 2 === 1 ? 'AM' : 'PM';
  return `Day ${dayNum} ${timeSlot}`;
}

export function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
}
