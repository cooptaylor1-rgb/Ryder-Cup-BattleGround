import { cn } from '@/lib/utils';

export function formatScoreToPar(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  if (value === 0) return 'E';
  return value > 0 ? `+${value}` : `${value}`;
}

export function scoreToParToneClass(value: number | null | undefined): string {
  if (value === null || value === undefined) return 'text-[var(--ink-tertiary)]';
  if (value < 0) return 'text-[var(--success)]';
  if (value === 0) return 'text-[var(--masters)]';
  if (value === 1) return 'text-[var(--warning)]';
  return 'text-[var(--error)]';
}

export function ScoreToParValue({
  value,
  label = 'To par',
  size = 'md',
  align = 'right',
  className,
}: {
  value: number | null | undefined;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  align?: 'left' | 'right';
  className?: string;
}) {
  return (
    <div className={cn('shrink-0', align === 'right' ? 'text-right' : 'text-left', className)}>
      {label ? (
        <p className="text-[10px] font-semibold uppercase leading-none tracking-[0.12em] text-[var(--ink-tertiary)]">
          {label}
        </p>
      ) : null}
      <p
        className={cn(
          'mt-1 font-semibold leading-none tabular-nums',
          size === 'lg' ? 'text-[1.8rem]' : size === 'md' ? 'text-[1.35rem]' : 'text-[1.05rem]',
          scoreToParToneClass(value)
        )}
      >
        {formatScoreToPar(value)}
      </p>
    </div>
  );
}

export function LeaderboardRankPill({
  rank,
  leader = false,
  active = false,
  className,
}: {
  rank?: number;
  leader?: boolean;
  active?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex h-7 min-w-7 shrink-0 items-center justify-center rounded-full border px-2 text-[11px] font-semibold leading-none tabular-nums',
        leader
          ? 'border-[color:var(--gold)]/60 bg-[color:var(--gold)]/14 text-[var(--masters-deep)]'
          : active
            ? 'border-[color:var(--masters)]/35 bg-[var(--masters-subtle)] text-[var(--masters)]'
            : 'border-[var(--rule)] bg-[var(--canvas-raised)] text-[var(--ink-secondary)]',
        className
      )}
      aria-label={rank ? `Rank ${rank}` : 'Unranked'}
    >
      {rank ?? '—'}
    </span>
  );
}

export function ScoreStatCell({
  label,
  value,
  tone,
  muted = false,
  className,
}: {
  label: string;
  value: number | string;
  tone?: string;
  muted?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'min-w-0 rounded-xl border',
        muted
          ? 'border-transparent bg-transparent px-0 py-0'
          : 'border-[var(--rule)] bg-[color:var(--canvas-raised)]/78 px-2.5 py-2',
        className
      )}
    >
      <p className="truncate text-[10px] font-semibold uppercase leading-none tracking-[0.12em] text-[var(--ink-tertiary)]">
        {label}
      </p>
      <p
        className={cn(
          'mt-1 truncate text-[0.98rem] font-semibold leading-none tabular-nums text-[var(--ink)]',
          tone
        )}
      >
        {value}
      </p>
    </div>
  );
}
