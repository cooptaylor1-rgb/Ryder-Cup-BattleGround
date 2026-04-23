'use client';

import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';

import type { Player, Team } from '@/lib/types/models';
import { useTripStore } from '@/lib/stores/tripStore';
import { getTeamsWithPlayers, getTeamPlayers } from '@/lib/utils/teamUtils';

/**
 * Memoized selector for "the two teams + their players". The raw
 * tripStore slices (teams, teamMembers, players) are stable across
 * renders, so the useShallow subscription avoids re-renders when
 * unrelated state changes, and the useMemo prevents the derived
 * arrays from getting a new identity on every call — which was
 * the thing that broke React.memo wrappers downstream and forced
 * child components to re-render on every Zustand tick.
 */
export function useTeamsWithPlayers(): {
  teamA: Team | undefined;
  teamB: Team | undefined;
  teamAPlayers: Player[];
  teamBPlayers: Player[];
  unassignedPlayers: Player[];
} {
  const { teams, teamMembers, players } = useTripStore(
    useShallow((state) => ({
      teams: state.teams,
      teamMembers: state.teamMembers,
      players: state.players,
    }))
  );

  return useMemo(
    () => getTeamsWithPlayers(teams, teamMembers, players),
    [teams, teamMembers, players]
  );
}

/**
 * Memoized "players on a single team" selector. Use when you only
 * need one team — otherwise prefer useTeamsWithPlayers which does
 * both in one pass.
 */
export function useTeamPlayers(teamId: string | undefined): Player[] {
  const { teamMembers, players } = useTripStore(
    useShallow((state) => ({
      teamMembers: state.teamMembers,
      players: state.players,
    }))
  );

  return useMemo(() => {
    if (!teamId) return [];
    return getTeamPlayers(teamId, teamMembers, players);
  }, [teamId, teamMembers, players]);
}
