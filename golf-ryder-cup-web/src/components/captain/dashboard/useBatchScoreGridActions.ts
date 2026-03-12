'use client';

import { useCallback, useEffect, useState, type KeyboardEvent, type RefObject } from 'react';

import { createLogger } from '@/lib/utils/logger';

import {
  buildDirtyEntries,
  createInitialScores,
  getNavigatedCellId,
  parseCellId,
  validateScore,
} from './batchScoreGridModel';
import type { BatchMatch, BatchScores } from './batchScoreGridTypes';

const logger = createLogger('BatchScoreGrid');

interface BatchScoreGridHaptics {
  tap: () => void;
  press: () => void;
  impact: () => void;
  success: () => void;
  error: () => void;
}

interface UseBatchScoreGridActionsParams {
  matches: BatchMatch[];
  existingScores: BatchScores;
  holes: number[];
  onSave: (scores: ReturnType<typeof buildDirtyEntries>) => Promise<void>;
  onAutoSave?: (scores: ReturnType<typeof buildDirtyEntries>) => void;
  haptic: BatchScoreGridHaptics;
  containerRef: RefObject<HTMLDivElement | null>;
}

export function useBatchScoreGridActions({
  matches,
  existingScores,
  holes,
  onSave,
  onAutoSave,
  haptic,
  containerRef,
}: UseBatchScoreGridActionsParams) {
  const [scores, setScores] = useState<BatchScores>(() =>
    createInitialScores(matches, existingScores, holes)
  );
  const [dirtyScores, setDirtyScores] = useState<Set<string>>(new Set());
  const [errorScores, setErrorScores] = useState<Set<string>>(new Set());
  const [focusedCell, setFocusedCell] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
  const [scrollPosition, setScrollPosition] = useState<'front' | 'back'>('front');

  useEffect(() => {
    if (dirtyScores.size === 0 || !onAutoSave) return;

    const timer = setTimeout(() => {
      onAutoSave(buildDirtyEntries(dirtyScores, scores, errorScores));
    }, 2000);

    return () => clearTimeout(timer);
  }, [dirtyScores, errorScores, onAutoSave, scores]);

  const handleCellFocus = useCallback((cellId: string) => {
    setFocusedCell(cellId);
  }, []);

  const handleCellChange = useCallback((cellId: string, value: number | null) => {
    const parsed = parseCellId(cellId);
    if (!parsed) return;

    const { matchId, hole, team } = parsed;
    const validation = validateScore(value);

    setScores((previous) => ({
      ...previous,
      [matchId]: {
        ...previous[matchId],
        [hole]: {
          ...previous[matchId]?.[hole],
          [team === 'A' ? 'teamA' : 'teamB']: value,
        },
      },
    }));

    setDirtyScores((previous) => new Set(previous).add(cellId));

    if (!validation.valid) {
      setErrorScores((previous) => new Set(previous).add(cellId));
      return;
    }

    setErrorScores((previous) => {
      const next = new Set(previous);
      next.delete(cellId);
      return next;
    });
  }, []);

  const handleCellKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>, cellId: string) => {
      const nextCellId = getNavigatedCellId(cellId, event.key, matches, holes);
      if (!nextCellId) return;

      event.preventDefault();
      setFocusedCell(nextCellId);
    },
    [holes, matches]
  );

  const handleSave = useCallback(async () => {
    if (errorScores.size > 0) {
      haptic.error();
      return;
    }

    haptic.impact();
    setIsSaving(true);

    try {
      await onSave(buildDirtyEntries(dirtyScores, scores, errorScores));
      setDirtyScores(new Set());
      haptic.success();
    } catch (error) {
      logger.error('Save failed:', error);
      haptic.error();
    } finally {
      setIsSaving(false);
    }
  }, [dirtyScores, errorScores, haptic, onSave, scores]);

  const handleReset = useCallback(() => {
    haptic.press();
    setScores(createInitialScores(matches, existingScores, holes));
    setDirtyScores(new Set());
    setErrorScores(new Set());
  }, [existingScores, holes, haptic, matches]);

  const handleScrollLeft = useCallback(() => {
    haptic.tap();
    setScrollPosition('front');
    containerRef.current?.scrollTo({ left: 0, behavior: 'smooth' });
  }, [containerRef, haptic]);

  const handleScrollRight = useCallback(() => {
    haptic.tap();
    setScrollPosition('back');
    containerRef.current?.scrollTo({
      left: containerRef.current.scrollWidth,
      behavior: 'smooth',
    });
  }, [containerRef, haptic]);

  return {
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
  };
}
