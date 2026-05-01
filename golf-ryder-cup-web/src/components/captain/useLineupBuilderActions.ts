import { useCallback, useEffect, useState } from 'react';

import type { BuilderTeam, MatchSlot, Player, SessionConfig } from './lineupBuilderTypes';

export interface UseLineupBuilderActionsOptions {
  session: SessionConfig;
  initialMatches?: MatchSlot[];
  onSave?: (matches: MatchSlot[]) => void;
  onDeleteMatch?: (matchId: string) => Promise<boolean | void>;
  onAutoFill?: () => MatchSlot[];
  isLocked?: boolean;
}

export interface LineupBuilderActions {
  matches: MatchSlot[];
  draggedPlayer: Player | null;
  showRoster: BuilderTeam | null;
  hasChanges: boolean;
  handleDragStart: (player: Player) => void;
  handleDragEnd: () => void;
  handleDropOnMatch: (matchId: string, team: BuilderTeam) => void;
  handleRemovePlayer: (matchId: string, playerId: string) => void;
  handleDeleteMatch: (matchId: string) => Promise<void>;
  handleAutoFill: () => void;
  handleSave: () => void;
  toggleRoster: (team: BuilderTeam) => void;
}

function buildInitialMatches(session: SessionConfig, initialMatches: MatchSlot[]): MatchSlot[] {
  if (initialMatches.length > 0) {
    return initialMatches;
  }

  return Array.from({ length: session.matchCount }, (_, index) => ({
    id: `match-${index + 1}`,
    teamAPlayers: [],
    teamBPlayers: [],
  }));
}

export function useLineupBuilderActions({
  session,
  initialMatches = [],
  onSave,
  onDeleteMatch,
  onAutoFill,
  isLocked = false,
}: UseLineupBuilderActionsOptions): LineupBuilderActions {
  const [matches, setMatches] = useState<MatchSlot[]>(() => buildInitialMatches(session, initialMatches));
  const [draggedPlayer, setDraggedPlayer] = useState<Player | null>(null);
  const [showRoster, setShowRoster] = useState<BuilderTeam | null>('A');
  const [hasChanges, setHasChanges] = useState(false);

  const handleDragStart = useCallback(
    (player: Player) => {
      if (isLocked) return;
      setDraggedPlayer(player);
    },
    [isLocked]
  );

  const handleDragEnd = useCallback(() => {
    setDraggedPlayer(null);
  }, []);

  // Drive viewport auto-scroll while a drag is in flight. The browser's
  // native drag auto-scroll is unreliable — Chrome/Safari rarely scroll
  // the window unless the cursor is at the literal edge — so a captain
  // dragging into match #3 or #4 (below the fold) had no way to reveal
  // the drop target. We listen for `dragover` on the document, capture
  // the cursor's viewport Y, and pan the window when it gets within an
  // edge band. requestAnimationFrame keeps it smooth; the rAF loop
  // self-cancels when no scroll is needed and on drag end.
  useEffect(() => {
    if (!draggedPlayer || typeof window === 'undefined') return;

    const EDGE_BAND = 96;
    const MAX_SPEED = 18;

    let pointerY = 0;
    let rafId: number | null = null;

    const computeDelta = (): number => {
      const distFromTop = pointerY;
      const distFromBottom = window.innerHeight - pointerY;
      if (distFromTop < EDGE_BAND && distFromTop >= 0) {
        const ratio = 1 - distFromTop / EDGE_BAND;
        return -Math.ceil(MAX_SPEED * ratio);
      }
      if (distFromBottom < EDGE_BAND && distFromBottom >= 0) {
        const ratio = 1 - distFromBottom / EDGE_BAND;
        return Math.ceil(MAX_SPEED * ratio);
      }
      return 0;
    };

    const tick = () => {
      const delta = computeDelta();
      if (delta !== 0) {
        window.scrollBy(0, delta);
        rafId = window.requestAnimationFrame(tick);
      } else {
        rafId = null;
      }
    };

    const handleDragOver = (event: DragEvent) => {
      pointerY = event.clientY;
      if (rafId === null) {
        rafId = window.requestAnimationFrame(tick);
      }
    };

    document.addEventListener('dragover', handleDragOver);
    return () => {
      document.removeEventListener('dragover', handleDragOver);
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
      }
    };
  }, [draggedPlayer]);

  const handleDropOnMatch = useCallback(
    (matchId: string, team: BuilderTeam) => {
      if (!draggedPlayer || isLocked) return;

      setMatches((previous) =>
        previous.map((match) => {
          if (match.id !== matchId) return match;

          const updatedMatch = {
            ...match,
            teamAPlayers: match.teamAPlayers.filter((player) => player.id !== draggedPlayer.id),
            teamBPlayers: match.teamBPlayers.filter((player) => player.id !== draggedPlayer.id),
          };

          const targetPlayers =
            team === 'A' ? updatedMatch.teamAPlayers : updatedMatch.teamBPlayers;

          if (targetPlayers.length < session.playersPerTeam && draggedPlayer.team === team) {
            if (team === 'A') {
              updatedMatch.teamAPlayers = [...updatedMatch.teamAPlayers, draggedPlayer];
            } else {
              updatedMatch.teamBPlayers = [...updatedMatch.teamBPlayers, draggedPlayer];
            }
          }

          return updatedMatch;
        })
      );

      setDraggedPlayer(null);
      setHasChanges(true);
    },
    [draggedPlayer, isLocked, session.playersPerTeam]
  );

  const handleRemovePlayer = useCallback(
    (matchId: string, playerId: string) => {
      if (isLocked) return;

      setMatches((previous) =>
        previous.map((match) => {
          if (match.id !== matchId) return match;
          return {
            ...match,
            teamAPlayers: match.teamAPlayers.filter((player) => player.id !== playerId),
            teamBPlayers: match.teamBPlayers.filter((player) => player.id !== playerId),
          };
        })
      );
      setHasChanges(true);
    },
    [isLocked]
  );

  const handleDeleteMatch = useCallback(
    async (matchId: string) => {
      if (isLocked) return;

      if (onDeleteMatch) {
        const wasDeleted = await onDeleteMatch(matchId);
        if (wasDeleted === false) {
          return;
        }
      }

      setMatches((previous) => previous.filter((match) => match.id !== matchId));
      setHasChanges(true);
    },
    [isLocked, onDeleteMatch]
  );

  const handleAutoFill = useCallback(() => {
    if (isLocked || !onAutoFill) return;
    const suggestedMatches = onAutoFill();
    setMatches(suggestedMatches);
    setHasChanges(true);
  }, [isLocked, onAutoFill]);

  const handleSave = useCallback(() => {
    onSave?.(matches);
    setHasChanges(false);
  }, [matches, onSave]);

  const toggleRoster = useCallback((team: BuilderTeam) => {
    setShowRoster((current) => (current === team ? null : team));
  }, []);

  return {
    matches,
    draggedPlayer,
    showRoster,
    hasChanges,
    handleDragStart,
    handleDragEnd,
    handleDropOnMatch,
    handleRemovePlayer,
    handleDeleteMatch,
    handleAutoFill,
    handleSave,
    toggleRoster,
  };
}
