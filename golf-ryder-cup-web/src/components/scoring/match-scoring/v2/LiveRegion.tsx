/**
 * LiveRegion — Screen-reader announcement layer for the scoring cockpit.
 *
 * Composes a single politely-assertive ARIA live region that announces:
 *   • Score commits ("Hole 7, USA won, USA 3 up with 11 to play")
 *   • Hole navigation ("Hole 8 of 18, par 4, stroke index 7")
 *   • Save state transitions ("Saved" / "Offline — saved on this device")
 *
 * Hidden visually but read aloud by VoiceOver, TalkBack, NVDA. Replaces
 * a previously-scattered set of `sr-only` p tags.
 *
 * The whole point of this component is to react to external events
 * (a score commit, a hole change, a save-state transition) by setting
 * a string that an aria-live region observes. setState IS the side-
 * effect, gated behind ref-based change detection so it only fires
 * once per real change. The React 19 set-state-in-effect rule treats
 * this as suspect; here it's the canonical correct pattern.
 */
/* eslint-disable react-hooks/set-state-in-effect */

'use client';

import { useEffect, useRef, useState } from 'react';
import type { MatchState } from '@/lib/types/computed';

interface LiveRegionProps {
  matchState: MatchState;
  currentHole: number;
  currentPar: number;
  currentStrokeIndex: number;
  teamAName: string;
  teamBName: string;
  saveState: 'idle' | 'saving' | 'saved' | 'offline';
  totalHoles: number;
}

export function LiveRegion({
  matchState,
  currentHole,
  currentPar,
  currentStrokeIndex,
  teamAName,
  teamBName,
  saveState,
  totalHoles,
}: LiveRegionProps) {
  const [holeMessage, setHoleMessage] = useState('');
  const [scoreMessage, setScoreMessage] = useState('');
  const [saveMessage, setSaveMessage] = useState('');

  const lastSavedHoleNumber = useRef<number | null>(null);
  const lastHoleNavigated = useRef<number | null>(null);
  const lastSaveState = useRef<typeof saveState | null>(null);

  // Score commit detector — runs whenever holeResults length changes,
  // not on every match-state recalculation.
  useEffect(() => {
    const last = matchState.holeResults
      .slice()
      .sort((a, b) => b.holeNumber - a.holeNumber)[0];
    if (!last) return;
    if (lastSavedHoleNumber.current === last.holeNumber) return;
    lastSavedHoleNumber.current = last.holeNumber;

    const winnerLabel =
      last.winner === 'teamA'
        ? `${teamAName} won`
        : last.winner === 'teamB'
          ? `${teamBName} won`
          : last.winner === 'halved'
            ? 'halved'
            : 'cleared';
    const standing =
      matchState.currentScore === 0
        ? 'all square'
        : matchState.currentScore > 0
          ? `${teamAName} ${matchState.currentScore} up`
          : `${teamBName} ${Math.abs(matchState.currentScore)} up`;
    setScoreMessage(
      `Hole ${last.holeNumber}, ${winnerLabel}. Match: ${standing} with ${matchState.holesRemaining} to play.`
    );
  }, [matchState.holeResults, matchState.currentScore, matchState.holesRemaining, teamAName, teamBName]);

  useEffect(() => {
    if (lastHoleNavigated.current === currentHole) return;
    lastHoleNavigated.current = currentHole;
    setHoleMessage(
      `Hole ${currentHole} of ${totalHoles}, par ${currentPar}, stroke index ${currentStrokeIndex}.`
    );
  }, [currentHole, currentPar, currentStrokeIndex, totalHoles]);

  useEffect(() => {
    if (lastSaveState.current === saveState) return;
    lastSaveState.current = saveState;
    if (saveState === 'saved') setSaveMessage('Score saved.');
    else if (saveState === 'offline') setSaveMessage('Saved on this device. Will sync when online.');
    else if (saveState === 'saving') setSaveMessage('Saving score.');
    else setSaveMessage('');
  }, [saveState]);

  return (
    <>
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {scoreMessage}
      </div>
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {holeMessage}
      </div>
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {saveMessage}
      </div>
    </>
  );
}
