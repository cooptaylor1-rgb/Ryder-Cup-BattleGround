import { useCallback, useEffect, useState } from 'react';
import type { MatchState } from '@/lib/types/computed';
import type { Press } from '@/components/scoring';

export function useMatchPressTracking({
  matchState,
  currentHole,
  onPressTriggered,
}: {
  matchState: MatchState | null;
  currentHole: number;
  onPressTriggered: (team: 'teamA' | 'teamB') => void;
}) {
  const [presses, setPresses] = useState<Press[]>([]);

  const handlePress = useCallback(
    (pressedBy: 'teamA' | 'teamB') => {
      if (!matchState) return;

      const newPress: Press = {
        id: `press-${Date.now()}`,
        startHole: currentHole,
        pressedBy,
        status: 'active',
        score: 0,
      };

      setPresses((prev) => [...prev, newPress]);
      onPressTriggered(pressedBy);
    },
    [currentHole, matchState, onPressTriggered]
  );

  useEffect(() => {
    if (!matchState) return;

    const timeoutId = setTimeout(() => {
      setPresses((prev) =>
        prev.map((press) => {
          if (press.status !== 'active') return press;

          const pressHoleResults = matchState.holeResults.filter(
            (result) => result.holeNumber >= press.startHole
          );

          let score = 0;
          for (const result of pressHoleResults) {
            if (result.winner === 'teamA') score += 1;
            else if (result.winner === 'teamB') score -= 1;
          }

          const holesRemaining = 18 - matchState.holesPlayed;
          const isClosedOut = Math.abs(score) > holesRemaining;

          if (isClosedOut || matchState.isClosedOut) {
            return {
              ...press,
              score,
              status: 'closed' as const,
              result: score > 0 ? 'teamA' : score < 0 ? 'teamB' : 'halved',
              closedAtHole: matchState.holesPlayed,
            };
          }

          return { ...press, score };
        })
      );
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [matchState]);

  return {
    presses,
    handlePress,
  };
}
