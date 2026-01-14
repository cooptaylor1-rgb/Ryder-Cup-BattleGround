/**
 * Reaction Picker Component
 *
 * Emoji reaction system for comments, photos, and match moments.
 * Golf-themed reactions with smooth animations.
 *
 * Features:
 * - Quick reactions bar
 * - Full emoji picker popup
 * - Reaction counts display
 * - Animated add/remove
 */

'use client';

import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Plus, X } from 'lucide-react';

// ============================================
// TYPES
// ============================================

export interface Reaction {
  emoji: string;
  count: number;
  hasReacted: boolean;
}

export interface ReactionData {
  [emoji: string]: Reaction;
}

interface ReactionPickerProps {
  reactions: ReactionData;
  onReact: (emoji: string) => void;
  onRemoveReaction: (emoji: string) => void;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

// ============================================
// REACTION EMOJIS
// ============================================

const quickReactions = ['🔥', '👏', '⛳', '🏌️', '💪', '😂'];

const allReactions = {
  golf: ['⛳', '🏌️', '🏆', '🎯', '🦅', '🐦', '🐤', '💣'],
  celebration: ['🔥', '👏', '🙌', '💪', '🎉', '✨', '⭐', '👑'],
  emotion: ['😂', '🤣', '😅', '😬', '😱', '🤯', '😎', '🥴'],
  misc: ['👀', '💯', '🍀', '🌧️', '☀️', '💨', '🍺', '🥃'],
};

// ============================================
// MAIN COMPONENT
// ============================================

export function ReactionPicker({
  reactions,
  onReact,
  onRemoveReaction,
  size = 'md',
  className,
}: ReactionPickerProps) {
  const [showPicker, setShowPicker] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  // Close picker on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setShowPicker(false);
      }
    };

    if (showPicker) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showPicker]);

  const handleReaction = (emoji: string) => {
    const existing = reactions[emoji];
    if (existing?.hasReacted) {
      onRemoveReaction(emoji);
    } else {
      onReact(emoji);
    }
    setShowPicker(false);
  };

  const activeReactions = Object.entries(reactions)
    .filter(([_, r]) => r.count > 0)
    .sort((a, b) => b[1].count - a[1].count);

  const sizeClasses = {
    sm: 'text-sm h-6',
    md: 'text-base h-8',
    lg: 'text-lg h-10',
  };

  return (
    <div className={cn('relative', className)} ref={pickerRef}>
      {/* Active Reactions */}
      <div className="flex flex-wrap items-center gap-1.5">
        {activeReactions.map(([emoji, reaction]) => (
          <ReactionBadge
            key={emoji}
            emoji={emoji}
            count={reaction.count}
            hasReacted={reaction.hasReacted}
            onClick={() => handleReaction(emoji)}
            size={size}
          />
        ))}

        {/* Add Reaction Button */}
        <button
          onClick={() => setShowPicker(!showPicker)}
          className={cn(
            'flex items-center justify-center rounded-full transition-all',
            sizeClasses[size],
            size === 'sm' ? 'w-6' : size === 'md' ? 'w-8' : 'w-10',
          )}
          style={{
            background: showPicker ? 'var(--masters)' : 'var(--surface-raised)',
            color: showPicker ? 'white' : 'var(--ink-tertiary)',
            border: '1px solid var(--rule)',
          }}
          aria-label="Add reaction"
        >
          {showPicker ? (
            <X className={size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} />
          ) : (
            <Plus className={size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} />
          )}
        </button>
      </div>

      {/* Emoji Picker Popup */}
      {showPicker && (
        <div
          className="absolute bottom-full mb-2 left-0 z-50 animate-scale-in"
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--rule)',
            borderRadius: 'var(--radius-xl)',
            boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
          }}
        >
          <EmojiPicker onSelect={handleReaction} />
        </div>
      )}
    </div>
  );
}

// ============================================
// REACTION BADGE
// ============================================

interface ReactionBadgeProps {
  emoji: string;
  count: number;
  hasReacted: boolean;
  onClick: () => void;
  size: 'sm' | 'md' | 'lg';
}

function ReactionBadge({ emoji, count, hasReacted, onClick, size }: ReactionBadgeProps) {
  const sizeClasses = {
    sm: 'px-1.5 py-0.5 text-xs gap-1',
    md: 'px-2 py-1 text-sm gap-1.5',
    lg: 'px-3 py-1.5 text-base gap-2',
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center rounded-full transition-all',
        'hover:scale-105 active:scale-95',
        sizeClasses[size],
      )}
      style={{
        background: hasReacted ? 'var(--masters)' : 'var(--surface-raised)',
        color: hasReacted ? 'white' : 'var(--ink-secondary)',
        border: hasReacted ? '1px solid var(--masters)' : '1px solid var(--rule)',
      }}
    >
      <span>{emoji}</span>
      <span className="font-medium">{count}</span>
    </button>
  );
}

// ============================================
// EMOJI PICKER
// ============================================

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
}

function EmojiPicker({ onSelect }: EmojiPickerProps) {
  const [activeTab, setActiveTab] = useState<keyof typeof allReactions>('golf');

  const tabs: { key: keyof typeof allReactions; label: string; icon: string }[] = [
    { key: 'golf', label: 'Golf', icon: '⛳' },
    { key: 'celebration', label: 'Celebrate', icon: '🔥' },
    { key: 'emotion', label: 'React', icon: '😂' },
    { key: 'misc', label: 'More', icon: '👀' },
  ];

  return (
    <div className="w-[280px]">
      {/* Quick Reactions */}
      <div
        className="flex items-center justify-around p-2"
        style={{ borderBottom: '1px solid var(--rule)' }}
      >
        {quickReactions.map((emoji) => (
          <button
            key={emoji}
            onClick={() => onSelect(emoji)}
            className="text-2xl p-1.5 rounded-lg transition-transform hover:scale-125 active:scale-95"
          >
            {emoji}
          </button>
        ))}
      </div>

      {/* Category Tabs */}
      <div
        className="flex"
        style={{ borderBottom: '1px solid var(--rule)' }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'flex-1 py-2 text-center transition-colors',
            )}
            style={{
              background: activeTab === tab.key ? 'var(--surface-raised)' : 'transparent',
              borderBottom: activeTab === tab.key ? '2px solid var(--masters)' : '2px solid transparent',
            }}
          >
            <span className="text-lg">{tab.icon}</span>
          </button>
        ))}
      </div>

      {/* Emoji Grid */}
      <div className="p-2 grid grid-cols-8 gap-1">
        {allReactions[activeTab].map((emoji) => (
          <button
            key={emoji}
            onClick={() => onSelect(emoji)}
            className="text-xl p-1.5 rounded-lg transition-transform hover:scale-110 hover:bg-surface-raised active:scale-95"
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}

// ============================================
// QUICK REACTION BAR
// ============================================

interface QuickReactionBarProps {
  onReact: (emoji: string) => void;
  className?: string;
}

export function QuickReactionBar({ onReact, className }: QuickReactionBarProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-1 p-2 rounded-full',
        className
      )}
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--rule)',
      }}
    >
      {quickReactions.map((emoji) => (
        <button
          key={emoji}
          onClick={() => onReact(emoji)}
          className="text-xl p-1.5 rounded-full transition-transform hover:scale-125 active:scale-90"
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}

// ============================================
// REACTION SUMMARY (for compact views)
// ============================================

interface ReactionSummaryProps {
  reactions: ReactionData;
  maxDisplay?: number;
  className?: string;
}

export function ReactionSummary({
  reactions,
  maxDisplay = 3,
  className,
}: ReactionSummaryProps) {
  const activeReactions = Object.entries(reactions)
    .filter(([_, r]) => r.count > 0)
    .sort((a, b) => b[1].count - a[1].count);

  if (activeReactions.length === 0) return null;

  const totalCount = activeReactions.reduce((sum, [_, r]) => sum + r.count, 0);
  const displayedReactions = activeReactions.slice(0, maxDisplay);
  const remainingCount = activeReactions.length - maxDisplay;

  return (
    <div
      className={cn('flex items-center gap-1', className)}
    >
      {/* Emoji Stack */}
      <div className="flex -space-x-1">
        {displayedReactions.map(([emoji]) => (
          <span
            key={emoji}
            className="w-5 h-5 rounded-full flex items-center justify-center text-xs"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--rule)',
            }}
          >
            {emoji}
          </span>
        ))}
        {remainingCount > 0 && (
          <span
            className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
            style={{
              background: 'var(--surface-raised)',
              border: '1px solid var(--rule)',
              color: 'var(--ink-tertiary)',
            }}
          >
            +{remainingCount}
          </span>
        )}
      </div>

      {/* Count */}
      <span
        className="text-xs font-medium"
        style={{ color: 'var(--ink-secondary)' }}
      >
        {totalCount}
      </span>
    </div>
  );
}

export default ReactionPicker;
