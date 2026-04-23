'use client';

import { useCallback, useMemo, useState } from 'react';
import { Plus, Save, Trash2, Users } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { cn, formatPlayerName } from '@/lib/utils';
import type { Player, RyderCupSession } from '@/lib/types/models';
import type { PracticeGroupDraft } from '@/lib/services/lineup-builder/practiceLineupPersistence';

interface PracticeGroupsEditorProps {
  session: RyderCupSession;
  roster: Player[];
  initialGroups: PracticeGroupDraft[];
  onPublish: (groups: PracticeGroupDraft[]) => Promise<void> | void;
  onSaveDraft?: (groups: PracticeGroupDraft[]) => Promise<void> | void;
  isPublishing?: boolean;
}

const MAX_GROUP_SIZE = 4;

function createEmptyGroup(groupNumber: number): PracticeGroupDraft {
  return {
    localId: typeof crypto !== 'undefined' ? crypto.randomUUID() : `group-${groupNumber}`,
    groupNumber,
    playerIds: [],
    teeTime: '',
  };
}

/**
 * Practice-round pairing editor. Simpler than the Ryder Cup lineup
 * builder — there are no teams to split players across, no handicap
 * fairness scoring, no match format toggles; just "who plays with whom,
 * at what tee time." Publish persists each group as a Match row with
 * mode='practice'.
 */
export function PracticeGroupsEditor({
  session,
  roster,
  initialGroups,
  onPublish,
  onSaveDraft,
  isPublishing = false,
}: PracticeGroupsEditorProps) {
  const [groups, setGroups] = useState<PracticeGroupDraft[]>(() =>
    initialGroups.length > 0 ? initialGroups : [createEmptyGroup(1)]
  );

  const playerById = useMemo(() => new Map(roster.map((p) => [p.id, p])), [roster]);

  // Players that aren't in any group yet — the pool the captain picks
  // from when adding a player. Sorting surfaces an obvious, alphabetical
  // default without needing a fancier filter control.
  const availablePlayers = useMemo(() => {
    const taken = new Set<string>();
    for (const group of groups) {
      for (const id of group.playerIds) taken.add(id);
    }
    return roster
      .filter((p) => !taken.has(p.id))
      .sort((a, b) => formatPlayerName(a.firstName, a.lastName).localeCompare(
        formatPlayerName(b.firstName, b.lastName)
      ));
  }, [roster, groups]);

  const renumber = (list: PracticeGroupDraft[]): PracticeGroupDraft[] =>
    list.map((group, index) => ({ ...group, groupNumber: index + 1 }));

  const addGroup = useCallback(() => {
    setGroups((current) => renumber([...current, createEmptyGroup(current.length + 1)]));
  }, []);

  const removeGroup = useCallback((localId: string) => {
    setGroups((current) => {
      const next = current.filter((g) => g.localId !== localId);
      return next.length > 0 ? renumber(next) : [createEmptyGroup(1)];
    });
  }, []);

  const addPlayer = useCallback((localId: string, playerId: string) => {
    setGroups((current) =>
      current.map((g) =>
        g.localId === localId && g.playerIds.length < MAX_GROUP_SIZE
          ? { ...g, playerIds: [...g.playerIds, playerId] }
          : g
      )
    );
  }, []);

  const removePlayer = useCallback((localId: string, playerId: string) => {
    setGroups((current) =>
      current.map((g) =>
        g.localId === localId
          ? { ...g, playerIds: g.playerIds.filter((id) => id !== playerId) }
          : g
      )
    );
  }, []);

  const setTeeTime = useCallback((localId: string, value: string) => {
    setGroups((current) =>
      current.map((g) => (g.localId === localId ? { ...g, teeTime: value } : g))
    );
  }, []);

  const publishableGroups = groups.filter((g) => g.playerIds.length >= 2);
  const canPublish = publishableGroups.length > 0 && !isPublishing;

  return (
    <section className="space-y-[var(--space-4)]">
      <div className="rounded-[1.5rem] border border-[color:var(--rule)]/75 bg-[color:var(--canvas-raised)] p-[var(--space-5)] shadow-[0_14px_28px_rgba(46,34,18,0.06)]">
        <p className="type-overline tracking-[0.16em] text-[var(--ink-tertiary)]">
          Practice round · {session.name}
        </p>
        <h2 className="mt-[var(--space-2)] type-display-sm text-[var(--ink)]">
          Tee-time groups
        </h2>
        <p className="mt-[var(--space-2)] type-body-sm text-[var(--ink-secondary)]">
          Warm-up rounds don&rsquo;t split along Ryder Cup lines. Build groups of 2&ndash;4,
          set a tee time, and publish. Side bets (skins, CTP, nassau) can still attach to
          any group.
        </p>
      </div>

      <div className="space-y-[var(--space-3)]">
        {groups.map((group) => (
          <GroupCard
            key={group.localId}
            group={group}
            playerById={playerById}
            availablePlayers={availablePlayers}
            onAddPlayer={(playerId) => addPlayer(group.localId, playerId)}
            onRemovePlayer={(playerId) => removePlayer(group.localId, playerId)}
            onTeeTimeChange={(value) => setTeeTime(group.localId, value)}
            onRemoveGroup={() => removeGroup(group.localId)}
            canRemove={groups.length > 1}
          />
        ))}
      </div>

      <div className="flex flex-col gap-[var(--space-3)] sm:flex-row">
        <Button
          variant="secondary"
          onClick={addGroup}
          leftIcon={<Plus size={15} />}
          className="sm:flex-1"
        >
          Add another group
        </Button>
        {onSaveDraft ? (
          <Button
            variant="secondary"
            onClick={() => onSaveDraft(publishableGroups)}
            disabled={publishableGroups.length === 0 || isPublishing}
            className="sm:flex-1"
          >
            Save draft
          </Button>
        ) : null}
        <Button
          variant="primary"
          onClick={() => onPublish(publishableGroups)}
          disabled={!canPublish}
          leftIcon={<Save size={15} />}
          className="sm:flex-1"
        >
          {isPublishing ? 'Publishing…' : 'Publish groups'}
        </Button>
      </div>

      {publishableGroups.length === 0 ? (
        <p className="type-body-sm text-[var(--ink-tertiary)]">
          Each group needs at least two players before you can publish.
        </p>
      ) : null}
    </section>
  );
}

interface GroupCardProps {
  group: PracticeGroupDraft;
  playerById: Map<string, Player>;
  availablePlayers: Player[];
  onAddPlayer: (playerId: string) => void;
  onRemovePlayer: (playerId: string) => void;
  onTeeTimeChange: (value: string) => void;
  onRemoveGroup: () => void;
  canRemove: boolean;
}

function GroupCard({
  group,
  playerById,
  availablePlayers,
  onAddPlayer,
  onRemovePlayer,
  onTeeTimeChange,
  onRemoveGroup,
  canRemove,
}: GroupCardProps) {
  const groupPlayers = group.playerIds
    .map((id) => playerById.get(id))
    .filter((p): p is Player => Boolean(p));
  const canAddMore = group.playerIds.length < MAX_GROUP_SIZE;

  return (
    <div className="rounded-[1.35rem] border border-[var(--rule)] bg-[rgba(255,255,255,0.82)] p-[var(--space-4)] shadow-[0_10px_20px_rgba(46,34,18,0.05)]">
      <div className="flex items-center justify-between gap-[var(--space-3)]">
        <div className="flex items-center gap-[var(--space-3)]">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--masters)] text-[0.82rem] font-semibold text-[var(--canvas)]">
            {group.groupNumber}
          </div>
          <div>
            <p className="type-title-sm text-[var(--ink)]">Group {group.groupNumber}</p>
            <p className="type-meta text-[var(--ink-tertiary)]">
              <Users size={12} className="inline-block mr-1" />
              {group.playerIds.length} / {MAX_GROUP_SIZE} players
            </p>
          </div>
        </div>
        {canRemove ? (
          <Button
            variant="secondary"
            size="icon"
            onClick={onRemoveGroup}
            aria-label={`Remove group ${group.groupNumber}`}
          >
            <Trash2 size={15} />
          </Button>
        ) : null}
      </div>

      <div className="mt-[var(--space-4)] grid gap-[var(--space-3)] sm:grid-cols-[1fr_auto]">
        <label className="block">
          <span className="type-meta font-semibold text-[var(--ink)]">Tee time</span>
          <input
            type="time"
            value={group.teeTime ?? ''}
            onChange={(event) => onTeeTimeChange(event.target.value)}
            className="input mt-[var(--space-1)]"
          />
        </label>
      </div>

      <div className="mt-[var(--space-4)] space-y-[var(--space-2)]">
        {groupPlayers.length === 0 ? (
          <p className="type-body-sm text-[var(--ink-tertiary)]">No players yet.</p>
        ) : (
          groupPlayers.map((player) => (
            <div
              key={player.id}
              className="flex items-center justify-between gap-[var(--space-3)] rounded-[1rem] border border-[var(--rule)] bg-[var(--canvas)] px-[var(--space-3)] py-[var(--space-2)]"
            >
              <span className="type-body text-[var(--ink)]">
                {formatPlayerName(player.firstName, player.lastName)}
                {player.handicapIndex !== undefined ? (
                  <span className="ml-[var(--space-2)] type-micro text-[var(--ink-tertiary)]">
                    HCP {player.handicapIndex}
                  </span>
                ) : null}
              </span>
              <Button
                variant="secondary"
                size="icon"
                onClick={() => onRemovePlayer(player.id)}
                aria-label={`Remove ${formatPlayerName(player.firstName, player.lastName)} from group ${group.groupNumber}`}
              >
                <Trash2 size={13} />
              </Button>
            </div>
          ))
        )}
      </div>

      {canAddMore && availablePlayers.length > 0 ? (
        <label className="mt-[var(--space-4)] block">
          <span className="type-meta font-semibold text-[var(--ink)]">Add a player</span>
          <select
            value=""
            onChange={(event) => {
              const id = event.target.value;
              if (id) onAddPlayer(id);
            }}
            className={cn('input mt-[var(--space-1)]')}
          >
            <option value="">Select a player…</option>
            {availablePlayers.map((player) => (
              <option key={player.id} value={player.id}>
                {formatPlayerName(player.firstName, player.lastName)}
                {player.handicapIndex !== undefined ? ` · HCP ${player.handicapIndex}` : ''}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {!canAddMore ? (
        <p className="mt-[var(--space-3)] type-meta text-[var(--ink-tertiary)]">
          Group full.
        </p>
      ) : null}
      {canAddMore && availablePlayers.length === 0 ? (
        <p className="mt-[var(--space-3)] type-meta text-[var(--ink-tertiary)]">
          No unassigned players. Remove a player from another group to reassign.
        </p>
      ) : null}
    </div>
  );
}

export default PracticeGroupsEditor;
