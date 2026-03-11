import type { SideBet as DBSideBet } from '@/lib/types/models';
import type { SideBet as ReminderSideBet } from '@/components/live-play/SideBetReminder';

export function hashStringToSeed(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function mulberry32(seed: number) {
  return function rand() {
    let next = (seed += 0x6d2b79f5);
    next = Math.imul(next ^ (next >>> 15), next | 1);
    next ^= next + Math.imul(next ^ (next >>> 7), next | 61);
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
}

export function toReminderBet(bet: DBSideBet): ReminderSideBet {
  return {
    id: bet.id,
    type: bet.type === 'longdrive' ? 'long_drive' : bet.type,
    name: bet.name,
    description: bet.description,
    holes: bet.hole ? [bet.hole] : undefined,
    buyIn: bet.perHole ?? bet.pot ?? 0,
    pot: bet.pot ?? 0,
    participants: bet.participantIds,
    status: bet.status,
  };
}
