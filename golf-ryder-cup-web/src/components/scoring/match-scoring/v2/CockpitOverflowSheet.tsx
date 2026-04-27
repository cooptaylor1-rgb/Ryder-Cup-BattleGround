/**
 * CockpitOverflowSheet — The "⋮" menu in the cockpit header.
 *
 * Houses everything that's not direct scoring action: voice scoring,
 * scoring method picker, link to scoring preferences, link to the
 * scorecard view, captain "reopen for correction", export, share.
 *
 * v1 had each of these as a separate visible control on the cockpit;
 * pulling them in here gives the cockpit room to breathe.
 */

'use client';

import {
  Eye,
  FileText,
  Hand,
  Mic,
  RotateCcw,
  Settings,
  Share2,
  SlidersHorizontal,
  Swords,
} from 'lucide-react';
import Link from 'next/link';
import { Sheet } from './Sheet';
import { ScoringModeChip, type ScoringMode, type ScoringModeMeta } from '../matchScoringShared';

interface CockpitOverflowSheetProps {
  open: boolean;
  onClose: () => void;

  matchId: string;
  scoringMode: ScoringMode;
  scoringModeMeta: ScoringModeMeta;
  isFourball: boolean;
  isMatchComplete: boolean;
  isCaptainMode: boolean;
  preferredHand: 'left' | 'right';

  onScoringModeChange: (mode: ScoringMode) => void;
  onOpenVoiceScoring: () => void;
  onShareSummary: () => void;
  onExportSummary: () => void;
  onEditScores: () => void;
}

export function CockpitOverflowSheet({
  open,
  onClose,
  matchId,
  scoringMode,
  scoringModeMeta,
  isFourball,
  isMatchComplete,
  isCaptainMode,
  preferredHand,
  onScoringModeChange,
  onOpenVoiceScoring,
  onShareSummary,
  onExportSummary,
  onEditScores,
}: CockpitOverflowSheetProps) {
  const closeAfter = (fn: () => void) => () => {
    fn();
    onClose();
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Match menu"
      description={`${scoringModeMeta.label} · ${preferredHand === 'left' ? 'Left-hand layout' : 'Right-hand layout'}`}
    >
      <div className="space-y-5">
        {/* Scoring method picker — formerly "Scoring method" panel on the cockpit. */}
        <section>
          <p className="type-overline text-[var(--ink-secondary)]">Scoring method</p>
          <p className="mt-1 text-xs text-[var(--ink-tertiary)]">
            {scoringModeMeta.description}
          </p>
          <div
            role="group"
            aria-label="Scoring method"
            className="mt-3 flex flex-wrap gap-2 rounded-2xl border border-[color:var(--rule)] bg-[var(--canvas-sunken)] p-2"
          >
            <ScoringModeChip
              label="Buttons"
              active={scoringMode === 'buttons' || scoringMode === 'swipe'}
              onClick={closeAfter(() =>
                onScoringModeChange(scoringMode === 'buttons' ? 'swipe' : 'buttons')
              )}
            />
            {!isFourball && (
              <ScoringModeChip
                label="Strokes"
                active={scoringMode === 'strokes'}
                onClick={closeAfter(() => onScoringModeChange('strokes'))}
              />
            )}
            {isFourball && (
              <ScoringModeChip
                label="Best Ball"
                active={scoringMode === 'fourball'}
                onClick={closeAfter(() => onScoringModeChange('fourball'))}
              />
            )}
          </div>
          <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-tertiary)]">
            Buttons mode supports both taps and swipe gestures
          </p>
        </section>

        <ActionList>
          <ActionRow
            icon={<Mic size={16} />}
            label="Voice scoring"
            description="Hands-free score entry with confirmation"
            onClick={closeAfter(onOpenVoiceScoring)}
          />
          <ActionRow
            icon={<Eye size={16} />}
            label="View scorecard"
            description="Full 18-hole grid for this match"
            href={`/score/${matchId}/scorecard`}
            onSelect={onClose}
          />
          <ActionRow
            icon={<Swords size={16} />}
            label="Match recap"
            description="Final card, awards, share image"
            href={`/score/${matchId}/recap`}
            onSelect={onClose}
          />
          <ActionRow
            icon={<Hand size={16} />}
            label="One-hand &amp; haptics"
            description="Hand alignment, sounds, gestures"
            href="/score/preferences"
            onSelect={onClose}
          />
          <ActionRow
            icon={<SlidersHorizontal size={16} />}
            label="Scoring preferences"
            description="Auto-advance, confirm closeout, sunlight mode"
            href="/score/preferences"
            onSelect={onClose}
          />
          <ActionRow
            icon={<Share2 size={16} />}
            label="Share summary"
            description="Copy or share match status text"
            onClick={closeAfter(onShareSummary)}
          />
          <ActionRow
            icon={<FileText size={16} />}
            label="Export PDF keepsake"
            description="Printable record of the match"
            onClick={closeAfter(onExportSummary)}
          />
          {isCaptainMode && isMatchComplete && (
            <ActionRow
              icon={<RotateCcw size={16} />}
              label="Reopen for correction"
              description="Captain only — flips status back to in-progress"
              tone="warning"
              onClick={closeAfter(onEditScores)}
            />
          )}
          <ActionRow
            icon={<Settings size={16} />}
            label="App settings"
            description="Theme, sounds, captain PIN"
            href="/settings"
            onSelect={onClose}
          />
        </ActionList>
      </div>
    </Sheet>
  );
}

function ActionList({ children }: { children: React.ReactNode }) {
  return (
    <ul className="overflow-hidden rounded-2xl border border-[color:var(--rule)] bg-[var(--canvas-raised)]">
      {children}
    </ul>
  );
}

interface ActionRowProps {
  icon: React.ReactNode;
  label: string;
  description?: string;
  onClick?: () => void;
  href?: string;
  onSelect?: () => void;
  tone?: 'default' | 'warning';
}

function ActionRow({ icon, label, description, onClick, href, onSelect, tone = 'default' }: ActionRowProps) {
  const tonalClass =
    tone === 'warning'
      ? 'text-[var(--gold-dark)]'
      : 'text-[var(--ink)]';

  const inner = (
    <span className="flex items-center gap-3">
      <span
        className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${tone === 'warning' ? 'bg-[var(--gold-subtle)]' : 'bg-[var(--canvas-sunken)]'}`}
      >
        <span className={tone === 'warning' ? 'text-[var(--gold-dark)]' : 'text-[var(--ink-secondary)]'}>
          {icon}
        </span>
      </span>
      <span className="min-w-0 flex-1">
        <span className={`block text-sm font-semibold ${tonalClass}`}>{label}</span>
        {description && (
          <span className="mt-0.5 block text-xs text-[var(--ink-tertiary)]">{description}</span>
        )}
      </span>
    </span>
  );

  if (href) {
    return (
      <li className="border-b border-[color:var(--rule)]/70 last:border-0">
        <Link
          href={href}
          onClick={onSelect}
          className="block px-4 py-3 transition-colors hover:bg-[var(--canvas-sunken)] focus-visible:bg-[var(--canvas-sunken)] focus-visible:outline-none"
        >
          {inner}
        </Link>
      </li>
    );
  }

  return (
    <li className="border-b border-[color:var(--rule)]/70 last:border-0">
      <button
        type="button"
        onClick={onClick}
        className="block w-full px-4 py-3 text-left transition-colors hover:bg-[var(--canvas-sunken)] focus-visible:bg-[var(--canvas-sunken)] focus-visible:outline-none"
      >
        {inner}
      </button>
    </li>
  );
}
