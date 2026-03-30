'use client';

import { useState, type ReactNode } from 'react';
import {
  autoPickPlayer,
  balanceTeamsByHandicap,
  calculateTeamHandicapTotal,
  createDraftConfig,
  getCurrentPicker,
  type DraftConfig,
  type DraftState,
  initializeDraftState,
  makeDraftPick,
  randomizeTeams,
} from '@/lib/services/draftService';
import { Button } from '@/components/ui/Button';
import { cn, formatPlayerName } from '@/lib/utils';
import { useTripStore } from '@/lib/stores/tripStore';
import { useShallow } from 'zustand/shallow';
import { Player, Team } from '@/lib/types';
import {
  ArrowRight,
  Gavel,
  Pause,
  Play,
  RotateCcw,
  Scale,
  Shuffle,
  User,
  Users,
} from 'lucide-react';

interface DraftBoardProps {
  players: Player[];
  teams: Team[];
  onDraftComplete: (teamAssignments: Map<string, string>) => void;
}

type DraftMode = 'snake' | 'auction' | 'random' | 'balanced';

const teamToneStyles: Record<
  Team['color'],
  {
    panel: string;
    badge: string;
    eyebrow: string;
    icon: string;
  }
> = {
  usa: {
    panel:
      'border-[color:var(--team-usa)]/18 bg-[linear-gradient(180deg,rgba(30,58,95,0.08),rgba(255,255,255,0.96))]',
    badge:
      'border-[color:var(--team-usa)]/18 bg-[color:var(--team-usa)]/10 text-[var(--team-usa)]',
    eyebrow: 'text-[var(--team-usa)]',
    icon: 'text-[var(--team-usa)]',
  },
  europe: {
    panel:
      'border-[color:var(--team-europe)]/18 bg-[linear-gradient(180deg,rgba(114,47,55,0.08),rgba(255,255,255,0.96))]',
    badge:
      'border-[color:var(--team-europe)]/18 bg-[color:var(--team-europe)]/10 text-[var(--team-europe)]',
    eyebrow: 'text-[var(--team-europe)]',
    icon: 'text-[var(--team-europe)]',
  },
};

export function DraftBoard({ players, teams, onDraftComplete }: DraftBoardProps) {
  const { currentTrip } = useTripStore(useShallow(s => ({ currentTrip: s.currentTrip })));
  const [mode, setMode] = useState<DraftMode | null>(null);
  const [config, setConfig] = useState<DraftConfig | null>(null);
  const [draftState, setDraftState] = useState<DraftState | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [currentBid, setCurrentBid] = useState(0);
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);

  const availablePlayers = draftState?.availablePlayers ?? players;
  const currentTeam = draftState
    ? teams.find((team) => team.id === draftState.currentCaptainId) ?? null
    : null;
  const currentPicker = draftState ? getCurrentPicker(draftState) : null;
  const selectedPlayerDetails =
    selectedPlayer ? availablePlayers.find((player) => player.id === selectedPlayer) ?? null : null;
  const currentPickNumber = draftState?.currentPick ?? 0;

  const getTeamPlayers = (teamId: string) => {
    if (!draftState || !config) return [];
    if (teamId === config.draftOrder[0]) return draftState.teamARoster;
    if (teamId === config.draftOrder[1]) return draftState.teamBRoster;
    return [];
  };

  const startDraft = (selectedMode: DraftMode) => {
    setMode(selectedMode);

    if (selectedMode === 'random') {
      const result = randomizeTeams(players);
      const assignments = new Map<string, string>();
      result.teamA.forEach((player) => assignments.set(player.id, teams[0]?.id || 'A'));
      result.teamB.forEach((player) => assignments.set(player.id, teams[1]?.id || 'B'));
      onDraftComplete(assignments);
      return;
    }

    if (selectedMode === 'balanced') {
      const result = balanceTeamsByHandicap(players);
      const assignments = new Map<string, string>();
      result.teamA.forEach((player) => assignments.set(player.id, teams[0]?.id || 'A'));
      result.teamB.forEach((player) => assignments.set(player.id, teams[1]?.id || 'B'));
      onDraftComplete(assignments);
      return;
    }

    const captainIds = teams.map((team) => team.id);
    const tripId = currentTrip?.id || crypto.randomUUID();
    const draftConfig: DraftConfig = {
      ...createDraftConfig(
        tripId,
        selectedMode === 'auction' ? 'auction' : 'snake',
        captainIds,
        players.length,
        selectedMode === 'auction' ? { auctionBudget: 100 } : undefined
      ),
      status: 'in_progress',
    };

    setConfig(draftConfig);
    setDraftState(
      initializeDraftState(draftConfig, players, {
        teamA: teams[0]?.id || 'A',
        teamB: teams[1]?.id || 'B',
      })
    );
    setSelectedPlayer(null);
    setCurrentBid(0);
    setIsPaused(false);
  };

  const handlePick = (playerId: string) => {
    if (!draftState || !config) return;

    const auctionPrice = mode === 'auction' ? currentBid : undefined;
    const { newState } = makeDraftPick(draftState, playerId, auctionPrice);

    setDraftState(newState);
    setSelectedPlayer(null);
    setCurrentBid(0);

    if (newState.picks.length === players.length || newState.availablePlayers.length === 0) {
      const assignments = new Map<string, string>();
      newState.picks.forEach((pick) => {
        assignments.set(pick.playerId, pick.teamId);
      });
      onDraftComplete(assignments);
    }
  };

  const handleAutoPick = () => {
    if (!draftState) return;
    const result = autoPickPlayer(draftState);
    if (result) handlePick(result);
  };

  const resetDraft = () => {
    setMode(null);
    setConfig(null);
    setDraftState(null);
    setSelectedPlayer(null);
    setCurrentBid(0);
    setIsPaused(false);
  };

  if (!mode) {
    return (
      <div className="space-y-[var(--space-5)]">
        <section className="overflow-hidden rounded-[2rem] border border-[var(--rule)] bg-[linear-gradient(180deg,rgba(255,255,255,0.88),rgba(248,244,237,0.97))] shadow-[0_18px_40px_rgba(46,34,18,0.07)]">
          <div className="border-b border-[color:var(--rule)]/80 px-[var(--space-5)] py-[var(--space-5)]">
            <p className="type-overline tracking-[0.16em] text-[var(--ink-tertiary)]">Draft Room</p>
            <h2 className="mt-[var(--space-2)] font-serif text-[clamp(1.9rem,6vw,2.8rem)] italic leading-[1.04] text-[var(--ink)]">
              Choose the room&apos;s tone.
            </h2>
            <p className="mt-[var(--space-3)] type-body-sm text-[var(--ink-secondary)]">
              Some drafts should feel ceremonial. Others should simply get the trip moving. Pick
              the method that fits the group in front of you.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-[var(--space-3)] px-[var(--space-5)] py-[var(--space-5)] md:grid-cols-4">
            <DraftFactCard label="Players" value={players.length} />
            <DraftFactCard label="Teams" value={teams.length} />
            <DraftFactCard label="Fastest Start" value="Random" valueClassName="font-sans text-[1rem] not-italic" />
            <DraftFactCard label="Most Theater" value="Snake" valueClassName="font-sans text-[1rem] not-italic" />
          </div>
        </section>

        <div className="grid gap-[var(--space-4)] md:grid-cols-2">
          <DraftModeCard
            icon={<Users size={22} />}
            eyebrow="Classic"
            title="Snake Draft"
            description="Take turns selecting players and let the order reverse each round."
            detail="Best when the captains want real tension and visible momentum."
            onClick={() => startDraft('snake')}
          />
          <DraftModeCard
            icon={<Gavel size={22} />}
            eyebrow="Loudest"
            title="Auction Draft"
            description="Nominate players and place bids before the roster falls into place."
            detail="Good for bigger groups that want the draft itself to be entertainment."
            onClick={() => startDraft('auction')}
          />
          <DraftModeCard
            icon={<Shuffle size={22} />}
            eyebrow="Fastest"
            title="Random Draw"
            description="Split the room quickly when the ceremony is less important than the start."
            detail="One tap, two teams, and you are on to lineups."
            onClick={() => startDraft('random')}
          />
          <DraftModeCard
            icon={<Scale size={22} />}
            eyebrow="Fairest"
            title="Auto-Balance"
            description="Sort golfers by handicap and spread the talent with some discipline."
            detail="The cleanest way to avoid obvious lopsidedness."
            onClick={() => startDraft('balanced')}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-[var(--space-5)]">
      <section className="overflow-hidden rounded-[2rem] border border-[var(--rule)] bg-[linear-gradient(180deg,rgba(255,255,255,0.88),rgba(248,244,237,0.97))] shadow-[0_18px_40px_rgba(46,34,18,0.07)]">
        <div className="border-b border-[color:var(--rule)]/80 px-[var(--space-5)] py-[var(--space-5)]">
          <div className="flex flex-col gap-[var(--space-4)] sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="type-overline tracking-[0.16em] text-[var(--ink-tertiary)]">
                {mode === 'auction' ? 'Auction in Progress' : 'Draft in Progress'}
              </p>
              <h2 className="mt-[var(--space-2)] font-serif text-[clamp(1.9rem,6vw,2.8rem)] italic leading-[1.04] text-[var(--ink)]">
                {getModeLabel(mode)}
              </h2>
              <p className="mt-[var(--space-3)] type-body-sm text-[var(--ink-secondary)]">
                {currentTeam
                  ? `${currentTeam.name} is on the clock. Keep the room moving and the board legible.`
                  : 'The room is set. Make the next choice cleanly.'}
              </p>
            </div>

            <div className="flex items-center gap-[var(--space-2)]">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setIsPaused((value) => !value)}
                aria-label={isPaused ? 'Resume draft' : 'Pause draft'}
                title={isPaused ? 'Resume draft' : 'Pause draft'}
              >
                {isPaused ? <Play size={18} /> : <Pause size={18} />}
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={resetDraft}
                aria-label="Reset draft"
                title="Reset draft"
              >
                <RotateCcw size={18} />
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-[var(--space-3)] px-[var(--space-5)] py-[var(--space-5)] md:grid-cols-4">
          <DraftFactCard label="Pick" value={`${currentPickNumber} / ${players.length}`} valueClassName="font-sans text-[1rem] not-italic" />
          <DraftFactCard label="Round" value={draftState?.currentRound ?? '—'} />
          <DraftFactCard label="Available" value={availablePlayers.length} />
          <DraftFactCard
            label="Status"
            value={isPaused ? 'Paused' : 'Live'}
            valueClassName="font-sans text-[1rem] not-italic"
          />
        </div>
      </section>

      {currentTeam ? (
        <section
          className={cn(
            'overflow-hidden rounded-[1.8rem] border shadow-[0_16px_34px_rgba(46,34,18,0.06)]',
            teamToneStyles[currentTeam.color].panel
          )}
        >
          <div className="px-[var(--space-5)] py-[var(--space-5)]">
            <div className="flex flex-col gap-[var(--space-4)] sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className={cn('type-overline tracking-[0.16em]', teamToneStyles[currentTeam.color].eyebrow)}>
                  On the Clock
                </p>
                <h3 className="mt-[var(--space-2)] type-display-sm text-[var(--ink)]">
                  {currentTeam.name}
                </h3>
                <p className="mt-[var(--space-2)] type-body-sm text-[var(--ink-secondary)]">
                  {currentPicker
                    ? `Round ${currentPicker.round}, pick ${currentPicker.pickNumber}.`
                    : 'Make the next selection.'}
                </p>
              </div>

              <DraftStatusPill tone={currentTeam.color}>
                {mode === 'auction' ? 'Bidding Window' : 'Selection Window'}
              </DraftStatusPill>
            </div>
          </div>
        </section>
      ) : null}

      {mode === 'auction' && selectedPlayerDetails ? (
        <section className="overflow-hidden rounded-[1.8rem] border border-[color:var(--success)]/20 bg-[linear-gradient(180deg,rgba(45,122,79,0.08),rgba(255,255,255,0.96))] shadow-[0_16px_34px_rgba(46,34,18,0.06)]">
          <div className="border-b border-[color:var(--success)]/14 px-[var(--space-5)] py-[var(--space-5)]">
            <p className="type-overline tracking-[0.16em] text-[var(--success)]">Auction Block</p>
            <h3 className="mt-[var(--space-2)] type-title-lg text-[var(--ink)]">
              {formatPlayerName(selectedPlayerDetails.firstName, selectedPlayerDetails.lastName)}
            </h3>
            <p className="mt-[var(--space-2)] type-body-sm text-[var(--ink-secondary)]">
              Set the number, then award the player when the room settles.
            </p>
          </div>

          <div className="grid gap-[var(--space-4)] px-[var(--space-5)] py-[var(--space-5)] sm:grid-cols-[1fr_auto] sm:items-end">
            <label className="space-y-[var(--space-2)]">
              <span className="type-meta font-semibold text-[var(--ink)]">Winning bid</span>
              <input
                type="number"
                value={currentBid}
                onChange={(event) => setCurrentBid(parseInt(event.target.value, 10) || 0)}
                min={1}
                max={config?.auctionBudget || 100}
                className="input"
              />
            </label>

            <Button
              variant="primary"
              onClick={() => handlePick(selectedPlayerDetails.id)}
              disabled={currentBid < 1 || isPaused}
              className="w-full sm:w-auto"
            >
              Award for ${currentBid || 0}
            </Button>
          </div>
        </section>
      ) : null}

      <div className="grid gap-[var(--space-4)] lg:grid-cols-[1.08fr_0.92fr]">
        <section className="overflow-hidden rounded-[1.8rem] border border-[var(--rule)] bg-[var(--canvas-raised)] shadow-[0_16px_34px_rgba(46,34,18,0.06)]">
          <div className="border-b border-[color:var(--rule)]/80 px-[var(--space-5)] py-[var(--space-5)]">
            <div className="flex items-start justify-between gap-[var(--space-4)]">
              <div>
                <p className="type-overline tracking-[0.16em] text-[var(--ink-tertiary)]">
                  Player Board
                </p>
                <h3 className="mt-[var(--space-2)] type-title-lg text-[var(--ink)]">
                  Available golfers
                </h3>
                <p className="mt-[var(--space-2)] type-body-sm text-[var(--ink-secondary)]">
                  Tap a player to {mode === 'auction' ? 'put them on the block' : 'send them to the active side'}.
                </p>
              </div>

              <DraftStatusPill tone="usa">{availablePlayers.length} Left</DraftStatusPill>
            </div>
          </div>

          <div className="px-[var(--space-3)] py-[var(--space-3)]">
            {availablePlayers.length === 0 ? (
              <div className="rounded-[1.25rem] border border-dashed border-[color:var(--rule)]/75 bg-[var(--canvas)] px-[var(--space-4)] py-[var(--space-6)] text-center">
                <p className="type-title-sm text-[var(--ink)]">The board is clear</p>
                <p className="mt-[var(--space-2)] type-caption">
                  Every available player has been claimed.
                </p>
              </div>
            ) : (
              availablePlayers.map((player, index) => (
                <DraftPlayerButton
                  key={player.id}
                  player={player}
                  isAuction={mode === 'auction'}
                  isSelected={selectedPlayer === player.id}
                  disabled={isPaused}
                  onClick={() => {
                    if (mode === 'auction') {
                      setSelectedPlayer(player.id);
                      setCurrentBid(1);
                    } else {
                      handlePick(player.id);
                    }
                  }}
                  className={index > 0 ? 'mt-[var(--space-2)]' : undefined}
                />
              ))
            )}
          </div>

          <div className="border-t border-[var(--rule)] bg-[var(--canvas-sunken)] px-[var(--space-5)] py-[var(--space-4)]">
            <Button
              variant="secondary"
              onClick={handleAutoPick}
              disabled={isPaused || availablePlayers.length === 0}
              className="w-full justify-center"
            >
              Auto-pick best available
            </Button>
          </div>
        </section>

        <div className="space-y-[var(--space-4)]">
          {teams.map((team) => (
            <DraftTeamPanel
              key={team.id}
              team={team}
              players={getTeamPlayers(team.id)}
              isCurrent={currentTeam?.id === team.id}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function DraftFactCard({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string | number;
  valueClassName?: string;
}) {
  return (
    <div className="rounded-[1.1rem] border border-[var(--rule)] bg-[rgba(255,255,255,0.72)] px-[var(--space-4)] py-[var(--space-4)] shadow-[0_12px_24px_rgba(46,34,18,0.05)]">
      <p className="type-overline text-[var(--ink-tertiary)]">{label}</p>
      <p
        className={cn(
          'mt-[var(--space-2)] font-serif text-[1.7rem] italic leading-none text-[var(--ink)]',
          valueClassName
        )}
      >
        {value}
      </p>
    </div>
  );
}

function DraftModeCard({
  icon,
  eyebrow,
  title,
  description,
  detail,
  onClick,
}: {
  icon: ReactNode;
  eyebrow: string;
  title: string;
  description: string;
  detail: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="card-premium card-interactive w-full p-[var(--space-5)] text-left"
    >
      <div className="flex items-start justify-between gap-[var(--space-4)]">
        <div className="flex h-11 w-11 items-center justify-center rounded-full border border-[color:var(--gold)]/18 bg-[color:var(--gold)]/10 text-[var(--gold-dark)]">
          {icon}
        </div>
        <ArrowRight size={18} className="mt-[var(--space-1)] text-[var(--ink-tertiary)]" />
      </div>
      <p className="mt-[var(--space-5)] type-overline text-[var(--ink-tertiary)]">{eyebrow}</p>
      <h3 className="mt-[var(--space-2)] type-title-lg text-[var(--ink)]">{title}</h3>
      <p className="mt-[var(--space-2)] type-body-sm text-[var(--ink-secondary)]">{description}</p>
      <p className="mt-[var(--space-4)] type-caption">{detail}</p>
    </button>
  );
}

function DraftStatusPill({
  tone,
  children,
}: {
  tone: Team['color'];
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full border px-[var(--space-3)] py-[var(--space-2)]',
        teamToneStyles[tone].badge
      )}
    >
      <span className="type-caption font-semibold">{children}</span>
    </div>
  );
}

function DraftPlayerButton({
  player,
  isAuction,
  isSelected,
  disabled,
  onClick,
  className,
}: {
  player: Player;
  isAuction: boolean;
  isSelected: boolean;
  disabled: boolean;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'w-full rounded-[1.25rem] border px-[var(--space-4)] py-[var(--space-4)] text-left transition-all',
        isSelected
          ? 'border-[color:var(--success)]/30 bg-[color:var(--success)]/10'
          : 'border-[var(--rule)] bg-[var(--canvas)] hover:border-[color:var(--gold)]/22 hover:bg-[var(--canvas-raised)]',
        disabled && 'cursor-not-allowed opacity-50',
        className
      )}
    >
      <div className="flex items-start justify-between gap-[var(--space-3)]">
        <div className="min-w-0">
          <div className="flex items-center gap-[var(--space-2)]">
            <User size={15} className="shrink-0 text-[var(--ink-tertiary)]" />
            <p className="type-title-sm truncate text-[var(--ink)]">
              {formatPlayerName(player.firstName, player.lastName)}
            </p>
          </div>
          <p className="mt-[var(--space-2)] type-caption">
            Handicap {player.handicapIndex?.toFixed(1) ?? '—'}
          </p>
        </div>

        <div className="flex flex-col items-end gap-[var(--space-2)]">
          <span className="inline-flex items-center rounded-full border border-[var(--rule)] bg-[var(--canvas-raised)] px-[var(--space-2)] py-[5px] text-[0.72rem] font-semibold text-[var(--ink-secondary)]">
            HCP {player.handicapIndex?.toFixed(1) ?? '—'}
          </span>
          <span className="type-caption font-semibold text-[var(--ink-secondary)]">
            {isAuction ? 'Bid' : 'Draft'}
          </span>
        </div>
      </div>
    </button>
  );
}

function DraftTeamPanel({
  team,
  players,
  isCurrent,
}: {
  team: Team;
  players: Player[];
  isCurrent: boolean;
}) {
  const tone = teamToneStyles[team.color];
  const totalHandicap = calculateTeamHandicapTotal(players);

  return (
    <section
      className={cn(
        'overflow-hidden rounded-[1.8rem] border shadow-[0_16px_34px_rgba(46,34,18,0.06)]',
        tone.panel,
        isCurrent && 'ring-2 ring-[color:var(--gold)]/22'
      )}
    >
      <div className="border-b border-[color:var(--rule)]/75 px-[var(--space-5)] py-[var(--space-5)]">
        <div className="flex items-start justify-between gap-[var(--space-4)]">
          <div>
            <p className={cn('type-overline tracking-[0.16em]', tone.eyebrow)}>
              {isCurrent ? 'Active Side' : 'Roster'}
            </p>
            <h3 className="mt-[var(--space-2)] type-title-lg text-[var(--ink)]">{team.name}</h3>
          </div>
          <DraftStatusPill tone={team.color}>{players.length} Players</DraftStatusPill>
        </div>

        <div className="mt-[var(--space-4)] grid grid-cols-2 gap-[var(--space-3)]">
          <DraftFactCard
            label="Roster"
            value={players.length}
            valueClassName="font-sans text-[1rem] not-italic"
          />
          <DraftFactCard
            label="Total HCP"
            value={players.length > 0 ? totalHandicap.toFixed(1) : '—'}
            valueClassName="font-sans text-[1rem] not-italic"
          />
        </div>
      </div>

      <div className="px-[var(--space-3)] py-[var(--space-3)]">
        {players.length === 0 ? (
          <div className="rounded-[1.2rem] border border-dashed border-[color:var(--rule)]/75 bg-[rgba(255,255,255,0.58)] px-[var(--space-4)] py-[var(--space-5)] text-center">
            <p className="type-title-sm text-[var(--ink)]">No players yet</p>
            <p className="mt-[var(--space-2)] type-caption">
              The first pick will define the look of this side.
            </p>
          </div>
        ) : (
          players.map((player, index) => (
            <div
              key={player.id}
              className={cn(
                'rounded-[1.15rem] border border-[var(--rule)] bg-[rgba(255,255,255,0.78)] px-[var(--space-4)] py-[var(--space-3)]',
                index > 0 ? 'mt-[var(--space-2)]' : undefined
              )}
            >
              <div className="flex items-center justify-between gap-[var(--space-3)]">
                <p className="type-title-sm truncate text-[var(--ink)]">
                  {formatPlayerName(player.firstName, player.lastName)}
                </p>
                <span className="type-caption font-semibold text-[var(--ink-secondary)]">
                  HCP {player.handicapIndex?.toFixed(1) ?? '—'}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

function getModeLabel(mode: DraftMode) {
  switch (mode) {
    case 'snake':
      return 'Snake Draft';
    case 'auction':
      return 'Auction Draft';
    case 'random':
      return 'Random Draw';
    case 'balanced':
      return 'Auto-Balance';
  }
}

export default DraftBoard;
