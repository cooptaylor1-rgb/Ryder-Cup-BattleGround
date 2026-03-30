'use client';

import { useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Medal, Plus, ScrollText } from 'lucide-react';

import { db } from '@/lib/db';
import { getSuggestedAwards, giveAward, incrementStat, recordStat } from '@/lib/services/tripStatsService';
import { useUIStore } from '@/lib/stores';
import { useShallow } from 'zustand/shallow';
import type { Match, Player } from '@/lib/types/models';
import {
  AWARD_DEFINITIONS,
  STAT_DEFINITIONS,
  type AwardType,
  type PlayerTripStat,
  type TripAward,
  type TripStatType,
} from '@/lib/types/tripStats';
import { cn, formatPlayerName } from '@/lib/utils';

const MATCH_QUICK_STATS: TripStatType[] = [
  'birdies',
  'beers',
  'balls_lost',
  'mulligans',
  'sand_traps',
  'water_hazards',
  'chip_ins',
  'excuses_made',
];

const DEFAULT_AWARD: AwardType = 'clutch_player';

interface MatchTripMomentsPanelProps {
  tripId: string;
  match: Match;
  players: Player[];
  recordedByPlayerId?: string;
}

export function MatchTripMomentsPanel({
  tripId,
  match,
  players,
  recordedByPlayerId,
}: MatchTripMomentsPanelProps) {
  const { showToast } = useUIStore(useShallow(s => ({ showToast: s.showToast })));
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(
    recordedByPlayerId && players.some((player) => player.id === recordedByPlayerId)
      ? recordedByPlayerId
      : players[0]?.id ?? null
  );
  const [selectedStatType, setSelectedStatType] = useState<TripStatType>('birdies');
  const [statValue, setStatValue] = useState('1');
  const [selectedAwardType, setSelectedAwardType] = useState<AwardType>(DEFAULT_AWARD);
  const [selectedAwardWinnerId, setSelectedAwardWinnerId] = useState<string | null>(
    recordedByPlayerId && players.some((player) => player.id === recordedByPlayerId)
      ? recordedByPlayerId
      : players[0]?.id ?? null
  );
  const [isSavingStat, setIsSavingStat] = useState(false);
  const [isSavingAward, setIsSavingAward] = useState(false);

  useEffect(() => {
    if (!selectedPlayerId && players[0]?.id) {
      setSelectedPlayerId(players[0].id);
    }

    if (!selectedAwardWinnerId && players[0]?.id) {
      setSelectedAwardWinnerId(players[0].id);
    }
  }, [players, selectedAwardWinnerId, selectedPlayerId]);

  const playerById = useMemo(() => new Map(players.map((player) => [player.id, player])), [players]);

  const recentSessionStats = useLiveQuery(
    async (): Promise<PlayerTripStat[]> => {
      const stats = await db.tripStats.where('tripId').equals(tripId).toArray();
      return stats
        .filter(
          (stat) => stat.sessionId === match.sessionId && players.some((player) => player.id === stat.playerId)
        )
        .sort((left, right) => right.timestamp.localeCompare(left.timestamp))
        .slice(0, 4);
    },
    [tripId, match.sessionId, players.map((player) => player.id).join('|')],
    []
  );

  const tripAwards = useLiveQuery(
    (): Promise<TripAward[]> => db.tripAwards.where('tripId').equals(tripId).toArray(),
    [tripId],
    []
  );

  const awardSuggestions = useLiveQuery(
    (): Promise<Map<AwardType, string>> => getSuggestedAwards(tripId),
    [tripId],
    new Map<AwardType, string>()
  );

  const selectedAward = tripAwards.find((award) => award.awardType === selectedAwardType);
  const currentAwardWinner = selectedAward ? playerById.get(selectedAward.winnerId) : undefined;
  const suggestedWinnerId = awardSuggestions.get(selectedAwardType);
  const suggestedWinner = suggestedWinnerId ? playerById.get(suggestedWinnerId) : undefined;
  const selectedWinner = selectedAwardWinnerId ? playerById.get(selectedAwardWinnerId) : undefined;

  const statOptions = useMemo(
    () =>
      Object.values(STAT_DEFINITIONS).sort((left, right) => left.label.localeCompare(right.label)),
    []
  );

  const awardOptions = useMemo(
    () =>
      Object.values(AWARD_DEFINITIONS).sort((left, right) => left.label.localeCompare(right.label)),
    []
  );

  const handleQuickTrack = async (statType: TripStatType) => {
    if (!selectedPlayerId || isSavingStat) return;

    const definition = STAT_DEFINITIONS[statType];

    try {
      setIsSavingStat(true);
      await incrementStat({
        tripId,
        playerId: selectedPlayerId,
        statType,
        amount: 1,
        sessionId: match.sessionId,
        recordedBy: recordedByPlayerId,
      });

      const player = playerById.get(selectedPlayerId);
      showToast('success', `${player?.firstName ?? 'Player'} +1 ${definition.label.toLowerCase()}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to log the stat.';
      showToast('error', message);
    } finally {
      setIsSavingStat(false);
    }
  };

  const handleCustomStat = async () => {
    if (!selectedPlayerId || isSavingStat) return;

    const value = Number.parseFloat(statValue);
    if (!Number.isFinite(value) || value <= 0) {
      showToast('warning', 'Enter a number greater than zero.');
      return;
    }

    const definition = STAT_DEFINITIONS[selectedStatType];

    try {
      setIsSavingStat(true);

      if (definition.unit === 'count') {
        await incrementStat({
          tripId,
          playerId: selectedPlayerId,
          statType: selectedStatType,
          amount: value,
          sessionId: match.sessionId,
          recordedBy: recordedByPlayerId,
        });
      } else {
        await recordStat({
          tripId,
          playerId: selectedPlayerId,
          statType: selectedStatType,
          value,
          sessionId: match.sessionId,
          recordedBy: recordedByPlayerId,
        });
      }

      const player = playerById.get(selectedPlayerId);
      showToast(
        'success',
        `${player?.firstName ?? 'Player'} logged ${value} ${definition.label.toLowerCase()}`
      );
      setStatValue(definition.unit === 'count' ? '1' : '');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save the stat.';
      showToast('error', message);
    } finally {
      setIsSavingStat(false);
    }
  };

  const handleAwardSave = async () => {
    if (!selectedAwardWinnerId || isSavingAward) return;

    try {
      setIsSavingAward(true);
      await giveAward({
        tripId,
        awardType: selectedAwardType,
        winnerId: selectedAwardWinnerId,
        nominatedBy: recordedByPlayerId,
      });

      const player = playerById.get(selectedAwardWinnerId);
      showToast(
        'success',
        `${AWARD_DEFINITIONS[selectedAwardType].label} set to ${player?.firstName ?? 'player'}`
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save the award.';
      showToast('error', message);
    } finally {
      setIsSavingAward(false);
    }
  };

  return (
    <div className="rounded-xl border border-[var(--rule)] bg-[var(--surface)]">
      <div className="border-b border-[var(--rule)] px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-medium text-[var(--ink)]">Trip Stats & Awards</p>
            <p className="mt-1 text-sm text-[var(--ink-secondary)]">
              Log the match-side stories now, while the group still remembers them.
            </p>
          </div>
          <div className="rounded-full border border-[var(--rule)] bg-[var(--canvas)] px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--ink-secondary)]">
            Match {match.matchOrder}
          </div>
        </div>
      </div>

      <div className="space-y-4 p-4">
        <div className="rounded-[1.15rem] border border-[color:var(--rule)]/70 bg-[color:var(--canvas-sunken)] px-4 py-3">
          <p className="type-overline text-[var(--ink-tertiary)]">Who are you logging?</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {players.map((player) => (
              <button
                key={player.id}
                type="button"
                onClick={() => setSelectedPlayerId(player.id)}
                className={cn(
                  'rounded-full border px-3 py-2 text-sm font-medium transition-colors',
                  selectedPlayerId === player.id
                    ? 'border-[var(--masters)]/20 bg-[var(--masters)]/10 text-[var(--masters)]'
                    : 'border-[var(--rule)] bg-[var(--canvas)] text-[var(--ink-secondary)]'
                )}
              >
                {player.firstName}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-[1.15rem] border border-[color:var(--rule)]/70 bg-[color:var(--canvas-sunken)] px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="type-overline text-[var(--ink-tertiary)]">Quick track</p>
              <p className="mt-1 text-sm text-[var(--ink-secondary)]">
                One-tap counters for the moments that pile up during a round.
              </p>
            </div>
            <ScrollText size={16} className="text-[var(--masters)]" />
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {MATCH_QUICK_STATS.map((statType) => {
              const definition = STAT_DEFINITIONS[statType];
              return (
                <button
                  key={statType}
                  type="button"
                  disabled={!selectedPlayerId || isSavingStat}
                  onClick={() => void handleQuickTrack(statType)}
                  className="rounded-full border border-[var(--rule)] bg-[var(--canvas)] px-3 py-2 text-sm font-medium text-[var(--ink)] transition-transform active:scale-[0.98] disabled:opacity-40"
                >
                  {definition.emoji} {definition.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-[1.15rem] border border-[color:var(--rule)]/70 bg-[color:var(--canvas-sunken)] px-4 py-3">
          <p className="type-overline text-[var(--ink-tertiary)]">Custom stat</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_7rem_auto]">
            <select
              value={selectedStatType}
              onChange={(event) => {
                const nextType = event.target.value as TripStatType;
                setSelectedStatType(nextType);
                setStatValue(STAT_DEFINITIONS[nextType].unit === 'count' ? '1' : '');
              }}
              className="rounded-[1rem] border border-[var(--rule)] bg-[var(--canvas)] px-3 py-3 text-sm text-[var(--ink)]"
            >
              {statOptions.map((definition) => (
                <option key={definition.type} value={definition.type}>
                  {definition.label}
                </option>
              ))}
            </select>

            <input
              type="number"
              min="0"
              step="0.1"
              value={statValue}
              onChange={(event) => setStatValue(event.target.value)}
              className="rounded-[1rem] border border-[var(--rule)] bg-[var(--canvas)] px-3 py-3 text-sm text-[var(--ink)]"
              placeholder={STAT_DEFINITIONS[selectedStatType].unit}
            />

            <button
              type="button"
              disabled={!selectedPlayerId || isSavingStat}
              onClick={() => void handleCustomStat()}
              className="rounded-[1rem] bg-[var(--masters)] px-4 py-3 text-sm font-semibold text-[var(--canvas)] transition-transform active:scale-[0.98] disabled:opacity-40"
            >
              Add
            </button>
          </div>
          <p className="mt-2 text-xs text-[var(--ink-tertiary)]">
            Use this for distance, dollars, minutes, or anything outside the quick buttons.
          </p>
        </div>

        <div className="rounded-[1.15rem] border border-[color:var(--rule)]/70 bg-[color:var(--canvas-sunken)] px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="type-overline text-[var(--ink-tertiary)]">Awards board</p>
              <p className="mt-1 text-sm text-[var(--ink-secondary)]">
                Mark the superlatives while the group is still living them.
              </p>
            </div>
            <Medal size={16} className="text-[var(--gold-dark)]" />
          </div>

          <div className="mt-3 grid gap-3">
            <select
              value={selectedAwardType}
              onChange={(event) => setSelectedAwardType(event.target.value as AwardType)}
              className="rounded-[1rem] border border-[var(--rule)] bg-[var(--canvas)] px-3 py-3 text-sm text-[var(--ink)]"
            >
              {awardOptions.map((award) => (
                <option key={award.type} value={award.type}>
                  {award.label}
                </option>
              ))}
            </select>

            <div className="flex flex-wrap gap-2">
              {players.map((player) => (
                <button
                  key={player.id}
                  type="button"
                  onClick={() => setSelectedAwardWinnerId(player.id)}
                  className={cn(
                    'rounded-full border px-3 py-2 text-sm font-medium transition-colors',
                    selectedAwardWinnerId === player.id
                      ? 'border-[var(--gold)]/25 bg-[var(--gold-subtle)] text-[var(--gold-dark)]'
                      : 'border-[var(--rule)] bg-[var(--canvas)] text-[var(--ink-secondary)]'
                  )}
                >
                  {player.firstName}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-[1rem] border border-[var(--rule)] bg-[var(--canvas)] px-3 py-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[var(--ink)]">
                  {AWARD_DEFINITIONS[selectedAwardType].emoji} {AWARD_DEFINITIONS[selectedAwardType].label}
                </p>
                <p className="mt-1 text-xs text-[var(--ink-secondary)]">
                  {currentAwardWinner
                    ? `Currently assigned to ${formatPlayerName(
                        currentAwardWinner.firstName,
                        currentAwardWinner.lastName,
                        'short'
                      )}.`
                    : selectedWinner
                      ? `Ready to assign to ${formatPlayerName(
                          selectedWinner.firstName,
                          selectedWinner.lastName,
                          'short'
                        )}.`
                      : suggestedWinner
                        ? `Suggested winner: ${formatPlayerName(
                            suggestedWinner.firstName,
                            suggestedWinner.lastName,
                            'short'
                          )}.`
                        : 'No winner assigned yet.'}
                </p>
              </div>

              <button
                type="button"
                disabled={!selectedAwardWinnerId || isSavingAward}
                onClick={() => void handleAwardSave()}
                className="inline-flex items-center gap-2 rounded-full bg-[var(--gold)] px-4 py-2 text-sm font-semibold text-[var(--ink)] transition-transform active:scale-[0.98] disabled:opacity-40"
              >
                <Plus size={14} />
                Save award
              </button>
            </div>
          </div>
        </div>

        {recentSessionStats.length > 0 ? (
          <div className="rounded-[1.15rem] border border-[color:var(--rule)]/70 bg-[color:var(--canvas-sunken)] px-4 py-3">
            <p className="type-overline text-[var(--ink-tertiary)]">Recent ledger</p>
            <div className="mt-3 space-y-2">
              {recentSessionStats.map((stat) => {
                const player = playerById.get(stat.playerId);
                const definition = STAT_DEFINITIONS[stat.statType];
                return (
                  <div
                    key={stat.id}
                    className="flex items-center justify-between rounded-[0.95rem] border border-[var(--rule)] bg-[var(--canvas)] px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-[var(--ink)]">
                        {player
                          ? formatPlayerName(player.firstName, player.lastName, 'short')
                          : 'Player'}
                      </p>
                      <p className="text-xs text-[var(--ink-secondary)]">
                        {definition.emoji} {definition.label}
                      </p>
                    </div>
                    <span className="font-serif text-[1.1rem] italic text-[var(--ink)]">
                      +{stat.value}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
