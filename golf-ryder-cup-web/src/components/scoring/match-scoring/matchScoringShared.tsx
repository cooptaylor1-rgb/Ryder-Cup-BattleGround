import { cn } from '@/lib/utils';

export type ScoringMode = 'swipe' | 'buttons' | 'strokes' | 'fourball' | 'oneHanded';

export interface ScoringModeMeta {
  label: string;
  note: string;
  description: string;
}

export function getScoringModeMeta(
  scoringMode: ScoringMode,
  isFourball: boolean
): ScoringModeMeta {
  switch (scoringMode) {
    case 'swipe':
      return {
        label: 'Swipe',
        note: 'Fastest entry',
        description: 'Big gestures for when the group is moving and you need speed.',
      };
    case 'strokes':
      return {
        label: 'Strokes',
        note: 'Gross and net',
        description: 'Capture exact gross scores and let the card sort out the hole.',
      };
    case 'fourball':
      return {
        label: isFourball ? 'Best Ball' : 'Fourball',
        note: 'Player-by-player',
        description: 'Track every player score when the format demands more detail.',
      };
    case 'oneHanded':
      return {
        label: 'One-Hand',
        note: 'Thumb zone',
        description: 'Large targets and thumb-first controls for true on-course use.',
      };
    default:
      return {
        label: 'Buttons',
        note: 'Direct taps',
        description: 'Simple taps and clear winner states without gesture learning.',
      };
  }
}

export function ScoringFactCard({
  eyebrow,
  value,
  note,
}: {
  eyebrow: string;
  value: number | string;
  note: string;
}) {
  return (
    <div className="rounded-[20px] border border-[color:var(--rule)]/75 bg-[color:var(--canvas)]/72 px-3 py-3 text-center">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-tertiary)]">
        {eyebrow}
      </p>
      <p className="mt-1 font-serif text-[length:var(--text-xl)] text-[var(--ink)]">{value}</p>
      <p className="mt-1 text-[11px] text-[var(--ink-secondary)]">{note}</p>
    </div>
  );
}

export function ScoringStatusBadge({
  label,
  tone = 'subtle',
}: {
  label: string;
  tone?: 'masters' | 'muted' | 'subtle';
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em]',
        tone === 'masters'
          ? 'bg-[color:rgba(0,102,68,0.12)] text-[var(--masters)]'
          : tone === 'muted'
            ? 'bg-[color:rgba(26,24,21,0.08)] text-[var(--ink-secondary)]'
            : 'bg-[color:rgba(201,162,39,0.14)] text-[var(--gold)]'
      )}
    >
      {label}
    </span>
  );
}

export function ScoringModeChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-full px-4 py-2 text-sm font-medium transition-colors',
        active
          ? 'bg-[var(--masters)] text-[var(--canvas)] shadow-card-sm'
          : 'bg-transparent text-[var(--ink-tertiary)]'
      )}
    >
      {label}
    </button>
  );
}

export function QuickScoreTile({
  teamName,
  teamColor,
  pending = false,
  onClick,
}: {
  teamName: string;
  teamColor: string;
  pending?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-[24px] border border-dashed px-4 py-5 text-left transition-transform active:scale-[0.98]"
      style={{
        borderColor: teamColor,
        background: `${teamColor}12`,
        color: teamColor,
      }}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.14em]">{teamName}</p>
      <p className="mt-2 text-sm font-semibold">
        {pending ? 'Tap again to confirm' : 'Quick score winner'}
      </p>
      <p className="mt-1 text-xs text-[var(--ink-secondary)]">
        {pending ? 'Armed for immediate scoring.' : 'Two taps keeps accidental entries out.'}
      </p>
    </button>
  );
}
