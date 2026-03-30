/**
 * An expandable card for a single player in the attendance roster.
 * Shows status, contact info, and — when expanded — quick-action buttons.
 */

'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  ChevronDown,
  Circle,
  Clock,
  MessageSquare,
  Phone,
  UserCheck,
  UserX,
} from 'lucide-react';
import type { AttendeePlayer } from './attendanceTypes';
import { getStatusConfig } from './attendanceTypes';
import { ActionChip } from './ActionChip';

export interface PlayerCheckInCardProps {
  player: AttendeePlayer;
  onQuickCheckIn: () => void;
  onSetETA: () => void;
  onMarkNoShow: () => void;
  onCall?: () => void;
  onText?: () => void;
}

export function PlayerCheckInCard({
  player,
  onQuickCheckIn,
  onSetETA,
  onMarkNoShow,
  onCall,
  onText,
}: PlayerCheckInCardProps) {
  const [expanded, setExpanded] = useState(false);
  const statusConfig = getStatusConfig(player.status);
  const StatusIcon = statusConfig.icon;
  const contactDetail = player.phone || player.email || `Handicap ${player.handicapIndex.toFixed(1)}`;

  return (
    <motion.div
      layout
      className="overflow-hidden rounded-[1.35rem] border border-[color:var(--rule)]/70 bg-[color:var(--surface)]/90 shadow-[0_14px_26px_rgba(41,29,17,0.05)]"
    >
      <div
        role="button"
        tabIndex={0}
        className="flex w-full items-start gap-[var(--space-3)] px-[var(--space-4)] py-[var(--space-4)] text-left"
        onClick={() => setExpanded((current) => !current)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            setExpanded((current) => !current);
          }
        }}
      >
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onQuickCheckIn();
          }}
          className={cn(
            'mt-0.5 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[1rem] border transition-transform hover:scale-[1.03]',
            statusConfig.chipClassName
          )}
          aria-label={`Update ${player.firstName} ${player.lastName}`}
        >
          <StatusIcon className="h-5 w-5" />
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-base font-semibold text-[var(--ink)]">
              {player.firstName} {player.lastName}
            </p>
            <span className={cn('rounded-full border px-2.5 py-1 text-xs font-semibold', statusConfig.chipClassName)}>
              {statusConfig.label}
            </span>
          </div>

          <p className="mt-2 text-sm text-[var(--ink-secondary)]">
            Handicap {player.handicapIndex.toFixed(1)}
            {player.eta && player.status === 'en-route' ? ` • ETA ${player.eta}` : ''}
            {player.teeTime ? ` • Tee ${player.teeTime}` : ''}
          </p>
          <p className="mt-1 truncate text-sm text-[var(--ink-tertiary)]">{contactDetail}</p>
        </div>

        <ChevronDown
          className={cn('mt-1 h-5 w-5 shrink-0 text-[var(--ink-tertiary)] transition-transform', expanded && 'rotate-180')}
        />
      </div>

      <AnimatePresence initial={false}>
        {expanded ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="border-t border-[color:var(--rule)]/65 bg-[color:var(--surface-raised)]/55 px-[var(--space-4)] py-[var(--space-3)]">
              <div className="flex flex-wrap gap-2">
                {player.status !== 'checked-in' ? (
                  <ActionChip
                    label="Check In"
                    icon={<UserCheck className="h-4 w-4" />}
                    className="bg-[color:var(--success)]/12 text-[var(--success)]"
                    onClick={onQuickCheckIn}
                  />
                ) : (
                  <ActionChip
                    label="Mark Missing"
                    icon={<Circle className="h-4 w-4" />}
                    className="bg-[color:var(--surface)] text-[var(--ink-secondary)]"
                    onClick={onQuickCheckIn}
                  />
                )}

                {player.status === 'not-arrived' ? (
                  <ActionChip
                    label="Set ETA"
                    icon={<Clock className="h-4 w-4" />}
                    className="bg-[color:var(--warning)]/12 text-[var(--warning)]"
                    onClick={onSetETA}
                  />
                ) : null}

                {player.status !== 'checked-in' && player.status !== 'no-show' ? (
                  <ActionChip
                    label="No Show"
                    icon={<UserX className="h-4 w-4" />}
                    className="bg-[color:var(--error)]/12 text-[var(--error)]"
                    onClick={onMarkNoShow}
                  />
                ) : null}

                {onCall && player.phone ? (
                  <ActionChip
                    label="Call"
                    icon={<Phone className="h-4 w-4" />}
                    className="bg-[color:var(--surface)] text-[var(--ink)]"
                    onClick={onCall}
                  />
                ) : null}

                {onText && player.phone ? (
                  <ActionChip
                    label="Text"
                    icon={<MessageSquare className="h-4 w-4" />}
                    className="bg-[color:var(--surface)] text-[var(--ink)]"
                    onClick={onText}
                  />
                ) : null}
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.div>
  );
}
