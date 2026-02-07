/**
 * Chat Message Component
 *
 * Production-ready chat message display with reactions and replies.
 */

'use client';

import { useState, useCallback, useMemo } from 'react';
import { Reply, Smile, Edit, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ChatMessage as ChatMessageType } from '@/lib/types/social';
import { addReaction, removeReaction, editMessage, deleteMessage } from '@/lib/services/socialService';

interface ChatMessageProps {
  message: ChatMessageType;
  currentPlayerId: string;
  currentPlayerName: string;
  onReply?: (message: ChatMessageType) => void;
  onReactionChange?: () => void;
  compact?: boolean;
  className?: string;
}

const QUICK_REACTIONS = ['👍', '😂', '🔥', '❤️', '⛳', '💪'];

export function ChatMessage({
  message,
  currentPlayerId,
  currentPlayerName: _currentPlayerName,
  onReply,
  onReactionChange,
  compact = false,
  className,
}: ChatMessageProps) {
  const [showActions, setShowActions] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(message.content);

  const isOwn = message.senderId === currentPlayerId;
  const isMentioned = message.mentions?.includes(currentPlayerId);

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  };

  const _formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  // Group reactions by emoji
  const groupedReactions = useMemo(() => {
    return message.reactions.reduce((acc, reaction) => {
      const existing = acc.find(r => r.emoji === reaction.emoji);
      if (existing) {
        existing.count = reaction.playerIds.length;
        existing.hasOwn = reaction.playerIds.includes(currentPlayerId);
      } else {
        acc.push({
          emoji: reaction.emoji,
          count: reaction.playerIds.length,
          hasOwn: reaction.playerIds.includes(currentPlayerId),
        });
      }
      return acc;
    }, [] as { emoji: string; count: number; hasOwn: boolean }[]);
  }, [message.reactions, currentPlayerId]);

  const handleToggleReaction = useCallback(async (emoji: string) => {
    const existingReaction = message.reactions.find(r => r.emoji === emoji);
    const hasOwn = existingReaction?.playerIds.includes(currentPlayerId);

    try {
      if (hasOwn) {
        await removeReaction(message.id, emoji, currentPlayerId);
      } else {
        await addReaction(message.id, emoji, currentPlayerId);
      }
      onReactionChange?.();
    } catch (error) {
      console.error('Failed to toggle reaction:', error);
    }
    setShowReactions(false);
  }, [message.id, message.reactions, currentPlayerId, onReactionChange]);

  const handleEdit = useCallback(async () => {
    if (!editText.trim() || editText === message.content) {
      setIsEditing(false);
      return;
    }

    try {
      await editMessage(message.id, editText.trim());
      setIsEditing(false);
      onReactionChange?.();
    } catch (error) {
      console.error('Failed to edit message:', error);
    }
  }, [message.id, message.content, editText, onReactionChange]);

  const handleDelete = useCallback(async () => {
    if (!confirm('Delete this message?')) return;

    try {
      await deleteMessage(message.id);
      onReactionChange?.();
    } catch (error) {
      console.error('Failed to delete message:', error);
    }
  }, [message.id, onReactionChange]);

  if (message.isDeleted) {
    return (
      <div className={cn('py-1 px-4 text-[var(--ink-tertiary)] type-caption italic', className)}>
        Message deleted
      </div>
    );
  }

  // System messages
  if (message.type === 'system' || message.type === 'score_update') {
    return (
      <div className={cn(
        'py-2 px-4 text-center',
        className
      )}>
        <span className={cn(
          'inline-block px-3 py-1 rounded-full type-caption',
          message.type === 'score_update'
            ? 'bg-[var(--masters)]/20 text-[var(--masters)]'
            : 'bg-[var(--surface-secondary)] text-[var(--ink-tertiary)]'
        )}>
          {message.content}
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'group relative px-4 py-1',
        isMentioned && 'bg-[var(--accent)]/5',
        className
      )}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => {
        setShowActions(false);
        setShowReactions(false);
      }}
    >
      <div className={cn('flex gap-3', isOwn && 'flex-row-reverse')}>
        {/* Avatar */}
        {!compact && (
          <div className={cn(
            'shrink-0 w-8 h-8 rounded-full flex items-center justify-center type-caption font-semibold',
            isOwn
              ? 'bg-[var(--accent)] text-white'
              : 'bg-[var(--surface-secondary)] text-[var(--ink-secondary)]'
          )}>
            {message.senderName.charAt(0).toUpperCase()}
          </div>
        )}

        {/* Message content */}
        <div className={cn('flex-1 min-w-0', isOwn && 'text-right')}>
          {/* Header */}
          {!compact && (
            <div className={cn(
              'flex items-baseline gap-2 mb-1',
              isOwn && 'flex-row-reverse'
            )}>
              <span className="type-caption font-semibold text-[var(--ink-primary)]">
                {isOwn ? 'You' : message.senderName}
              </span>
              <span className="type-caption text-[var(--ink-tertiary)]">
                {formatTime(message.timestamp)}
              </span>
              {message.isEdited && (
                <span className="type-caption text-[var(--ink-tertiary)]">(edited)</span>
              )}
            </div>
          )}

          {/* Content */}
          {isEditing ? (
            <div className="flex gap-2">
              <input
                type="text"
                value={editText}
                onChange={e => setEditText(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleEdit();
                  if (e.key === 'Escape') setIsEditing(false);
                }}
                className="input-premium flex-1"
                autoFocus
              />
              <button onClick={handleEdit} className="btn-primary px-3">Save</button>
              <button onClick={() => setIsEditing(false)} className="btn-ghost px-3">Cancel</button>
            </div>
          ) : (
            <div className={cn(
              'inline-block rounded-2xl px-4 py-2 max-w-[85%]',
              isOwn
                ? 'bg-[var(--accent)] text-white rounded-br-md'
                : 'bg-[var(--surface-secondary)] text-[var(--ink-primary)] rounded-bl-md'
            )}>
              {message.imageUrl && (
                <img
                  src={message.imageUrl}
                  alt="Shared image"
                  className="max-w-full rounded-lg mb-2"
                />
              )}
              {message.gifUrl && (
                <img
                  src={message.gifUrl}
                  alt="GIF"
                  className="max-w-full rounded-lg mb-2"
                />
              )}
              <p className="type-body whitespace-pre-wrap break-words">
                {message.content}
              </p>
            </div>
          )}

          {/* Reactions */}
          {groupedReactions.length > 0 && (
            <div className={cn(
              'flex flex-wrap gap-1 mt-1',
              isOwn && 'justify-end'
            )}>
              {groupedReactions.map(reaction => (
                <button
                  key={reaction.emoji}
                  onClick={() => handleToggleReaction(reaction.emoji)}
                  className={cn(
                    'inline-flex items-center gap-1 px-2 py-0.5 rounded-full type-caption transition-colors',
                    reaction.hasOwn
                      ? 'bg-[var(--accent)]/20 text-[var(--accent)]'
                      : 'bg-[var(--surface-secondary)] text-[var(--ink-secondary)] hover:bg-[var(--surface-tertiary)]'
                  )}
                >
                  <span>{reaction.emoji}</span>
                  <span>{reaction.count}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Hover actions */}
      {showActions && !isEditing && (
        <div className={cn(
          'absolute top-0 z-10 flex items-center gap-1 bg-[var(--surface-primary)] rounded-lg shadow-lg border border-[var(--surface-tertiary)] p-1',
          isOwn ? 'left-4' : 'right-4'
        )}>
          {/* Quick reactions */}
          {showReactions ? (
            <div className="flex items-center gap-1 p-1">
              {QUICK_REACTIONS.map(emoji => (
                <button
                  key={emoji}
                  onClick={() => handleToggleReaction(emoji)}
                  className="w-7 h-7 flex items-center justify-center rounded hover:bg-[var(--surface-secondary)] transition-colors"
                >
                  {emoji}
                </button>
              ))}
            </div>
          ) : (
            <>
              <button
                onClick={() => setShowReactions(true)}
                className="p-1.5 rounded hover:bg-[var(--surface-secondary)] text-[var(--ink-tertiary)] hover:text-[var(--ink-primary)] transition-colors"
                title="React"
              >
                <Smile size={16} />
              </button>
              {onReply && (
                <button
                  onClick={() => onReply(message)}
                  className="p-1.5 rounded hover:bg-[var(--surface-secondary)] text-[var(--ink-tertiary)] hover:text-[var(--ink-primary)] transition-colors"
                  title="Reply"
                >
                  <Reply size={16} />
                </button>
              )}
              {isOwn && (
                <>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="p-1.5 rounded hover:bg-[var(--surface-secondary)] text-[var(--ink-tertiary)] hover:text-[var(--ink-primary)] transition-colors"
                    title="Edit"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={handleDelete}
                    className="p-1.5 rounded hover:bg-[var(--surface-secondary)] text-[var(--ink-tertiary)] hover:text-red-500 transition-colors"
                    title="Delete"
                  >
                    <Trash2 size={16} />
                  </button>
                </>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default ChatMessage;
