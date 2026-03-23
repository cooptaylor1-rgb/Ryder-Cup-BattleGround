'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { cn, getCountdown, getCountdownColor, isToday } from '@/lib/utils';
import type { DaySchedule, ScheduleEntry } from '@/components/schedule/scheduleData';
import {
  Calendar,
  ChevronRight,
  Clock,
  Flag,
  Sunrise,
  Sunset,
  User,
} from 'lucide-react';

export function ScheduleTabSelector({
  selectedTab,
  myHref,
  allHref,
}: {
  selectedTab: 'my' | 'all';
  myHref: string;
  allHref: string;
}) {
  return (
    <div className="container-editorial py-4" role="tablist" aria-label="Schedule views">
      <div className="flex gap-2">
        <Link
          href={myHref}
          scroll={false}
          role="tab"
          aria-selected={selectedTab === 'my'}
          aria-controls="schedule-content"
          className={cn(
            'flex-1 rounded-xl px-4 py-3 font-medium transition-all flex items-center justify-center gap-2 no-underline',
            selectedTab === 'my'
              ? 'bg-[var(--masters)] text-[var(--canvas)]'
              : 'bg-[var(--surface)] border border-[var(--rule)] text-[var(--ink)]'
          )}
        >
          <User size={18} />
          Your Matches
        </Link>
        <Link
          href={allHref}
          scroll={false}
          role="tab"
          aria-selected={selectedTab === 'all'}
          aria-controls="schedule-content"
          className={cn(
            'flex-1 rounded-xl px-4 py-3 font-medium transition-all flex items-center justify-center gap-2 no-underline',
            selectedTab === 'all'
              ? 'bg-[var(--masters)] text-[var(--canvas)]'
              : 'bg-[var(--surface)] border border-[var(--rule)] text-[var(--ink)]'
          )}
        >
          <Calendar size={18} />
          Full Schedule
        </Link>
      </div>
    </div>
  );
}

export function ScheduleDaySection({
  day,
  onEntryPress,
}: {
  day: DaySchedule;
  onEntryPress: (entry: ScheduleEntry) => void;
}) {
  return (
    <div className="mb-8">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-12 w-12 flex-col items-center justify-center rounded-xl bg-[var(--masters)] text-[var(--canvas)]">
          <span className="text-xs font-medium opacity-80">Day</span>
          <span className="text-lg font-bold leading-none">{day.dayNumber}</span>
        </div>
        <div>
          <p className="font-semibold">{day.dayName}</p>
          <p className="type-caption">
            {new Date(day.date).toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>
      </div>

      {day.entries.length === 0 ? (
        <div className="py-[var(--space-4)]">
          <div className="rounded-[1.35rem] border border-dashed border-[var(--rule)] bg-[color:var(--surface)]/72 px-[var(--space-5)] py-[var(--space-5)] text-center">
            <p className="type-title-sm text-[var(--ink)]">No scheduled events</p>
            <p className="mt-[var(--space-2)] type-caption">
              Nothing is on the books for this day yet.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {day.entries.map((entry) => (
            <ScheduleEntryCard
              key={entry.id}
              entry={entry}
              onPress={entry.matchId ? () => onEntryPress(entry) : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ScheduleEntryCard({
  entry,
  onPress,
}: {
  entry: ScheduleEntry;
  onPress?: () => void;
}) {
  const isSession = entry.type === 'session';
  const isUserMatch = entry.isUserMatch;
  const countdown = useMemo(() => {
    if (!entry.datetime || entry.status !== 'upcoming') {
      return undefined;
    }
    return getCountdown(entry.datetime);
  }, [entry.datetime, entry.status]);
  const entryIsToday = isToday(entry.date);

  const statusClasses = {
    upcoming: {
      text: 'text-[var(--ink-tertiary)]',
      bg: 'bg-[color:var(--ink-tertiary)]/20',
    },
    inProgress: {
      text: 'text-[var(--warning)]',
      bg: 'bg-[color:var(--warning)]/20',
    },
    completed: {
      text: 'text-[var(--success)]',
      bg: 'bg-[color:var(--success)]/20',
    },
  } as const;

  return (
    <button
      onClick={onPress}
      disabled={!onPress}
      className={cn(
        'w-full rounded-xl border p-4 text-left transition-all',
        onPress && 'press-scale',
        isSession
          ? 'bg-[color:var(--masters)]/10 border-[var(--masters-glow)]'
          : isUserMatch
            ? 'bg-[color:var(--gold)]/10 border-[color:var(--gold)]/30'
            : 'bg-[var(--surface)] border-[var(--rule)]'
      )}
    >
      <div className="flex items-start gap-3">
        <div className="w-16 shrink-0">
          {entry.time ? <div className="text-sm font-semibold text-[var(--ink)]">{entry.time}</div> : null}

          {countdown && !countdown.isPast && isUserMatch && entryIsToday ? (
            <div
              className="mt-1 flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium"
              style={{
                background: `${getCountdownColor(countdown.urgency)}15`,
                color: getCountdownColor(countdown.urgency),
              }}
            >
              <Clock size={10} />
              {countdown.display}
            </div>
          ) : null}

          {isSession && !countdown ? (
            <div className="mt-1 flex items-center gap-1">
              {entry.time?.includes('AM') ? (
                <Sunrise size={12} className="text-[var(--masters)]" />
              ) : (
                <Sunset size={12} className="text-[var(--team-europe)]" />
              )}
            </div>
          ) : null}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {isSession ? <Flag size={14} className="text-[var(--masters)]" /> : null}
            {isUserMatch ? <User size={14} className="text-[var(--gold-light)]" /> : null}
            <span
              className={cn(
                'font-medium',
                !isSession && 'text-sm',
                isSession ? 'text-[var(--masters)]' : 'text-[var(--ink)]'
              )}
            >
              {entry.title}
            </span>
            {entry.status ? (
              <span
                className={cn(
                  'rounded-full px-2 py-0.5 text-[10px] font-medium uppercase',
                  statusClasses[entry.status].bg,
                  statusClasses[entry.status].text
                )}
              >
                {entry.status === 'inProgress' ? 'Live' : entry.status}
              </span>
            ) : null}
          </div>
          {entry.subtitle ? (
            <p className="mt-1 truncate text-sm text-[var(--ink-secondary)]">{entry.subtitle}</p>
          ) : null}
          {!isSession && (entry.courseName || entry.teeSetName || entry.handicapReady === false) ? (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {entry.courseName ? (
                <span className="rounded-full border border-[var(--rule)] bg-[var(--canvas)] px-2 py-1 text-[11px] font-medium text-[var(--ink-secondary)]">
                  {entry.courseName}
                </span>
              ) : (
                <span className="rounded-full border border-[color:var(--warning)]/20 bg-[color:var(--warning)]/10 px-2 py-1 text-[11px] font-medium text-[var(--warning)]">
                  Course needed
                </span>
              )}
              {entry.teeSetName ? (
                <span className="rounded-full border border-[var(--rule)] bg-[var(--canvas)] px-2 py-1 text-[11px] font-medium text-[var(--ink-secondary)]">
                  {entry.teeSetName}
                </span>
              ) : (
                <span className="rounded-full border border-[color:var(--warning)]/20 bg-[color:var(--warning)]/10 px-2 py-1 text-[11px] font-medium text-[var(--warning)]">
                  Tee needed
                </span>
              )}
              <span
                className={cn(
                  'rounded-full border px-2 py-1 text-[11px] font-medium',
                  entry.handicapReady
                    ? 'border-[color:var(--success)]/20 bg-[color:var(--success)]/10 text-[var(--success)]'
                    : 'border-[color:var(--warning)]/20 bg-[color:var(--warning)]/10 text-[var(--warning)]'
                )}
              >
                {entry.handicapReady ? 'Handicap ready' : 'Needs setup'}
              </span>
            </div>
          ) : null}
        </div>

        {onPress ? <ChevronRight size={18} className="shrink-0 text-[var(--ink-tertiary)]" /> : null}
      </div>
    </button>
  );
}
