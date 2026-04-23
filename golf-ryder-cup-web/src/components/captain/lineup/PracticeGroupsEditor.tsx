'use client';

import { useCallback, useMemo, useState } from 'react';
import { Plus, Save, Trash2, Users } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { cn, formatPlayerName } from '@/lib/utils';
import type { Player, RyderCupSession } from '@/lib/types/models';
import type { PracticeGroupDraft } from '@/lib/services/lineup-builder/practiceLineupPersistence';

export interface PracticeGroupsTemplate {
  /** e.g. the source session's id — used only for the React key. */
  sourceId: string;
  /** Human label shown in the dropdown ("Thursday practice — 4 groups"). */
  label: string;
  groups: PracticeGroupDraft[];
}

interface PracticeGroupsEditorProps {
  session: RyderCupSession;
  roster: Player[];
  initialGroups: PracticeGroupDraft[];
  /**
   * Prior practice sessions whose groups the captain can copy as a
   * starting point. Rendered as a "Copy from…" dropdown; picking one
   * overwrites the current draft (the captain gets a confirm toast
   * via the existing save-draft flow if they then edit).
   */
  templates?: PracticeGroupsTemplate[];
  onPublish: (groups: PracticeGroupDraft[]) => Promise<void> | void;
  onSaveDraft?: (groups: PracticeGroupDraft[]) => Promise<void> | void;
  isPublishing?: boolean;
}

/**
 * Returns the most useful default tee time for Group 1 — the session's
 * explicit firstTeeTime when set, else a sensible fallback for the
 * session's AM/PM slot. Keeps the initial editor state aligned with
 * what the captain already configured at trip-setup time.
 */
function resolveSessionDefaultTeeTime(session: RyderCupSession): string {
  const firstTee = session.firstTeeTime?.trim();
  if (firstTee) return firstTee.slice(0, 5);
  return session.timeSlot === 'PM' ? '13:00' : '08:00';
}

const MAX_GROUP_SIZE = 4;
const DEFAULT_STAGGER_MINUTES = 10;

function createEmptyGroup(
  groupNumber: number,
  defaultTeeTime?: string
): PracticeGroupDraft {
  // Only Group 1 seeds from the session's first tee time; Groups 2+
  // stay blank so applyAutoStagger can fill them relative to Group 1.
  // Accepts either "HH:MM" or "HH:MM:SS" from the session config;
  // the <input type="time"> only cares about HH:MM.
  const seededTee =
    groupNumber === 1 && defaultTeeTime
      ? defaultTeeTime.slice(0, 5)
      : '';

  return {
    localId: typeof crypto !== 'undefined' ? crypto.randomUUID() : `group-${groupNumber}`,
    groupNumber,
    playerIds: [],
    teeTime: seededTee,
  };
}

/**
 * Given a HH:MM string and an offset in minutes, return HH:MM shifted
 * forward. Used to auto-stagger group tee times from Group 1's time.
 * Guards against malformed input (returns empty so we don't emit
 * "NaN:NaN" into a <input type="time">).
 */
export function staggerTeeTime(baseHHMM: string, offsetMinutes: number): string {
  if (!/^\d{2}:\d{2}$/.test(baseHHMM)) return '';
  const [h, m] = baseHHMM.split(':').map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return '';
  const totalMinutes = Math.max(0, Math.min(23 * 60 + 59, h * 60 + m + offsetMinutes));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

/**
 * Fill in missing tee times by staggering from the first populated
 * group. Groups that already have a tee time are left alone — we only
 * touch the blanks. This is a pure function; the editor calls it at
 * publish time so the captain can still override any single tee time
 * individually.
 */
export function applyAutoStagger(
  groups: PracticeGroupDraft[],
  staggerMinutes = DEFAULT_STAGGER_MINUTES
): PracticeGroupDraft[] {
  const firstWithTime = groups.find((g) => g.teeTime && /^\d{2}:\d{2}$/.test(g.teeTime));
  if (!firstWithTime) return groups;

  const anchorIndex = groups.indexOf(firstWithTime);
  const anchorTime = firstWithTime.teeTime!;

  return groups.map((group, index) => {
    if (group.teeTime && /^\d{2}:\d{2}$/.test(group.teeTime)) return group;
    const offsetGroups = index - anchorIndex;
    if (offsetGroups <= 0) return group;
    return { ...group, teeTime: staggerTeeTime(anchorTime, offsetGroups * staggerMinutes) };
  });
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
  templates = [],
  onPublish,
  onSaveDraft,
  isPublishing = false,
}: PracticeGroupsEditorProps) {
  const defaultTeeTime = useMemo(() => resolveSessionDefaultTeeTime(session), [session]);

  const [groups, setGroups] = useState<PracticeGroupDraft[]>(() =>
    initialGroups.length > 0 ? initialGroups : [createEmptyGroup(1, defaultTeeTime)]
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
      return next.length > 0 ? renumber(next) : [createEmptyGroup(1, defaultTeeTime)];
    });
  }, [defaultTeeTime]);

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

  // Move a player from one group to another in a single state update,
  // so a re-render can't land with the player missing from both sides.
  // Skips the move when the destination is already full; the editor's
  // per-group UI disables the option in that case too, but this is
  // the belt against a stale click.
  const movePlayer = useCallback(
    (fromLocalId: string, playerId: string, toLocalId: string) => {
      setGroups((current) => {
        const destination = current.find((g) => g.localId === toLocalId);
        if (!destination || destination.playerIds.length >= MAX_GROUP_SIZE) {
          return current;
        }
        return current.map((g) => {
          if (g.localId === fromLocalId) {
            return { ...g, playerIds: g.playerIds.filter((id) => id !== playerId) };
          }
          if (g.localId === toLocalId) {
            return { ...g, playerIds: [...g.playerIds, playerId] };
          }
          return g;
        });
      });
    },
    []
  );

  const setTeeTime = useCallback((localId: string, value: string) => {
    setGroups((current) =>
      current.map((g) => (g.localId === localId ? { ...g, teeTime: value } : g))
    );
  }, []);

  /**
   * Load pairings from a prior practice session. Renumbers the groups
   * and generates fresh localIds so React keys stay unique and group
   * numbering starts at 1 regardless of what the source used.
   */
  const applyTemplate = useCallback((template: PracticeGroupsTemplate) => {
    setGroups(
      template.groups.map((g, index) => ({
        ...g,
        localId:
          typeof crypto !== 'undefined' ? crypto.randomUUID() : `${template.sourceId}-${index}`,
        groupNumber: index + 1,
      }))
    );
  }, []);

  // Unified source of truth: session.firstTeeTime owns the base time.
  // We do NOT bake an auto-staggered value into every group at publish
  // any more — that used to persist stale times on the match rows and
  // meant a later edit to session.firstTeeTime was ignored by the
  // schedule. Now blank group tee times publish as undefined, and the
  // schedule renderer falls back to session.firstTeeTime + per-hole
  // stagger. Explicit per-group edits are preserved as overrides.
  const publishableGroups = groups.filter((g) => g.playerIds.length >= 2);
  const canPublish = publishableGroups.length > 0 && !isPublishing;

  // For the UI preview only — show the computed stagger in each row's
  // placeholder text so the captain can see where Group N will land
  // even though we don't persist it.
  const uiPreviewWithStagger = applyAutoStagger(publishableGroups);
  const previewTeeByLocalId = new Map(
    uiPreviewWithStagger.map((g) => [g.localId, g.teeTime ?? ''])
  );

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

      {templates.length > 0 ? (
        <div className="rounded-[1.25rem] border border-[color:var(--rule)] bg-[color:var(--canvas)] px-[var(--space-4)] py-[var(--space-3)]">
          <label className="flex items-center justify-between gap-[var(--space-3)]">
            <span className="type-meta font-semibold text-[var(--ink)]">
              Copy pairings from
            </span>
            <select
              value=""
              onChange={(event) => {
                const match = templates.find((t) => t.sourceId === event.target.value);
                if (match) applyTemplate(match);
                // Reset the select back to the placeholder so the same
                // template can be chosen again if the captain edited
                // and wants to restart.
                event.currentTarget.value = '';
              }}
              className="input max-w-[20rem]"
              aria-label="Copy pairings from a prior practice session"
            >
              <option value="">Select a prior session…</option>
              {templates.map((template) => (
                <option key={template.sourceId} value={template.sourceId}>
                  {template.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      ) : null}

      <UnassignedPool
        players={availablePlayers}
        groups={groups}
        onAssign={(playerId, toLocalId) => addPlayer(toLocalId, playerId)}
      />

      <div className="space-y-[var(--space-3)]">
        {groups.map((group) => (
          <GroupCard
            key={group.localId}
            group={group}
            allGroups={groups}
            playerById={playerById}
            availablePlayers={availablePlayers}
            inheritedTeeTime={previewTeeByLocalId.get(group.localId) ?? ''}
            onAddPlayer={(playerId) => addPlayer(group.localId, playerId)}
            onRemovePlayer={(playerId) => removePlayer(group.localId, playerId)}
            onMovePlayer={(playerId, toLocalId) =>
              movePlayer(group.localId, playerId, toLocalId)
            }
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
  allGroups: PracticeGroupDraft[];
  playerById: Map<string, Player>;
  availablePlayers: Player[];
  /**
   * The computed tee time this group will land on at render time
   * (from session.firstTeeTime + stagger). Shown as placeholder when
   * the captain hasn't typed an explicit override for the group.
   */
  inheritedTeeTime: string;
  onAddPlayer: (playerId: string) => void;
  onRemovePlayer: (playerId: string) => void;
  onMovePlayer: (playerId: string, toLocalId: string) => void;
  onTeeTimeChange: (value: string) => void;
  onRemoveGroup: () => void;
  canRemove: boolean;
}

function GroupCard({
  group,
  allGroups,
  playerById,
  availablePlayers,
  inheritedTeeTime,
  onAddPlayer,
  onRemovePlayer,
  onMovePlayer,
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
            placeholder={inheritedTeeTime || 'Auto'}
          />
          {group.teeTime ? null : (
            <span className="mt-[var(--space-1)] block type-micro text-[var(--ink-tertiary)]">
              {inheritedTeeTime
                ? `Will render as ${inheritedTeeTime} from the session's first tee time.`
                : 'Inherits from the session’s first tee time.'}
            </span>
          )}
          {group.groupNumber > 1 && !group.teeTime ? (
            <span className="mt-[var(--space-1)] block type-micro text-[var(--ink-tertiary)]">
              Leave blank to stagger from Group 1.
            </span>
          ) : null}
        </label>
      </div>

      <div className="mt-[var(--space-4)] space-y-[var(--space-2)]">
        {groupPlayers.length === 0 ? (
          <p className="type-body-sm text-[var(--ink-tertiary)]">No players yet.</p>
        ) : (
          groupPlayers.map((player) => {
            const moveTargets = allGroups.filter(
              (candidate) =>
                candidate.localId !== group.localId &&
                candidate.playerIds.length < MAX_GROUP_SIZE
            );
            return (
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
                <div className="flex items-center gap-[var(--space-2)]">
                  {moveTargets.length > 0 ? (
                    <select
                      value=""
                      onChange={(event) => {
                        const toId = event.target.value;
                        if (toId) onMovePlayer(player.id, toId);
                      }}
                      aria-label={`Move ${formatPlayerName(player.firstName, player.lastName)} to another group`}
                      className={cn(
                        'rounded-[0.75rem] border border-[var(--rule)] bg-[var(--canvas)] px-[var(--space-2)] py-[3px] text-xs'
                      )}
                    >
                      <option value="">Move…</option>
                      {moveTargets.map((target) => (
                        <option key={target.localId} value={target.localId}>
                          Group {target.groupNumber}
                        </option>
                      ))}
                    </select>
                  ) : null}
                  <Button
                    variant="secondary"
                    size="icon"
                    onClick={() => onRemovePlayer(player.id)}
                    aria-label={`Remove ${formatPlayerName(player.firstName, player.lastName)} from group ${group.groupNumber}`}
                  >
                    <Trash2 size={13} />
                  </Button>
                </div>
              </div>
            );
          })
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

/**
 * Surfaced pool of trip players not yet in any group. The captain
 * can tap a player to push them into a group without opening that
 * group's dropdown first; shows at a glance who's still unassigned
 * so no one gets dropped from the tee sheet.
 */
interface UnassignedPoolProps {
  players: Player[];
  groups: PracticeGroupDraft[];
  onAssign: (playerId: string, toLocalId: string) => void;
}

function UnassignedPool({ players, groups, onAssign }: UnassignedPoolProps) {
  if (players.length === 0 && groups.every((g) => g.playerIds.length > 0)) {
    return (
      <div className="rounded-[1.25rem] border border-dashed border-[color:var(--rule)] bg-[color:var(--canvas)] px-[var(--space-4)] py-[var(--space-3)]">
        <p className="type-meta text-[var(--ink-tertiary)]">
          All players assigned. Every trip roster member is in a group.
        </p>
      </div>
    );
  }

  if (players.length === 0) {
    return null;
  }

  const openGroups = groups.filter((g) => g.playerIds.length < MAX_GROUP_SIZE);

  return (
    <div className="rounded-[1.25rem] border border-[color:var(--rule)] bg-[linear-gradient(180deg,rgba(201,162,39,0.06),rgba(255,255,255,0.96))] px-[var(--space-4)] py-[var(--space-3)]">
      <div className="flex items-center justify-between gap-[var(--space-3)]">
        <div>
          <p className="type-overline tracking-[0.14em] text-[var(--ink-tertiary)]">Unassigned</p>
          <p className="type-title-sm text-[var(--ink)]">
            {players.length} player{players.length === 1 ? '' : 's'} still need a group
          </p>
        </div>
      </div>
      <div className="mt-[var(--space-3)] flex flex-wrap gap-[var(--space-2)]">
        {players.map((player) => {
          const label = formatPlayerName(player.firstName, player.lastName);
          return (
            <label
              key={player.id}
              className="flex items-center gap-[var(--space-2)] rounded-full border border-[var(--rule)] bg-[var(--canvas)] px-[var(--space-3)] py-[5px]"
            >
              <span className="type-meta text-[var(--ink)]">{label}</span>
              {openGroups.length > 0 ? (
                <select
                  value=""
                  onChange={(event) => {
                    const toId = event.target.value;
                    if (toId) onAssign(player.id, toId);
                  }}
                  aria-label={`Assign ${label} to a group`}
                  className="rounded-[0.5rem] border border-[var(--rule)] bg-[var(--canvas)] px-[var(--space-2)] py-[1px] text-xs"
                >
                  <option value="">→ group</option>
                  {openGroups.map((target) => (
                    <option key={target.localId} value={target.localId}>
                      Group {target.groupNumber}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="type-micro text-[var(--ink-tertiary)]">no open group</span>
              )}
            </label>
          );
        })}
      </div>
    </div>
  );
}

export default PracticeGroupsEditor;
