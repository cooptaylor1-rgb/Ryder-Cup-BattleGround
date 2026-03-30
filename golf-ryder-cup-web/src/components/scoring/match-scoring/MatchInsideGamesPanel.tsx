'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';

import {
  BetComposerModal,
  EmptyBoardPanel,
  PublicBetCard,
} from '@/components/bets/BetsPageSections';
import { getSideBetDefinition, SIDE_BET_DEFINITIONS } from '@/lib/constants/sideBets';
import { db } from '@/lib/db';
import {
  buildCustomSideBet,
  buildNassauSideBet,
  canCreateMatchNassau,
} from '@/lib/services/sideBetBuilders';
import { useUIStore } from '@/lib/stores';
import { useShallow } from 'zustand/shallow';
import type { Match, Player, SideBet, SideBetType } from '@/lib/types/models';
import { cn } from '@/lib/utils';

interface MatchInsideGamesPanelProps {
  tripId: string;
  match: Match;
  teamAName: string;
  teamBName: string;
  teamAPlayers: Player[];
  teamBPlayers: Player[];
  sideBets: SideBet[];
}

export function MatchInsideGamesPanel({
  tripId,
  match,
  teamAName,
  teamBName,
  teamAPlayers,
  teamBPlayers,
  sideBets,
}: MatchInsideGamesPanelProps) {
  const router = useRouter();
  const { showToast } = useUIStore(useShallow(s => ({ showToast: s.showToast })));

  const matchPlayers = useMemo(() => [...teamAPlayers, ...teamBPlayers], [teamAPlayers, teamBPlayers]);
  const [showComposer, setShowComposer] = useState(false);
  const [newBetType, setNewBetType] = useState<SideBetType>('skins');
  const [newBetName, setNewBetName] = useState(getSideBetDefinition('skins').label);
  const [newBetPot, setNewBetPot] = useState(String(getSideBetDefinition('skins').defaultPot));
  const [newBetPerHole, setNewBetPerHole] = useState(
    String(getSideBetDefinition('skins').defaultPerHole ?? 5)
  );
  const [nassauTeamA, setNassauTeamA] = useState<string[]>(teamAPlayers.map((player) => player.id));
  const [nassauTeamB, setNassauTeamB] = useState<string[]>(teamBPlayers.map((player) => player.id));
  const [isSubmitting, setIsSubmitting] = useState(false);

  const playerById = useMemo(
    () => new Map(matchPlayers.map((player) => [player.id, player])),
    [matchPlayers]
  );

  const availableDefinitions = useMemo(
    () =>
      SIDE_BET_DEFINITIONS.filter(
        (definition) => definition.type !== 'nassau' || canCreateMatchNassau(match)
      ),
    [match]
  );

  const openComposer = (type: SideBetType) => {
    const definition = getSideBetDefinition(type);
    setNewBetType(type);
    setNewBetName(definition.label);
    setNewBetPot(String(definition.defaultPot));
    setNewBetPerHole(String(definition.defaultPerHole ?? 5));
    setNassauTeamA(teamAPlayers.map((player) => player.id));
    setNassauTeamB(teamBPlayers.map((player) => player.id));
    setShowComposer(true);
  };

  const closeComposer = () => {
    setShowComposer(false);
    setIsSubmitting(false);
  };

  const handleBetTypeChange = (type: SideBetType) => {
    const definition = getSideBetDefinition(type);
    setNewBetType(type);
    setNewBetName(definition.label);
    setNewBetPot(String(definition.defaultPot));
    setNewBetPerHole(String(definition.defaultPerHole ?? 5));
    if (type === 'nassau') {
      setNassauTeamA(teamAPlayers.map((player) => player.id));
      setNassauTeamB(teamBPlayers.map((player) => player.id));
    }
  };

  const handleNassauPlayerToggle = (team: 'A' | 'B', playerId: string) => {
    if (team === 'A') {
      setNassauTeamA((current) => {
        if (nassauTeamB.includes(playerId)) return current;
        if (current.includes(playerId)) return current.filter((id) => id !== playerId);
        if (current.length >= 2) return current;
        return [...current, playerId];
      });
      return;
    }

    setNassauTeamB((current) => {
      if (nassauTeamA.includes(playerId)) return current;
      if (current.includes(playerId)) return current.filter((id) => id !== playerId);
      if (current.length >= 2) return current;
      return [...current, playerId];
    });
  };

  const handleCreateBet = async () => {
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);

      const newBet =
        newBetType === 'nassau'
          ? buildNassauSideBet({
              tripId,
              name: newBetName,
              pot: parseInt(newBetPot, 10) || getSideBetDefinition('nassau').defaultPot,
              match,
              teamAPlayers: nassauTeamA
                .map((playerId) => playerById.get(playerId))
                .filter(Boolean) as Player[],
              teamBPlayers: nassauTeamB
                .map((playerId) => playerById.get(playerId))
                .filter(Boolean) as Player[],
            })
          : buildCustomSideBet({
              tripId,
              type: newBetType,
              name: newBetName,
              pot: parseInt(newBetPot, 10) || getSideBetDefinition(newBetType).defaultPot,
              perHole:
                newBetType === 'skins'
                  ? parseInt(newBetPerHole, 10) || getSideBetDefinition(newBetType).defaultPerHole
                  : undefined,
              participants: matchPlayers,
              match,
            });

      await db.sideBets.add(newBet);
      showToast('success', `${newBet.name} added to this match`);
      closeComposer();
      router.push(`/bets/${newBet.id}`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to create inside game. Please try again.';
      showToast('error', message);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="rounded-xl border border-[var(--rule)] bg-[var(--surface)]">
      <div className="border-b border-[var(--rule)] px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-medium text-[var(--ink)]">Inside Games</p>
            <p className="mt-1 text-sm text-[var(--ink-secondary)]">
              Start Nassau, skins, or a quick match wager without leaving the card.
            </p>
          </div>
          <button
            type="button"
            onClick={() => openComposer('skins')}
            className="inline-flex items-center gap-2 rounded-full border border-[var(--rule)] bg-[var(--canvas)] px-3 py-2 text-sm font-semibold text-[var(--ink)] transition-transform active:scale-[0.98]"
          >
            <Plus size={16} />
            Add Game
          </button>
        </div>
      </div>

      <div className="space-y-4 p-4">
        <div className="flex flex-wrap gap-2">
          {availableDefinitions.map((definition) => (
            <button
              key={definition.type}
              type="button"
              onClick={() => openComposer(definition.type)}
              className={cn(
                'inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-semibold transition-colors',
                definition.type === 'nassau'
                  ? 'border-[var(--masters)]/20 bg-[var(--masters)]/8 text-[var(--masters)]'
                  : 'border-[var(--rule)] bg-[var(--canvas)] text-[var(--ink-secondary)]'
              )}
            >
              <definition.icon size={15} />
              {definition.label}
            </button>
          ))}
        </div>

        <div className="rounded-[1.15rem] border border-[color:var(--rule)]/70 bg-[color:var(--canvas-sunken)] px-4 py-3">
          <p className="type-overline text-[var(--ink-tertiary)]">Match Scope</p>
          <p className="mt-2 text-sm text-[var(--ink-secondary)]">
            {teamAName}: {teamAPlayers.map((player) => player.firstName).join(' & ')} vs {teamBName}:{' '}
            {teamBPlayers.map((player) => player.firstName).join(' & ')}
          </p>
        </div>

        {sideBets.length === 0 ? (
          <EmptyBoardPanel
            title="No inside games yet"
            body="If this group wants a Nassau or a quick side game on the first tee, start it here and keep it attached to the match."
            actionLabel="Start a match game"
            onAction={() => openComposer('skins')}
          />
        ) : (
          <div className="space-y-3">
            {sideBets.map((bet) => (
              <PublicBetCard
                key={bet.id}
                bet={bet}
                linkedMatch={match}
                getPlayer={(playerId) => playerById.get(playerId)}
                onOpen={() => router.push(`/bets/${bet.id}`)}
              />
            ))}
          </div>
        )}
      </div>

      {showComposer ? (
        <BetComposerModal
          matches={[match]}
          players={matchPlayers}
          selectedMatch={match}
          newBetType={newBetType}
          newBetName={newBetName}
          newBetPot={newBetPot}
          newBetPerHole={newBetPerHole}
          selectedParticipants={matchPlayers.map((player) => player.id)}
          nassauTeamA={nassauTeamA}
          nassauTeamB={nassauTeamB}
          isSubmitting={isSubmitting}
          onClose={closeComposer}
          onBetTypeChange={handleBetTypeChange}
          onNameChange={setNewBetName}
          onPotChange={setNewBetPot}
          onPerHoleChange={setNewBetPerHole}
          onMatchChange={() => {}}
          onParticipantToggle={() => {}}
          onNassauPlayerToggle={handleNassauPlayerToggle}
          onSubmit={() => void handleCreateBet()}
          matchScopeMode="match-only"
        />
      ) : null}
    </div>
  );
}

export default MatchInsideGamesPanel;
