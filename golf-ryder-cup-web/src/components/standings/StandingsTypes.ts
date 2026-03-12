import type { TripStatType } from '@/lib/types/tripStats';

export type StandingsTab = 'competition' | 'stats' | 'awards';

export interface HighlightStat {
  type: TripStatType;
  label: string;
  emoji: string;
  value: number;
  leader: string;
}
