/**
 * BatchScoreGrid Component — Phase 2: Captain Empowerment
 *
 * Spreadsheet-style bulk score entry interface:
 * - Grid layout for all matches and holes
 * - Keyboard navigation (arrow keys, tab)
 * - Quick number entry
 * - Visual validation
 * - Batch submit with progress
 * - Auto-save drafts
 *
 * Enables rapid score entry for captains during/after rounds.
 */

'use client';

import { useMemo, useRef } from 'react';

import { useHaptic } from '@/lib/hooks';
import { cn } from '@/lib/utils';

import { BatchScoreGridSections } from './BatchScoreGridSections';
import { getDisplayedHoles } from './batchScoreGridModel';
import type { BatchScoreGridProps } from './batchScoreGridTypes';
import { useBatchScoreGridActions } from './useBatchScoreGridActions';

export type {
  BatchMatch,
  BatchScoreEntry,
  BatchCellLocation,
  BatchCellTeam,
  BatchHoleScore,
  BatchMatchScores,
  BatchScores,
} from './batchScoreGridTypes';

export function BatchScoreGrid({
  matches,
  existingScores = {},
  totalHoles = 18,
  frontNineOnly = false,
  backNineOnly = false,
  onSave,
  onAutoSave,
  className,
}: BatchScoreGridProps) {
  const haptic = useHaptic();
  const containerRef = useRef<HTMLDivElement>(null);

  const holes = useMemo(
    () => getDisplayedHoles(totalHoles, frontNineOnly, backNineOnly),
    [backNineOnly, frontNineOnly, totalHoles]
  );

  const {
    scores,
    dirtyScores,
    errorScores,
    focusedCell,
    isSaving,
    showKeyboardHelp,
    scrollPosition,
    setShowKeyboardHelp,
    handleCellFocus,
    handleCellChange,
    handleCellKeyDown,
    handleSave,
    handleReset,
    handleScrollLeft,
    handleScrollRight,
  } = useBatchScoreGridActions({
    matches,
    existingScores,
    holes,
    onSave,
    onAutoSave,
    haptic,
    containerRef,
  });

  return (
    <div className={cn('space-y-4', className)}>
      <BatchScoreGridSections
        matches={matches}
        holes={holes}
        scores={scores}
        dirtyScores={dirtyScores}
        errorScores={errorScores}
        focusedCell={focusedCell}
        dirtyCount={dirtyScores.size}
        errorCount={errorScores.size}
        isSaving={isSaving}
        showKeyboardHelp={showKeyboardHelp}
        setShowKeyboardHelp={setShowKeyboardHelp}
        scrollPosition={scrollPosition}
        containerRef={containerRef}
        frontNineOnly={frontNineOnly}
        backNineOnly={backNineOnly}
        onCellFocus={handleCellFocus}
        onCellChange={handleCellChange}
        onCellKeyDown={handleCellKeyDown}
        onReset={handleReset}
        onSave={handleSave}
        onScrollLeft={handleScrollLeft}
        onScrollRight={handleScrollRight}
      />
    </div>
  );
}

export default BatchScoreGrid;
