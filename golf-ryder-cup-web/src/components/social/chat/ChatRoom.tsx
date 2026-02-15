/**
 * Chat Room Component
 *
 * Production-ready chat room with message input, thread support, and real-time updates.
 */

'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  Send,
  Smile,
  Hash,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLiveQuery } from '@/lib/db';
import type { ChatMessage as ChatMessageType } from '@/lib/types/social';
import { sendMessage, getMessages, createDefaultThreads, getTripThreads } from '@/lib/services/socialService';
import { ChatMessage } from './ChatMessage';

interface ChatRoomProps {
  tripId: string;
  currentPlayerId: string;
  currentPlayerName: string;
  teamAName?: string;
  teamBName?: string;
  className?: string;
}

const QUICK_EMOJIS = ['👍', '😂', '🔥', '❤️', '⛳', '💪', '👏', '🎯', '🍺', '🏆'];

export function ChatRoom({
  tripId,
  currentPlayerId,
  currentPlayerName,
  teamAName = 'USA',
  teamBName = 'Europe',
  className,
}: ChatRoomProps) {
  const [message, setMessage] = useState('');
  const [selectedThread, setSelectedThread] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [replyingTo, setReplyingTo] = useState<ChatMessageType | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Get threads for this trip
  const threads = useLiveQuery(
    async () => {
      let existingThreads = await getTripThreads(tripId);
      if (existingThreads.length === 0) {
        // Create default threads if none exist
        existingThreads = await createDefaultThreads(tripId, teamAName, teamBName);
      }
      return existingThreads;
    },
    [tripId, teamAName, teamBName],
    []
  );

  // Get messages for current thread or all trip messages
  const messages = useLiveQuery(
    async () => {
      return getMessages(tripId, selectedThread || undefined, 100);
    },
    [tripId, selectedThread],
    []
  );

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages?.length]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSend = useCallback(async () => {
    if (!message.trim()) return;

    setIsLoading(true);
    try {
      await sendMessage(
        tripId,
        selectedThread || undefined,
        currentPlayerId,
        currentPlayerName,
        message.trim(),
        'text',
        {
          replyToId: replyingTo?.id,
        }
      );
      setMessage('');
      setReplyingTo(null);
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsLoading(false);
    }
  }, [tripId, selectedThread, currentPlayerId, currentPlayerName, message, replyingTo]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  const insertEmoji = useCallback((emoji: string) => {
    setMessage(prev => prev + emoji);
    setShowEmojiPicker(false);
    inputRef.current?.focus();
  }, []);

  const handleReply = useCallback((msg: ChatMessageType) => {
    setReplyingTo(msg);
    inputRef.current?.focus();
  }, []);

  // Group messages by date
  const groupedMessages = useMemo(() => {
    if (!messages) return [];

    const groups: { date: string; messages: ChatMessageType[] }[] = [];
    let currentDate = '';

    for (const msg of messages) {
      const msgDate = new Date(msg.timestamp).toLocaleDateString();
      if (msgDate !== currentDate) {
        currentDate = msgDate;
        groups.push({ date: currentDate, messages: [] });
      }
      groups[groups.length - 1].messages.push(msg);
    }

    return groups;
  }, [messages]);

  const formatDateHeader = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toLocaleDateString() === today.toLocaleDateString()) {
      return 'Today';
    }
    if (date.toLocaleDateString() === yesterday.toLocaleDateString()) {
      return 'Yesterday';
    }
    return date.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
  };

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Thread selector */}
      {threads && threads.length > 0 && (
        <div className="flex gap-2 p-3 border-b border-[var(--surface-tertiary)] overflow-x-auto shrink-0">
          <button
            onClick={() => setSelectedThread(null)}
            className={cn(
              'px-3 py-1.5 rounded-full type-caption font-medium whitespace-nowrap transition-colors',
              !selectedThread
                ? 'bg-[var(--accent)] text-[var(--canvas)]'
                : 'bg-[var(--surface-secondary)] text-[var(--ink-secondary)] hover:bg-[var(--surface-tertiary)]'
            )}
          >
            <Hash size={12} className="inline mr-1" />
            All
          </button>
          {threads.map(thread => (
            <button
              key={thread.id}
              onClick={() => setSelectedThread(thread.id)}
              className={cn(
                'px-3 py-1.5 rounded-full type-caption font-medium whitespace-nowrap transition-colors',
                selectedThread === thread.id
                  ? 'bg-[var(--accent)] text-[var(--canvas)]'
                  : 'bg-[var(--surface-secondary)] text-[var(--ink-secondary)] hover:bg-[var(--surface-tertiary)]'
              )}
            >
              <Hash size={12} className="inline mr-1" />
              {thread.name}
            </button>
          ))}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-4">
        {groupedMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-[var(--ink-tertiary)] p-8">
            <div className="w-16 h-16 rounded-full bg-[var(--surface-secondary)] flex items-center justify-center mb-4">
              <span className="text-3xl">💬</span>
            </div>
            <p className="type-body-lg font-medium mb-1">No messages yet</p>
            <p className="type-caption text-center">
              Start the conversation! Share updates, trash talk, or coordinate your next round.
            </p>
          </div>
        ) : (
          <>
            {groupedMessages.map((group, groupIndex) => (
              <div key={groupIndex}>
                {/* Date separator */}
                <div className="flex items-center gap-4 px-4 py-3">
                  <div className="flex-1 h-px bg-[var(--surface-tertiary)]" />
                  <span className="type-caption text-[var(--ink-tertiary)] font-medium">
                    {formatDateHeader(group.date)}
                  </span>
                  <div className="flex-1 h-px bg-[var(--surface-tertiary)]" />
                </div>

                {/* Messages */}
                {group.messages.map((msg, msgIndex) => {
                  const prevMsg = msgIndex > 0 ? group.messages[msgIndex - 1] : null;
                  const isCompact =
                    prevMsg &&
                    prevMsg.senderId === msg.senderId &&
                    new Date(msg.timestamp).getTime() - new Date(prevMsg.timestamp).getTime() < 5 * 60 * 1000;

                  return (
                    <ChatMessage
                      key={msg.id}
                      message={msg}
                      currentPlayerId={currentPlayerId}
                      currentPlayerName={currentPlayerName}
                      compact={isCompact || false}
                      onReply={handleReply}
                      onReactionChange={() => {
                        // Trigger re-query
                      }}
                    />
                  );
                })}
              </div>
            ))}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Reply indicator */}
      {replyingTo && (
        <div className="px-4 py-2 bg-[var(--surface-secondary)] border-t border-[var(--surface-tertiary)] flex items-center gap-2">
          <div className="flex-1 min-w-0">
            <span className="type-caption text-[var(--ink-tertiary)]">
              Replying to <strong>{replyingTo.senderName}</strong>
            </span>
            <p className="type-caption text-[var(--ink-secondary)] truncate">
              {replyingTo.content}
            </p>
          </div>
          <button
            onClick={() => setReplyingTo(null)}
            className="p-1 rounded hover:bg-[var(--surface-tertiary)] text-[var(--ink-tertiary)]"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-[var(--surface-tertiary)] shrink-0">
        <div className="flex items-end gap-2">
          {/* Emoji picker */}
          <div className="relative">
            <button
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className={cn(
                'p-2 rounded-lg transition-colors',
                showEmojiPicker
                  ? 'bg-[var(--accent)] text-[var(--canvas)]'
                  : 'text-[var(--ink-tertiary)] hover:bg-[var(--surface-secondary)]'
              )}
            >
              <Smile size={20} />
            </button>

            {showEmojiPicker && (
              <div className="absolute bottom-full left-0 mb-2 p-2 bg-[var(--surface-primary)] rounded-xl shadow-lg border border-[var(--surface-tertiary)] grid grid-cols-5 gap-1">
                {QUICK_EMOJIS.map(emoji => (
                  <button
                    key={emoji}
                    onClick={() => insertEmoji(emoji)}
                    className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-[var(--surface-secondary)] text-lg transition-colors"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Text input */}
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              value={message}
              onChange={e => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              className="input-premium w-full pr-10"
              disabled={isLoading}
            />
          </div>

          {/* Send button */}
          <button
            onClick={handleSend}
            disabled={!message.trim() || isLoading}
            className={cn(
              'p-2 rounded-lg transition-all',
              message.trim()
                ? 'bg-[var(--accent)] text-[var(--canvas)] hover:bg-[var(--accent-hover)]'
                : 'bg-[var(--surface-secondary)] text-[var(--ink-tertiary)]'
            )}
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default ChatRoom;
