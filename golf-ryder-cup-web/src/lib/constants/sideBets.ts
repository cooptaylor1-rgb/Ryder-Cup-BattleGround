import {
  DollarSign,
  Ruler,
  Target,
  Trophy,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import type { SideBetType } from '@/lib/types/models';

export interface SideBetDefinition {
  type: SideBetType;
  label: string;
  description: string;
  icon: LucideIcon;
  accent: string;
  defaultPot: number;
  defaultPerHole?: number;
}

export const SIDE_BET_DEFINITIONS: SideBetDefinition[] = [
  {
    type: 'skins',
    label: 'Skins Game',
    description: '$5 per hole, carry-overs encouraged.',
    icon: Zap,
    accent: 'var(--warning)',
    defaultPot: 20,
    defaultPerHole: 5,
  },
  {
    type: 'ctp',
    label: 'Closest to Pin',
    description: 'A clean one-shot contest on the short holes.',
    icon: Target,
    accent: 'var(--team-usa)',
    defaultPot: 20,
  },
  {
    type: 'longdrive',
    label: 'Long Drive',
    description: 'Longest ball wins the noise and the money.',
    icon: Ruler,
    accent: 'var(--team-europe)',
    defaultPot: 20,
  },
  {
    type: 'nassau',
    label: 'Nassau',
    description: 'Front, back, and overall in one proper match bet.',
    icon: Trophy,
    accent: 'var(--masters)',
    defaultPot: 20,
  },
  {
    type: 'custom',
    label: 'Custom Bet',
    description: 'Write the house rule down before the stories start.',
    icon: DollarSign,
    accent: 'var(--maroon)',
    defaultPot: 20,
  },
];

export function getSideBetDefinition(type: SideBetType): SideBetDefinition {
  return (
    SIDE_BET_DEFINITIONS.find((definition) => definition.type === type) ??
    SIDE_BET_DEFINITIONS[SIDE_BET_DEFINITIONS.length - 1]
  );
}
