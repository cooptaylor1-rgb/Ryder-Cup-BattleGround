'use client';

import type { KeyboardEvent, RefObject } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Grid3X3,
  Keyboard,
  RefreshCw,
  RotateCcw,
  Upload,
} from 'lucide-react';

import { cn } from '@/lib/utils';

import { BatchScoreGridRow } from './BatchScoreGridRow';
import type { BatchMatch, BatchScores } from './batchScoreGridTypes';

interface BatchScoreGridSectionsProps {
  matches: BatchMatch[];
  holes: number[];
  scores: BatchScores;
  dirtyScores: Set<string>;
  errorScores: Set<string>;
  focusedCell: string | null;
  dirtyCount: number;
  errorCount: number;
  isSaving: boolean;
  showKeyboardHelp: boolean;
  setShowKeyboardHelp: (value: boolean) => void;
  scrollPosition: 'front' | 'back';
  containerRef: RefObject<HTMLDivElement | null>;
  frontNineOnly: boolean;
  backNineOnly: boolean;
  onCellFocus: (cellId: string) => void;
  onCellChange: (cellId: string, value: number | null) => void;
  onCellKeyDown: (event: KeyboardEvent<HTMLInputElement>, cellId: string) => void;
  onReset: () => void;
  onSave: () => void;
  onScrollLeft: () => void;
  onScrollRight: () => void;
}

export function BatchScoreGridSections({
  matches,
  holes,
  scores,
  dirtyScores,
  errorScores,
  focusedCell,
  dirtyCount,
  errorCount,
  isSaving,
  showKeyboardHelp,
  setShowKeyboardHelp,
  scrollPosition,
  containerRef,
  frontNineOnly,
  backNineOnly,
  onCellFocus,
  onCellChange,
  onCellKeyDown,
  onReset,
  onSave,
  onScrollLeft,
  onScrollRight,
}: BatchScoreGridSectionsProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Grid3X3 size={20} style={{ color: 'var(--masters)' }} />
          <h2 className="text-xl font-bold" style={{ color: 'var(--ink)' }}>
            Batch Score Entry
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowKeyboardHelp(!showKeyboardHelp)}
            className="rounded-lg p-2"
            style={{ background: 'var(--surface)' }}
          >
            <Keyboard size={18} style={{ color: 'var(--ink-secondary)' }} />
          </button>

          <button
            onClick={onReset}
            disabled={dirtyCount === 0}
            className={cn('rounded-lg p-2', dirtyCount === 0 && 'opacity-50')}
            style={{ background: 'var(--surface)' }}
          >
            <RotateCcw size={18} style={{ color: 'var(--ink-secondary)' }} />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showKeyboardHelp ? (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div
              className="grid grid-cols-2 gap-2 rounded-lg p-3 text-xs"
              style={{ background: 'var(--surface)' }}
            >
              <div className="flex items-center gap-2">
                <kbd className="rounded px-1.5 py-0.5" style={{ background: 'var(--rule)' }}>
                  ←→
                </kbd>
                <span style={{ color: 'var(--ink-secondary)' }}>Move between cells</span>
              </div>
              <div className="flex items-center gap-2">
                <kbd className="rounded px-1.5 py-0.5" style={{ background: 'var(--rule)' }}>
                  ↑↓
                </kbd>
                <span style={{ color: 'var(--ink-secondary)' }}>Move between teams/matches</span>
              </div>
              <div className="flex items-center gap-2">
                <kbd className="rounded px-1.5 py-0.5" style={{ background: 'var(--rule)' }}>
                  Tab
                </kbd>
                <span style={{ color: 'var(--ink-secondary)' }}>Next cell</span>
              </div>
              <div className="flex items-center gap-2">
                <kbd className="rounded px-1.5 py-0.5" style={{ background: 'var(--rule)' }}>
                  Enter
                </kbd>
                <span style={{ color: 'var(--ink-secondary)' }}>Next match</span>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div className="flex items-center justify-between rounded-lg bg-[var(--surface)] p-3">
        <div className="flex items-center gap-4">
          {dirtyCount > 0 ? (
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full bg-[color:var(--warning)]" />
              <span className="text-xs text-[var(--ink-secondary)]">{dirtyCount} unsaved</span>
            </div>
          ) : null}
          {errorCount > 0 ? (
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="h-3 w-3 text-[var(--error)]" />
              <span className="text-xs text-[var(--error)]">{errorCount} errors</span>
            </div>
          ) : null}
          {dirtyCount === 0 && errorCount === 0 ? (
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3 w-3 text-[var(--success)]" />
              <span className="text-xs text-[var(--success)]">All saved</span>
            </div>
          ) : null}
        </div>

        {!frontNineOnly && !backNineOnly ? (
          <div className="flex items-center gap-1 md:hidden">
            <button
              onClick={onScrollLeft}
              className={cn('rounded p-1.5', scrollPosition === 'front' && 'bg-[var(--surface-secondary)]')}
            >
              <ChevronLeft className="h-4 w-4 text-[var(--ink-secondary)]" />
            </button>
            <span className="text-xs text-[var(--ink-tertiary)]">
              {scrollPosition === 'front' ? 'Front 9' : 'Back 9'}
            </span>
            <button
              onClick={onScrollRight}
              className={cn('rounded p-1.5', scrollPosition === 'back' && 'bg-[var(--surface-secondary)]')}
            >
              <ChevronRight className="h-4 w-4 text-[var(--ink-secondary)]" />
            </button>
          </div>
        ) : null}
      </div>

      <div ref={containerRef} className="overflow-x-auto rounded-xl border border-[var(--rule)]">
        <div
          className="sticky top-0 z-10 flex border-b"
          style={{ borderColor: 'var(--rule)', background: 'var(--bg)' }}
        >
          <div className="w-32 shrink-0 border-r p-2" style={{ borderColor: 'var(--rule)' }}>
            <span className="text-xs font-semibold" style={{ color: 'var(--ink-secondary)' }}>
              Match
            </span>
          </div>
          {holes.map((hole) => (
            <div
              key={hole}
              className="shrink-0 border-r p-2 text-center"
              style={{ borderColor: 'var(--rule)', minWidth: '48px' }}
            >
              <span className="text-xs font-bold" style={{ color: 'var(--ink-secondary)' }}>
                {hole}
              </span>
            </div>
          ))}
          <div className="w-16 shrink-0 border-l p-2 text-center" style={{ borderColor: 'var(--rule)' }}>
            <span className="text-xs font-semibold" style={{ color: 'var(--ink-secondary)' }}>
              Status
            </span>
          </div>
        </div>

        {matches.map((match) => (
          <BatchScoreGridRow
            key={match.id}
            match={match}
            holes={holes}
            scores={scores[match.id] || {}}
            dirtyScores={dirtyScores}
            errorScores={errorScores}
            focusedCell={focusedCell}
            onCellFocus={onCellFocus}
            onCellChange={onCellChange}
            onCellKeyDown={onCellKeyDown}
          />
        ))}
      </div>

      <motion.button
        onClick={onSave}
        disabled={dirtyCount === 0 || errorCount > 0 || isSaving}
        className={cn(
          'flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--masters)] py-3 font-semibold text-[var(--canvas)]',
          (dirtyCount === 0 || errorCount > 0 || isSaving) && 'cursor-not-allowed opacity-50'
        )}
        whileTap={{ scale: 0.98 }}
      >
        {isSaving ? (
          <>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            >
              <RefreshCw size={18} />
            </motion.div>
            Saving {dirtyCount} scores...
          </>
        ) : (
          <>
            <Upload size={18} />
            Save {dirtyCount} Scores
          </>
        )}
      </motion.button>

      {errorCount > 0 ? (
        <div className="flex items-center gap-2 rounded-lg bg-[color:var(--error)]/10 p-3 text-sm text-[var(--error)]">
          <AlertTriangle className="h-4 w-4" />
          Please fix {errorCount} error{errorCount !== 1 ? 's' : ''} before saving
        </div>
      ) : null}
    </div>
  );
}
