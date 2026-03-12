/**
 * Lineup Builder Component
 *
 * Drag-and-drop interface for creating match pairings:
 * - Visual roster selection
 * - Match slot creation
 * - Player pairing with handicap display
 * - Fairness scoring feedback
 */

'use client';

import { useCallback } from 'react';

import { LineupBuilderSections } from './LineupBuilderSections';
import { useLineupBuilderModel } from './lineupBuilderModel';
import { useLineupBuilderActions } from './useLineupBuilderActions';
import type { FairnessScore, MatchSlot, Player, SessionConfig } from './lineupBuilderTypes';

export type { FairnessScore, MatchSlot, Player, SessionConfig } from './lineupBuilderTypes';

interface LineupBuilderProps {
  session: SessionConfig;
  teamAPlayers: Player[];
  teamBPlayers: Player[];
  teamALabel?: string;
  teamBLabel?: string;
  initialMatches?: MatchSlot[];
  onSave?: (matches: MatchSlot[]) => void;
  onPublish?: (matches: MatchSlot[]) => void;
  onDeleteMatch?: (matchId: string) => Promise<boolean | void>;
  onAutoFill?: () => MatchSlot[];
  calculateFairness?: (matches: MatchSlot[]) => FairnessScore;
  isLocked?: boolean;
  className?: string;
}

export function LineupBuilder({
  session,
  teamAPlayers,
  teamBPlayers,
  teamALabel = 'Team A',
  teamBLabel = 'Team B',
  initialMatches = [],
  onSave,
  onPublish,
  onDeleteMatch,
  onAutoFill,
  calculateFairness,
  isLocked = false,
  className,
}: LineupBuilderProps) {
  const actions = useLineupBuilderActions({
    session,
    initialMatches,
    onSave,
    onDeleteMatch,
    onAutoFill,
    isLocked,
  });

  const model = useLineupBuilderModel({
    matches: actions.matches,
    teamAPlayers,
    teamBPlayers,
    playersPerTeam: session.playersPerTeam,
    calculateFairness,
  });

  const handlePublish = useCallback(() => {
    if (!model.validation.isValid) return;
    onPublish?.(actions.matches);
  }, [actions.matches, model.validation.isValid, onPublish]);

  return (
    <LineupBuilderSections
      session={session}
      teamALabel={teamALabel}
      teamBLabel={teamBLabel}
      model={model}
      actions={actions}
      isLocked={isLocked}
      className={className}
      canAutoFill={Boolean(onAutoFill)}
      onPublish={handlePublish}
    />
  );
}

export default LineupBuilder;
