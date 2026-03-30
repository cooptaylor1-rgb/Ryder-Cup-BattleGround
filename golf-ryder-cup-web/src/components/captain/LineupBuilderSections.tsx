'use client';

import { cn } from '@/lib/utils';
import {
  Lock,
  CheckCircle2,
  Shuffle,
  Save,
} from 'lucide-react';

import type { LineupBuilderModel } from './lineupBuilderModel';
import type { LineupBuilderActions } from './useLineupBuilderActions';
import type { SessionConfig } from './lineupBuilderTypes';

import {
  AvailablePlayersPanel,
  RosterToggle,
  MatchSlotCard,
  FairnessIndicator,
  ValidationPanel,
  BuilderFact,
  BuilderStatusPill,
} from './lineup';

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
