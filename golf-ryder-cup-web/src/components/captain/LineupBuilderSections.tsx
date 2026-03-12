'use client';

import { useState, type ReactNode } from 'react';
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

import type { LineupBuilderModel } from './lineupBuilderModel';
import type { LineupBuilderActions } from './useLineupBuilderActions';
import type { BuilderTeam, FairnessScore, MatchSlot, Player, SessionConfig } from './lineupBuilderTypes';

interface LineupBuilderSectionsProps {
  session: SessionConfig;
  teamALabel: string;
  teamBLabel: string;
  model: LineupBuilderModel;
  actions: LineupBuilderActions;
  isLocked: boolean;
  className?: string;
  canAutoFill: boolean;
  onPublish: () => void;
}

export function LineupBuilderSections({
  session,
  teamALabel,
  teamBLabel,
  model,
  actions,
  isLocked,
  className,
  canAutoFill,
  onPublish,
}: LineupBuilderSectionsProps) {
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
          ) : canAutoFill ? (
            <button
              onClick={actions.handleAutoFill}
              className="inline-flex items-center gap-2 rounded-full border border-[color:rgba(0,102,68,0.15)] bg-[linear-gradient(135deg,rgba(0,102,68,0.12)_0%,rgba(255,255,255,0.72)_100%)] px-4 py-2 text-sm font-semibold text-[var(--masters)]"
            >
              <Shuffle className="h-4 w-4" />
              Auto-fill
            </button>
          ) : null}
        </div>

        <div className="mt-[var(--space-6)] grid grid-cols-3 gap-3">
          <BuilderFact label="Assigned" value={`${model.totalAssigned}/${model.totalPlayers}`} />
          <BuilderFact label={teamALabel} value={model.availableTeamA.length} note="available" />
          <BuilderFact label={teamBLabel} value={model.availableTeamB.length} note="available" />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-start">
        <div className="space-y-4">
          {model.fairness && <FairnessIndicator score={model.fairness} />}

          {(model.validation.errors.length > 0 || model.validation.warnings.length > 0) && (
            <ValidationPanel
              errors={model.validation.errors}
              warnings={model.validation.warnings}
            />
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
                label={`${teamALabel} (${model.availableTeamA.length})`}
                isActive={actions.showRoster === 'A'}
                onClick={() => actions.toggleRoster('A')}
              />
              <RosterToggle
                team="B"
                label={`${teamBLabel} (${model.availableTeamB.length})`}
                isActive={actions.showRoster === 'B'}
                onClick={() => actions.toggleRoster('B')}
              />
            </div>

            {actions.showRoster && (
              <div className="mt-[var(--space-4)]">
                <AvailablePlayersPanel
                  team={actions.showRoster}
                  teamLabel={actions.showRoster === 'A' ? teamALabel : teamBLabel}
                  players={actions.showRoster === 'A' ? model.availableTeamA : model.availableTeamB}
                  onDragStart={actions.handleDragStart}
                  onDragEnd={actions.handleDragEnd}
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
            {actions.hasChanges && !isLocked && (
              <BuilderStatusPill
                label="Unsaved"
                icon={<Save className="h-4 w-4" />}
                tone="masters"
              />
            )}
          </div>

          <div className="space-y-3">
            {actions.matches.map((match, index) => (
              <MatchSlotCard
                key={match.id}
                match={match}
                matchNumber={index + 1}
                playersPerTeam={session.playersPerTeam}
                teamALabel={teamALabel}
                teamBLabel={teamBLabel}
                onDrop={(team) => actions.handleDropOnMatch(match.id, team)}
                onRemovePlayer={(playerId) => actions.handleRemovePlayer(match.id, playerId)}
                onDeleteMatch={() => actions.handleDeleteMatch(match.id)}
                isDragging={Boolean(actions.draggedPlayer)}
                draggedPlayerTeam={actions.draggedPlayer?.team}
                isLocked={isLocked}
              />
            ))}
          </div>
        </div>
      </div>

      {!isLocked && (
        <div className="flex gap-3 pt-2">
          <button
            onClick={actions.handleSave}
            disabled={!actions.hasChanges}
            className="flex-1 rounded-[22px] border px-4 py-3 font-medium flex items-center justify-center gap-2 transition-colors"
            style={{
              background: 'var(--surface)',
              color: actions.hasChanges ? 'var(--masters)' : 'var(--ink-tertiary)',
              border: '1px solid var(--rule)',
              opacity: actions.hasChanges ? 1 : 0.5,
            }}
          >
            <Save className="w-5 h-5" />
            Save Draft
          </button>
          <button
            onClick={onPublish}
            disabled={!model.validation.isValid}
            className={cn(
              'flex-1 rounded-[22px] py-3 font-medium flex items-center justify-center gap-2 transition-colors text-[var(--canvas)]',
              model.validation.isValid
                ? 'bg-[var(--masters)]'
                : 'bg-[var(--ink-tertiary)] opacity-50'
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

interface RosterToggleProps {
  team: BuilderTeam;
  label: string;
  isActive: boolean;
  onClick: () => void;
}

function RosterToggle({ team, label, isActive, onClick }: RosterToggleProps) {
  const color = team === 'A' ? 'var(--team-usa)' : 'var(--team-europe)';

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all"
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

interface AvailablePlayersPanelProps {
  team: BuilderTeam;
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
      {isDraggable && (
        <GripVertical className="w-3 h-3" style={{ color: 'var(--ink-tertiary)' }} />
      )}

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
          onClick={(event) => {
            event.stopPropagation();
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

interface MatchSlotCardProps {
  match: MatchSlot;
  matchNumber: number;
  playersPerTeam: number;
  teamALabel: string;
  teamBLabel: string;
  onDrop: (team: BuilderTeam) => void;
  onRemovePlayer: (playerId: string) => void;
  onDeleteMatch: () => void;
  isDragging: boolean;
  draggedPlayerTeam?: BuilderTeam;
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

  const teamAHandicap = match.teamAPlayers.reduce((sum, player) => sum + player.handicapIndex, 0);
  const teamBHandicap = match.teamBPlayers.reduce((sum, player) => sum + player.handicapIndex, 0);

  return (
    <div
      className={cn(
        'rounded-[28px] border p-4 transition-all sm:p-5',
        isComplete && 'ring-2 ring-success ring-offset-2 ring-offset-canvas'
      )}
      style={{
        background:
          'linear-gradient(180deg, rgba(255,255,255,0.78) 0%, rgba(245,240,233,0.96) 100%)',
        border: '1px solid var(--rule)',
      }}
    >
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
            <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--ink-tertiary)' }}>
              <Scale className="w-3 h-3" />
              {teamAHandicap.toFixed(1)} vs {teamBHandicap.toFixed(1)}
            </div>
          )}

          {!isLocked && (
            <div className="relative group">
              <button
                onClick={onDeleteMatch}
                className="p-1.5 rounded-lg transition-colors text-[var(--error)] hover:bg-[color:var(--error)]/10"
                aria-label={`Delete Match ${matchNumber}`}
              >
                <Trash2 className="w-4 h-4" />
              </button>
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

      <div className="grid grid-cols-2 gap-3">
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

interface DropZoneProps {
  team: BuilderTeam;
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
      onDragOver={(event) => {
        event.preventDefault();
        if (!isLocked) event.dataTransfer.dropEffect = 'move';
      }}
      onDrop={(event) => {
        event.preventDefault();
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

function FairnessIndicator({ score }: { score: FairnessScore }) {
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
          <button
            onClick={() => setShowInfo((current) => !current)}
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
        <FairnessMetric
          label="Handicap Balance"
          value={score.handicapBalance}
          color={getColor(score.handicapBalance)}
        />
        <FairnessMetric
          label="Experience Balance"
          value={score.experienceBalance}
          color={getColor(score.experienceBalance)}
        />
      </div>
    </div>
  );
}

function FairnessMetric({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div>
      <p className="text-xs" style={{ color: 'var(--ink-tertiary)' }}>
        {label}
      </p>
      <div className="flex items-center gap-2 mt-1">
        <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'var(--rule)' }}>
          <div
            className="h-full rounded-full"
            style={{
              width: `${value}%`,
              background: color,
            }}
          />
        </div>
        <span className="text-xs font-medium" style={{ color }}>
          {value}%
        </span>
      </div>
    </div>
  );
}

function ValidationPanel({
  errors,
  warnings,
}: {
  errors: string[];
  warnings: string[];
}) {
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
                {errors.slice(0, 3).map((error, index) => (
                  <li key={index}>• {error}</li>
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
                {warnings.map((warning, index) => (
                  <li key={index}>• {warning}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
