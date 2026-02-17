/**
 * Poll Card Component
 *
 * Production-ready poll display and voting component.
 * Supports single/multiple choice, anonymous voting, and live results.
 */

'use client';

import { useState, useCallback, useMemo } from 'react';
import {
  Check,
  Clock,
  Plus,
  Users,
  Lock,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Poll, PollOption, PollStatus } from '@/lib/types/social';
import { vote, addPollOption, closePoll } from '@/lib/services/pollService';

interface PollCardProps {
  poll: Poll;
  currentPlayerId: string;
  currentPlayerName: string;
  onVote?: (pollId: string, optionIds: string[]) => void;
  onClose?: (pollId: string) => void;
  onOptionAdded?: (poll: Poll) => void;
  compact?: boolean;
  className?: string;
}

export function PollCard({
  poll,
  currentPlayerId,
  currentPlayerName: _currentPlayerName,
  onVote,
  onClose,
  onOptionAdded,
  compact = false,
  className,
}: PollCardProps) {
  const [selectedOptions, setSelectedOptions] = useState<Set<string>>(new Set());
  const [isVoting, setIsVoting] = useState(false);
  const [showAddOption, setShowAddOption] = useState(false);
  const [newOptionText, setNewOptionText] = useState('');
  const [showAllOptions, setShowAllOptions] = useState(!compact);

  // Check if current user has already voted
  const hasVoted = useMemo(() => {
    return poll.options.some(opt => opt.votes.includes(currentPlayerId));
  }, [poll.options, currentPlayerId]);

  // Get user's previous votes
  const previousVotes = useMemo(() => {
    return poll.options
      .filter(opt => opt.votes.includes(currentPlayerId))
      .map(opt => opt.id);
  }, [poll.options, currentPlayerId]);

  // Calculate total votes
  const totalVotes = useMemo(() => {
    return poll.options.reduce((sum, opt) => sum + opt.votes.length, 0);
  }, [poll.options]);

  // Sort options by vote count for results view
  const sortedOptions = useMemo(() => {
    if (!hasVoted && poll.status === 'active') {
      return poll.options;
    }
    return [...poll.options].sort((a, b) => b.votes.length - a.votes.length);
  }, [poll.options, hasVoted, poll.status]);

  const visibleOptions = showAllOptions ? sortedOptions : sortedOptions.slice(0, 4);
  const hasMoreOptions = sortedOptions.length > 4;

  const isExpired = Boolean(poll.expiresAt && new Date(poll.expiresAt) < new Date());
  const canVote = poll.status === 'active' && !isExpired && !hasVoted;
  const showResults = hasVoted || poll.status === 'closed' || isExpired;

  const handleOptionSelect = useCallback((optionId: string) => {
    if (!canVote) return;

    setSelectedOptions(prev => {
      const next = new Set(prev);
      if (poll.type === 'single') {
        // Single choice - clear all and select new
        next.clear();
        next.add(optionId);
      } else {
        // Multiple choice - toggle
        if (next.has(optionId)) {
          next.delete(optionId);
        } else {
          next.add(optionId);
        }
      }
      return next;
    });
  }, [canVote, poll.type]);

  const handleVote = useCallback(async () => {
    if (selectedOptions.size === 0 || isVoting) return;

    setIsVoting(true);
    try {
      const optionIds = Array.from(selectedOptions);
      await vote(poll.id, currentPlayerId, optionIds);
      onVote?.(poll.id, optionIds);
    } catch (error) {
      console.error('Failed to vote:', error);
    } finally {
      setIsVoting(false);
    }
  }, [selectedOptions, isVoting, poll.id, currentPlayerId, onVote]);

  const handleAddOption = useCallback(async () => {
    if (!newOptionText.trim()) return;

    try {
      const updatedPoll = await addPollOption(poll.id, newOptionText.trim(), currentPlayerId);
      if (updatedPoll) {
        onOptionAdded?.(updatedPoll);
      }
      setNewOptionText('');
      setShowAddOption(false);
    } catch (error) {
      console.error('Failed to add option:', error);
    }
  }, [poll.id, newOptionText, currentPlayerId, onOptionAdded]);

  const handleClose = useCallback(async () => {
    try {
      await closePoll(poll.id);
      onClose?.(poll.id);
    } catch (error) {
      console.error('Failed to close poll:', error);
    }
  }, [poll.id, onClose]);

  const getPercentage = (votes: number) => {
    if (totalVotes === 0) return 0;
    return Math.round((votes / totalVotes) * 100);
  };

  const formatTimeRemaining = () => {
    if (!poll.expiresAt) return null;
    const expires = new Date(poll.expiresAt);
    const now = new Date();
    const diff = expires.getTime() - now.getTime();

    if (diff <= 0) return 'Expired';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}d remaining`;
    }
    if (hours > 0) return `${hours}h ${minutes}m remaining`;
    return `${minutes}m remaining`;
  };

  return (
    <div className={cn('card rounded-xl overflow-hidden', className)}>
      {/* Header */}
      <div className="p-4 border-b border-[var(--rule)]">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="type-body-lg font-semibold text-[var(--ink-primary)] mb-1">
              {poll.question}
            </h3>
            {poll.description && (
              <p className="type-caption text-[var(--ink-tertiary)] line-clamp-2">
                {poll.description}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            {poll.isAnonymous && (
              <span title="Anonymous voting" className="text-[var(--ink-tertiary)]">
                <Lock size={14} />
              </span>
            )}
            <StatusBadge status={poll.status} isExpired={isExpired} />
          </div>
        </div>

        {/* Meta info */}
        <div className="flex items-center gap-4 mt-3 type-caption text-[var(--ink-tertiary)]">
          <span className="flex items-center gap-1">
            <Users size={12} />
            {totalVotes} vote{totalVotes !== 1 ? 's' : ''}
          </span>
          {poll.expiresAt && (
            <span className="flex items-center gap-1">
              <Clock size={12} />
              {formatTimeRemaining()}
            </span>
          )}
          <span>by {poll.creatorName}</span>
        </div>
      </div>

      {/* Options */}
      <div className="p-4 space-y-2">
        {visibleOptions.map(option => (
          <PollOption
            key={option.id}
            option={option}
            isSelected={selectedOptions.has(option.id) || previousVotes.includes(option.id)}
            showResults={showResults}
            percentage={getPercentage(option.votes.length)}
            canVote={canVote}
            isLeading={showResults && option.votes.length === Math.max(...poll.options.map(o => o.votes.length))}
            onSelect={() => handleOptionSelect(option.id)}
          />
        ))}

        {hasMoreOptions && !showAllOptions && (
          <button
            onClick={() => setShowAllOptions(true)}
            className="w-full py-2 text-center type-caption text-[var(--accent)] hover:text-[var(--accent-hover)] flex items-center justify-center gap-1"
          >
            Show {sortedOptions.length - 4} more options
            <ChevronDown size={14} />
          </button>
        )}

        {hasMoreOptions && showAllOptions && compact && (
          <button
            onClick={() => setShowAllOptions(false)}
            className="w-full py-2 text-center type-caption text-[var(--accent)] hover:text-[var(--accent-hover)] flex items-center justify-center gap-1"
          >
            Show less
            <ChevronUp size={14} />
          </button>
        )}

        {/* Add option */}
        {poll.allowAddOptions && poll.status === 'active' && !isExpired && (
          <div className="pt-2">
            {showAddOption ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newOptionText}
                  onChange={e => setNewOptionText(e.target.value)}
                  placeholder="Add an option..."
                  className="input-premium flex-1"
                  autoFocus
                />
                <button
                  onClick={handleAddOption}
                  disabled={!newOptionText.trim()}
                  className="btn-primary px-4"
                >
                  Add
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowAddOption(true)}
                className="w-full py-2 border-2 border-dashed border-[color:var(--rule)]/40 rounded-lg text-[var(--ink-tertiary)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors flex items-center justify-center gap-2 type-caption"
              >
                <Plus size={14} />
                Add option
              </button>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      {(canVote || poll.createdById === currentPlayerId) && (
        <div className="px-4 pb-4 flex gap-2">
          {canVote && (
            <button
              onClick={handleVote}
              disabled={selectedOptions.size === 0 || isVoting}
              className="btn-primary flex-1"
            >
              {isVoting ? 'Voting...' : 'Vote'}
            </button>
          )}
          {poll.createdById === currentPlayerId && poll.status === 'active' && (
            <button
              onClick={handleClose}
              className="btn-ghost px-4"
            >
              Close Poll
            </button>
          )}
        </div>
      )}
    </div>
  );
}

interface PollOptionProps {
  option: PollOption;
  isSelected: boolean;
  showResults: boolean;
  percentage: number;
  canVote: boolean;
  isLeading: boolean;
  onSelect: () => void;
}

function PollOption({
  option,
  isSelected,
  showResults,
  percentage,
  canVote,
  isLeading,
  onSelect,
}: PollOptionProps) {
  return (
    <button
      onClick={onSelect}
      disabled={!canVote}
      className={cn(
        'relative w-full rounded-lg text-left transition-all',
        canVote && 'hover:bg-[var(--surface-secondary)] cursor-pointer',
        !canVote && 'cursor-default',
        isSelected && canVote && 'ring-2 ring-[var(--accent)]',
        isSelected && !canVote && 'bg-[color:var(--accent)]/10'
      )}
    >
      {/* Progress bar background */}
      {showResults && (
        <div
          className={cn(
            'absolute inset-0 rounded-lg transition-all',
            isLeading ? 'bg-[color:var(--masters)]/20' : 'bg-[var(--surface-secondary)]'
          )}
          style={{ width: `${percentage}%` }}
        />
      )}

      <div className="relative flex items-center gap-3 p-3">
        {/* Checkbox/Radio indicator */}
        <div className={cn(
          'shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors',
          isSelected
            ? 'border-[var(--accent)] bg-[var(--accent)]'
            : 'border-[color:var(--rule)]/60'
        )}>
          {isSelected && <Check size={12} className="text-[var(--canvas)]" />}
        </div>

        {/* Option content */}
        <div className="flex-1 min-w-0">
          <span className={cn(
            'type-body flex items-center gap-2',
            isLeading && showResults && 'font-semibold'
          )}>
            {option.emoji && <span>{option.emoji}</span>}
            {option.text}
          </span>
        </div>

        {/* Results */}
        {showResults && (
          <div className="flex items-center gap-2 type-caption">
            <span className="text-[var(--ink-tertiary)]">
              {option.votes.length}
            </span>
            <span className={cn(
              'font-semibold min-w-[3ch] text-right',
              isLeading ? 'text-[var(--masters)]' : 'text-[var(--ink-secondary)]'
            )}>
              {percentage}%
            </span>
          </div>
        )}
      </div>
    </button>
  );
}

interface StatusBadgeProps {
  status: PollStatus;
  isExpired?: boolean;
}

function StatusBadge({ status, isExpired }: StatusBadgeProps) {
  if (status === 'closed' || isExpired) {
    return (
      <span className="px-2 py-0.5 rounded-full bg-[var(--surface-secondary)] text-[var(--ink-tertiary)] type-caption">
        Closed
      </span>
    );
  }

  if (status === 'cancelled') {
    return (
      <span className="px-2 py-0.5 rounded-full bg-[color:var(--error)]/12 text-[var(--error)] type-caption">
        Cancelled
      </span>
    );
  }

  return (
    <span className="px-2 py-0.5 rounded-full bg-[color:var(--masters)]/20 text-[var(--masters)] type-caption">
      Active
    </span>
  );
}

export default PollCard;
