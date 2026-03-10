/**
 * Lineup Builder Component
 *
 * Drag-and-drop interface for creating match pairings:
 * - Visual roster selection
 * - Match slot creation
 * - Player pairing with handicap display
 * - Fairness scoring feedback
 *
 * Features:
 * - Touch-friendly drag and drop
 * - Auto-fill suggestions
 * - Validation warnings
 * - Lock/publish lineup
 */

'use client';

import { useState, useCallback, useMemo, type ReactNode } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import {
  Users,
  Lock,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Shuffle,
  Save,
  X,
  GripVertical,
  User,
  Scale,
  Trash2,
  HelpCircle,
} from 'lucide-react';

// ============================================
// TYPES
// ============================================

export interface Player {
  id: string;
  firstName: string;
  lastName: string;
  handicapIndex: number;
  team: 'A' | 'B';
  avatarUrl?: string;
  matchesPlayed?: number;
}

export interface MatchSlot {
  id: string;
  teamAPlayers: Player[];
  teamBPlayers: Player[];
  courseHoles?: string;
  teeTime?: string;
}

export interface SessionConfig {
  id: string;
  name: string;
  type: 'foursomes' | 'fourball' | 'singles';
  playersPerTeam: number;
  matchCount: number;
  pointsPerMatch: number;
}

export interface FairnessScore {
  overall: number; // 0-100
  handicapBalance: number;
  experienceBalance: number;
  warnings: string[];
}

interface LineupBuilderProps {
  session: SessionConfig;
  teamAPlayers: Player[];
  teamBPlayers: Player[];
  teamALabel?: string;
  teamBLabel?: string;
  initialMatches?: MatchSlot[];
  onSave?: (matches: MatchSlot[]) => void;
  onPublish?: (matches: MatchSlot[]) => void;
  onDeleteMatch?: (matchId: string) => Promise<void>;
  onAutoFill?: () => MatchSlot[];
  calculateFairness?: (matches: MatchSlot[]) => FairnessScore;
  isLocked?: boolean;
  className?: string;
}

// ============================================
// LINEUP BUILDER
// ============================================

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
  const [matches, setMatches] = useState<MatchSlot[]>(
    initialMatches.length > 0
      ? initialMatches
      : Array.from({ length: session.matchCount }, (_, i) => ({
          id: `match-${i + 1}`,
          teamAPlayers: [],
          teamBPlayers: [],
        }))
  );
  const [draggedPlayer, setDraggedPlayer] = useState<Player | null>(null);
  const [showRoster, setShowRoster] = useState<'A' | 'B' | null>('A');
  const [hasChanges, setHasChanges] = useState(false);

  // Calculate which players are already assigned
  const assignedPlayerIds = useMemo(() => {
    const ids = new Set<string>();
    matches.forEach((match) => {
      match.teamAPlayers.forEach((p) => ids.add(p.id));
      match.teamBPlayers.forEach((p) => ids.add(p.id));
    });
    return ids;
  }, [matches]);

  const availableTeamA = teamAPlayers.filter((p) => !assignedPlayerIds.has(p.id));
  const availableTeamB = teamBPlayers.filter((p) => !assignedPlayerIds.has(p.id));
  const totalAssigned = assignedPlayerIds.size;
  const totalPlayers = teamAPlayers.length + teamBPlayers.length;

  // Calculate fairness
  const fairness = useMemo(() => {
    if (!calculateFairness) return null;
    return calculateFairness(matches);
  }, [matches, calculateFairness]);

  // Validation
  const validation = useMemo(() => {
    const errors: string[] = [];
    const warnings: string[] = [];

    matches.forEach((match, i) => {
      const requiredPlayers = session.playersPerTeam;
      if (match.teamAPlayers.length !== requiredPlayers) {
        errors.push(`Match ${i + 1}: Team A needs ${requiredPlayers} player(s)`);
      }
      if (match.teamBPlayers.length !== requiredPlayers) {
        errors.push(`Match ${i + 1}: Team B needs ${requiredPlayers} player(s)`);
      }
    });

    if (fairness && fairness.warnings.length > 0) {
      warnings.push(...fairness.warnings);
    }

    return { errors, warnings, isValid: errors.length === 0 };
  }, [matches, session.playersPerTeam, fairness]);

  // Handlers
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

  const handleDropOnMatch = useCallback(
    (matchId: string, team: 'A' | 'B') => {
      if (!draggedPlayer || isLocked) return;

      setMatches((prev) =>
        prev.map((match) => {
          if (match.id !== matchId) return match;

          // First remove player from any existing position
          const updatedMatch = {
            ...match,
            teamAPlayers: match.teamAPlayers.filter((p) => p.id !== draggedPlayer.id),
            teamBPlayers: match.teamBPlayers.filter((p) => p.id !== draggedPlayer.id),
          };

          // Add to correct team if room
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

      setMatches((prev) =>
        prev.map((match) => {
          if (match.id !== matchId) return match;
          return {
            ...match,
            teamAPlayers: match.teamAPlayers.filter((p) => p.id !== playerId),
            teamBPlayers: match.teamBPlayers.filter((p) => p.id !== playerId),
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

      // Remove from local state
      setMatches((prev) => prev.filter((match) => match.id !== matchId));
      setHasChanges(true);

      // Call the external delete handler to remove from database
      if (onDeleteMatch) {
        await onDeleteMatch(matchId);
      }
    },
    [isLocked, onDeleteMatch]
  );

  const handleAutoFill = useCallback(() => {
    if (isLocked || !onAutoFill) return;
    const suggested = onAutoFill();
    setMatches(suggested);
    setHasChanges(true);
  }, [isLocked, onAutoFill]);

  const handleSave = useCallback(() => {
    onSave?.(matches);
    setHasChanges(false);
  }, [matches, onSave]);

  const handlePublish = useCallback(() => {
    if (!validation.isValid) return;
    onPublish?.(matches);
  }, [matches, validation.isValid, onPublish]);

  return (
    <div className={cn('space-y-4', className)}>
      <div className="card-editorial overflow-hidden p-[var(--space-5)] sm:p-[var(--space-6)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="type-overline text-[var(--masters)]">Lineup Studio</p>
            <h2 className="mt-[var(--space-2)] font-serif text-[length:var(--text-3xl)] font-normal tracking-[-0.03em] text-[var(--ink)]">
              {session.name}
            </h2>
            <p className="mt-[var(--space-2)] text-sm text-[var(--ink-secondary)]">
              {session.type} • {session.matchCount} matches • {session.pointsPerMatch} point
              {session.pointsPerMatch === 1 ? '' : 's'} each
            </p>
          </div>
          {isLocked ? (
            <BuilderStatusPill label="Locked" icon={<Lock className="h-4 w-4" />} />
          ) : onAutoFill ? (
            <button
              onClick={handleAutoFill}
              className="inline-flex items-center gap-2 rounded-full border border-[color:rgba(0,102,68,0.15)] bg-[linear-gradient(135deg,rgba(0,102,68,0.12)_0%,rgba(255,255,255,0.72)_100%)] px-4 py-2 text-sm font-semibold text-[var(--masters)]"
            >
              <Shuffle className="h-4 w-4" />
              Auto-fill
            </button>
          ) : null}
        </div>

        <div className="mt-[var(--space-6)] grid grid-cols-3 gap-3">
          <BuilderFact label="Assigned" value={`${totalAssigned}/${totalPlayers}`} />
          <BuilderFact label={teamALabel} value={availableTeamA.length} note="available" />
          <BuilderFact label={teamBLabel} value={availableTeamB.length} note="available" />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-start">
        <div className="space-y-4">
          {fairness && <FairnessIndicator score={fairness} />}

          {(validation.errors.length > 0 || validation.warnings.length > 0) && (
            <ValidationPanel errors={validation.errors} warnings={validation.warnings} />
          )}

          <div className="card-editorial p-[var(--space-4)]">
            <div className="mb-[var(--space-4)]">
              <p className="type-overline text-[var(--ink-secondary)]">Available players</p>
              <p className="mt-2 text-sm text-[var(--ink-secondary)]">
                Open one roster at a time to keep the drag targets clear.
              </p>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
              <RosterToggle
                team="A"
                label={`${teamALabel} (${availableTeamA.length})`}
                isActive={showRoster === 'A'}
                onClick={() => setShowRoster(showRoster === 'A' ? null : 'A')}
              />
              <RosterToggle
                team="B"
                label={`${teamBLabel} (${availableTeamB.length})`}
                isActive={showRoster === 'B'}
                onClick={() => setShowRoster(showRoster === 'B' ? null : 'B')}
              />
            </div>

            {showRoster && (
              <div className="mt-[var(--space-4)]">
                <AvailablePlayersPanel
                  team={showRoster}
                  teamLabel={showRoster === 'A' ? teamALabel : teamBLabel}
                  players={showRoster === 'A' ? availableTeamA : availableTeamB}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                  isLocked={isLocked}
                />
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="type-overline text-[var(--ink-secondary)]">Matches</p>
              <p className="mt-2 text-sm text-[var(--ink-secondary)]">
                Build the card one pairing at a time.
              </p>
            </div>
            {hasChanges && !isLocked && (
              <BuilderStatusPill label="Unsaved" icon={<Save className="h-4 w-4" />} tone="masters" />
            )}
          </div>

          <div className="space-y-3">
            {matches.map((match, index) => (
              <MatchSlotCard
                key={match.id}
                match={match}
                matchNumber={index + 1}
                playersPerTeam={session.playersPerTeam}
                teamALabel={teamALabel}
                teamBLabel={teamBLabel}
                onDrop={(team) => handleDropOnMatch(match.id, team)}
                onRemovePlayer={(playerId) => handleRemovePlayer(match.id, playerId)}
                onDeleteMatch={() => handleDeleteMatch(match.id)}
                isDragging={!!draggedPlayer}
                draggedPlayerTeam={draggedPlayer?.team}
                isLocked={isLocked}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Actions */}
      {!isLocked && (
        <div className="flex gap-3 pt-2">
          <button
            onClick={handleSave}
            disabled={!hasChanges}
            className="flex-1 rounded-[22px] border px-4 py-3 font-medium flex items-center justify-center gap-2 transition-colors"
            style={{
              background: 'var(--surface)',
              color: hasChanges ? 'var(--masters)' : 'var(--ink-tertiary)',
              border: '1px solid var(--rule)',
              opacity: hasChanges ? 1 : 0.5,
            }}
          >
            <Save className="w-5 h-5" />
            Save Draft
          </button>
          <button
            onClick={handlePublish}
            disabled={!validation.isValid}
            className={cn(
              'flex-1 rounded-[22px] py-3 font-medium flex items-center justify-center gap-2 transition-colors text-[var(--canvas)]',
              validation.isValid ? 'bg-[var(--masters)]' : 'bg-[var(--ink-tertiary)] opacity-50'
            )}
          >
            <CheckCircle2 className="w-5 h-5" />
            Publish Lineup
          </button>
        </div>
      )}
    </div>
  );
}

// ============================================
// ROSTER TOGGLE
// ============================================

interface RosterToggleProps {
  team: 'A' | 'B';
  label: string;
  isActive: boolean;
  onClick: () => void;
}

function RosterToggle({ team, label, isActive, onClick }: RosterToggleProps) {
  const color = team === 'A' ? 'var(--team-usa)' : 'var(--team-europe)';

  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all'
      )}
      style={{
        background: isActive ? color : 'var(--surface)',
        color: isActive ? 'white' : 'var(--ink-secondary)',
        border: `1px solid ${isActive ? color : 'var(--rule)'}`,
      }}
    >
      <Users className="w-4 h-4" />
      {label}
      {isActive ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
    </button>
  );
}

// ============================================
// AVAILABLE PLAYERS PANEL
// ============================================

interface AvailablePlayersPanelProps {
  team: 'A' | 'B';
  teamLabel: string;
  players: Player[];
  onDragStart: (player: Player) => void;
  onDragEnd: () => void;
  isLocked: boolean;
}

function AvailablePlayersPanel({
  team,
  teamLabel,
  players,
  onDragStart,
  onDragEnd,
  isLocked,
}: AvailablePlayersPanelProps) {
  const color = team === 'A' ? 'var(--team-usa)' : 'var(--team-europe)';

  if (players.length === 0) {
    return (
      <div
        className="rounded-[22px] border border-[color:var(--rule)] bg-[color:var(--canvas)]/72 p-4 text-center"
        style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}
      >
        <p className="text-sm text-[var(--ink-secondary)]">All {teamLabel} players assigned</p>
      </div>
    );
  }

  return (
    <div
      className="rounded-[24px] border p-3"
      style={{
        background: `${color}10`,
        border: `1px solid ${color}30`,
      }}
    >
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-[0.14em]" style={{ color }}>
          {teamLabel}
        </p>
        <span className="text-xs text-[var(--ink-tertiary)]">{players.length} available</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {players.map((player) => (
          <PlayerChip
            key={player.id}
            player={player}
            onDragStart={() => onDragStart(player)}
            onDragEnd={onDragEnd}
            isDraggable={!isLocked}
          />
        ))}
      </div>
    </div>
  );
}

// ============================================
// PLAYER CHIP
// ============================================

interface PlayerChipProps {
  player: Player;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  onRemove?: () => void;
  isDraggable?: boolean;
  showRemove?: boolean;
  size?: 'sm' | 'md';
}

function PlayerChip({
  player,
  onDragStart,
  onDragEnd,
  onRemove,
  isDraggable = true,
  showRemove = false,
  size = 'md',
}: PlayerChipProps) {
  const color = player.team === 'A' ? 'var(--team-usa)' : 'var(--team-europe)';
  const initials = `${player.firstName[0]}${player.lastName[0]}`;

  return (
    <div
      draggable={isDraggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={cn(
        'flex items-center gap-2 rounded-lg transition-all',
        isDraggable && 'cursor-grab active:cursor-grabbing active:scale-95',
        size === 'sm' ? 'px-2 py-1' : 'px-3 py-2'
      )}
      style={{
        background: 'var(--surface)',
        border: `1px solid ${color}50`,
      }}
    >
      {isDraggable && <GripVertical className="w-3 h-3" style={{ color: 'var(--ink-tertiary)' }} />}

      {player.avatarUrl ? (
        <Image
          src={player.avatarUrl}
          alt={player.firstName}
          width={size === 'sm' ? 24 : 32}
          height={size === 'sm' ? 24 : 32}
          className={cn('rounded-full', size === 'sm' ? 'w-6 h-6' : 'w-8 h-8')}
          style={{ border: `2px solid ${color}` }}
        />
      ) : (
        <div
          className={cn(
            'rounded-full flex items-center justify-center font-bold',
            size === 'sm' ? 'w-6 h-6 text-xs' : 'w-8 h-8 text-sm'
          )}
          style={{
            background: `${color}20`,
            color,
          }}
        >
          {initials}
        </div>
      )}

      <div className="min-w-0">
        <p
          className={cn('font-medium truncate', size === 'sm' ? 'text-xs' : 'text-sm')}
          style={{ color: 'var(--ink)' }}
        >
          {player.firstName} {player.lastName[0]}.
        </p>
        <p className="text-xs" style={{ color: 'var(--ink-tertiary)' }}>
          {player.handicapIndex.toFixed(1)} HCP
        </p>
      </div>

      {showRemove && onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="p-1 rounded-md transition-colors"
          style={{ color: 'var(--ink-tertiary)' }}
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

// ============================================
// MATCH SLOT CARD
// ============================================

interface MatchSlotCardProps {
  match: MatchSlot;
  matchNumber: number;
  playersPerTeam: number;
  teamALabel: string;
  teamBLabel: string;
  onDrop: (team: 'A' | 'B') => void;
  onRemovePlayer: (playerId: string) => void;
  onDeleteMatch: () => void;
  isDragging: boolean;
  draggedPlayerTeam?: 'A' | 'B';
  isLocked: boolean;
}

function MatchSlotCard({
  match,
  matchNumber,
  playersPerTeam,
  teamALabel,
  teamBLabel,
  onDrop,
  onRemovePlayer,
  onDeleteMatch,
  isDragging,
  draggedPlayerTeam,
  isLocked,
}: MatchSlotCardProps) {
  const teamAComplete = match.teamAPlayers.length === playersPerTeam;
  const teamBComplete = match.teamBPlayers.length === playersPerTeam;
  const isComplete = teamAComplete && teamBComplete;

  // Calculate combined handicap
  const teamAHandicap = match.teamAPlayers.reduce((sum, p) => sum + p.handicapIndex, 0);
  const teamBHandicap = match.teamBPlayers.reduce((sum, p) => sum + p.handicapIndex, 0);

  return (
    <div
      className={cn(
        'rounded-[28px] border p-4 transition-all sm:p-5',
        isComplete && 'ring-2 ring-success ring-offset-2 ring-offset-canvas'
      )}
      style={{
        background: 'linear-gradient(180deg, rgba(255,255,255,0.78) 0%, rgba(245,240,233,0.96) 100%)',
        border: '1px solid var(--rule)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span
            className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm"
            style={{
              background: isComplete ? 'var(--success)' : 'var(--surface-raised)',
              color: isComplete ? 'var(--canvas)' : 'var(--ink-secondary)',
            }}
          >
            {matchNumber}
          </span>
          <span className="text-sm font-medium" style={{ color: 'var(--ink)' }}>
            Match {matchNumber}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {match.teamAPlayers.length > 0 && match.teamBPlayers.length > 0 && (
            <div
              className="flex items-center gap-1 text-xs"
              style={{ color: 'var(--ink-tertiary)' }}
            >
              <Scale className="w-3 h-3" />
              {teamAHandicap.toFixed(1)} vs {teamBHandicap.toFixed(1)}
            </div>
          )}

          {/* Delete Match Button */}
          {!isLocked && (
            <div className="relative group">
              <button
                onClick={onDeleteMatch}
                className="p-1.5 rounded-lg transition-colors text-[var(--error)] hover:bg-[color:var(--error)]/10"
                aria-label={`Delete Match ${matchNumber}`}
              >
                <Trash2 className="w-4 h-4" />
              </button>
              {/* Tooltip */}
              <div
                className="absolute right-0 top-full mt-1 px-2 py-1 rounded text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10"
                style={{
                  background: 'var(--ink)',
                  color: 'var(--canvas)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                }}
              >
                Remove this match
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Teams */}
      <div className="grid grid-cols-2 gap-3">
        {/* Team A */}
        <DropZone
          team="A"
          teamLabel={teamALabel}
          players={match.teamAPlayers}
          playersNeeded={playersPerTeam}
          onDrop={() => onDrop('A')}
          onRemovePlayer={onRemovePlayer}
          isDragging={isDragging && draggedPlayerTeam === 'A'}
          isLocked={isLocked}
        />

        {/* Team B */}
        <DropZone
          team="B"
          teamLabel={teamBLabel}
          players={match.teamBPlayers}
          playersNeeded={playersPerTeam}
          onDrop={() => onDrop('B')}
          onRemovePlayer={onRemovePlayer}
          isDragging={isDragging && draggedPlayerTeam === 'B'}
          isLocked={isLocked}
        />
      </div>
    </div>
  );
}

// ============================================
// DROP ZONE
// ============================================

interface DropZoneProps {
  team: 'A' | 'B';
  teamLabel: string;
  players: Player[];
  playersNeeded: number;
  onDrop: () => void;
  onRemovePlayer: (playerId: string) => void;
  isDragging: boolean;
  isLocked: boolean;
}

function DropZone({
  team,
  teamLabel,
  players,
  playersNeeded,
  onDrop,
  onRemovePlayer,
  isDragging,
  isLocked,
}: DropZoneProps) {
  const color = team === 'A' ? 'var(--team-usa)' : 'var(--team-europe)';
  const emptySlots = playersNeeded - players.length;

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        if (!isLocked) e.dataTransfer.dropEffect = 'move';
      }}
      onDrop={(e) => {
        e.preventDefault();
        if (!isLocked) onDrop();
      }}
      className={cn('p-3 rounded-xl min-h-20 transition-all', isDragging && 'ring-2 ring-dashed')}
      style={{
        background: `${color}10`,
        border: `1px solid ${color}30`,
      }}
    >
      <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color }}>
        {teamLabel}
      </div>
      <div className="space-y-2">
        {players.map((player) => (
          <PlayerChip
            key={player.id}
            player={player}
            onRemove={() => onRemovePlayer(player.id)}
            showRemove={!isLocked}
            isDraggable={false}
            size="sm"
          />
        ))}

        {emptySlots > 0 && (
          <div
            className="flex items-center justify-center gap-2 py-3 rounded-lg border-2 border-dashed"
            style={{
              borderColor: `${color}40`,
              color: 'var(--ink-tertiary)',
            }}
          >
            <User className="w-4 h-4" />
            <span className="text-xs">
              {isDragging ? 'Drop here' : `${emptySlots} player${emptySlots > 1 ? 's' : ''} needed`}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// FAIRNESS INDICATOR
// ============================================

interface FairnessIndicatorProps {
  score: FairnessScore;
}

function BuilderFact({
  label,
  value,
  note,
}: {
  label: string;
  value: number | string;
  note?: string;
}) {
  return (
    <div className="rounded-[20px] border border-[color:var(--rule)]/75 bg-[color:var(--canvas)]/72 px-3 py-3 text-center">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-tertiary)]">
        {label}
      </p>
      <p className="mt-1 font-serif text-[length:var(--text-xl)] text-[var(--ink)]">{value}</p>
      {note && <p className="mt-1 text-[11px] text-[var(--ink-secondary)]">{note}</p>}
    </div>
  );
}

function BuilderStatusPill({
  label,
  icon,
  tone = 'muted',
}: {
  label: string;
  icon: ReactNode;
  tone?: 'muted' | 'masters';
}) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium',
        tone === 'masters'
          ? 'bg-[color:rgba(0,102,68,0.12)] text-[var(--masters)]'
          : 'bg-[color:var(--surface)] text-[var(--ink-secondary)]'
      )}
    >
      {icon}
      {label}
    </div>
  );
}

function FairnessIndicator({ score }: FairnessIndicatorProps) {
  const [showInfo, setShowInfo] = useState(false);

  const getColor = (value: number) => {
    if (value >= 80) return 'var(--success)';
    if (value >= 60) return 'var(--warning)';
    return 'var(--error)';
  };

  return (
    <div
      className="p-4 rounded-xl"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--rule)',
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Scale className="w-5 h-5" style={{ color: 'var(--masters)' }} />
          <span className="font-medium" style={{ color: 'var(--ink)' }}>
            Fairness Score
          </span>
          {/* Info button */}
          <button
            onClick={() => setShowInfo(!showInfo)}
            className="p-1 rounded-full transition-colors hover:bg-[color:var(--ink)]/5"
            aria-label="What is fairness score?"
          >
            <HelpCircle size={16} style={{ color: 'var(--ink-tertiary)' }} />
          </button>
        </div>
        <span className="text-xl font-bold" style={{ color: getColor(score.overall) }}>
          {score.overall}%
        </span>
      </div>

      {/* Info tooltip/explanation */}
      {showInfo && (
        <div
          className="mb-3 p-3 rounded-lg text-sm"
          style={{ background: 'var(--canvas-sunken)', color: 'var(--ink-secondary)' }}
        >
          <p className="mb-2">
            <strong>Fairness Score</strong> measures how balanced the matchups are:
          </p>
          <ul className="space-y-1 text-xs">
            <li>
              • <strong>Handicap Balance:</strong> Compares total handicaps between teams in each
              match. Closer totals = fairer matches.
            </li>
            <li>
              • <strong>Experience Balance:</strong> Considers matches played. Spreading experience
              evenly creates fairer pairings.
            </li>
            <li>
              • <strong>80%+</strong> = Great balance, <strong>60-79%</strong> = Acceptable,{' '}
              <strong>&lt;60%</strong> = Consider adjustments
            </li>
          </ul>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-xs" style={{ color: 'var(--ink-tertiary)' }}>
            Handicap Balance
          </p>
          <div className="flex items-center gap-2 mt-1">
            <div
              className="flex-1 h-2 rounded-full overflow-hidden"
              style={{ background: 'var(--rule)' }}
            >
              <div
                className="h-full rounded-full"
                style={{
                  width: `${score.handicapBalance}%`,
                  background: getColor(score.handicapBalance),
                }}
              />
            </div>
            <span
              className="text-xs font-medium"
              style={{ color: getColor(score.handicapBalance) }}
            >
              {score.handicapBalance}%
            </span>
          </div>
        </div>
        <div>
          <p className="text-xs" style={{ color: 'var(--ink-tertiary)' }}>
            Experience Balance
          </p>
          <div className="flex items-center gap-2 mt-1">
            <div
              className="flex-1 h-2 rounded-full overflow-hidden"
              style={{ background: 'var(--rule)' }}
            >
              <div
                className="h-full rounded-full"
                style={{
                  width: `${score.experienceBalance}%`,
                  background: getColor(score.experienceBalance),
                }}
              />
            </div>
            <span
              className="text-xs font-medium"
              style={{ color: getColor(score.experienceBalance) }}
            >
              {score.experienceBalance}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// VALIDATION PANEL
// ============================================

interface ValidationPanelProps {
  errors: string[];
  warnings: string[];
}

function ValidationPanel({ errors, warnings }: ValidationPanelProps) {
  if (errors.length === 0 && warnings.length === 0) return null;

  return (
    <div className="space-y-2">
      {errors.length > 0 && (
        <div className="p-3 rounded-xl bg-[var(--error)] text-[var(--canvas)]">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-sm">Cannot publish</p>
              <ul className="mt-1 text-xs text-[color:var(--canvas)]/80 space-y-0.5">
                {errors.slice(0, 3).map((error, i) => (
                  <li key={i}>• {error}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {warnings.length > 0 && (
        <div className="p-3 rounded-xl bg-[var(--warning)] text-[var(--canvas)]">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-sm">Warnings</p>
              <ul className="mt-1 text-xs text-[color:var(--canvas)]/80 space-y-0.5">
                {warnings.map((warning, i) => (
                  <li key={i}>• {warning}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default LineupBuilder;
