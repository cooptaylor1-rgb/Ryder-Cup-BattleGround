'use client';

import Link from 'next/link';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type ReactNode,
} from 'react';
import {
  getPreFlightSummary,
  groupValidationsByCategory,
  runPreFlightCheck,
  type PreFlightCheckResult,
  type ValidationCategory,
  type ValidationItem,
} from '@/lib/services/preFlightValidationService';
import type {
  Course,
  Match,
  Player,
  RyderCupSession,
  Team,
  TeamMember,
  TeeSet,
  Trip,
} from '@/lib/types';
import { createLogger } from '@/lib/utils/logger';
import { cn } from '@/lib/utils';
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock3,
  Map,
  RefreshCw,
  Rocket,
  Shield,
  Users,
} from 'lucide-react';

const logger = createLogger('PreFlight');

interface PreFlightChecklistProps {
  tripId: string;
  trip?: Trip;
  players?: Player[];
  teams?: Team[];
  teamMembers?: TeamMember[];
  sessions?: RyderCupSession[];
  matches?: Match[];
  courses?: Course[];
  teeSets?: TeeSet[];
  onAllClear?: () => void;
}

const CATEGORY_META: Record<
  ValidationCategory,
  {
    label: string;
    icon: ComponentType<{ size?: number; className?: string }>;
  }
> = {
  players: { label: 'Players', icon: Users },
  teams: { label: 'Teams', icon: Shield },
  sessions: { label: 'Sessions', icon: CalendarDays },
  lineups: { label: 'Lineups', icon: Users },
  courses: { label: 'Courses', icon: Map },
  schedule: { label: 'Schedule', icon: Clock3 },
  handicaps: { label: 'Handicaps', icon: CheckCircle2 },
};

export function PreFlightChecklist({
  tripId,
  trip,
  players = [],
  teams = [],
  teamMembers = [],
  sessions = [],
  matches = [],
  courses = [],
  teeSets = [],
  onAllClear,
}: PreFlightChecklistProps) {
  const [result, setResult] = useState<PreFlightCheckResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPassedChecks, setShowPassedChecks] = useState(false);
  const lastSuccessfulAnnouncementKey = useRef<string | null>(null);

  const runCheck = useCallback(
    (announceSuccess = false) => {
      setLoading(true);

      try {
        const now = new Date().toISOString();
        const tripData: Trip = trip || {
          id: tripId,
          name: 'Trip',
          startDate: now,
          endDate: now,
          isCaptainModeEnabled: true,
          createdAt: now,
          updatedAt: now,
        };

        const checkResult = runPreFlightCheck(
          tripData,
          players,
          teams,
          teamMembers,
          sessions,
          matches,
          courses,
          teeSets
        );

        setResult(checkResult);
        if (!checkResult.isReady) {
          lastSuccessfulAnnouncementKey.current = null;
        }

        if (announceSuccess && checkResult.isReady && onAllClear) {
          const successKey = JSON.stringify({
            completionPercentage: checkResult.completionPercentage,
            errors: checkResult.errors.map((item) => ({
              category: item.category,
              title: item.title,
              description: item.description,
            })),
            warnings: checkResult.warnings.map((item) => ({
              category: item.category,
              title: item.title,
              description: item.description,
            })),
          });

          if (lastSuccessfulAnnouncementKey.current !== successKey) {
            lastSuccessfulAnnouncementKey.current = successKey;
            onAllClear();
          }
        }
      } catch (error) {
        logger.error('Pre-flight check failed:', error);
        setResult(null);
      } finally {
        setLoading(false);
      }
    },
    [courses, matches, onAllClear, players, sessions, teamMembers, teams, teeSets, trip, tripId]
  );

  useEffect(() => {
    runCheck(false);
  }, [runCheck]);

  const summary = useMemo(() => (result ? getPreFlightSummary(result) : null), [result]);
  const groupedIssues = useMemo(
    () => (result ? groupValidationsByCategory([...result.errors, ...result.warnings]) : null),
    [result]
  );

  if (loading) {
    return (
      <div className="rounded-[1.7rem] border border-[color:var(--rule)]/75 bg-[linear-gradient(180deg,var(--surface-raised)_0%,var(--surface-secondary)_100%)] p-[var(--space-7)] shadow-[0_18px_38px_rgba(41,29,17,0.05)]">
        <div className="flex items-center gap-[var(--space-4)]">
          <div className="flex h-12 w-12 items-center justify-center rounded-[1.1rem] bg-[color:var(--maroon)]/10 text-[var(--maroon)]">
            <RefreshCw size={20} className="animate-spin" />
          </div>
          <div>
            <p className="type-overline tracking-[0.16em] text-[var(--maroon)]">Captain Check</p>
            <h3 className="mt-[var(--space-2)] font-serif text-[1.7rem] text-[var(--ink)]">
              Checking trip readiness
            </h3>
            <p className="mt-[var(--space-2)] text-sm text-[var(--ink-secondary)]">
              Validating roster, teams, sessions, lineups, and course setup.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!result || !summary || !groupedIssues) {
    return (
      <div className="rounded-[1.7rem] border border-[color:var(--error)]/18 bg-[color:var(--error)]/10 p-[var(--space-7)] shadow-[0_18px_38px_rgba(41,29,17,0.05)]">
        <div className="flex items-start gap-[var(--space-4)]">
          <div className="flex h-12 w-12 items-center justify-center rounded-[1.1rem] bg-[color:var(--error)]/12 text-[var(--error)]">
            <AlertTriangle size={20} />
          </div>
          <div>
            <h3 className="font-serif text-[1.7rem] text-[var(--ink)]">
              Readiness check could not finish
            </h3>
            <p className="mt-[var(--space-2)] text-sm text-[var(--ink-secondary)]">
              Try again. If it still fails, review roster, teams, sessions, lineups, and courses
              manually before play.
            </p>
            <button
              type="button"
              onClick={() => runCheck(true)}
              data-testid="preflight-rerun"
              className="mt-[var(--space-4)] inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--maroon)] px-[var(--space-4)] py-[var(--space-3)] text-sm font-semibold text-[var(--canvas)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)] active:scale-[0.98]"
            >
              <RefreshCw size={16} />
              Run again
            </button>
          </div>
        </div>
      </div>
    );
  }

  const allIssues = [...result.errors, ...result.warnings];

  return (
    <div className="space-y-[var(--space-4)]">
      <section
        className={cn(
          'overflow-hidden rounded-[1.8rem] border p-[var(--space-5)] shadow-[0_18px_38px_rgba(41,29,17,0.05)]',
          result.isReady
            ? 'border-[color:var(--success)]/16 bg-[color:var(--success)]/10'
            : 'border-[color:var(--warning)]/18 bg-[color:var(--warning)]/10'
        )}
      >
        <div className="flex flex-col gap-[var(--space-4)] sm:flex-row sm:items-start sm:justify-between">
          <div className="flex gap-[var(--space-4)]">
            <div
              className={cn(
                'flex h-12 w-12 shrink-0 items-center justify-center rounded-[1.15rem]',
                result.isReady
                  ? 'bg-[color:var(--success)]/12 text-[var(--success)]'
                  : 'bg-[color:var(--warning)]/12 text-[var(--warning)]'
              )}
            >
              {result.isReady ? <Rocket size={22} /> : <AlertTriangle size={22} />}
            </div>
            <div>
              <p className="type-overline tracking-[0.16em] text-[var(--maroon)]">Trip Readiness</p>
              <h3 className="mt-[var(--space-2)] font-serif text-[1.9rem] text-[var(--ink)]">
                {result.isReady ? 'Ready for play' : 'A few items need attention'}
              </h3>
              <p className="mt-[var(--space-2)] text-sm text-[var(--ink-secondary)]">
                {summary.message}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => runCheck(true)}
            data-testid="preflight-rerun"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[color:var(--rule)]/70 bg-[color:var(--surface)]/82 px-[var(--space-4)] py-[var(--space-3)] text-sm font-semibold text-[var(--ink-secondary)] transition-colors hover:text-[var(--ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)] active:scale-[0.98]"
          >
            <RefreshCw size={16} />
            Re-run
          </button>
        </div>

        <div className="mt-[var(--space-5)] grid gap-[var(--space-3)] sm:grid-cols-2 xl:grid-cols-4">
          <ChecklistMetric
            label="Completion"
            value={`${result.completionPercentage}%`}
            detail="Overall readiness"
            tone={result.isReady ? 'green' : 'gold'}
          />
          <ChecklistMetric
            label="Errors"
            value={result.errors.length}
            detail="Must be resolved"
            tone={result.errors.length > 0 ? 'maroon' : 'ink'}
          />
          <ChecklistMetric
            label="Warnings"
            value={result.warnings.length}
            detail="Worth a review"
            tone={result.warnings.length > 0 ? 'gold' : 'ink'}
          />
          <ChecklistMetric
            label="Passed"
            value={result.info.length}
            detail="Checks already cleared"
            tone="green"
          />
        </div>
      </section>

      {allIssues.length > 0 ? (
        <section className="grid gap-[var(--space-4)] xl:grid-cols-2">
          {Object.entries(groupedIssues)
            .filter(([, items]) => items.length > 0)
            .map(([category, items]) => {
              const meta = CATEGORY_META[category as ValidationCategory];
              const blockingCount = items.filter((item) => item.severity === 'error').length;

              return (
                <IssueBoard
                  key={category}
                  title={meta.label}
                  icon={<meta.icon size={18} />}
                  items={items}
                  blockingCount={blockingCount}
                />
              );
            })}
        </section>
      ) : (
        <section className="rounded-[1.7rem] border border-[color:var(--success)]/16 bg-[color:var(--success)]/10 p-[var(--space-6)] shadow-[0_18px_38px_rgba(41,29,17,0.05)]">
          <div className="flex items-start gap-[var(--space-4)]">
            <div className="flex h-12 w-12 items-center justify-center rounded-[1.1rem] bg-[color:var(--success)]/12 text-[var(--success)]">
              <CheckCircle2 size={22} />
            </div>
            <div>
              <p className="type-overline tracking-[0.16em] text-[var(--success)]">All Clear</p>
              <h3 className="mt-[var(--space-2)] font-serif text-[1.8rem] text-[var(--ink)]">
                Nothing is standing in the way.
              </h3>
              <p className="mt-[var(--space-2)] text-sm text-[var(--ink-secondary)]">
                Roster, teams, schedule, and course setup all passed the current checks.
              </p>
            </div>
          </div>
        </section>
      )}

      <section className="rounded-[1.7rem] border border-[color:var(--rule)]/75 bg-[color:var(--surface)]/84 shadow-[0_18px_38px_rgba(41,29,17,0.05)]">
        <button
          type="button"
          onClick={() => setShowPassedChecks((current) => !current)}
          className="flex w-full items-center justify-between px-[var(--space-5)] py-[var(--space-4)] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--focus-ring)]"
        >
          <div>
            <p className="type-overline tracking-[0.15em] text-[var(--ink-tertiary)]">
              Ready Items
            </p>
            <p className="mt-[var(--space-1)] text-sm text-[var(--ink-secondary)]">
              See the parts of the trip that already look sound.
            </p>
          </div>
          {showPassedChecks ? (
            <ChevronUp size={18} className="text-[var(--ink-tertiary)]" />
          ) : (
            <ChevronDown size={18} className="text-[var(--ink-tertiary)]" />
          )}
        </button>

        {showPassedChecks ? (
          <div className="grid gap-3 border-t border-[color:var(--rule)]/70 px-[var(--space-5)] py-[var(--space-4)] md:grid-cols-2">
            {result.info.length > 0 ? (
              result.info.map((item) => (
                <div
                  key={item.id}
                  className="rounded-[1.2rem] border border-[color:var(--success)]/18 bg-[color:var(--success)]/10 p-[var(--space-4)]"
                >
                  <p className="text-sm font-semibold text-[var(--success)]">{item.title}</p>
                  {item.description ? (
                    <p className="mt-[var(--space-2)] text-sm text-[var(--ink-secondary)]">
                      {item.description}
                    </p>
                  ) : null}
                </div>
              ))
            ) : (
              <div className="rounded-[1.2rem] border border-dashed border-[color:var(--rule)]/75 bg-[color:var(--canvas)]/74 p-[var(--space-5)] text-sm text-[var(--ink-secondary)]">
                No cleared items to show yet.
              </div>
            )}
          </div>
        ) : null}
      </section>
    </div>
  );
}

function ChecklistMetric({
  label,
  value,
  detail,
  tone,
}: {
  label: string;
  value: ReactNode;
  detail: string;
  tone: 'ink' | 'gold' | 'green' | 'maroon';
}) {
  const toneClassNames = {
    ink: 'border-[color:var(--rule)]/70 bg-[color:var(--surface)]/80',
    gold: 'border-[color:var(--warning)]/18 bg-[color:var(--warning)]/10',
    green: 'border-[color:var(--success)]/16 bg-[color:var(--success)]/10',
    maroon: 'border-[color:var(--maroon)]/16 bg-[color:var(--maroon)]/10',
  } satisfies Record<'ink' | 'gold' | 'green' | 'maroon', string>;

  return (
    <div className={cn('rounded-[1.3rem] border p-[var(--space-4)]', toneClassNames[tone])}>
      <p className="type-overline tracking-[0.14em] text-[var(--ink-tertiary)]">{label}</p>
      <p className="mt-[var(--space-3)] font-serif text-[1.8rem] leading-none text-[var(--ink)]">
        {value}
      </p>
      <p className="mt-[var(--space-2)] text-sm text-[var(--ink-secondary)]">{detail}</p>
    </div>
  );
}

function IssueBoard({
  title,
  icon,
  items,
  blockingCount,
}: {
  title: string;
  icon: ReactNode;
  items: ValidationItem[];
  blockingCount: number;
}) {
  return (
    <div className="rounded-[1.7rem] border border-[color:var(--rule)]/75 bg-[linear-gradient(180deg,var(--surface-raised)_0%,var(--surface-secondary)_100%)] p-[var(--space-5)] shadow-[0_18px_38px_rgba(41,29,17,0.05)]">
      <div className="flex items-start justify-between gap-[var(--space-3)]">
        <div className="flex items-center gap-[var(--space-3)]">
          <div className="flex h-11 w-11 items-center justify-center rounded-[1rem] bg-[color:var(--maroon)]/10 text-[var(--maroon)]">
            {icon}
          </div>
          <div>
            <p className="type-overline tracking-[0.15em] text-[var(--maroon)]">{title}</p>
            <h4 className="mt-[var(--space-2)] font-serif text-[1.55rem] text-[var(--ink)]">
              {items.length} item{items.length === 1 ? '' : 's'} to review
            </h4>
          </div>
        </div>
        {blockingCount > 0 ? (
          <span className="rounded-full bg-[color:var(--error)]/12 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--error)]">
            {blockingCount} blocking
          </span>
        ) : (
          <span className="rounded-full bg-[color:var(--warning)]/12 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--warning)]">
            review
          </span>
        )}
      </div>

      <div className="mt-[var(--space-4)] space-y-3">
        {items.map((item) => (
          <IssueCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}

function IssueCard({ item }: { item: ValidationItem }) {
  return (
    <div
      className={cn(
        'rounded-[1.2rem] border p-[var(--space-4)]',
        item.severity === 'error'
          ? 'border-[color:var(--error)]/18 bg-[color:var(--error)]/10'
          : 'border-[color:var(--warning)]/18 bg-[color:var(--warning)]/10'
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={cn(
            'rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]',
            item.severity === 'error'
              ? 'bg-[color:var(--error)]/12 text-[var(--error)]'
              : 'bg-[color:var(--warning)]/12 text-[var(--warning)]'
          )}
        >
          {item.severity}
        </span>
        <p className="text-sm font-semibold text-[var(--ink)]">{item.title}</p>
      </div>
      <p className="mt-[var(--space-2)] text-sm leading-6 text-[var(--ink-secondary)]">
        {item.description}
      </p>
      {item.actionLabel && item.actionHref ? (
        <Link
          href={item.actionHref}
          data-action-kind={item.actionKind}
          className="mt-[var(--space-3)] inline-flex min-h-10 items-center rounded-full px-1 text-sm font-semibold text-[var(--maroon)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)]"
        >
          {item.actionLabel}
        </Link>
      ) : null}
    </div>
  );
}

export default PreFlightChecklist;
