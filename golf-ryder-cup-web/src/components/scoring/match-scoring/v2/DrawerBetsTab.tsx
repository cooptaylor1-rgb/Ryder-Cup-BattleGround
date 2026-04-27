/**
 * DrawerBetsTab — Presses + side bets, consolidated.
 *
 * v1 had three components fighting for attention here (PressTracker,
 * MatchInsideGamesPanel, SideBetReminder). They're still all here, but
 * stacked inside the drawer where they don't compete with the score
 * input. Reuses the existing components — no behaviour change.
 */

'use client';

import { PressTracker, type Press } from '@/components/scoring';
import { MatchInsideGamesPanel } from '../MatchInsideGamesPanel';
import { SideBetReminder } from '@/components/live-play';
import type { Match, SideBet } from '@/lib/types/models';
import type { MatchState } from '@/lib/types/computed';
import { toReminderBet } from '../matchScoringUtils';
import type { CockpitTeams } from './types';

interface DrawerBetsTabProps {
  match: Match;
  matchState: MatchState;
  presses: Press[];
  sideBets: SideBet[];
  teams: CockpitTeams;
  currentHole: number;
  currentTripId?: string;
  currentPlayerIdForBets?: string;
  onPress: (pressedBy: 'teamA' | 'teamB') => void;
}

export function DrawerBetsTab({
  match,
  matchState,
  presses,
  sideBets,
  teams,
  currentHole,
  currentTripId,
  currentPlayerIdForBets,
  onPress,
}: DrawerBetsTabProps) {
  const reminderBets = sideBets.filter((b) => b.status === 'active').map(toReminderBet);

  return (
    <div className="space-y-4">
      <h2 className="font-serif text-[length:var(--text-lg)] text-[var(--ink)]">
        Bets &amp; presses
      </h2>

      <PressTracker
        currentHole={currentHole}
        mainMatchScore={matchState.currentScore}
        holesRemaining={matchState.holesRemaining}
        presses={presses}
        onPress={onPress}
        teamAName={teams.teamAName}
        teamBName={teams.teamBName}
        betAmount={10}
        autoPress={false}
      />

      {currentTripId && (
        <MatchInsideGamesPanel
          tripId={currentTripId}
          match={match}
          teamAName={teams.teamAName}
          teamBName={teams.teamBName}
          teamAPlayers={teams.teamAPlayers}
          teamBPlayers={teams.teamBPlayers}
          sideBets={sideBets}
        />
      )}

      <SideBetReminder
        currentHole={currentHole}
        bets={reminderBets}
        currentPlayerId={currentPlayerIdForBets}
      />
    </div>
  );
}
