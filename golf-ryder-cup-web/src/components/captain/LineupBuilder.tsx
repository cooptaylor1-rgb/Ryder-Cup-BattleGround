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
import { cn } from '@/lib/utils';
import {
  Users,
  Plus,
  Trash2,
  Lock,
  Unlock,
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
  initialMatches?: MatchSlot[];
  onSave?: (matches: MatchSlot[]) => void;
  onPublish?: (matches: MatchSlot[]) => void;
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
  initialMatches = [],
  onSave,
  onPublish,
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
  const handleDragStart = useCallback((player: Player) => {
    if (isLocked) return;
    setDraggedPlayer(player);
  }, [isLocked]);

  const handleDragEnd = useCallback(() => {
    setDraggedPlayer(null);
  }, []);

  const handleDropOnMatch = useCallback((matchId: string, team: 'A' | 'B') => {
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
        const targetPlayers = team === 'A' ? updatedMatch.teamAPlayers : updatedMatch.teamBPlayers;
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
  }, [draggedPlayer, isLocked, session.playersPerTeam]);

  const handleRemovePlayer = useCallback((matchId: string, playerId: string) => {
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
  }, [isLocked]);

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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2
            className="text-xl font-bold"
            style={{ color: 'var(--ink)' }}
          >
            {session.name}
          </h2>
          <p
            className="text-sm"
            style={{ color: 'var(--ink-secondary)' }}
          >
            {session.type} • {session.matchCount} matches • {session.pointsPerMatch} pts each
          </p>
        </div>
        {isLocked ? (
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium"
            style={{ background: 'var(--surface)', color: 'var(--ink-secondary)' }}
          >
            <Lock className="w-4 h-4" />
            Locked
          </div>
        ) : (
          <div className="flex items-center gap-2">
            {onAutoFill && (
              <button
                onClick={handleAutoFill}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                style={{ background: 'var(--surface)', color: 'var(--masters)' }}
              >
                <Shuffle className="w-4 h-4" />
                Auto-fill
              </button>
            )}
          </div>
        )}
      </div>

      {/* Fairness Score */}
      {fairness && (
        <FairnessIndicator score={fairness} />
      )}

      {/* Validation */}
      {(validation.errors.length > 0 || validation.warnings.length > 0) && (
        <ValidationPanel
          errors={validation.errors}
          warnings={validation.warnings}
        />
      )}

      {/* Roster Panels */}
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 no-scrollbar">
        <RosterToggle
          team="A"
          label={`Team A (${availableTeamA.length} available)`}
          isActive={showRoster === 'A'}
          onClick={() => setShowRoster(showRoster === 'A' ? null : 'A')}
        />
        <RosterToggle
          team="B"
          label={`Team B (${availableTeamB.length} available)`}
          isActive={showRoster === 'B'}
          onClick={() => setShowRoster(showRoster === 'B' ? null : 'B')}
        />
      </div>

      {/* Available Players */}
      {showRoster && (
        <AvailablePlayersPanel
          team={showRoster}
          players={showRoster === 'A' ? availableTeamA : availableTeamB}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          isLocked={isLocked}
        />
      )}

      {/* Match Slots */}
      <div className="space-y-3">
        {matches.map((match, index) => (
          <MatchSlotCard
            key={match.id}
            match={match}
            matchNumber={index + 1}
            playersPerTeam={session.playersPerTeam}
            onDrop={(team) => handleDropOnMatch(match.id, team)}
            onRemovePlayer={(playerId) => handleRemovePlayer(match.id, playerId)}
            isDragging={!!draggedPlayer}
            draggedPlayerTeam={draggedPlayer?.team}
            isLocked={isLocked}
          />
        ))}
      </div>

      {/* Actions */}
      {!isLocked && (
        <div className="flex gap-3 pt-4">
          <button
            onClick={handleSave}
            disabled={!hasChanges}
            className="flex-1 py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors"
            style={{
              background: hasChanges ? 'var(--surface)' : 'var(--surface)',
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
            className="flex-1 py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors"
            style={{
              background: validation.isValid ? 'var(--masters)' : 'var(--ink-tertiary)',
              color: 'white',
              opacity: validation.isValid ? 1 : 0.5,
            }}
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
        'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all',
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
  players: Player[];
  onDragStart: (player: Player) => void;
  onDragEnd: () => void;
  isLocked: boolean;
}

function AvailablePlayersPanel({
  team,
  players,
  onDragStart,
  onDragEnd,
  isLocked,
}: AvailablePlayersPanelProps) {
  const color = team === 'A' ? 'var(--team-usa)' : 'var(--team-europe)';

  if (players.length === 0) {
    return (
      <div
        className="p-4 rounded-xl text-center"
        style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}
      >
        <p style={{ color: 'var(--ink-secondary)' }}>
          All players assigned
        </p>
      </div>
    );
  }

  return (
    <div
      className="p-3 rounded-xl"
      style={{
        background: `${color}10`,
        border: `1px solid ${color}30`,
      }}
    >
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
        size === 'sm' ? 'px-2 py-1' : 'px-3 py-2',
      )}
      style={{
        background: 'var(--surface)',
        border: `1px solid ${color}50`,
      }}
    >
      {isDraggable && (
        <GripVertical className="w-3 h-3" style={{ color: 'var(--ink-tertiary)' }} />
      )}

      {player.avatarUrl ? (
        <img
          src={player.avatarUrl}
          alt={player.firstName}
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
        <p
          className="text-xs"
          style={{ color: 'var(--ink-tertiary)' }}
        >
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
  onDrop: (team: 'A' | 'B') => void;
  onRemovePlayer: (playerId: string) => void;
  isDragging: boolean;
  draggedPlayerTeam?: 'A' | 'B';
  isLocked: boolean;
}

function MatchSlotCard({
  match,
  matchNumber,
  playersPerTeam,
  onDrop,
  onRemovePlayer,
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
        'p-4 rounded-2xl transition-all',
        isComplete && 'ring-2 ring-success ring-offset-2 ring-offset-canvas',
      )}
      style={{
        background: 'var(--surface)',
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
              color: isComplete ? 'white' : 'var(--ink-secondary)',
            }}
          >
            {matchNumber}
          </span>
          <span
            className="text-sm font-medium"
            style={{ color: 'var(--ink)' }}
          >
            Match {matchNumber}
          </span>
        </div>

        {match.teamAPlayers.length > 0 && match.teamBPlayers.length > 0 && (
          <div
            className="flex items-center gap-1 text-xs"
            style={{ color: 'var(--ink-tertiary)' }}
          >
            <Scale className="w-3 h-3" />
            {teamAHandicap.toFixed(1)} vs {teamBHandicap.toFixed(1)}
          </div>
        )}
      </div>

      {/* Teams */}
      <div className="grid grid-cols-2 gap-3">
        {/* Team A */}
        <DropZone
          team="A"
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
  players: Player[];
  playersNeeded: number;
  onDrop: () => void;
  onRemovePlayer: (playerId: string) => void;
  isDragging: boolean;
  isLocked: boolean;
}

function DropZone({
  team,
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
      className={cn(
        'p-3 rounded-xl min-h-[80px] transition-all',
        isDragging && 'ring-2 ring-dashed',
      )}
      style={{
        background: `${color}10`,
        border: `1px solid ${color}30`,
      }}
    >
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

function FairnessIndicator({ score }: FairnessIndicatorProps) {
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
        </div>
        <span
          className="text-xl font-bold"
          style={{ color: getColor(score.overall) }}
        >
          {score.overall}%
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-xs" style={{ color: 'var(--ink-tertiary)' }}>Handicap Balance</p>
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
            <span className="text-xs font-medium" style={{ color: getColor(score.handicapBalance) }}>
              {score.handicapBalance}%
            </span>
          </div>
        </div>
        <div>
          <p className="text-xs" style={{ color: 'var(--ink-tertiary)' }}>Experience Balance</p>
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
            <span className="text-xs font-medium" style={{ color: getColor(score.experienceBalance) }}>
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
        <div
          className="p-3 rounded-xl"
          style={{
            background: 'var(--error)',
            color: 'white',
          }}
        >
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-sm">Cannot publish</p>
              <ul className="mt-1 text-xs text-white/80 space-y-0.5">
                {errors.slice(0, 3).map((error, i) => (
                  <li key={i}>• {error}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {warnings.length > 0 && (
        <div
          className="p-3 rounded-xl"
          style={{
            background: 'var(--warning)',
            color: 'white',
          }}
        >
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-sm">Warnings</p>
              <ul className="mt-1 text-xs text-white/80 space-y-0.5">
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
