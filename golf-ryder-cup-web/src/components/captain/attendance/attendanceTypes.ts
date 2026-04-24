/**
 * Shared types, constants, and utilities for the AttendanceCheckIn component family.
 */

import {
  AlertTriangle,
  Car,
  CheckCircle2,
  Circle,
} from 'lucide-react';
import type { AttendanceStatus } from '@/lib/types/logistics';

export type { AttendanceStatus };

export interface AttendeePlayer {
  id: string;
  firstName: string;
  lastName: string;
  teamId: 'A' | 'B';
  handicapIndex: number;
  phone?: string;
  email?: string;
  avatarUrl?: string;
  status: AttendanceStatus;
  checkInTime?: string;
  eta?: string;
  lastLocation?: string;
  matchId?: string;
  teeTime?: string;
}

export interface AttendanceStats {
  total: number;
  checkedIn: number;
  enRoute: number;
  notArrived: number;
  noShow: number;
}

export const STATUS_ORDER: Record<AttendanceStatus, number> = {
  'no-show': 0,
  'not-arrived': 1,
  'en-route': 2,
  'checked-in': 3,
};

export const TEAM_TONE = {
  A: {
    dot: 'bg-[color:var(--team-usa)]',
    panel:
      'border-[color:var(--team-usa)]/14 bg-[linear-gradient(180deg,rgba(30,58,95,0.07),rgba(255,255,255,0.98))]',
  },
  B: {
    dot: 'bg-[color:var(--team-europe)]',
    panel:
      'border-[color:var(--team-europe)]/14 bg-[linear-gradient(180deg,rgba(114,47,55,0.08),rgba(255,255,255,0.98))]',
  },
} as const;

export const ETA_OPTIONS = [
  { value: '5 min', label: '5 minutes' },
  { value: '10 min', label: '10 minutes' },
  { value: '15 min', label: '15 minutes' },
  { value: '20 min', label: '20 minutes' },
  { value: '30 min', label: '30 minutes' },
  { value: '45 min', label: '45 minutes' },
  { value: '1 hour', label: '1 hour' },
];

export function getStatusConfig(status: AttendanceStatus) {
  switch (status) {
    case 'checked-in':
      return {
        label: 'Checked In',
        icon: CheckCircle2,
        chipClassName:
          'border-[color:var(--success)]/20 bg-[color:var(--success)]/12 text-[var(--success)]',
        actionClassName: 'bg-[color:var(--success)]/12 text-[var(--success)]',
      };
    case 'en-route':
      return {
        label: 'En Route',
        icon: Car,
        chipClassName:
          'border-[color:var(--warning)]/20 bg-[color:var(--warning)]/12 text-[var(--warning)]',
        actionClassName: 'bg-[color:var(--warning)]/12 text-[var(--warning)]',
      };
    case 'not-arrived':
      return {
        label: 'Not Arrived',
        icon: Circle,
        chipClassName:
          'border-[color:var(--rule)]/75 bg-[color:var(--surface)] text-[var(--ink-secondary)]',
        actionClassName: 'bg-[color:var(--surface-raised)] text-[var(--ink-secondary)]',
      };
    case 'no-show':
      return {
        label: 'No Show',
        icon: AlertTriangle,
        chipClassName:
          'border-[color:var(--error)]/18 bg-[color:var(--error)]/10 text-[var(--error)]',
        actionClassName: 'bg-[color:var(--error)]/12 text-[var(--error)]',
      };
  }
}

export function getTimeUntil(targetTime: string): string {
  const now = new Date();
  const target = new Date();
  const [hours, minutes] = targetTime.split(':').map(Number);
  target.setHours(hours, minutes, 0, 0);

  const diff = target.getTime() - now.getTime();
  if (diff <= 0) return 'Now';

  const totalMinutes = Math.floor(diff / 60000);
  if (totalMinutes < 60) return `${totalMinutes}m`;

  const totalHours = Math.floor(totalMinutes / 60);
  return `${totalHours}h ${totalMinutes % 60}m`;
}
